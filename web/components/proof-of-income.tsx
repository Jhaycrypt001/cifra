"use client";

import { useCallback, useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { ADDRESSES, registry } from "@/lib/contracts";
import { publicDecrypt } from "@/lib/fhevm";
import { toUnits } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Reveal } from "@/components/Reveal";

const ZERO_HANDLE = "0x0000000000000000000000000000000000000000000000000000000000000000";

/**
 * Proof of Income (selective disclosure): the issuer proves their encrypted lifetime income is
 * above a threshold. Only the yes/no boolean is made publicly decryptable; the real number stays
 * encrypted forever.
 */
export function ProofOfIncome() {
  const { address, provider, getSigner } = useWallet();
  const [incomeHandle, setIncomeHandle] = useState<string>("");
  const [threshold, setThreshold] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<{ threshold: string; verified: boolean } | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const loadIncome = useCallback(async () => {
    if (!provider || !address) return;
    try {
      setIncomeHandle(await registry(provider).incomeHandleOf(address));
    } catch {
      /* ignore */
    }
  }, [provider, address]);

  useEffect(() => {
    loadIncome();
  }, [loadIncome]);

  async function generate() {
    if (!address || Number(threshold) <= 0) return;
    setErr(null);
    setResult(null);
    setBusy("Generating…");
    try {
      const signer = await getSigner();
      const reg = registry(signer);
      const tx = await reg.proveIncomeAbove(toUnits(threshold));
      const receipt = await tx.wait();

      let handle: string | undefined;
      for (const log of receipt.logs) {
        try {
          const parsed = reg.interface.parseLog(log);
          if (parsed?.name === "IncomeProofRequested") handle = parsed.args.resultHandle as string;
        } catch {
          /* not our event */
        }
      }
      if (!handle) throw new Error("Proof result not found");

      setBusy("Decrypting proof…");
      const res = await publicDecrypt([handle]);
      setResult({ threshold, verified: Boolean(res[handle]) });
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Failed to generate proof");
    } finally {
      setBusy(null);
    }
  }

  const hasIncome = incomeHandle && incomeHandle !== ZERO_HANDLE;

  return (
    <div className="card">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-gold" />
        <h3 className="font-display text-lg">Proof of income</h3>
      </div>
      <p className="mt-1 text-sm text-paper-dim">
        Prove your income is above an amount without revealing the actual figure. A lender or
        landlord gets a verifiable yes/no; your real income stays encrypted.
      </p>

      {/* Your actual income (only you can decrypt it) */}
      <div className="mt-4 flex items-center justify-between border border-rule bg-ink-3/60 px-3.5 py-2.5">
        <span className="label mb-0">Your income so far</span>
        {hasIncome ? (
          <Reveal handle={incomeHandle} contractAddress={ADDRESSES.registry} />
        ) : (
          <span className="text-xs text-paper-faint">$0 — no settled invoices yet</span>
        )}
      </div>
      {!hasIncome && (
        <p className="mt-2 text-[11px] text-paper-faint">
          Income accrues when an invoice you issued gets paid. Create one, have it paid, then prove.
        </p>
      )}

      <div className="mt-4 flex gap-2">
        <input
          className="input num"
          type="number"
          min="0"
          placeholder="e.g. 5000"
          value={threshold}
          onChange={(e) => setThreshold(e.target.value)}
        />
        <button className="btn-primary shrink-0" onClick={generate} disabled={!!busy || Number(threshold) <= 0}>
          {busy ?? "Prove"}
        </button>
      </div>
      {err && <div className="mt-3 border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}
      {result && (
        <div className={`mt-4 border px-4 py-3 ${result.verified ? "border-gold/40 bg-gold/10" : "border-rule bg-ink-3"}`}>
          {result.verified ? (
            <p className="text-sm text-paper">
              <span className="font-semibold text-gold">✓ Verified.</span> Income exceeds{" "}
              <span className="num">${Number(result.threshold).toLocaleString()}</span> cUSDT. The exact amount
              was never revealed, and anyone can verify this proof on-chain.
            </p>
          ) : (
            <p className="text-sm text-paper-dim">
              Could not verify income above ${Number(result.threshold).toLocaleString()}. (Your income may be
              below this, or you have no settled invoices yet.)
            </p>
          )}
        </div>
      )}
    </div>
  );
}
