import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
	type AttachPolicyArgs,
	getTrackerAccount,
	type IssueTokenArgs,
	type SetupUserArgs,
	type TransferTokensArgs,
} from "../src";
import { setupTests } from "./setup";
import {
	type ConfirmOptions,
	Connection,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { expect, test, describe } from "vitest";
import { type Config } from "../src/classes/types";
import { RwaClient } from "../src/classes";

describe("test suite to test tracker account is being updated correctly on transfers, data is correctly being stored and discarded and to test the limit of transfers that can be tracked", async () => {
	let rwaClient: RwaClient;
	let mint: string;
	const setup = await setupTests();
	const decimals = 9;

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
		};

		const setupIx = await rwaClient.assetController.setupNewRegistry(
			setupAssetControllerArgs
		);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx.ixs),
			[setup.payerKp, ...setupIx.signers]
		);
		mint = setupIx.signers[0].publicKey.toString();
		expect(txnId).toBeTruthy();
	});

	test("setup user1 and user2", async () => {
		const setupUser1Args: SetupUserArgs = {
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			signer: setup.authority.toString(),
			assetMint: mint,
			levels: [1],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
			country: 1,
		};
		const setupIx1 = await rwaClient.identityRegistry.setupUserIxns(
			setupUser1Args
		);
		const txnId1 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx1.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId1).toBeTruthy();
		const setupUser2Args: SetupUserArgs = {
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			signer: setup.authority.toString(),
			assetMint: mint,
			levels: [1],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
			country: 1,
		};
		const setupIx2 = await rwaClient.identityRegistry.setupUserIxns(
			setupUser2Args
		);
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx2.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId2).toBeTruthy();
	});

	test("issue tokens", async () => {
		const issueArgs: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(1000000),
			timestamp: new BN(0)
		};
		const issueIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
		console.log(txnId);

		const trackerAccount = await getTrackerAccount(
			mint,
			setup.user1.toString(),
			rwaClient.provider
		);

		console.log(trackerAccount);

		expect(trackerAccount?.totalAmount.eq(new BN(1000000))).toBe(true);
		// A timestamp of zero is already matured under the default zero holding period.
		expect(trackerAccount?.issuances).toHaveLength(0);
	});

	test("transfer tokens", async () => {
		const transferArgs: TransferTokensArgs = {
			from: setup.user1.toString(),
			to: setup.user2.toString(),
			assetMint: mint,
			amount: new BN(100),
			decimals,
			createTa: true,
		};

		const transferIxs = await rwaClient.assetController.transfer(transferArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...transferIxs),
			[setup.user1Kp]
		);
		expect(txnId).toBeTruthy();
	});
});
