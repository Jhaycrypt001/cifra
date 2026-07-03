import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ConfidentialUSDT, InvoiceRegistry, FinancingPool } from "../types";

/**
 * Live verification against Sepolia. Run:
 *   npx hardhat test test/CifraSepolia.ts --network sepolia
 * (The FHEVM plugin only initializes under `hardhat test`, not `hardhat run`.)
 */
describe("CifraSepolia (live)", function () {
  let cusdt: ConfidentialUSDT;
  let registry: InvoiceRegistry;
  let pool: FinancingPool;
  let cusdtAddr: string;
  let registryAddr: string;
  let poolAddr: string;
  let alice: HardhatEthersSigner;

  const log = (m: string) => console.log("   •", m);

  before(async function () {
    if (fhevm.isMock) {
      console.warn("CifraSepolia runs only on --network sepolia");
      this.skip();
    }
    cusdtAddr = (await deployments.get("ConfidentialUSDT")).address;
    registryAddr = (await deployments.get("InvoiceRegistry")).address;
    poolAddr = (await deployments.get("FinancingPool")).address;
    cusdt = await ethers.getContractAt("ConfidentialUSDT", cusdtAddr);
    registry = await ethers.getContractAt("InvoiceRegistry", registryAddr);
    pool = await ethers.getContractAt("FinancingPool", poolAddr);
    [alice] = await ethers.getSigners();
  });

  it("on-chain state: metadata, wiring, params", async function () {
    this.timeout(60000);
    expect(await cusdt.name()).to.eq("Confidential USD");
    expect(await cusdt.symbol()).to.eq("cUSDT");
    expect(await cusdt.decimals()).to.eq(6);

    expect((await registry.cusdt()).toLowerCase()).to.eq(cusdtAddr.toLowerCase());
    expect((await registry.pool()).toLowerCase()).to.eq(poolAddr.toLowerCase());
    expect((await pool.cusdt()).toLowerCase()).to.eq(cusdtAddr.toLowerCase());
    expect((await pool.registry()).toLowerCase()).to.eq(registryAddr.toLowerCase());
    expect(await pool.feeBps()).to.eq(200n);
    log("metadata + wiring + params all correct");
  });

  it("FHE roundtrip: encrypt -> createInvoice -> user-decrypt == 300", async function () {
    this.timeout(25 * 60000);

    log("encrypting amount 300 via Relayer SDK...");
    const enc = await fhevm.createEncryptedInput(registryAddr, alice.address).add64(300).encrypt();
    log(`encrypted, handle=${ethers.hexlify(enc.handles[0])}`);

    log("submitting createInvoice (self-invoice)...");
    const due = Math.floor(Date.now() / 1000) + 86400;
    const tx = await registry
      .connect(alice)
      .createInvoice(alice.address, enc.handles[0], enc.inputProof, due, "Sepolia FHE proof");
    await tx.wait();
    const id = (await registry.nextId()) - 1n;
    log(`invoice #${id} confirmed (tx ${tx.hash})`);

    log("user-decrypting via KMS (startTimestamp backdated 300s, matches frontend fix)...");
    const amtHandle = await registry.amountHandle(id);
    const startTimestamp = Math.floor(Date.now() / 1000) - 300;
    const clear = await fhevm.userDecryptEuint(FhevmType.euint64, amtHandle, registryAddr, alice, {
      validity: { startTimestamp, durationDays: 7 },
    });
    log(`decrypted amount = ${clear}`);
    expect(clear).to.eq(300n);
    log("✅ FHE encrypt/createInvoice/decrypt verified on live Sepolia");
  });
});
