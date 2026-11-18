import { Provider } from "@anchor-lang/core";
import { type PolicyEngineAccount, type  TrackerAccount } from "./types";
import { getPolicyEnginePda, getPolicyEngineProgram, getTrackerAccountPda } from "./utils";
import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

/**
 * Retrieves policy engine account associated with a specific asset mint.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to {@link PolicyEngineAccount}, or `undefined` if it doesn't exist.
 */
export async function getPolicyEngineAccount(assetMint: string, provider: Provider): Promise<PolicyEngineAccount | undefined> {
	const policyEngineProgram = getPolicyEngineProgram(provider);
	const policyEnginePda = getPolicyEnginePda(assetMint);
	return policyEngineProgram.account.policyEngineAccount.fetch(policyEnginePda).catch(() : undefined => undefined);
}

export interface PolicyEngineFilter {
	assetMint?: string;
	authority?: string;
}

export const POLICY_ENGINE_ASSET_MINT_OFFSET = 9;
export const POLICY_ENGINE_AUTHORITY_OFFSET = 41;

/**
 * Retrieves policy engine accounts with a filter.
 * @param filter - The filter to apply to the policy engine accounts.
 * @returns A promise resolving to an array of {@link PolicyEngineAccount}, or `undefined` if it doesn't exist.
 */
export async function getPolicyEngineAccountsWithFilter(filter: PolicyEngineFilter, provider: Provider): Promise<PolicyEngineAccount[] | undefined> {
	const { assetMint, authority } = filter;
	const policyEngineProgram = getPolicyEngineProgram(provider);
	const filters: GetProgramAccountsFilter[] = [];
	if (assetMint) {
		filters.push({ memcmp: { offset: POLICY_ENGINE_ASSET_MINT_OFFSET, bytes: new PublicKey(assetMint).toBase58() } });
	}
	if (authority) {
		filters.push({ memcmp: { offset: POLICY_ENGINE_AUTHORITY_OFFSET, bytes: new PublicKey(authority).toBase58() } });
	}
	const policyAccounts = await provider.connection.getProgramAccounts(policyEngineProgram.programId, {
		filters,
	});
	return policyAccounts.map(account => policyEngineProgram.coder.accounts.decode("PolicyEngineAccount", account.account.data));
}


/**
 * Retrieves a tracker account pda associated with a specific asset mint and owner.
 * @param assetMint - The string representation of the asset mint.
 * @param owner - The string representation of the owner's public key.
 * @returns A promise resolving to the fetched tracker account, or `undefined` if it doesn't exist.
 */
export async function getTrackerAccount(
	assetMint: string,
	owner: string,
	provider: Provider
): Promise<TrackerAccount | undefined> {
	const policyEngineProgram = getPolicyEngineProgram(provider);
	const trackerPda = getTrackerAccountPda(assetMint, owner);
	return await policyEngineProgram.account.trackerAccount.fetch(trackerPda).catch(() : undefined => undefined);
}
