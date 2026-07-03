import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import {
  ConfidentialUSDT,
  ConfidentialUSDT__factory,
  InvoiceRegistry,
  InvoiceRegistry__factory,
  FinancingPool,
  FinancingPool__factory,
} from "../types";

const OPERATOR_UNTIL = 2_000_000_000; // far-future unix ts (uint48)
const DAY = 24 * 60 * 60;

type Signers = {
  deployer: HardhatEthersSigner;
  issuer: HardhatEthersSigner; // alice
  payer: HardhatEthersSigner; // bob
  lp: HardhatEthersSigner; // carol
};

async function deployFixture() {
  const cusdt = (await (
    (await ethers.getContractFactory("ConfidentialUSDT")) as ConfidentialUSDT__factory
  ).deploy()) as ConfidentialUSDT;
  const cusdtAddr = await cusdt.getAddress();

  const registry = (await (
    (await ethers.getContractFactory("InvoiceRegistry")) as InvoiceRegistry__factory
  ).deploy(cusdtAddr)) as InvoiceRegistry;
  const registryAddr = await registry.getAddress();

  const pool = (await (
    (await ethers.getContractFactory("FinancingPool")) as FinancingPool__factory
  ).deploy(cusdtAddr)) as FinancingPool;
  const poolAddr = await pool.getAddress();

  await (await registry.setPool(poolAddr)).wait();
  await (await pool.setRegistry(registryAddr)).wait();

  return { cusdt, cusdtAddr, registry, registryAddr, pool, poolAddr };
}

// Helpers ---------------------------------------------------------------------

async function faucet(cusdt: ConfidentialUSDT, to: HardhatEthersSigner, amount: number) {
  await (await cusdt.connect(to).faucet(amount)).wait();
}

async function encAmountFor(contractAddr: string, user: HardhatEthersSigner, amount: number) {
  const enc = await fhevm.createEncryptedInput(contractAddr, user.address).add64(amount).encrypt();
  return { handle: enc.handles[0], proof: enc.inputProof };
}

async function decryptBalance(cusdtAddr: string, cusdt: ConfidentialUSDT, who: HardhatEthersSigner) {
  const handle = await cusdt.confidentialBalanceOf(who.address);
  if (handle === ethers.ZeroHash) return 0n;
  return fhevm.userDecryptEuint(FhevmType.euint64, handle, cusdtAddr, who);
}

// Tests -----------------------------------------------------------------------

describe("Cifra", function () {
  let signers: Signers;

  before(async function () {
    const s = await ethers.getSigners();
    signers = { deployer: s[0], issuer: s[1], payer: s[2], lp: s[3] };
  });

  beforeEach(function () {
    if (!fhevm.isMock) {
      console.warn("Cifra tests require the FHEVM mock environment (skipping on live networks).");
      this.skip();
    }
  });

  it("keeps invoice amounts private: only issuer and payer can decrypt", async function () {
    const { registry, registryAddr } = await deployFixture();
    const { issuer, payer, lp } = signers;

    const { handle, proof } = await encAmountFor(registryAddr, issuer, 300);
    await (
      await registry.connect(issuer).createInvoice(payer.address, handle, proof, (await now()) + DAY, "Design work")
    ).wait();

    const amtHandle = await registry.amountHandle(0);
    expect(await fhevm.userDecryptEuint(FhevmType.euint64, amtHandle, registryAddr, issuer)).to.eq(300n);
    expect(await fhevm.userDecryptEuint(FhevmType.euint64, amtHandle, registryAddr, payer)).to.eq(300n);

    // A third party has no ACL and cannot decrypt.
    await expect(fhevm.userDecryptEuint(FhevmType.euint64, amtHandle, registryAddr, lp)).to.be.rejected;
  });

  it("create -> pay: payer settles the invoice in cUSDT, amounts stay encrypted", async function () {
    const { cusdt, cusdtAddr, registry, registryAddr } = await deployFixture();
    const { issuer, payer } = signers;

    await faucet(cusdt, payer, 1000);
    await (await cusdt.connect(payer).setOperator(registryAddr, OPERATOR_UNTIL)).wait();

    const { handle, proof } = await encAmountFor(registryAddr, issuer, 300);
    await (
      await registry.connect(issuer).createInvoice(payer.address, handle, proof, (await now()) + DAY, "Invoice #1")
    ).wait();

    await (await registry.connect(payer).payInvoice(0)).wait();

    expect(await decryptBalance(cusdtAddr, cusdt, issuer)).to.eq(300n);
    expect(await decryptBalance(cusdtAddr, cusdt, payer)).to.eq(700n);

    const inv = await registry.getInvoice(0);
    expect(inv.status).to.eq(2); // Paid
  });

  it("create -> finance -> pay: pool advances (amount - 2% fee), gets repaid on settlement", async function () {
    const { cusdt, cusdtAddr, registry, registryAddr, pool, poolAddr } = await deployFixture();
    const { issuer, payer, lp } = signers;

    // LP funds the pool with 5000 cUSDT.
    await faucet(cusdt, lp, 5000);
    await (await cusdt.connect(lp).setOperator(poolAddr, OPERATOR_UNTIL)).wait();
    const lpDep = await encAmountFor(poolAddr, lp, 5000);
    await (await pool.connect(lp).deposit(lpDep.handle, lpDep.proof)).wait();

    // Payer will settle later.
    await faucet(cusdt, payer, 1000);
    await (await cusdt.connect(payer).setOperator(registryAddr, OPERATOR_UNTIL)).wait();

    // Issuer creates a 1000 invoice and sells it to the pool.
    const inv = await encAmountFor(registryAddr, issuer, 1000);
    await (
      await registry.connect(issuer).createInvoice(payer.address, inv.handle, inv.proof, (await now()) + DAY, "Big job")
    ).wait();
    await (await registry.connect(issuer).financeInvoice(0)).wait();

    // Issuer received the 85% advance immediately: 1000 * 8500 / 10000 = 850.
    expect(await decryptBalance(cusdtAddr, cusdt, issuer)).to.eq(850n);

    const financed = await registry.getInvoice(0);
    expect(financed.status).to.eq(1); // Financed
    expect(financed.recipient).to.eq(poolAddr);

    // Payer settles: 1000 routes to the pool, which releases the 13% reserve to the issuer.
    await (await registry.connect(payer).payInvoice(0)).wait();
    expect(await decryptBalance(cusdtAddr, cusdt, payer)).to.eq(0n);
    // Issuer now holds advance + rebate = 850 + 130 = 980 (pool kept 20 = the 2% fee).
    expect(await decryptBalance(cusdtAddr, cusdt, issuer)).to.eq(980n);

    const paid = await registry.getInvoice(0);
    expect(paid.status).to.eq(2); // Paid

    // LP's tracked deposit is still decryptable to 5000 (fee accrues to pool balance).
    const depHandle = await pool.depositOf(lp.address);
    expect(await fhevm.userDecryptEuint(FhevmType.euint64, depHandle, poolAddr, lp)).to.eq(5000n);
  });
});

async function now(): Promise<number> {
  const block = await ethers.provider.getBlock("latest");
  return block!.timestamp;
}
