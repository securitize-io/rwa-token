use anchor_lang::prelude::*;

use crate::{state::*, AttachPolicyEvent};

#[derive(Accounts)]
#[instruction(identity_filter: IdentityFilter, policy_type: PolicyType)]
#[event_cpi]
pub struct AttachToPolicyEngine<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = policy_engine.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account(mut,
        realloc = policy_engine.to_account_info().data_len() + Policy::get_new_space(&identity_filter),
        realloc::zero = false,
        realloc::payer = payer,
    )]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<AttachToPolicyEngine>,
    identity_filter: IdentityFilter,
    policy_type: PolicyType,
    custom_error: u8,
) -> Result<()> {
    let policy_account_address = ctx.accounts.policy_engine.key();
    ctx.accounts.policy_engine.attach(
        policy_account_address,
        policy_type.clone(),
        identity_filter.clone(),
        custom_error,
    )?;

    emit_cpi!(AttachPolicyEvent {
        mint: ctx.accounts.policy_engine.asset_mint,
        policy_type,
        identity_filter,
        custom_error
    });
    Ok(())
}
