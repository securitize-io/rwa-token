use anchor_lang::prelude::*;

use crate::{state::*, ChangedCounterLimitsEvent, PolicyEngineErrors};

#[derive(Accounts)]
#[event_cpi]
pub struct ChangeCounterLimits<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = policy_engine.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<ChangeCounterLimits>,
    removed_counter_limits: Vec<u8>,
    added_counter_limits: Vec<CounterLimit>,
) -> Result<()> {
    let mut removed_limits = Vec::new();

    for idx in removed_counter_limits.iter() {
        if *idx >= ctx.accounts.policy_engine.counter_limits.len() as u8 {
            return Err(PolicyEngineErrors::CounterLimitIndexNotFound.into());
        }
        removed_limits.push(ctx.accounts.policy_engine.counter_limits[*idx as usize].clone());
    }

    let size_diff = ctx
        .accounts
        .policy_engine
        .update_counter_limits(removed_counter_limits.clone(), added_counter_limits.clone())?;

    emit_cpi!(ChangedCounterLimitsEvent {
        mint: ctx.accounts.policy_engine.asset_mint,
        removed_counter_limits: removed_limits,
        added_counter_limits
    });

    let space = if size_diff > 0 {
        ctx.accounts.policy_engine.to_account_info().data_len() + size_diff as usize
    } else {
        ctx.accounts.policy_engine.to_account_info().data_len() - -size_diff as usize
    };

    let rent = Rent::get()?.minimum_balance(space);

    if rent > ctx.accounts.policy_engine.to_account_info().lamports() {
        anchor_lang::system_program::transfer(
            anchor_lang::context::CpiContext::new(
                ctx.accounts.system_program.key(),
                anchor_lang::system_program::Transfer {
                    from: ctx.accounts.payer.to_account_info(),
                    to: ctx.accounts.policy_engine.to_account_info(),
                },
            ),
            rent.checked_sub(ctx.accounts.policy_engine.to_account_info().lamports())
                .unwrap(),
        )?;
    } else if rent < ctx.accounts.policy_engine.to_account_info().lamports() {
        let diff = ctx
            .accounts
            .policy_engine
            .to_account_info()
            .lamports()
            .checked_sub(rent)
            .unwrap();
        **ctx.accounts.payer.to_account_info().lamports.borrow_mut() = ctx
            .accounts
            .payer
            .to_account_info()
            .lamports()
            .checked_add(diff)
            .unwrap();
        **ctx
            .accounts
            .policy_engine
            .to_account_info()
            .lamports
            .borrow_mut() = ctx
            .accounts
            .policy_engine
            .to_account_info()
            .lamports()
            .checked_sub(diff)
            .unwrap();
    }

    ctx.accounts.policy_engine.to_account_info().resize(space)?;

    Ok(())
}
