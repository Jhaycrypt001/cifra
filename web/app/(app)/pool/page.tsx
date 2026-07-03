"use client";

import { useCallback, useEffect, useState } from "react";
import { ADDRESSES, cusdt, pool } from "@/lib/contracts";
import { encryptAmount } from "@/lib/fhevm";
import { toUnits } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Reveal } from "@/components/Reveal";

const OPERATOR_UNTIL = 4_000_000_000;

export default function PoolPage() {
  const { address, provider, getSigner, connect, wrongNetwork, switchToSepolia } = useWallet();
  const [feeBps, setFeeBps] = useState<number | null>(null);
  const [depHandle, setDepHandle] = useState("");
  const [amount, setAmount] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!provider || !address) return;
    try {
      setFeeBps(Number(await pool(provider).feeBps()));
      setDepHandle(await pool(provider).depositOf(address));
    } catch {
      /* not configured / no deposit yet */
    }
  }, [provider, address]);

  useEffect(() => {
    load();
  }, [load]);

  async function act(kind: "deposit" | "withdraw") {
    setErr(null);
    if (!address || Number(amount) <= 0) return;
    try {
      const signer = await getSigner();
      if (kind === "deposit") {
        const token = cusdt(signer);
        if (!(await token.isOperator(address, ADDRESSES.pool))) {
          setStep("Authorizing pool…");
          await (await token.setOperator(ADDRESSES.pool, OPERATOR_UNTIL)).wait();
        }
      }
      setStep("Encrypting…");
      const { handle, proof } = await encryptAmount(ADDRESSES.pool, address, toUnits(amount));
      setStep(kind === "deposit" ? "Depositing…" : "Withdrawing…");
      const p = pool(signer);
      await (await (kind === "deposit" ? p.deposit(handle, proof) : p.withdraw(handle, proof))).wait();
      setAmount("");
      await load();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Transaction failed");
    } finally {
      setStep(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-light tracking-tight">Financing pool</h1>
      <p className="mt-1 text-sm text-paper-dim">
        Provide cUSDT liquidity. The pool advances cash on invoices it can’t read and earns the
        discount fee{feeBps !== null ? ` (currently ${(feeBps / 100).toFixed(2)}%)` : ""} when they settle.
      </p>

      {!address ? (
        <div className="card mt-8 flex items-center justify-between">
          <span className="text-sm text-paper-dim">Connect your wallet to provide liquidity.</span>
          <button className="btn-primary" onClick={connect}>
            Connect wallet
          </button>
        </div>
      ) : wrongNetwork ? (
        <div className="card mt-8 flex items-center justify-between">
          <span className="text-sm text-crimson">Wrong network.</span>
          <button className="btn-primary" onClick={switchToSepolia}>
            Switch to Sepolia
          </button>
        </div>
      ) : (
        <>
          <div className="card mt-8">
            <div className="label">Your deposit</div>
            {depHandle ? (
              <Reveal handle={depHandle} contractAddress={ADDRESSES.pool} className="text-xl" />
            ) : (
              <span className="text-paper-faint">N/A</span>
            )}
          </div>

          <div className="card mt-4 flex flex-col gap-4">
            <div>
              <label className="label">Amount (cUSDT)</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="0.01"
                placeholder="5000.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            {err && <div className="border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}
            <div className="flex gap-2">
              <button className="btn-primary flex-1" onClick={() => act("deposit")} disabled={!!step || Number(amount) <= 0}>
                {step ?? "Deposit"}
              </button>
              <button className="btn-ghost flex-1" onClick={() => act("withdraw")} disabled={!!step || Number(amount) <= 0}>
                Withdraw
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
