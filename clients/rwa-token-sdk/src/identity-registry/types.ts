import { type IdlAccounts } from "@anchor-lang/core";
import { type IdentityRegistryIdlTypes } from "../programs";

/** Represents on chain identity registry. */
export type IdentityRegistryAccount =
  IdlAccounts<IdentityRegistryIdlTypes>["identityRegistryAccount"];

/** Represents on chain identity account. */
export type IdentityAccount =
  IdlAccounts<IdentityRegistryIdlTypes>["identityAccount"];

export type WalletIdentityAccount =
  IdlAccounts<IdentityRegistryIdlTypes>["walletIdentity"];
