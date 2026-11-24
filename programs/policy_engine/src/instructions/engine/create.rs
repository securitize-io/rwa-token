use anchor_lang::{prelude::*, solana_program::program_option::COption};
use anchor_spl::token_interface::Mint;
use rwa_utils::META_LIST_ACCOUNT_SEED;
use spl_tlv_account_resolution::state::ExtraAccountMetaList;
use spl_transfer_hook_interface::instruction::ExecuteInstruction;

use crate::{get_extra_account_metas, get_meta_list_size, state::*};

#[derive(Accounts)]
#[instruction()]
pub struct CreatePolicyEngine<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(
        constraint = asset_mint.mint_authority == COption::Some(signer.key()),
    )]
    pub signer: Signer<'info>,
    #[account()]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        init,
        space = 8 + PolicyEngineAccount::INIT_SPACE,
        seeds = [asset_mint.key().as_ref()],
        bump,
        payer = payer,
    )]
    pub policy_engine_account: Box<Account<'info, PolicyEngineAccount>>,
    #[account(
        init,
        space = get_meta_list_size()?,
        seeds = [META_LIST_ACCOUNT_SEED, asset_mint.key().as_ref()],
        bump,
        payer = payer,
    )]
    /// CHECK: extra metas account
    pub extra_metas_account: UncheckedAccount<'info>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreatePolicyEngine>, authority: Pubkey) -> Result<()> {
    #[cfg(not(feature = "localnet"))]
    {
        // asset controller authority derivation and enforcement
        let (controller, _) = Pubkey::find_program_address(
            &[ctx.accounts.asset_mint.key().as_ref()],
            &crate::ASSET_CONTROLLER_ID,
        );

        require!(
            ctx.accounts.signer.key() == controller,
            crate::PolicyEngineErrors::UnauthorizedSigner
        );
    }

    // initialize the extra metas account
    let extra_metas_account = &ctx.accounts.extra_metas_account;
    let metas = get_extra_account_metas()?;
    let mut data = extra_metas_account.try_borrow_mut_data()?;
    ExtraAccountMetaList::init::<ExecuteInstruction>(&mut data, &metas)?;

    ctx.accounts
        .policy_engine_account
        .set_inner(PolicyEngineAccount::new(
            authority,
            ctx.accounts.asset_mint.key(),
        ));

    Ok(())
}
