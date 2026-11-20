use crate::{AssetControllerErrors, OperationExpired, PendingOperation, PENDING_OPERATION_SEED};
use anchor_lang::prelude::*;
/// Permissionless expiry cleanup refunds only the original payer.
#[derive(Accounts)]
#[event_cpi]
pub struct ExpirePending<'info> {
    /// CHECK: Fixed refund destination recorded by the proposal.
    #[account(mut, address = pending_operation.rent_payer)]
    pub rent_payer: UncheckedAccount<'info>,
    #[account(mut, close = rent_payer, seeds = [PENDING_OPERATION_SEED, pending_operation.asset_mint.as_ref(), pending_operation.id.as_ref()], bump)]
    pub pending_operation: Box<Account<'info, PendingOperation>>,
}
pub fn handler(ctx: Context<ExpirePending>) -> Result<()> {
    require!(
        Clock::get()?.unix_timestamp >= ctx.accounts.pending_operation.expires_at,
        AssetControllerErrors::PendingOperationNotExpired
    );
    emit_cpi!(OperationExpired {
        asset_mint: ctx.accounts.pending_operation.asset_mint,
        operation_id: ctx.accounts.pending_operation.id,
        kind: ctx.accounts.pending_operation.data.kind(),
        amount: ctx.accounts.pending_operation.data.amount()
    });
    Ok(())
}
