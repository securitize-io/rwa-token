

import {
	ComputeBudgetProgram,
	Keypair,
	PublicKey,
	SystemProgram,
	TransactionInstruction,
} from "@solana/web3.js";
import {
	getPolicyEnginePda,
	getTrackerAccountPda,
	policyEngineProgramId,
	getExtraMetasListPda,
} from "../policy-engine";
import {
	identityRegistryProgramId,
	getCreateIdentityAccountIx,
	getIdentityAccountPda,
	getIdentityRegistryPda,
	getAddLevelToIdentityAccount,
	getWalletIdentityAccountPda,
	getWalletIdentityAccount,
	getIdentityAccount,
} from "../identity-registry";
import {
	type CommonArgs,
	type IxReturn,
} from "../utils";
import {
	ASSOCIATED_TOKEN_PROGRAM_ID,
	TOKEN_2022_PROGRAM_ID,
	createAssociatedTokenAccountInstruction,
	createTransferCheckedInstruction,
	getAccount,
	getAssociatedTokenAddressSync,
	getMemoTransfer,
} from "@solana/spl-token";
import {
	getAssetControllerProgram,
	getAssetControllerPda,
	assetControllerProgramId,
	getAssetControllerEventAuthority,
} from "./utils";
import { type Provider, BN } from "@anchor-lang/core";

/** Represents arguments for creating an on chain asset controller. */
export type CreateAssetControllerIx = {
  decimals: number;
  authority: string;
  name: string;
  uri: string;
  symbol: string;
} & CommonArgs;

/**
 * Builds the transaction instruction to create an Asset Controller.
 * @param args - {@link CreateAssetControllerIx}
 * @returns Create asset controller transaction instruction
 */
export async function getCreateAssetControllerIx(
	args: CreateAssetControllerIx,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.createAssetController({
			decimals: args.decimals,
			name: args.name,
			uri: args.uri,
			symbol: args.symbol,
		})
		.accountsStrict({
			payer: args.payer,
			assetMint: args.assetMint,
			assetController: getAssetControllerPda(args.assetMint),
			extraMetasAccount: getExtraMetasListPda(args.assetMint),
			systemProgram: SystemProgram.programId,
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			authority: args.authority,
			policyEngineAccount: getPolicyEnginePda(args.assetMint),
			identityRegistryAccount: getIdentityRegistryPda(args.assetMint),
			policyEngine: policyEngineProgramId,
			identityRegistry: identityRegistryProgramId,
			eventAuthority: getAssetControllerEventAuthority(),
			program: assetControllerProgramId,
		})
		.instruction();
	return ix;
}

/** Represents arguments for update an on chain asset metadata. */
export type UpdateAssetMetadataArgs = {
	authority: string;
	name?: string;
	uri?: string;
	symbol?: string;
  } & CommonArgs;

/**
 * Builds the transaction instruction to create an Asset Controller.
 * @param args - {@link UpdateAssetMetadataArgs}
 * @returns Create asset controller transaction instruction
 */
export async function getUpdateAssetMetadataIx(
	args: UpdateAssetMetadataArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.updateMetadata({
			name: args.name || null,
			uri: args.uri || null,
			symbol: args.symbol || null,
		})
		.accountsStrict({
			payer: args.payer,
			assetMint: args.assetMint,
			assetController: getAssetControllerPda(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			authority: args.authority,
			eventAuthority: getAssetControllerEventAuthority(),
			systemProgram: SystemProgram.programId,
			program: assetControllerProgramId,
		})
		.instruction();
	return ix;
}


/** Represents arguments for issuing an on chain asset/token. */
export type IssueTokenArgs = {
  amount: BN;
  authority: string;
  owner: string;
  wallet?: string;
  timestamp?: BN;
} & CommonArgs;

/**
 * Creates transaction instruction to issue tokens for a specific amount for a specific asset.
 * @param args {@link IssueTokenArgs}
 * @returns A transaction instruction distributing the specified amount for the specific asset.
 */
export async function getIssueTokensIx(
	args: IssueTokenArgs,
	provider: Provider
): Promise<TransactionInstruction[]> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.issueTokens(args.amount, args.timestamp || new BN( Date.now() / 1000))
		.accountsStrict({
			payer: new PublicKey(args.payer),
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
			assetController: getAssetControllerPda(args.assetMint),
			policyEngine: getPolicyEnginePda(args.assetMint),
			policyEngineProgram: policyEngineProgramId,
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			tokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.wallet || args.owner),
				true,
				TOKEN_2022_PROGRAM_ID
			),
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
			to: new PublicKey(args.wallet || args.owner),
			walletIdentityAccount: getWalletIdentityAccountPda(args.assetMint, args.wallet || args.owner),
			eventAuthority: getAssetControllerEventAuthority(),
			program: assetControllerProgramId,
		})
		.instruction();
	return [ix];
}

