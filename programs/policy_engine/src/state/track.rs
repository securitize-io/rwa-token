use anchor_lang::prelude::*;

use crate::{PolicyEngineErrors, Side};

pub const MAX_TRANSFER_HISTORY: usize = 25;
pub const MAX_LOCK_REASON_BYTES: usize = 64;

#[account()]
#[derive(InitSpace)]
pub struct TrackerAccount {
    pub version: u8,
    // corresponding asset mint
    pub asset_mint: Pubkey,
    // identity account of the owner of the policy account
    pub identity_account: Pubkey,

    pub total_amount: u64,

    #[max_len(0)]
    pub issuances: Vec<Issuance>,

    #[max_len(0)]
    pub locks: Vec<Lock>,
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Issuance {
    pub amount: u64,
    pub issue_time: i64,
}

impl Issuance {
    fn is_locked(&self, current_timestamp: i64, lock_time: i64) -> bool {
        lock_time > current_timestamp || self.issue_time > current_timestamp - lock_time
    }
}

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Lock {
    pub amount: u64,
    pub release_time: i64,
    pub reason: u64,
    #[max_len(MAX_LOCK_REASON_BYTES)]
    pub reason_string: String,
}

impl TrackerAccount {
    pub const VERSION: u8 = 1;
    pub fn new(asset_mint: Pubkey, owner: Pubkey) -> Self {
        Self {
            version: Self::VERSION,
            asset_mint,
            identity_account: owner,
            total_amount: 0,
            issuances: vec![],
            locks: vec![],
        }
    }

    pub fn get_current_space(&self) -> usize {
        TrackerAccount::INIT_SPACE
            + self.issuances.len() * Issuance::INIT_SPACE
            + self.locks.len() * Lock::INIT_SPACE
    }

    /// for all timestamps, if timestamp is older than timestamp - max_timeframe. remove it,
    #[inline(never)]
    pub fn update_transfer_history(
        &mut self,
        amount: u64,
        side: Side,
    ) -> Result<()> {
        self.total_amount = if side != Side::Sell {
            self.total_amount.checked_add(amount).ok_or(PolicyEngineErrors::BalanceOverflow)?
        } else {
            self.total_amount.checked_sub(amount).ok_or(PolicyEngineErrors::BalanceUnderflow)?
        };
        Ok(())
    }

    /// Update the balance, keeping only issuance records that are still locked.
    /// Returns the number of existing records pruned before adding the new issuance.
    pub fn new_issuance(
        &mut self,
        amount: u64,
        issue_time: i64,
        current_timestamp: i64,
        lock_time: i64,
    ) -> Result<usize> {
        let total_amount = self.total_amount.checked_add(amount)
            .ok_or(PolicyEngineErrors::BalanceOverflow)?;
        // Prune before appending so expired records do not force the Vec to grow.
        let removed_count = self.prune_issuances(current_timestamp, lock_time)?;
        let issuance = Issuance { amount, issue_time };
        if issuance.is_locked(current_timestamp, lock_time) {
            self.issuances.push(issuance);
        }
        self.total_amount = total_amount;
        Ok(removed_count)
    }

    /// Permanently discard issuances that have matured under the current holding period.
    /// Balance and explicit locks are independent of the issuance history.
    pub fn prune_issuances(&mut self, current_timestamp: i64, lock_time: i64) -> Result<usize> {
        require!(lock_time >= 0, PolicyEngineErrors::InvalidLockPeriod);
        // Match the transfer check: all issuances are locked in this case,
        // including backdated issuances with negative timestamps.
        if lock_time > current_timestamp {
            return Ok(0);
        }
        let previous_len = self.issuances.len();
        // Backdating means the vector need not be sorted by issue_time.
        self.issuances.retain(|issuance| issuance.is_locked(current_timestamp, lock_time));
        Ok(previous_len - self.issuances.len())
    }

    pub fn update_balance_burn(&mut self, amount: u64) -> Result<()> {
        self.total_amount = self.total_amount.checked_sub(amount).ok_or(PolicyEngineErrors::BalanceUnderflow)?;
        Ok(())
    }

    pub fn add_lock(
        &mut self,
        amount: u64,
        release_time: i64,
        reason: u64,
        reason_string: String,
    ) -> Result<()> {
        require!(
            reason_string.len() <= MAX_LOCK_REASON_BYTES,
            PolicyEngineErrors::InvalidInstructionData
        );
        self.locks.push(Lock {
            amount,
            release_time,
            reason,
            reason_string,
        });
        Ok(())
    }

