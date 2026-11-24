use crate::{AssetControllerAccount, OperationKind};
use anchor_lang::prelude::*;
use anchor_spl::token_2022::{burn, Burn};
use anchor_spl::token_interface::{Mint, Token2022, TokenAccount};
use identity_registry::{IdentityAccount, IdentityRegistryAccount};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};

pub struct RevocationAccounts<'a, 'info> {
    pub asset_mint: &'a InterfaceAccount<'info, Mint>,
    pub asset_controller: &'a mut Account<'info, AssetControllerAccount>,
    pub token_account: &'a InterfaceAccount<'info, TokenAccount>,
    pub identity_registry: &'a Account<'info, IdentityRegistryAccount>,
    pub identity_account: &'a Account<'info, IdentityAccount>,
    pub tracker_account: &'a Account<'info, TrackerAccount>,
    pub policy_engine: &'a Account<'info, PolicyEngineAccount>,
    pub policy_engine_program: &'a Program<'info, PolicyEngine>,
    pub token_program: &'a Program<'info, Token2022>,
}
impl RevocationAccounts<'_, '_> {
    pub fn burn_now(&mut self, amount: u64, now: i64, bump: u8) -> Result<()> {
        self.asset_controller
            .record_consumption(OperationKind::Burn, amount, now)?;
        let mint = self.asset_mint.key();
        let bump = [bump];
        let seeds = [mint.as_ref(), bump.as_ref()];
        let signer_seeds = [&seeds[..]];
        burn(
            CpiContext::new_with_signer(
                self.token_program.key(),
                Burn {
                    mint: self.asset_mint.to_account_info(),
                    authority: self.asset_controller.to_account_info(),
                    from: self.token_account.to_account_info(),
                },
                &signer_seeds,
            ),
            amount,
        )?;
        let accounts = policy_engine::cpi::accounts::UpdateCountersOnBurnAccounts {
            asset_mint: self.asset_mint.to_account_info(),
            policy_engine: self.policy_engine.to_account_info(),
            destination_account: self.token_account.to_account_info(),
            identity_registry: self.identity_registry.to_account_info(),
            identity_account: self.identity_account.to_account_info(),
            destination_tracker_account: self.tracker_account.to_account_info(),
            asset_controller: self.asset_controller.to_account_info(),
        };
        policy_engine::cpi::update_counters_on_burn(
            CpiContext::new_with_signer(self.policy_engine_program.key(), accounts, &signer_seeds),
            amount,
        )
    }
}
