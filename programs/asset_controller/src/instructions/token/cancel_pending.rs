use crate::{
    AssetControllerAccount, AssetControllerErrors, OperationCancelled, PendingOperation,
    PENDING_OPERATION_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022};
#[derive(Accounts)]
#[event_cpi]
pub struct CancelPending<'info> {
    pub authority: Signer<'info>,
    #[account(mint::token_program = token_program)]
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ AssetControllerErrors::InvalidAuthority,
        constraint = asset_controller.version == AssetControllerAccount::VERSION @ AssetControllerErrors::AssetControllerMigrationRequired,
    )]
    pub asset_controller: Account<'info, AssetControllerAccount>,
    /// CHECK: Fixed refund destination recorded by the proposal.
    #[account(mut, address = pending_operation.rent_payer)]
    pub rent_payer: UncheckedAccount<'info>,
    #[account(mut, close = rent_payer, seeds = [PENDING_OPERATION_SEED, asset_mint.key().as_ref(), pending_operation.id.as_ref()], bump, has_one = asset_mint)]
    pub pending_operation: Box<Account<'info, PendingOperation>>,
    pub token_program: Program<'info, Token2022>,
}
pub fn handler(ctx: Context<CancelPending>) -> Result<()> {
    emit_cpi!(OperationCancelled {
        asset_mint: ctx.accounts.asset_mint.key(),
        operation_id: ctx.accounts.pending_operation.id,
        authority: ctx.accounts.authority.key(),
        kind: ctx.accounts.pending_operation.data.kind(),
        amount: ctx.accounts.pending_operation.data.amount()
    });
    Ok(())
}
