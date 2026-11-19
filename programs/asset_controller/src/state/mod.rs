mod legacy_asset_controller;
pub mod mint_controls;
pub mod pending_operation;
pub mod registry;

pub use legacy_asset_controller::LegacyAssetControllerAccount;
pub use mint_controls::*;
pub use pending_operation::*;
pub use registry::*;

use anchor_lang::{
    solana_program::program_error::ProgramError, AccountDeserialize, AnchorDeserialize,
    Discriminator,
};
use rwa_utils::GeyserProgramAccount;

pub enum AssetControllerAccounts {
    AssetControllerAccount(AssetControllerAccount),
    LegacyAssetControllerAccount(LegacyAssetControllerAccount),
    PendingOperation(PendingOperation),
}

impl GeyserProgramAccount for AssetControllerAccounts {
    fn discriminator(&self) -> &[u8] {
        match self {
            AssetControllerAccounts::AssetControllerAccount(_) => {
                AssetControllerAccount::DISCRIMINATOR
            }
            AssetControllerAccounts::LegacyAssetControllerAccount(_) => {
                LegacyAssetControllerAccount::DISCRIMINATOR
            }
            AssetControllerAccounts::PendingOperation(_) => PendingOperation::DISCRIMINATOR,
        }
    }

    fn deserialize(data: &[u8]) -> Result<Self, ProgramError>
    where
        Self: Sized,
    {
        let discriminator = data.get(..8).ok_or(ProgramError::InvalidAccountData)?;
        let account_data = &mut &data[8..];
        match discriminator {
            AssetControllerAccount::DISCRIMINATOR => match data.get(8) {
                Some(&AssetControllerAccount::LEGACY_VERSION) => {
                    Ok(Self::LegacyAssetControllerAccount(
                        LegacyAssetControllerAccount::try_deserialize(&mut &data[..])?,
                    ))
                }
                Some(&AssetControllerAccount::VERSION) => Ok(Self::AssetControllerAccount(
                    AssetControllerAccount::try_deserialize(&mut &data[..])?,
                )),
                _ => Err(ProgramError::InvalidAccountData),
            },
            PendingOperation::DISCRIMINATOR => Ok(Self::PendingOperation(
                PendingOperation::deserialize(account_data)?,
            )),
            _ => Err(ProgramError::InvalidAccountData),
        }
    }
}
