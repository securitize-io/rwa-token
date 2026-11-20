use anchor_lang::prelude::*;

use crate::{PolicyEngineErrors, TrackerAccount};
use anchor_spl::token_interface::Mint;
use identity_registry::{IdentityAccount, IdentityRegistryAccount};

#[derive(Accounts)]
#[instruction()]
pub struct CloseTrackerAccount<'info> {
    /// CHECK: should be checked by caller (secured by CPI from IRP with IdentityRegistryAccount as signer)
    #[account(mut)]
    pub payer: UncheckedAccount<'info>,

    #[account(has_one = asset_mint, signer)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account()]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: Verified to be already closed.
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(
        mut,
        close = payer,
        has_one = identity_account,
        has_one = asset_mint,
        constraint = tracker_account.total_amount == 0 @ PolicyEngineErrors::TrackerAccountNotEmpty,
    )]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
}
