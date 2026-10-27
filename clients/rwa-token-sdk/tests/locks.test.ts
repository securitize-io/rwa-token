import { BN } from "@coral-xyz/anchor";
import { describe, expect, test } from "vitest";
import { createPruningFixture, DAY } from "./helpers/pruning";

type Fixture = Awaited<ReturnType<typeof createPruningFixture>>;

async function addLock(fixture: Fixture, reasonString: string) {
	const instructions = await fixture.client.policyEngine.addLock({
		payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
		assetMint: fixture.assetMint, owner: fixture.sender.publicKey.toBase58(),
		amount: new BN(1), lockTime: new BN(0), reason: new BN(1), reasonString,
	});
	return fixture.send(instructions.ixs, [fixture.authority]);
}

async function removeLock(fixture: Fixture, index: number) {
	const instructions = await fixture.client.policyEngine.removeLock({
		payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
		assetMint: fixture.assetMint, owner: fixture.sender.publicKey.toBase58(), index,
	});
	return fixture.send(instructions.ixs, [fixture.authority]);
}

async function trackerAllocation(fixture: Fixture) {
	const account = await fixture.connection.getAccountInfo(fixture.trackerAddress(), "confirmed");
	if (account === null) throw new Error("Tracker account is missing");
	return { bytes: account.data.length, lamports: account.lamports };
}

async function expectFeeOnly(fixture: Fixture, action: () => Promise<string>) {
	const before = await fixture.connection.getBalance(fixture.payer.publicKey);
	const signature = await action();
	const transaction = await fixture.connection.getTransaction(signature, {
		commitment: "confirmed", maxSupportedTransactionVersion: 0,
	});
	expect(transaction?.meta?.err).toBeNull();
	expect(before - await fixture.connection.getBalance(fixture.payer.publicKey)).toBe(transaction!.meta!.fee);
}

describe("tracker locks", () => {
	test("preserves pruned allocation and rent across lock additions, removals and later issuances", async () => {
		const fixture = await createPruningFixture({ us: 4 * DAY, nonUs: 4 * DAY });
		const now = await fixture.timestamp();
		for (let batch = 0; batch < 3; batch++) {
			// Distinct timestamps keep each batch's transaction signature unique.
			await fixture.issue([now + batch, now - 3 * DAY + batch, now - 3 * DAY + batch, now - 3 * DAY + batch]);
		}
		const allocation = await trackerAllocation(fixture);
		expect(allocation.bytes).toBe(281);
		await fixture.setPeriods({ us: DAY, nonUs: DAY });
		await fixture.prune();
		expect((await fixture.readTracker()).issuances).toHaveLength(3);

		await expectFeeOnly(fixture, () => addLock(fixture, ""));
		expect(await trackerAllocation(fixture)).toEqual(allocation);
		expect((await fixture.readTracker()).locks).toHaveLength(1);
		await expectFeeOnly(fixture, () => removeLock(fixture, 0));
		expect(await trackerAllocation(fixture)).toEqual(allocation);
		expect((await fixture.readTracker()).locks).toHaveLength(0);
		await expectFeeOnly(fixture, () => addLock(fixture, "x".repeat(64)));
		await expectFeeOnly(fixture, () => fixture.issue([now]));
		expect(await trackerAllocation(fixture)).toEqual(allocation);
		expect((await fixture.readTracker()).issuances).toHaveLength(4);

		// Once retained state exceeds the preserved capacity, adding a lock must grow it.
		await addLock(fixture, "é".repeat(32));
		const grown = await trackerAllocation(fixture);
		expect(grown.bytes).toBe(337);
		expect(grown.lamports).toBe(await fixture.connection.getMinimumBalanceForRentExemption(grown.bytes));
		expect(grown.lamports).toBeGreaterThan(allocation.lamports);
		await expectFeeOnly(fixture, () => removeLock(fixture, 0));
		expect(await trackerAllocation(fixture)).toEqual(grown);
		expect((await fixture.readTracker()).locks.map(lock => lock.reasonString)).toEqual(["é".repeat(32)]);
	}, 90_000);

	test("rejects oversized reasons by UTF-8 byte length without changing tracker state or rent", async () => {
		const fixture = await createPruningFixture();
		for (const reason of ["x".repeat(65), "é".repeat(33), "x".repeat(128)]) {
			const before = await fixture.snapshot();
			await expect(addLock(fixture, reason)).rejects.toMatchObject({
				transactionError: { logs: expect.arrayContaining([expect.stringContaining("InvalidInstructionData")]) },
			});
			expect(await fixture.snapshot()).toEqual(before);
		}
	}, 90_000);

	test("returns LockIndexNotFound for an empty tracker without reallocating", async () => {
		const fixture = await createPruningFixture();
		const before = await fixture.snapshot();
		await expect(removeLock(fixture, 0)).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("LockIndexNotFound")]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);
});
