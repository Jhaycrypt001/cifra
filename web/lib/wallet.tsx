"use client";

import { ethers } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { CHAIN_ID } from "./contracts";
import { resetDecryptSession } from "./fhevm";

type WalletState = {
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  connect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
  getSigner: () => Promise<ethers.JsonRpcSigner>;
  wrongNetwork: boolean;
};

const Ctx = createContext<WalletState | null>(null);

const SEPOLIA_PARAMS = {
  chainId: "0xaa36a7",
  chainName: "Sepolia",
  nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://rpc.sepolia.org"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const eth = () => (typeof window !== "undefined" ? (window as any).ethereum : undefined);

  const provider = useMemo(() => {
    if (typeof window === "undefined" || !eth()) return null;
    return new ethers.BrowserProvider(eth());
  }, []);

  const refresh = useCallback(async () => {
    const e = eth();
    if (!e) return;
    const accounts: string[] = await e.request({ method: "eth_accounts" });
    setAddress(accounts[0] ?? null);
    const cid: string = await e.request({ method: "eth_chainId" });
    setChainId(parseInt(cid, 16));
  }, []);

  useEffect(() => {
    refresh();
    const e = eth();
    if (!e?.on) return;
    const onAccounts = (a: string[]) => {
      setAddress(a[0] ?? null);
      resetDecryptSession();
    };
    const onChain = (c: string) => setChainId(parseInt(c, 16));
    e.on("accountsChanged", onAccounts);
    e.on("chainChanged", onChain);
    return () => {
      e.removeListener?.("accountsChanged", onAccounts);
      e.removeListener?.("chainChanged", onChain);
    };
  }, [refresh]);

  const connect = useCallback(async () => {
    const e = eth();
    if (!e) throw new Error("Install MetaMask or a compatible wallet.");
    await e.request({ method: "eth_requestAccounts" });
    await refresh();
  }, [refresh]);

  const switchToSepolia = useCallback(async () => {
    const e = eth();
    if (!e) return;
    try {
      await e.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_PARAMS.chainId }] });
    } catch (err: any) {
      if (err?.code === 4902) {
        await e.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
      } else {
        throw err;
      }
    }
    await refresh();
  }, [refresh]);

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error("No wallet provider");
    return provider.getSigner();
  }, [provider]);

  const value: WalletState = {
    address,
    chainId,
    provider,
    connect,
    switchToSepolia,
    getSigner,
    wrongNetwork: chainId !== null && chainId !== CHAIN_ID,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWallet() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useWallet must be used within WalletProvider");
  return c;
}
