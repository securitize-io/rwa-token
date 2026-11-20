import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
	type AttachPolicyArgs,
	getSetupUserIxs,
	getTrackerAccount,
	type IssueTokenArgs,
	getIdentityAccountFromOwner,
} from "../../src";
import { setupTests } from "../setup";
import {
	type ConfirmOptions,
	Connection,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { beforeAll, expect, test, describe } from "vitest";
import { type Config } from "../../src/classes/types";
import { RwaClient } from "../../src/classes";

describe("level change policies tests", async () => {
	let rwaClient: RwaClient;
	let mint: string;
	const setup = await setupTests();

	const decimals = 2;

	beforeAll(() => {
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

	test("initialize asset controller", async () => {
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
		mint = setupIx.signers[0].publicKey.toString();
		const tomorrow = Date.now() / 1000 + 24 * 60 * 60;

		const setupUserIxs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			signer: setup.authority.toString(),
			levels: [1],
			expiry: [new BN(tomorrow)],
			country: 1,
		}, rwaClient.provider);
		const setupUser2Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			signer: setup.authority.toString(),
			levels: [1],
			expiry: [new BN(tomorrow)],
			country: 1,
		}, rwaClient.provider);
		const setupUser3Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.user3.toString(),
			signer: setup.authority.toString(),
			levels: [1],
			expiry: [new BN(tomorrow)],
			country: 1,
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx.ixs).add(...setupUserIxs.ixs),
			[setup.payerKp, setup.authorityKp, ...setupIx.signers, ...setupUserIxs.signers]
		);
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupUser2Ixs.ixs).add(...setupUser3Ixs.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser2Ixs.signers, ...setupUser3Ixs.signers]
		);
		expect(txnId).toBeTruthy();
		expect(txnId2).toBeTruthy();
		const trackerAccount = await getTrackerAccount(
			mint,
			setup.user1.toString(),
			rwaClient.provider
		);
		expect(trackerAccount).toBeTruthy();
		expect(trackerAccount!.assetMint.toString()).toBe(mint);

		const identityAccount = await getIdentityAccountFromOwner(mint, setup.user1.toString(), rwaClient.provider);
		expect(identityAccount).toBeTruthy();
		expect(identityAccount!.owner.toString()).toBe(setup.user1.toString());
		expect(identityAccount!.numWallets).toBe(1);
	});

	test("create identity approval policy", async () => {
		const policyArgs: AttachPolicyArgs = {
			authority: setup.authority.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
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
			policyType: {
				identityApproval: {},
			},
		};

		const policyIx = await rwaClient.policyEngine.attachPolicy(policyArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...policyIx.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
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
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId).toBeTruthy();


		const issueArgs2: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			assetMint: mint,
			amount: new BN(1),
			timestamp: new BN(0)
		};
		const issueIx2 = await rwaClient.assetController.issueTokenIxns(issueArgs2);
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx2),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId2).toBeTruthy();

		const issueArgs3: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user3.toString(),
			assetMint: mint,
			amount: new BN(50),
		};
		const issueIx3 = await rwaClient.assetController.issueTokenIxns(issueArgs3);
		const txnId3 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx3),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId3).toBeTruthy();
	});

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
					limit: new BN(1000),
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

	test("attach MinBalance policy", async () => {
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
				minBalance: {
					limit: new BN(10),
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

	test("add levels to identity account", async () => {
		const addLevelIx = await rwaClient.identityRegistry.addIdentityLevelToUserAccount({
			owner: setup.user1.toString(),
			levels: [3],
			expiries: [new BN(1800000000)],
			signer: setup.authority.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
		});

		await expect(sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(addLevelIx),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		)).rejects.toThrowError(/"InstructionError":\[0,\{"Custom":6010\}\]/);
	});

	test("add levels to identity account2", async () => {
		const addLevelIx = await rwaClient.identityRegistry.addIdentityLevelToUserAccount({
			owner: setup.user2.toString(),
			levels: [3],
			expiries: [new BN(1800000000)],
			signer: setup.authority.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
		});

		await expect(sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(addLevelIx),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		)).rejects.toThrowError(/"InstructionError":\[0,\{"Custom":6011\}\]/);
	});

	test("add levels to identity account3", async () => {
		const addLevelIx = await rwaClient.identityRegistry.addIdentityLevelToUserAccount({
			owner: setup.user3.toString(),
			levels: [3],
			expiries: [new BN(1800000000)],
			signer: setup.authority.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
		});
		const txnId = await sendAndConfirmTransaction(
			setup.provider.connection,
			new Transaction().add(addLevelIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});


});
