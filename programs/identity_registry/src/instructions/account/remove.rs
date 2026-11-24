use crate::{
    cpi_enforce_policy_on_levels_change, state::*, RemoveLevelsFromIdentityEvent, POLICY_ENGINE_ID,
};
use anchor_lang::prelude::*;

#[derive(Accounts)]
#[instruction(levels: Vec<u8>)]
#[event_cpi]
pub struct RemoveLevelFromIdentityAccount<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = identity_registry.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account()]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(
        mut,
        seeds = [identity_registry.key().as_ref(), identity_account.owner.as_ref()],
        bump,
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
    ctx: Context<RemoveLevelFromIdentityAccount>,
    levels: Vec<u8>,
    enforce_limits: bool,
) -> Result<()> {
    let signer_seeds = [
        &ctx.accounts.asset_mint.key().to_bytes()[..],
        &[ctx.accounts.identity_registry.bump][..],
    ];

    let count = levels.len();

    ctx.accounts
        .identity_account
        .remove_levels(levels.clone())?;
    let previous_levels = ctx.accounts.identity_account.levels.clone();

    cpi_enforce_policy_on_levels_change(
        ctx.accounts.identity_account.to_account_info(),
        ctx.accounts.identity_registry.to_account_info(),
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.tracker_account.to_account_info(),
        ctx.accounts.policy_engine.to_account_info(),
        ctx.accounts.policy_engine_program.to_account_info(),
        &previous_levels,
        ctx.accounts.identity_account.country,
        enforce_limits,
        &[&signer_seeds[..]],
    )?;

    ctx.accounts.identity_account.to_account_info().resize(
        ctx.accounts.identity_account.to_account_info().data_len()
            - IdentityLevel::INIT_SPACE * count,
    )?;

    emit_cpi!(RemoveLevelsFromIdentityEvent {
        identity: ctx.accounts.identity_account.key(),
        mint: ctx.accounts.asset_mint.key(),
        levels,
        sender: ctx.accounts.payer.key(),
    });

    Ok(())
}
