"use client";

// Recurring / subscription invoices, kept simple and client-side: save an invoice as a reusable
// template, then re-issue it (e.g. monthly) in one click. No contract change needed.

export type InvoiceTemplate = {
  id: string;
  payer: string;
  amount: string;
  memo: string;
};

const KEY = "cifra:templates";

export function getTemplates(): InvoiceTemplate[] {
  if (typeof localStorage === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function saveTemplate(t: Omit<InvoiceTemplate, "id">): InvoiceTemplate[] {
  const item: InvoiceTemplate = { ...t, id: crypto.randomUUID() };
  // De-dupe identical (payer+memo) templates, newest first, cap the list.
  const rest = getTemplates().filter(
    (x) => !(x.payer.toLowerCase() === t.payer.toLowerCase() && x.memo === t.memo),
  );
  const next = [item, ...rest].slice(0, 12);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}

export function deleteTemplate(id: string): InvoiceTemplate[] {
  const next = getTemplates().filter((t) => t.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
}