export type TransferTokensArgs = {
  from: string;
  to: string;
  amount: BN;
  assetMint: string;
  decimals: number;
  message?: string;
  createTa?: boolean;
  wallet?: string;
}

/**
 * Creates a transaction instruction to transfer a token between addresses with transfer controls.
 * @param args {@link TransferTokensArgs}
 * @returns Transaction instruction to transfer RWA token.
 */
export async function getTransferTokensIxs(
	args: TransferTokensArgs,
	provider: Provider
): Promise<TransactionInstruction[]> {
	const destinationWalletIdentityPda = getWalletIdentityAccountPda(args.assetMint, args.to);
	const destinationWalletIdentityAccount = await getWalletIdentityAccount(destinationWalletIdentityPda, provider);
	if (!destinationWalletIdentityAccount) {
		throw new Error("Destination wallet account not found");
	}
	const destinationIdentityAccount = await getIdentityAccount(destinationWalletIdentityAccount?.identityAccount, provider);
	if (!destinationIdentityAccount) {
		throw new Error("Destination wallet account not found");
	}
	const remainingAccounts = [
		{
			pubkey: getExtraMetasListPda(args.assetMint),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: policyEngineProgramId,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getPolicyEnginePda(args.assetMint),
			isWritable: true,
			isSigner: false,
		},
		{
			pubkey: identityRegistryProgramId,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getIdentityRegistryPda(args.assetMint),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getWalletIdentityAccountPda(args.assetMint, args.wallet || args.from),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: destinationWalletIdentityPda,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getIdentityAccountPda(args.assetMint, args.from),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: destinationWalletIdentityAccount.identityAccount,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getTrackerAccountPda(args.assetMint, args.from),
			isWritable: true,
			isSigner: false,
		},
		{
			pubkey: getTrackerAccountPda(args.assetMint, destinationIdentityAccount.owner.toString()),
			isWritable: true,
			isSigner: false,
		},
	];

	const ixs: TransactionInstruction[] = [];
	try {
		const ta = await getAccount(provider.connection, getAssociatedTokenAddressSync(
			new PublicKey(args.assetMint),
			new PublicKey(args.to),
			true,
			TOKEN_2022_PROGRAM_ID
		), undefined, TOKEN_2022_PROGRAM_ID);
		const isMemoTransfer = getMemoTransfer(ta);
		if (isMemoTransfer) {
			if(!args.message) {
				throw new Error("Memo is required for memo transfer");
			}
			ixs.push(new TransactionInstruction({
				keys: [{ pubkey: new PublicKey(args.from), isSigner: true, isWritable: true }],
				data: Buffer.from(args.message, "utf-8"),
				programId: new PublicKey("MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr"),
			}));
		}
	} catch {
		if (args.createTa) {
			ixs.push(createAssociatedTokenAccountInstruction(new PublicKey(args.from), getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.to),
				true,
				TOKEN_2022_PROGRAM_ID
			), new PublicKey(args.to), new PublicKey(args.assetMint), TOKEN_2022_PROGRAM_ID));
		}
	}

	const ix = createTransferCheckedInstruction(
		getAssociatedTokenAddressSync(
			new PublicKey(args.assetMint),
			new PublicKey(args.wallet || args.from),
			true,
			TOKEN_2022_PROGRAM_ID
		),
		new PublicKey(args.assetMint),
		getAssociatedTokenAddressSync(
			new PublicKey(args.assetMint),
			new PublicKey(args.to),
			true,
			TOKEN_2022_PROGRAM_ID
		),
		new PublicKey(args.wallet || args.from),
		args.amount,
		args.decimals,
		[],
		TOKEN_2022_PROGRAM_ID
	);
	ix.keys = ix.keys.concat(remainingAccounts);

	ixs.push(ix);
	return ixs;
}

/** Args used to generate new asset controller */
export type SetupAssetControllerArgs = {
  authority: string;
  decimals: number;
  payer: string;
  name: string;
  uri: string;
  symbol: string;
  interestRate?: number;
};

