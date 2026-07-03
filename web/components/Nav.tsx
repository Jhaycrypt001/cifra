"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { LoginButton } from "@/components/login-button";

const links = [
  { href: "/dashboard", label: "Invoices" },
  { href: "/create", label: "New invoice" },
  { href: "/pool", label: "Financing pool" },
];

export function Nav() {
  const path = usePathname();
  const { address, wrongNetwork, switchToSepolia } = useWallet();
  const [open, setOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 border-b border-rule bg-ink/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-4 py-3">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2 font-display tracking-tight">
            <span className="grid h-7 w-7 place-items-center bg-gold text-ink">◈</span>
            Cifra
          </Link>
          {/* Desktop links */}
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
          <LoginButton />
          {/* Mobile menu toggle */}
          <button
            onClick={() => setOpen((o) => !o)}
            className="grid h-9 w-9 place-items-center border border-rule text-paper sm:hidden"
            aria-label="Menu"
          >
            {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {open && (
        <nav className="border-t border-rule bg-ink px-4 py-2 sm:hidden">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setOpen(false)}
              className={`block px-1 py-3 text-sm uppercase tracking-[0.14em] ${
                path === l.href ? "text-gold" : "text-paper-dim hover:text-paper"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
