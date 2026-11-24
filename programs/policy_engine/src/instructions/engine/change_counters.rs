use anchor_lang::prelude::*;

use crate::{state::*, ChangedCountersEvent};

#[derive(Accounts)]
#[instruction(removed_counters: Vec<u8>, added_counters: Vec<Counter>)]
#[event_cpi]
pub struct ChangeCounters<'info> {
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
    ctx: Context<ChangeCounters>,
    removed_counters: Vec<u8>,
    added_counters: Vec<Counter>,
) -> Result<()> {
    let size_diff = ctx
        .accounts
        .policy_engine
        .update_counters(removed_counters.clone(), added_counters.clone())?;

    emit_cpi!(ChangedCountersEvent {
        mint: ctx.accounts.policy_engine.asset_mint,
        removed_counters,
        added_counters: added_counters.iter().map(|c| c.id).collect()
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
