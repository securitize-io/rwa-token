use crate::PolicyEngineErrors;
use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::extension::transfer_hook::TransferHookAccount;
use anchor_spl::token_2022::spl_token_2022::extension::BaseStateWithExtensions;
use anchor_spl::token_2022::spl_token_2022::extension::StateWithExtensions;
use anchor_spl::token_2022::spl_token_2022::state::Account as Token2022Account;
use spl_tlv_account_resolution::pubkey_data::PubkeyData;
use spl_tlv_account_resolution::{
    account::ExtraAccountMeta, seeds::Seed, state::ExtraAccountMetaList,
};

pub const ASSET_CONTROLLER_ID: Pubkey = pubkey!("7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP");
pub const PLATFORM_WALLET_LEVEL: u8 = 30;
pub const LOCKED_LEVEL: u8 = 2;
pub const US_COMPLIANCE_LEVEL: u8 = 11;

pub fn get_custom_error(error_code: u8, fallback_error: PolicyEngineErrors) -> Result<()> {
    match error_code {
        50 => Err(PolicyEngineErrors::ForceAccredited.into()),
        51 => Err(PolicyEngineErrors::ForceAccreditedUS.into()),
        52 => Err(PolicyEngineErrors::TokenPaused.into()),
        53 => Err(PolicyEngineErrors::InvestorFullyLocked.into()),
        _ => Err(fallback_error.into()),
    }
}

pub fn get_total_amount_transferred_in_timeframe(
    transfers: &Vec<Transfer>,
    timeframe: i64,
    timestamp: i64,
) -> u64 {
    let mut total_amount_transferred = 0;
    let min_timestamp = timestamp - timeframe;
    for transfer in transfers {
        if transfer.timestamp >= min_timestamp {
            total_amount_transferred += transfer.amount;
        }
    }
    total_amount_transferred
}

pub fn get_total_transactions_in_timeframe(
    transfers: &Vec<Transfer>,
    timeframe: i64,
    timestamp: i64,
) -> u64 {
    let mut total_transactions = 0;
    let min_timestamp = timestamp - timeframe;
    for transfer in transfers {
        if transfer.timestamp >= min_timestamp {
            total_transactions += 1;
        }
    }
    total_transactions
}

#[derive(InitSpace, AnchorDeserialize, AnchorSerialize, Copy, Clone, PartialEq)]
pub enum Side {
    Buy,
    Sell,
}

#[derive(InitSpace, AnchorDeserialize, AnchorSerialize, Copy, Clone)]
pub struct Transfer {
    pub amount: u64,
    pub timestamp: i64,
    pub side: Side,
}

pub fn assert_is_transferring(account: &AccountInfo) -> Result<()> {
    let account_data = account.try_borrow_data()?;
    let token_account = StateWithExtensions::<Token2022Account>::unpack(&account_data)?;
    let account_extension = token_account.get_extension::<TransferHookAccount>()?;

    // can assume if its not transferring, it wasn't called by token22
    if !bool::from(account_extension.transferring) {
        return Err(PolicyEngineErrors::InvalidCpiTransferProgram.into());
    }

    Ok(())
}

#[inline(never)]
pub fn verify_pda(address: Pubkey, seeds: &[&[u8]], program_id: &Pubkey) -> Result<()> {
    let (pda, _) = Pubkey::find_program_address(seeds, program_id);
    if pda != address {
        return Err(PolicyEngineErrors::InvalidPdaPassedIn.into());
    }
    Ok(())
}

pub fn get_meta_list_size() -> Result<usize> {
    Ok(ExtraAccountMetaList::size_of(get_extra_account_metas()?.len()).unwrap())
}

pub fn get_extra_account_metas() -> Result<Vec<ExtraAccountMeta>> {
    Ok(vec![
        // [5] policy engine account
        ExtraAccountMeta::new_with_seeds(&[Seed::AccountKey { index: 1 }], false, true)?,
        // [6] identity program
        ExtraAccountMeta::new_with_pubkey(&identity_registry::id(), false, false)?,
        // [7] identity registry account
        ExtraAccountMeta::new_external_pda_with_seeds(
            6,
            &[Seed::AccountKey { index: 1 }],
            false,
            false,
        )?,
        // [8] source wallet identity
        ExtraAccountMeta::new_external_pda_with_seeds(
            6,
            &[
                Seed::AccountData {
                    account_index: 0,
                    data_index: 32,
                    length: 32,
                },
                Seed::AccountKey { index: 1 },
            ],
            false,
            false,
        )?,
        // [9] destination wallet identity
        ExtraAccountMeta::new_external_pda_with_seeds(
            6,
            &[
                Seed::AccountData {
                    account_index: 2,
                    data_index: 32,
                    length: 32,
                },
                Seed::AccountKey { index: 1 },
            ],
            false,
            false,
        )?,
        // [10] source identity account
        ExtraAccountMeta::new_with_pubkey_data(
            &PubkeyData::AccountData {
                account_index: 8,
                data_index: 8,
            },
            false,
            false,
        )?,
        // [11] destination identity account
        ExtraAccountMeta::new_with_pubkey_data(
            &PubkeyData::AccountData {
                account_index: 9,
                data_index: 8,
            },
            false,
            false,
        )?,
        // [12] source tracker account
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::AccountKey { index: 1 },
                Seed::AccountKey { index: 10 },
            ],
            false,
            true,
        )?,
        // [13] destination tracker account
        ExtraAccountMeta::new_with_seeds(
            &[
                Seed::AccountKey { index: 1 },
                Seed::AccountKey { index: 11 },
            ],
            false,
            true,
        )?,
    ])
}
