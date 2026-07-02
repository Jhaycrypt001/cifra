import { ethers } from "ethers";

export const CHAIN_ID = Number(process.env.NEXT_PUBLIC_CHAIN_ID ?? "11155111");

export const ADDRESSES = {
  cUSDT: process.env.NEXT_PUBLIC_CUSDT_ADDRESS ?? "",
  registry: process.env.NEXT_PUBLIC_REGISTRY_ADDRESS ?? "",
  pool: process.env.NEXT_PUBLIC_POOL_ADDRESS ?? "",
};

export const isConfigured = () =>
  ethers.isAddress(ADDRESSES.cUSDT) && ethers.isAddress(ADDRESSES.registry) && ethers.isAddress(ADDRESSES.pool);

// --- Minimal human-readable ABIs (only what the UI calls) --------------------

export const REGISTRY_ABI = [
  "function nextId() view returns (uint256)",
  "function pool() view returns (address)",
  "function createInvoice(address payer, bytes32 encAmount, bytes inputProof, uint64 dueDate, string memo) returns (uint256)",
  "function payInvoice(uint256 id)",
  "function financeInvoice(uint256 id)",
  "function cancelInvoice(uint256 id)",
  "function amountHandle(uint256 id) view returns (bytes32)",
  "function invoicesIssuedBy(address account) view returns (uint256[])",
  "function invoicesBilledTo(address account) view returns (uint256[])",
  "function getInvoice(uint256 id) view returns (address issuer, address payer, bytes32 amount, uint64 dueDate, uint8 status, address recipient, string memo)",
  "event InvoiceCreated(uint256 indexed id, address indexed issuer, address indexed payer, uint64 dueDate, string memo)",
  "event InvoicePaid(uint256 indexed id, address recipient)",
  "event InvoiceFinanced(uint256 indexed id, address indexed pool)",
];

export const POOL_ABI = [
  "function feeBps() view returns (uint64)",
  "function maxAdvance() view returns (uint64)",
  "function depositOf(address lp) view returns (bytes32)",
  "function deposit(bytes32 encAmount, bytes inputProof)",
  "function withdraw(bytes32 encAmount, bytes inputProof)",
];

export const CUSDT_ABI = [
  "function symbol() view returns (string)",
  "function decimals() view returns (uint8)",
  "function faucet(uint64 amount)",
  "function setOperator(address operator, uint48 until)",
  "function isOperator(address holder, address spender) view returns (bool)",
  "function confidentialBalanceOf(address account) view returns (bytes32)",
];

export function registry(runner: ethers.ContractRunner) {
  return new ethers.Contract(ADDRESSES.registry, REGISTRY_ABI, runner);
}
export function pool(runner: ethers.ContractRunner) {
  return new ethers.Contract(ADDRESSES.pool, POOL_ABI, runner);
}
export function cusdt(runner: ethers.ContractRunner) {
  return new ethers.Contract(ADDRESSES.cUSDT, CUSDT_ABI, runner);
}

export enum Status {
  Open = 0,
  Financed = 1,
  Paid = 2,
  Cancelled = 3,
}

export type Invoice = {
  id: number;
  issuer: string;
  payer: string;
  amountHandle: string;
  dueDate: number;
  status: Status;
  recipient: string;
  memo: string;
};
