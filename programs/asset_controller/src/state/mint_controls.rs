use crate::{AssetControllerAccount, AssetControllerErrors};
use anchor_lang::prelude::*;

/// Single-instruction ceilings in base units. Zero disables the corresponding cap.
#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace,
)]
pub struct CapsConfig {
    pub max_mint_per_tx: u64,
    pub max_burn_per_tx: u64,
}

/// Shared tumbling window, mint/burn timelock, and pending-operation expiry.
#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace,
)]
pub struct ThrottleConfig {
    pub enabled: bool,
    pub mint_window_cap: u64,
    pub burn_window_cap: u64,
    pub window_seconds: i64,
    pub large_amount_threshold: u64,
    pub large_amount_delay: i64,
    pub pending_operation_grace_period: i64,
}

impl ThrottleConfig {
    pub fn validate(&self) -> Result<()> {
        require!(
            self.window_seconds >= 0
                && self.large_amount_delay >= 0
                && self.pending_operation_grace_period >= 0,
            AssetControllerErrors::InvalidMintControlsConfig
        );
        require!(
            (self.mint_window_cap == 0 && self.burn_window_cap == 0) || self.window_seconds > 0,
            AssetControllerErrors::InvalidMintControlsConfig
        );
        require!(
            self.large_amount_threshold == 0
                || (self.large_amount_delay > 0 && self.pending_operation_grace_period > 0),
            AssetControllerErrors::InvalidMintControlsConfig
        );
        Ok(())
    }
}

#[derive(
    AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, Default, PartialEq, Eq, InitSpace,
)]
pub struct ThrottleState {
    pub window_start: i64,
    pub minted_in_window: u64,
    pub burned_in_window: u64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub enum OperationKind {
    Mint,
    Burn,
}

impl AssetControllerAccount {
    pub fn proposal_times(&self, kind: OperationKind, amount: u64, now: i64) -> Result<(i64, i64)> {
        require!(amount > 0, AssetControllerErrors::InvalidOperationAmount);
        let effective_at = self.release_at_for(kind, amount, now)?;
        require!(
            self.throttle.pending_operation_grace_period > 0,
            AssetControllerErrors::InvalidMintControlsConfig
        );
        let expires_at = effective_at
            .checked_add(self.throttle.pending_operation_grace_period)
            .ok_or(AssetControllerErrors::MintControlsArithmeticOverflow)?;
        Ok((effective_at, expires_at))
    }
    /// True if the current window has elapsed and counters should be treated as reset.
    fn window_elapsed(&self, now: i64) -> bool {
        let window_seconds = self.throttle.window_seconds;

        window_seconds != 0 && now.saturating_sub(self.state.window_start) >= window_seconds
    }

    /// Resets all window counters if the current window has elapsed.
    fn roll_window(&mut self, now: i64) {
        if self.window_elapsed(now) {
            self.state.window_start = now;
            self.state.minted_in_window = 0;
            self.state.burned_in_window = 0;
        }
    }

    fn caps_for(&self, kind: OperationKind) -> (u64, u64) {
        match kind {
            OperationKind::Mint => (self.caps.max_mint_per_tx, self.throttle.mint_window_cap),
            OperationKind::Burn => (self.caps.max_burn_per_tx, self.throttle.burn_window_cap),
        }
    }

    fn counter(&self, kind: OperationKind) -> u64 {
        match kind {
            OperationKind::Mint => self.state.minted_in_window,
            OperationKind::Burn => self.state.burned_in_window,
        }
    }

    fn set_counter(&mut self, kind: OperationKind, value: u64) {
        match kind {
            OperationKind::Mint => self.state.minted_in_window = value,
            OperationKind::Burn => self.state.burned_in_window = value,
        }
    }

    /// The same configured threshold routes both mint and burn operations.
    fn timelock_threshold(&self) -> Option<u64> {
        let threshold = self.throttle.large_amount_threshold;

        (threshold != 0).then_some(threshold)
    }

    fn ensure_per_tx(&self, kind: OperationKind, amount: u64) -> Result<()> {
        let (max_per_tx, _) = self.caps_for(kind);

        if max_per_tx != 0 && amount > max_per_tx {
            return err!(AssetControllerErrors::OperationCapExceeded);
        }

        Ok(())
    }

