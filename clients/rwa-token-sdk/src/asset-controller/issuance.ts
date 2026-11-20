import { PublicKey, SystemProgram } from "@solana/web3.js";
import { ASSOCIATED_TOKEN_PROGRAM_ID, TOKEN_2022_PROGRAM_ID, getAssociatedTokenAddressSync } from "@solana/spl-token";
import { getIdentityRegistryPda, getWalletIdentityAccountPda } from "../identity-registry/utils";
import { getPolicyEnginePda, getTrackerAccountPdaFromIdentity, policyEngineProgramId } from "../policy-engine/utils";
import { getAssetControllerPda } from "./utils";

/** Shared account construction for immediate and delayed issuance, including attached wallets. */
export function getIssuanceAccounts(args: {
	payer: string;
	authority: string;
	assetMint: string;
	wallet: string;
	identityAccount: PublicKey;
}) {
	return {
		payer: new PublicKey(args.payer),
		authority: new PublicKey(args.authority),
		assetMint: new PublicKey(args.assetMint),
		assetController: getAssetControllerPda(args.assetMint),
		to: new PublicKey(args.wallet),
		tokenAccount: getAssociatedTokenAddressSync(new PublicKey(args.assetMint), new PublicKey(args.wallet), true, TOKEN_2022_PROGRAM_ID),
		identityRegistry: getIdentityRegistryPda(args.assetMint),
		identityAccount: args.identityAccount,
		trackerAccount: getTrackerAccountPdaFromIdentity(args.assetMint, args.identityAccount),
		tokenProgram: TOKEN_2022_PROGRAM_ID,
		associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
		systemProgram: SystemProgram.programId,
		policyEngineProgram: policyEngineProgramId,
		policyEngine: getPolicyEnginePda(args.assetMint),
		walletIdentityAccount: getWalletIdentityAccountPda(args.assetMint, args.wallet),
	};
}
