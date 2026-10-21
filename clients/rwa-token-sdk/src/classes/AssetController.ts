import { type PublicKey, type TransactionInstruction } from "@solana/web3.js";
import {
	type IssueTokenArgs,
	type SetupAssetControllerArgs,
	type TransferTokensArgs,
	getIssueTokensIx,
	getSetupAssetControllerIxs,
	getAssetControllerPda,
	getUpdateAssetMetadataIx,
	UpdateAssetMetadataArgs,
	getTransferTokensIxs,
	RevokeTokensArgs,
	getRevokeTokensIx,
} from "../asset-controller";
import { type IxReturn } from "../utils";
import { type RwaClient } from "./Client";
import { getExtraMetasListPda } from "../policy-engine";

/**
 * Represents the client for Asset Controller for an RWA.
 */
export class AssetController {
	private readonly rwaClient: RwaClient;

	constructor(rwaClient: RwaClient) {
		this.rwaClient = rwaClient;
	}

	/**
   * Asynchronously generates instructions to setup a new asset controller.
   * @param - {@link SetupAssetControllerArgs}
   * @returns A Promise that resolves to the instructions to create an asset controller.
   */
	async setupNewRegistry(
		createAssetControllerArgs: SetupAssetControllerArgs
	): Promise<IxReturn> {
		const setupControllerIx = await getSetupAssetControllerIxs(
			createAssetControllerArgs,
			this.rwaClient.provider
		);

		return setupControllerIx;
	}

	/**
	 * Update the asset controller's metadata.
	 * @param - {@link UpdateAssetMetadataArgs}
	 * @returns A Promise that resolves to the instructions to update the asset controller's metadata.
	 * */
	async updateAssetMetadata(
		updateAssetControllerArgs: UpdateAssetMetadataArgs
	): Promise<TransactionInstruction> {
		const updateMetadataIx = await getUpdateAssetMetadataIx(
			updateAssetControllerArgs,
			this.rwaClient.provider
		);
		return updateMetadataIx;
	}

	/**
   * Asynchronously generates instructions to issue tokens.
   * Issuance retains only history still locked under the current holding period.
   * Matured new issuances update balances without storing a record; explicit locks are preserved.
   * Pruned history cannot be restored by a later holding-period increase.
   * @param - {@link IssueTokenArgs}
   * @returns A Promise that resolves to the instructions to issue tokens.
   */
	async issueTokenIxns(
		IssueArgs: IssueTokenArgs
	): Promise<TransactionInstruction[]> {
		const issueTokensIxs = await getIssueTokensIx(
			IssueArgs,
			this.rwaClient.provider
		);
		return issueTokensIxs;
	}

	/**
   * Asynchronously generates instructions to revoke assets.
   * @param - {@link RevokeTokensArgs}
   * @returns A Promise that resolves to the instructions to revoke assets.
   */
	async revokeTokenIxns(
		revokeTokenArgs: RevokeTokensArgs
	): Promise<TransactionInstruction> {
		const revokeTokenIx = await getRevokeTokensIx(
			revokeTokenArgs,
			this.rwaClient.provider
		);
		return revokeTokenIx;
	}

	/**
   * Executes a token transfer.
   * @returns A promise that resolves to transaction instruction.
   */
	async transfer(
		transferArgs: TransferTokensArgs
	): Promise<TransactionInstruction[]> {
		const transferIxs = await getTransferTokensIxs(transferArgs, this.rwaClient.provider);
		return transferIxs;
	}

	/**
   * Retrieves the asset controller pda account for a specific asset mint.
   * @param assetMint - The string representation of the asset's mint address.
   * @returns The asset controllers pda as a public key.
   */
	getAssetControllerPda(assetMint: string): PublicKey {
		return getAssetControllerPda(assetMint);
	}

	/**
   * Retrieves the asset controller's metadata pda account for a specific asset mint.
   * @param assetMint - The string representation of the asset's mint address.
   * @returns The asset controller's extra metadata pda.
   */
	getExtraMetasListPda(assetMint: string): PublicKey {
		return getExtraMetasListPda(assetMint);
	}
}