/**
 * Generates a new asset controller.
 * This includes generation of a new key pair, a new asset registry, policy registry, data registry, identity registry.
 * @param args - {@link SetupAssetControllerArgs}
 * @returns - {@link IxReturn}, an object of the initialize transaction instructions and a new keypair.
 */
export async function getSetupAssetControllerIxs(
	args: SetupAssetControllerArgs,
	provider: Provider
): Promise<IxReturn> {
	const mintKp = new Keypair();
	const mint = mintKp.publicKey;
	const updatedArgs = { ...args, assetMint: mint.toString(), signer: args.authority };
	// Get asset registry create ix
	const assetControllerCreateIx = await getCreateAssetControllerIx(
		updatedArgs,
		provider
	);

	return {
		ixs: [
			ComputeBudgetProgram.setComputeUnitLimit({units: 450_000}),
			assetControllerCreateIx,
		],
		signers: [mintKp],
	};
}

/** Args used to setup user */
export type SetupUserArgs = {
  payer: string;
  owner: string;
  signer: string;
  assetMint: string;
  levels: number[];
  expiry: BN[];
  country: number;
};

/**
 * Generate instructions to set up a user for permissioned based assets.
 * This function constructs the instructions necessary for setting up a user, which includes
 * creating an identity account, indicating permissions, and a token account for the user.
 * @param args {@link SetupUserArgs}
 * @returns - {@link IxReturn}, a promise that resolves to a list of generated transaction instructions.
 */
export async function getSetupUserIxs(
	args: SetupUserArgs,
	provider: Provider
): Promise<IxReturn> {
	const ixs: TransactionInstruction[] = [];
	const identityAccountIx = await getCreateIdentityAccountIx(
		{
			payer: args.payer,
			signer: args.signer,
			assetMint: args.assetMint,
			owner: args.owner,
			level: args.levels[0],
			expiry: args.expiry[0],
			country: args.country,
		},
		provider
	);
	ixs.push(identityAccountIx);
	if (args.levels.length > 1) {
		const addLevelIx = await getAddLevelToIdentityAccount(
			{
				authority: args.signer,
				owner: args.owner,
				assetMint: args.assetMint,
				levels: args.levels.slice(1),
				expiries: args.expiry.slice(1),
				signer: args.signer,
				payer: args.payer,
			},
			provider
		);
		ixs.push(addLevelIx);
	}
	return {
		ixs,
		signers: [],
	};
}

export type MemoTranferArgs = {
	owner: string;
	tokenAccount: string;
	assetMint: string;
	authority: string;
};

/**
 * Generate Instructions to disable memo transfer
 * @param args - {@link MemoTranferArgs}
 * @returns - {@link TransactionInstruction}
 * */
export async function getEnableMemoTransferIx(
	args: MemoTranferArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.enableMemoTransfer()
		.accountsStrict({
			owner: new PublicKey(args.owner),
			tokenAccount: new PublicKey(args.tokenAccount),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			assetMint: new PublicKey(args.assetMint),
			program: assetControllerProgramId,
			eventAuthority: getAssetControllerEventAuthority(),
			payer: new PublicKey(args.owner),
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
			assetController: getAssetControllerPda(args.assetMint),
			authority: new PublicKey(args.authority),
		})
		.instruction();
	return ix;
}

/**
 * Generate Instructions to disable memo transfer
 * @param args - {@link MemoTranferArgs}
 * @returns - {@link TransactionInstruction}
 * */
export async function getDisableMemoTransferIx(
	args: MemoTranferArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.disableMemoTransfer()
		.accountsStrict({
			owner: new PublicKey(args.owner),
			tokenAccount: new PublicKey(args.tokenAccount),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			program: assetControllerProgramId,
			eventAuthority: getAssetControllerEventAuthority(),
			assetController: getAssetControllerPda(args.assetMint),
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
		})
		.instruction();
	return ix;
}

export type FreezeTokenArgs = {
	authority: string;
	owner: string;
} & CommonArgs;

/**
 * Generate Instructions to freeze token account
 * @param args - {@link FreezeTokenArgs}
 * @returns - {@link TransactionInstruction}
 */
export async function getFreezeTokenIx(
	args: FreezeTokenArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.freezeTokenAccount()
		.accountsStrict({
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			assetController: getAssetControllerPda(args.assetMint),
			tokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.owner),
				true,
				TOKEN_2022_PROGRAM_ID
			),
		})
		.instruction();
	return ix;
}

