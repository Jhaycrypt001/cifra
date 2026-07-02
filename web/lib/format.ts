import { ethers } from "ethers";
import { Status } from "./contracts";

export const CUSDT_DECIMALS = 6;

export function toUnits(human: string): bigint {
  return ethers.parseUnits(human || "0", CUSDT_DECIMALS);
}

export function fromUnits(amount: bigint): string {
  return ethers.formatUnits(amount, CUSDT_DECIMALS);
}

export function fmtUSD(amount: bigint): string {
  const n = Number(fromUnits(amount));
  return n.toLocaleString(undefined, { style: "currency", currency: "USD" });
}

export function shortAddr(a?: string | null): string {
  if (!a) return "—";
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

export function statusLabel(s: Status): string {
  return ["Open", "Financed", "Paid", "Cancelled"][s] ?? "Unknown";
}

export function statusClasses(s: Status): string {
  switch (s) {
    case Status.Open:
      return "border-paper-dim/40 text-paper-dim";
    case Status.Financed:
      return "border-gold-soft/40 text-gold-soft";
    case Status.Paid:
      return "border-gold/50 text-gold";
    default:
      return "border-rule text-paper-faint";
  }
}

export function dueLabel(ts: number): string {
  if (!ts) return "—";
  const d = new Date(ts * 1000);
  return d.toLocaleDateString();
}
