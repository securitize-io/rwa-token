import { Provider, utils } from "@anchor-lang/core";
import { type AssetControllerAccount, type AssetControllerAccountV2 } from "./types";
import {
	getAssetControllerPda,
	getAssetControllerProgram,
} from "./utils";
import { type AccountInfo, type GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

const ASSET_CONTROLLER_DISCRIMINATOR = Buffer.from([70, 136, 149, 138, 12, 87, 52, 105]);

function decodeAssetController(info: AccountInfo<Buffer>, provider: Provider): AssetControllerAccount {
	const program = getAssetControllerProgram(provider);
	if (!info.owner.equals(program.programId) || !info.data.subarray(0, 8).equals(ASSET_CONTROLLER_DISCRIMINATOR)) {
		throw new Error("Invalid asset controller owner or discriminator");
	}
	const version = info.data[8];
	if (version === 1 && info.data.length >= 73) {
		return { version: 1, assetMint: new PublicKey(info.data.subarray(9, 41)), authority: new PublicKey(info.data.subarray(41, 73)) };
	}
	if (version === 2 && info.data.length >= program.account.assetControllerAccount.size) {
		return program.coder.accounts.decode<AssetControllerAccountV2>("assetControllerAccount", info.data);
	}
	throw new Error("Unsupported asset controller version or invalid account length");
}

/**
 * Retrieves either V1 or V2; narrow by version before reading controls.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to the fetched asset controller account, or `undefined` if it doesn't exist.
 */
export async function getAssetControllerAccount(
	assetMint: string,
	provider: Provider
): Promise<AssetControllerAccount | undefined> {
	const assetControllerPda = getAssetControllerPda(assetMint);
	const info = await provider.connection.getAccountInfo(assetControllerPda);
	if (!info) return undefined;
	const account = decodeAssetController(info, provider);
	if (!account.assetMint.equals(new PublicKey(assetMint))) throw new Error("Asset controller mint mismatch");
	return account;
}

export interface AssetControllerDataFilter {
	assetMint?: string;
	authority?: string;
	owner?: string;
}

export const ASSET_CONTROLLER_ASSET_MINT_OFFSET = 9;
export const ASSET_CONTROLLER_AUTHORITY_OFFSET = 41;

/**
 * Lists both V1 and V2 controllers matching the mint/authority filters.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to the fetched asset controller account, or `undefined` if it doesn't exist.
 */
export async function getAssetControllerAccountsWithFilter(
	filter: Omit<AssetControllerDataFilter, "owner">,
	provider: Provider
): Promise<AssetControllerAccount[] | undefined> {
	const { assetMint, authority } = filter;
	const assetProgram = getAssetControllerProgram(provider);
	const filters: GetProgramAccountsFilter[] = [{ memcmp: { offset: 0, bytes: utils.bytes.bs58.encode(ASSET_CONTROLLER_DISCRIMINATOR) } }];
	if (assetMint) {
		filters.push({ memcmp: { offset: ASSET_CONTROLLER_ASSET_MINT_OFFSET, bytes: new PublicKey(assetMint).toBase58() } });
	}
	if (authority) {
		filters.push({ memcmp: { offset: ASSET_CONTROLLER_AUTHORITY_OFFSET, bytes: new PublicKey(authority).toBase58() } });
	}
	const assetAccounts = await provider.connection.getProgramAccounts(assetProgram.programId, { filters });
	return assetAccounts.map(({ pubkey, account: info }) => {
		const account = decodeAssetController(info, provider);
		if (!getAssetControllerPda(account.assetMint.toBase58()).equals(pubkey)) throw new Error("Asset controller PDA mismatch");
		return account;
	});
}

/** Read only the exact deployed V1 format when planning a migration. */
export async function getLegacyAssetControllerAccount(assetMint: string, provider: Provider) {
	const account = await getAssetControllerAccount(assetMint, provider);
	if (!account) return null;
	if (account.version !== 1) throw new Error("Account is not a legacy V1 asset controller");
	return account;
}
