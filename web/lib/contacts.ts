"use client";

import { useEffect, useState } from "react";

// Address book: name the wallet addresses you deal with (like a client list), stored client-side.
// Names show up on invoices, cards, and the share page. No contract change, no privacy leak.

const KEY = "cifra:contacts";
const EVENT = "cifra:contacts-changed";

export function getContacts(): Record<string, string> {
  if (typeof localStorage === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(KEY) || "{}");
  } catch {
    return {};
  }
}

export function getName(address?: string | null): string | null {
  if (!address) return null;
  return getContacts()[address.toLowerCase()] ?? null;
}

export function saveContact(address: string, name: string): void {
  const c = getContacts();
  const key = address.toLowerCase();
  if (name.trim()) c[key] = name.trim();
  else delete c[key];
  localStorage.setItem(KEY, JSON.stringify(c));
  window.dispatchEvent(new Event(EVENT));
}

export function contactList(): { address: string; name: string }[] {
  return Object.entries(getContacts()).map(([address, name]) => ({ address, name }));
}

/** Reactive contact name for an address (updates when the address book changes). */
export function useContactName(address?: string | null): string | null {
  const [name, setName] = useState<string | null>(null);
  useEffect(() => {
    const update = () => setName(getName(address));
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, [address]);
  return name;
}

/** Reactive list of saved contacts. */
export function useContacts(): { address: string; name: string }[] {
  const [list, setList] = useState<{ address: string; name: string }[]>([]);
  useEffect(() => {
    const update = () => setList(contactList());
    update();
    window.addEventListener(EVENT, update);
    window.addEventListener("storage", update);
    return () => {
      window.removeEventListener(EVENT, update);
      window.removeEventListener("storage", update);
    };
  }, []);
  return list;
}
