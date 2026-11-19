use anchor_lang::prelude::*;

#[error_code]
pub enum AssetControllerErrors {
    #[msg("Transfer hasnt been approved for the asset mint")]
    TransferMintNotApproved,
    #[msg("Transfer hasnt been approved for from account")]
    TransferFromNotApproved,
    #[msg("Transfer hasnt been approved for to account")]
    TransferToNotApproved,
    #[msg("Transfer hasnt been approved for the specified amount")]
    TransferAmountNotApproved,
    #[msg("Invalid policy account passed")]
    InvalidPolicyAccount,
    #[msg("Invalid slot for approve account")]
    TransferSlotNotApproved,
    #[msg("Transfer history is full")]
    TransferHistoryFull,
    #[msg("Unauthorized")]
    Unauthorized,
    #[msg("Pda passed in for transfer is wrong")]
    InvalidPdaPassedIn,
    #[msg("Token account is not initialized")]
    TokenAccountNotInitialized,
    #[msg("Token account is already initialized")]
    TokenAccountAlreadyInitialized,
    #[msg("Invalid identity accounts")]
    InvalidIdentityAccounts,
    #[msg("Invalid authority")]
    InvalidAuthority,
    #[msg("Invalid mint controls configuration")]
    InvalidMintControlsConfig,
    #[msg("Mint controls configuration is unchanged")]
    MintControlsUnchanged,
    #[msg("Mint controls are disabled")]
    MintControlsDisabled,
    #[msg("Amount exceeds the single-operation ceiling")]
    OperationCapExceeded,
    #[msg("Amount exceeds the cumulative window cap")]
    WindowCapExceeded,
    #[msg("Operation amount requires a timelock")]
    AmountRequiresTimelock,
    #[msg("Operation amount does not require a timelock")]
    AmountDoesNotRequireTimelock,
    #[msg("Pending operation amount must be positive")]
    InvalidOperationAmount,
    #[msg("Mint controls arithmetic overflow")]
    MintControlsArithmeticOverflow,
    #[msg("Pending operation is not yet effective")]
    PendingOperationNotEffective,
    #[msg("Pending operation has expired")]
    PendingOperationExpired,
    #[msg("Pending operation has not expired")]
    PendingOperationNotExpired,
    #[msg("Pending operation does not match the requested operation")]
    InvalidPendingOperation,
    #[msg("Invalid legacy asset controller")]
    InvalidLegacyAssetController,
    #[msg("Burn reason exceeds 256 UTF-8 bytes")]
    BurnReasonTooLong,
}
