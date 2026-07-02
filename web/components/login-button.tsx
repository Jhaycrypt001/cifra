"use client";

import { useEffect, useRef, useState } from "react";
import { LogOut, Wallet } from "lucide-react";
import { useWallet } from "@/lib/wallet";
import { shortAddr } from "@/lib/format";

export function LoginButton() {
  const { address, userInfo, connect, disconnect } = useWallet();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrap = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!wrap.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function signIn() {
    setBusy(true);
    try {
      await connect();
    } catch (e) {
      console.error(e);
    } finally {
      setBusy(false);
    }
  }

  if (!address) {
    return (
      <button onClick={signIn} disabled={busy} className="btn-primary">
        {busy ? "Connecting…" : "Sign in"}
      </button>
    );
  }

  const name = userInfo?.name;
  const email = userInfo?.email;
  const initials = (name?.match(/\b\w/g) ?? ["◈"]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="relative" ref={wrap}>
      <button onClick={() => setOpen((o) => !o)} className="chip border-rule text-paper">
        <span className="grid h-4 w-4 place-items-center bg-gold text-[9px] font-bold text-ink">{initials}</span>
        <span className="num">{shortAddr(address)}</span>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-60 border border-rule bg-ink-2 p-3 shadow-xl">
          <div className="flex items-center gap-2 border-b border-rule pb-3">
            <span className="grid h-8 w-8 place-items-center bg-gold text-xs font-bold text-ink">{initials}</span>
            <div className="min-w-0">
              <div className="truncate text-sm">{name ?? "Wallet"}</div>
              {email ? (
                <div className="truncate text-[11px] text-paper-faint">{email}</div>
              ) : (
                <div className="num truncate text-[11px] text-paper-faint">{shortAddr(address)}</div>
              )}
            </div>
          </div>
          <button
            onClick={async () => {
              setOpen(false);
              await disconnect();
            }}
            className="mt-3 flex w-full items-center gap-2 px-1 py-1.5 text-left text-[11px] uppercase tracking-[0.14em] text-paper-dim hover:text-paper"
          >
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}
