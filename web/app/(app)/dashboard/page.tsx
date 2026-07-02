"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ADDRESSES, cusdt, Invoice, isConfigured } from "@/lib/contracts";
import { invoicesFor } from "@/lib/data";
import { useWallet } from "@/lib/wallet";
import { InvoiceCard } from "@/components/InvoiceCard";
import { Reveal } from "@/components/Reveal";

export default function Dashboard() {
  const { address, provider, getSigner, connect, wrongNetwork, switchToSepolia } = useWallet();
  const [tab, setTab] = useState<"billed" | "issued">("billed");
  const [issued, setIssued] = useState<Invoice[]>([]);
  const [billed, setBilled] = useState<Invoice[]>([]);
  const [balHandle, setBalHandle] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [fauceting, setFauceting] = useState(false);

  const load = useCallback(async () => {
    if (!provider || !address || !isConfigured()) return;
    setLoading(true);
    try {
      const { issued, billed } = await invoicesFor(provider, address);
      setIssued(issued);
      setBilled(billed);
      setBalHandle(await cusdt(provider).confidentialBalanceOf(address));
    } finally {
      setLoading(false);
    }
  }, [provider, address]);

  useEffect(() => {
    load();
  }, [load]);

  async function faucet() {
    setFauceting(true);
    try {
      const signer = await getSigner();
      await (await cusdt(signer).faucet(1000_000000n)).wait();
      await load();
    } finally {
      setFauceting(false);
    }
  }

  if (!isConfigured()) {
    return (
      <div className="card">
        <h1 className="font-display text-xl">Cifra isn’t configured yet</h1>
        <p className="mt-2 text-sm text-paper-dim">
          Deploy the contracts (<code className="text-gold">npm run deploy:sepolia</code>) and set the{" "}
          <code className="text-gold">NEXT_PUBLIC_*</code> addresses in <code>web/.env.local</code>.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
        <div>
          <h1 className="font-display text-3xl font-light tracking-tight">Confidential invoices</h1>
          <p className="mt-1 max-w-md text-sm text-paper-dim">
            Amounts are encrypted on-chain. Only you and your counterparty can reveal them — the pool
            can finance an invoice it can never read.
          </p>
        </div>
        <Link href="/create" className="btn-primary self-start">
          + New invoice
        </Link>
      </section>

      {!address ? (
        <div className="card flex items-center justify-between">
          <span className="text-sm text-paper-dim">Connect your wallet to see your invoices.</span>
          <button className="btn-primary" onClick={connect}>
            Connect wallet
          </button>
        </div>
      ) : wrongNetwork ? (
        <div className="card flex items-center justify-between">
          <span className="text-sm text-crimson">You’re on the wrong network.</span>
          <button className="btn-primary" onClick={switchToSepolia}>
            Switch to Sepolia
          </button>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="label">Your cUSDT balance</div>
              {balHandle ? (
                <Reveal handle={balHandle} contractAddress={ADDRESSES.cUSDT} className="text-xl" />
              ) : (
                <span className="text-paper-faint">—</span>
              )}
            </div>
            <button className="btn-ghost" onClick={faucet} disabled={fauceting}>
              {fauceting ? "Minting…" : "Get 1,000 test cUSDT"}
            </button>
          </div>

          <div className="flex gap-1 border border-rule bg-ink-2 p-1 text-[11px] uppercase tracking-[0.14em]">
            {(["billed", "issued"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`flex-1 px-3 py-2 ${tab === t ? "bg-ink-3 text-paper" : "text-paper-faint hover:text-paper"}`}
              >
                {t === "billed" ? `Billed to me (${billed.length})` : `Issued by me (${issued.length})`}
              </button>
            ))}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            {(tab === "billed" ? billed : issued).map((inv) => (
              <InvoiceCard key={inv.id} inv={inv} role={tab === "billed" ? "payer" : "issuer"} onChanged={load} />
            ))}
          </div>

          {!loading && (tab === "billed" ? billed : issued).length === 0 && (
            <div className="card text-center text-sm text-paper-dim">
              No invoices here yet.{" "}
              {tab === "issued" && (
                <Link href="/create" className="text-gold underline">
                  Create one
                </Link>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
