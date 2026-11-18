use anchor_lang::prelude::*;
use anchor_spl::token_2022::spl_token_2022::extension::ExtensionType;
use anchor_spl::token_interface::{
    memo_transfer_disable, MemoTransfer, Mint, Token2022, TokenAccount,
};

use crate::{AssetControllerAccount, ExtensionMetadataEvent};

#[derive(Accounts)]
#[instruction()]
#[event_cpi]
pub struct DisableMemoTransfer<'info> {
    #[account()]
    pub owner: Signer<'info>,
    #[account()]
    pub authority: Signer<'info>,
    #[account()]
    pub asset_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(
        seeds = [asset_mint.key().as_ref()],
        bump,
        constraint = asset_controller.authority == authority.key()
    )]
    pub asset_controller: Box<Account<'info, AssetControllerAccount>>,
    #[account(
        mut,
        constraint = token_account.owner == owner.key(),
        token::mint = asset_mint,
    )]
    pub token_account: Box<InterfaceAccount<'info, TokenAccount>>,
    pub token_program: Program<'info, Token2022>,
}

impl<'info> DisableMemoTransfer<'info> {
    fn disable_memo_transfer(&self) -> Result<()> {
        let cpi_accounts = MemoTransfer {
            token_program_id: self.token_program.to_account_info(),
            account: self.token_account.to_account_info(),
            owner: self.owner.to_account_info(),
        };
        let cpi_ctx = CpiContext::new(self.token_program.key(), cpi_accounts);
        memo_transfer_disable(cpi_ctx)?;
        Ok(())
    }
}

pub fn handler(ctx: Context<DisableMemoTransfer>) -> Result<()> {
    ctx.accounts.disable_memo_transfer()?;
    emit_cpi!(ExtensionMetadataEvent {
        address: ctx.accounts.token_account.key().to_string(),
        extension_type: ExtensionType::MemoTransfer as u8,
        metadata: vec![0]
    });
    Ok(())
}