    /// Validates an immediate operation against the caps. Amounts over the large-amount
    /// threshold are rejected so the caller uses the timelock. Read-only.
    pub fn ensure_immediate(&self, kind: OperationKind, amount: u64, now: i64) -> Result<()> {
        if !self.throttle.enabled {
            return Ok(());
        }

        self.ensure_per_tx(kind, amount)?;

        let requires_timelock = self
            .timelock_threshold()
            .is_some_and(|threshold| amount > threshold);

        if requires_timelock {
            return err!(AssetControllerErrors::AmountRequiresTimelock);
        }

        self.ensure_window_room(kind, amount, now)
    }

    /// Validates a proposed operation and returns its release time. Requires throttling enabled,
    /// an amount above the large-amount threshold when one is set, and fits the caps.
    pub fn release_at_for(&self, kind: OperationKind, amount: u64, now: i64) -> Result<i64> {
        require!(
            self.throttle.enabled,
            AssetControllerErrors::MintControlsDisabled
        );

        self.ensure_per_tx(kind, amount)?;

        // When a threshold is configured, only amounts above it use the timelock.
        // A zero threshold permits voluntary proposals, matching BC-2263.
        let is_below_threshold = self
            .timelock_threshold()
            .is_some_and(|threshold| amount <= threshold);

        if is_below_threshold {
            return err!(AssetControllerErrors::AmountDoesNotRequireTimelock);
        }

        // Over the window cap the op could never be released and would only wait to be cancelled.
        let (_, window_cap) = self.caps_for(kind);

        if window_cap != 0 && amount > window_cap {
            return err!(AssetControllerErrors::WindowCapExceeded);
        }

        let release_at = now
            .checked_add(self.throttle.large_amount_delay)
            .ok_or(AssetControllerErrors::MintControlsArithmeticOverflow)?;

        Ok(release_at)
    }

    /// Re-validates a matured pending operation against the current caps, which may have been
    /// lowered or filled since it was proposed. Read-only.
    pub fn ensure_releasable(&self, kind: OperationKind, amount: u64, now: i64) -> Result<()> {
        if !self.throttle.enabled {
            return Ok(());
        }

        self.ensure_per_tx(kind, amount)?;

        self.ensure_window_room(kind, amount, now)
    }

    /// Checks that an operation still fits the window cap. Read-only.
    fn ensure_window_room(&self, kind: OperationKind, amount: u64, now: i64) -> Result<()> {
        if !self.throttle.enabled {
            return Ok(());
        }

        let (_, window_cap) = self.caps_for(kind);

        if window_cap == 0 {
            return Ok(());
        }

        // Treat the counter as reset if the window has elapsed
        // (real reset is in record_consumption).
        let consumed = if self.window_elapsed(now) {
            0
        } else {
            self.counter(kind)
        };

        let projected = consumed
            .checked_add(amount)
            .ok_or(AssetControllerErrors::MintControlsArithmeticOverflow)?;

        require!(
            projected <= window_cap,
            AssetControllerErrors::WindowCapExceeded
        );

        Ok(())
    }

