import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { ethers, fhevm, deployments } from "hardhat";
import { expect } from "chai";
import { FhevmType } from "@fhevm/hardhat-plugin";
import { ConfidentialUSDT, InvoiceRegistry } from "../types";

const UNTIL = 2_000_000_000; // operator authorization deadline (uint48)

/**
 * Live end-to-end test against Sepolia — the exact path the frontend uses:
 * faucet -> encrypt amount (Relayer SDK) -> createInvoice -> user-decrypt -> pay.
 * Run: npx hardhat test test/CifraSepolia.ts --network sepolia
 */
describe("CifraSepolia (live)", function () {
  let cusdt: ConfidentialUSDT;
  let registry: InvoiceRegistry;
  let cusdtAddr: string;
  let registryAddr: string;
  let alice: HardhatEthersSigner; // issuer
  let bob: HardhatEthersSigner; // payer

  const log = (m: string) => console.log("   •", m);

  before(async function () {
    if (fhevm.isMock) {
      console.warn("CifraSepolia runs only on --network sepolia");
      this.skip();
    }
    cusdtAddr = (await deployments.get("ConfidentialUSDT")).address;
    registryAddr = (await deployments.get("InvoiceRegistry")).address;
    cusdt = await ethers.getContractAt("ConfidentialUSDT", cusdtAddr);
    registry = await ethers.getContractAt("InvoiceRegistry", registryAddr);

    const s = await ethers.getSigners();
    alice = s[0];
    bob = s[1];

    // Make sure the payer has gas for its 3 transactions.
    const bobBal = await ethers.provider.getBalance(bob.address);
    if (bobBal < ethers.parseEther("0.015")) {
      log(`funding payer ${bob.address} with 0.03 ETH for gas`);
      await (await alice.sendTransaction({ to: bob.address, value: ethers.parseEther("0.03") })).wait();
    }
  });

  async function decBal(who: HardhatEthersSigner): Promise<bigint> {
    const h = await cusdt.confidentialBalanceOf(who.address);
    if (h === ethers.ZeroHash) return 0n;
    return fhevm.userDecryptEuint(FhevmType.euint64, h, cusdtAddr, who);
  }

  it("faucet -> encrypt -> createInvoice -> decrypt(300) -> pay -> balances move", async function () {
    this.timeout(12 * 60000);

    log("payer mints 1000 cUSDT via faucet");
    await (await cusdt.connect(bob).faucet(1000)).wait();

    log("payer authorizes registry as ERC-7984 operator");
    await (await cusdt.connect(bob).setOperator(registryAddr, UNTIL)).wait();

    log("issuer encrypts amount 300 (Relayer SDK) and creates the invoice");
    const enc = await fhevm.createEncryptedInput(registryAddr, alice.address).add64(300).encrypt();
    const due = Math.floor(Date.now() / 1000) + 86400;
    await (
      await registry.connect(alice).createInvoice(bob.address, enc.handles[0], enc.inputProof, due, "Sepolia E2E")
    ).wait();
    const id = (await registry.nextId()) - 1n;
    log(`invoice #${id} created`);

    log("issuer user-decrypts the stored amount handle");
    const amtHandle = await registry.amountHandle(id);
    const clearAmount = await fhevm.userDecryptEuint(FhevmType.euint64, amtHandle, registryAddr, alice);
    log(`decrypted amount = ${clearAmount}`);
    expect(clearAmount).to.eq(300n);

    const aliceBefore = await decBal(alice);
    log(`issuer balance before = ${aliceBefore}`);

    log("payer settles the invoice in cUSDT");
    await (await registry.connect(bob).payInvoice(id)).wait();

    const inv = await registry.getInvoice(id);
    expect(inv.status).to.eq(2); // Paid
    log("invoice status = Paid");

    const aliceAfter = await decBal(alice);
    log(`issuer balance after = ${aliceAfter} (delta ${aliceAfter - aliceBefore})`);
    expect(aliceAfter - aliceBefore).to.eq(300n);
  });
});
