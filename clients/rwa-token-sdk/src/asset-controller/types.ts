import { type IdlAccounts } from "@anchor-lang/core";
import { AssetControllerIdlTypes } from "../programs";

/** Represents on chain asset controller account. */
export type AssetControllerAccount =
  IdlAccounts<AssetControllerIdlTypes>["assetControllerAccount"];
