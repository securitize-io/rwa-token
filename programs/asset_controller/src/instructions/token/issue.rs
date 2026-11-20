use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{Mint, Token2022, TokenAccount},
};
use identity_registry::{IdentityAccount, IdentityRegistryAccount, WalletIdentity};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};

use crate::utils::issuance::IssuanceAccounts;
use crate::{AssetControllerAccount, AssetControllerErrors, IssueEvent, OperationKind};

#[derive(Accounts)]
#[event_cpi]
pub struct IssueTokens<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(mut, mint::token_program = token_program, mint::authority = asset_controller)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        mut,
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ AssetControllerErrors::InvalidAuthority,
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    /// CHECK: can be any account
    #[account(
        constraint = to.key() == wallet_identity_account.wallet
    )]
    pub to: UncheckedAccount<'info>,
    #[account(
        init_if_needed,
        payer = payer,
        associated_token::token_program = token_program,
        associated_token::mint = asset_mint,
        associated_token::authority = to,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(mut, has_one = asset_mint, has_one = identity_account)]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
    pub policy_engine_program: Program<'info, PolicyEngine>,
    #[account(mut, has_one = asset_mint)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(has_one = identity_account)]
    pub wallet_identity_account: Account<'info, WalletIdentity>,
}

pub fn handler(ctx: Context<IssueTokens>, amount: u64, issuance_timestamp: i64) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts
        .asset_controller
        .ensure_immediate(OperationKind::Mint, amount, now)?;
    let issuance_timestamp = IssuanceAccounts {
        payer: &ctx.accounts.payer,
        asset_mint: &ctx.accounts.asset_mint,
        asset_controller: &mut ctx.accounts.asset_controller,
        token_account: &ctx.accounts.token_account,
        identity_registry: &ctx.accounts.identity_registry,
        identity_account: &ctx.accounts.identity_account,
        tracker_account: &ctx.accounts.tracker_account,
        token_program: &ctx.accounts.token_program,
        system_program: &ctx.accounts.system_program,
        policy_engine_program: &ctx.accounts.policy_engine_program,
        policy_engine: &ctx.accounts.policy_engine,
    }
    .mint_now(amount, issuance_timestamp, now, ctx.bumps.asset_controller)?;
    emit_cpi!(IssueEvent {
        amount,
        issuance_timestamp,
        wallet: ctx.accounts.to.key(),
        mint: ctx.accounts.asset_mint.key()
    });
    Ok(())
}
