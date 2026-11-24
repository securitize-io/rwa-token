use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022};

use crate::{
    AssetControllerAccount, AssetControllerErrors, AssetControllerMigrated,
    LegacyAssetControllerAccount,
};

#[derive(Accounts)]
#[event_cpi]
pub struct MigrateAssetController<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub authority: Signer<'info>,
    #[account(mint::token_program = token_program)]
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ AssetControllerErrors::InvalidAuthority,
        constraint = asset_controller.version == AssetControllerAccount::LEGACY_VERSION @ AssetControllerErrors::InvalidLegacyAssetController,
        realloc = 8 + AssetControllerAccount::INIT_SPACE,
        realloc::payer = payer,
        realloc::zero = false,
    )]
    pub asset_controller: Migration<'info, LegacyAssetControllerAccount, AssetControllerAccount>,
    pub token_program: Program<'info, Token2022>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<MigrateAssetController>) -> Result<()> {
    let legacy = ctx.accounts.asset_controller.try_as_from()?;
    let migrated = AssetControllerAccount::new(legacy.asset_mint, legacy.authority);
    ctx.accounts.asset_controller.migrate(migrated)?;
    emit_cpi!(AssetControllerMigrated {
        asset_mint: ctx.accounts.asset_mint.key(),
        authority: ctx.accounts.authority.key(),
        version: AssetControllerAccount::VERSION,
    });
    Ok(())
}
