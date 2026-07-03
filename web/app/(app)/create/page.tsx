"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { ADDRESSES, registry } from "@/lib/contracts";
import { encryptAmount } from "@/lib/fhevm";
import { toUnits } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { DueDatePicker } from "@/components/ui/due-date-picker";

export default function CreateInvoice() {
  const router = useRouter();
  const { address, getSigner, connect, wrongNetwork, switchToSepolia } = useWallet();
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState<Date | undefined>(undefined);
  const [memo, setMemo] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const valid = ethers.isAddress(payer) && Number(amount) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!valid || !address) return;
    try {
      const signer = await getSigner();

      setStep("Encrypting amount…");
      const { handle, proof } = await encryptAmount(ADDRESSES.registry, address, toUnits(amount));

      setStep("Creating invoice…");
      const dueTs = due ? Math.floor(due.getTime() / 1000) : 0;
      const tx = await registry(signer).createInvoice(payer, handle, proof, dueTs, memo || "Invoice");
      await tx.wait();

      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Failed to create invoice");
    } finally {
      setStep(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-light tracking-tight">New invoice</h1>
      <p className="mt-1 text-sm text-paper-dim">
        The amount is encrypted in your browser before it ever touches the chain. Only you and the
        payer will be able to reveal it.
      </p>

      {!address ? (
        <div className="card mt-8 flex items-center justify-between">
          <span className="text-sm text-paper-dim">Connect your wallet to issue an invoice.</span>
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
        <form onSubmit={submit} className="card mt-8 flex flex-col gap-5">
          <div>
            <label className="label">Bill to (payer address)</label>
            <input className="input num" placeholder="0x…" value={payer} onChange={(e) => setPayer(e.target.value)} />
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Amount (cUSDT)</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="0.01"
                placeholder="12400.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Due date</label>
              <DueDatePicker value={due} onChange={setDue} />
            </div>
          </div>
          <div>
            <label className="label">Memo (public)</label>
            <input
              className="input"
              placeholder="Design work, June"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {err && <div className="border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}

          <button className="btn-primary" disabled={!valid || !!step}>
            {step ?? "Create confidential invoice"}
          </button>
          <p className="text-center text-[11px] text-paper-faint">
            The chain will store only a ciphertext handle for the amount.
          </p>
        </form>
      )}
    </div>
  );
}
