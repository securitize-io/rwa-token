use super::{CapsConfig, ThrottleConfig, ThrottleState};
use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace, Debug, PartialEq, Eq)]
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

/// Exact deployed V1 layout; only the explicit migration instruction accepts this type.
#[account(discriminator = [70, 136, 149, 138, 12, 87, 52, 105])]
#[derive(InitSpace)]
pub struct LegacyAssetControllerAccount {
    pub version: u8,
    pub asset_mint: Pubkey,
    pub authority: Pubkey,
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::AssetControllerAccounts;
    use rwa_utils::GeyserProgramAccount;

    #[test]
    fn versions_preserve_account_identity_and_the_legacy_field_prefix() {
        let mint = Pubkey::new_unique();
        let authority = Pubkey::new_unique();
        let legacy = LegacyAssetControllerAccount {
            version: 1,
            asset_mint: mint,
            authority,
        };
        let current = AssetControllerAccount::new(mint, authority);
        let mut old_bytes = Vec::new();
        let mut new_bytes = Vec::new();
        legacy.try_serialize(&mut old_bytes).unwrap();
        current.try_serialize(&mut new_bytes).unwrap();
        assert_eq!(old_bytes.len(), 73);
        assert_eq!(new_bytes.len(), 162);
        assert_eq!(old_bytes[..8], new_bytes[..8]);
        assert_eq!(old_bytes[9..], new_bytes[9..73]);
        assert_eq!(old_bytes[8], 1);
        assert_eq!(new_bytes[8], 2);
        assert!(matches!(
            AssetControllerAccounts::deserialize(&old_bytes).unwrap(),
            AssetControllerAccounts::LegacyAssetControllerAccount(_)
        ));
        assert!(matches!(
            AssetControllerAccounts::deserialize(&new_bytes).unwrap(),
            AssetControllerAccounts::AssetControllerAccount(_)
        ));
        new_bytes[8] = 3;
        assert!(AssetControllerAccounts::deserialize(&new_bytes).is_err());
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
