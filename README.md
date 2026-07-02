# Cifra — Confidential Invoicing + Instant Financing

**Stripe invoicing + invoice factoring, where the amounts are invisible to the entire chain.**

Built on the [Zama Protocol](https://www.zama.org/) (FHEVM) for the **Developer Program Mainnet Season 3 — Builder Track**. Theme: *Composable Privacy*.

## The idea

Businesses and freelancers issue **encrypted invoices**, get paid in **cUSDT** (ERC-7984),
and — the composable-privacy superpower — can **sell an unpaid invoice for instant cash** to a
liquidity pool that funds it *without ever seeing the amount*. When the client pays, the loan
auto-settles. Every figure stays encrypted end-to-end on a public chain.

```
issue encrypted invoice ──▶ client pays in cUSDT (amount hidden)
        │
        └──▶ "Get paid now": pool advances (encrypted) cash it can't read,
             gated by an on-ciphertext risk cap ──▶ client pays ──▶ loan auto-settles
```

This is real invoice factoring — a multi-trillion-dollar industry — made private.

## Why it's composable privacy

Money **enters** private (invoice), **moves** private (cUSDT settlement), unlocks a **second**
private financial action (receivables financing), and **settles** private. Not one silo — a chain
of composed confidential finance, which is exactly what Season 3 rewards.

## Architecture

| Contract | Role |
|---|---|
| `MockConfidentialUSDT` | ERC-7984 confidential stablecoin w/ faucet (stands in for official cUSDT) |
| `InvoiceRegistry` | Create / pay / finance / cancel confidential invoices |
| `FinancingPool` | LPs deposit; pool advances funds on invoices homomorphically, risk-gated on ciphertext |

The pool computes `advance = amount * (10000 - feeBps) / 10000` **directly on encrypted values**
and gates funding with `FHE.select(FHE.le(amount, cap), amount, 0)` — it never learns the number.

## Stack

- FHEVM `@fhevm/solidity` v0.11 + OpenZeppelin Confidential Contracts (ERC7984) v0.5
- Hardhat template, Solidity 0.8.27 (cancun)
- Relayer SDK `@zama-fhe/relayer-sdk` v0.4 (frontend encrypt / user-decrypt)
- Deploy: Sepolia

## Repo layout

```
cifra/
  contracts/   # Hardhat project (FHEVM contracts, tests, deploy)
  web/         # Next.js frontend (added next)
```

## Contracts — quickstart

```bash
cd contracts
npm install
npm run compile
npx hardhat test test/Cifra.ts        # 3 passing: privacy, pay, finance

# deploy
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npm run deploy:sepolia                 # writes deployments/addresses.sepolia.json
```

## Live on Sepolia

| Contract | Address |
|---|---|
| cUSDT (ERC-7984) | [`0x6841DEA24De243d70240a7EEDbE3f08Ce6F45c7c`](https://sepolia.etherscan.io/address/0x6841DEA24De243d70240a7EEDbE3f08Ce6F45c7c) |
| InvoiceRegistry | [`0x4A4D2123A5F2C56ca9eafD31116412140A8A5EAB`](https://sepolia.etherscan.io/address/0x4A4D2123A5F2C56ca9eafD31116412140A8A5EAB) |
| FinancingPool | [`0x3f07a683113F65b993CbCbc6Ea17Ca4107D185A5`](https://sepolia.etherscan.io/address/0x3f07a683113F65b993CbCbc6Ea17Ca4107D185A5) |

RPC: `https://ethereum-sepolia-rpc.publicnode.com`

## Status

- [x] Contracts: registry + pool + cUSDT, compiling
- [x] End-to-end tests passing on FHEVM mock (create → pay, create → finance → pay)
- [x] Deployed to Sepolia
- [x] Frontend (Next.js + Relayer SDK + Web3Auth) — build green
- [ ] Live demo on Vercel + 3-min pitch + X thread

## License

MIT / BSD-3-Clause-Clear (per Zama template).
