import { BN } from "@coral-xyz/anchor";
import { getAccount, getAssociatedTokenAddressSync, getMint, TOKEN_2022_PROGRAM_ID } from "@solana/spl-token";
import { ComputeBudgetProgram } from "@solana/web3.js";
import { describe, expect, test } from "vitest";
import { getPolicyEnginePda, getPolicyEngineProgram } from "../src";
import { createPruningFixture, DAY } from "./helpers/pruning";

type Fixture = Awaited<ReturnType<typeof createPruningFixture>>;

async function addLock(fixture: Fixture, amount: BN) {
	const lock = await fixture.client.policyEngine.addLock({
		payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
		assetMint: fixture.assetMint, owner: fixture.sender.publicKey.toBase58(),
		amount, lockTime: new BN(0), reason: new BN(1), reasonString: "Independent lock",
	});
	await fixture.send(lock.ixs, [fixture.authority]);
}

describe("automatic issuance pruning", () => {
	test.each([
		{ classification: "non-US", mapping: 0, retained: [0, 2] },
		{ classification: "US", mapping: 11, retained: [0, 2, 3] },
	])("uses the current $classification holding period and cluster clock while preserving locks and rent", async ({ mapping, retained }) => {
		// A longer initial period creates history that matures after a policy change.
		const fixture = await createPruningFixture({ us: 4 * DAY, nonUs: 4 * DAY });
		const now = await fixture.timestamp();
		await fixture.issue([now - DAY / 4, now - 3 * DAY, now + DAY, now - 3 * DAY / 2]);
		await addLock(fixture, new BN(1));
		await fixture.setPeriods({ us: 2 * DAY, nonUs: DAY });
		const mappingChange = await fixture.client.policyEngine.changeMapping({
			payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
			assetMint: fixture.assetMint, mappingSource: [1], mappingValue: [mapping],
		});
		await fixture.send(mappingChange.ixs, [fixture.authority]);
		const before = await fixture.readTracker();
		const accountsBefore = await fixture.snapshot();
		const payerBefore = await fixture.connection.getBalance(fixture.payer.publicKey);
		// Pruning must use cluster time, independently of this old issuance timestamp.
		const issuanceTime = now - 10 * DAY;
		const signature = await fixture.issue([issuanceTime]);
		const after = await fixture.readTracker();
		const { totalAmount: beforeAmount, ...beforeState } = before;
		const { totalAmount: afterAmount, ...afterState } = after;
		expect(afterAmount.eq(beforeAmount.add(before.issuances[0].amount))).toBe(true);
		expect(afterState).toEqual({
			...beforeState,
			issuances: retained.map(index => before.issuances[index]),
		});
		const accountsAfter = await fixture.snapshot();
		expect(accountsAfter[0].lamports).toBe(accountsBefore[0].lamports);
		expect(accountsAfter[0].data.length).toBe(accountsBefore[0].data.length);
		// Recipient accounts and policy counters are unaffected by another mint to an existing holder.
		expect(accountsAfter[1]).toEqual(accountsBefore[1]);
		expect(accountsAfter[3]).toEqual(accountsBefore[3]);
		expect(accountsAfter[5]).toEqual(accountsBefore[5]);
		const transaction = await fixture.connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
		expect(transaction?.meta?.err).toBeNull();
		expect(payerBefore - await fixture.connection.getBalance(fixture.payer.publicKey)).toBe(transaction!.meta!.fee);
		const token = getAssociatedTokenAddressSync(fixture.mint, fixture.sender.publicKey, false, TOKEN_2022_PROGRAM_ID);
		expect((await getAccount(fixture.connection, token, "confirmed", TOKEN_2022_PROGRAM_ID)).amount).toBe(BigInt(after.totalAmount.toString()));
		expect((await getMint(fixture.connection, fixture.mint, "confirmed", TOKEN_2022_PROGRAM_ID)).supply).toBe(BigInt(after.totalAmount.toString()));
	}, 90_000);

	test("skips matured new issuances with a zero period while preserving future records and account capacity", async () => {
		const fixture = await createPruningFixture({ us: 0, nonUs: 0 });
		const now = await fixture.timestamp();
		await fixture.issue([now - DAY]);
		const first = await fixture.readTracker();
		await fixture.issue([now + DAY]);
		const future = (await fixture.readTracker()).issuances[0];
		expect(future.issueTime.toNumber()).toBe(now + DAY);
		const capacity = await fixture.snapshot();
		await fixture.issue([now - DAY / 2, now - 2 * DAY]);
		const after = await fixture.readTracker();
		expect(after.issuances.map(issuance => issuance.issueTime.toNumber())).toEqual([now + DAY]);
		expect(after.totalAmount.eq(first.totalAmount.muln(4))).toBe(true);
		const accounts = await fixture.snapshot();
		expect(accounts[0].data.length).toBe(capacity[0].data.length);
		expect(accounts[0].lamports).toBe(capacity[0].lamports);
		await fixture.issue([now - 3 * DAY]);
		const reused = await fixture.snapshot();
		expect(reused[0].data.length).toBe(accounts[0].data.length);
		expect(reused[0].lamports).toBe(accounts[0].lamports);
	}, 90_000);

	test("skips a newly minted record at the zero-period cutoff without paying for account growth", async () => {
		const fixture = await createPruningFixture({ us: 0, nonUs: 0 });
		await fixture.setPeriods({ us: 0, nonUs: 0 }, true);
		const before = await fixture.snapshot();
		const payerBefore = await fixture.connection.getBalance(fixture.payer.publicKey);
		// Backdating is disabled, so effective issue time equals the instruction's clock:
		// with zero holding period it lies exactly on the cutoff.
		const signature = await fixture.issue([await fixture.timestamp() - DAY]);
		const tracker = await fixture.readTracker();
		expect(tracker.issuances).toHaveLength(0);
		expect(tracker.totalAmount.gtn(0)).toBe(true);
		const after = await fixture.snapshot();
		expect(after[0].data.length).toBe(before[0].data.length);
		expect(after[0].lamports).toBe(before[0].lamports);
		const transaction = await fixture.connection.getTransaction(signature, { commitment: "confirmed", maxSupportedTransactionVersion: 0 });
		expect(transaction?.meta?.err).toBeNull();
		expect(payerBefore - await fixture.connection.getBalance(fixture.payer.publicKey)).toBe(transaction!.meta!.fee);
		const token = getAssociatedTokenAddressSync(fixture.mint, fixture.sender.publicKey, false, TOKEN_2022_PROGRAM_ID);
		expect((await getAccount(fixture.connection, token, "confirmed", TOKEN_2022_PROGRAM_ID)).amount).toBe(BigInt(tracker.totalAmount.toString()));
		expect((await getMint(fixture.connection, fixture.mint, "confirmed", TOKEN_2022_PROGRAM_ID)).supply).toBe(BigInt(tracker.totalAmount.toString()));
	}, 90_000);

	test("normalizes the new timestamp before recording it when backdating is disabled", async () => {
		const fixture = await createPruningFixture({ us: 4 * DAY, nonUs: 4 * DAY });
		const now = await fixture.timestamp();
		await fixture.issue([now - 3 * DAY]);
		const before = await fixture.readTracker();
		await fixture.setPeriods({ us: DAY, nonUs: DAY }, true);
		await fixture.issue([now - 10 * DAY]);
		const after = await fixture.readTracker();
		expect(after.issuances).toHaveLength(1);
		expect(after.issuances[0].issueTime.toNumber()).toBeGreaterThanOrEqual(now);
		expect(after.issuances[0].issueTime.toNumber()).toBeLessThanOrEqual(await fixture.timestamp());
		expect(after.totalAmount.eq(before.totalAmount.add(after.issuances[0].amount))).toBe(true);
	}, 90_000);

	test("preserves holder counters when all old history is pruned and allows transfers of matured tokens", async () => {
		const fixture = await createPruningFixture({ us: 4 * DAY, nonUs: 4 * DAY });
		const counters = await fixture.client.policyEngine.changeCounters({
			payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(), assetMint: fixture.assetMint,
			removedCounters: Buffer.from([]), addedCounters: [{
				id: 0, value: new BN(0), identityFilter: { simple: [{ single: [{
					level: { level: [1] }, target: { receiver: {} }, mode: { include: {} },
				}] }] },
			}],
		});
		await fixture.send(counters.ixs, [fixture.authority]);
		const now = await fixture.timestamp();
		await fixture.issue([now - 3 * DAY, now - 2 * DAY]);
		const before = await fixture.readTracker();
		const explicitLock = new BN(1);
		await addLock(fixture, explicitLock);
		await fixture.setPeriods({ us: DAY, nonUs: DAY });
		const program = getPolicyEngineProgram(fixture.provider);
		const engineBefore = await program.account.policyEngineAccount.fetch(getPolicyEnginePda(fixture.assetMint));
		await fixture.issue([now]);
		const after = await fixture.readTracker();
		expect(after.issuances).toHaveLength(1);
		expect(after.locks).toHaveLength(1);
		const engineAfter = await program.account.policyEngineAccount.fetch(getPolicyEnginePda(fixture.assetMint));
		expect(engineAfter.counters).toEqual(engineBefore.counters);
		expect(engineAfter.counters[0].value.eqn(1)).toBe(true);
		const transferable = before.totalAmount.sub(explicitLock);
		const transfer = (amount: BN) => fixture.client.assetController.transfer({
			from: fixture.sender.publicKey.toBase58(), to: fixture.recipient.publicKey.toBase58(), assetMint: fixture.assetMint,
			amount, decimals: 0,
		});
		await expect(fixture.send(await transfer(transferable.addn(1)), [fixture.sender])).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("HoldUp")]) },
		});
		await fixture.send([ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 }), ...await transfer(transferable)], [fixture.sender]);
		expect((await fixture.readTracker()).totalAmount.eq(after.totalAmount.sub(transferable))).toBe(true);
		expect((await fixture.readTracker(fixture.recipient)).totalAmount.eq(transferable)).toBe(true);
	}, 90_000);

	test("rejects a negative holding period and rolls back the mint", async () => {
		const fixture = await createPruningFixture();
		await fixture.issue([await fixture.timestamp()]);
		await fixture.setPeriods({ us: DAY, nonUs: -1 });
		const before = await fixture.snapshot();
		await expect(fixture.issue([await fixture.timestamp()])).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("InvalidLockPeriod")]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);

	test("rolls back pruning and the mint if issuance policies reject the transaction", async () => {
		const fixture = await createPruningFixture({ us: 4 * DAY, nonUs: 4 * DAY });
		const now = await fixture.timestamp();
		await fixture.issue([now - 3 * DAY]);
		const tracker = await fixture.readTracker();
		const policies = await fixture.client.policyEngine.changeIssuancePolicies({
			payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(), assetMint: fixture.assetMint,
			issuancePolicies: { disallowBackdating: false, maxSupply: tracker.totalAmount, usLockPeriod: new BN(DAY), nonUsLockPeriod: new BN(DAY) },
		});
		await fixture.send(policies.ixs, [fixture.authority]);
		const before = await fixture.snapshot();
		await expect(fixture.issue([now])).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("MaxSupplyExceeded")]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);
});
