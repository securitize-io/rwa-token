use anchor_lang::prelude::*;

use crate::{state::*, ChangedMappingEvent, PolicyEngineErrors};

#[derive(Accounts)]
#[event_cpi]
pub struct ChangeMapping<'info> {
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
    ctx: Context<ChangeMapping>,
    mapping_source: Vec<u8>,
    mapping_value: Vec<u8>,
) -> Result<()> {
    require!(
        mapping_source.len() == mapping_value.len(),
        PolicyEngineErrors::InvalidInstructionData
    );

    let previous_mapping = mapping_source
        .iter()
        .map(|source| ctx.accounts.policy_engine.mapping[*source as usize])
        .collect::<Vec<_>>();

    ctx.accounts
        .policy_engine
        .change_mapping(mapping_source.clone(), mapping_value.clone());

    emit_cpi!(ChangedMappingEvent {
        mint: ctx.accounts.policy_engine.asset_mint,
        mapping_source,
        mapping_value,
        previous_mapping
    });

    Ok(())
}