    pub fn remove_expired_locks(&mut self, timestamp: i64) -> Result<()> {
        self.locks.retain(|lock| lock.release_time > timestamp);
        Ok(())
    }

    pub fn remove_lock(&mut self, index: usize) -> Result<Lock> {
        if index >= self.locks.len() {
            return Err(PolicyEngineErrors::LockIndexNotFound.into());
        }
        let lock = self.locks.remove(index);
        Ok(lock)
    }

    pub fn get_transferable_balance(&self, current_timestamp: i64) -> Result<u64> {
        let mut locked_amount: u64 = 0;
        for lock in self.locks.iter() {
            if lock.release_time == 0 || lock.release_time > current_timestamp {
                locked_amount += lock.amount;
            }
        }
        Ok(self.total_amount - u64::min(locked_amount, self.total_amount))
    }

    pub fn get_compliance_transferable_balance(&self, current_timestamp: i64, lock_time: i64, transferrable_amount: u64) -> Result<u64> {
        let mut locked_amount: u64 = 0;
        for issuance in self.issuances.iter() {            
            if issuance.is_locked(current_timestamp, lock_time) {
                locked_amount += issuance.amount;
            }
        }
        Ok(transferrable_amount - u64::min(locked_amount, transferrable_amount))
    }

}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::{PolicyEngineAccount, US_COMPLIANCE_LEVEL};

    fn tracker() -> TrackerAccount {
        let mut tracker = TrackerAccount::new(Pubkey::default(), Pubkey::default());
        tracker.total_amount = 1_000;
        tracker.issuances = [101, 99, 100, 250, 50]
            .iter()
            .map(|&issue_time| Issuance {
                amount: 10,
                issue_time,
            })
            .collect();
        tracker.locks.push(Lock {
            amount: 17,
            release_time: i64::MAX,
            reason: 1,
            reason_string: "Independent lock".to_owned(),
        });
        tracker
    }

    #[test]
    fn lock_reasons_accept_empty_and_up_to_64_utf8_bytes() {
        for reason in [String::new(), "x".repeat(64), "é".repeat(32)] {
            let mut tracker = TrackerAccount::new(Pubkey::default(), Pubkey::default());
            tracker.add_lock(17, 123, 1, reason.clone()).unwrap();
            assert_eq!(tracker.locks[0].reason_string, reason);
            assert_eq!(
                tracker.get_current_space(),
                TrackerAccount::INIT_SPACE + Lock::INIT_SPACE
            );
            assert!(tracker.try_to_vec().unwrap().len() <= tracker.get_current_space());
        }
    }

    #[test]
    fn oversized_lock_reasons_are_rejected_without_mutation() {
        for reason in ["x".repeat(65), "é".repeat(33), "x".repeat(128)] {
            let mut tracker = tracker();
            let before = tracker.try_to_vec().unwrap();
            let error = tracker.add_lock(17, 123, 1, reason).unwrap_err();
            assert_eq!(error, error!(PolicyEngineErrors::InvalidInstructionData));
            assert_eq!(tracker.try_to_vec().unwrap(), before);
        }
    }

    #[test]
    fn pruning_preserves_balance_locks_order_and_current_transferability() {
        let mut tracker = tracker();
        let mut expected = tracker.clone();
        expected.issuances = vec![
            Issuance {
                amount: 10,
                issue_time: 101,
            },
            Issuance {
                amount: 10,
                issue_time: 250,
            },
        ];
        let transferable = tracker.get_transferable_balance(200).unwrap();
        let compliant = tracker
            .get_compliance_transferable_balance(200, 100, transferable)
            .unwrap();

        assert_eq!(tracker.prune_issuances(200, 100).unwrap(), 3);
        assert_eq!(
            tracker.try_to_vec().unwrap(),
            expected.try_to_vec().unwrap()
        );
        assert_eq!(tracker.get_transferable_balance(200).unwrap(), transferable);
        assert_eq!(
            tracker
                .get_compliance_transferable_balance(200, 100, transferable)
                .unwrap(),
            compliant
        );
        assert_eq!(tracker.prune_issuances(200, 100).unwrap(), 0);
        assert_eq!(
            tracker.try_to_vec().unwrap(),
            expected.try_to_vec().unwrap()
        );
    }

    #[test]
    fn zero_period_removes_the_exact_boundary_but_preserves_future_issuances() {
        let mut tracker = tracker();
        assert_eq!(tracker.prune_issuances(100, 0).unwrap(), 3);
        assert_eq!(
            tracker
                .issuances
                .iter()
                .map(|i| i.issue_time)
                .collect::<Vec<_>>(),
            vec![101, 250]
        );
    }

