# RWA Token Programs

This workspace implements three Anchor programs for permissioned Token-2022 assets: the asset controller, identity registry, and policy engine. The data registry and transfer-approval-account architecture described in earlier documentation are not implemented in this workspace.

The sections below describe the implementation reviewed on 2026-11-18. Verify details against current source when changing a flow. Paths are relative to the repository root.

## Build and test

Use Rust 1.89.0, Anchor CLI/crates 1.1.2, Node.js >=20.18, and the SDK's pinned Yarn 1.22.22. Activate the installed CLI with `avm use 1.1.2` (install it first with `avm install 1.1.2` if needed). Anchor recommends Solana CLI 3.1.10; local validation also passed with Solana 3.1.3 and Surfpool 1.5.0. CI pins Solana 3.1.10 and Surfpool 1.5.0.

From the SDK directory, install dependencies with `corepack yarn install --frozen-lockfile`. From the repository root:

```sh
anchor build
anchor test -- --features localnet
```

`anchor test` starts Surfpool by default. `Anchor.toml` configures offline mode and transaction-driven block production. Timelock tests advance the on-chain clock with `surfnet_timeTravel` rather than sleeping. `vitest.config.mjs` disables file parallelism and runs the clock-changing `mint-controls.test.ts` suite last, so no other suite observes its time changes. Keep this ordering when adding clock-sensitive tests. Anchor's `[workspace].idls` and `types` settings write the generated files directly into the SDK using native snake_case names; the SDK barrel exports retain the existing public names. Keep the `localnet` feature explicit: the fixtures use keypair authorities, while default builds enforce the external access-controller authority derivation.

Anchor 1.x checks declared IDs against build keypairs. On a fresh checkout whose generated local keys differ, use `anchor build --ignore-keys` for compilation; keep the fixed program IDs unchanged. `anchor test` supports those ephemeral keys automatically. To use the older validator backend explicitly, pass `--validator legacy`.

For an existing fresh Surfpool instance with matching deployed artifacts, use `anchor test --skip-build --skip-deploy --skip-local-validator`. Full runs need a fresh instance because the final suite advances its clock; ordinary `anchor test` starts one automatically. For a focused SDK test file, run `corepack yarn test tests/tracker.test.ts` in the SDK directory with `ANCHOR_PROVIDER_URL` and `RPC_URL` set to the local RPC, and `ANCHOR_WALLET` set to a local test wallet. Select whole files because cases share earlier setup state.

The migration to Anchor 1.1.2 preserves program IDs, PDA seeds, account data, instruction discriminators, and event/error definitions. It updates CPI contexts to accept program IDs, uses Borsh 1 writer serialization and account resizing, and gives the transfer hook an explicit SPL execute discriminator. A scoped `dup` constraint preserves Token-2022 self-transfers in seizure; the integration suite checks that balances and counters remain unchanged. The new IDLs omit external programs' accounts from their account lists; use each account's owning program to decode it. SDK account builders retain explicit event authority accounts because event-CPI PDA metadata is no longer emitted by default.

CI runs strict formatting/Clippy checks and SDK ESLint in a separate lint job. ESLint uses a flat configuration and excludes generated TypeScript definitions. See [AGENTS.md](../AGENTS.md) for repository guidance.

## Verify the workflow

Run the same checks locally before opening a PR:

```sh
cargo fmt --all -- --check
cargo clippy --workspace --all-targets --locked -- -D warnings
cargo test --workspace --locked
anchor build --ignore-keys
(
  cd clients/rwa-token-sdk
  corepack yarn type-check
  corepack yarn lint
  corepack yarn build:package
)
anchor test -- --features localnet
```

For workflow-specific validation, install `actionlint` and `act`, then run from the root:

```sh
actionlint .github/workflows/tests.yml
act workflow_dispatch --dryrun -W .github/workflows/tests.yml -P ubuntu-24.04=catthehacker/ubuntu:act-24.04 --container-architecture linux/amd64
```

A dry-run validates the job plan; it does not execute the Linux installation/build steps. A full local Linux run uses the same command without `--dryrun` and requires Docker plus the runner/toolchain downloads. On an ARM Mac, the workflow's Linux x86 binaries require emulation.

