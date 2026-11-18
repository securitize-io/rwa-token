import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import {
	type AttachPolicyArgs,
	getFreezeTokenIx,
	getRevokeTokensIx,
	getSetupUserIxs,
	getThawTokenIx,
	getTrackerAccount,
	type IssueTokenArgs,
	type TransferTokensArgs,
	getPolicyEngineAccount,
	getSeizeTokensIx,
	getWalletIdentityAccountsWithFilter,
	getIdentityAccountPda,
	getIdentityAccountFromOwner,
	getRevokeIdentityAccountIx,
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
import { getAccount, getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";

describe("e2e tests", async () => {
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
			expiry: [new BN(1800000000)],
			country: 1,
		}, rwaClient.provider);
		const setupUser3Ixs = await getSetupUserIxs({
			assetMint: mint,
			payer: setup.payer.toString(),
			owner: setup.authority.toString(),
			signer: setup.authority.toString(),
			levels: [255],
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

	test("update asset metadata", async () => {
		const updateAssetMetadataArgs = {
			authority: setup.authority.toString(),
			name: "Test Class Asset - Updated",
			assetMint: mint,
			payer: setup.payer.toString(),
		};

		const updateIx = await rwaClient.assetController.updateAssetMetadata(
			updateAssetMetadataArgs
		);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(updateIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});

	test("create identity approval policy", async () => {
		const policyArgs: AttachPolicyArgs = {
			authority: setup.authority.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
			identityFilter: {
				simple: [ {
					tuple: [
						{
							target: {bothOr: {}},
							mode: {include: {}},
							level: {level: [1]},
						},
						{
							or: {}
						},
						{
							target: {bothOr: {}},
							mode: {include: {}},
							level: {level: [255]},
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

	test("attach transaction amount limit policy", async () => {
		const policyArgs: AttachPolicyArgs = {
			payer: setup.payer.toString(),
			assetMint: mint,
			authority: setup.authority.toString(),
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
				transactionAmountLimit: {
					limit: new BN(10000),
				},
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
		const issue2Ix = await rwaClient.assetController.issueTokenIxns({...issueArgs, owner: setup.authority.toString() });
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueIx).add(...issue2Ix),
			[setup.payerKp, setup.authorityKp],
		);
		expect(txnId).toBeTruthy();
	});

	test("revoke tokens", async () => {
		const revokeIx = await getRevokeTokensIx({
			owner: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(100),
			authority: setup.authority.toString(),
			reason: "TEST"
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(revokeIx),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId).toBeTruthy();
	});

	test("seize tokens", async () => {
		const seizeIx = await getSeizeTokensIx({
			from: setup.user1.toString(),
			to: setup.authority.toString(),
			assetMint: mint,
			amount: new BN(100),
			authority: setup.authority.toString(),
			reason: "TEST"
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...seizeIx),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId).toBeTruthy();
	});

	test("seizure to the same token account preserves balances", async () => {
		const tokenAddress = getAssociatedTokenAddressSync(
			new PublicKey(mint), setup.user1, true, TOKEN_2022_PROGRAM_ID
		);
		const tokenBefore = await getAccount(
			rwaClient.provider.connection, tokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID
		);
		const trackerBefore = await getTrackerAccount(mint, setup.user1.toString(), rwaClient.provider);
		const engineBefore = await getPolicyEngineAccount(mint, rwaClient.provider);
		const ixs = await getSeizeTokensIx({
			from: setup.user1.toString(),
			to: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(100),
			authority: setup.authority.toString(),
			reason: "SELF TRANSFER"
		}, rwaClient.provider);

		await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...ixs),
			[setup.payerKp, setup.authorityKp]
		);

		const tokenAfter = await getAccount(
			rwaClient.provider.connection, tokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID
		);
		const trackerAfter = await getTrackerAccount(mint, setup.user1.toString(), rwaClient.provider);
		const engineAfter = await getPolicyEngineAccount(mint, rwaClient.provider);
		expect(tokenAfter.amount).toBe(tokenBefore.amount);
		expect(trackerAfter!.totalAmount.eq(trackerBefore!.totalAmount)).toBe(true);
		expect(engineAfter!.counters).toEqual(engineBefore!.counters);
	});

	test("freeze and thaw token account", async () => {
		const freezeIx = await getFreezeTokenIx({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			assetMint: mint,
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(freezeIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();

		const thawIx = await getThawTokenIx({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			assetMint: mint,
		}, rwaClient.provider);
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(thawIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId2).toBeTruthy();
	});

	test("create wallet identity account", async () => {
		const createWalletIdentityAccountIx = await rwaClient.identityRegistry.attachWalletToIdentity({
			owner: setup.user1.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
			wallet: setup.user4.toString(),
			authority: setup.user1.toString(),
		});
		const txnId2 = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(createWalletIdentityAccountIx),
			[setup.payerKp, setup.user1Kp]
		);
		expect(txnId2).toBeTruthy();
	});

	test("get wallet identity account", async () => {
		const identityAccount = getIdentityAccountPda(mint, setup.user1.toString());
		const walletIdentityAccounts = await getWalletIdentityAccountsWithFilter(identityAccount.toBase58(), rwaClient.provider);
		expect(walletIdentityAccounts).toBeTruthy();
		expect(walletIdentityAccounts!.length).toBe(2);
		expect(walletIdentityAccounts!.some(walletIdentityAccount => walletIdentityAccount.wallet.toString() === setup.user4.toString())).toBe(true);
		expect(walletIdentityAccounts!.some(walletIdentityAccount => walletIdentityAccount.wallet.toString() === setup.user1.toString())).toBe(true);
	});

	test("issue to wallet identity account", async () => {
		const issueToWalletIdentityAccountIx = await rwaClient.assetController.issueTokenIxns({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			owner: setup.user1.toString(),
			wallet: setup.user4.toString(),
			assetMint: mint,
			amount: new BN(100),
			timestamp: new BN(0)
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...issueToWalletIdentityAccountIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();

		const ta = await getAccount(rwaClient.provider.connection, getAssociatedTokenAddressSync(new PublicKey(mint), new PublicKey(setup.user4.toString()), false, TOKEN_2022_PROGRAM_ID), undefined, TOKEN_2022_PROGRAM_ID);
		expect(ta).toBeTruthy();
		expect(ta!.amount.toString()).toBe("100");
	});

	test("transfer from wallet identity account", async () => {
		const transferFromWalletIdentityAccountIx = await rwaClient.assetController.transfer({
			from: setup.user4.toString(),
			to: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(100),
			decimals,
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...transferFromWalletIdentityAccountIx),
			[setup.payerKp, setup.user4Kp]
		);
		expect(txnId).toBeTruthy();
	});

	test("detach wallet identity account", async () => {
		const detachWalletIdentityAccountIx = await rwaClient.identityRegistry.detachWalletFromIdentity({
			owner: setup.user1.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
			wallet: setup.user4.toString(),
			authority: setup.authority.toString(),
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(detachWalletIdentityAccountIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});

	test("transfer tokens", async () => {
		const transferArgs: TransferTokensArgs = {
			from: setup.user1.toString(),
			to: setup.user2.toString(),
			assetMint: mint,
			amount: new BN(2000),
			decimals,
			createTa: true,
		};

		const transferIxs = await rwaClient.assetController.transfer(transferArgs);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...transferIxs),
			[setup.user1Kp],
			{skipPreflight: true}
		);
		expect(txnId).toBeTruthy();
	});

	test("detach all policies", async () => {
		let policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);

		for (const policy of policyAccount?.policies ?? []) {
			const policyIx = await rwaClient.policyEngine.detachPolicy({
				authority: setup.authority.toString(),
				assetMint: mint,
				payer: setup.payer.toString(),
				hash: policy.hash,
			});
			const txnId = await sendAndConfirmTransaction(
				rwaClient.provider.connection,
				new Transaction().add(...policyIx.ixs),
				[setup.payerKp, setup.authorityKp]
			);
			expect(txnId).toBeTruthy();
		}
		policyAccount = await getPolicyEngineAccount(mint, rwaClient.provider);

		expect(policyAccount?.policies.length).toBe(0);
	});

	test("change country", async () => {
		const changeCountryIx = await rwaClient.identityRegistry.changeCountry({
			owner: setup.user1.toString(),
			assetMint: mint,
			payer: setup.payer.toString(),
			country: 100,
			signer: setup.authority.toString(),
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(changeCountryIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});

	test("add  forbidden country", async () => {
		const policyArgs: AttachPolicyArgs = {
			payer: setup.payer.toString(),
			assetMint: mint,
			authority: setup.authority.toString(),
			identityFilter: {
				simple: [ {
					single: [
						{
							target: {bothOr: {}},
							mode: {include: {}},
							level: {country: [100]},
						}
					]
				}]
			},
			policyType: {
				forbiddenIdentityGroup: {},
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

	test("fail to transfer out of user 1", async () => {
		const transferIx = await rwaClient.assetController.transfer({
			from: setup.user1.toString(),
			to: setup.user2.toString(),
			assetMint: mint,
			amount: new BN(2000),
			decimals,
		});
		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...transferIx),
			[setup.user1Kp]
		)).rejects.toThrow();
	});

	test("change mapping", async () => {
		const changeMappingIx = await rwaClient.policyEngine.changeMapping({
			authority: setup.authority.toString(),
			payer: setup.payer.toString(),
			assetMint: mint,
			mappingSource: [100],
			mappingValue: [1],
		});
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...changeMappingIx.ixs),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});

	test("add forbidden identity group mapping", async () => {
		const policyArgs: AttachPolicyArgs = {
			payer: setup.payer.toString(),
			assetMint: mint,
			authority: setup.authority.toString(),
			identityFilter: {
				simple: [ {
					single: [
						{
							target: {sender: {}},
							mode: {exclude: {}},
							level: { levelMapping: {source: 1, target: 100}},
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

	test("fail to transfer out of user 2", async () => {
		const transferIx = await rwaClient.assetController.transfer({
			from: setup.user2.toString(),
			to: setup.user1.toString(),
			assetMint: mint,
			amount: new BN(100),
			decimals,
		});
		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(...transferIx),
			[setup.user2Kp]
		)).rejects.toThrow();
	});

	test("fail to revoke identity account when user has tokens", async () => {
		const revokeIx = await getRevokeIdentityAccountIx({
			owner: setup.user1.toString(),
			assetMint: mint,
			signer: setup.authority.toString(),
			payer: setup.payer.toString(),
		}, rwaClient.provider);
		await expect(sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(revokeIx),
			[setup.payerKp, setup.authorityKp]
		)).rejects.toThrow(/TrackerAccountNotEmpty/);
	});

	test("burn remaining tokens", async () => {
		const trackerAccount = await getTrackerAccount(mint, setup.user1.toString(), rwaClient.provider);
		if (!trackerAccount) {
			expect(false).toBeTruthy();
			return;
		}
		const revokeIx = await getRevokeTokensIx({
			owner: setup.user1.toString(),
			assetMint: mint,
			amount: trackerAccount.totalAmount,
			authority: setup.authority.toString(),
			reason: "TEST"
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(revokeIx),
			[setup.payerKp, setup.authorityKp],
			{skipPreflight: true}
		);
		expect(txnId).toBeTruthy();
	});

	test("revoke identity account when user has tokens", async () => {
		const revokeIx = await getRevokeIdentityAccountIx({
			owner: setup.user1.toString(),
			assetMint: mint,
			signer: setup.authority.toString(),
			payer: setup.payer.toString(),
		}, rwaClient.provider);
		const txnId = await sendAndConfirmTransaction(
			rwaClient.provider.connection,
			new Transaction().add(revokeIx),
			[setup.payerKp, setup.authorityKp]
		);
		expect(txnId).toBeTruthy();
	});
});

