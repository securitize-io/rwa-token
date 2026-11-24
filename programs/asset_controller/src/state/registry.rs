use super::{CapsConfig, ThrottleConfig, ThrottleState};
use anchor_lang::prelude::*;

// Account traits live in legacy_asset_controller so V1 accounts retain their wire layout.
// Anchor's serde derives still generate the V2 Borsh schema and IDL.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, Debug, PartialEq, Eq)]
pub struct AssetControllerAccount {
    pub version: u8,
    /// mint pubkey
    pub asset_mint: Pubkey,
    /// authority has the ability to seize, freeze token accounts, etc.
    pub authority: Pubkey,
    pub caps: CapsConfig,
    pub throttle: ThrottleConfig,
    pub state: ThrottleState,
}

impl AssetControllerAccount {
    pub const LEGACY_VERSION: u8 = 1;
    pub const VERSION: u8 = 2;
    pub fn new(asset_mint: Pubkey, authority: Pubkey) -> Self {
        Self {
            asset_mint,
            authority,
            version: Self::VERSION,
            caps: CapsConfig::default(),
            throttle: ThrottleConfig::default(),
            state: ThrottleState::default(),
        }
    }
    pub fn get_pda(asset_mint: Pubkey) -> Pubkey {
        Pubkey::find_program_address(&[asset_mint.as_ref()], &crate::id()).0
    }
}

#[event]
pub struct AssetMetadataEvent {
    pub mint: String,
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub uri: Option<String>,
    pub decimals: Option<u8>,
}

#[event]
pub struct ExtensionMetadataEvent {
    pub address: String,
    pub extension_type: u8,
    pub metadata: Vec<u8>,
}
