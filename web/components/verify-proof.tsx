"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { ShieldCheck, ShieldX } from "lucide-react";
import { ADDRESSES, REGISTRY_ABI } from "@/lib/contracts";
import { publicDecryptReadonly } from "@/lib/fhevm";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

export function VerifyProof() {
  const sp = useSearchParams();
  const issuer = sp.get("a") ?? "";
  const handle = sp.get("h") ?? "";
  const [threshold, setThreshold] = useState(sp.get("t") ?? "");
  const [state, setState] = useState<"loading" | "ok" | "error">("loading");
  const [verified, setVerified] = useState(false);
  const [onChain, setOnChain] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    (async () => {
      if (!ethers.isAddress(issuer) || !/^0x[0-9a-fA-F]{64}$/.test(handle)) {
        setState("error");
        setErr("This verification link is missing or malformed.");
        return;
      }
      try {
        // 1) Cross-check the authoritative on-chain event (issuer + threshold for this handle).
        try {
          const p = new ethers.JsonRpcProvider(RPC);
          const reg = new ethers.Contract(ADDRESSES.registry, REGISTRY_ABI, p);
          const evs = await reg.queryFilter(reg.filters.IncomeProofRequested(issuer));
          const match = evs.find(
            (e: any) => (e.args?.resultHandle ?? "").toLowerCase() === handle.toLowerCase(),
          );
          if (match) {
            setThreshold((Number((match as any).args.threshold) / 1e6).toString());
            setOnChain(true);
          }
        } catch {
          /* RPC hiccup: fall back to the URL threshold */
        }

        // 2) Publicly decrypt the KMS-signed boolean (no wallet required). Guard against a slow
        //    or unreachable relayer so the page never hangs forever.
        const timeout = new Promise<never>((_, rej) =>
          setTimeout(() => rej(new Error("Verification timed out. The relayer may be busy — refresh to retry.")), 45000),
        );
        const res = (await Promise.race([publicDecryptReadonly([handle]), timeout])) as Record<string, unknown>;
        const raw = res[handle] ?? res[handle.toLowerCase()] ?? Object.values(res)[0];
        setVerified(Boolean(raw));
        setState("ok");
      } catch (e: any) {
        setState("error");
        setErr(e?.shortMessage || e?.message || "Could not verify this proof on-chain.");
      }
    })();
  }, [issuer, handle]);

  const short = (a: string) => `${a.slice(0, 8)}…${a.slice(-6)}`;
  const dollars = threshold ? `$${Number(threshold).toLocaleString()}` : "the stated amount";

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center px-5 py-16">
      <div className="tessellation pointer-events-none absolute inset-0" />
      <Link href="/" className="relative z-10 mb-8 flex items-center gap-2.5">
        <span className="grid h-7 w-7 place-items-center bg-gold text-ink">◈</span>
        <span className="font-display text-lg tracking-tight">Cifra</span>
      </Link>

      <div className="relative z-10 w-full max-w-md border border-rule bg-ink-2 p-8 text-center">
        <div className="label mb-6">Proof of income · verification</div>

        {state === "loading" && (
          <p className="text-sm text-paper-dim">Verifying the proof on-chain…</p>
        )}

        {state === "error" && (
          <div>
            <ShieldX className="mx-auto h-10 w-10 text-crimson" />
            <p className="mt-4 text-sm text-paper-dim">{err}</p>
          </div>
        )}

        {state === "ok" && (
          <div>
            {verified ? (
              <>
                <ShieldCheck className="mx-auto h-12 w-12 text-gold" />
                <h1 className="mt-4 font-display text-2xl">Verified</h1>
                <p className="mt-2 text-sm text-paper-dim">
                  This address&apos;s income{" "}
                  <span className="text-paper">exceeds {dollars}</span>. The exact amount was never
                  revealed.
                </p>
              </>
            ) : (
              <>
                <ShieldX className="mx-auto h-12 w-12 text-paper-faint" />
                <h1 className="mt-4 font-display text-2xl">Not verified</h1>
                <p className="mt-2 text-sm text-paper-dim">
                  The proof does not confirm income above {dollars}.
                </p>
              </>
            )}

            <div className="mt-6 space-y-2 border-t border-rule pt-5 text-left text-[12px]">
              <Row label="Address" value={<span className="num">{short(issuer)}</span>} />
              <Row label="Threshold" value={<span className="num">{dollars}</span>} />
              <Row
                label="Source"
                value={
                  <span className={onChain ? "text-gold" : "text-paper-faint"}>
                    {onChain ? "On-chain event confirmed" : "URL parameters"}
                  </span>
                }
              />
              <Row label="Decryption" value={<span className="text-gold">KMS-signed (Zama)</span>} />
            </div>

            <a
              href={`https://sepolia.etherscan.io/address/${ADDRESSES.registry}#events`}
              target="_blank"
              rel="noreferrer"
              className="mt-6 inline-block text-[11px] uppercase tracking-[0.16em] text-paper-faint underline decoration-dotted hover:text-gold"
            >
              Inspect on Etherscan
            </a>
          </div>
        )}
      </div>

      <p className="relative z-10 mt-6 max-w-sm text-center text-[11px] text-paper-faint">
        This result is decrypted and signed by Zama&apos;s KMS on a public blockchain. Cifra cannot
        fake it, and the real income figure stays encrypted.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-paper-faint">{label}</span>
      {value}
    </div>
  );
}
