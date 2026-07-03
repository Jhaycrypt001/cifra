import * as fs from "fs";
import * as path from "path";
import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

/**
 * Deploys the Cifra stack:
 *   1. ConfidentialUSDT (ERC-7984 cUSDT with faucet)
 *   2. InvoiceRegistry(cusdt)
 *   3. FinancingPool(cusdt)
 * then wires registry <-> pool and exports addresses for the frontend.
 *
 * On mainnet/Sepolia you may instead point the registry/pool at the official cUSDT from the
 * Confidential Token Registry by setting CUSDT_ADDRESS in the environment.
 */
const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;
  const { ethers } = hre;

  const existingCusdt = process.env.CUSDT_ADDRESS;
  let cusdtAddress: string;

  if (existingCusdt) {
    cusdtAddress = existingCusdt;
    console.log(`Using existing cUSDT at ${cusdtAddress}`);
  } else {
    const cusdt = await deploy("ConfidentialUSDT", { from: deployer, log: true });
    cusdtAddress = cusdt.address;
  }

  const registry = await deploy("InvoiceRegistry", {
    from: deployer,
    args: [cusdtAddress],
    log: true,
  });

  const pool = await deploy("FinancingPool", {
    from: deployer,
    args: [cusdtAddress],
    log: true,
  });

  // Wire registry <-> pool (idempotent).
  const registryC = await ethers.getContractAt("InvoiceRegistry", registry.address);
  const poolC = await ethers.getContractAt("FinancingPool", pool.address);

  if ((await registryC.pool()).toLowerCase() !== pool.address.toLowerCase()) {
    await (await registryC.setPool(pool.address)).wait();
    console.log("registry.setPool ->", pool.address);
  }
  if ((await poolC.registry()).toLowerCase() !== registry.address.toLowerCase()) {
    await (await poolC.setRegistry(registry.address)).wait();
    console.log("pool.setRegistry ->", registry.address);
  }

  // Export addresses for the frontend.
  const net = await ethers.provider.getNetwork();
  const out = {
    chainId: Number(net.chainId),
    network: hre.network.name,
    cUSDT: cusdtAddress,
    InvoiceRegistry: registry.address,
    FinancingPool: pool.address,
  };
  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `addresses.${hre.network.name}.json`), JSON.stringify(out, null, 2));
  console.log("Cifra deployed:", out);
};

export default func;
func.id = "deploy_cifra";
func.tags = ["Cifra"];
