use crate::{CapsConfig, OperationData, OperationKind, PendingOperation, ThrottleConfig};
use anchor_lang::prelude::*;

#[event]
pub struct AssetControllerMigrated {
    pub asset_mint: Pubkey,
    pub authority: Pubkey,
    pub version: u8,
}

#[event]
pub struct CapsUpdated {
    pub asset_mint: Pubkey,
    pub authority: Pubkey,
    pub caps: CapsConfig,
}
#[event]
pub struct ThrottleUpdated {
    pub asset_mint: Pubkey,
    pub authority: Pubkey,
    pub throttle: ThrottleConfig,
}

#[event]
pub struct OperationProposed {
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub identity_account: Pubkey,
    pub token_account: Pubkey,
    pub data: OperationData,
    pub effective_at: i64,
    pub expires_at: i64,
}
impl OperationProposed {
    pub fn from_pending(p: &PendingOperation) -> Self {
        Self {
            asset_mint: p.asset_mint,
            operation_id: p.id,
            authority: p.proposer,
            wallet: p.wallet,
            identity_account: p.identity_account,
            token_account: p.token_account,
            data: p.data.clone(),
            effective_at: p.effective_at,
            expires_at: p.expires_at,
        }
    }
}
#[event]
pub struct OperationExecuted {
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
    pub kind: OperationKind,
    pub authority: Pubkey,
    pub wallet: Pubkey,
    pub token_account: Pubkey,
    pub amount: u64,
}
#[event]
pub struct OperationCancelled {
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
    pub kind: OperationKind,
    pub authority: Pubkey,
    pub amount: u64,
}
#[event]
pub struct OperationExpired {
    pub asset_mint: Pubkey,
    pub operation_id: [u8; 32],
    pub kind: OperationKind,
    pub amount: u64,
}

#[event]
pub struct BurnEvent {
    pub amount: u64,
    pub reason: String,
    pub wallet: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct SeizeEvent {
    pub amount: u64,
    pub reason: String,
    pub wallet: Pubkey,
    pub to_wallet: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct RevokeEvent {
    pub amount: u64,
    pub reason: String,
    pub wallet: Pubkey,
    pub mint: Pubkey,
}

#[event]
pub struct IssueEvent {
    pub amount: u64,
    pub issuance_timestamp: i64,
    pub wallet: Pubkey,
    pub mint: Pubkey,
}
