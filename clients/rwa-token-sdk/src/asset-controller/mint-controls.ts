import { type Provider } from "@anchor-lang/core";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync, createAssociatedTokenAccountIdempotentInstruction } from "@solana/spl-token";
import { getIdentityAccountPda, getIdentityRegistryPda, getWalletIdentityAccountPda } from "../identity-registry/utils";
import { getIssuanceAccounts } from "./issuance";
import { assetControllerProgramId, getAssetControllerEventAuthority, getAssetControllerPda, getAssetControllerProgram } from "./utils";
import { type CapsConfig, type ThrottleConfig, type MintRequest, type BurnRequest, type PendingOperation } from "./types";

function bytes32(value: Uint8Array | number[]): Buffer {
	if (value.length !== 32 || !Array.from(value).every(byte => Number.isInteger(byte) && byte >= 0 && byte <= 255)) {
		throw new Error("Expected exactly 32 bytes");
	}
	return Buffer.from(value);
}

export const MAX_BURN_REASON_BYTES = 256;

/** Optional ID generator; save the result and reuse it for retries. Builders never generate an ID. */
export const generateOperationId = (): Uint8Array => Keypair.generate().publicKey.toBytes();

export const getPendingOperationPda = (assetMint: string, operationId: Uint8Array) =>
	PublicKey.findProgramAddressSync([Buffer.from("pending_operation"), new PublicKey(assetMint).toBuffer(), bytes32(operationId)], assetControllerProgramId)[0];

const eventAccounts = () => ({ eventAuthority: getAssetControllerEventAuthority(), program: assetControllerProgramId });

export type SetCapsConfigArgs = { assetMint: string; authority: string; caps: CapsConfig };
export type SetThrottleConfigArgs = { assetMint: string; authority: string; throttle: ThrottleConfig };

function configAccounts(assetMint: string, authority: string) {
	return {
		authority: new PublicKey(authority),
		assetMint: new PublicKey(assetMint),
		assetController: getAssetControllerPda(assetMint),
		tokenProgram: TOKEN_2022_PROGRAM_ID,
		...eventAccounts(),
	};
}

export async function getSetCapsConfigIx(args: SetCapsConfigArgs, provider: Provider) {
	return getAssetControllerProgram(provider).methods.setCapsConfig(args.caps)
		.accountsStrict(configAccounts(args.assetMint, args.authority)).instruction();
}

export async function getSetThrottleConfigIx(args: SetThrottleConfigArgs, provider: Provider) {
	return getAssetControllerProgram(provider).methods.setThrottleConfig(args.throttle)
		.accountsStrict(configAccounts(args.assetMint, args.authority)).instruction();
}

export type MigrateAssetControllerArgs = { assetMint: string; authority: string; payer: string };

/** One-time V1 → V2 migration. Limits start disabled; existing authority/mint/PDA are preserved. */
export async function getMigrateAssetControllerIx(args: MigrateAssetControllerArgs, provider: Provider) {
	return getAssetControllerProgram(provider).methods.migrateAssetController().accountsStrict({
		payer: new PublicKey(args.payer),
		authority: new PublicKey(args.authority),
		assetMint: new PublicKey(args.assetMint),
		assetController: getAssetControllerPda(args.assetMint),
		tokenProgram: TOKEN_2022_PROGRAM_ID,
		systemProgram: SystemProgram.programId,
		...eventAccounts(),
	}).instruction();
}

export type ProposeMintArgs = {
	assetMint: string;
	payer: string;
	authority: string;
	owner: string;
	wallet?: string;
	request: MintRequest;
};

