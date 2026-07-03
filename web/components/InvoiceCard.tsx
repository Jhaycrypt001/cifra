"use client";

import { useState } from "react";
import { ethers } from "ethers";
import { ADDRESSES, cusdt, Invoice, registry, Status } from "@/lib/contracts";
import { dueLabel, shortAddr, statusClasses, statusLabel } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { Reveal } from "./Reveal";

const OPERATOR_UNTIL = 4_000_000_000; // far-future unix ts

export function InvoiceCard({
  inv,
  role,
  onChanged,
}: {
  inv: Invoice;
  role: "issuer" | "payer";
  onChanged: () => void;
}) {
  const { address, getSigner } = useWallet();
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const mine = address?.toLowerCase();
  const canReveal =
    mine === inv.issuer.toLowerCase() || mine === inv.payer.toLowerCase();
  const overdue =
    (inv.status === Status.Open || inv.status === Status.Financed) && inv.dueDate * 1000 < Date.now();

  async function run(label: string, fn: (signer: ethers.Signer) => Promise<void>) {
    setBusy(label);
    setErr(null);
    try {
      const signer = await getSigner();
      await fn(signer);
      onChanged();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Transaction failed");
    } finally {
      setBusy(null);
    }
  }

  const pay = () =>
    run("pay", async (signer) => {
      const token = cusdt(signer);
      // Authorize the registry to move the payer's cUSDT, if not already.
      const isOp = await token.isOperator(inv.payer, ADDRESSES.registry);
      if (!isOp) {
        await (await token.setOperator(ADDRESSES.registry, OPERATOR_UNTIL)).wait();
      }
      await (await registry(signer).payInvoice(inv.id)).wait();
    });

  const finance = () =>
    run("finance", async (signer) => {
      await (await registry(signer).financeInvoice(inv.id)).wait();
    });

  const cancel = () =>
    run("cancel", async (signer) => {
      await (await registry(signer).cancelInvoice(inv.id)).wait();
    });

  const counterparty = role === "issuer" ? inv.payer : inv.issuer;
  const counterpartyLabel = role === "issuer" ? "Billed to" : "From";

  return (
    <div className="card flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-medium">{inv.memo || `Invoice #${inv.id}`}</div>
          <div className="text-xs text-muted">
            {counterpartyLabel} {shortAddr(counterparty)} · due {dueLabel(inv.dueDate)}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {overdue && <span className="chip border-crimson/50 text-crimson">Overdue</span>}
          <span className={`chip ${statusClasses(inv.status)}`}>{statusLabel(inv.status)}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border border-rule bg-ink-3/60 px-3.5 py-3">
        <span className="label mb-0">Amount</span>
        {canReveal ? (
          <Reveal handle={inv.amountHandle} contractAddress={ADDRESSES.registry} />
        ) : (
          <span className="num tracking-widest text-paper-faint">••••• encrypted</span>
        )}
      </div>

      {err && <div className="border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}

      <div className="flex flex-wrap gap-2">
        {role === "payer" && (inv.status === Status.Open || inv.status === Status.Financed) && (
          <button className="btn-primary" onClick={pay} disabled={!!busy}>
            {busy === "pay" ? "Paying…" : "Pay invoice"}
          </button>
        )}
        {role === "issuer" && inv.status === Status.Open && (
          <>
            <button className="btn-primary" onClick={finance} disabled={!!busy}>
              {busy === "finance" ? "Financing…" : "Get paid now"}
            </button>
            <button className="btn-ghost" onClick={cancel} disabled={!!busy}>
              {busy === "cancel" ? "…" : "Cancel"}
            </button>
          </>
        )}
      </div>

      {role === "issuer" && inv.status === Status.Open && (
        <p className="text-[11px] text-paper-faint">
          <span className="text-gold">Get paid now</span> advances 85% up front. The remaining 13% is
          released when your client pays (2% fee to the pool).
        </p>
      )}
    </div>
  );
}
