pub mod mint_controls;
pub mod pending_operation;
pub mod registry;

pub use mint_controls::*;
pub use pending_operation::*;
pub use registry::*;

use anchor_lang::{solana_program::program_error::ProgramError, AnchorDeserialize, Discriminator};
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
        let discriminator = &data
            .get(..8)
            .map(|bytes| {
                let mut array = [0u8; 8];
                array.copy_from_slice(bytes);
                array
            })
            .ok_or(ProgramError::InvalidAccountData)?[..];
        let account_data = &mut &data[8..];
        match discriminator {
            AssetControllerAccount::DISCRIMINATOR => match data.get(8) {
                Some(1) => Ok(Self::LegacyAssetControllerAccount(
                    LegacyAssetControllerAccount::deserialize(account_data)?,
                )),
                Some(2) => Ok(Self::AssetControllerAccount(
                    AssetControllerAccount::deserialize(account_data)?,
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
