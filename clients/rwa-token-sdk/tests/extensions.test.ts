import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
	getDisableMemoTransferIx,
	getEnableMemoTransferIx,
	getSetupUserIxs,
} from "../src";
import { setupTests } from "./setup";
import {
	type ConfirmOptions,
	Connection,
	PublicKey,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect, test, describe } from "vitest";
import { type Config } from "../src/classes/types";
import { RwaClient } from "../src/classes";
import { getAccount, getAssociatedTokenAddressSync, getMemoTransfer, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

describe("extension tests", async () => {
	let rwaClient: RwaClient;
	let mint: string;
	const setup = await setupTests();

	const decimals = 2;

	test("setup provider", async () => {
		const connectionUrl = process.env.RPC_URL ?? "http://localhost:8899";
		const connection = new Connection(connectionUrl, "processed");

		const confirmationOptions: ConfirmOptions = {
			skipPreflight: false,
			maxRetries: 3,
			commitment: "processed",
		};

		const config: Config = {
			connection,
			rpcUrl: connectionUrl,
			confirmationOptions,
		};
		const provider = new AnchorProvider(connection, new Wallet(setup.payerKp), confirmationOptions);

		rwaClient = new RwaClient(config, provider);
	});

	test("initalize asset controller", async () => {
		const setupAssetControllerArgs = {
			decimals,
			payer: setup.payer.toString(),
			authority: setup.authority.toString(),
			name: "Test Class Asset",
			uri: "https://test.com",
			symbol: "TFT",
			memoTransfer: true,
		};

		const setupIx = await rwaClient.assetController.setupNewRegistry(
			setupAssetControllerArgs
		);
		const setupUser = await getSetupUserIxs(
			{
				assetMint: setupIx.signers[0].publicKey.toString(),
				payer: setup.payer.toString(),
				owner: setup.authority.toString(),
				signer: setup.authority.toString(),
				levels: [255],
				expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
				country: 1,
			},
			rwaClient.provider
		);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx.ixs).add(...setupUser.ixs),
			[setup.payerKp, setup.authorityKp, ...setupIx.signers, ...setupUser.signers]
		);
		mint = setupIx.signers[0].publicKey.toString();
		expect(txnId).toBeTruthy();
		const _mintData = await getMint(
			rwaClient.provider.connection,
			new PublicKey(mint),
			undefined,
			TOKEN_2022_PROGRAM_ID,
		);
	});

	test("enable memo transfer", async () => {
		const enableMemoTransferIx = await getEnableMemoTransferIx(
			{
				owner: setup.authority.toString(),
				tokenAccount: getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(setup.authority.toString()), undefined, TOKEN_2022_PROGRAM_ID).toString(),
				assetMint: mint,
				authority: setup.authority.toString(),
			},
			rwaClient.provider
		);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(enableMemoTransferIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
		const tokenAccount = await getAccount(
			rwaClient.provider.connection,
			getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(setup.authority.toString()), undefined, TOKEN_2022_PROGRAM_ID),
			undefined,
			TOKEN_2022_PROGRAM_ID
		);
		const memoTransfer = getMemoTransfer(
			tokenAccount,
		);
		expect(memoTransfer?.requireIncomingTransferMemos).toEqual(true);
	});

	test("disable transfer memo", async () => {
		const updateIx = await getDisableMemoTransferIx(
			{
				owner: setup.authority.toString(),
				tokenAccount: getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(setup.authority.toString()), undefined, TOKEN_2022_PROGRAM_ID).toString(),
				assetMint: mint,
				authority: setup.authority.toString(),
			},
			rwaClient.provider
		);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(updateIx),
			[setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
		const mintAccount = await getAccount(
			rwaClient.provider.connection,
			getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(setup.authority.toString()), undefined, TOKEN_2022_PROGRAM_ID),
			undefined,
			TOKEN_2022_PROGRAM_ID,
		);
		// Get memo Config for Mint Account
		const memoMintConfig = getMemoTransfer(
			mintAccount,
		);
		expect(memoMintConfig?.requireIncomingTransferMemos).toEqual(false);
	});

});
