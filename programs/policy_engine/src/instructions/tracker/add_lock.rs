use crate::{Lock, LockEvent, PolicyEngineAccount, TrackerAccount};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use identity_registry::{IdentityAccount, IdentityRegistryAccount};

#[derive(Accounts)]
#[event_cpi]
pub struct AddLockAccounts<'info> {
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
    #[account(mut,
        // Reuse capacity paid for by earlier issuances and locks without refunding it.
        realloc = tracker_account.to_account_info().data_len().max(
            8 + tracker_account.get_current_space() + Lock::INIT_SPACE
        ),
        realloc::zero = false,
        realloc::payer = payer,
        has_one = identity_account
    )]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AddLockAccounts>,
    amount: u64,
    release_timestamp: i64,
    reason: u64,
    reason_string: String,
) -> Result<()> {
    let tracker_account: &mut TrackerAccount = &mut ctx.accounts.tracker_account;

    tracker_account.add_lock(amount, release_timestamp, reason, reason_string.clone())?;

    emit_cpi!(LockEvent {
        amount,
        release_timestamp,
        reason,
        reason_string: reason_string,
        identity: ctx.accounts.identity_account.key(),
    });

    Ok(())
}
