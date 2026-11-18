import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
	ChangeCounterLimitsArgs,
	ChangeCountersArgs,
	getTransferTokensIxs,
	RwaClient,
} from "../../src";
import { setupTests } from "../setup";
import { ConfirmOptions, Connection, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";
import { expect, test, describe } from "vitest";
import { Config } from "../../src/classes/types";

describe("test additional policies", async () => {
	let rwaClient: RwaClient;
	let mint: string;
	const setup = await setupTests();
	const decimals = 2;

	test("setup environment", async () => {
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

		// Create asset controller
		const createAssetControllerArgs = {
			decimals,
			payer: setup.payer.toString(),
			authority: setup.authority.toString(),
			name: "Test Asset",
			uri: "https://test.com",
			symbol: "TST",
		};
		const setupAssetController = await rwaClient.assetController.setupNewRegistry(
			createAssetControllerArgs
		);
		const txnId = await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupAssetController.ixs),
			[setup.payerKp, ...setupAssetController.signers]
		);
		mint = setupAssetController.signers[0].publicKey.toString();
		expect(txnId).toBeTruthy();

		// Setup users
		const setupUser1 = await rwaClient.identityRegistry.setupUserIxns({
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			assetMint: mint,
			levels: [1,3],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60), new BN(Date.now() / 1000 + 24 * 60 * 60)],
			signer: setup.authorityKp.publicKey.toString(),
			country: 0,
		});

		await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupUser1.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser1.signers],
			{ skipPreflight: true }
		);

		const setupUser2 = await rwaClient.identityRegistry.setupUserIxns({
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			assetMint: mint,
			levels: [1,3],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60), new BN(Date.now() / 1000 + 24 * 60 * 60)],
			signer: setup.authorityKp.publicKey.toString(),
			country: 0,
		});
		await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupUser2.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser2.signers],
			{ skipPreflight: true }
		);

		const setupUser3 = await rwaClient.identityRegistry.setupUserIxns({
			payer: setup.payer.toString(),
			owner: setup.user3.toString(),
			assetMint: mint,
			levels: [1,3],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60), new BN(Date.now() / 1000 + 24 * 60 * 60)],
			signer: setup.authorityKp.publicKey.toString(),
			country: 0,
		});
		await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupUser3.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser3.signers],
			{ skipPreflight: true }
		);

	});

	describe("test GroupedHolderLimit policy", async () => {
		const holderLimit = 3;

		test("add counters", async () => {


			const changeCounterArgs: ChangeCountersArgs = {
				authority: setup.authority.toString(),
				payer: setup.payer.toString(),
				assetMint: mint,
				removedCounters: Buffer.from([]),
				addedCounters: [
					{
						value: new BN(0),
						id: 0,
						identityFilter: {
							simple: [ {
								single: [
									{
										target: {bothOr: {}},
										mode: {include: {}},
										level: {level: [1]},
									}
								]
							}]
						},
					},
					{
						value: new BN(0),
						id: 1,
						identityFilter: {
							simple: [ {
								single: [
									{
										target: {bothOr: {}},
										mode: {include: {}},
										level: {level: [3]},
									}
								]
							}]
						},
					},
				],
			};
			const changeCounters = await rwaClient.policyEngine.changeCounters(changeCounterArgs);
			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...changeCounters.ixs),
				[setup.payerKp, setup.authorityKp]
			);
			expect(txnId).toBeTruthy();
		});

		test("add grouped counter limits", async () => {


			const changeCounterLimitsArgs: ChangeCounterLimitsArgs = {
				authority: setup.authority.toString(),
				payer: setup.payer.toString(),
				assetMint: mint,
				removedCounterLimits: Buffer.from([]),
				addedCounterLimits: [
					{
						groupedHoldersLimit: {
							min: new BN(2),
							max: new BN(holderLimit),
							counters: Buffer.from([0, 1]),
						},
					},
				],
			};
			const changeCounterLimits = await rwaClient.policyEngine.changeCounterLimits(changeCounterLimitsArgs);
			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...changeCounterLimits.ixs),
				[setup.payerKp, setup.authorityKp]
			);
			expect(txnId).toBeTruthy();
		});

		test("issue tokens to user 1", async () => {

			// Issue tokens to user1
			const issueTokens = await rwaClient.assetController.issueTokenIxns({
				authority: setup.authority.toString(),
				payer: setup.payer.toString(),
				owner: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(1000000),
				timestamp: new BN(0)
			});
			await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...issueTokens),
				[setup.payerKp, setup.authorityKp],
				{ skipPreflight: true }
			);
		});

		test("transfer to new holder within limit", async () => {
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user1.toString(),
				to: setup.user2.toString(),
				assetMint: mint,
				amount: new BN(10),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user1Kp],
			);
			expect(txnId).toBeTruthy();

			const transferTokensIxs2 = await getTransferTokensIxs({
				from: setup.user1.toString(),
				to: setup.user3.toString(),
				assetMint: mint,
				amount: new BN(10),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId2 = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs2),
				[setup.user1Kp],
			);
			expect(txnId2).toBeTruthy();
		});

		test("attempt transfer to new holder exceeding limit", async () => {
			const setupUser3 = await rwaClient.identityRegistry.setupUserIxns({
				payer: setup.payer.toString(),
				owner: setup.user4.toString(),
				assetMint: mint,
				levels: [1,3,4],
				expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60), new BN(Date.now() / 1000 + 24 * 60 * 60), new BN(Date.now() / 1000 + 24 * 60 * 60)],
				signer: setup.authorityKp.publicKey.toString(),
				country: 0,
			});
			await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...setupUser3.ixs),
				[setup.payerKp, setup.authorityKp, ...setupUser3.signers]
			);

			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user1.toString(),
				to: setup.user4.toString(),
				assetMint: mint,
				amount: new BN(10),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			await expect(sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user1Kp],
			)).rejects.toThrowError(/custom program error: 0x1788/); // HolderLimitExceeded error
		});

		test("transfer back within lower limit", async () => {
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user2.toString(),
				to: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(10),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user2Kp],
			);
			expect(txnId).toBeTruthy();
		});

		test("attempt to transfer back exceeding lower limit", async () => {
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user3.toString(),
				to: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(9),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user3Kp],
			);
			expect(txnId).toBeTruthy();

			const transferTokensIxs2 = await getTransferTokensIxs({
				from: setup.user3.toString(),
				to: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(1),
				decimals,
				createTa: true,
			}, rwaClient.provider);
			await expect(sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs2),
				[setup.user3Kp],
			)).rejects.toThrowError(/custom program error: 0x1788/); // HolderLimitExceeded error
		});
	});
});
