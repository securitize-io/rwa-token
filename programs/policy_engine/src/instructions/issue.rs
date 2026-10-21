use crate::{PolicyEngineAccount, TrackerAccount, ASSET_CONTROLLER_ID};
use anchor_lang::prelude::*;
use anchor_lang::system_program::{transfer, Transfer};
use anchor_spl::token_interface::{Mint, TokenAccount};
use identity_registry::{IdentityAccount, IdentityRegistryAccount};

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct EnforcePolicyIssuanceAccounts<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        signer,
        seeds = [asset_mint.key().as_ref()],
        bump,
        seeds::program = ASSET_CONTROLLER_ID,
    )]
    pub asset_controller: Signer<'info>,
    #[account(
        token::token_program = anchor_spl::token_interface::spl_token_2022::id(),
        mint::authority = asset_controller
    )]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, has_one = asset_mint)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    // can be any token account, user must make sure it is an associated token account with relevant identity permissions
    #[account(
        token::mint = asset_mint,
        token::token_program = anchor_spl::token_interface::spl_token_2022::id(),
    )]
    pub destination_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(
        mut,
        has_one = identity_account
    )]
    pub destination_tracker_account: Box<Account<'info, TrackerAccount>>,
    pub system_program: Program<'info, System>,
}

impl<'info> EnforcePolicyIssuanceAccounts<'info> {
    fn grow_tracker_if_needed(&self) -> Result<()> {
        let tracker = self.destination_tracker_account.to_account_info();
        let space = 8 + self.destination_tracker_account.get_current_space();
        // Reuse space freed by pruning; never shrink or refund the tracker's rent.
        if space > tracker.data_len() {
            let additional_rent = Rent::get()?
                .minimum_balance(space)
                .saturating_sub(tracker.lamports());
            if additional_rent > 0 {
                transfer(
                    CpiContext::new(
                        self.system_program.to_account_info(),
                        Transfer {
                            from: self.payer.to_account_info(),
                            to: tracker.clone(),
                        },
                    ),
                    additional_rent,
                )?;
            }
            tracker.realloc(space, true)?;
        }
        Ok(())
    }
}

pub fn handler(
    ctx: Context<EnforcePolicyIssuanceAccounts>,
    amount: u64,
    issuance_timestamp: i64,
) -> Result<i64> {
    let timestamp = Clock::get()?.unix_timestamp;
    let issuance_timestamp = ctx
        .accounts
        .policy_engine
        .get_issuance_time(issuance_timestamp, timestamp);
    let lock_time = ctx
        .accounts
        .policy_engine
        .get_lock_period(ctx.accounts.identity_account.country);
    let tracker_account: &mut TrackerAccount = &mut ctx.accounts.destination_tracker_account;

    tracker_account.new_issuance(amount, issuance_timestamp, timestamp, lock_time)?;

    if tracker_account.total_amount == amount {
        let changed_counters = ctx.accounts.policy_engine.increase_holders_count(
            &ctx.accounts.identity_account.levels,
            ctx.accounts.identity_account.country,
        )?;
        ctx.accounts
            .policy_engine
            .enforce_counters_on_increment(&changed_counters)?;
    }

    // evaluate policies
    ctx.accounts.policy_engine.enforce_policy_issuance(
        ctx.accounts.asset_mint.supply,
        &ctx.accounts.identity_account.levels,
        ctx.accounts.identity_account.country,
        Some(&tracker_account),
    )?;
    ctx.accounts.grow_tracker_if_needed()?;
    Ok(issuance_timestamp)
}