For the authoritative hosted run, push the changes and open a PR targeting `staging`, which triggers both jobs. Once this workflow is available on the repository's default branch, it can also be dispatched from **Actions → tests → Run workflow**, or with `gh workflow run tests.yml --ref <branch>` followed by `gh run watch`. Manual dispatch requires the workflow definition on the default branch.

The refined workflow was checked with `actionlint` and an `act` dry-run, and its application checks were run natively on macOS. The hosted Ubuntu run remains to be verified through a PR.

## Architecture

| Component | Responsibility and starting points |
| --- | --- |
| `programs/asset_controller` (ACP) | Creates the Token-2022 mint and both registries; issues, revokes/burns, seizes, freezes/thaws, updates metadata, and manages memo requirements. Start at `src/instructions/create.rs` and `src/instructions/token/`. |
| `programs/identity_registry` (IRP) | Stores identities, levels, country, and wallet-to-identity links. Creates/closes trackers and invokes policy enforcement when identity attributes change. Start at `src/instructions/account/` and `src/utils.rs`. |
| `programs/policy_engine` (PE) | Implements the Token-2022 transfer hook, policy filters, holder counters/limits, issuance rules, balance tracking, and locks. Start at `src/instructions/execute.rs`, `src/state/engine.rs`, `src/state/track.rs`, and `src/utils.rs`. |
| `rwa_utils` | Shared program IDs, the extra-account-metas seed, bump helper, and Geyser account-deserialization trait. |

The Rust dependency direction is ACP → PE → IRP, with ACP also depending directly on IRP. IRP calls PE through manually constructed instructions in `programs/identity_registry/src/utils.rs` to avoid a crate dependency cycle. Those instructions hardcode discriminators, account ordering, signer/writable flags, and argument serialization. Any change to the corresponding PE entrypoints must update these callers together.

## Addresses and authority

These are the current PDA seed contracts; byte order and deriving program are part of the interface:

| Account | Deriving program | Seeds, in order |
| --- | --- | --- |
| Asset controller | ACP | `[mint]` |
| Identity registry | IRP | `[mint]` |
| Policy engine | PE | `[mint]` |
| Identity | IRP | `[identity_registry, identity_owner]` |
| Wallet identity | IRP | `[wallet, mint]` |
| Tracker | PE | `[mint, identity_account]` |
| Extra account metas | PE | `[b"extra-account-metas", mint]` |
| Event authority | Each emitting program | `[b"__event_authority"]` |

An identity can own multiple wallet links. A tracker aggregates balances for that identity and mint; it is not a per-wallet or per-token-account tracker. SDK `getTrackerAccountPda(mint, owner)` accepts the **identity owner** and derives the identity internally. Resolve an attached wallet through `WalletIdentity` before choosing identity/tracker addresses.

In default builds, ACP creation requires its authority to be the authority PDA of the external access-controller program identified by `ASSET_ACCESS_CONTROLLER_ID`. It derives the access controller from `[mint, b"AssetAccessController"]`, then its authority from `[access_controller]`. That external program is not a member of this workspace. IRP and PE creation also restrict the mint-authority signer to the ACP PDA.

The `localnet` feature disables those creation-time derivation checks. `Anchor.toml` selecting the local cluster does **not** enable this feature. Use it explicitly for tests that supply ordinary keypair authorities; validate default builds separately. Keep production authority checks intact.

Program IDs occur in `declare_id!`, `Anchor.toml`, `rwa_utils/src/constants.rs`, program utility modules, and SDK utilities/IDLs. Treat an ID change as a coordinated compatibility change. Do not run `anchor keys sync` as a routine build fix.

## Token and policy flows

