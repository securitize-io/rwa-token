use crate::{AssetControllerAccount, OperationKind};
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{mint_to, Mint, MintTo, Token2022, TokenAccount};
use identity_registry::{IdentityAccount, IdentityRegistryAccount};
use policy_engine::{program::PolicyEngine, PolicyEngineAccount, TrackerAccount};

/// Borrowed validated accounts; keeps the public instruction interfaces flat.
pub struct IssuanceAccounts<'a, 'info> {
    pub payer: &'a Signer<'info>,
    pub asset_mint: &'a InterfaceAccount<'info, Mint>,
    pub asset_controller: &'a mut Account<'info, AssetControllerAccount>,
    pub token_account: &'a InterfaceAccount<'info, TokenAccount>,
    pub identity_registry: &'a Account<'info, IdentityRegistryAccount>,
    pub identity_account: &'a Account<'info, IdentityAccount>,
    pub tracker_account: &'a Account<'info, TrackerAccount>,
    pub token_program: &'a Program<'info, Token2022>,
    pub system_program: &'a Program<'info, System>,
    pub policy_engine_program: &'a Program<'info, PolicyEngine>,
    pub policy_engine: &'a Account<'info, PolicyEngineAccount>,
}

impl IssuanceAccounts<'_, '_> {
    pub fn mint_now(
        &mut self,
        amount: u64,
        issuance_timestamp: i64,
        now: i64,
        bump: u8,
    ) -> Result<i64> {
        self.asset_controller
            .record_consumption(OperationKind::Mint, amount, now)?;
        let mint = self.asset_mint.key();
        let bump = [bump];
        let seeds = [mint.as_ref(), bump.as_ref()];
        let signer_seeds = [&seeds[..]];
        mint_to(
            CpiContext::new_with_signer(
                self.token_program.key(),
                MintTo {
                    mint: self.asset_mint.to_account_info(),
                    to: self.token_account.to_account_info(),
                    authority: self.asset_controller.to_account_info(),
                },
                &signer_seeds,
            ),
            amount,
        )?;
        let accounts = policy_engine::cpi::accounts::EnforcePolicyIssuanceAccounts {
            asset_mint: self.asset_mint.to_account_info(),
            policy_engine: self.policy_engine.to_account_info(),
            destination_account: self.token_account.to_account_info(),
            identity_registry: self.identity_registry.to_account_info(),
            identity_account: self.identity_account.to_account_info(),
            destination_tracker_account: self.tracker_account.to_account_info(),
            asset_controller: self.asset_controller.to_account_info(),
            payer: self.payer.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let result = policy_engine::cpi::enforce_policy_issuance(
            CpiContext::new_with_signer(self.policy_engine_program.key(), accounts, &signer_seeds),
            amount,
            issuance_timestamp,
        )?;
        Ok(result.get())
    }
}
