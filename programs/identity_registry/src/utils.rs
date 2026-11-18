use anchor_lang::{
    prelude::*,
    solana_program::{instruction::Instruction, program::invoke_signed, pubkey::Pubkey},
};

use crate::IdentityLevel;

pub const POLICY_ENGINE_ID: Pubkey = pubkey!("FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2");

pub fn get_identity_registry_pda(asset_mint: Pubkey) -> Pubkey {
    Pubkey::find_program_address(&[asset_mint.as_ref()], &crate::ID).0
}

#[allow(
    clippy::too_many_arguments,
    reason = "Arguments mirror the manual CPI account and instruction contract."
)]
pub fn cpi_enforce_policy_on_levels_change<'info>(
    identity_account: AccountInfo<'info>,
    identity_registry: AccountInfo<'info>,
    asset_mint: AccountInfo<'info>,
    tracker_account: AccountInfo<'info>,
    policy_engine: AccountInfo<'info>,
    policy_program: AccountInfo<'info>,
    new_levels: &[IdentityLevel],
    new_country: u8,
    enforce_limits: bool,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data: Vec<u8> = vec![236, 18, 123, 137, 253, 244, 32, 248];
    new_levels.serialize(&mut data)?;
    new_country.serialize(&mut data)?;
    (!enforce_limits).serialize(&mut data)?;
    invoke_signed(
        &Instruction {
            program_id: policy_program.key(),
            accounts: vec![
                // Mutable as authority is used as rent receiver on account closure.
                AccountMeta::new_readonly(identity_account.key(), false),
                AccountMeta::new_readonly(identity_registry.key(), true),
                AccountMeta::new_readonly(asset_mint.key(), false),
                AccountMeta::new_readonly(tracker_account.key(), false),
                AccountMeta::new(policy_engine.key(), false),
            ],
            data,
        },
        &[
            identity_account,
            identity_registry,
            asset_mint,
            tracker_account,
            policy_engine,
        ],
        signer_seeds,
    )?;

    Ok(())
}

pub fn cpi_remove_tracker_account<'info>(
    payer: AccountInfo<'info>,
    identity_registry: AccountInfo<'info>,
    asset_mint: AccountInfo<'info>,
    identity_account: AccountInfo<'info>,
    tracker_account: AccountInfo<'info>,
    policy_program: AccountInfo<'info>,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let data = vec![191, 131, 63, 182, 65, 217, 37, 166];
    invoke_signed(
        &Instruction {
            program_id: policy_program.key(),
            accounts: vec![
                // Mutable as authority is used as rent receiver on account closure.
                AccountMeta::new(payer.key(), false),
                AccountMeta::new_readonly(identity_registry.key(), true),
                AccountMeta::new_readonly(asset_mint.key(), false),
                AccountMeta::new_readonly(identity_account.key(), false),
                AccountMeta::new(tracker_account.key(), false),
            ],
            data,
        },
        &[
            payer,
            identity_registry,
            asset_mint,
            identity_account,
            tracker_account,
        ],
        signer_seeds,
    )?;

    Ok(())
}

#[allow(
    clippy::too_many_arguments,
    reason = "Arguments mirror the manual CPI account and instruction contract."
)]
pub fn cpi_create_tracker_account<'info>(
    payer: AccountInfo<'info>,
    identity_account: AccountInfo<'info>,
    identity_registry: AccountInfo<'info>,
    asset_mint: AccountInfo<'info>,
    tracker_account: AccountInfo<'info>,
    policy_program: AccountInfo<'info>,
    system_program: AccountInfo<'info>,
    owner: Pubkey,
    signer_seeds: &[&[&[u8]]],
) -> Result<()> {
    let mut data: Vec<u8> = vec![40, 16, 40, 191, 109, 177, 83, 190];
    data.extend(owner.to_bytes());

    invoke_signed(
        &Instruction {
            program_id: policy_program.key(),
            accounts: vec![
                // Mutable as authority is used as rent receiver on account closure.
                AccountMeta::new(payer.key(), true),
                AccountMeta::new_readonly(identity_account.key(), false),
                AccountMeta::new_readonly(identity_registry.key(), true),
                AccountMeta::new_readonly(asset_mint.key(), false),
                AccountMeta::new(tracker_account.key(), false),
                AccountMeta::new_readonly(system_program.key(), false),
            ],
            data,
        },
        &[
            payer,
            identity_account,
            identity_registry,
            asset_mint,
            tracker_account,
            system_program,
        ],
        signer_seeds,
    )?;

    Ok(())
}