    /// Records an already-validated operation, with checked arithmetic. Disabled operations
    /// do not seed the window that enabling would then inherit.
    pub fn record_consumption(&mut self, kind: OperationKind, amount: u64, now: i64) -> Result<()> {
        if !self.throttle.enabled {
            return Ok(());
        }

        self.roll_window(now);

        let projected = self
            .counter(kind)
            .checked_add(amount)
            .ok_or(AssetControllerErrors::MintControlsArithmeticOverflow)?;

        self.set_counter(kind, projected);

        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn controls() -> AssetControllerAccount {
        let mut account = AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        account.caps = CapsConfig {
            max_mint_per_tx: 500,
            max_burn_per_tx: 400,
        };
        account.throttle = ThrottleConfig {
            enabled: true,
            mint_window_cap: 1_000,
            burn_window_cap: 900,
            window_seconds: 60,
            large_amount_threshold: 200,
            large_amount_delay: 10,
            pending_operation_grace_period: 30,
        };
        account
    }

    impl AssetControllerAccount {
        fn consume_immediate(&mut self, kind: OperationKind, amount: u64, now: i64) -> Result<()> {
            self.ensure_immediate(kind, amount, now)?;
            self.record_consumption(kind, amount, now)
        }
        fn consume_pending_mint(&mut self, amount: u64, now: i64) -> Result<()> {
            self.ensure_releasable(OperationKind::Mint, amount, now)?;
            self.record_consumption(OperationKind::Mint, amount, now)
        }
    }

    #[test]
    fn threshold_boundary_is_immediate_and_one_more_requires_delay() {
        let mut c = controls();
        c.consume_immediate(OperationKind::Mint, 200, 1_000)
            .unwrap();
        let before = c.clone();
        assert_eq!(
            c.consume_immediate(OperationKind::Mint, 201, 1_000)
                .unwrap_err(),
            error!(AssetControllerErrors::AmountRequiresTimelock)
        );
        assert_eq!(c, before);
    }

    #[test]
    fn operation_ceiling_precedes_threshold_and_applies_to_pending_mints() {
        let mut c = controls();
        assert_eq!(
            c.consume_immediate(OperationKind::Mint, 501, 1_000)
                .unwrap_err(),
            error!(AssetControllerErrors::OperationCapExceeded)
        );
        assert_eq!(
            c.consume_pending_mint(501, 1_000).unwrap_err(),
            error!(AssetControllerErrors::OperationCapExceeded)
        );
        c.consume_pending_mint(500, 1_000).unwrap();
    }

    #[test]
    fn exact_window_boundary_and_over_cap_preserve_state() {
        let mut c = controls();
        c.consume_pending_mint(500, 1_000).unwrap();
        c.consume_pending_mint(500, 1_001).unwrap();
        let full = c.clone();
        assert_eq!(
            c.consume_immediate(OperationKind::Mint, 1, 1_059)
                .unwrap_err(),
            error!(AssetControllerErrors::WindowCapExceeded)
        );
        assert_eq!(c, full);
        c.consume_immediate(OperationKind::Mint, 1, 1_060).unwrap();
        assert_eq!(
            c.state,
            ThrottleState {
                window_start: 1_060,
                minted_in_window: 1,
                burned_in_window: 0
            }
        );
    }

    #[test]
    fn burn_has_its_own_budget_and_uses_the_same_threshold() {
        let mut c = controls();
        assert_eq!(
            c.ensure_immediate(OperationKind::Burn, 201, 1_000)
                .unwrap_err(),
            error!(AssetControllerErrors::AmountRequiresTimelock)
        );
        c.throttle.large_amount_threshold = 0;
        c.consume_pending_mint(500, 1_000).unwrap();
        c.consume_immediate(OperationKind::Burn, 400, 1_001)
            .unwrap();
        c.consume_immediate(OperationKind::Burn, 400, 1_002)
            .unwrap();
        c.consume_immediate(OperationKind::Burn, 100, 1_003)
            .unwrap();
        assert_eq!(c.state.minted_in_window, 500);
        assert_eq!(c.state.burned_in_window, 900);
        assert_eq!(
            c.consume_immediate(OperationKind::Burn, 1, 1_004)
                .unwrap_err(),
            error!(AssetControllerErrors::WindowCapExceeded)
        );
        assert_eq!(
            c.consume_immediate(OperationKind::Burn, 401, 1_004)
                .unwrap_err(),
            error!(AssetControllerErrors::OperationCapExceeded)
        );
    }

    #[test]
    fn either_operation_rolls_both_counters_with_one_shared_clock() {
        let mut c = controls();
        c.consume_pending_mint(500, 1_000).unwrap();
        c.consume_immediate(OperationKind::Burn, 100, 1_060)
            .unwrap();
        assert_eq!(
            c.state,
            ThrottleState {
                window_start: 1_060,
                minted_in_window: 0,
                burned_in_window: 100
            }
        );
    }

    #[test]
    fn disabled_controls_bypass_limits_and_leave_counters_unchanged() {
        let mut c = controls();
        c.consume_immediate(OperationKind::Mint, 100, 1_000)
            .unwrap();
        c.throttle.enabled = false;
        let before = c.clone();
        c.consume_immediate(OperationKind::Mint, u64::MAX, 1_001)
            .unwrap();
        c.consume_immediate(OperationKind::Burn, u64::MAX, 1_001)
            .unwrap();
        assert_eq!(c, before);
        c.throttle.enabled = true;
        c.consume_immediate(OperationKind::Mint, 100, 1_002)
            .unwrap();
        assert_eq!(c.state.minted_in_window, 200);
    }

    #[test]
    fn zero_limits_and_threshold_allow_immediate_operations() {
        let mut c = AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        c.throttle.enabled = true;
        c.throttle.validate().unwrap();
        c.consume_immediate(OperationKind::Mint, u64::MAX, 1_000)
            .unwrap();
        c.consume_immediate(OperationKind::Burn, u64::MAX, 1_000)
            .unwrap();
        assert_eq!(c.state.minted_in_window, u64::MAX);
        assert_eq!(c.state.burned_in_window, u64::MAX);
    }

    #[test]
    fn pending_mints_recheck_lowered_caps() {
        let mut c = controls();
        c.proposal_times(OperationKind::Mint, 300, 1_000).unwrap();
        c.caps.max_mint_per_tx = 299;
        assert_eq!(
            c.consume_pending_mint(300, 1_010).unwrap_err(),
            error!(AssetControllerErrors::OperationCapExceeded)
        );
        c.caps.max_mint_per_tx = 500;
        c.throttle.mint_window_cap = 299;
        assert_eq!(
            c.consume_pending_mint(300, 1_010).unwrap_err(),
            error!(AssetControllerErrors::WindowCapExceeded)
        );
    }

    #[test]
    fn proposals_do_not_reserve_capacity_and_snapshot_times() {
        let mut c = controls();
        c.state = ThrottleState {
            window_start: 1_000,
            minted_in_window: 1_000,
            burned_in_window: 0,
        };
        let before = c.clone();
        assert_eq!(
            c.proposal_times(OperationKind::Mint, 300, 1_001).unwrap(),
            (1_011, 1_041)
        );
        assert_eq!(c, before);
    }

    #[test]
    fn rejects_disabled_zero_below_threshold_and_impossible_proposals() {
        let mut c = controls();
        for amount in [0, 1, 200] {
            assert!(c
                .proposal_times(OperationKind::Mint, amount, 1_000)
                .is_err());
        }
        c.throttle.mint_window_cap = 250;
        assert!(c.proposal_times(OperationKind::Mint, 300, 1_000).is_err());
        c.throttle.large_amount_threshold = 0;
        c.throttle.mint_window_cap = 1_000;
        assert!(c.proposal_times(OperationKind::Mint, 300, 1_000).is_ok());
        c.throttle.enabled = false;
        assert!(c.proposal_times(OperationKind::Mint, 300, 1_000).is_err());
    }

    #[test]
    fn rejects_invalid_time_configuration_even_when_disabled() {
        for config in [
            ThrottleConfig {
                window_seconds: -1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                large_amount_delay: -1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                pending_operation_grace_period: -1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                mint_window_cap: 1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                burn_window_cap: 1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                large_amount_threshold: 1,
                large_amount_delay: 1,
                ..ThrottleConfig::default()
            },
            ThrottleConfig {
                large_amount_threshold: 1,
                pending_operation_grace_period: 1,
                ..ThrottleConfig::default()
            },
        ] {
            assert!(config.validate().is_err());
        }
    }

    #[test]
    fn counter_overflow_does_not_mutate_state() {
        let mut c = controls();
        c.throttle.mint_window_cap = 0;
        c.state = ThrottleState {
            window_start: 1_000,
            minted_in_window: u64::MAX,
            burned_in_window: 0,
        };
        let before = c.clone();
        assert_eq!(
            c.consume_immediate(OperationKind::Mint, 1, 1_001)
                .unwrap_err(),
            error!(AssetControllerErrors::MintControlsArithmeticOverflow)
        );
        assert_eq!(c, before);
    }

    #[test]
    fn proposal_time_overflow_is_rejected() {
        let c = controls();
        assert!(c
            .proposal_times(OperationKind::Mint, 300, i64::MAX)
            .is_err());
        assert!(c
            .proposal_times(OperationKind::Mint, 300, i64::MAX - 15)
            .is_err());
    }

    #[test]
    fn backwards_clock_does_not_reset_budget() {
        let mut c = controls();
        c.consume_pending_mint(500, 1_000).unwrap();
        c.consume_immediate(OperationKind::Mint, 100, 999).unwrap();
        assert_eq!(c.state.window_start, 1_000);
        assert_eq!(c.state.minted_in_window, 600);
    }
}
