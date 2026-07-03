"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

const CONTRACTS = [
  { label: "cUSDT (ERC-7984)", addr: "0x6841DEA24De243d70240a7EEDbE3f08Ce6F45c7c" },
  { label: "InvoiceRegistry", addr: "0x4A4D2123A5F2C56ca9eafD31116412140A8A5EAB" },
  { label: "FinancingPool", addr: "0x3f07a683113F65b993CbCbc6Ea17Ca4107D185A5" },
];

const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`;

function Ext({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 text-paper-dim transition-colors hover:text-gold"
    >
      {children}
      <ArrowUpRight className="h-3 w-3 opacity-60" />
    </a>
  );
}

export function SiteFooter() {
  return (
    <footer className="relative border-t border-rule pb-24 sm:pb-0">
      <div className="tessellation pointer-events-none absolute inset-0 opacity-40" />
      <div className="relative z-10 mx-auto max-w-6xl px-5 py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand */}
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="grid h-7 w-7 place-items-center bg-gold text-ink">◈</span>
              <span className="font-display text-lg tracking-tight">Cifra</span>
            </div>
            <p className="mt-4 max-w-xs text-sm text-paper-faint">
              Confidential invoicing with instant financing. Amounts encrypted end-to-end on a
              public chain.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <span className="chip border-gold/30 text-gold">Sepolia · Live</span>
              <span className="chip border-rule text-paper-faint">ERC-7984</span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h4 className="label mb-4">Product</h4>
            <ul className="space-y-2.5 text-sm text-paper-dim">
              <li><a href="#how" className="transition-colors hover:text-gold">How it works</a></li>
              <li><a href="#why" className="transition-colors hover:text-gold">Why FHE</a></li>
              <li><a href="#composable" className="transition-colors hover:text-gold">Financing</a></li>
              <li><Link href="/dashboard" className="transition-colors hover:text-gold">Launch app</Link></li>
            </ul>
          </div>

          {/* Protocol */}
          <div>
            <h4 className="label mb-4">Protocol</h4>
            <ul className="space-y-2.5 text-sm">
              <li><Ext href="https://www.zama.org/">Zama Protocol</Ext></li>
              <li><Ext href="https://docs.zama.org/protocol">FHEVM docs</Ext></li>
              <li><Ext href="https://docs.openzeppelin.com/confidential-contracts/token">ERC-7984 standard</Ext></li>
            </ul>
          </div>

          {/* On-chain */}
          <div>
            <h4 className="label mb-4">On-chain (Sepolia)</h4>
            <ul className="space-y-2.5 text-sm">
              {CONTRACTS.map((c) => (
                <li key={c.addr} className="flex items-center justify-between gap-2">
                  <span className="text-paper-faint">{c.label}</span>
                  <a
                    href={`https://sepolia.etherscan.io/address/${c.addr}`}
                    target="_blank"
                    rel="noreferrer"
                    className="num text-[11px] text-paper-dim transition-colors hover:text-gold"
                  >
                    {short(c.addr)}
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-3 border-t border-rule pt-6 text-[11px] uppercase tracking-[0.16em] text-paper-faint sm:flex-row">
          <span>© {new Date().getFullYear()} Cifra · Confidential invoicing on the Zama Protocol</span>
          <span className="num">Amounts encrypted end-to-end</span>
        </div>
      </div>
    </footer>
  );
}
