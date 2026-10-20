use anchor_lang::error_code;

#[error_code]
pub enum PolicyEngineErrors {
    #[msg("Invalid policy passed")]
    InvalidPolicy,
    #[msg("Transaction amount limit exceeded")]
    TransactionAmountLimitExceeded,
    #[msg("Transaction amount velocity exceeded")]
    TransactionAmountVelocityExceeded,
    #[msg("Transaction count velocity exceeded")]
    TransactionCountVelocityExceeded,
    #[msg("Identity level limit exceeded")]
    IdentityLevelLimitExceeded,
    #[msg("Policy registry is full, cannot add more policies")]
    PolicyEngineFull,
    #[msg("Policy not found")]
    PolicyNotFound,
    #[msg("Identity filter failed")]
    IdentityFilterFailed,
    #[msg("Unauthorized signer")]
    UnauthorizedSigner,
    #[msg("Policy already exists")]
    PolicyAlreadyExists,
    #[msg("Max balance exceeded")]
    MaxBalanceExceeded,
    #[msg("Min balance exceeded")]
    MinBalanceExceeded,
    #[msg("Invalid CPI transfer amount")]
    InvalidCpiTransferAmount,
    #[msg("Invalid CPI transfer mint")]
    InvalidCpiTransferMint,
    #[msg("Invalid CPI transfer program")]
    InvalidCpiTransferProgram,
    #[msg("Invalid PDA passed in")]
    InvalidPdaPassedIn,
    #[msg("Transfer history full")]
    TransferHistoryFull,
    #[msg("All Transfers have been paused")]
    TransferPaused,
    #[msg("Expected source account to transfer full amount")]
    ForceFullTransfer,
    #[msg("Holder limit exceeded")]
    HolderLimitExceeded,
    #[msg("Balance limit exceeded")]
    BalanceLimitExceeded,
    #[msg("Tracker account owner mismatch")]
    TrackerAccountOwnerMismatch,
    #[msg("Forbidden identity group")]
    ForbiddenIdentityGroup,
    #[msg("Invalid identity account")]
    InvalidIdentityAccount,
    #[msg("Holders limit exceeded")]
    HoldersLimitExceeded,
    #[msg("Min max balance exceeded")]
    MinMaxBalanceExceeded,
    #[msg("Invalid policy engine account")]
    InvalidPolicyEngineAccount,
    #[msg("Percentage limit exceeded")]
    PercentageLimitExceeded,
    #[msg("Flowback")]
    Flowback,
    #[msg("Invalid instruction data")]
    InvalidInstructionData,
    #[msg("Backdating not allowed")]
    BackdatingNotAllowed,
    #[msg("Max supply exceeded")]
    MaxSupplyExceeded,
    #[msg("Counter not found")]
    CounterNotFound,
    #[msg("Data is not empty")]
    DataIsNotEmpty,
    #[msg("Tokens are held up")]
    HoldUp,
    #[msg("Tokens are locked")]
    TokensLocked,
    ForceAccredited = 50,
    ForceAccreditedUS = 51,
    TokenPaused = 52,
    InvestorFullyLocked = 53,
    TrackerAccountNotEmpty = 54,
    #[msg("Counter id already exists")]
    CounterIdAlreadyExists,
    #[msg("Counter id not found")]
    CounterIdNotFound,
    #[msg("Counter underflow, please manually override the counter value")]
    CounterUnderflow,
    #[msg("Counter overflow, please manually override the counter value")]
    CounterOverflow,
    #[msg("Balance underflow error")]
    BalanceUnderflow,
    #[msg("Balance overflow error")]
    BalanceOverflow,
    #[msg("Lock index not found")]
    LockIndexNotFound,
    #[msg("Counter Limit index not found")]
    CounterLimitIndexNotFound,
    #[msg("Holding period must be nonnegative")]
    InvalidLockPeriod,
}
