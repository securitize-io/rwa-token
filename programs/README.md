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

`anchor test` starts Surfpool by default. `Anchor.toml` configures offline mode and clock-based block production, so the existing finalized-commitment confirmations advance without a remote RPC. Anchor's `[workspace].idls` and `types` settings write the generated files directly into the SDK using native snake_case names; the SDK barrel exports retain the existing public names. Keep the `localnet` feature explicit: the fixtures use keypair authorities, while default builds enforce the external access-controller authority derivation.

Anchor 1.x checks declared IDs against build keypairs. On a fresh checkout whose generated local keys differ, use `anchor build --ignore-keys` for compilation; keep the fixed program IDs unchanged. `anchor test` supports those ephemeral keys automatically. To use the older validator backend explicitly, pass `--validator legacy`.

For an existing Surfpool instance with matching deployed artifacts, use `anchor test --skip-build --skip-deploy --skip-local-validator`. For a focused SDK test file, run `corepack yarn test tests/tracker.test.ts` in the SDK directory with `ANCHOR_PROVIDER_URL` and `RPC_URL` set to the local RPC, and `ANCHOR_WALLET` set to a local test wallet. Select whole files because cases share earlier setup state.

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

- Preserve existing account layouts, instruction signatures, enum variant order, error numbers, event schemas, and PDA seeds unless the task explicitly changes compatibility. Append error variants without shifting existing codes. Preserve public spellings such as `ComparisionType` unless deliberately migrating the API.
- Account structs carry versions, but these programs have no implemented account migration instructions. Anchor 1.x provides a `Migration` account type that can be used when deliberately adding them. A layout change needs a concrete strategy for existing accounts; merely changing `VERSION` is insufficient. Also inspect Geyser deserializers in each `src/state/mod.rs` and SDK account decoders.
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
| Counter configuration/mapping | `counter.test.ts` |
| Balance and holder constraints | `policies/balance_limit.test.ts`, `policies/holder_limit.test.ts`, `policies/grouped_holder_limit.test.ts` |
| Identity attribute enforcement | `policies/level_change_policies.test.ts` |
| Pause/full-transfer rules | `policies/transfer_pause.test.ts`, `policies/force_full_transfer.test.ts` |
| Memo extension | `extensions.test.ts` |
