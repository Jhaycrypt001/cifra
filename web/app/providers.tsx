"use client";

import { Web3AuthProvider } from "@web3auth/modal/react";
import { web3AuthContextConfig } from "@/lib/web3auth";
import { WalletProvider } from "@/lib/wallet";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <Web3AuthProvider config={web3AuthContextConfig}>
      <WalletProvider>{children}</WalletProvider>
    </Web3AuthProvider>
  );
}
