import { type IdlAccounts, type IdlTypes } from "@anchor-lang/core";
import { AssetControllerIdlTypes } from "../programs";
import { type PublicKey } from "@solana/web3.js";

export type LegacyAssetControllerAccount = {
	version: 1;
	assetMint: PublicKey;
	authority: PublicKey;
};

export type AssetControllerAccountV2 = Omit<IdlAccounts<AssetControllerIdlTypes>["assetControllerAccount"], "version"> & { version: 2 };

/** Narrow by version before accessing controls, which do not exist in V1 accounts. */
export type AssetControllerAccount = LegacyAssetControllerAccount | AssetControllerAccountV2;

export type CapsConfig = IdlTypes<AssetControllerIdlTypes>["capsConfig"];
export type ThrottleConfig = IdlTypes<AssetControllerIdlTypes>["throttleConfig"];
export type MintRequest = IdlTypes<AssetControllerIdlTypes>["mintRequest"];
export type BurnRequest = IdlTypes<AssetControllerIdlTypes>["burnRequest"];
export type OperationData = IdlTypes<AssetControllerIdlTypes>["operationData"];
export type PendingOperation = IdlAccounts<AssetControllerIdlTypes>["pendingOperation"];
