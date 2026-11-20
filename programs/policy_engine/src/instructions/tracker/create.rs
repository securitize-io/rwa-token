use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use identity_registry::{IdentityRegistryAccount, ID as IDENTITY_REGISTRY_PROGRAMID};

use crate::TrackerAccount;

#[derive(AnchorDeserialize, AnchorSerialize)]
pub struct CreateTokenAccountArgs {
    pub memo_transfer: bool,
}

#[derive(Accounts)]
#[instruction(owner: Pubkey)]
pub struct CreateTrackerAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    /// CHECK: during CPI account hasn't been serialized yet, so check seeds and derivations just in case
    #[account(
        seeds = [identity_registry.key().as_ref(), owner.as_ref()],
        seeds::program = IDENTITY_REGISTRY_PROGRAMID,
        bump,
    )]
    pub identity_account: UncheckedAccount<'info>,
    #[account(has_one = asset_mint, signer)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account()]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        space = 8 + TrackerAccount::INIT_SPACE,
        seeds = [asset_mint.key().as_ref(), identity_account.key().as_ref()],
        bump,
        payer = payer,
    )]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateTrackerAccount>, _owner: Pubkey) -> Result<()> {
    ctx.accounts.tracker_account.set_inner(TrackerAccount::new(
        ctx.accounts.asset_mint.key(),
        ctx.accounts.identity_account.key(),
    ));

    Ok(())
}
