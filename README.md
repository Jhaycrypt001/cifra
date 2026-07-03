# Cifra

**Confidential invoicing and instant financing on Ethereum. Amounts are encrypted end to end on a public chain, so nobody sees the number.**

Built on the [Zama Protocol](https://www.zama.org/) (FHEVM) for the Developer Program Mainnet Season 3, Builder Track. Theme: *Composable Privacy*.

## What it does

Businesses and freelancers issue **encrypted invoices**, get paid in **cUSDT** (ERC-7984), and can **sell an unpaid invoice for instant cash** to a liquidity pool that funds it without ever seeing the amount. When the client pays, the pool is repaid and the reserve is released to the issuer. Every figure stays encrypted on-chain.

This is real invoice factoring, a multi-trillion-dollar industry, made private.

## How the financing works (real factoring mechanics)

Like Bluevine or Fundbox, the pool advances a percentage up front and holds a reserve:

```
Invoice value A (encrypted)
  finance:  issuer receives  85% of A  up front            (advance rate)
  settle:   client pays A to the pool, which releases
            13% of A  to the issuer                          (reserve minus fee)
  pool net: 2% of A                                          (fee = LP yield)
```

All of this is computed **homomorphically on ciphertext**. The pool never decrypts the amount, and funding is gated with `FHE.select(FHE.le(amount, cap), ...)` so it can never over-extend.

## Why it is composable privacy

Money **enters** private (invoice), **moves** private (cUSDT settlement), unlocks a **second** private financial action (receivables financing), and **settles** private. Not one silo, but a chain of composed confidential finance.

## Features

- Confidential invoices: amounts are `euint64` ciphertext, decryptable only by the issuer and payer
- Settlement in cUSDT (ERC-7984 confidential token)
- Instant financing: 85% advance up front, 13% reserve on settlement, 2% pool fee
- Liquidity pool with LP yield (LPs earn the factoring fee)
- Web2 + Web3 sign in (social/email via Web3Auth, or MetaMask)
- Overdue tracking, live on-chain stats, Etherscan-verified contracts

## Architecture

| Contract | Role |
|---|---|
| `ConfidentialUSDT` | ERC-7984 confidential stablecoin (cUSDT) with a testnet faucet |
| `InvoiceRegistry` | Create / pay / finance / cancel confidential invoices |
| `FinancingPool` | LPs deposit; pool factors invoices homomorphically (advance + reserve), risk-gated on ciphertext |

## Stack

- FHEVM `@fhevm/solidity` v0.11 + OpenZeppelin Confidential Contracts (ERC7984) v0.5
- Hardhat, Solidity 0.8.27 (cancun)
- Relayer SDK `@zama-fhe/relayer-sdk` v0.4 (client-side encrypt / user-decrypt)
- Next.js 14 + Tailwind + Web3Auth + ethers v6

## Repo layout

```
cifra/
  contracts/   Hardhat project (FHEVM contracts, tests, deploy)
  web/         Next.js frontend
```

## Run the frontend

```bash
cd web
npm install
npm run dev            # http://localhost:3000
```

Connect a wallet on **Sepolia**, use the **Faucet** to mint test cUSDT, then create, finance, pay, and reveal invoices. (`web/.env.local` already holds the deployed addresses and Web3Auth client id.)

## Run the contracts

```bash
cd contracts
npm install
npm run compile
npx hardhat test test/Cifra.ts                          # 3 passing: privacy, pay, finance
npx hardhat test test/CifraSepolia.ts --network sepolia # live FHE roundtrip on Sepolia

# deploy your own
npx hardhat vars set MNEMONIC
npx hardhat vars set INFURA_API_KEY
npm run deploy:sepolia
```

## Live on Sepolia (Etherscan-verified)

| Contract | Address |
|---|---|
| cUSDT (ERC-7984) | [`0xCd5D11A2C90154ad21294eed1773a35A858c0b0c`](https://sepolia.etherscan.io/address/0xCd5D11A2C90154ad21294eed1773a35A858c0b0c#code) |
| InvoiceRegistry | [`0x58478f59e86Cd5168f99eB6eebC01cf8F430ba29`](https://sepolia.etherscan.io/address/0x58478f59e86Cd5168f99eB6eebC01cf8F430ba29#code) |
| FinancingPool | [`0xE8423D9cbabe47F9519E21c007f55d5027A60006`](https://sepolia.etherscan.io/address/0xE8423D9cbabe47F9519E21c007f55d5027A60006#code) |

RPC: `https://ethereum-sepolia-rpc.publicnode.com`

## Status

- [x] Contracts: cUSDT + registry + pool, compiling
- [x] Tests passing on the FHEVM mock (privacy, pay, finance)
- [x] Deployed to Sepolia, all three contracts Etherscan-verified
- [x] Full FHE roundtrip (encrypt, createInvoice, user-decrypt) verified on live Sepolia
- [x] Frontend: landing + app, Web3Auth, build green
- [ ] Live demo on Vercel + 3-min pitch + X thread

## License

MIT / BSD-3-Clause-Clear (per the Zama Hardhat template).