- Creation initializes the mint with the ACP PDA as mint/freeze authority and permanent delegate, PE as transfer hook, and metadata stored on the mint. Preserve extension initialization, metadata rent funding, and the signed CPIs that create IRP and PE accounts.
- Ordinary transfers use Token-2022 `transfer_checked`; there is no ordinary ACP transfer entrypoint. Token-2022 invokes PE's `execute_transaction` through the SPL interface discriminator. Both token accounts must be marked as transferring (`assert_is_transferring`). Direct hook invocation must fail.
- The hook evaluates balances after the transfer. It updates identity tracker totals before enforcing policies and updates holder counters on zero/nonzero balance transitions. Same-identity transfers avoid moving tracker totals. Failures must roll back token balances, trackers, and counters together.
- Issuance mints first, then calls PE to record issuance, update counters, and enforce supply/balance rules. Revocation burns first, then calls PE to update balances and counters. Mint/burn do not invoke the transfer hook; preserve the explicit PE calls.
- Seizure uses the ACP permanent delegate and forwards remaining accounts through Token-2022 into the hook. It has different policy/counter behavior from an ordinary transfer. Platform-wallet and same-identity exceptions also differ by policy; inspect each branch before changing an exemption.
- Identity creation also creates the initial wallet link and tracker. Attaching a wallet permits the identity owner or registry authority; detaching currently requires the registry authority and an empty Token-2022 ATA. Revocation requires one remaining wallet link and a zero tracker balance before closing the associated accounts.

## Account validation and CPI boundaries

- Express validation in `#[derive(Accounts)]` constraints where practical: signer, owner program, canonical seeds/bump, mint, authority, and `has_one` relationships. For unchecked or manually deserialized accounts, establish equivalent checks before reading or writing data. A valid discriminator alone does not establish the correct mint, identity, or PDA.
- Treat remaining accounts as untrusted. Verify data lengths before slicing, and verify owner/discriminator, wallet link, registry, identity, tracker, and mint relationships on the paths you touch. Existing `CHECK` comments are explanations to verify, not proof that a callee enforces every relationship.
- Keep CPI program addresses fixed or explicitly validated. Preserve PDA signer seeds and account privileges. Do not add a reverse Rust dependency from IRP to PE to replace its manual CPI helpers.
- Typed Anchor accounts are normally serialized on exit. A CPI can therefore see the previous serialized account while the caller holds modified state in memory. Identity-change enforcement intentionally passes the proposed levels/country as arguments; preserve the distinction between previous and proposed state.
- The transfer hook uses unchecked accounts and explicit serialization back into account data. Preserve those writes and account mutability; converting a local value or returning `Ok(())` does not persist it automatically.

## Transfer-hook account contract

Change these three locations together when changing hook accounts:

1. `ExecuteTransferHook` in `programs/policy_engine/src/instructions/execute.rs`.
2. `get_extra_account_metas` in `programs/policy_engine/src/utils.rs`.
3. Both ordinary-transfer and seizure remaining-account builders in `clients/rwa-token-sdk/src/asset-controller/instructions.ts`.

The hook's base account indices 0–4 are source token account, mint, destination token account, owner/delegate, and extra-metas account. Indices 5–13 are PE account, IRP program, identity registry, source/destination wallet links, source/destination identities, and source/destination trackers. The TLV definitions read token owners at byte offset 32 and `WalletIdentity.identity_account` at byte offset 8. Reordering serialized fields can therefore break account resolution even when Rust still compiles. Token-2022 instruction builders also include the hook program account; do not confuse their outer account list with hook indices.

Existing mints already have an initialized extra-metas account. If its schema changes, explain how those accounts will be updated; changing the initialization helper only affects newly created accounts.

## State, sizing, and compatibility

### Mint/burn controls and pending operations (ACP V2)

ACP V2 stores `caps: CapsConfig`, `throttle: ThrottleConfig`, and
`state: ThrottleState` directly in the controller, following the BC-2263 structure.
New and migrated assets start disabled. Authority-signed `set_caps_config` and
`set_throttle_config` updates preserve consumption and the window start.

Amounts are token base units (`u64`). Individual zero caps are unlimited. When
throttling is enabled, mint and burn have separate single-instruction ceilings
and cumulative budgets, with one activity-anchored tumbling window. The first
successful operation at/after expiry resets both counters. Burns do not replenish
mint capacity. Disabling controls skips enforcement/accounting without clearing
old consumption; changing the duration reinterprets the old start. With a zero
duration, enabled counters accumulate without rolling over, as in BC-2263.
Arithmetic is checked; nonzero window caps require a positive duration.

