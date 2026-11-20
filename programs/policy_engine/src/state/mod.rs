pub mod engine;
pub mod track;

pub use engine::*;
pub use track::*;

use anchor_lang::{solana_program::program_error::ProgramError, AnchorDeserialize, Discriminator};
use rwa_utils::GeyserProgramAccount;

#[allow(
    clippy::large_enum_variant,
    reason = "Preserve the public Geyser decoder API without introducing a boxed variant."
)]
pub enum PolicyEngineAccounts {
    PolicyEngineAccount(PolicyEngineAccount),
    TrackerAccount(TrackerAccount),
}

impl GeyserProgramAccount for PolicyEngineAccounts {
    fn discriminator(&self) -> &[u8] {
        match self {
            PolicyEngineAccounts::PolicyEngineAccount(_) => PolicyEngineAccount::DISCRIMINATOR,
            PolicyEngineAccounts::TrackerAccount(_) => TrackerAccount::DISCRIMINATOR,
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
            PolicyEngineAccount::DISCRIMINATOR => {
                let account = PolicyEngineAccount::deserialize(account_data)?;
                Ok(PolicyEngineAccounts::PolicyEngineAccount(account))
            }
            TrackerAccount::DISCRIMINATOR => {
                let account = TrackerAccount::deserialize(account_data)?;
                Ok(PolicyEngineAccounts::TrackerAccount(account))
            }
            _ => Err(ProgramError::InvalidAccountData),
        }
    }
}
