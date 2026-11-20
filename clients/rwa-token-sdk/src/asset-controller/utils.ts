import { PublicKey } from "@solana/web3.js";
import { type Idl, Program, type Provider, utils } from "@anchor-lang/core";
import { AssetControllerIdlTypes } from "../programs";

import * as AssetControllerIdl from "../programs/idls/asset_controller.json";

export const assetControllerProgramId = new PublicKey(
	"7tXjmbkZVY3Gmg9kDBebcNXT1yC5pyoxxXVLwdbv9tvP"
);

/**
 * Returns the asset controller program as a typed anchor program.
 * @param provider - Solana anchor provider.
 * @returns Typed solana program to be used for transaction building.
 */
export const getAssetControllerProgram = (provider: Provider) => new Program(AssetControllerIdl as Idl, provider) as unknown as Program<AssetControllerIdlTypes>;


/**
 * Retrieves the asset controller's public key for a specific asset mint.
 * @param assetMint - The string representation of the asset's mint address.
 * @returns The asset controller's pda.
 */
export const getAssetControllerPda = (assetMint: string) =>
	PublicKey.findProgramAddressSync(
		[new PublicKey(assetMint).toBuffer()],
		assetControllerProgramId
	)[0];

export const getAssetControllerEventAuthority = () => PublicKey.findProgramAddressSync(
	[utils.bytes.utf8.encode("__event_authority")],
	assetControllerProgramId
)[0];
