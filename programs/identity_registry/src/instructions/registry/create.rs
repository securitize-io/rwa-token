use crate::state::*;
use anchor_lang::{prelude::*, solana_program::program_option::COption};
use anchor_spl::token_interface::Mint;

#[derive(Accounts)]
#[instruction()]
pub struct CreateIdentityRegistry<'info> {
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
        space = 8 + IdentityRegistryAccount::INIT_SPACE,
        seeds = [asset_mint.key().as_ref()],
        bump,
        payer = payer,
    )]
    pub identity_registry_account: Box<Account<'info, IdentityRegistryAccount>>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<CreateIdentityRegistry>, authority: Pubkey) -> Result<()> {
    #[cfg(not(feature = "localnet"))]
    {
        // asset controller authority derivation and enforcement
        let (controller, _) = Pubkey::find_program_address(
            &[ctx.accounts.asset_mint.key().as_ref()],
            &rwa_utils::ASSET_CONTROLLER_ID,
        );

        require!(
            ctx.accounts.signer.key() == controller,
            crate::IdentityRegistryErrors::UnauthorizedSigner
        );
    }

    ctx.accounts.identity_registry_account.new(
        ctx.accounts.asset_mint.key(),
        authority,
        ctx.bumps.identity_registry_account,
    );
    Ok(())
}
