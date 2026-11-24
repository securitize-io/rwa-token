import { AnchorProvider, BN, Wallet } from "@anchor-lang/core";
import { Connection, Keypair } from "@solana/web3.js";
import { afterEach, expect, test, vi } from "vitest";
import {
	assetControllerProgramId, generateOperationId, getAssetControllerAccount,
	getAssetControllerProgram, getPendingOperationPda, getProposeBurnIx, getProposeMintIx,
} from "../src";

// No validator, environment wallet, or airdrops: these tests exercise SDK encoding/decoding.
const wallet = new Wallet(Keypair.generate());
const provider = new AnchorProvider(new Connection("http://127.0.0.1:8899"), wallet, {});
const args = {
	assetMint: Keypair.generate().publicKey.toBase58(), payer: wallet.publicKey.toBase58(),
	authority: wallet.publicKey.toBase58(), owner: wallet.publicKey.toBase58(),
};

afterEach(() => vi.restoreAllMocks());

test("proposal builder preserves explicit IDs and rejects invalid lengths", async () => {
	const id = generateOperationId();
	expect(id).toHaveLength(32);
	const ix = await getProposeMintIx({ ...args, request: { id: Array.from(id), amount: new BN(1), issuanceTimestamp: new BN(0) } }, provider);
	expect(getAssetControllerProgram(provider).coder.instruction.decode(ix.data)?.data)
		.toMatchObject({ request: { id: Array.from(id) } });
	expect(() => getPendingOperationPda(args.assetMint, id.slice(0, 31))).toThrow("Expected exactly 32 bytes");
	await expect(getProposeMintIx({ ...args, request: { id: [1], amount: new BN(1), issuanceTimestamp: new BN(0) } }, provider)).rejects.toThrow("Expected exactly 32 bytes");
});

test("burn reason limits count UTF-8 bytes", async () => {
	const request = { id: Array.from(generateOperationId()), amount: new BN(1), reason: "é".repeat(128) };
	await expect(getProposeBurnIx({ ...args, request }, provider)).resolves.toBeDefined();
	await expect(getProposeBurnIx({ ...args, request: { ...request, reason: "é".repeat(129) } }, provider)).rejects.toThrow("256 UTF-8 bytes");
});

test.each([1, 2])("SDK reads padded V%i allocations without changing their version", async version => {
	const assetMint = Keypair.generate().publicKey;
	const data = Buffer.alloc(version === 1 ? 73 : 162);
	Buffer.from([70, 136, 149, 138, 12, 87, 52, 105, version]).copy(data);
	assetMint.toBuffer().copy(data, 9);
	wallet.publicKey.toBuffer().copy(data, 41);
	vi.spyOn(provider.connection, "getAccountInfo").mockResolvedValue({
		data: Buffer.concat([data, Buffer.alloc(89, 0xa5)]), owner: assetControllerProgramId,
		executable: false, lamports: 1, rentEpoch: 0,
	});
	const account = await getAssetControllerAccount(assetMint.toBase58(), provider);
	expect(account?.version).toBe(version);
	expect(account?.assetMint.equals(assetMint)).toBe(true);
	expect(account?.authority.equals(wallet.publicKey)).toBe(true);
	if (account?.version === 1) expect(account).not.toHaveProperty("caps");
	if (account?.version === 2) expect(account.throttle.enabled).toBe(false);
});
