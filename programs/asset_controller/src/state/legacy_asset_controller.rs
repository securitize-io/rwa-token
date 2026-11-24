//! Temporary V1 compatibility; remove after all controllers have been migrated.
//! Normal Anchor accounts retain ownership/PDA checks and V1 writes preserve their layout.
use super::{AssetControllerAccount, CapsConfig, ThrottleConfig, ThrottleState};
use anchor_lang::prelude::*;

impl Discriminator for AssetControllerAccount {
    const DISCRIMINATOR: &'static [u8] = LegacyAssetControllerAccount::DISCRIMINATOR;
}

impl Owner for AssetControllerAccount {
    fn owner() -> Pubkey {
        crate::ID
    }
}

impl From<LegacyAssetControllerAccount> for AssetControllerAccount {
    fn from(legacy: LegacyAssetControllerAccount) -> Self {
        Self {
            version: Self::LEGACY_VERSION,
            ..Self::new(legacy.asset_mint, legacy.authority)
        }
    }
}

impl AccountDeserialize for AssetControllerAccount {
    fn try_deserialize(buf: &mut &[u8]) -> Result<Self> {
        let discriminator = buf.get(..Self::DISCRIMINATOR.len()).ok_or(error!(
            anchor_lang::error::ErrorCode::AccountDiscriminatorNotFound
        ))?;
        require!(
            discriminator == Self::DISCRIMINATOR,
            anchor_lang::error::ErrorCode::AccountDiscriminatorMismatch
        );
        match buf.get(Self::DISCRIMINATOR.len()) {
            Some(&Self::LEGACY_VERSION) => {
                LegacyAssetControllerAccount::try_deserialize(buf).map(Into::into)
            }
            Some(&Self::VERSION) => Self::try_deserialize_unchecked(buf),
            _ => err!(anchor_lang::error::ErrorCode::AccountDidNotDeserialize),
        }
    }

    fn try_deserialize_unchecked(buf: &mut &[u8]) -> Result<Self> {
        // Match Anchor's generated codec: init decodes the zeroed V2 body before
        // the creation handler initializes it. Checked reads dispatch by version above.
        let mut data = buf.get(Self::DISCRIMINATOR.len()..).ok_or(error!(
            anchor_lang::error::ErrorCode::AccountDidNotDeserialize
        ))?;
        Self::deserialize(&mut data)
            .map_err(|_| error!(anchor_lang::error::ErrorCode::AccountDidNotDeserialize))
    }
}

impl AccountSerialize for AssetControllerAccount {
    fn try_serialize<W: std::io::Write>(&self, writer: &mut W) -> Result<()> {
        match self.version {
            Self::LEGACY_VERSION => {
                // Never silently discard V2-only state or grow a legacy account on exit.
                require!(
                    self.caps == CapsConfig::default()
                        && self.throttle == ThrottleConfig::default()
                        && self.state == ThrottleState::default(),
                    crate::AssetControllerErrors::AssetControllerMigrationRequired
                );
                LegacyAssetControllerAccount {
                    version: self.version,
                    asset_mint: self.asset_mint,
                    authority: self.authority,
                }
                .try_serialize(writer)
            }
            Self::VERSION => writer
                .write_all(Self::DISCRIMINATOR)
                .and_then(|_| self.serialize(writer))
                .map_err(|_| error!(anchor_lang::error::ErrorCode::AccountDidNotSerialize)),
            _ => err!(anchor_lang::error::ErrorCode::AccountDidNotSerialize),
        }
    }
}

/// Exact deployed V1 layout used by migration and compatible account serialization.
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

    #[test]
    fn legacy_round_trip_preserves_bytes_and_rejects_unpersistable_controls() {
        let legacy = LegacyAssetControllerAccount {
            version: 1,
            asset_mint: Pubkey::new_unique(),
            authority: Pubkey::new_unique(),
        };
        let mut bytes = Vec::new();
        legacy.try_serialize(&mut bytes).unwrap();
        let mut decoded = AssetControllerAccount::try_deserialize(&mut bytes.as_slice()).unwrap();
        assert_eq!(decoded.version, 1);
        assert_eq!(decoded.asset_mint, legacy.asset_mint);
        assert_eq!(decoded.authority, legacy.authority);
        for kind in [crate::OperationKind::Mint, crate::OperationKind::Burn] {
            decoded.ensure_immediate(kind, u64::MAX, 1_000).unwrap();
            decoded.record_consumption(kind, u64::MAX, 1_000).unwrap();
        }
        let mut output = [0; 73];
        decoded.try_serialize(&mut output.as_mut_slice()).unwrap();
        assert_eq!(output.as_slice(), bytes);

        decoded.caps.max_mint_per_tx = 1;
        assert_eq!(
            decoded.try_serialize(&mut Vec::new()).unwrap_err(),
            error!(crate::AssetControllerErrors::AssetControllerMigrationRequired)
        );
    }

    #[test]
    fn v2_round_trip_preserves_config_and_counters() {
        let mut controller =
            AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        controller.caps.max_burn_per_tx = 123;
        controller.throttle.enabled = true;
        controller.state.burned_in_window = 456;
        let mut bytes = Vec::new();
        controller.try_serialize(&mut bytes).unwrap();
        assert_eq!(bytes.len(), 162);
        assert_eq!(
            AssetControllerAccount::try_deserialize(&mut bytes.as_slice()).unwrap(),
            controller
        );
    }

    #[test]
    fn trailing_allocation_padding_does_not_change_the_wire_version() {
        let mut controller =
            AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        for version in [
            AssetControllerAccount::LEGACY_VERSION,
            AssetControllerAccount::VERSION,
        ] {
            controller.version = version;
            let mut bytes = Vec::new();
            controller.try_serialize(&mut bytes).unwrap();
            let serialized_len = bytes.len();
            bytes.extend([0xa5; 89]);
            let decoded = AssetControllerAccount::try_deserialize(&mut bytes.as_slice()).unwrap();
            assert_eq!(decoded, controller);
            decoded.try_serialize(&mut bytes.as_mut_slice()).unwrap();
            assert!(bytes[serialized_len..].iter().all(|byte| *byte == 0xa5));
        }
    }

    #[test]
    fn rejects_unknown_versions_wrong_discriminators_and_malformed_lengths() {
        let controller = AssetControllerAccount::new(Pubkey::new_unique(), Pubkey::new_unique());
        let mut bytes = Vec::new();
        controller.try_serialize(&mut bytes).unwrap();
        for length in [0, 7, 8, 9, 73, 161] {
            assert!(AssetControllerAccount::try_deserialize(&mut &bytes[..length]).is_err());
        }
        let mut invalid = bytes.clone();
        invalid[0] ^= 1;
        assert!(AssetControllerAccount::try_deserialize(&mut invalid.as_slice()).is_err());
        for version in [0, 3, 255] {
            let mut invalid = bytes.clone();
            invalid[8] = version;
            assert!(AssetControllerAccount::try_deserialize(&mut invalid.as_slice()).is_err());
        }
        let mut legacy = bytes[..73].to_vec();
        legacy[8] = AssetControllerAccount::LEGACY_VERSION;
        assert!(AssetControllerAccount::try_deserialize(&mut &legacy[..72]).is_err());
        let zeros = [0; 162];
        assert!(AssetControllerAccount::try_deserialize(&mut zeros.as_slice()).is_err());
        AssetControllerAccount::try_deserialize_unchecked(&mut zeros.as_slice()).unwrap();
    }
}
