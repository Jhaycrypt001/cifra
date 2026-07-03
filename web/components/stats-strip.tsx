"use client";

import { useEffect, useState } from "react";
import { ethers } from "ethers";
import { ADDRESSES, REGISTRY_ABI, POOL_ABI } from "@/lib/contracts";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";

/** Reads real public counts from the chain (no wallet needed) for a credibility band. */
export function StatsStrip() {
  const [invoices, setInvoices] = useState<number | null>(null);
  const [advance, setAdvance] = useState<number | null>(null);
  const [fee, setFee] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const p = new ethers.JsonRpcProvider(RPC);
        const reg = new ethers.Contract(ADDRESSES.registry, REGISTRY_ABI, p);
        const pl = new ethers.Contract(ADDRESSES.pool, POOL_ABI, p);
        const [n, a, f] = await Promise.all([reg.nextId(), pl.advanceBps(), pl.feeBps()]);
        if (!cancelled) {
          setInvoices(Number(n));
          setAdvance(Number(a));
          setFee(Number(f));
        }
      } catch {
        /* explorer/RPC hiccup — leave placeholders */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const stats = [
    { v: invoices !== null ? invoices.toLocaleString() : "—", l: "Invoices on-chain" },
    { v: advance !== null ? `${(advance / 100).toFixed(0)}%` : "85%", l: "Advance rate" },
    { v: fee !== null ? `${(fee / 100).toFixed(2)}%` : "2%", l: "LP fee / invoice" },
    { v: "100%", l: "Amounts encrypted" },
    { v: "3", l: "Verified contracts" },
  ];

  return (
    <div className="border-y border-rule bg-ink-2/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 divide-rule sm:grid-cols-5">
        {stats.map((s) => (
          <div key={s.l} className="border-rule px-5 py-7 text-center [&:not(:last-child)]:border-r [&:not(:nth-child(2))]:max-sm:border-b">
            <div className="num text-2xl text-gold sm:text-3xl">{s.v}</div>
            <div className="mt-1 text-[10px] uppercase tracking-[0.16em] text-paper-faint">{s.l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
