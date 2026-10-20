import { BN } from "@coral-xyz/anchor";
import { type Connection } from "@solana/web3.js";
import { describe, expect, test } from "vitest";
import { getPolicyEnginePda, policyEngineProgramId } from "../src";
import { createPruningFixture, DAY } from "./helpers/pruning";

async function eventCpiCount(connection: Connection, signature: string) {
	const transaction = await connection.getParsedTransaction(signature, {
		commitment: "confirmed", maxSupportedTransactionVersion: 0,
	});
	expect(transaction?.meta?.err).toBeNull();
	return (transaction!.meta!.innerInstructions ?? [])
		.flatMap(group => group.instructions)
		.filter(instruction => instruction.programId.equals(policyEngineProgramId)).length;
}

describe("prune issuances", () => {
	test.each([
		{ classification: "non-US", mapping: 0, retained: [0, 2] },
		{ classification: "US", mapping: 11, retained: [0, 2, 3] },
	])("uses the current $classification period and preserves balances and locks", async ({ mapping, retained }) => {
		const fixture = await createPruningFixture({ us: 2 * DAY, nonUs: DAY });
		const now = await fixture.timestamp();
		// Unsorted, with wide margins around the cutoff; Rust tests cover exact equality.
		await fixture.issue([now - DAY / 4, now - 3 * DAY, now + DAY, now - 3 * DAY / 2]);
		const changeMapping = await fixture.client.policyEngine.changeMapping({
			payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
			assetMint: fixture.assetMint, mappingSource: [1], mappingValue: [mapping],
		});
		await fixture.send(changeMapping.ixs, [fixture.authority]);
		const lock = await fixture.client.policyEngine.addLock({
			payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(),
			assetMint: fixture.assetMint, owner: fixture.sender.publicKey.toBase58(),
			amount: new BN(1), lockTime: new BN(0), reason: new BN(1), reasonString: "Independent lock",
		});
		await fixture.send(lock.ixs, [fixture.authority]);
		const before = await fixture.readTracker();
		const accountsBefore = await fixture.snapshot();
		const instructions = await fixture.pruningInstructions();
		expect(instructions.ixs[0].keys.filter(key => key.isWritable).map(key => key.pubkey.toBase58()))
			.toEqual([fixture.trackerAddress().toBase58()]);
		const pruned = await fixture.prune();
		expect(await eventCpiCount(fixture.connection, pruned)).toBe(1);
		expect(await fixture.readTracker()).toEqual({ ...before, issuances: retained.map(index => before.issuances[index]) });
		const accountsAfter = await fixture.snapshot();
		expect(accountsAfter.slice(1)).toEqual(accountsBefore.slice(1));
		expect(accountsAfter[0].lamports).toBe(accountsBefore[0].lamports);
		expect(accountsAfter[0].data.length).toBe(accountsBefore[0].data.length);
		const noOp = await fixture.prune();
		expect(await eventCpiCount(fixture.connection, noOp)).toBe(0);
		expect(await fixture.snapshot()).toEqual(accountsAfter);
	}, 90_000);

	test("rejects an identity owner who is not the policy-engine authority", async () => {
		const fixture = await createPruningFixture();
		await fixture.issue([await fixture.timestamp() - 2 * DAY]);
		const before = await fixture.snapshot();
		const instructions = await fixture.pruningInstructions(fixture.sender);
		await expect(fixture.send(instructions.ixs, [fixture.sender])).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("UnauthorizedSigner")]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);

	test.each(["tracker", "policy engine"])("rejects a substituted %s account", async (account) => {
		const fixture = await createPruningFixture();
		await fixture.issue([await fixture.timestamp() - 2 * DAY]);
		const original = account === "tracker" ? fixture.trackerAddress() : getPolicyEnginePda(fixture.assetMint);
		let replacement = fixture.trackerAddress(fixture.recipient);
		if (account === "policy engine") {
			// Keep the authority valid so this tests mint binding specifically.
			const otherRegistry = await fixture.client.assetController.setupNewRegistry({
				payer: fixture.payer.publicKey.toBase58(), authority: fixture.authority.publicKey.toBase58(), decimals: 0,
				name: "Other Asset", symbol: "OTHER", uri: "https://example.com/other.json",
			});
			await fixture.send(otherRegistry.ixs, otherRegistry.signers);
			replacement = getPolicyEnginePda(otherRegistry.signers[0].publicKey.toBase58());
		}
		const instructions = await fixture.pruningInstructions();
		const key = instructions.ixs[0].keys.find(key => key.pubkey.equals(original));
		expect(key).toBeDefined();
		key!.pubkey = replacement;
		const before = await fixture.snapshot();
		await expect(fixture.send(instructions.ixs, [fixture.authority])).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringMatching(/Constraint(Seeds|HasOne)/)]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);

	test("rejects a negative effective period without modifying accounts", async () => {
		const fixture = await createPruningFixture({ us: DAY, nonUs: -1 });
		await fixture.issue([await fixture.timestamp() - 2 * DAY]);
		const before = await fixture.snapshot();
		await expect(fixture.prune()).rejects.toMatchObject({
			transactionError: { logs: expect.arrayContaining([expect.stringContaining("InvalidLockPeriod")]) },
		});
		expect(await fixture.snapshot()).toEqual(before);
	}, 90_000);
});
