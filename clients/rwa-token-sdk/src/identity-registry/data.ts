import { type Provider } from "@anchor-lang/core";
import { type IdentityRegistryAccount, type IdentityAccount, WalletIdentityAccount } from "./types";
import {
	getIdentityAccountPda,
	getIdentityRegistryPda,
	getIdentityRegistryProgram,
} from "./utils";
import { GetProgramAccountsFilter, PublicKey } from "@solana/web3.js";

/**
 * Retrieves identity registry account associated with a specific asset mint.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to {@link IdentityRegistryAccount}, or `undefined` if it doesn't exist.
 */
export async function getIdentityRegistryAccount(
	assetMint: string,
	provider: Provider
): Promise<IdentityRegistryAccount | undefined> {
	const identityRegistryProgram = getIdentityRegistryProgram(provider);
	const identityRegistryPda = getIdentityRegistryPda(assetMint);
	return identityRegistryProgram.account.identityRegistryAccount
		.fetch(identityRegistryPda).catch(() : undefined=> undefined);
}

export interface IdentityRegistryFilter {
	assetMint?: string;
	authority?: string;
}

export const IDENTITY_REGISTRY_ASSET_MINT_OFFSET = 9;
export const IDENTITY_REGISTRY_AUTHORITY_OFFSET = 41;

/**
 * Retrieves identity registry account associated with a specific asset mint.
 * @param assetMint - The string representation of the asset mint.
 * @returns A promise resolving to {@link IdentityRegistryAccount}, or `undefined` if it doesn't exist.
 */
export async function getIdentityRegistryAccountsWithFilter(
	filter: IdentityRegistryFilter,
	provider: Provider
): Promise<IdentityRegistryAccount[] | undefined> {
	const { assetMint, authority } = filter;
	const identityRegistryProgram = getIdentityRegistryProgram(provider);
	const filters: GetProgramAccountsFilter[] = [];
	if (assetMint) {
		filters.push({ memcmp: { offset: IDENTITY_REGISTRY_ASSET_MINT_OFFSET, bytes: new PublicKey(assetMint).toBase58() } });
	}
	if (authority) {
		filters.push({ memcmp: { offset: IDENTITY_REGISTRY_AUTHORITY_OFFSET, bytes: new PublicKey(authority).toBase58() } });
	}
	const identityAccounts = await provider.connection.getProgramAccounts(identityRegistryProgram.programId, {
		filters,
	});
	return identityAccounts.map((account) =>
		identityRegistryProgram.coder.accounts.decode("IdentityRegistryAccount", account.account.data)
	);
}

/**
 * Retrieves a identity account associated with a specific asset mint and owner.
 * @param assetMint - The string representation of the asset mint.
 * @param owner - The string representation of the asset owner.
 * @returns A promise resolving to the {@link IdentityAccount}, or `undefined` if it doesn't exist.
 */
export async function getIdentityAccountFromOwner(
	assetMint: string,
	owner: string,
	provider: Provider
): Promise<IdentityAccount | undefined> {
	const identityAccountPda = getIdentityAccountPda(assetMint, owner);
	return getIdentityAccount(identityAccountPda, provider);
}

export async function getIdentityAccount(
	accountAddress: PublicKey,
	provider: Provider
): Promise<IdentityAccount | undefined> {
	const identityRegistryProgram = getIdentityRegistryProgram(provider);
	return identityRegistryProgram.account.identityAccount
		.fetch(accountAddress).catch(() : undefined => undefined);
}

export async function getWalletIdentityAccount(
	accountAddress: PublicKey,
	provider: Provider
): Promise<WalletIdentityAccount | undefined> {
	const identityRegistryProgram = getIdentityRegistryProgram(provider);
	return identityRegistryProgram.account.walletIdentity
		.fetch(accountAddress).catch(() : undefined => undefined);
}

export interface IdentityAccountFilter {
	assetMint?: string;
	registry?: string;
	owner?: string;
}

export const IDENTITY_ACCOUNT_REGISTRY_OFFSET = 9;
export const IDENTITY_ACCOUNT_OWNER_OFFSET = 41;

/**
 * Retrieves all identity accounts associated with a specific asset mint and owner.
 * @param assetMint - The string representation of the asset mint.
 * @param owner - The string representation of the asset owner.
 * @returns A promise resolving to the {@link IdentityAccount}, or `undefined` if it doesn't exist.
 */
export async function getIdentityAccountsWithFilter(
	filter: IdentityAccountFilter,
	provider: Provider
): Promise<IdentityAccount[] | undefined> {
	const { assetMint, registry, owner } = filter;
	const identityRegistryProgram = getIdentityRegistryProgram(provider);
	const filters: GetProgramAccountsFilter[] = [];
	if (assetMint) {
		const identityRegistryPda = getIdentityRegistryPda(assetMint);
		filters.push({ memcmp: { offset: IDENTITY_ACCOUNT_REGISTRY_OFFSET, bytes: identityRegistryPda.toBase58() } });
	}
	if (registry) {
		filters.push({ memcmp: { offset: IDENTITY_ACCOUNT_REGISTRY_OFFSET, bytes: new PublicKey(registry).toBase58() } });
	}
	if (owner) {
		filters.push({ memcmp: { offset: IDENTITY_ACCOUNT_OWNER_OFFSET, bytes: new PublicKey(owner).toBase58() } });
	}
	const identityAccounts = await provider.connection.getProgramAccounts(identityRegistryProgram.programId, {
		filters,
	});
	return identityAccounts.map((account) =>
		identityRegistryProgram.coder.accounts.decode("IdentityAccount", account.account.data)
	);
}

export const WALLET_IDENTITY_ACCOUNT_OWNER_OFFSET = 8;

export async function getWalletIdentityAccountsWithFilter(
	owner: string,
	provider: Provider
): Promise<WalletIdentityAccount[] | undefined> {
	const identityRegistryProgram = getIdentityRegistryProgram(provider);

	const filters: GetProgramAccountsFilter[] = [];
	filters.push({ memcmp: { offset: WALLET_IDENTITY_ACCOUNT_OWNER_OFFSET, bytes: new PublicKey(owner).toBase58()}, });

	const walletIdentityAccounts = await provider.connection.getProgramAccounts(identityRegistryProgram.programId, {
		filters,
	});

	return walletIdentityAccounts.map((account) =>
		identityRegistryProgram.coder.accounts.decode("walletIdentity", account.account.data)
	);
}
