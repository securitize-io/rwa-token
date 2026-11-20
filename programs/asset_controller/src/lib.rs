#![allow(ambiguous_glob_reexports, clippy::new_ret_no_self)]

pub mod error;
pub mod events;
pub mod instructions;
pub mod state;
pub mod utils;

pub use error::*;
pub use events::*;
pub use instructions::*;
pub use state::*;
pub use utils::*;

use anchor_lang::prelude::*;

declare_id!("7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP");

#[program]
pub mod asset_controller {
    use super::*;

    /// create an rwa asset
    pub fn create_asset_controller(
        ctx: Context<CreateAssetController>,
        args: CreateAssetControllerArgs,
    ) -> Result<()> {
        instructions::create::handler(ctx, args)
    }

    pub fn migrate_asset_controller(ctx: Context<MigrateAssetController>) -> Result<()> {
        instructions::migrate::handler(ctx)
    }

    pub fn set_caps_config(ctx: Context<ConfigureMintControls>, caps: CapsConfig) -> Result<()> {
        instructions::configure_mint_controls::set_caps(ctx, caps)
    }

    pub fn set_throttle_config(
        ctx: Context<ConfigureMintControls>,
        throttle: ThrottleConfig,
    ) -> Result<()> {
        instructions::configure_mint_controls::set_throttle(ctx, throttle)
    }

    pub fn propose_mint(ctx: Context<ProposeMint>, request: MintRequest) -> Result<()> {
        instructions::propose_mint::handler(ctx, request)
    }

    pub fn propose_burn(ctx: Context<ProposeBurn>, request: BurnRequest) -> Result<()> {
        instructions::propose_burn::handler(ctx, request)
    }

    pub fn execute_pending(ctx: Context<ExecutePending>) -> Result<()> {
        instructions::execute_pending::handler(ctx)
    }

    pub fn cancel_pending(ctx: Context<CancelPending>) -> Result<()> {
        instructions::cancel_pending::handler(ctx)
    }

    pub fn expire_pending(ctx: Context<ExpirePending>) -> Result<()> {
        instructions::expire_pending::handler(ctx)
    }

    /// issue shares of the rwa asset
    pub fn issue_tokens(
        ctx: Context<IssueTokens>,
        amount: u64,
        issuance_timestamp: i64,
    ) -> Result<()> {
        instructions::issue::handler(ctx, amount, issuance_timestamp)
    }

    /// edit metadata of the rwa asset
    pub fn update_metadata(
        ctx: Context<UpdateAssetMetadata>,
        args: UpdateAssetMetadataArgs,
    ) -> Result<()> {
        instructions::update::handler(ctx, args)
    }

    /// revoke shares of the rwa asset
    pub fn revoke_tokens<'info>(
        ctx: Context<'info, RevokeTokens<'info>>,
        amount: u64,
        reason: String,
    ) -> Result<()> {
        instructions::revoke::handler(ctx, amount, reason)
    }

    /// seize shares of the rwa asset
    pub fn seize_tokens<'info>(
        ctx: Context<'info, SeizeTokens<'info>>,
        amount: u64,
        reason: String,
    ) -> Result<()> {
        instructions::seize::handler(ctx, amount, reason)
    }

    /// memo transfer enable
    pub fn enable_memo_transfer(ctx: Context<EnableMemoTransfer>) -> Result<()> {
        instructions::extensions::enable_memo::handler(ctx)
    }

    /// memo transfer disable
    pub fn disable_memo_transfer(ctx: Context<DisableMemoTransfer>) -> Result<()> {
        instructions::extensions::disable_memo::handler(ctx)
    }

    /// freeze token account
    pub fn freeze_token_account(ctx: Context<FreezeTokenAccount>) -> Result<()> {
        instructions::account::freeze::handler(ctx)
    }

    /// thaw token account
    pub fn thaw_token_account(ctx: Context<ThawTokenAccount>) -> Result<()> {
        instructions::account::thaw::handler(ctx)
    }
}
