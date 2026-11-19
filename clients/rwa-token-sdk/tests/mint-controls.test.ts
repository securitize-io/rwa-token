import { AnchorProvider, BN, Wallet, utils } from "@anchor-lang/core";
import { beforeAll, describe, expect, test } from "vitest";
import { ComputeBudgetProgram, Keypair, PublicKey, SYSVAR_CLOCK_PUBKEY, Transaction, TransactionInstruction, sendAndConfirmTransaction } from "@solana/web3.js";
import { TOKEN_2022_PROGRAM_ID, getAccount, getAssociatedTokenAddressSync, getMint, getMemoTransfer } from "@solana/spl-token";
import {
	assetControllerProgramId, getAssetControllerAccount, getAssetControllerAccountsWithFilter,
	getAssetControllerPda, getAssetControllerProgram, getAttachWalletToIdentityIx,
	getCancelPendingIx, getChangeIssuancePoliciesIx, getSetThrottleConfigIx, getSetCapsConfigIx,
	getExecutePendingIxs, getExpirePendingIx,
	getIssueTokensIx, getLegacyAssetControllerAccount, getMigrateAssetControllerIx,
	generateOperationId, getProposeBurnIx, getPendingOperation,
	getPendingOperationPda, getPendingOperations, getProposeMintIx, getRevokeTokensIx,
	getSetupAssetControllerIxs, getSetupUserIxs, getTrackerAccount,
	getFreezeTokenIx, getThawTokenIx, getUpdateAssetMetadataIx, getSeizeTokensIx,
	getEnableMemoTransferIx, getDisableMemoTransferIx,
	type CapsConfig, type ThrottleConfig, type ProposeMintArgs,
} from "../src";
import { setupTests } from "./setup";

type Limits = CapsConfig & ThrottleConfig;