**Both mint and burn** amounts above `large_amount_threshold` require a proposal.
Equality executes immediately. A zero threshold disables mandatory routing and
permits voluntary proposals when enabled with a positive grace period. Threshold,
delay, and `pending_operation_grace_period` are shared by both operation kinds.

- `propose_mint(MintRequest)` binds the destination wallet/identity/ATA, amount,
  issuance timestamp, and explicit 32-byte operation ID. The ATA need not exist yet.
- `propose_burn(BurnRequest)` binds an existing source token account, its current
  wallet/identity, amount, reason, and operation ID. Reasons are at most 256 UTF-8 bytes.
- `execute_pending` reads the stored payload and dispatches to the same mint/burn
  CPI and policy-accounting helpers used by immediate issuance/revocation. The
  caller supplies no replacement payload or operation kind. Current caps, token
  owner/mint, wallet link, identity, and tracker relationships are checked again.
- `cancel_pending` is authority-controlled; `expire_pending` allows anyone to
  clean up after expiry. Both refund only the original recorded payer.

`effective_at = proposal_time + large_amount_delay` and
`expires_at = effective_at + pending_operation_grace_period` are snapshots.
Execution requires `effective_at <= Clock::unix_timestamp < expires_at`; early
and expired execution revert. Configuration changes and disabled controls cannot
bypass the stored interval. Issuance/backdating timestamps do not affect the clock.
Proposals reserve neither quota nor token balance. A burn may fail if its source
balance falls while pending; any CPI/policy failure rolls back token changes,
consumption, and tracker/counter writes atomically, leaving the operation pending.
Hard caps apply to immediate and delayed operations. Splitting amounts at/below
the threshold avoids mandatory delay while still consuming the window budget.

The common executor takes an **existing** typed token account; it has no unconditional
mint-only `init_if_needed` side effect. SDK `getExecutePendingIxs` prepares the mint
ATA idempotently before execution; burns get only the executor instruction. The
low-level `getExecutePendingIx` requires preparation by the caller. Its payer funds
mint tracker growth; the burn branch never creates a token account.

Operation IDs are explicit caller-supplied `[u8; 32]` values, matching the
reference's model. The program performs no operation-ID hashing. Both proposal
instructions accept `request.id`; the pending PDA is
`[b"pending_operation", mint, id]`. IDs are unique per mint across both kinds, so
reusing an ID while pending collides even if kind, amount, reason, timestamp, or
other parameters are changed. The original stored payload cannot be overwritten.
SDK `generateOperationId()` is optional: save its result and reuse it across
retries. Builders never silently generate a new ID. Use a different ID for an
intentionally distinct operation.

**There are no receipts or permanent terminal accounts.** Duplicate proposals
collide while the PDA exists. Execution, cancellation, or expiry closes it and
refunds all pending rent. The same ID can then be proposed again with a fresh
execution interval, matching the reference's lifecycle; this is not permanent
business-request replay protection. Expired accounts remain listed
until cleanup. `OperationProposed`, `OperationExecuted`, `OperationCancelled`, and
`OperationExpired` CPI events provide terminal history after closure; execution
also preserves the existing `IssueEvent` or `RevokeEvent`. Expiry emits its event
when cleanup is submitted, not automatically when time passes.

RBAC role assignments and CPI wrappers are a separate integration. Proposal and
execution require payer + authority signer roles; cancellation requires authority
only; expiry has no instruction signer requirement. There are no additional human
actor signers. Events and `PendingOperation.proposer` identify the authorizing PDA;
RBAC owns human attribution, optional proposer-revocation rules, and separation of
duties. RBAC must select permissions from the **stored operation kind** for the
common execute/cancel path, never from a caller-provided kind or solely its shared
instruction discriminator. ACP must be writable for supply operations. SDK builders
are exported directly and through `AssetController` methods.

#### V1 → V2 rollout

