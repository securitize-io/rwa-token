use crate::{state::*, RevokeEvent};
use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_2022::{burn, Burn},
    token_interface::{Mint, Token2022, TokenAccount},
};
use identity_registry::{IdentityAccount, IdentityRegistryAccount, WalletIdentity};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};
use rwa_utils::get_bump_in_seed_form;

#[derive(Accounts)]
#[instruction()]
#[event_cpi]
pub struct RevokeTokens<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        constraint = asset_controller.authority == authority.key()
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    #[account(
        mut,
        constraint = revoke_token_account.owner == wallet_identity_account.wallet
    )]
    pub revoke_token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(has_one = asset_mint)]
    pub identity_registry: Box<Account<'info, IdentityRegistryAccount>>,
    #[account(has_one = identity_registry)]
    pub identity_account: Box<Account<'info, IdentityAccount>>,
    #[account(mut, has_one = asset_mint)]
    pub tracker_account: Box<Account<'info, TrackerAccount>>,
    pub policy_engine_program: Program<'info, PolicyEngine>,
    #[account(mut)]
    pub policy_engine: Box<Account<'info, PolicyEngineAccount>>,
    #[account(has_one = identity_account)]
    pub wallet_identity_account: Account<'info, WalletIdentity>,
    pub token_program: Program<'info, Token2022>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

impl<'info> RevokeTokens<'info> {
    fn burn_tokens(&self, amount: u64, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let accounts = Burn {
            mint: self.asset_mint.to_account_info(),
            authority: self.asset_controller.to_account_info(),
            from: self.revoke_token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(self.token_program.key(), accounts, signer_seeds);
        burn(cpi_ctx, amount)?;
        Ok(())
    }

    fn update_counters_on_burn(&self, amount: u64, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let accounts = policy_engine::cpi::accounts::UpdateCountersOnBurnAccounts {
            asset_mint: self.asset_mint.to_account_info(),
            policy_engine: self.policy_engine.to_account_info(),
            destination_account: self.revoke_token_account.to_account_info(),
            identity_registry: self.identity_registry.to_account_info(),
            identity_account: self.identity_account.to_account_info(),
            destination_tracker_account: self.tracker_account.to_account_info(),
            asset_controller: self.asset_controller.to_account_info(),
        };

        let cpi_ctx =
            CpiContext::new_with_signer(self.policy_engine_program.key(), accounts, signer_seeds);
        policy_engine::cpi::update_counters_on_burn(cpi_ctx, amount)?;
        Ok(())
    }
}

pub fn handler<'info>(
    ctx: Context<'info, RevokeTokens<'info>>,
    amount: u64,
    reason: String,
) -> Result<()> {
    let asset_mint = ctx.accounts.asset_mint.key();
    let signer_seeds = [
        asset_mint.as_ref(),
        &get_bump_in_seed_form(&ctx.bumps.asset_controller),
    ];
    ctx.accounts.burn_tokens(amount, &[&signer_seeds])?;
    ctx.accounts
        .update_counters_on_burn(amount, &[&signer_seeds])?;

    emit_cpi!(RevokeEvent {
        amount,
        reason,
        wallet: ctx.accounts.revoke_token_account.owner,
        mint: ctx.accounts.asset_mint.key(),
    });

    Ok(())
}
