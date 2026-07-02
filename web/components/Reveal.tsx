"use client";

import { useState } from "react";
import { useWallet } from "@/lib/wallet";
import { decryptOne } from "@/lib/fhevm";
import { fmtUSD } from "@/lib/format";

/**
 * Shows a ciphertext as "•••••" until the authorized user clicks to decrypt it locally.
 * `contractAddress` is the contract that produced/holds the handle (for ACL).
 */
export function Reveal({
  handle,
  contractAddress,
  className = "",
}: {
  handle: string;
  contractAddress: string;
  className?: string;
}) {
  const { address, getSigner } = useWallet();
  const [value, setValue] = useState<bigint | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reveal() {
    if (!address) return;
    setBusy(true);
    setErr(null);
    try {
      const signer = await getSigner();
      const v = await decryptOne(signer, address, contractAddress, handle);
      setValue(v);
    } catch (e: any) {
      setErr(e?.shortMessage || e?.message || "Decrypt failed");
    } finally {
      setBusy(false);
    }
  }

  if (value !== null) {
    return <span className={`num animate-reveal-pop font-semibold text-emerald ${className}`}>{fmtUSD(value)}</span>;
  }

  return (
    <button
      onClick={reveal}
      disabled={busy || !address}
      className={`group inline-flex items-center gap-2 font-mono ${className}`}
      title="Decrypt locally (only you can)"
    >
      <span className="tracking-widest text-paper-faint">•••••</span>
      <span className="text-[11px] uppercase tracking-[0.14em] text-emerald underline decoration-dotted group-hover:text-emerald-soft">
        {busy ? "decrypting…" : err ? "retry" : "reveal"}
      </span>
    </button>
  );
}