The PDA remains `[mint]`, and migration preserves mint and authority. V2 preserves the
original `account:AssetControllerAccount` discriminator and field prefix. The
serialized version byte distinguishes V1 from V2; it is not a new account identity.
The serialized V1 layout is 73 bytes; V2 is 162 bytes. Allocations may contain padding.
`migrate_asset_controller` uses Anchor's `Migration` container to check legacy
ownership/discriminator, validate the authority and mint/PDA, fund rent, and resize.
The version-1 guard rejects non-V1 versions and repeat migration, including V2
accounts with the same discriminator. No unchecked legacy writes or
implicit migration are performed. Existing operations accept both versions through
the controller's version-aware Anchor account codec. V1 decodes with disabled
controls in memory and serializes back to its original 73-byte layout; ordinary
issuance, revocation, freeze/thaw, seizure, metadata, and memo operations remain
available without reallocating or migrating the controller. Unknown versions and
truncated layouts are rejected. Trailing allocation padding is accepted, as with
Anchor's generated Borsh codec; the version byte selects the layout. Temporary
account traits and the V1 schema live in `state/legacy_asset_controller.rs`, following
the compatibility-module pattern used by the RBAC program. The unchecked path uses
the V2 Borsh decoder for Anchor initialization; checked reads enforce the version.

Configuration and pending-operation instructions require V2 and return
`AssetControllerMigrationRequired` for V1. The V1 serializer also rejects non-default
control fields rather than silently discarding unpersistable state. Migration is
explicit and authority-controlled; existing accounts can remain V1 while others
use V2 controls. Limits start disabled after migration and must be configured.

SDK `getAssetControllerAccount` and filtered listing return both versions as a
discriminated union: check `account.version === 2` before accessing caps, throttle,
or consumption fields. `getLegacyAssetControllerAccount` remains available for
migration planning. The generated Anchor coder describes the V2 layout only;
use the SDK getters for mixed-version reads. The Rust Geyser decoder handles both.

Coordinate authority-signed migration and configuration with updated SDK/RBAC
wrappers; the production RBAC migration CPI remains a separate integration.
The flattened issuance account order remains
the same, but ACP is now writable; public instruction accounts remain flat.
Immediate and pending handlers share typed borrowed CPI helpers for minting,
revocation, and PE accounting. Never deploy localnet-feature binaries
to devnet/mainnet to bypass the production RBAC authority requirement.

`tests/mint-controls.test.ts` exercises real transactions on Surfpool, including
legacy-byte fixtures injected for compatibility and migration testing. It verifies
legacy operations preserve account bytes/rent, mixed-version listing, V2-only
controls, and migration of one asset while another remains usable as V1. Fixtures
batch creation, identity setup, and initial controls in one transaction. Independent
mint/burn lifecycle cases advance to their stored release/expiry times. The helper
reads the Clock sysvar, uses milliseconds for `surfnet_timeTravel`, and verifies
the resulting timestamp. Files execute serially with this suite last, isolating
its clock changes from the other suites. Do not enable file parallelism against
the shared validator. Shared funding setup waits for confirmed
airdrops rather than finalized roots. The mint-control sender fetches a fresh
confirmed blockhash for every transaction and confirms against its validity height;
clock advancement can age out web3.js's cached blockhash before its cache expires.
SDK-only encoding/decoding tests live in
`tests/mint-controls.unit.test.ts` and need no validator or environment wallet:

```sh
cd clients/rwa-token-sdk
corepack yarn vitest run tests/mint-controls.unit.test.ts
```

Run a focused suite with `anchor test mint-controls.test.ts -- --features localnet`.
Devnet acceptance requires the production RBAC wrappers/permissions and migrated
assets; the local authority fixtures do not prove that integration.

