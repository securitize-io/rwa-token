/// creates a mint a new asset
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    token_metadata_initialize, Mint, Token2022, TokenMetadataInitialize,
};
use identity_registry::{
    cpi::{accounts::CreateIdentityRegistry, create_identity_registry},
    program::IdentityRegistry,
};
use policy_engine::{
    cpi::{accounts::CreatePolicyEngine, create_policy_engine},
    program::PolicyEngine,
};
use rwa_utils::get_bump_in_seed_form;

use crate::{state::*, update_account_lamports_to_minimum_balance};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct CreateAssetControllerArgs {
    pub decimals: u8,
    pub name: String,
    pub symbol: String,
    pub uri: String,
}

#[derive(Accounts)]
#[instruction(args: CreateAssetControllerArgs)]
#[event_cpi]
pub struct CreateAssetController<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account()]
    /// CHECK: can be any account
    pub authority: UncheckedAccount<'info>,
    #[account(
        init,
        payer = payer,
        space = 8 + AssetControllerAccount::INIT_SPACE,
        seeds = [asset_mint.key().as_ref()],
        bump,
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    #[account(
        init,
        signer,
        payer = payer,
        mint::token_program = token_program,
        mint::decimals = args.decimals,
        mint::authority = asset_controller.key(),
        mint::freeze_authority = asset_controller.key(),
        extensions::permanent_delegate::delegate = asset_controller.key(),
        extensions::transfer_hook::authority = asset_controller.key(),
        extensions::transfer_hook::program_id = policy_engine::id(),
        extensions::metadata_pointer::authority = asset_controller.key(),
        extensions::metadata_pointer::metadata_address = asset_mint.key(),
        extensions::close_authority::authority = asset_controller.key(),
    )]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut)]
    /// CHECK: cpi checks
    pub extra_metas_account: UncheckedAccount<'info>,
    /// CHECK: cpi checks
    #[account(mut)]
    pub policy_engine_account: UncheckedAccount<'info>,
    /// CHECK: cpi checks
    #[account(mut)]
    pub identity_registry_account: UncheckedAccount<'info>,
    /// CHECK: cpi checks
    pub policy_engine: Program<'info, PolicyEngine>,
    pub identity_registry: Program<'info, IdentityRegistry>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> CreateAssetController<'info> {
    fn initialize_token_metadata(
        &self,
        name: String,
        symbol: String,
        uri: String,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        let cpi_accounts = TokenMetadataInitialize {
            program_id: self.token_program.to_account_info(),
            mint: self.asset_mint.to_account_info(),
            metadata: self.asset_mint.to_account_info(), // metadata account is the mint, since data is stored in mint
            mint_authority: self.asset_controller.to_account_info(),
            update_authority: self.asset_controller.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(self.token_program.key(), cpi_accounts, signer_seeds);
        token_metadata_initialize(cpi_ctx, name, symbol, uri)?;
        Ok(())
    }

    fn create_policy_engine(&self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let cpi_accounts = CreatePolicyEngine {
            payer: self.payer.to_account_info(),
            signer: self.asset_controller.to_account_info(),
            asset_mint: self.asset_mint.to_account_info(),
            extra_metas_account: self.extra_metas_account.to_account_info(),
            policy_engine_account: self.policy_engine_account.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(self.policy_engine.key(), cpi_accounts, signer_seeds);
        create_policy_engine(cpi_ctx, self.authority.key())?;
        Ok(())
    }

    fn create_identity_registry(&self, signer_seeds: &[&[&[u8]]]) -> Result<()> {
        let cpi_accounts = CreateIdentityRegistry {
            payer: self.payer.to_account_info(),
            signer: self.asset_controller.to_account_info(),
            asset_mint: self.asset_mint.to_account_info(),
            identity_registry_account: self.identity_registry_account.to_account_info(),
            system_program: self.system_program.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(self.identity_registry.key(), cpi_accounts, signer_seeds);
        create_identity_registry(cpi_ctx, self.authority.key())?;
        Ok(())
    }
}

pub fn handler(ctx: Context<CreateAssetController>, args: CreateAssetControllerArgs) -> Result<()> {
    #[cfg(not(feature = "localnet"))]
    {
        // RWA RBAC authority derivation and enforcement
        let (controller, _) = Pubkey::find_program_address(
            &[
                ctx.accounts.asset_mint.key().as_ref(),
                b"AssetAccessController".as_ref(),
            ],
            &rwa_utils::ASSET_ACCESS_CONTROLLER_ID,
        );

        let (controller_authority, _) = Pubkey::find_program_address(
            &[controller.as_ref()],
            &rwa_utils::ASSET_ACCESS_CONTROLLER_ID,
        );

        require!(
            ctx.accounts.authority.key() == controller_authority,
            crate::AssetControllerErrors::InvalidAuthority
        );
    }

    ctx.accounts
        .asset_controller
        .set_inner(AssetControllerAccount::new(
            ctx.accounts.asset_mint.key(),
            ctx.accounts.authority.key(),
        ));
    let asset_mint = ctx.accounts.asset_mint.key();

    let signer_seeds = [
        asset_mint.as_ref(),
        &get_bump_in_seed_form(&ctx.bumps.asset_controller),
    ];

    // initialize token metadata
    ctx.accounts.initialize_token_metadata(
        args.name.clone(),
        args.symbol.clone(),
        args.uri.clone(),
        &[&signer_seeds],
    )?;

    // transfer minimum rent to mint account
    update_account_lamports_to_minimum_balance(
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    )?;

    emit_cpi!(AssetMetadataEvent {
        mint: ctx.accounts.asset_mint.key().to_string(),
        name: Some(args.name),
        symbol: Some(args.symbol),
        uri: Some(args.uri),
        decimals: Some(args.decimals),
    });

    // create policy registry
    ctx.accounts.create_policy_engine(&[&signer_seeds])?;

    // create identity registry
    ctx.accounts.create_identity_registry(&[&signer_seeds])?;

    Ok(())
}
