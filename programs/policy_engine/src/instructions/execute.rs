use crate::{
    assert_is_transferring, verify_pda, PolicyEngineAccount, PolicyEngineErrors, Side, TrackerAccount, LOCKED_LEVEL, PLATFORM_WALLET_LEVEL
};
use anchor_lang::prelude::*;
use anchor_spl::{token_2022::spl_token_2022::extension::permanent_delegate::PermanentDelegate, token_interface::{get_mint_extension_data, Mint, TokenAccount}};
use identity_registry::{
    program::IdentityRegistry, IdentityAccount, WalletIdentity
};
use rwa_utils::META_LIST_ACCOUNT_SEED;

#[derive(Accounts)]
#[instruction(amount: u64)]
pub struct ExecuteTransferHook<'info> {
    #[account()]
    pub source_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(
        token::token_program = anchor_spl::token_interface::spl_token_2022::id(),
    )]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        token::mint = asset_mint,
        token::token_program = anchor_spl::token_interface::spl_token_2022::id(),
    )]
    // can be any token account, user must make sure it is an associated token account with relevant identity permissions
    pub destination_account: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: can be any account
    pub owner_delegate: UncheckedAccount<'info>,
    /// CHECK: meta list account
    #[account(
        seeds = [META_LIST_ACCOUNT_SEED, asset_mint.key().as_ref()],
        bump,
    )]
    pub extra_metas_account: UncheckedAccount<'info>,
    /// CHECK: internal ix checks
    #[account(mut)]
    pub policy_engine_account: UncheckedAccount<'info>,
    pub identity_registry: Program<'info, IdentityRegistry>,
    /// CHECK: internal ix checks
    pub identity_registry_account: UncheckedAccount<'info>,
    /// CHECK: internal ix checks
    pub source_wallet_identity: UncheckedAccount<'info>,
    /// CHECK: internal ix checks
    pub destination_wallet_identity: UncheckedAccount<'info>,
    /// CHECK: internal ix checks
    pub source_identity_account: UncheckedAccount<'info>,
    /// CHECK: internal ix checks
    pub destination_identity_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: internal ix checks
    pub source_tracker_account: UncheckedAccount<'info>,
    #[account(mut)]
    /// CHECK: internal ix checks
    pub destination_tracker_account: UncheckedAccount<'info>,
}