- Preserve existing account layouts, instruction signatures, enum variant order, error numbers, event schemas, and PDA seeds unless the task explicitly changes compatibility. Append error variants without shifting existing codes. Preserve public spellings such as `ComparisionType` unless deliberately migrating the API.
- Account versions alone do not migrate data. ACP has an explicit V1 → V2 migration using Anchor's `Migration` container; IRP and PE have no migration instructions. Every layout change needs a concrete strategy for existing accounts. Also inspect Geyser deserializers in each `src/state/mod.rs` and SDK account decoders.
- Update all space calculations when changing dynamic state: `INIT_SPACE`, `#[max_len]`, `get_space`/`get_new_space`, `TrackerAccount::get_current_space`, and each instruction's realloc/rent handling. Include the 8-byte account discriminator and Borsh vector/string prefixes where applicable. `#[max_len]` sizes allocations; add runtime bounds for untrusted inputs.
- Exercise account growth and shrinkage, not just initial creation. Cover nested filters, multiple counters, issuance records, and lock reason strings. Check rent top-ups/refunds, payer mutability/signatures, account growth limits, and serialization after realloc.
- Use checked arithmetic and explicit errors for balances, counters, timestamps, lock sums, space deltas, and percentage calculations. Validate vector lengths, indices, duplicate IDs, referenced counters, and zero denominators before indexing, removal, or division.
- Keep token amounts as base-unit integers (`u64`/SDK `BN`) and timestamps as Unix seconds (`i64`/`BN`). Avoid JavaScript `number` for arbitrary token amounts.
- Policy hashes currently use SHA-256 over Rust `Debug` formatting of the PE address, policy type, and filter. Renaming variants/fields or changing formatting can change policy identity and detach behavior; do not casually substitute a new hash encoding.
- Preserve `#[event_cpi]`, `emit_cpi!`, and SDK event-authority/program accounts for emitting instructions. Keep `lib.rs` entrypoints thin, handlers in `instructions/`, state logic in `state/`, and errors/events in their existing modules. Follow snake_case for Rust paths and the existing kebab-case SDK module paths (`CONVENTIONS.md`).

## Implementation caveats

These are review hotspots in the current implementation, not guarantees that the behavior is correct. Add focused regression coverage when touching them; avoid unrelated fixes inside another feature.

- `cpi_enforce_policy_on_levels_change` serializes `!enforce_limits`, even though the public argument and PE handler use the name `enforce_limits`. Trace both values end to end before changing this flag.
- Identity levels store expiry timestamps, but the current filter matcher and special-level checks do not enforce expiry. Constants named `SKIP_POLICY_LEVEL`, `NO_IDENTITY_LEVEL`, and `NO_TRACKER_LEVEL` do not establish a general bypass or fallback in the current hook. Infer semantics from executed code.
- Permanent-delegate transfers update trackers but skip ordinary holder-counter updates and policy enforcement. Platform-wallet level 30, locked level 2, and the country mapping to US-compliance value 11 have separate paths. Test their effects explicitly rather than treating all exceptions alike.
- Counter updates depend on balance transitions. Zero-amount operations, partial/full transfers and burns, same-identity aliases, and counter/filter/mapping changes on existing holders need careful coverage. Configuration changes do not automatically recount all existing holders.
- Counter limits reference counter IDs, while counter-limit removal and lock removal use vector indices. Missing references, duplicate/unsorted removals, ratio division, and dynamic filter sizing deserve negative tests.
- `TrackerAccount` currently stores totals, issuance records, and locks. Names such as `update_transfer_history`, `MAX_TRANSFER_HISTORY`, and old velocity error variants do not imply that a transfer-history buffer or velocity policy is implemented.

## Integration test map

| Change | Relevant SDK test files under `clients/rwa-token-sdk/tests/` |
| --- | --- |
| Asset/identity lifecycle, wallets, issue/revoke/seize, freeze/thaw | `e2e.test.ts` |
| Transfer tracker accounting | `tracker.test.ts` |
| Policy configuration and filters | `policies.test.ts` |
| Supply cap and backdating | `issuance_policies.test.ts` |
| Mint/burn caps, timelock, expiry, replay protection, ACP migration | `mint-controls.test.ts` |
| Counter configuration/mapping | `counter.test.ts` |
| Balance and holder constraints | `policies/balance_limit.test.ts`, `policies/holder_limit.test.ts`, `policies/grouped_holder_limit.test.ts` |
| Identity attribute enforcement | `policies/level_change_policies.test.ts` |
| Pause/full-transfer rules | `policies/transfer_pause.test.ts`, `policies/force_full_transfer.test.ts` |
| Memo extension | `extensions.test.ts` |
