import { Provider, utils } from "@anchor-lang/core";
import { type AssetControllerAccount } from "./types";
import {
	getAssetControllerPda,
	getAssetControllerProgram,
} from "./utils";
import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

/**
 * Retrieves a asset controller account associated with a specific asset mint.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to the fetched asset controller account, or `undefined` if it doesn't exist.
 */
export async function getAssetControllerAccount(
	assetMint: string,
	provider: Provider
): Promise<AssetControllerAccount | undefined> {
	const assetProgram = getAssetControllerProgram(provider);
	const assetControllerPda = getAssetControllerPda(assetMint);
	return assetProgram.account.assetControllerAccount
		.fetchNullable(assetControllerPda).then(account => account ?? undefined);
}

export interface AssetControllerDataFilter {
	assetMint?: string;
	authority?: string;
	owner?: string;
}

export const ASSET_CONTROLLER_ASSET_MINT_OFFSET = 9;
export const ASSET_CONTROLLER_AUTHORITY_OFFSET = 41;

/**
 * Retrieves a asset controller account associated with a specific asset mint.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to the fetched asset controller account, or `undefined` if it doesn't exist.
 */
export async function getAssetControllerAccountsWithFilter(
	filter: Omit<AssetControllerDataFilter, "owner">,
	provider: Provider
): Promise<AssetControllerAccount[] | undefined> {
	const { assetMint, authority } = filter;
	const assetProgram = getAssetControllerProgram(provider);
	const filters: GetProgramAccountsFilter[] = [{ memcmp: { offset: 8, bytes: utils.bytes.bs58.encode(Uint8Array.of(2)) } }];
	if (assetMint) {
		filters.push({ memcmp: { offset: ASSET_CONTROLLER_ASSET_MINT_OFFSET, bytes: new PublicKey(assetMint).toBase58() } });
	}
	if (authority) {
		filters.push({ memcmp: { offset: ASSET_CONTROLLER_AUTHORITY_OFFSET, bytes: new PublicKey(authority).toBase58() } });
	}
	const assetAccounts = await assetProgram.account.assetControllerAccount.all(filters);
	return assetAccounts.map(account => account.account);
}

/** Read only the exact deployed V1 format when planning a migration. */
export async function getLegacyAssetControllerAccount(assetMint: string, provider: Provider) {
	const info = await provider.connection.getAccountInfo(getAssetControllerPda(assetMint));
	if (!info) return null;
	if (!info.owner.equals(getAssetControllerProgram(provider).programId)
		|| info.data.length !== 73
		|| !info.data.subarray(0, 8).equals(Buffer.from([70, 136, 149, 138, 12, 87, 52, 105]))
		|| info.data[8] !== 1) {
		throw new Error("Account is not a legacy V1 asset controller");
	}
	const mint = new PublicKey(info.data.subarray(9, 41));
	if (!mint.equals(new PublicKey(assetMint))) throw new Error("Legacy controller mint mismatch");
	return { version: 1, assetMint: mint, authority: new PublicKey(info.data.subarray(41, 73)) };
}
