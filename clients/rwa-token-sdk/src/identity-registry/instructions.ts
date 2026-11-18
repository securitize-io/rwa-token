import {
	PublicKey,
	SystemProgram,
	type TransactionInstruction,
} from "@solana/web3.js";
import { type CommonArgs } from "../utils";
import {
	getIdentityAccountPda,
	getIdentityRegistryProgram,
	getIdentityRegistryPda,
	getWalletIdentityAccountPda,
	getIdentityRegistryEventAuthority,
} from "./utils";
import { BN, Provider } from "@anchor-lang/core";
import { getPolicyEnginePda, getTrackerAccountPda, policyEngineProgramId } from "../policy-engine/utils";
import { getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

/** Represents arguments for creating an on identity registry on chain. */
export type CreateIdentityRegistryArgs = {
  authority: string;
  signer: string;
  requireIdentityCreation?: boolean;
} & CommonArgs;

/**
 * Builds the transaction instruction to create an identity registry.
 * @param args - {@link CreateIdentityRegistryArgs}.
 * @returns Create identity registry transaction instruction.
 */
export async function getCreateIdentityRegistryIx(
	args: CreateIdentityRegistryArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.createIdentityRegistry(
			new PublicKey(args.authority),
		)
		.accountsStrict({
			payer: args.payer,
			signer: args.signer,
			assetMint: args.assetMint,
			identityRegistryAccount: getIdentityRegistryPda(args.assetMint),
			systemProgram: SystemProgram.programId,
		})
		.instruction();
	return ix;
}

/** Represents arguments for creating an identity account on chain. */
export type CreateIdentityAccountArgs = {
  level: number;
  owner: string;
  expiry: BN;
  country: number;
} & CommonArgs;

/**
 * Builds the transaction instruction to create an identity account.
 * @param args - {@link CreateIdentityAccountArgs}.
 * @returns Create identity account transaction instruction.
 */
export async function getCreateIdentityAccountIx(
	args: CreateIdentityAccountArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.createIdentityAccount(new PublicKey(args.owner), args.level, args.expiry, args.country)
		.accountsStrict({
			payer: args.payer,
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			systemProgram: SystemProgram.programId,
			signer: args.signer
				? args.signer
				: getIdentityRegistryPda(args.assetMint),
			walletIdentity: getWalletIdentityAccountPda(args.assetMint, args.owner),
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			assetMint: new PublicKey(args.assetMint),
			policyEngineProgram: policyEngineProgramId,
		})
		.instruction();
	return ix;
}

/** Represents the arguments required to attach a wallet to an identity account. */
export type AttachWalletToIdentityArgs = {
  wallet: string;
  owner: string;
} & CommonArgs;

export async function getAttachWalletToIdentityIx(
	args: AttachWalletToIdentityArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.attachWalletToIdentity(new PublicKey(args.wallet))
		.accountsStrict({
			payer: args.payer,
			authority: args.authority,
			assetMint: args.assetMint,
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			walletIdentity: getWalletIdentityAccountPda(args.assetMint, args.wallet),
			systemProgram: SystemProgram.programId,
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
		})
		.instruction();
	return ix;
}

export async function getDetachWalletFromIdentityIx(
	args: AttachWalletToIdentityArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.detachWalletFromIdentity()
		.accountsStrict({
			payer: args.payer,
			authority: args.authority,
			walletIdentity: getWalletIdentityAccountPda(args.assetMint, args.wallet),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
			assetMint: args.assetMint,
			tokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.wallet),
				true,
				TOKEN_2022_PROGRAM_ID
			),
		})
		.instruction();
	return ix;
}

/** Represents arguments for creating an identity account on chain. */
export type ChangeCountryArgs = {
	owner: string;
	country: number;
	ignorePolicy?: boolean;
  } & CommonArgs;

/**
 * Builds the transaction instruction to add a level to identity account
 * @param args - {@link AddLevelToIdentityAccountArgs}.
 * @returns Add level to identity account transaction instruction.
 */
export async function getChangeCountryIx(
	args: ChangeCountryArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.changeCountry(args.country, args.ignorePolicy ?? false)
		.accountsStrict({
			signer: args.signer,
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			payer: args.payer,
			policyEngineProgram: policyEngineProgramId,
			policyEngine: getPolicyEnginePda(args.assetMint),
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			assetMint: args.assetMint,
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
		})
		.instruction();
	return ix;
}

/** Represents the arguments required to add a level to an identity account. */
export type AddLevelToIdentityAccountArgs = {
  owner: string;
  levels: number[];
  expiries: BN[];
  signer: string;
  ignorePolicy?: boolean;
} & CommonArgs;

/**
 * Builds the transaction instruction to add a level to identity account
 * @param args - {@link AddLevelToIdentityAccountArgs}.
 * @returns Add level to identity account transaction instruction.
 */
export async function getAddLevelToIdentityAccount(
	args: AddLevelToIdentityAccountArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.addLevelToIdentityAccount(Buffer.from(args.levels), args.expiries, args.ignorePolicy ?? false)
		.accountsStrict({
			signer: args.signer,
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			payer: args.payer,
			systemProgram: SystemProgram.programId,
			policyEngineProgram: policyEngineProgramId,
			policyEngine: getPolicyEnginePda(args.assetMint),
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			assetMint: args.assetMint,
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
		})
		.instruction();
	return ix;
}

export type RemoveLevelFromIdentityAccountArgs = {
  owner: string;
  levels: number[];
  signer: string;
  enforceLimits?: boolean;
} & CommonArgs;

/**
 * Builds the transaction instruction to remove a level from identity account
 * @param args - {@link RemoveLevelFromIdentityAccount}.
 * @returns Add level to identity account transaction instruction.
 */
export async function getRemoveLevelFromIdentityAccount(
	args: RemoveLevelFromIdentityAccountArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.removeLevelFromIdentityAccount(Buffer.from(args.levels), args.enforceLimits ?? false)
		.accountsStrict({
			signer: args.signer
				? args.signer
				: getIdentityRegistryPda(args.assetMint),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			payer: args.signer,
			systemProgram: SystemProgram.programId,
			policyEngineProgram: policyEngineProgramId,
			policyEngine: getPolicyEnginePda(args.assetMint),
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			assetMint: args.assetMint,
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
		})
		.instruction();
	return ix;
}

export type RevokeIdentityAccountArgs = {
	owner: string;
	assetMint: string;
	signer: string;
} & CommonArgs;

export async function getRevokeIdentityAccountIx(
	args: RevokeIdentityAccountArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const identityProgram = getIdentityRegistryProgram(provider);
	const ix = await identityProgram.methods
		.revokeIdentityAccount(new PublicKey(args.owner))
		.accountsStrict({
			signer: args.signer,
			payer: args.payer,
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			walletIdentity: getWalletIdentityAccountPda(args.assetMint, args.owner),
			eventAuthority: getIdentityRegistryEventAuthority(),
			program: identityProgram.programId,
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			assetMint: new PublicKey(args.assetMint),
			policyEngineProgram: policyEngineProgramId,
		})
		.instruction();
	return ix;
}
