# RWA Token Programs

## Overview
### Asset Controller
The program will mint a new asset using the Token-2022 program but delegates authority functions to a PDA generated from an asset identifier and issuer identifier. All transactions that modify the distribution of tokens (mints, burns, transfers) have a transaction approval check which is a PDA written to by a delegated account to ensure the transaction complies with external requirements. Standardizing these checks will be critical to the composability of newly issued assets that have a variety of transfer restrictions.

### Data Registry
The Data Registry Program (DRP) enables the ledger of generic asset data, title data, legal data, and more. The data registry PDA is mapped to the ACP account that contains metadata that is universal across assets. Other data is stored via PDAs structured as a dynamically sized dictionary. Each PDA is seeded by its “key” and its “value” is written in its state along with a type enum and a valid boolean. As the space evolves, the consensus data structures would be agreed upon for different verticals. This would be manifested with preset keys to load different data components from the PDAs. If an issuer or new asset has a different structure, it can add new accounts while still supporting other generically agreed upon accounts.

### Identity Registry
The IRP initializes an identity_registry PDA that manages a directory of wallet addresses for a particular set of approvals. Each registry represents a different combination of approvals. This PDA can be set as the transaction_approval_authority in the ACP, enforcing identity-based restrictions on transactions. If other restrictions are needed in conjunction with identity-based restrictions, a custom program or off-chain authority can be used in conjunction with the IRP.

### Policy Engine
An identity map is an enum defined by the creator. This enum categorizes various levels of identity verification that the creator can apply to users. For instance, a typical identity map might consist of levels such as "Unverified," "KYC", and "Accredited Investor." Each of these categories represents a distinct level of identity verification, allowing the system to appropriately categorize and handle users based on the extent of their identity validation. Verification levels refer to specific categories within the identity map that are defined by the creator. These levels represent different degrees of user identity verification and are used for tailoring access and permissions within the system. “Unverified”, “”KYC” and “”Accredited Investor” are each a verification level that can be attributed to a user via the identity account.

Issuance retains only history still locked under the current holding period, reusing account space and preserving balances and locks. Already-matured new issuances update balances without storing a record. The policy engine authority can also call `prune_issuances` for maintenance. Both use the transfer hook's current holding period; removed history cannot be restored by increasing that period.

Automatic pruning uses `emit!` to preserve the asset controller interface. Log truncation is not expected in the current issuance flow without complex CPIs; we may migrate to `emit_cpi!` if the flow becomes more complex.

Tracker allocation and rent are retained when pruning issuances or removing locks. Adding a lock reuses that capacity and only charges its payer for rent when more space is needed. Lock reasons are limited to 64 UTF-8 bytes.

### Build
In order to build the programs, you must install solana v1.17.1 and run `./anchor build`. This will use the branch of anchor that has token 22 extensions until they are merged into anchor.
