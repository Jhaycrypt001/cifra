"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

const links = [
  { href: "/dashboard", label: "Invoices" },
  { href: "/create", label: "New invoice" },
  { href: "/pool", label: "Financing pool" },
];

export function Nav() {
  const path = usePathname();
  const { address, connect, wrongNetwork, switchToSepolia } = useWallet();

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-ink/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-display tracking-tight">
            <span className="grid h-7 w-7 place-items-center bg-emerald text-ink">◈</span>
            Cifra
          </Link>
          <nav className="hidden gap-1 text-[11px] uppercase tracking-[0.14em] sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 ${path === l.href ? "text-paper" : "text-paper-faint hover:text-paper"}`}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex items-center gap-2">
          {wrongNetwork && address && (
            <button onClick={switchToSepolia} className="chip border-crimson/50 text-crimson">
              Switch to Sepolia
            </button>
          )}
          {address ? (
            <span className="chip border-rule text-paper">
              <span className="h-2 w-2 rounded-full bg-emerald" />
              {shortAddr(address)}
            </span>
          ) : (
            <button onClick={connect} className="btn-primary">
              Connect
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
