use crate::{
    AssetControllerAccount, AssetControllerErrors, MintRequest, OperationProposed,
    PendingOperation, PENDING_OPERATION_SEED,
};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022};
use identity_registry::{IdentityAccount, IdentityRegistryAccount, WalletIdentity};

#[derive(Accounts)]
#[instruction(request: MintRequest)]
#[event_cpi]
pub struct ProposeMint<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(mint::token_program = token_program, mint::authority = asset_controller)]
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(seeds = [asset_mint.key().as_ref()], bump, has_one = asset_mint, has_one = authority @ AssetControllerErrors::InvalidAuthority)]
    pub asset_controller: Account<'info, AssetControllerAccount>,
    /// CHECK: Bound to the typed wallet identity account below.
    pub wallet: UncheckedAccount<'info>,
    /// CHECK: Only its canonical ATA address is required; the SDK can prepare it before execution.
    #[account(address = anchor_spl::associated_token::get_associated_token_address_with_program_id(&wallet.key(), &asset_mint.key(), &token_program.key()))]
    pub token_account: UncheckedAccount<'info>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Account<'info, IdentityRegistryAccount>,
    #[account(has_one = identity_registry)]
    pub identity_account: Account<'info, IdentityAccount>,
    #[account(has_one = identity_account, constraint = wallet_identity_account.wallet == wallet.key() @ AssetControllerErrors::InvalidIdentityAccounts)]
    pub wallet_identity_account: Account<'info, WalletIdentity>,
    #[account(init, payer = payer, space = 8 + PendingOperation::INIT_SPACE,
        seeds = [PENDING_OPERATION_SEED, asset_mint.key().as_ref(), request.id.as_ref()], bump)]
    pub pending_operation: Box<Account<'info, PendingOperation>>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<ProposeMint>, request: MintRequest) -> Result<()> {
    let intent = request.intent(
        ctx.accounts.asset_mint.key(),
        ctx.accounts.wallet.key(),
        ctx.accounts.identity_account.key(),
        ctx.accounts.token_account.key(),
    );
    let pending = PendingOperation::schedule(
        &ctx.accounts.asset_controller,
        intent,
        ctx.accounts.authority.key(),
        ctx.accounts.payer.key(),
        Clock::get()?.unix_timestamp,
    )?;
    let event = OperationProposed::from_pending(&pending);
    ctx.accounts.pending_operation.set_inner(pending);
    emit_cpi!(event);
    Ok(())
}
