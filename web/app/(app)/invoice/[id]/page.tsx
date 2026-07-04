"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ethers } from "ethers";
import { QRCodeSVG } from "qrcode.react";
import { Check, Copy } from "lucide-react";
import { ADDRESSES, cusdt, registry, Status } from "@/lib/contracts";
import { dueLabel, shortAddr, statusClasses, statusLabel } from "@/lib/format";
import { useContactName } from "@/lib/contacts";
import { useWallet } from "@/lib/wallet";
import { Reveal } from "@/components/Reveal";

const RPC = process.env.NEXT_PUBLIC_RPC_URL ?? "https://ethereum-sepolia-rpc.publicnode.com";
const OPERATOR_UNTIL = 4_000_000_000;

type Inv = {
  issuer: string;
  payer: string;
  amountHandle: string;
  dueDate: number;
  status: number;
  memo: string;
};

export default function InvoicePage() {
  const params = useParams();
  const id = Number(params?.id);
  const { address, getSigner } = useWallet();
  const [inv, setInv] = useState<Inv | null>(null);
  const [rep, setRep] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [url, setUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const p = new ethers.JsonRpcProvider(RPC);
      const reg = registry(p);
      const d = await reg.getInvoice(id);
      const invoice: Inv = {
        issuer: d.issuer,
        payer: d.payer,
        amountHandle: d.amount,
        dueDate: Number(d.dueDate),
        status: Number(d.status),
        memo: d.memo,
      };
      setInv(invoice);
      setRep(Number(await reg.invoicesPaidBy(invoice.payer)));
    } catch {
      setInv(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (Number.isFinite(id)) load();
    if (typeof window !== "undefined") setUrl(window.location.href);
  }, [id, load]);

  const issuerName = useContactName(inv?.issuer);
  const payerName = useContactName(inv?.payer);

  const mine = address?.toLowerCase();
  const isParty = !!inv && (mine === inv.issuer.toLowerCase() || mine === inv.payer.toLowerCase());
  const canPay =
    !!inv && mine === inv.payer.toLowerCase() && (inv.status === Status.Open || inv.status === Status.Financed);

  async function pay() {
    if (!inv) return;
    setBusy("pay");
    setErr(null);
    try {
      const signer = await getSigner();
      const token = cusdt(signer);
      if (!(await token.isOperator(inv.payer, ADDRESSES.registry))) {
        await (await token.setOperator(ADDRESSES.registry, OPERATOR_UNTIL)).wait();
      }
      await (await registry(signer).payInvoice(id)).wait();
      await load();
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Payment failed");
    } finally {
      setBusy(null);
    }
  }

  function copy() {
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    });
  }

  if (loading) return <div className="mx-auto max-w-xl text-sm text-paper-dim">Loading invoice…</div>;
  if (!inv) {
    return (
      <div className="mx-auto max-w-xl">
        <div className="card">
          <h1 className="font-display text-xl">Invoice not found</h1>
          <p className="mt-2 text-sm text-paper-dim">
            No invoice #{id} on this network.{" "}
            <Link href="/dashboard" className="text-gold underline">
              Back to dashboard
            </Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-3xl gap-6 sm:grid-cols-[1fr_auto]">
      <div className="card flex flex-col gap-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="label mb-1">Invoice #{id}</div>
            <div className="font-display text-2xl">{inv.memo || "Confidential invoice"}</div>
          </div>
          <span className={`chip ${statusClasses(inv.status)}`}>{statusLabel(inv.status)}</span>
        </div>

        <div className="flex items-center justify-between border border-rule bg-ink-3/60 px-3.5 py-3">
          <span className="label mb-0">Amount</span>
          {isParty ? (
            <Reveal handle={inv.amountHandle} contractAddress={ADDRESSES.registry} />
          ) : (
            <span className="num tracking-widest text-paper-faint">••••• encrypted</span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm">
          <Field label="From" value={issuerName ?? shortAddr(inv.issuer)} mono={!issuerName} />
          <Field label="Bill to" value={payerName ?? shortAddr(inv.payer)} mono={!payerName} />
          <Field label="Due" value={dueLabel(inv.dueDate)} />
          <Field label="Payer reputation" value={rep === null ? "—" : `${rep} settled`} />
        </dl>

        {err && <div className="border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}

        {canPay ? (
          <button className="btn-primary" onClick={pay} disabled={!!busy}>
            {busy === "pay" ? "Paying…" : "Pay this invoice"}
          </button>
        ) : !address && (inv.status === Status.Open || inv.status === Status.Financed) ? (
          <p className="text-center text-[11px] text-paper-faint">
            Connect the payer wallet to settle this invoice.
          </p>
        ) : null}
      </div>

      {/* Share card */}
      <div className="card flex flex-col items-center gap-3 sm:w-52">
        <div className="label self-start">Share</div>
        <div className="bg-paper p-3">
          {url && <QRCodeSVG value={url} size={140} bgColor="#f5efe2" fgColor="#0b0a09" />}
        </div>
        <button className="btn-ghost w-full" onClick={copy}>
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" /> Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" /> Copy link
            </>
          )}
        </button>
        <p className="text-center text-[11px] text-paper-faint">Anyone with the link can pay. The amount stays encrypted.</p>
      </div>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <dt className="label mb-0.5">{label}</dt>
      <dd className={mono ? "num text-paper" : "text-paper"}>{value}</dd>
    </div>
  );
}
