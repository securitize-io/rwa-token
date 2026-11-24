use crate::{cpi_remove_tracker_account, state::*, RemovedIdentityEvent, POLICY_ENGINE_ID};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(owner: Pubkey)]
#[event_cpi]
pub struct RevokeIdentityAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = identity_registry.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account(
        seeds = [identity_registry.asset_mint.key().as_ref()],
        bump,
    )]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(
        mut,
        close = payer,
        seeds = [identity_registry.key().as_ref(), identity_account.owner.as_ref()],
        bump,
        constraint = identity_account.owner == owner,
        constraint = identity_account.num_wallets == 1
    )]
    pub identity_account: Box<Account<'info, IdentityAccount>>,

    #[account(
        mut,
        close = payer,
        seeds = [owner.key().as_ref(), identity_registry.asset_mint.as_ref()],
        bump,
        has_one = identity_account,
    )]
    pub wallet_identity: Box<Account<'info, WalletIdentity>>,

    /// CHECK: hardcoded address check
    #[account(address = POLICY_ENGINE_ID)]
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    #[account(mut)]
    pub tracker_account: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    pub asset_mint: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<RevokeIdentityAccount>, _owner: Pubkey) -> Result<()> {
    let signer_seeds = [
        &ctx.accounts.asset_mint.key().to_bytes()[..],
        &[ctx.accounts.identity_registry.bump][..],
    ];

    cpi_remove_tracker_account(
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.identity_registry.to_account_info(),
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.identity_account.to_account_info(),
        ctx.accounts.tracker_account.to_account_info(),
        ctx.accounts.policy_engine_program.to_account_info(),
        &[&signer_seeds[..]],
    )?;

    emit_cpi!(RemovedIdentityEvent {
        identity: ctx.accounts.identity_account.key(),
        mint: ctx.accounts.identity_registry.asset_mint,
        sender: ctx.accounts.payer.key(),
        kind: ctx.accounts.identity_account.levels[0].level,
        owner: ctx.accounts.identity_account.owner,
    });
    Ok(())
}
