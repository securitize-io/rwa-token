use anchor_lang::prelude::*;
use anchor_spl::token_interface::Mint;
use identity_registry::{IdentityAccount, IdentityRegistryAccount};

use crate::{IssuancesPrunedEvent, PolicyEngineAccount, PolicyEngineErrors, TrackerAccount};

#[derive(Accounts)]
#[event_cpi]
pub struct PruneIssuancesAccounts<'info> {
    pub authority: Signer<'info>,
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ PolicyEngineErrors::UnauthorizedSigner,
    )]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump = identity_registry.bump,
        seeds::program = identity_registry::ID,
        has_one = asset_mint,
    )]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(
        seeds = [identity_registry.key().as_ref(), identity_account.owner.as_ref()],
        bump,
        seeds::program = identity_registry::ID,
        has_one = identity_registry,
    )]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(
        mut,
        seeds = [asset_mint.key().as_ref(), identity_account.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = identity_account,
    )]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
}

pub fn handler(ctx: Context<PruneIssuancesAccounts>) -> Result<()> {
    let timestamp = Clock::get()?.unix_timestamp;
    let lock_time = ctx
        .accounts
        .policy_engine
        .get_lock_period(ctx.accounts.identity_account.country);
    let tracker = &mut ctx.accounts.tracker_account;
    let removed_count = tracker.prune_issuances(timestamp, lock_time)?;

    // Anchor serializes the shortened vector directly into the existing account.
    // No temporary serialized Vec, rent refund, or account reallocation is needed.
    if removed_count > 0 {
        emit_cpi!(IssuancesPrunedEvent {
            mint: ctx.accounts.asset_mint.key(),
            identity: ctx.accounts.identity_account.key(),
            timestamp,
            lock_time,
            removed_count: removed_count as u64,
            remaining_count: tracker.issuances.len() as u64,
        });
    }
    Ok(())
}
