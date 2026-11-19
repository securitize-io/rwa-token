use crate::utils::revocation::RevocationAccounts;
use crate::{state::*, AssetControllerErrors, RevokeEvent};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, Token2022, TokenAccount},
};
use identity_registry::{IdentityAccount, IdentityRegistryAccount, WalletIdentity};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};

#[derive(Accounts)]
#[instruction()]
#[event_cpi]
pub struct RevokeTokens<'info> {
    pub authority: Signer<'info>,
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ AssetControllerErrors::InvalidAuthority
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    #[account(
        mut,
        token::mint = asset_mint,
        token::token_program = token_program,
        constraint = revoke_token_account.owner == wallet_identity_account.wallet
    )]
    pub revoke_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(mut, has_one = asset_mint, has_one = identity_account)]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub policy_engine_program: Program<'info, PolicyEngine>,
    #[account(mut)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(has_one = identity_account)]
    pub wallet_identity_account: Account<'info, WalletIdentity>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler<'info>(
    ctx: Context<'info, RevokeTokens<'info>>,
    amount: u64,
    reason: String,
) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .asset_controller
        .ensure_immediate(OperationKind::Burn, amount, now)?;
    RevocationAccounts {
        asset_mint: &ctx.accounts.asset_mint,
        asset_controller: &mut ctx.accounts.asset_controller,
        token_account: &ctx.accounts.revoke_token_account,
        identity_registry: &ctx.accounts.identity_registry,
        identity_account: &ctx.accounts.identity_account,
        tracker_account: &ctx.accounts.tracker_account,
        policy_engine: &ctx.accounts.policy_engine,
        policy_engine_program: &ctx.accounts.policy_engine_program,
        token_program: &ctx.accounts.token_program,
    }
    .burn_now(amount, now, ctx.bumps.asset_controller)?;

    emit_cpi!(RevokeEvent {
        amount,
        reason,
        wallet: ctx.accounts.revoke_token_account.owner,
        mint: ctx.accounts.asset_mint.key(),
    });

    Ok(())
}
