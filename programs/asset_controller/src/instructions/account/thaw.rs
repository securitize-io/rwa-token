use crate::state::*;
use anchor_lang::prelude::*;
use anchor_spl::{
    token_2022::{thaw_account, ThawAccount},
    token_interface::{Mint, Token2022, TokenAccount},
};
use rwa_utils::get_bump_in_seed_form;

#[derive(Accounts)]
#[instruction()]
pub struct ThawTokenAccount<'info> {
    #[account()]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        constraint = asset_controller.authority == authority.key()
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    #[account(mut)]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> ThawTokenAccount<'info> {
    fn thaw_tokens(&self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let accounts = ThawAccount {
            mint: self.asset_mint.to_account_info(),
            authority: self.asset_controller.to_account_info(),
            account: self.token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(self.token_program.key(), accounts, signer_seeds);
        thaw_account(cpi_ctx)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<ThawTokenAccount>) -> Result<()> {
    let asset_mint = ctx.accounts.asset_mint.key();
    let signer_seeds = [
        asset_mint.as_ref(),
        &get_bump_in_seed_form(&ctx.bumps.asset_controller),
    ];
    ctx.accounts.thaw_tokens(&[&signer_seeds])?;
    Ok(())
}
