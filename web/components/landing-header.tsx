"use client";

import Link from "next/link";
import { LoginButton } from "@/components/login-button";

export function LandingHeader() {
  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-40">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-5">
        <Link href="/" className="pointer-events-auto flex items-center gap-2.5">
          <span className="grid h-7 w-7 place-items-center bg-gold text-ink">◈</span>
          <span className="font-display text-lg tracking-tight">Cifra</span>
        </Link>
        <div className="pointer-events-auto flex items-center gap-2">
          <LoginButton />
          <Link href="/dashboard" className="btn-primary hidden sm:inline-flex">
            Launch app
          </Link>
        </div>
      </div>
    </div>
  );
}