function proposalAccounts(args: ProposeMintArgs | ProposeBurnArgs, tokenAccount: PublicKey) {
	const wallet = args.wallet || args.owner;
	return { payer: new PublicKey(args.payer), authority: new PublicKey(args.authority), assetMint: new PublicKey(args.assetMint),
		assetController: getAssetControllerPda(args.assetMint), wallet: new PublicKey(wallet), tokenAccount,
		identityRegistry: getIdentityRegistryPda(args.assetMint), identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
		walletIdentityAccount: getWalletIdentityAccountPda(args.assetMint, wallet),
		pendingOperation: getPendingOperationPda(args.assetMint, bytes32(args.request.id)), tokenProgram: TOKEN_2022_PROGRAM_ID,
		systemProgram: SystemProgram.programId, ...eventAccounts() };
}
export async function getProposeMintIx(args: ProposeMintArgs, provider: Provider) {
	const tokenAccount = getAssociatedTokenAddressSync(new PublicKey(args.assetMint), new PublicKey(args.wallet || args.owner), true, TOKEN_2022_PROGRAM_ID);
	return getAssetControllerProgram(provider).methods.proposeMint(args.request).accountsStrict(proposalAccounts(args, tokenAccount)).instruction();
}
export type ProposeBurnArgs = Omit<ProposeMintArgs, "request"> & { request: BurnRequest; tokenAccount?: string };
export async function getProposeBurnIx(args: ProposeBurnArgs, provider: Provider) {
	if (Buffer.byteLength(args.request.reason, "utf8") > MAX_BURN_REASON_BYTES) throw new Error("Burn reason exceeds 256 UTF-8 bytes");
	const tokenAccount = args.tokenAccount ? new PublicKey(args.tokenAccount) : getAssociatedTokenAddressSync(new PublicKey(args.assetMint), new PublicKey(args.wallet || args.owner), true, TOKEN_2022_PROGRAM_ID);
	return getAssetControllerProgram(provider).methods.proposeBurn(args.request).accountsStrict(proposalAccounts(args, tokenAccount)).instruction();
}
export async function getPendingOperation(assetMint: string, operationId: Uint8Array, provider: Provider) {
	return getAssetControllerProgram(provider).account.pendingOperation.fetchNullable(getPendingOperationPda(assetMint, operationId));
}
/** Lists live accounts; expiresAt determines executability until expiry cleanup is submitted. */
export async function getPendingOperations(assetMint: string, provider: Provider) {
	return getAssetControllerProgram(provider).account.pendingOperation.all([{ memcmp: { offset: 8, bytes: new PublicKey(assetMint).toBase58() } }]);
}
async function requirePending(assetMint: string, operationId: Uint8Array, provider: Provider) {
	const pending = await getPendingOperation(assetMint, operationId, provider);
	if (!pending) throw new Error("Pending operation does not exist; terminal history is available through events");
	return pending;
}
export type ExecutePendingArgs = { assetMint: string; operationId: Uint8Array; authority: string; payer: string };
async function buildExecutePendingIx(args: ExecutePendingArgs, pending: PendingOperation, provider: Provider) {
	const { associatedTokenProgram: _associated, to: wallet, ...accounts } = getIssuanceAccounts({ payer: args.payer, authority: args.authority, assetMint: args.assetMint, wallet: pending.wallet.toBase58(), identityAccount: pending.identityAccount });
	return getAssetControllerProgram(provider).methods.executePending().accountsStrict({ ...accounts, wallet, tokenAccount: pending.tokenAccount,
		rentPayer: pending.rentPayer, pendingOperation: getPendingOperationPda(args.assetMint, args.operationId), ...eventAccounts() }).instruction();
}
/** Low-level instruction: the stored token account must already exist. */
export async function getExecutePendingIx(args: ExecutePendingArgs, provider: Provider) {
	return buildExecutePendingIx(args, await requirePending(args.assetMint, args.operationId, provider), provider);
}
/** Prepares the mint ATA idempotently; burn execution never creates a token account. */
export async function getExecutePendingIxs(args: ExecutePendingArgs, provider: Provider) {
	const pending = await requirePending(args.assetMint, args.operationId, provider);
	const execute = await buildExecutePendingIx(args, pending, provider);
	return "mint" in pending.data ? [createAssociatedTokenAccountIdempotentInstruction(new PublicKey(args.payer), pending.tokenAccount, pending.wallet, pending.assetMint, TOKEN_2022_PROGRAM_ID), execute] : [execute];
}
export type CancelPendingArgs = { assetMint: string; operationId: Uint8Array; authority: string };
export async function getCancelPendingIx(args: CancelPendingArgs, provider: Provider) {
	const pending = await requirePending(args.assetMint, args.operationId, provider);
	return getAssetControllerProgram(provider).methods.cancelPending().accountsStrict({ authority: new PublicKey(args.authority), assetMint: new PublicKey(args.assetMint),
		assetController: getAssetControllerPda(args.assetMint), rentPayer: pending.rentPayer, pendingOperation: getPendingOperationPda(args.assetMint, args.operationId),
		tokenProgram: TOKEN_2022_PROGRAM_ID, ...eventAccounts() }).instruction();
}
export type ExpirePendingArgs = { assetMint: string; operationId: Uint8Array };
export async function getExpirePendingIx(args: ExpirePendingArgs, provider: Provider) {
	const pending = await requirePending(args.assetMint, args.operationId, provider);
	return getAssetControllerProgram(provider).methods.expirePending().accountsStrict({ rentPayer: pending.rentPayer,
		pendingOperation: getPendingOperationPda(args.assetMint, args.operationId), ...eventAccounts() }).instruction();
}
