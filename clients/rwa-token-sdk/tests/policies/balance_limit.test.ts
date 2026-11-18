import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
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
			levels: [1],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
			signer: setup.authorityKp.publicKey.toString(),
			country: 0,
		});
		await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupUser1.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser1.signers]
		);

		const setupUser2 = await rwaClient.identityRegistry.setupUserIxns({
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			assetMint: mint,
			levels: [3],
			expiry: [new BN(Date.now() / 1000 + 24 * 60 * 60)],
			signer: setup.authorityKp.publicKey.toString(),
			country: 0,
		});
		await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(...setupUser2.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser2.signers]
		);

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
			[setup.payerKp, setup.authorityKp]
		);
	});

	describe("test Balance policies", async () => {
		const balanceLimit = new BN(100000); // 1,000 tokens with 2 decimals
		const minBalanceLimit = new BN(1000); // 10 tokens with 2 decimals

		test("attach MaxBalance policy", async () => {
			const attachPolicy = await rwaClient.policyEngine.attachPolicy({
				payer: setup.payer.toString(),
				assetMint: mint,
				authority: setup.authority.toString(),
				identityFilter: {
					simple: [ {
						single: [
							{
								target: {receiver: {}},
								mode: {include: {}},
								level: {level: [3]},
							}
						]
					}]
				},
				policyType: {
					maxBalance: {
						limit: balanceLimit,
					}
				},
			});
			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...attachPolicy.ixs),
				[setup.payerKp, setup.authorityKp, ...attachPolicy.signers]
			);
			expect(txnId).toBeTruthy();
		});

		test("transfer bellow max balance", async () => {
			const transferAmount = 2000; // 20 tokens
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user1.toString(),
				to: setup.user2.toString(),
				assetMint: mint,
				amount: new BN(transferAmount),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user1Kp],
			);
			expect(txnId).toBeTruthy();
			// currentBalance remains unchanged as this is a transfer within the group
		});

		test("transfer above max balance", async () => {
			const transferAmount = 100000; // 20 tokens
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user1.toString(),
				to: setup.user2.toString(),
				assetMint: mint,
				amount: new BN(transferAmount),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			await expect(sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user1Kp],
				{skipPreflight: true}
			)).rejects.toThrowError(/"InstructionError":\[0,\{"Custom":6010\}\]/);
			// currentBalance remains unchanged as this is a transfer within the group
		});


		test("attach MinBalance policy", async () => {
			const attachPolicy = await rwaClient.policyEngine.attachPolicy({
				payer: setup.payer.toString(),
				assetMint: mint,
				authority: setup.authority.toString(),
				identityFilter: {
					simple: [ {
						single: [
							{
								target: {sender: {}},
								mode: {include: {}},
								level: {level: [3]},
							}
						]
					}]
				},
				policyType: {
					minBalance: {
						limit: minBalanceLimit,
					}
				},
			});
			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...attachPolicy.ixs),
				[setup.payerKp, setup.authorityKp, ...attachPolicy.signers]
			);
			expect(txnId).toBeTruthy();
		});

		test("transfer bellow min balance", async () => {
			const transferAmount = 2000; // 20 tokens

			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user2.toString(),
				to: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(transferAmount),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			await expect(sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user2Kp],
				{skipPreflight: true}
			)).rejects.toThrowError(/"InstructionError":\[0,\{"Custom":6011\}\]/);
			// currentBalance remains unchanged as this is a transfer within the group
		});

		test("transfer above min balance", async () => {
			const transferAmount = 1; // 20 tokens
			const transferTokensIxs = await getTransferTokensIxs({
				from: setup.user2.toString(),
				to: setup.user1.toString(),
				assetMint: mint,
				amount: new BN(transferAmount),
				decimals,
				createTa: true,
			}, rwaClient.provider);

			const txnId = await sendAndConfirmTransaction(
				setup.provider.connection,
				new Transaction().add(...transferTokensIxs),
				[setup.user2Kp],
			);
			expect(txnId).toBeTruthy();
			// currentBalance remains unchanged as this is a transfer within the group
		});

	});

});
