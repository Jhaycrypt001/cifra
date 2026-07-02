# Deploying Cifra

## What you need to gather (do this in parallel)

1. **A funded Sepolia account** — a wallet mnemonic with some Sepolia test ETH.
   - Faucets: https://sepoliafaucet.com, https://www.alchemy.com/faucets/ethereum-sepolia
2. **An RPC key** — free Infura or Alchemy project (Sepolia endpoint).
3. **A Web3Auth clientId** (for social sign-in) — free from https://dashboard.web3auth.io
   - Create a "Web3Auth Modal" project; add `http://localhost:3000` and your Vercel URL as allowed origins.

## 1. Deploy contracts to Sepolia

```bash
cd contracts
npx hardhat vars set MNEMONIC        # your funded Sepolia mnemonic
npx hardhat vars set INFURA_API_KEY  # from Infura (or edit hardhat.config for Alchemy)
npm run deploy:sepolia
```

This deploys `MockConfidentialUSDT`, `InvoiceRegistry`, `FinancingPool`, wires them, and writes
`contracts/deployments/addresses.sepolia.json`.

> To use the official cUSDT from the Confidential Token Registry instead of the mock, set
> `CUSDT_ADDRESS=0x...` in the environment before running deploy.

## 2. Configure the frontend

```bash
cd ../web
cp .env.local.example .env.local
# paste the three addresses from addresses.sepolia.json
# paste your NEXT_PUBLIC_WEB3AUTH_CLIENT_ID
```

## 3. Run locally

```bash
npm run dev        # http://localhost:3000
```

## 4. Deploy the site (Vercel)

- Import the repo, set the **root directory** to `web/`.
- Add all `NEXT_PUBLIC_*` env vars in the Vercel project settings.
- Deploy. Add the resulting URL to your Web3Auth allowed origins.

## Demo seeding (for the video)

- Use the in-app **"Get 1,000 test cUSDT"** faucet on two accounts (issuer + payer).
- Fund the pool from a third account on the **Financing pool** page.
- Create an invoice → finance it → pay it, showing the block explorer has only ciphertext.
