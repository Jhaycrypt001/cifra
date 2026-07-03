"use client";

import type { FhevmInstance } from "@zama-fhe/relayer-sdk/web";
import { ethers } from "ethers";
import { ADDRESSES } from "./contracts";

const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

let instancePromise: Promise<FhevmInstance> | null = null;

/** Lazily create a single Relayer SDK instance bound to the injected wallet provider. */
export async function getFhevm(): Promise<FhevmInstance> {
  if (!instancePromise) {
    instancePromise = (async () => {
      const { createInstance, SepoliaConfig, initSDK } = await import("@zama-fhe/relayer-sdk/web");
      // Loads the TFHE WASM module (no-op if already initialized).
      if (typeof initSDK === "function") await initSDK();
      const eth = (window as any).ethereum;
      if (!eth) throw new Error("No wallet provider found");
      return createInstance({ ...SepoliaConfig, network: eth });
    })();
  }
  return instancePromise;
}

/** Encrypt a single uint64 as an external input bound to (contract, user). */
export async function encryptAmount(contractAddress: string, userAddress: string, amount: bigint) {
  const fhevm = await getFhevm();
  // The Relayer SDK requires EIP-55 checksummed addresses.
  const input = fhevm.createEncryptedInput(ethers.getAddress(contractAddress), ethers.getAddress(userAddress));
  input.add64(amount);
  const enc = await input.encrypt();
  return {
    handle: ethers.hexlify(enc.handles[0]),
    proof: ethers.hexlify(enc.inputProof),
  };
}

// --- User decryption with a cached keypair + EIP-712 signature ---------------

type DecryptSession = {
  privateKey: string;
  publicKey: string;
  signature: string;
  startTimestamp: number;
  durationDays: number;
  contracts: string[];
};

let session: DecryptSession | null = null;

/**
 * Establishes (or reuses) a user-decryption session: generates an ephemeral keypair and asks the
 * wallet to sign an EIP-712 authorizing decryption for the app's contracts for `durationDays`.
 */
export async function ensureDecryptSession(signer: ethers.Signer, userAddress: string): Promise<DecryptSession> {
  const contracts = [ADDRESSES.registry, ADDRESSES.pool, ADDRESSES.cUSDT]
    .filter((a) => ethers.isAddress(a))
    .map((a) => ethers.getAddress(a));
  const now = Math.floor(Date.now() / 1000);

  if (session && session.startTimestamp + session.durationDays * 86400 - 3600 > now) {
    return session;
  }

  const fhevm = await getFhevm();
  const { publicKey, privateKey } = fhevm.generateKeypair();
  const durationDays = 7;
  // Backdate 5 min: the relayer rejects any startTimestamp that lands in its (clock-skewed)
  // future with a `requestValidity` 400. Verified against live Sepolia.
  const startTimestamp = now - 300;
  const eip712 = fhevm.createEIP712(publicKey, contracts, startTimestamp, durationDays);

  const signature = await signer.signTypedData(
    eip712.domain as ethers.TypedDataDomain,
    { UserDecryptRequestVerification: [...eip712.types.UserDecryptRequestVerification] } as any,
    eip712.message as Record<string, any>,
  );

  session = { privateKey, publicKey, signature, startTimestamp, durationDays, contracts };
  return session;
}

/** Decrypt a single ciphertext handle that `userAddress` is authorized to read. */
export async function decryptOne(
  signer: ethers.Signer,
  userAddress: string,
  contractAddress: string,
  handle: string,
): Promise<bigint> {
  if (!handle || handle === ZERO_HANDLE) return 0n;
  const fhevm = await getFhevm();
  const s = await ensureDecryptSession(signer, userAddress);
  const results = await fhevm.userDecrypt(
    [{ handle, contractAddress: ethers.getAddress(contractAddress) }],
    s.privateKey,
    s.publicKey,
    s.signature,
    s.contracts,
    ethers.getAddress(userAddress),
    s.startTimestamp,
    s.durationDays,
  );
  return BigInt((results as Record<string, any>)[handle]);
}

export function resetDecryptSession() {
  session = null;
}

function unwrapClear(res: any): Record<string, unknown> {
  return (res?.clearValues ?? res) as Record<string, unknown>;
}

/** Publicly decrypt handles that were made publicly decryptable on-chain (e.g. a proof boolean). */
export async function publicDecrypt(handles: string[]): Promise<Record<string, unknown>> {
  const fhevm = await getFhevm();
  return unwrapClear(await fhevm.publicDecrypt(handles));
}

// Wallet-less instance for public verification (a lender opens /verify with no wallet).
let readonlyPromise: Promise<FhevmInstance> | null = null;
async function getFhevmReadonly(): Promise<FhevmInstance> {
  if (!readonlyPromise) {
    readonlyPromise = (async () => {
      const { createInstance, SepoliaConfig, initSDK } = await import("@zama-fhe/relayer-sdk/web");
      if (typeof initSDK === "function") await initSDK();
      const rpc = process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
      return createInstance({ ...SepoliaConfig, network: rpc });
    })();
  }
  return readonlyPromise;
}

/** Public decryption without a connected wallet (used by the /verify page). */
export async function publicDecryptReadonly(handles: string[]): Promise<Record<string, unknown>> {
  const fhevm = await getFhevmReadonly();
  return unwrapClear(await fhevm.publicDecrypt(handles));
}
