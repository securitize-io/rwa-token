use anchor_lang::prelude::*;
use anchor_spl::token_interface::{Mint, Token2022};

use crate::{
    AssetControllerAccount, AssetControllerErrors, CapsConfig, CapsUpdated, ThrottleConfig,
    ThrottleUpdated,
};

#[derive(Accounts)]
#[event_cpi]
pub struct ConfigureMintControls<'info> {
    pub authority: Signer<'info>,
    #[account(mint::token_program = token_program)]
    pub asset_mint: InterfaceAccount<'info, Mint>,
    #[account(
        mut,
        seeds = [asset_mint.key().as_ref()],
        bump,
        has_one = asset_mint,
        has_one = authority @ AssetControllerErrors::InvalidAuthority,
    )]
    pub asset_controller: Account<'info, AssetControllerAccount>,
    pub token_program: Program<'info, Token2022>,
}

pub fn set_caps(ctx: Context<ConfigureMintControls>, caps: CapsConfig) -> Result<()> {
    require!(
        ctx.accounts.asset_controller.caps != caps,
        AssetControllerErrors::MintControlsUnchanged
    );
    ctx.accounts.asset_controller.caps = caps;
    emit_cpi!(CapsUpdated {
        asset_mint: ctx.accounts.asset_mint.key(),
        authority: ctx.accounts.authority.key(),
        caps
    });
    Ok(())
}

pub fn set_throttle(ctx: Context<ConfigureMintControls>, throttle: ThrottleConfig) -> Result<()> {
    throttle.validate()?;
    require!(
        ctx.accounts.asset_controller.throttle != throttle,
        AssetControllerErrors::MintControlsUnchanged
    );
    // Updating limits never erases already recorded consumption or rebases the window.
    ctx.accounts.asset_controller.throttle = throttle;
    emit_cpi!(ThrottleUpdated {
        asset_mint: ctx.accounts.asset_mint.key(),
        authority: ctx.accounts.authority.key(),
        throttle
    });
    Ok(())
}
