use anchor_lang::prelude::*;

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
