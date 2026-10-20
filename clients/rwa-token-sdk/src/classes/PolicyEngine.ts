import { type IxReturn } from "../utils";
import {
	AddLockArgs,
	type AttachPolicyArgs,
	ChangeCounterLimitsArgs,
	ChangeCountersArgs,
	ChangeIssuancePoliciesArgs,
	ChangeMappingArgs,
	DetachPolicyArgs,
	getAddLockIx,
	getAttachToPolicyEngineIx,
	getChangeCounterLimitsIx,
	getChangeCountersIx,
	getChangeIssuancePoliciesIx,
	getChangeMappingIx,
	getDetachFromPolicyEngineIx,
	getPolicyEnginePda,
	getRemoveLockIx,
	getPruneIssuancesIx,
	getSetCountersIx,
	RemoveLockArgs,
	type PruneIssuancesArgs,
	SetCountersArgs,
} from "../policy-engine";
import { type RwaClient } from "./Client";
import { type PublicKey } from "@solana/web3.js";

/**
 * Represents the client Policy Engine for an RWA.
 */
export class PolicyEngine {
	private readonly rwaClient: RwaClient;

	constructor(rwaClient: RwaClient) {
		this.rwaClient = rwaClient;
	}

	/**
   * Asynchronously attaches a policy to the policy engine.
   * @param - {@link AttachPolicyArgs}
   * @returns A Promise that resolves to the instructions to attach a policy.
   * */
	async attachPolicy(policyArgs: AttachPolicyArgs): Promise<IxReturn> {
		const attachPolicyIx = await getAttachToPolicyEngineIx(
			policyArgs,
			this.rwaClient.provider
		);
		return attachPolicyIx;
	}

	/**
   * Asynchronously detaches a policy to the policy engine.
   * @param - {@link DetachPolicyArgs}
   * @returns A Promise that resolves to the instructions to detach a policy.
   * */
	async detachPolicy(policyArgs: DetachPolicyArgs): Promise<IxReturn> {
		const attachPolicyIx = await getDetachFromPolicyEngineIx(
			policyArgs,
			this.rwaClient.provider
		);
		return attachPolicyIx;
	}

	async changeCounterLimits(policyArgs: ChangeCounterLimitsArgs): Promise<IxReturn> {
		const changeCounterLimitsIx = await getChangeCounterLimitsIx(
			policyArgs,
			this.rwaClient.provider
		);
		return changeCounterLimitsIx;
	}

	async changeCounters(policyArgs: ChangeCountersArgs): Promise<IxReturn> {
		const changeCountersIx = await getChangeCountersIx(
			policyArgs,
			this.rwaClient.provider
		);
		return changeCountersIx;
	}

	async changeMapping(policyArgs: ChangeMappingArgs): Promise<IxReturn> {
		const changeMappingIx = await getChangeMappingIx(
			policyArgs,
			this.rwaClient.provider
		);
		return changeMappingIx;
	}

	async changeIssuancePolicies(policyArgs: ChangeIssuancePoliciesArgs): Promise<IxReturn> {
		const changeIssuancePoliciesIx = await getChangeIssuancePoliciesIx(
			policyArgs,
			this.rwaClient.provider
		);
		return changeIssuancePoliciesIx;
	}

	async setCounters(policyArgs: SetCountersArgs): Promise<IxReturn> {
		const setCountersIx = await getSetCountersIx(
			policyArgs,
			this.rwaClient.provider
		);
		return setCountersIx;
	}

	async addLock(args: AddLockArgs): Promise<IxReturn> {
		const addLockIx = await getAddLockIx(
			args,
			this.rwaClient.provider
		);
		return addLockIx;
	}

	async removeLock(args: RemoveLockArgs): Promise<IxReturn> {
		const removeLockIx = await getRemoveLockIx(
			args,
			this.rwaClient.provider
		);
		return removeLockIx;	
	}

	/** Permanently prune matured records; requires the policy-engine authority's signature. */
	async pruneIssuances(args: PruneIssuancesArgs): Promise<IxReturn> {
		return getPruneIssuancesIx(args, this.rwaClient.provider);
	}

	/**
   * Retrieves the policy registry pda account for a specific asset mint.
   * @param assetMint - The string representation of the asset's mint address.
   * @returns The policy registry pda as a public key.
   */
	getPolicyEnginePda(assetMint: string): PublicKey {
		return getPolicyEnginePda(assetMint);
	}
}
