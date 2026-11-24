use anchor_lang::prelude::*;

use crate::{PolicyEngineErrors, Side};

pub const MAX_TRANSFER_HISTORY: usize = 25;

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

#[derive(InitSpace, AnchorSerialize, AnchorDeserialize, Clone)]
pub struct Lock {
    pub amount: u64,
    pub release_time: i64,
    pub reason: u64,
    #[max_len(64)]
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
    pub fn update_transfer_history(&mut self, amount: u64, side: Side) -> Result<()> {
        self.total_amount = if side != Side::Sell {
            self.total_amount
                .checked_add(amount)
                .ok_or(PolicyEngineErrors::BalanceOverflow)?
        } else {
            self.total_amount
                .checked_sub(amount)
                .ok_or(PolicyEngineErrors::BalanceUnderflow)?
        };
        Ok(())
    }

    pub fn new_issuance(&mut self, amount: u64, issue_time: i64) -> Result<()> {
        self.issuances.push(Issuance { amount, issue_time });
        self.total_amount = self
            .total_amount
            .checked_add(amount)
            .ok_or(PolicyEngineErrors::BalanceOverflow)?;
        Ok(())
    }

    pub fn update_balance_burn(&mut self, amount: u64) -> Result<()> {
        self.total_amount = self
            .total_amount
            .checked_sub(amount)
            .ok_or(PolicyEngineErrors::BalanceUnderflow)?;
        Ok(())
    }

    pub fn add_lock(
        &mut self,
        amount: u64,
        release_time: i64,
        reason: u64,
        reason_string: String,
    ) -> Result<()> {
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

    pub fn get_compliance_transferable_balance(
        &self,
        current_timestamp: i64,
        lock_time: i64,
        transferrable_amount: u64,
    ) -> Result<u64> {
        let mut locked_amount: u64 = 0;
        for issuance in self.issuances.iter() {
            if lock_time > current_timestamp
                || issuance.issue_time > (current_timestamp - lock_time)
            {
                locked_amount += issuance.amount;
            }
        }
        Ok(transferrable_amount - u64::min(locked_amount, transferrable_amount))
    }
}
