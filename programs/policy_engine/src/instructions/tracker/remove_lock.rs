use crate::{PolicyEngineAccount, TrackerAccount, UnlockEvent};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use identity_registry::{IdentityAccount, IdentityRegistryAccount};

#[derive(Accounts)]
#[event_cpi]
pub struct RemoveLockAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = policy_engine.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account()]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, has_one = asset_mint)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    // Keep the allocation and rent available for later locks and issuances.
    #[account(mut, has_one = identity_account)]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<RemoveLockAccounts>, index: u8) -> Result<()> {
    let tracker_account: &mut TrackerAccount = &mut ctx.accounts.tracker_account;

    let lock = tracker_account.remove_lock(index as usize)?;

    emit_cpi!(UnlockEvent {
        amount: lock.amount,
        release_timestamp: lock.release_time,
        reason: lock.reason,
        reason_string: lock.reason_string,
        identity: ctx.accounts.identity_account.key(),
    });

    Ok(())
}
