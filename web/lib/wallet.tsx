"use client";

import { ethers } from "ethers";
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  useWeb3Auth,
  useWeb3AuthConnect,
  useWeb3AuthDisconnect,
  useWeb3AuthUser,
} from "@web3auth/modal/react";
import { CHAIN_ID } from "./contracts";
import { WEB3AUTH_ENABLED } from "./web3auth";
import { resetDecryptSession } from "./fhevm";

type UserInfo = { name?: string; email?: string } | null;

type WalletState = {
  address: string | null;
  chainId: number | null;
  provider: ethers.BrowserProvider | null;
  userInfo: UserInfo;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  switchToSepolia: () => Promise<void>;
  getSigner: () => Promise<ethers.Signer>;
  wrongNetwork: boolean;
};

const Ctx = createContext<WalletState | null>(null);

const SEPOLIA_PARAMS = {
  chainId: "0xaa36a7",
  chainName: "Sepolia",
  nativeCurrency: { name: "SepoliaETH", symbol: "ETH", decimals: 18 },
  rpcUrls: ["https://ethereum-sepolia-rpc.publicnode.com"],
  blockExplorerUrls: ["https://sepolia.etherscan.io"],
};

export function WalletProvider({ children }: { children: React.ReactNode }) {
  // Web3Auth (social/email/wallet). Present because Providers wraps in Web3AuthProvider.
  const { web3Auth } = useWeb3Auth();
  const w3aProvider = (web3Auth as any)?.provider ?? null;
  const { connect: w3aConnect, isConnected: w3aConnected } = useWeb3AuthConnect();
  const { disconnect: w3aDisconnect } = useWeb3AuthDisconnect();
  const { userInfo: w3aUser } = useWeb3AuthUser();

  const [address, setAddress] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number | null>(null);

  const injected = () => (typeof window !== "undefined" ? (window as any).ethereum : undefined);

  // The active EIP-1193 provider: Web3Auth when signed in that way, otherwise the injected wallet.
  const eip1193 = useMemo(() => {
    if (w3aConnected && w3aProvider) return w3aProvider as any;
    return injected();
  }, [w3aConnected, w3aProvider]);

  const provider = useMemo(() => {
    if (!eip1193) return null;
    return new ethers.BrowserProvider(eip1193);
  }, [eip1193]);

  const refresh = useCallback(async () => {
    if (!eip1193) {
      setAddress(null);
      setChainId(null);
      return;
    }
    try {
      const accounts: string[] = await eip1193.request({ method: "eth_accounts" });
      setAddress(accounts?.[0] ?? null);
      const cid: string = await eip1193.request({ method: "eth_chainId" });
      setChainId(parseInt(cid, 16));
    } catch {
      /* ignore */
    }
  }, [eip1193]);

  useEffect(() => {
    refresh();
  }, [refresh, w3aConnected]);

  // Injected wallet event listeners (only relevant when using MetaMask directly).
  useEffect(() => {
    const e = injected();
    if (!e?.on || w3aConnected) return;
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
  }, [w3aConnected]);

  const connect = useCallback(async () => {
    if (WEB3AUTH_ENABLED) {
      // Opens the Web3Auth modal (Google / email / external wallets in one).
      await w3aConnect();
      await refresh();
      return;
    }
    const e = injected();
    if (!e) throw new Error("Install MetaMask or set NEXT_PUBLIC_WEB3AUTH_CLIENT_ID for social login.");
    await e.request({ method: "eth_requestAccounts" });
    await refresh();
  }, [w3aConnect, refresh]);

  const disconnect = useCallback(async () => {
    resetDecryptSession();
    try {
      if (w3aConnected) await w3aDisconnect();
    } catch {
      /* ignore */
    }
    setAddress(null);
  }, [w3aConnected, w3aDisconnect]);

  const switchToSepolia = useCallback(async () => {
    if (!eip1193) return;
    try {
      await eip1193.request({ method: "wallet_switchEthereumChain", params: [{ chainId: SEPOLIA_PARAMS.chainId }] });
    } catch (err: any) {
      if (err?.code === 4902) {
        await eip1193.request({ method: "wallet_addEthereumChain", params: [SEPOLIA_PARAMS] });
      }
    }
    await refresh();
  }, [eip1193, refresh]);

  const getSigner = useCallback(async () => {
    if (!provider) throw new Error("No wallet connected");
    return provider.getSigner();
  }, [provider]);

  const value: WalletState = {
    address,
    chainId,
    provider,
    userInfo: (w3aUser as UserInfo) ?? null,
    connect,
    disconnect,
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
