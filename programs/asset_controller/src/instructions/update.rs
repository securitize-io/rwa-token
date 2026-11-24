/// creates a mint a new asset
use anchor_lang::prelude::*;
use anchor_spl::token_interface::{
    spl_token_metadata_interface::state::Field, token_metadata_update_field, Mint, Token2022,
    TokenMetadataUpdateField,
};
use rwa_utils::get_bump_in_seed_form;

use crate::{state::*, update_account_lamports_to_minimum_balance};

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct UpdateAssetMetadataArgs {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub uri: Option<String>,
}

#[derive(Accounts)]
#[instruction(args: UpdateAssetMetadataArgs)]
#[event_cpi]
pub struct UpdateAssetMetadata<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    #[account(mut)]
    pub authority: Signer<'info>,
    #[account(mut)]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        constraint = asset_controller.authority == authority.key(),
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> UpdateAssetMetadata<'info> {
    fn update_token_metadata_field(
        &self,
        field: Field,
        value: String,
        signer_seeds: &[&[&[u8]]],
    ) -> Result<()> {
        let cpi_accounts = TokenMetadataUpdateField {
            program_id: self.token_program.to_account_info(),
            metadata: self.asset_mint.to_account_info(), // metadata account is the mint, since data is stored in mint
            update_authority: self.asset_controller.to_account_info(),
        };
        let cpi_ctx =
            CpiContext::new_with_signer(self.token_program.key(), cpi_accounts, signer_seeds);
        token_metadata_update_field(cpi_ctx, field, value)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<UpdateAssetMetadata>, args: UpdateAssetMetadataArgs) -> Result<()> {
    let asset_mint = ctx.accounts.asset_mint.key();
    let signer_seeds = [
        asset_mint.as_ref(),
        &get_bump_in_seed_form(&ctx.bumps.asset_controller),
    ];

    if let Some(name) = args.name.clone() {
        ctx.accounts
            .update_token_metadata_field(Field::Name, name, &[&signer_seeds])?;
    }

    if let Some(symbol) = args.symbol.clone() {
        ctx.accounts
            .update_token_metadata_field(Field::Symbol, symbol, &[&signer_seeds])?;
    }

    if let Some(uri) = args.uri.clone() {
        ctx.accounts
            .update_token_metadata_field(Field::Uri, uri, &[&signer_seeds])?;
    }

    update_account_lamports_to_minimum_balance(
        ctx.accounts.asset_mint.to_account_info(),
        ctx.accounts.payer.to_account_info(),
        ctx.accounts.system_program.to_account_info(),
    )?;

    emit_cpi!(AssetMetadataEvent {
        mint: ctx.accounts.asset_mint.key().to_string(),
        name: args.name,
        symbol: args.symbol,
        uri: args.uri,
        decimals: None,
    });

    Ok(())
}
