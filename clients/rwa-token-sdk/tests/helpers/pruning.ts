import { AnchorProvider, BN, Wallet } from "@coral-xyz/anchor";
import {
	createAssociatedTokenAccountIdempotentInstruction,
	getAssociatedTokenAddressSync,
	TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {
	ComputeBudgetProgram, Connection, Keypair, LAMPORTS_PER_SOL,
	sendAndConfirmTransaction, Transaction,
	type Signer, type TransactionInstruction,
} from "@solana/web3.js";
import "dotenv/config";
import { getPolicyEnginePda, getPolicyEngineProgram, getTrackerAccountPda, RwaClient } from "../../src";

export const DAY = 24 * 60 * 60;
const ISSUANCE_AMOUNT = 10;

/** Fresh accounts for the pruning tests; existing SDK fixtures remain independent. */
export async function createPruningFixture(periods = { us: DAY, nonUs: DAY }) {
	const connection = new Connection(process.env.RPC_URL ?? "http://localhost:8899", "confirmed");
	const payer = Keypair.generate();
	const authority = Keypair.generate();
	const sender = Keypair.generate();
	const recipient = Keypair.generate();
	const options = { commitment: "confirmed" as const, skipPreflight: false };
	const provider = new AnchorProvider(connection, new Wallet(payer), options);
	const client = new RwaClient({ connection, rpcUrl: connection.rpcEndpoint, confirmationOptions: options }, provider);
	const send = (instructions: TransactionInstruction[], signers: Signer[] = []) => sendAndConfirmTransaction(
		connection, new Transaction().add(...instructions), [payer, ...signers], options,
	);
	const budget = () => ComputeBudgetProgram.setComputeUnitLimit({ units: 1_400_000 });
	const airdrop = await connection.requestAirdrop(payer.publicKey, LAMPORTS_PER_SOL);
	const confirmation = await connection.confirmTransaction({ signature: airdrop, ...await connection.getLatestBlockhash() }, "confirmed");
	if (confirmation.value.err !== null) throw new Error(`Airdrop failed: ${JSON.stringify(confirmation.value.err)}`);
	const registry = await client.assetController.setupNewRegistry({
		payer: payer.publicKey.toBase58(), authority: authority.publicKey.toBase58(), decimals: 0,
		name: "Pruning Test", symbol: "PRUNE", uri: "https://example.com/pruning.json",
	});
	await send(registry.ixs, registry.signers);
	const mint = registry.signers[0].publicKey;
	const assetMint = mint.toBase58();
	for (const owner of [sender, recipient]) {
		const identity = await client.identityRegistry.setupUserIxns({
			payer: payer.publicKey.toBase58(), signer: authority.publicKey.toBase58(), owner: owner.publicKey.toBase58(),
			assetMint, levels: [1], expiry: [new BN(Math.floor(Date.now() / 1000) + DAY)], country: 1,
		});
		await send(identity.ixs, [authority, ...identity.signers]);
	}
	const setPeriods = async (periods: { us: number; nonUs: number }, disallowBackdating = false) => {
		const policies = await client.policyEngine.changeIssuancePolicies({
			payer: payer.publicKey.toBase58(), authority: authority.publicKey.toBase58(), assetMint,
			issuancePolicies: { disallowBackdating, maxSupply: new BN(0), usLockPeriod: new BN(periods.us), nonUsLockPeriod: new BN(periods.nonUs) },
		});
		await send(policies.ixs, [authority, ...policies.signers]);
	};
	await setPeriods(periods);
	const tokenAddress = (owner: Keypair) => getAssociatedTokenAddressSync(mint, owner.publicKey, false, TOKEN_2022_PROGRAM_ID);
	await send([sender, recipient].map(owner => createAssociatedTokenAccountIdempotentInstruction(
		payer.publicKey, tokenAddress(owner), owner.publicKey, mint, TOKEN_2022_PROGRAM_ID,
	)));
	const program = getPolicyEngineProgram(provider);
	const trackerAddress = (owner = sender) => getTrackerAccountPda(assetMint, owner.publicKey.toBase58());
	const readTracker = (owner = sender) => program.account.trackerAccount.fetch(trackerAddress(owner));
	const issue = async (timestamps: number[], owner = sender) => {
		const instructions = await Promise.all(timestamps.map(timestamp => client.assetController.issueTokenIxns({
			payer: payer.publicKey.toBase58(), authority: authority.publicKey.toBase58(), owner: owner.publicKey.toBase58(),
			assetMint, amount: new BN(ISSUANCE_AMOUNT), timestamp: new BN(timestamp),
		})));
		return send([budget(), ...instructions.flat()], [authority]);
	};
	const pruningInstructions = (signer = authority, owner = sender) => client.policyEngine.pruneIssuances({
		authority: signer.publicKey.toBase58(), assetMint, owner: owner.publicKey.toBase58(),
	});
	const prune = async () => send([budget(), ...(await pruningInstructions()).ixs], [authority]);
	const timestamp = async () => {
		const time = await connection.getBlockTime(await connection.getSlot("confirmed"));
		if (time === null) throw new Error("Confirmed block timestamp is unavailable");
		return time;
	};
	// Includes all mutable financial state except the fee payer's balance.
	const snapshot = async () => (await connection.getMultipleAccountsInfo([
		trackerAddress(), trackerAddress(recipient), tokenAddress(sender), tokenAddress(recipient), mint, getPolicyEnginePda(assetMint),
	], "confirmed")).map(account => {
		if (account === null) throw new Error("Test account is missing");
		return { owner: account.owner.toBase58(), lamports: account.lamports, data: account.data.toString("base64") };
	});
	return {
		connection, provider, client, payer, authority, sender, recipient, mint, assetMint,
		send, issue, pruningInstructions, prune, timestamp, readTracker, trackerAddress, snapshot, setPeriods,
	};
}
