use anchor_lang::prelude::*;

use crate::{state::*, ChangedIssuancePoliciesEvent};

#[derive(Accounts)]
#[event_cpi]
pub struct ChangeIssuancePolicies<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = policy_engine.authority == signer.key()
    )]
    pub signer: Signer<'info>,
    #[account(mut)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
}

pub fn handler(
    ctx: Context<ChangeIssuancePolicies>,
    issuance_policies: IssuancePolicies,
) -> Result<()> {

    let previous_issuance_policies = ctx.accounts.policy_engine.issuance_policies.clone();

    ctx.accounts
        .policy_engine
        .change_issuance_policies(issuance_policies.clone())?;

    emit_cpi!(ChangedIssuancePoliciesEvent {
        mint: ctx.accounts.policy_engine.asset_mint,
        issuance_policies,
        previous_issuance_policies
    });
    Ok(())
}
