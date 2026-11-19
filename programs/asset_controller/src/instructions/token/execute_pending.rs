use crate::utils::{issuance::IssuanceAccounts, revocation::RevocationAccounts};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};
use identity_registry::{IdentityAccount, IdentityRegistryAccount, WalletIdentity};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};

use crate::{
    AssetControllerAccount, AssetControllerErrors, IssueEvent, OperationData, OperationExecuted,
    PendingOperation, RevokeEvent, PENDING_OPERATION_SEED,
};

#[derive(Accounts)]
#[event_cpi]
pub struct ExecutePending<'info> {
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
        constraint = asset_controller.version == AssetControllerAccount::VERSION @ AssetControllerErrors::AssetControllerMigrationRequired,
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    /// CHECK: can be any account
    #[account(
        constraint = wallet.key() == wallet_identity_account.wallet
    )]
    pub wallet: UncheckedAccount<'info>,
    #[account(mut, token::mint = asset_mint, token::authority = wallet, token::token_program = token_program)]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(mut, has_one = asset_mint, has_one = identity_account)]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
    pub policy_engine_program: Program<'info, PolicyEngine>,
    #[account(mut, has_one = asset_mint)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(has_one = identity_account)]
    pub wallet_identity_account: Account<'info, WalletIdentity>,
    /// CHECK: Fixed refund destination; it need not remain system-owned or sign.
    #[account(mut, address = pending_operation.rent_payer)]
    pub rent_payer: UncheckedAccount<'info>,
    #[account(
        mut,
        close = rent_payer,
        seeds = [PENDING_OPERATION_SEED, asset_mint.key().as_ref(), pending_operation.id.as_ref()],
        bump,
        constraint = pending_operation.asset_mint == asset_mint.key() @ AssetControllerErrors::InvalidPendingOperation,
        constraint = pending_operation.wallet == wallet.key() @ AssetControllerErrors::InvalidPendingOperation,
        constraint = pending_operation.identity_account == identity_account.key() @ AssetControllerErrors::InvalidPendingOperation,
        constraint = pending_operation.token_account == token_account.key() @ AssetControllerErrors::InvalidPendingOperation,
    )]
    pub pending_operation: Box<Account<'info, PendingOperation>>,
}

pub fn handler(ctx: Context<ExecutePending>) -> Result<()> {
    let now = Clock::get()?.unix_timestamp;
    ctx.accounts.pending_operation.ensure_executable(now)?;
    let operation = ctx.accounts.pending_operation.data.clone();
    let kind = operation.kind();
    let amount = operation.amount();
    ctx.accounts
        .asset_controller
        .ensure_releasable(kind, amount, now)?;
    match operation {
        OperationData::Mint {
            amount,
            issuance_timestamp,
        } => {
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
                wallet: ctx.accounts.wallet.key(),
                mint: ctx.accounts.asset_mint.key()
            });
        }
        OperationData::Burn { amount, reason } => {
            RevocationAccounts {
                asset_mint: &ctx.accounts.asset_mint,
                asset_controller: &mut ctx.accounts.asset_controller,
                token_account: &ctx.accounts.token_account,
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
                wallet: ctx.accounts.wallet.key(),
                mint: ctx.accounts.asset_mint.key()
            });
        }
    }
    emit_cpi!(OperationExecuted {
        asset_mint: ctx.accounts.asset_mint.key(),
        operation_id: ctx.accounts.pending_operation.id,
        kind,
        authority: ctx.accounts.authority.key(),
        wallet: ctx.accounts.wallet.key(),
        token_account: ctx.accounts.token_account.key(),
        amount
    });
    Ok(())
}
