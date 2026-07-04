"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ethers } from "ethers";
import { ADDRESSES, registry } from "@/lib/contracts";
import { encryptAmount } from "@/lib/fhevm";
import { toUnits } from "@/lib/format";
import { useWallet } from "@/lib/wallet";
import { DueDatePicker } from "@/components/ui/due-date-picker";
import { deleteTemplate, getTemplates, saveTemplate, type InvoiceTemplate } from "@/lib/templates";
import { getName, saveContact, useContacts } from "@/lib/contacts";

export default function CreateInvoice() {
  const router = useRouter();
  const { address, provider, getSigner, connect, wrongNetwork, switchToSepolia } = useWallet();
  const [payer, setPayer] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState<Date | undefined>(undefined);
  const [memo, setMemo] = useState("");
  const [step, setStep] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rep, setRep] = useState<number | null>(null);
  const [templates, setTemplates] = useState<InvoiceTemplate[]>([]);
  const [saveTpl, setSaveTpl] = useState(false);
  const [contactName, setContactName] = useState("");
  const contacts = useContacts();

  useEffect(() => setTemplates(getTemplates()), []);
  // Prefill the name field with any saved name for the entered payer.
  useEffect(() => {
    setContactName(ethers.isAddress(payer) ? getName(payer) ?? "" : "");
  }, [payer]);

  // On-chain reputation: how many invoices this payer has already settled on Cifra.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!provider || !ethers.isAddress(payer)) {
        setRep(null);
        return;
      }
      try {
        const n = await registry(provider).invoicesPaidBy(payer);
        if (!cancelled) setRep(Number(n));
      } catch {
        if (!cancelled) setRep(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [provider, payer]);

  const valid = ethers.isAddress(payer) && Number(amount) > 0;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!valid || !address) return;
    try {
      const signer = await getSigner();

      setStep("Encrypting amount…");
      const { handle, proof } = await encryptAmount(ADDRESSES.registry, address, toUnits(amount));

      setStep("Creating invoice…");
      const dueTs = due ? Math.floor(due.getTime() / 1000) : 0;
      const tx = await registry(signer).createInvoice(payer, handle, proof, dueTs, memo || "Invoice");
      await tx.wait();

      if (contactName.trim() && ethers.isAddress(payer)) saveContact(payer, contactName);
      if (saveTpl && ethers.isAddress(payer)) saveTemplate({ payer, amount, memo: memo || "Invoice" });
      router.push("/dashboard");
    } catch (e: any) {
      setErr(e?.shortMessage || e?.reason || e?.message || "Failed to create invoice");
    } finally {
      setStep(null);
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="font-display text-3xl font-light tracking-tight">New invoice</h1>
      <p className="mt-1 text-sm text-paper-dim">
        The amount is encrypted in your browser before it ever touches the chain. Only you and the
        payer will be able to reveal it.
      </p>

      {!address ? (
        <div className="card mt-8 flex items-center justify-between">
          <span className="text-sm text-paper-dim">Connect your wallet to issue an invoice.</span>
          <button className="btn-primary" onClick={connect}>
            Connect wallet
          </button>
        </div>
      ) : wrongNetwork ? (
        <div className="card mt-8 flex items-center justify-between">
          <span className="text-sm text-crimson">Wrong network.</span>
          <button className="btn-primary" onClick={switchToSepolia}>
            Switch to Sepolia
          </button>
        </div>
      ) : (
        <form onSubmit={submit} className="card mt-8 flex flex-col gap-5">
          {templates.length > 0 && (
            <div>
              <label className="label">Reuse a template (recurring)</label>
              <div className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <span key={t.id} className="inline-flex items-center gap-1.5 border border-rule px-2.5 py-1 text-[11px]">
                    <button
                      type="button"
                      onClick={() => {
                        setPayer(t.payer);
                        setAmount(t.amount);
                        setMemo(t.memo);
                      }}
                      className="text-paper-dim hover:text-gold"
                    >
                      {t.memo || `${t.payer.slice(0, 6)}…`}
                    </button>
                    <button
                      type="button"
                      onClick={() => setTemplates(deleteTemplate(t.id))}
                      className="text-paper-faint hover:text-crimson"
                      aria-label="Delete template"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>
          )}
          <div>
            <label className="label">Bill to (payer address)</label>
            {contacts.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1.5">
                {contacts.map((c) => (
                  <button
                    key={c.address}
                    type="button"
                    onClick={() => setPayer(c.address)}
                    className="border border-rule px-2.5 py-1 text-[11px] text-paper-dim transition hover:border-gold/50 hover:text-gold"
                  >
                    {c.name}
                  </button>
                ))}
              </div>
            )}
            <input className="input num" placeholder="0x…" value={payer} onChange={(e) => setPayer(e.target.value)} />
            {ethers.isAddress(payer) && (
              <div className="mt-2 flex items-center gap-2">
                <input
                  className="input flex-1 py-1.5 text-xs"
                  placeholder="Name this address (e.g. Acme Corp)"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  onBlur={() => saveContact(payer, contactName)}
                />
                <button
                  type="button"
                  onClick={() => saveContact(payer, contactName)}
                  className="chip border-rule text-paper-dim hover:text-gold"
                >
                  Save
                </button>
              </div>
            )}
            {rep !== null && (
              <p className="mt-1.5 text-[11px] text-paper-faint">
                On-chain reputation: this payer has settled{" "}
                <span className="text-gold">{rep}</span> invoice{rep === 1 ? "" : "s"} on Cifra.
              </p>
            )}
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="label">Amount (cUSDT)</label>
              <input
                className="input num"
                type="number"
                min="0"
                step="0.01"
                placeholder="12400.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <label className="label">Due date</label>
              <DueDatePicker value={due} onChange={setDue} />
            </div>
          </div>
          <div>
            <label className="label">Memo (public)</label>
            <input
              className="input"
              placeholder="Design work, June"
              value={memo}
              onChange={(e) => setMemo(e.target.value)}
            />
          </div>

          {err && <div className="border border-crimson/40 bg-crimson/10 px-3 py-2 text-xs text-crimson">{err}</div>}

          <label className="flex items-center gap-2 text-[11px] text-paper-faint">
            <input
              type="checkbox"
              checked={saveTpl}
              onChange={(e) => setSaveTpl(e.target.checked)}
              className="accent-gold"
            />
            Save as recurring template (reuse in one click next time)
          </label>

          <button className="btn-primary" disabled={!valid || !!step}>
            {step ?? "Create confidential invoice"}
          </button>
          <p className="text-center text-[11px] text-paper-faint">
            The chain will store only a ciphertext handle for the amount.
          </p>
        </form>
      )}
    </div>
  );
}
