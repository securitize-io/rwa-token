use anchor_lang::prelude::*;

use super::IdentityLevel;

#[account()]
#[derive(InitSpace)]
pub struct IdentityRegistryAccount {
    pub version: u8,
    pub bump: u8,
    /// corresponding asset mint
    pub asset_mint: Pubkey,
    /// authority to manage the registry
    pub authority: Pubkey,
}

/// level if attached to user account, will skip any policy checks
pub const SKIP_POLICY_LEVEL: IdentityLevel = IdentityLevel {
    level: u8::MAX,
    expiry: i64::MAX,
};

/// level to be used if user does not have any identity
pub const NO_IDENTITY_LEVEL: IdentityLevel = IdentityLevel {
    level: u8::MAX - 1,
    expiry: i64::MAX,
};

pub const NO_TRACKER_LEVEL: IdentityLevel = IdentityLevel {
    level: u8::MAX - 2,
    expiry: i64::MAX,
};

impl IdentityRegistryAccount {
    pub const VERSION: u8 = 1;
    pub fn new(&mut self, asset_mint: Pubkey, authority: Pubkey, bump: u8) {
        self.asset_mint = asset_mint;
        self.authority = authority;
        self.version = Self::VERSION;
        self.bump = bump;
    }
}
