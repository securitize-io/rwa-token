use crate::utils::POLICY_ENGINE_ID;
use crate::{cpi_enforce_policy_on_levels_change, state::*, AddLevelsToIdentityEvent};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(levels: Vec<u8>, expiries: Vec<i64>)]
#[event_cpi]
pub struct AddLevelToIdentityAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = identity_registry.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(
        mut,
        seeds = [identity_registry.key().as_ref(), identity_account.owner.as_ref()],
        bump,
        realloc = identity_account.to_account_info().data_len() + IdentityLevel::INIT_SPACE * levels.len(),
        realloc::zero = false,
        realloc::payer = payer,
    )]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    pub system_program: Program<'info, System>,

    #[account(address = POLICY_ENGINE_ID)]
    /// CHECK: hardcoded address check
    pub policy_engine_program: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    #[account(mut)]
    pub policy_engine: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    pub tracker_account: UncheckedAccount<'info>,
    /// CHECK: checked in cpi
    pub asset_mint: UncheckedAccount<'info>,
}

pub fn handler(
    ctx: Context<AddLevelToIdentityAccount>,
    levels: Vec<u8>,
    expiries: Vec<i64>,
    enforce_limits: bool,
) -> Result<()> {
    require_eq!(levels.len(), expiries.len());

    let signer_seeds = [
        &ctx.accounts.asset_mint.key().to_bytes()[..],
        &[ctx.accounts.identity_registry.bump][..],
    ];

    ctx.accounts
        .identity_account
        .add_levels(&levels, &expiries)?;
    let new_levels = ctx.accounts.identity_account.levels.clone();

    cpi_enforce_policy_on_levels_change(
        ctx.accounts.identity_account.to_account_info(),
        ctx.accounts.identity_registry.to_account_info(),
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.tracker_account.to_account_info(),
        ctx.accounts.policy_engine.to_account_info(),
        ctx.accounts.policy_engine_program.to_account_info(),
        &new_levels,
        ctx.accounts.identity_account.country,
        enforce_limits,
        &[&signer_seeds[..]],
    )?;

    emit_cpi!(AddLevelsToIdentityEvent {
        identity: ctx.accounts.identity_account.key(),
        mint: ctx.accounts.asset_mint.key(),
        levels,
        expiries,
        sender: ctx.accounts.payer.key(),
    });
    Ok(())
}
