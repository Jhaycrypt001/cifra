import type { Web3AuthContextConfig } from "@web3auth/modal/react";
import { CHAIN_NAMESPACES, WEB3AUTH_NETWORK } from "@web3auth/modal";

// A free clientId comes from https://dashboard.web3auth.io — set NEXT_PUBLIC_WEB3AUTH_CLIENT_ID.
// The placeholder lets the app mount; only `connect()` requires a real id.
const clientId =
  process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID && process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID.length > 0
    ? process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
    : "BPlaceholderCifraClientIdReplaceMe00000000000000000000000000000000000000000000000000";

export const WEB3AUTH_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID && process.env.NEXT_PUBLIC_WEB3AUTH_CLIENT_ID.length > 0,
);

const chainId = process.env.NEXT_PUBLIC_CHAIN_ID_HEX ?? "0xaa36a7"; // Sepolia
const rpcTarget = process.env.NEXT_PUBLIC_RPC_URL ?? "https://rpc.sepolia.org";

export const web3AuthContextConfig: Web3AuthContextConfig = {
  web3AuthOptions: {
    clientId,
    web3AuthNetwork: WEB3AUTH_NETWORK.SAPPHIRE_DEVNET,
    ssr: true,
    chains: [
      {
        chainNamespace: CHAIN_NAMESPACES.EIP155,
        chainId,
        rpcTarget,
        displayName: "Sepolia",
        blockExplorerUrl: "https://sepolia.etherscan.io",
        ticker: "ETH",
        tickerName: "Ether",
        logo: "https://images.toruswallet.io/eth.svg",
      },
    ],
  },
};
