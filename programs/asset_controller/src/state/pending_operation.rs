use crate::{AssetControllerAccount, AssetControllerErrors, OperationKind};
use anchor_lang::prelude::*;

pub const PENDING_OPERATION_SEED: &[u8] = b"pending_operation";
pub const MAX_BURN_REASON_BYTES: usize = 256;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq, InitSpace)]
pub struct MintRequest {
    pub id: [u8; 32],
    pub amount: u64,
    pub issuance_timestamp: i64,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq, InitSpace)]
pub struct BurnRequest {
    pub id: [u8; 32],
    pub amount: u64,
    #[max_len(256)]
    pub reason: String,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug, PartialEq, Eq, InitSpace)]
pub enum OperationData {
    Mint {
        amount: u64,
        issuance_timestamp: i64,
    },
    Burn {
        amount: u64,
        #[max_len(256)]
        reason: String,
    },
}

impl OperationData {
    pub fn kind(&self) -> OperationKind {
        match self {
            Self::Mint { .. } => OperationKind::Mint,
            Self::Burn { .. } => OperationKind::Burn,
        }
    }
    pub fn amount(&self) -> u64 {
        match self {
            Self::Mint { amount, .. } | Self::Burn { amount, .. } => *amount,
        }
    }
}

/// Validated typed operation payload and the caller-supplied ID.
#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OperationIntent {
    pub asset_mint: Pubkey,
    pub wallet: Pubkey,
    pub identity_account: Pubkey,
    pub token_account: Pubkey,
    pub id: [u8; 32],
    pub data: OperationData,
}

impl OperationIntent {
    pub fn validate(&self) -> Result<()> {
        require!(
            self.data.amount() > 0,
            AssetControllerErrors::InvalidOperationAmount
        );
        if let OperationData::Burn { reason, .. } = &self.data {
            require!(
                reason.len() <= MAX_BURN_REASON_BYTES,
                AssetControllerErrors::BurnReasonTooLong
            );
        }
        Ok(())
    }
}

impl MintRequest {
    pub fn intent(
        &self,
        asset_mint: Pubkey,
        wallet: Pubkey,
        identity_account: Pubkey,
        token_account: Pubkey,
    ) -> OperationIntent {
        OperationIntent {
            asset_mint,
            wallet,
            identity_account,
            token_account,
            id: self.id,
            data: OperationData::Mint {
                amount: self.amount,
                issuance_timestamp: self.issuance_timestamp,
            },
        }
    }
}
impl BurnRequest {
    pub fn intent(
        &self,
        asset_mint: Pubkey,
        wallet: Pubkey,
        identity_account: Pubkey,
        token_account: Pubkey,
    ) -> OperationIntent {
        OperationIntent {
            asset_mint,
            wallet,
            identity_account,
            token_account,
            id: self.id,
            data: OperationData::Burn {
                amount: self.amount,
                reason: self.reason.clone(),
            },
        }
    }
}

#[account]
#[derive(InitSpace)]
pub struct PendingOperation {
    pub asset_mint: Pubkey,
    pub wallet: Pubkey,
    pub identity_account: Pubkey,
    pub token_account: Pubkey,
    pub id: [u8; 32],
    pub data: OperationData,
    /// Authorized signer; human role attribution belongs to RBAC.
    pub proposer: Pubkey,
    pub rent_payer: Pubkey,
    pub effective_at: i64,
    pub expires_at: i64,
}

impl PendingOperation {
    pub fn schedule(
        controller: &AssetControllerAccount,
        intent: OperationIntent,
        proposer: Pubkey,
        rent_payer: Pubkey,
        now: i64,
    ) -> Result<Self> {
        intent.validate()?;
        let (effective_at, expires_at) =
            controller.proposal_times(intent.data.kind(), intent.data.amount(), now)?;
        Ok(Self {
            asset_mint: intent.asset_mint,
            wallet: intent.wallet,
            identity_account: intent.identity_account,
            token_account: intent.token_account,
            id: intent.id,
            data: intent.data,
            proposer,
            rent_payer,
            effective_at,
            expires_at,
        })
    }
    pub fn ensure_executable(&self, now: i64) -> Result<()> {
        require!(
            now >= self.effective_at,
            AssetControllerErrors::PendingOperationNotEffective
        );
        require!(
            now < self.expires_at,
            AssetControllerErrors::PendingOperationExpired
        );
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    fn intent() -> OperationIntent {
        MintRequest {
            id: [7; 32],
            amount: 300,
            issuance_timestamp: 1_000,
        }
        .intent(
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
        )
    }
    #[test]
    fn caller_id_is_preserved_with_the_exact_payload() {
        let mut controller =
            AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        controller.throttle = crate::ThrottleConfig {
            enabled: true,
            large_amount_threshold: 100,
            large_amount_delay: 10,
            pending_operation_grace_period: 10,
            ..crate::ThrottleConfig::default()
        };
        let original = intent();
        let pending = PendingOperation::schedule(
            &controller,
            original.clone(),
            Pubkey::new_unique(),
            Pubkey::new_unique(),
            100,
        )
        .unwrap();
        assert_eq!(pending.id, original.id);
        assert_eq!(pending.data, original.data);
        assert_eq!(pending.token_account, original.token_account);
        assert_eq!(pending.wallet, original.wallet);
    }
    #[test]
    fn bounds_are_utf8_bytes_and_cover_account_serialization() {
        let mut op = intent();
        op.data = OperationData::Burn {
            amount: 300,
            reason: "é".repeat(128),
        };
        op.validate().unwrap();
        op.data = OperationData::Burn {
            amount: 300,
            reason: "é".repeat(129),
        };
        assert!(op.validate().is_err());
        op.data = OperationData::Burn {
            amount: 0,
            reason: String::new(),
        };
        assert!(op.validate().is_err());
    }
    #[test]
    fn execution_interval_and_kind_specific_schedule() {
        let mut controller =
            AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        controller.throttle = crate::ThrottleConfig {
            enabled: true,
            large_amount_threshold: 100,
            large_amount_delay: 10,
            pending_operation_grace_period: 10,
            ..crate::ThrottleConfig::default()
        };
        for data in [
            OperationData::Mint {
                amount: 300,
                issuance_timestamp: 0,
            },
            OperationData::Burn {
                amount: 300,
                reason: "burn".into(),
            },
        ] {
            let op = PendingOperation::schedule(
                &controller,
                OperationIntent { data, ..intent() },
                Pubkey::new_unique(),
                Pubkey::new_unique(),
                90,
            )
            .unwrap();
            assert!(op.ensure_executable(99).is_err());
            op.ensure_executable(100).unwrap();
            op.ensure_executable(109).unwrap();
            assert!(op.ensure_executable(110).is_err());
            let mut bytes = Vec::new();
            op.try_serialize(&mut bytes).unwrap();
            assert!(bytes.len() <= 8 + PendingOperation::INIT_SPACE);
        }
    }
}
