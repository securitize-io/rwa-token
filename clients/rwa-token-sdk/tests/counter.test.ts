import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
	getSetupUserIxs,
	getTrackerAccount,
	type IssueTokenArgs,
	getPolicyEngineAccount,
	getIdentityAccountFromOwner,
} from "../src";
import { setupTests } from "./setup";
import {
	type ConfirmOptions,
	Connection,
	Transaction,
	sendAndConfirmTransaction,
} from "@solana/web3.js";
import { beforeAll, expect, test, describe } from "vitest";
import { type Config } from "../src/classes/types";
import { RwaClient } from "../src/classes";

describe("counter tests", async () => {
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
			levels: [5],
			expiry: [new BN(1800000000)],
			country: 2,
		}, rwaClient.provider);
		const setupUser3Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.user3.toString(),
			signer: setup.authority.toString(),
			levels: [3],
			expiry: [new BN(1800000000)],
			country: 3,
		}, rwaClient.provider);
		const setupUser5Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.user4.toString(),
			signer: setup.authority.toString(),
			levels: [3,4],
			expiry: [new BN(1800000000), new BN(1800000000)],
			country: 3,
		}, rwaClient.provider);
		const setupUser4Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.authority.toString(),
			signer: setup.authority.toString(),
			levels: [255],
			expiry: [new BN(tomorrow)],
			country: 3,
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupIx.ixs).add(...setupUserIxs.ixs),
			[setup.payerKp, setup.authorityKp, ...setupIx.signers, ...setupUserIxs.signers]
		);
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setupUser2Ixs.ixs).add(...setupUser3Ixs.ixs).add(...setupUser4Ixs.ixs).add(...setupUser5Ixs.ixs),
			[setup.payerKp, setup.authorityKp, ...setupUser2Ixs.signers, ...setupUser3Ixs.signers, ...setupUser4Ixs.signers, ...setupUser5Ixs.signers]
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

	test("create counters", async () => {
		const counters = await rwaClient.policyEngine.changeCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			addedCounters: [{
				id: 0,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {level: [1]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 1,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {country: [2]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 2,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {countryMapping: [10]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 3,
				identityFilter: {
					simple: [{
						tuple: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {countryMapping: [10]},
						},
						{
							and: {}
						},
						{
							target: {receiver: {}},
							mode: {include: {}},
							level: {level: [3]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 4,
				identityFilter: {
					simple: [{
						tuple: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {countryMapping: [10]},
						},
						{
							and: {}
						},
						{
							target: {receiver: {}},
							mode: {exclude: {}},
							level: {level: [4]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 5,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {exclude: {}},
							level: {level: [1]},
						}]
					}]
				},
				value: new BN(0),
			},],
			removedCounters: Buffer.from([]),
		});

		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...counters.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});

	test("change mapping", async () => {
		const changeMappingIx = await rwaClient.policyEngine.changeMapping({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			mappingSource: [3],
			mappingValue: [10],
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...changeMappingIx.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		expect(policyAccount?.mapping[3]).toBe(10);
	});

	test("issue tokens user1", async () => {
		const issueArgs: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(1000000),
		};
		const issueIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx),
			[setup.payerKp, setup.authorityKp],
			{
				skipPreflight: true,
			}
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters[0].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[1].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[2].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[3].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[4].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[5].value.toNumber()).toBe(0);
	});

	test("issue tokens user2", async () => {
		const issueArgs: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user2.toString(),
			assetMint: mint,
			amount: new BN(1000000),
		};
		const issueIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx),
			[setup.payerKp, setup.authorityKp],
			{
				skipPreflight: true,
			}
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters[0].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[1].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[2].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[3].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[4].value.toNumber()).toBe(0);
		expect(policyAccount?.counters[5].value.toNumber()).toBe(1);
	});

	test("issue tokens user3", async () => {
		const issueArgs: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user3.toString(),
			assetMint: mint,
			amount: new BN(1000000),
		};
		const issueIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx),
			[setup.payerKp, setup.authorityKp],
			{
				skipPreflight: true,
			}
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters[0].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[1].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[2].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[3].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[4].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[5].value.toNumber()).toBe(2);
	});

	test("issue tokens user4", async () => {
		const issueArgs: IssueTokenArgs = {
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user4.toString(),
			assetMint: mint,
			amount: new BN(1000000),
		};
		const issueIx = await rwaClient.assetController.issueTokenIxns(issueArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx),
			[setup.payerKp, setup.authorityKp],
			{
				skipPreflight: true,
			}
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters[0].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[1].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[2].value.toNumber()).toBe(2);
		expect(policyAccount?.counters[3].value.toNumber()).toBe(2);
		expect(policyAccount?.counters[4].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[5].value.toNumber()).toBe(3);
	});

	test("set counters", async () => {
		const setCountersIx = await rwaClient.policyEngine.setCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			changedCounters: [1],
			values: [new BN(1000)],
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...setCountersIx.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters[0].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[1].value.toNumber()).toBe(1000);
		expect(policyAccount?.counters[2].value.toNumber()).toBe(2);
		expect(policyAccount?.counters[3].value.toNumber()).toBe(2);
		expect(policyAccount?.counters[4].value.toNumber()).toBe(1);
		expect(policyAccount?.counters[5].value.toNumber()).toBe(3);
	});


	test("remove counter", async () => {
		const policyAccountBefore = await getPolicyEngineAccount(mint, rwaClient.provider);
		expect(policyAccountBefore?.counters.length).toBe(6);
		expect(policyAccountBefore?.counters[5].id).toBe(5);

		const counters = await rwaClient.policyEngine.changeCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			addedCounters: [],
			removedCounters: Buffer.from([5]),
		});

		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...counters.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();

		const policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);
		console.log(policyAccount?.counters);
		expect(policyAccount?.counters.length).toBe(5);
		expect(policyAccount?.counters[4].id).toBe(4);
	});

	test("fail to add duplicate counter id", async () => {
		const counters = await rwaClient.policyEngine.changeCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			addedCounters: [{
				id: 0,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {level: [1]},
						}]
					}]
				},
				value: new BN(0),
			}, ],
			removedCounters: Buffer.from([4]),
		});

		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...counters.ixs),
			[setup.payerKp, setup.authorityKp]
		)).rejects.toThrow(/CounterIdAlreadyExists/);
	});

	test("fail to add duplicate counter id from input", async () => {
		const counters = await rwaClient.policyEngine.changeCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			addedCounters: [{
				id: 20,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {level: [1]},
						}]
					}]
				},
				value: new BN(0),
			}, {
				id: 20,
				identityFilter: {
					simple: [{
						single: [{
							target: {receiver: {}},
							mode: {include: {}},
							level: {level: [1]},
						}]
					}]
				},
				value: new BN(0),
			}, ],
			removedCounters: Buffer.from([4]),
		});

		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...counters.ixs),
			[setup.payerKp, setup.authorityKp]
		)).rejects.toThrow(/CounterIdAlreadyExists/);
	});


	test("fail to remove non existing counter id", async () => {
		const counters = await rwaClient.policyEngine.changeCounters({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			addedCounters: [],
			removedCounters: Buffer.from([40]),
		});

		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...counters.ixs),
			[setup.payerKp, setup.authorityKp]
		)).rejects.toThrow(/CounterIdNotFound/);
	});
});


