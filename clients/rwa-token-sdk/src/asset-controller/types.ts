import { type IdlAccounts, type IdlTypes } from "@anchor-lang/core";
import { AssetControllerIdlTypes } from "../programs";

/** Represents on chain asset controller account. */
export type AssetControllerAccount =
  IdlAccounts<AssetControllerIdlTypes>["assetControllerAccount"];

export type CapsConfig = IdlTypes<AssetControllerIdlTypes>["capsConfig"];
export type ThrottleConfig = IdlTypes<AssetControllerIdlTypes>["throttleConfig"];
export type MintRequest = IdlTypes<AssetControllerIdlTypes>["mintRequest"];
export type BurnRequest = IdlTypes<AssetControllerIdlTypes>["burnRequest"];
export type OperationData = IdlTypes<AssetControllerIdlTypes>["operationData"];
export type PendingOperation = IdlAccounts<AssetControllerIdlTypes>["pendingOperation"];
