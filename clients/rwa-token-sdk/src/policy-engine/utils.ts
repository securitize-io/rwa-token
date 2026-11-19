import { type Idl, Program, type Provider, utils } from "@anchor-lang/core";
import { PublicKey } from "@solana/web3.js";
import { type PolicyEngineIdlTypes } from "../programs/types";
import { getIdentityAccountPda } from "../identity-registry";

import * as PolicyEngineIdl from "../programs/idls/policy_engine.json";

/** Program address for the policy engine program. */
export const policyEngineProgramId = new PublicKey(
	"FsE8mCJyvgMzqJbfHbJQm3iuf3cRZC6n2vZi1Q8rQCy2"
);

/**
 * Returns the policy engine program as a typed anchor program.
 * @param provider - Solana anchor provider.
 * @returns Typed solana program to be used for transaction building.
 */

export const getPolicyEngineProgram = (provider: Provider) =>
  new Program(
    PolicyEngineIdl as Idl,
    provider
  ) as unknown as Program<PolicyEngineIdlTypes>;

/**
 * Retrieves the policy engine pda account for a specific asset mint.
 * @param assetMint - The string representation of the asset's mint address.
 * @returns The policy engines pda.
 */
export const getPolicyEnginePda = (assetMint: string) =>
	PublicKey.findProgramAddressSync(
		[new PublicKey(assetMint).toBuffer()],
		policyEngineProgramId
	)[0];

/**
 * Retrieves the tracker pda for a specific asset controller mint and owner.
 * @param assetMint - The string representation of the asset's mint address.
 * @param owner - The string representation of asset's owner.
 * @returns The asset controller's tracker pda.
 */
export const getTrackerAccountPda = (assetMint: string, owner: string) =>
	getTrackerAccountPdaFromIdentity(assetMint, getIdentityAccountPda(assetMint, owner));

/** Derive a tracker when the identity PDA is already known, without an extra RPC lookup. */
export const getTrackerAccountPdaFromIdentity = (assetMint: string, identityAccount: PublicKey) =>
	PublicKey.findProgramAddressSync(
		[new PublicKey(assetMint).toBuffer(), identityAccount.toBuffer()],
		policyEngineProgramId
	)[0];

export const getPolicyEngineEventAuthority = () => PublicKey.findProgramAddressSync(
	[utils.bytes.utf8.encode("__event_authority")],
	policyEngineProgramId
)[0];


/**
 * Retrieves the asset controller's metadata pda account for a specific asset mint.
 * @param assetMint - The string representation of the asset's mint address.
 * @returns The asset controller's extra metadata pda.
 */
export const getExtraMetasListPda = (assetMint: string) =>
	PublicKey.findProgramAddressSync(
		[utils.bytes.utf8.encode("extra-account-metas"), new PublicKey(assetMint).toBuffer()],
		policyEngineProgramId
	)[0];

