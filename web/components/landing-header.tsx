"use client";

import Link from "next/link";

export function LandingHeader() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-rule/60 bg-ink/70 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-3.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center bg-emerald text-ink">◈</span>
          <span className="font-display text-lg tracking-tight">Cifra</span>
        </Link>
        <nav className="hidden items-center gap-7 text-[12px] uppercase tracking-[0.16em] text-paper-dim sm:flex">
          <a href="#how" className="hover:text-paper">How it works</a>
          <a href="#why" className="hover:text-paper">Why FHE</a>
          <a href="#composable" className="hover:text-paper">Composability</a>
        </nav>
        <Link href="/dashboard" className="btn-primary">
          Launch app
        </Link>
      </div>
    </header>
  );
}