describe.sequential("asset-controller mint controls", () => {
	let setup: Awaited<ReturnType<typeof setupTests>>;
	let provider: AnchorProvider;
	let requestCounter = 0;
	let transactionCounter = 0;

	beforeAll(async () => {
		setup = await setupTests();
		provider = new AnchorProvider(setup.provider.connection, new Wallet(setup.payerKp), { commitment: "confirmed", preflightCommitment: "confirmed" });
	}, 60_000);

	function config(overrides: Partial<Limits> = {}): Limits {
		return {
			enabled: true,
			maxMintPerTx: new BN(500), maxBurnPerTx: new BN(500),
			mintWindowCap: new BN(1_000), burnWindowCap: new BN(1_000),
			windowSeconds: new BN(120), largeAmountThreshold: new BN(0),
			largeAmountDelay: new BN(0), pendingOperationGracePeriod: new BN(0),
			...overrides,
		};
	}

	async function send(ixs: TransactionInstruction[], extra: Keypair[] = []) {
		// Exercise on-chain retry checks rather than the RPC's same-signature transaction cache.
		const transaction = new Transaction().add(
			ComputeBudgetProgram.setComputeUnitLimit({ units: 600_000 }),
			ComputeBudgetProgram.setComputeUnitPrice({ microLamports: ++transactionCounter }),
			...ixs.filter(ix => !ix.programId.equals(ComputeBudgetProgram.programId)),
		);
		const needed = new Set(ixs.flatMap(ix => ix.keys.filter(key => key.isSigner).map(key => key.pubkey.toBase58())));
		needed.add(setup.payer.toBase58());
		const signers = [setup.payerKp, setup.authorityKp, setup.user1Kp, setup.user2Kp, ...extra]
			.filter((signer, index, all) => needed.has(signer.publicKey.toBase58()) && all.findIndex(other => other.publicKey.equals(signer.publicKey)) === index);
		transaction.feePayer = setup.payer;
		return sendAndConfirmTransaction(provider.connection, transaction, signers, { commitment: "confirmed", preflightCommitment: "confirmed" });
	}

	async function fixture(limits: Limits | null = config()) {
		const create = await getSetupAssetControllerIxs({ payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), decimals: 0, name: "Mint controls", symbol: "CAP", uri: "https://example.com/cap" }, provider);
		const assetMint = create.signers[0].publicKey.toBase58();
		const user = await getSetupUserIxs({ assetMint, payer: setup.payer.toBase58(), signer: setup.authority.toBase58(), owner: setup.user1.toBase58(), levels: [1], expiry: [new BN(2_000_000_000)], country: 1 }, provider);
		// These fixed-size fixture instructions fit together in one transaction.
		const ixs = [...create.ixs, ...user.ixs];
		if (limits) {
			const { maxMintPerTx, maxBurnPerTx, ...throttle } = limits;
			ixs.push(await getSetCapsConfigIx({ assetMint, authority: setup.authority.toBase58(), caps: { maxMintPerTx, maxBurnPerTx } }, provider));
			ixs.push(await getSetThrottleConfigIx({ assetMint, authority: setup.authority.toBase58(), throttle }, provider));
		}
		await send(ixs, [...create.signers, ...user.signers]);
		return assetMint;
	}

	async function configure(assetMint: string, limits: Limits) {
		const { maxMintPerTx, maxBurnPerTx, ...throttle } = limits;
		const current = await getAssetControllerAccount(assetMint, provider);
		if (!current || current.version !== 2) throw new Error("Expected V2 controller");
		const args = { assetMint, authority: setup.authority.toBase58() };
		const ixs: TransactionInstruction[] = [];
		if (!current.caps.maxMintPerTx.eq(maxMintPerTx) || !current.caps.maxBurnPerTx.eq(maxBurnPerTx)) {
			ixs.push(await getSetCapsConfigIx({ ...args, caps: { maxMintPerTx, maxBurnPerTx } }, provider));
		}
		if (JSON.stringify(current.throttle) !== JSON.stringify(throttle) || ixs.length === 0) {
			ixs.push(await getSetThrottleConfigIx({ ...args, throttle }, provider));
		}
		return send(ixs);
	}

	async function issue(assetMint: string, amount: number, wallet = setup.user1.toBase58()) {
		return send(await getIssueTokensIx({ assetMint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), wallet, amount: new BN(amount), timestamp: new BN(1) }, provider));
	}

	async function burn(assetMint: string, amount: number) {
		return send([await getRevokeTokensIx({ assetMint, authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), amount: new BN(amount), reason: "test" }, provider)]);
	}

	async function controls(assetMint: string) {
		const account = await getAssetControllerAccount(assetMint, provider);
		if (!account || account.version !== 2) throw new Error("Expected V2 controller");
		return account;
	}

	async function balance(assetMint: string, wallet = setup.user1) {
		const address = getAssociatedTokenAddressSync(new PublicKey(assetMint), wallet, true, TOKEN_2022_PROGRAM_ID);
		return (await getAccount(provider.connection, address, "confirmed", TOKEN_2022_PROGRAM_ID)).amount;
	}

	async function now() {
		const clock = await provider.connection.getAccountInfo(SYSVAR_CLOCK_PUBKEY, "confirmed");
		if (!clock) throw new Error("Missing clock");
		return Number(clock.data.readBigInt64LE(32));
	}

	async function waitUntil(timestamp: BN | number) {
		const deadline = Date.now() + 30_000;
		while (await now() < Number(timestamp.toString())) {
			if (Date.now() > deadline) throw new Error("Validator clock did not reach the requested timestamp");
			await new Promise(resolve => setTimeout(resolve, 200));
		}
	}

	async function proposal(assetMint: string, wallet?: string) {
		const id = Array<number>(32).fill(0);
		id.splice(0, 4, ...new BN(++requestCounter).toArray("le", 4));
		const args: ProposeMintArgs = {
			assetMint, payer: setup.user2.toBase58(), authority: setup.authority.toBase58(),
			owner: setup.user1.toBase58(), wallet,
			request: { id, amount: new BN(300), issuanceTimestamp: new BN(1) },
		};
		const operationId = Uint8Array.from(args.request.id);
		const ix = await getProposeMintIx(args, provider);
		expect(ix.keys.filter(account => account.isSigner).map(account => account.pubkey.toBase58())).toEqual([args.payer, args.authority]);
		const signature = await send([ix]);
		const pending = await getPendingOperation(assetMint, operationId, provider);
		if (!pending) throw new Error("Proposal was not created");
		return { args, operationId, ix, pending, signature };
	}

	function delayed(overrides: Partial<Limits> = {}) {
		return config({ largeAmountThreshold: new BN(100), largeAmountDelay: new BN(3), pendingOperationGracePeriod: new BN(60), ...overrides });
	}

	async function executeIx(assetMint: string, operationId: Uint8Array) {
		return getExecutePendingIxs({ assetMint, operationId, authority: setup.authority.toBase58(), payer: setup.payer.toBase58() }, provider);
	}

	async function burnProposal(assetMint: string, amount = 300, wallet = setup.user1.toBase58(), reason = "redemption") {
		const id = Array<number>(32).fill(0);
		id.splice(0, 4, ...new BN(++requestCounter).toArray("le", 4));
		const args = { assetMint, payer: setup.user2.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), wallet,
			request: { id, amount: new BN(amount), reason } };
		const operationId = Uint8Array.from(args.request.id);
		const ix = await getProposeBurnIx(args, provider);
		expect(ix.keys.filter(account => account.isSigner).map(account => account.pubkey.toBase58())).toEqual([args.payer, args.authority]);
		const signature = await send([ix]);
		const pending = await getPendingOperation(assetMint, operationId, provider);
		if (!pending) throw new Error("Burn proposal was not created");
		return { args, operationId, ix, pending, signature };
	}

	async function events(signature: string) {
		const transaction = await provider.connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
		const names: string[] = [];
		for (const group of transaction?.meta?.innerInstructions || []) {
			for (const instruction of group.instructions) {
				const data = Buffer.from(utils.bytes.bs58.decode(instruction.data));
				if (!data.subarray(0, 8).equals(Buffer.from([228, 69, 165, 46, 81, 203, 154, 29]))) continue;
				const event = getAssetControllerProgram(provider).coder.events.decode(data.subarray(8).toString("base64"));
				if (event) names.push(event.name);
			}
		}
		return names;
	}

	async function injectLegacy(mint: string, padding = 0) {
		const address = getAssetControllerPda(mint);
		const bytes = Buffer.concat([Buffer.from([70, 136, 149, 138, 12, 87, 52, 105, 1]), new PublicKey(mint).toBuffer(), setup.authority.toBuffer(), Buffer.alloc(padding, 0xa5)]);
		const response = await fetch(provider.connection.rpcEndpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "surfnet_setAccount", params: [address.toBase58(), { data: bytes.toString("hex"), owner: assetControllerProgramId.toBase58(), lamports: await provider.connection.getMinimumBalanceForRentExemption(bytes.length) }] }) });
		const result = await response.json() as { error?: unknown };
		expect(result.error).toBeUndefined();
		return bytes;
	}

	test("new V2 controllers start disabled and preserve ordinary issuance", async () => {
		const mint = await fixture(null);
		const account = await getAssetControllerAccount(mint, provider);
		expect(account?.version).toBe(2);
		expect(account?.version === 2 && account.throttle.enabled).toBe(false);
		expect((await provider.connection.getAccountInfo(getAssetControllerPda(mint)))?.data.subarray(0, 8)).toEqual(Buffer.from([70, 136, 149, 138, 12, 87, 52, 105]));
		await issue(mint, 2_000);
		expect(await balance(mint)).toBe(2_000n);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(0);
	});

	test("operation and exact cumulative mint caps hard-fail atomically", async () => {
		const mint = await fixture();
		await expect(issue(mint, 501)).rejects.toThrow("OperationCapExceeded");
		await issue(mint, 500);
		await issue(mint, 500);
		await expect(issue(mint, 1)).rejects.toThrow("WindowCapExceeded");
		expect(await balance(mint)).toBe(1_000n);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(1_000);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(1_000);
	});

	test("immediate burns have an independent cumulative budget", async () => {
		const mint = await fixture(null);
		await issue(mint, 2_000);
		await configure(mint, config());
		await burn(mint, 500);
		await burn(mint, 500);
		await expect(burn(mint, 1)).rejects.toThrow("WindowCapExceeded");
		await expect(burn(mint, 501)).rejects.toThrow("OperationCapExceeded");
		expect(await balance(mint)).toBe(1_000n);
		const state = (await controls(mint)).state;
		expect(state.burnedInWindow.toNumber()).toBe(1_000);
		expect(state.mintedInWindow.toNumber()).toBe(0);
	});

	test("a window rolls over using cluster time even for backdated issuance", async () => {
		const mint = await fixture(config({ windowSeconds: new BN(3) }));
		await issue(mint, 500);
		await issue(mint, 500);
		await expect(issue(mint, 1)).rejects.toThrow("WindowCapExceeded");
		const start = (await controls(mint)).state.windowStart;
		await waitUntil(start.addn(3));
		await issue(mint, 1);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(1);
	});

	test("ceilings apply to individual instructions within a transaction", async () => {
		const mint = await fixture(config({ maxMintPerTx: new BN(100) }));
		const args = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), amount: new BN(100) };
		await send([...(await getIssueTokensIx(args, provider)), ...(await getIssueTokensIx(args, provider))]);
		expect(await balance(mint)).toBe(200n);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(200);
	});

	test("a later failing instruction rolls back earlier minting and consumption", async () => {
		const mint = await fixture(config({ mintWindowCap: new BN(500) }));
		const args = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), amount: new BN(300) };
		await expect(send([...(await getIssueTokensIx(args, provider)), ...(await getIssueTokensIx(args, provider))])).rejects.toThrow("WindowCapExceeded");
		expect((await getMint(provider.connection, new PublicKey(mint), "confirmed", TOKEN_2022_PROGRAM_ID)).supply).toBe(0n);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(0);
	});

	test("configuration requires authority and rejects invalid or unchanged values", async () => {
		const mint = await fixture();
		await expect(configure(mint, config())).rejects.toThrow("MintControlsUnchanged");
		await expect(configure(mint, config({ windowSeconds: new BN(0) }))).rejects.toThrow("InvalidMintControlsConfig");
		await expect(configure(mint, delayed({ pendingOperationGracePeriod: new BN(0) }))).rejects.toThrow("InvalidMintControlsConfig");
		const ix = await getSetCapsConfigIx({ assetMint: mint, authority: setup.user1.toBase58(), caps: { maxMintPerTx: new BN(400), maxBurnPerTx: new BN(500) } }, provider);
		await expect(send([ix])).rejects.toThrow("InvalidAuthority");
		expect((await controls(mint)).caps.maxMintPerTx.toNumber()).toBe(500);
	});

	test("configuration updates preserve consumption across disabling and re-enabling", async () => {
		const mint = await fixture();
		await issue(mint, 400);
		await configure(mint, config({ enabled: false }));
		await issue(mint, 2_000);
		await configure(mint, config());
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(400);
		await issue(mint, 500);
		await expect(issue(mint, 101)).rejects.toThrow("WindowCapExceeded");
	});

	test("threshold equality is immediate and proposals consume no capacity", async () => {
		const mint = await fixture(delayed());
		await issue(mint, 100);
		await expect(issue(mint, 101)).rejects.toThrow("AmountRequiresTimelock");
		const p = await proposal(mint);
		expect(p.pending.expiresAt.sub(p.pending.effectiveAt).toNumber()).toBe(60);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(100);
		expect((await getPendingOperations(mint, provider)).length).toBe(1);
		expect(await events(p.signature)).toContain("operationProposed");
		await configure(mint, delayed({ largeAmountThreshold: new BN(0) }));
		await proposal(mint);
		expect((await getPendingOperations(mint, provider)).length).toBe(2);
	});

	test("early execution reverts; mature execution accounts, refunds, and closes the PDA", async () => {
		const mint = await fixture(delayed());
		const p = await proposal(mint);
		const ixs = await executeIx(mint, p.operationId);
		const ix = ixs[ixs.length - 1];
		expect(ix.keys.filter(account => account.isSigner).length).toBe(2);
		await expect(send(ixs)).rejects.toThrow("PendingOperationNotEffective");
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
		await waitUntil(p.pending.effectiveAt);
		const rent = await provider.connection.getBalance(getPendingOperationPda(mint, p.operationId));
		const payerBalance = await provider.connection.getBalance(p.pending.rentPayer);
		const signature = await send(ixs);
		expect(await provider.connection.getBalance(p.pending.rentPayer)).toBe(payerBalance + rent);
		expect(await balance(mint)).toBe(300n);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(300);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(300);
		expect(await getPendingOperation(mint, p.operationId, provider)).toBeNull();
		expect(await events(signature)).toEqual(expect.arrayContaining(["issueEvent", "operationExecuted"]));
		await expect(send(ixs)).rejects.toThrow();
		await send([p.ix]);
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
	});

	test("cancellation is authorized, emits an event, refunds rent, and permits a fresh proposal", async () => {
		const mint = await fixture(delayed());
		const p = await proposal(mint);
		const args = { assetMint: mint, operationId: p.operationId, authority: setup.authority.toBase58() };
		const bad = await getCancelPendingIx({ ...args, authority: setup.user1.toBase58() }, provider);
		await expect(send([bad])).rejects.toThrow("InvalidAuthority");
		const ix = await getCancelPendingIx(args, provider);
		expect(ix.keys.filter(account => account.isSigner).map(account => account.pubkey.toBase58())).toEqual([args.authority]);
		const rent = await provider.connection.getBalance(getPendingOperationPda(mint, p.operationId));
		const payerBalance = await provider.connection.getBalance(p.pending.rentPayer);
		const signature = await send([ix]);
		expect(await provider.connection.getBalance(p.pending.rentPayer)).toBe(payerBalance + rent);
		expect(await getPendingOperation(mint, p.operationId, provider)).toBeNull();
		expect(await events(signature)).toContain("operationCancelled");
		await expect(send([ix])).rejects.toThrow();
		await send([p.ix]);
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
	});

	test("expiry blocks mint and burn execution, refunds rent, and releases IDs", async () => {
		const mint = await fixture(null);
		await issue(mint, 500);
		await configure(mint, delayed({ pendingOperationGracePeriod: new BN(2) }));
		const operations = [await proposal(mint), await burnProposal(mint)];
		const expiries = await Promise.all(operations.map(p => getExpirePendingIx({ assetMint: mint, operationId: p.operationId }, provider)));
		for (const expire of expiries) expect(expire.keys.filter(account => account.isSigner)).toEqual([]);
		await expect(send([expiries[0]])).rejects.toThrow("PendingOperationNotExpired");
		await waitUntil(BN.max(operations[0].pending.expiresAt, operations[1].pending.expiresAt));
		for (const [index, p] of operations.entries()) {
			await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow("PendingOperationExpired");
			const rent = await provider.connection.getBalance(getPendingOperationPda(mint, p.operationId));
			const payerBefore = await provider.connection.getBalance(p.pending.rentPayer);
			const signature = await send([expiries[index]]);
			expect(await provider.connection.getBalance(p.pending.rentPayer)).toBe(payerBefore + rent);
			expect(await getPendingOperation(mint, p.operationId, provider)).toBeNull();
			expect(await events(signature)).toContain("operationExpired");
			await send([p.ix]);
			expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
		}
		expect(await balance(mint)).toBe(500n);
	});

	test("execution rechecks current caps without changing the proposal's timestamps", async () => {
		const mint = await fixture(delayed());
		const p = await proposal(mint);
		await configure(mint, delayed({ maxMintPerTx: new BN(299), largeAmountDelay: new BN(100), pendingOperationGracePeriod: new BN(200) }));
		const after = await getPendingOperation(mint, p.operationId, provider);
		expect(after?.effectiveAt.eq(p.pending.effectiveAt)).toBe(true);
		expect(after?.expiresAt.eq(p.pending.expiresAt)).toBe(true);
		await waitUntil(p.pending.effectiveAt);
		await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow("OperationCapExceeded");
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
		await configure(mint, delayed());
		await send(await executeIx(mint, p.operationId));
	});

	test("delayed issuance enforces current supply policy and rolls back consumption on rejection", async () => {
		const mint = await fixture(delayed());
		const p = await proposal(mint);
		const policy = await getChangeIssuancePoliciesIx({ assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), issuancePolicies: { disallowBackdating: true, maxSupply: new BN(299), usLockPeriod: new BN(0), nonUsLockPeriod: new BN(0) } }, provider);
		await send(policy.ixs);
		await waitUntil(p.pending.effectiveAt);
		await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow("MaxSupplyExceeded");
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(0);
		expect((await getMint(provider.connection, new PublicKey(mint), "confirmed", TOKEN_2022_PROGRAM_ID)).supply).toBe(0n);
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
	});

	test("execution cannot redirect its rent refund", async () => {
		const mint = await fixture(delayed());
		const p = await proposal(mint);
		const ixs = await executeIx(mint, p.operationId);
		const ix = ixs[ixs.length - 1];
		const redirect = new TransactionInstruction({ programId: ix.programId, data: ix.data, keys: ix.keys.map(key => key.pubkey.equals(p.pending.rentPayer) && !key.isSigner ? { ...key, pubkey: setup.user1 } : key) });
		await expect(send([...ixs.slice(0, -1), redirect])).rejects.toThrow("ConstraintAddress");
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
	});

	test("legacy controllers retain issuance, revocation, freeze, metadata, memo, and seizure flows", async () => {
		const mint = await fixture(null);
		const legacy = await injectLegacy(mint);
		const controllerBefore = await provider.connection.getAccountInfo(getAssetControllerPda(mint));
		await issue(mint, 1_000);
		await burn(mint, 100);
		const args = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58() };
		await send([await getFreezeTokenIx(args, provider)]);
		await expect(burn(mint, 1)).rejects.toThrow(/frozen/i);
		await send([await getThawTokenIx(args, provider)]);
		await send([await getUpdateAssetMetadataIx({ ...args, name: "Legacy asset" }, provider)]);
		const tokenAddress = getAssociatedTokenAddressSync(new PublicKey(mint), setup.user1, true, TOKEN_2022_PROGRAM_ID);
		const memoArgs = { ...args, tokenAccount: tokenAddress.toBase58() };
		await send([await getEnableMemoTransferIx(memoArgs, provider)]);
		expect(getMemoTransfer(await getAccount(provider.connection, tokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID))?.requireIncomingTransferMemos).toBe(true);
		await send([await getDisableMemoTransferIx(memoArgs, provider)]);
		expect(getMemoTransfer(await getAccount(provider.connection, tokenAddress, "confirmed", TOKEN_2022_PROGRAM_ID))?.requireIncomingTransferMemos).toBe(false);
		const user = await getSetupUserIxs({ assetMint: mint, payer: args.payer, signer: args.authority, owner: setup.user2.toBase58(), levels: [1], expiry: [new BN(2_000_000_000)], country: 1 }, provider);
		await send(user.ixs, user.signers);
		await send(await getIssueTokensIx({ ...args, owner: setup.user2.toBase58(), amount: new BN(1), timestamp: new BN(1) }, provider));
		await send(await getSeizeTokensIx({ assetMint: mint, authority: args.authority, from: args.owner, to: setup.user2.toBase58(), amount: new BN(100), reason: "Legacy seizure" }, provider));
		expect(await balance(mint)).toBe(800n);
		expect(await balance(mint, setup.user2)).toBe(101n);
		expect((await getTrackerAccount(mint, args.owner, provider))?.totalAmount.toNumber()).toBe(800);
		const controllerAfter = await provider.connection.getAccountInfo(getAssetControllerPda(mint));
		expect(controllerAfter?.data).toEqual(legacy);
		expect(controllerAfter?.lamports).toBe(controllerBefore?.lamports);
	});

	test("legacy controllers preserve authorization and reject V2-only controls without mutation", async () => {
		const mint = await fixture(null);
		const legacy = await injectLegacy(mint);
		await issue(mint, 500);
		const args = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58() };
		await expect(send(await getIssueTokensIx({ ...args, authority: setup.user2.toBase58(), amount: new BN(1), timestamp: new BN(1) }, provider))).rejects.toThrow("InvalidAuthority");
		await expect(send([await getRevokeTokensIx({ ...args, authority: setup.user2.toBase58(), amount: new BN(1), reason: "Unauthorized" }, provider)])).rejects.toThrow("InvalidAuthority");
		const { maxMintPerTx, maxBurnPerTx, ...throttle } = delayed();
		await expect(send([await getSetCapsConfigIx({ ...args, caps: { maxMintPerTx, maxBurnPerTx } }, provider)])).rejects.toThrow("AssetControllerMigrationRequired");
		await expect(send([await getSetThrottleConfigIx({ ...args, throttle }, provider)])).rejects.toThrow("AssetControllerMigrationRequired");
		const id = Array.from(generateOperationId());
		await expect(send([await getProposeMintIx({ ...args, request: { id, amount: new BN(300), issuanceTimestamp: new BN(1) } }, provider)])).rejects.toThrow("AssetControllerMigrationRequired");
		await expect(send([await getProposeBurnIx({ ...args, request: { id, amount: new BN(300), reason: "Legacy burn" } }, provider)])).rejects.toThrow("AssetControllerMigrationRequired");
		expect(await getPendingOperation(mint, Uint8Array.from(id), provider)).toBeNull();
		expect(await balance(mint)).toBe(500n);
		expect((await provider.connection.getAccountInfo(getAssetControllerPda(mint)))?.data).toEqual(legacy);
	});

	test("migrates one legacy controller while another remains usable with its original layout", async () => {
		const mint = await fixture(null);
		const address = getAssetControllerPda(mint);
		// A V1 allocation can already be V2-sized; only its version selects the schema.
		const legacy = await injectLegacy(mint, 89);
		expect(legacy.length).toBe(162);
		const otherMint = await fixture(null);
		await injectLegacy(otherMint);
		expect((await getLegacyAssetControllerAccount(mint, provider))?.authority.equals(setup.authority)).toBe(true);
		expect((await getAssetControllerAccount(mint, provider))?.version).toBe(1);
		expect((await getAssetControllerAccountsWithFilter({ assetMint: mint }, provider))?.[0].version).toBe(1);
		await issue(mint, 1);
		await burn(mint, 1);
		expect((await provider.connection.getAccountInfo(address))?.data).toEqual(legacy);
		const args = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58() };
		const unauthorized = await getMigrateAssetControllerIx({ ...args, authority: setup.user1.toBase58() }, provider);
		await expect(send([unauthorized])).rejects.toThrow("InvalidAuthority");
		const ix = await getMigrateAssetControllerIx(args, provider);
		await send([ix]);
		const migrated = await getAssetControllerAccount(mint, provider);
		expect(migrated?.version).toBe(2);
		expect(migrated?.assetMint.toBase58()).toBe(mint);
		expect(migrated?.authority.equals(setup.authority)).toBe(true);
		expect(migrated?.version === 2 && migrated.throttle.enabled).toBe(false);
		expect((await provider.connection.getAccountInfo(address))?.data.length).toBe(162);
		await expect(send([ix])).rejects.toThrow("InvalidLegacyAssetController");
		await issue(mint, 1);
		expect(await balance(mint)).toBe(1n);
		const accountArgs = { assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58() };
		await send([await getFreezeTokenIx(accountArgs, provider)]);
		await send([await getThawTokenIx(accountArgs, provider)]);
		await burn(mint, 1);
		expect(await balance(mint)).toBe(0n);
		await configure(mint, config({ maxMintPerTx: new BN(1) }));
		await expect(issue(mint, 2)).rejects.toThrow("OperationCapExceeded");
		await issue(otherMint, 2_000);
		expect(await balance(otherMint)).toBe(2_000n);
		expect((await getAssetControllerAccount(otherMint, provider))?.version).toBe(1);
		expect((await provider.connection.getAccountInfo(getAssetControllerPda(otherMint)))?.data.length).toBe(73);
		const listed = await getAssetControllerAccountsWithFilter({ authority: setup.authority.toBase58() }, provider);
		expect(listed?.find(account => account.assetMint.toBase58() === mint)?.version).toBe(2);
		expect(listed?.find(account => account.assetMint.toBase58() === otherMint)?.version).toBe(1);
	});

	test("burns above the threshold require a proposal and execute through the shared path", async () => {
		const mint = await fixture(null);
		await issue(mint, 1_000);
		await configure(mint, delayed());
		await burn(mint, 100);
		await expect(burn(mint, 101)).rejects.toThrow("AmountRequiresTimelock");
		const p = await burnProposal(mint);
		expect(await events(p.signature)).toContain("operationProposed");
		if (!("burn" in p.pending.data)) throw new Error("Expected a burn payload");
		expect(p.pending.data.burn.amount.eq(new BN(300))).toBe(true);
		expect(p.pending.data.burn.reason).toBe("redemption");
		expect(await balance(mint)).toBe(900n);
		const ixs = await executeIx(mint, p.operationId);
		expect(ixs).toHaveLength(1); // No mint ATA preparation on the burn path.
		await expect(send(ixs)).rejects.toThrow("PendingOperationNotEffective");
		await waitUntil(p.pending.effectiveAt);
		const rent = await provider.connection.getBalance(getPendingOperationPda(mint, p.operationId));
		const payerBefore = await provider.connection.getBalance(p.pending.rentPayer);
		const signature = await send(ixs);
		expect(await provider.connection.getBalance(p.pending.rentPayer)).toBe(payerBefore + rent);
		expect(await balance(mint)).toBe(600n);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(600);
		expect((await controls(mint)).state.burnedInWindow.toNumber()).toBe(400);
		expect((await controls(mint)).state.mintedInWindow.toNumber()).toBe(0);
		expect(await getPendingOperation(mint, p.operationId, provider)).toBeNull();
		expect(await events(signature)).toEqual(expect.arrayContaining(["revokeEvent", "operationExecuted"]));
	});

	test("pending burns do not reserve balance and failed execution rolls back consumption", async () => {
		const mint = await fixture(null);
		await issue(mint, 350);
		await configure(mint, delayed());
		const p = await burnProposal(mint);
		await burn(mint, 100);
		await waitUntil(p.pending.effectiveAt);
		await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow(/insufficient funds/i);
		expect(await balance(mint)).toBe(250n);
		expect((await controls(mint)).state.burnedInWindow.toNumber()).toBe(100);
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
		await issue(mint, 100);
		await send(await executeIx(mint, p.operationId));
		expect(await balance(mint)).toBe(50n);
	});

	test("pending burns recheck lowered ceilings and full windows without reserving budget", async () => {
		const mint = await fixture(null);
		await issue(mint, 1_000);
		await configure(mint, delayed({ burnWindowCap: new BN(300) }));
		const p = await burnProposal(mint);
		await burn(mint, 100);
		await configure(mint, delayed({ maxBurnPerTx: new BN(299), burnWindowCap: new BN(300) }));
		await waitUntil(p.pending.effectiveAt);
		await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow("OperationCapExceeded");
		await configure(mint, delayed({ burnWindowCap: new BN(300) }));
		await expect(send(await executeIx(mint, p.operationId))).rejects.toThrow("WindowCapExceeded");
		expect((await controls(mint)).state.burnedInWindow.toNumber()).toBe(100);
		await configure(mint, delayed());
		await send(await executeIx(mint, p.operationId));
	});

	test("shared cancellation closes a burn and permits reuse of the operation ID", async () => {
		const mint = await fixture(null);
		await issue(mint, 500);
		await configure(mint, delayed());
		const p = await burnProposal(mint);
		await expect(send([p.ix])).rejects.toThrow();
		const cancel = await getCancelPendingIx({ assetMint: mint, operationId: p.operationId, authority: setup.authority.toBase58() }, provider);
		const signature = await send([cancel]);
		expect(await events(signature)).toContain("operationCancelled");
		expect(await getPendingOperation(mint, p.operationId, provider)).toBeNull();
		await send([p.ix]);
		expect(await getPendingOperation(mint, p.operationId, provider)).not.toBeNull();
		expect(await balance(mint)).toBe(500n);
	});

	test("delayed mint and burn resolve attached wallets and share identity accounting", async () => {
		const mint = await fixture(null);
		await send([await getAttachWalletToIdentityIx({ assetMint: mint, payer: setup.payer.toBase58(), authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), wallet: setup.user2.toBase58() }, provider)]);
		await issue(mint, 500, setup.user2.toBase58());
		await configure(mint, delayed());
		const queuedMint = await proposal(mint, setup.user2.toBase58());
		const queuedBurn = await burnProposal(mint, 300, setup.user2.toBase58());
		await waitUntil(BN.max(queuedMint.pending.effectiveAt, queuedBurn.pending.effectiveAt));
		await send(await executeIx(mint, queuedMint.operationId));
		expect(await balance(mint, setup.user2)).toBe(800n);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(800);
		await send(await executeIx(mint, queuedBurn.operationId));
		expect(await balance(mint, setup.user2)).toBe(500n);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(500);
		await send([await getRevokeTokensIx({ assetMint: mint, authority: setup.authority.toBase58(), owner: setup.user1.toBase58(), wallet: setup.user2.toBase58(), amount: new BN(100), reason: "attached-wallet revocation" }, provider)]);
		expect(await balance(mint, setup.user2)).toBe(400n);
		expect((await getTrackerAccount(mint, setup.user1.toBase58(), provider))?.totalAmount.toNumber()).toBe(400);
	});

	test("caller IDs collide across kinds and changed payloads while pending", async () => {
		const mint = await fixture(null);
		await issue(mint, 500);
		await configure(mint, delayed());
		const p = await proposal(mint);
		await expect(send([p.ix])).rejects.toThrow();
		const changedMint = await getProposeMintIx({ ...p.args, request: { ...p.args.request, amount: new BN(301), issuanceTimestamp: new BN(999) } }, provider);
		await expect(send([changedMint])).rejects.toThrow();
		const request = { id: p.args.request.id, amount: p.args.request.amount, reason: "é".repeat(128) };
		const burn = await getProposeBurnIx({ ...p.args, request }, provider);
		await expect(send([burn])).rejects.toThrow();
		const pending = await getPendingOperation(mint, p.operationId, provider);
		if (!pending || !("mint" in pending.data)) throw new Error("Original mint proposal must remain immutable");
		expect(pending.data.mint.amount.eq(new BN(300))).toBe(true);
		const newId = generateOperationId();
		await send([await getProposeBurnIx({ ...p.args, request: { ...request, id: Array.from(newId) } }, provider)]);
		expect(await getPendingOperation(mint, newId, provider)).not.toBeNull();
		expect(await getPendingOperations(mint, provider)).toHaveLength(2);
		const listed = await getAssetControllerAccountsWithFilter({ assetMint: mint }, provider);
		expect(listed).toHaveLength(1);
		expect(listed?.[0].assetMint.toBase58()).toBe(mint);
	});
});