pub fn handler(ctx: Context<ExecuteTransferHook>, amount: u64) -> Result<()> {
    let asset_mint = ctx.accounts.asset_mint.key();

    assert_is_transferring(&ctx.accounts.source_account.to_account_info())?;
    assert_is_transferring(&ctx.accounts.destination_account.to_account_info())?;

    require!(
        ctx.accounts.policy_engine_account.owner == &crate::id()
            && ctx.accounts.policy_engine_account.data.borrow()[..8]
                == *PolicyEngineAccount::DISCRIMINATOR,
        PolicyEngineErrors::InvalidPolicyEngineAccount
    );

    let mut policy_engine_account = Box::new(PolicyEngineAccount::deserialize(
        &mut &ctx.accounts.policy_engine_account.data.borrow()[8..],
    )?);

    require!(
        policy_engine_account.asset_mint == asset_mint,
        PolicyEngineErrors::InvalidPolicyEngineAccount
    );

    // user must have identity account setup if there are policies attached
    verify_pda(
        ctx.accounts.identity_registry_account.key(),
        &[&asset_mint.to_bytes()],
        &identity_registry::id(),
    )?;

    require!(ctx.accounts.destination_identity_account.owner.key() == identity_registry::id(), PolicyEngineErrors::InvalidIdentityAccount);

    let destination_identity_account = Box::new(IdentityAccount::try_deserialize(
                &mut &ctx.accounts.destination_identity_account.data.borrow()[..],
            )?);

    if destination_identity_account.owner != ctx.accounts.destination_account.owner {
        //deserialize wallet identity
        let destination_wallet_identity = WalletIdentity::deserialize(
            &mut &ctx.accounts.destination_wallet_identity.data.borrow()[8..],
        )?;

        require!(
            ctx.accounts.destination_account.owner == destination_wallet_identity.wallet,
            PolicyEngineErrors::InvalidIdentityAccount
        );
    }

    require!(
        destination_identity_account.identity_registry
            == ctx.accounts.identity_registry_account.key(),
        PolicyEngineErrors::InvalidIdentityAccount
    );

    require!(ctx.accounts.source_identity_account.owner.key() == identity_registry::id(), PolicyEngineErrors::InvalidIdentityAccount);

    let source_identity_account = Box::new(IdentityAccount::try_deserialize(
        &mut &ctx.accounts.source_identity_account.data.borrow()[..],
    )?);

    if source_identity_account.owner != ctx.accounts.source_account.owner {
        //deserialize wallet identity
        let source_wallet_identity = WalletIdentity::deserialize(
            &mut &ctx.accounts.source_wallet_identity.data.borrow()[8..],
        )?;

        require!(
            ctx.accounts.source_account.owner == source_wallet_identity.wallet,
            PolicyEngineErrors::InvalidIdentityAccount
        );
    }
    require!(
        source_identity_account.identity_registry
            == ctx.accounts.identity_registry_account.key(),
        PolicyEngineErrors::InvalidIdentityAccount
    );

    let self_transfer = ctx.accounts.source_account.owner == ctx.accounts.destination_account.owner
        || ctx.accounts.source_identity_account.key()
            == ctx.accounts.destination_identity_account.key();

        //can skip owner program check, its going to be mutable
    let mut source_tracker_account = Box::new(TrackerAccount::try_deserialize(&mut &ctx.accounts.source_tracker_account.data.borrow()[..])?);
    
    require!(
        source_tracker_account.identity_account == ctx.accounts.source_identity_account.key(),
        PolicyEngineErrors::TrackerAccountOwnerMismatch
    );

    let timestamp = Clock::get()?.unix_timestamp;
    let is_permanent_delegate = ctx.accounts.owner_delegate.key() == get_mint_extension_data::<PermanentDelegate>(&ctx.accounts.asset_mint.to_account_info())?.delegate.0;
    let is_platform_wallet_from = source_identity_account.levels.iter().any(|l| l.level == PLATFORM_WALLET_LEVEL);
    let is_platform_wallet_to = destination_identity_account.levels.iter().any(|l| l.level == PLATFORM_WALLET_LEVEL);
    let is_platform_wallet = is_platform_wallet_from || is_platform_wallet_to;
    
    if !self_transfer {
        
        
        if !is_permanent_delegate && !is_platform_wallet {
            let is_locked_from = source_identity_account.levels.iter().any(|l| l.level == LOCKED_LEVEL);
            let transferable_amount = if !is_locked_from { source_tracker_account.get_transferable_balance(timestamp)? } else { 0 };
            require!(
                transferable_amount >= amount,
                PolicyEngineErrors::TokensLocked
            );

            let hold_time = policy_engine_account.get_lock_period(source_identity_account.country);

            let compliance_transferable_amount = source_tracker_account.get_compliance_transferable_balance(timestamp, hold_time, transferable_amount)?;

            require!(
                compliance_transferable_amount >= amount,
                PolicyEngineErrors::HoldUp
            );
        }

        source_tracker_account.update_transfer_history(
            amount,
            Side::Sell,
        )?;
        let source_tracker_account_data = source_tracker_account.try_to_vec()?;
        let source_tracker_account_data_len = source_tracker_account_data.len();
        ctx.accounts.source_tracker_account.data.borrow_mut()
            [8..8 + source_tracker_account_data_len]
            .copy_from_slice(&source_tracker_account_data);
    }
    
    
    let mut destination_tracker_account = Box::new(TrackerAccount::try_deserialize(&mut &ctx.accounts.destination_tracker_account.data.borrow()[..])?);
    require!(
        destination_tracker_account.identity_account
            == ctx.accounts.destination_identity_account.key(),
        PolicyEngineErrors::TrackerAccountOwnerMismatch
    );

    if !self_transfer {
        destination_tracker_account.update_transfer_history(
            amount,
            Side::Buy,
        )?;
        let destination_tracker_account_data = destination_tracker_account.try_to_vec()?;
        let destination_tracker_account_data_len = destination_tracker_account_data.len();
        ctx.accounts.destination_tracker_account.data.borrow_mut()
            [8..8 + destination_tracker_account_data_len]
            .copy_from_slice(&destination_tracker_account_data);
    }

    let source_balance = source_tracker_account.total_amount;
    let destination_balance = destination_tracker_account.total_amount;


    if !is_permanent_delegate && !self_transfer {
        let decreased_counters = if source_balance == 0 {
            // source has 0 balance
            policy_engine_account.decrease_holders_count(&source_identity_account.levels, source_identity_account.country)?
        } else {
            vec![]
        };
        let increased_counters = if destination_balance == amount {
            // destination has 0 balance
            policy_engine_account
                .increase_holders_count(&destination_identity_account.levels, destination_identity_account.country)?
        } else {
            vec![]
        };

        if !decreased_counters.is_empty() {
            policy_engine_account.enforce_counters_on_decrement(&decreased_counters)?;
        }

        if !increased_counters.is_empty() {
            policy_engine_account.enforce_counters_on_increment(&increased_counters)?;
        }

        if !increased_counters.is_empty() || !decreased_counters.is_empty() {
            let data = policy_engine_account.try_to_vec()?;
            let len = data.len();
            ctx.accounts.policy_engine_account.data.borrow_mut()[8..8 + len].copy_from_slice(&data);
        }
    }

    if !is_permanent_delegate {
        // evaluate policies
        policy_engine_account.enforce_policy(
            amount,
            timestamp,
            &source_identity_account.levels,
            source_identity_account.country,
            &destination_identity_account.levels,
            destination_identity_account.country,
            source_balance,
            destination_balance,
            self_transfer,
            is_platform_wallet,
        )?;
    }

    Ok(())
}