    #[test]
    fn period_exceeding_timestamp_preserves_even_negative_issuance_times() {
        let mut tracker = tracker();
        tracker.issuances[0].issue_time = -1_000;
        let before = tracker.try_to_vec().unwrap();
        assert_eq!(tracker.prune_issuances(100, 101).unwrap(), 0);
        assert_eq!(tracker.try_to_vec().unwrap(), before);
        assert_eq!(tracker.prune_issuances(i64::MIN, i64::MAX).unwrap(), 0);
        assert_eq!(tracker.try_to_vec().unwrap(), before);
    }

    #[test]
    fn negative_period_is_rejected_without_mutation() {
        let mut tracker = tracker();
        let before = tracker.try_to_vec().unwrap();
        assert!(tracker.prune_issuances(200, -1).is_err());
        assert_eq!(tracker.try_to_vec().unwrap(), before);
    }

    #[test]
    fn cutoff_subtraction_is_safe_at_integer_boundaries() {
        for (timestamp, lock_time, expected_times) in [
            (0, 0, vec![1, i64::MAX]),
            (i64::MAX, i64::MAX, vec![1, i64::MAX]),
            (i64::MAX, 0, vec![]),
        ] {
            let mut tracker = tracker();
            tracker.issuances = [i64::MIN, -1, 0, 1, i64::MAX]
                .iter()
                .map(|&issue_time| Issuance {
                    amount: 10,
                    issue_time,
                })
                .collect();
            tracker.prune_issuances(timestamp, lock_time).unwrap();
            assert_eq!(
                tracker
                    .issuances
                    .iter()
                    .map(|i| i.issue_time)
                    .collect::<Vec<_>>(),
                expected_times,
            );
        }
    }

    #[test]
    fn holding_period_uses_current_country_mapping() {
        let mut policy = PolicyEngineAccount::new(Pubkey::default(), Pubkey::default());
        policy.issuance_policies.us_lock_period = 200;
        policy.issuance_policies.non_us_lock_period = 100;
        assert_eq!(policy.get_lock_period(7), 100);
        policy.mapping[7] = US_COMPLIANCE_LEVEL;
        assert_eq!(policy.get_lock_period(7), 200);
        assert_eq!(policy.get_lock_period(8), 100);
    }

    #[test]
    fn new_issuance_retains_only_locked_records_at_cutoff_and_integer_boundaries() {
        for (timestamp, lock_time, issue_time, retained) in [
            (200, 100, 99, false),
            (200, 100, 100, false),
            (200, 100, 101, true),
            (100, 0, 100, false),
            (100, 0, 101, true),
            (100, 101, -1_000, true),
            (i64::MIN, i64::MAX, i64::MIN, true),
            (i64::MAX, i64::MAX, 0, false),
            (i64::MAX, 0, i64::MAX, false),
        ] {
            let mut tracker = TrackerAccount::new(Pubkey::default(), Pubkey::default());
            assert_eq!(
                tracker
                    .new_issuance(17, issue_time, timestamp, lock_time)
                    .unwrap(),
                0
            );
            assert_eq!(tracker.total_amount, 17);
            assert_eq!(tracker.issuances.len(), usize::from(retained));
            if retained {
                assert_eq!(tracker.issuances[0].issue_time, issue_time);
                assert_eq!(tracker.issuances[0].amount, 17);
            }
        }
    }

    #[test]
    fn matured_new_issuance_prunes_old_history_and_preserves_locks_and_balance() {
        let mut tracker = tracker();
        let mut expected = tracker.clone();
        expected.total_amount += 23;
        expected.issuances = vec![
            Issuance { amount: 10, issue_time: 101 },
            Issuance { amount: 10, issue_time: 250 },
        ];
        assert_eq!(tracker.new_issuance(23, 100, 200, 100).unwrap(), 3);
        assert_eq!(tracker.try_to_vec().unwrap(), expected.try_to_vec().unwrap());
    }

    #[test]
    fn invalid_new_issuance_does_not_prune_history_or_change_balance() {
        let mut tracker = tracker();
        let before = tracker.try_to_vec().unwrap();
        assert!(tracker.new_issuance(1, 100, 200, -1).is_err());
        assert_eq!(tracker.try_to_vec().unwrap(), before);
        tracker.total_amount = u64::MAX;
        let before = tracker.try_to_vec().unwrap();
        assert!(tracker.new_issuance(1, 100, 200, 100).is_err());
        assert_eq!(tracker.try_to_vec().unwrap(), before);
    }
}
