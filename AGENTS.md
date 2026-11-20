# AGENTS.md

## Repository map

Solana Anchor workspace for permissioned Token-2022 assets:

- `programs/asset_controller`: mint creation, issuance, revocation, seizure, metadata, freeze/thaw, memo extensions.
- `programs/identity_registry`: identity levels/country and wallet links; invokes policy enforcement when identity attributes change.
- `programs/policy_engine`: transfer hook, filters, holder counters, issuance rules, identity balances, and locks.
- `rwa_utils`: shared constants and account-deserialization helpers.
- `clients/rwa-token-sdk`: public TypeScript SDK and validator-backed integration tests.

Use Rust entrypoints and manifests as the source of truth. Some other READMEs contain obsolete designs/toolchain commands. For CPI, hook, account-layout, or policy changes, consult the relevant sections of [programs/README.md](programs/README.md), including the test map and implementation caveats.

## Build and check

Rust 1.89.0 and Anchor 1.1.2 are pinned in `rust-toolchain.toml`, `Cargo.toml`, and `Anchor.toml`. The SDK uses `@anchor-lang/core` 1.1.2. Select the CLI with `avm use 1.1.2`; keep Anchor dependencies aligned.

From the repository root:

```sh
cargo fmt --all -- --check
cargo check --workspace --locked
cargo clippy --workspace --all-targets --locked -- -D warnings
anchor build
```

`cargo check` checks the host build. Program changes also require an SBF build via `anchor build`; preserve intentional `Box`/`#[inline(never)]` use when assessing stack limits.

From `clients/rwa-token-sdk/`:

```sh
corepack yarn type-check
corepack yarn lint
corepack yarn build:package
```

Use `corepack yarn install --frozen-lockfile` there to select the pinned Yarn Classic version. A directly installed global Yarn 4 can reject the v1 lockfile before scripts run. ESLint uses `eslint.config.mjs`; generated program types are excluded from linting. Report tool failures separately from regressions; avoid unrelated configuration or lockfile changes.

## Program constraints

- Preserve PDA seeds, program IDs, account layouts, enum ordering, instruction signatures, error codes, and event schemas unless the task explicitly changes compatibility. Account version fields alone do not implement migrations. Do not use `anchor keys sync` as a routine build fix.
- Keep entrypoints thin, instruction handlers in `instructions/`, and state logic in `state/`. Follow existing Rust snake_case and SDK kebab-case module paths (`CONVENTIONS.md`).
- The Rust dependency direction is asset controller → policy engine → identity registry. IRP's calls back to PE are manually encoded in `programs/identity_registry/src/utils.rs`; update their discriminators, serialization, and account privileges when changing the receiving instructions.
- Keep hook accounts synchronized across `ExecuteTransferHook`, `get_extra_account_metas`, and both transfer/seizure builders in SDK `src/asset-controller/instructions.ts`. TLV resolution depends on account indices and serialized field offsets.
- Trackers aggregate balances per identity and mint. Resolve attached wallets through `WalletIdentity`; preserve same-identity handling and explicit policy accounting after mint/burn, which do not invoke the transfer hook.
- For unchecked accounts, validate owner, discriminator, data length, and mint/identity/PDA relationships before use. Preserve the hook's transferring checks and explicit state writes. Identity-change CPIs must distinguish previous serialized state from proposed arguments.
- When dynamic state changes, update space calculations, realloc, and rent handling together. Validate input bounds and use checked arithmetic. Preserve event CPI accounts in SDK builders.

## Generated interfaces and tests

Anchor writes IDLs and TypeScript definitions directly into SDK `src/programs/idls/` and `src/programs/types/` through `[workspace].idls` and `types`. Keep native snake_case artifact filenames and preserve public names in the barrel exports. Review the generated diff; no copy script or build hook is needed. For fresh local build keypairs that differ from the fixed program IDs, use `anchor build --ignore-keys` rather than changing program IDs. Update SDK builders, types, decoders, and wrappers alongside the Rust interface; do not hand-edit generated definitions.

Existing integration fixtures use keypair authorities and require the explicit `localnet` feature. Selecting the local cluster does not enable it. For ABI changes, use:

```sh
anchor test -- --features localnet
```

Anchor starts offline Surfpool by default, and writes SDK artifacts before tests run. Use `--validator legacy` only to explicitly select solana-test-validator. The feature relaxes creation-time authority checks; validate default builds separately and never use localnet artifacts for production.

Tests live in `clients/rwa-token-sdk/tests/` and need a local validator, deployed programs, and an Anchor test wallet. Surfpool uses transaction-driven blocks. Vitest runs files serially and the clock-changing `mint-controls.test.ts` suite last; preserve that isolation and advance the Clock sysvar with Surfpool instead of sleeping. For direct SDK runs, align `ANCHOR_PROVIDER_URL` and `RPC_URL` and set `ANCHOR_WALLET`. Select whole test files: many cases depend on earlier setup cases. SDK type checking excludes tests.

For program behavior changes, verify accepted/rejected transactions and resulting on-chain balances/counters, including rollback after rejection. Exercise changed account boundaries, attached wallets, delegate exceptions, and amount/time boundaries as applicable. Report the checks actually run and any blocked validation.

Keep client/provider initialization in hooks rather than setup-only test cases. Consolidate shared instruction checks when a fixture can cover both operation kinds; retain separate mint/burn CPI, accounting, rollback, and migration regressions.