/**
 * Generate Instructions to thaw token account
 * @param args - {@link FreezeTokenArgs}
 * @returns - {@link TransactionInstruction}
 * */
export async function getThawTokenIx(
	args: FreezeTokenArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.thawTokenAccount()
		.accountsStrict({
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			assetController: getAssetControllerPda(args.assetMint),
			tokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.owner),
				true,
				TOKEN_2022_PROGRAM_ID
			),
		})
		.instruction();
	return ix;
}

export type RevokeTokensArgs = {
	amount: BN;
	owner: string;
	wallet?: string;
	authority: string;
	assetMint: string;
	reason: string;
};

/**
 * Revoke tokens from a user
 * @param args - {@link RevokeTokensArgs}
 * @returns - {@link TransactionInstruction}
 * */
export async function getRevokeTokensIx(
	args: RevokeTokensArgs,
	provider: Provider
): Promise<TransactionInstruction> {
	const assetProgram = getAssetControllerProgram(provider);
	const ix = await assetProgram.methods
		.revokeTokens(args.amount, args.reason)
		.accountsStrict({
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			assetController: getAssetControllerPda(args.assetMint),
			revokeTokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.owner),
				true,
				TOKEN_2022_PROGRAM_ID
			),
			policyEngine: getPolicyEnginePda(args.assetMint),
			identityRegistry: getIdentityRegistryPda(args.assetMint),
			identityAccount: getIdentityAccountPda(args.assetMint, args.owner),
			trackerAccount: getTrackerAccountPda(args.assetMint, args.owner),
			walletIdentityAccount: getWalletIdentityAccountPda(args.assetMint,  args.wallet || args.owner),
			policyEngineProgram: policyEngineProgramId,
			associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
			systemProgram: SystemProgram.programId,
			eventAuthority: getAssetControllerEventAuthority(),
			program: assetControllerProgramId,
		})
		.instruction();
	return ix;
}

export type SeizeTokensArgs = {
	amount: BN;
	from: string;
	to: string;
	wallet?: string;
	authority: string;
	assetMint: string;
	reason: string;
};

/**
 * Seize tokens from a user
 * @param args - {@link SeizeTokensArgs}
 * @returns - {@link TransactionInstruction}
 * */
export async function getSeizeTokensIx(
	args: SeizeTokensArgs,
	provider: Provider
): Promise<TransactionInstruction[]> {
	const assetProgram = getAssetControllerProgram(provider);
	const remainingAccounts = [
		{
			pubkey: getExtraMetasListPda(args.assetMint),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: policyEngineProgramId,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getPolicyEnginePda(args.assetMint),
			isWritable: true,
			isSigner: false,
		},
		{
			pubkey: identityRegistryProgramId,
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getIdentityRegistryPda(args.assetMint),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getWalletIdentityAccountPda(args.assetMint, args.wallet || args.from),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getWalletIdentityAccountPda(args.assetMint, args.to),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getIdentityAccountPda(args.assetMint, args.wallet || args.from),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getIdentityAccountPda(args.assetMint, args.to),
			isWritable: false,
			isSigner: false,
		},
		{
			pubkey: getTrackerAccountPda(args.assetMint, args.wallet || args.from),
			isWritable: true,
			isSigner: false,
		},
		{
			pubkey: getTrackerAccountPda(args.assetMint, args.to),
			isWritable: true,
			isSigner: false,
		},

	];
	const ixs: TransactionInstruction[] = [ComputeBudgetProgram.setComputeUnitLimit({units: 450_000})];
	const ix = await assetProgram.methods
		.seizeTokens(args.amount, args.reason)
		.accountsStrict({
			authority: new PublicKey(args.authority),
			assetMint: new PublicKey(args.assetMint),
			tokenProgram: TOKEN_2022_PROGRAM_ID,
			assetController: getAssetControllerPda(args.assetMint),
			sourceTokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.wallet || args.from),
				true,
				TOKEN_2022_PROGRAM_ID
			),
			destinationTokenAccount: getAssociatedTokenAddressSync(
				new PublicKey(args.assetMint),
				new PublicKey(args.to),
				true,
				TOKEN_2022_PROGRAM_ID
			),
			eventAuthority: getAssetControllerEventAuthority(),
			program: assetControllerProgramId,
		})
		.remainingAccounts(remainingAccounts)
		.instruction();
	ixs.push(ix);
	return ixs;
}
