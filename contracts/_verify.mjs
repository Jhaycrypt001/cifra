import { ethers } from "ethers";
const p = new ethers.JsonRpcProvider("https://ethereum-sepolia-rpc.publicnode.com");
const A = {
  cUSDT: "0xCd5D11A2C90154ad21294eed1773a35A858c0b0c",
  registry: "0x2C86415F2932072DED862Fc05483EfD9eCDeE1C5",
  pool: "0x7Cd12479422AB9A8441F64d2cbDbec2f4e966810",
};
const cusdt = new ethers.Contract(A.cUSDT, ["function name() view returns(string)","function symbol() view returns(string)","function decimals() view returns(uint8)"], p);
const reg = new ethers.Contract(A.registry, ["function cusdt() view returns(address)","function pool() view returns(address)","function owner() view returns(address)","function nextId() view returns(uint256)"], p);
const pool = new ethers.Contract(A.pool, ["function cusdt() view returns(address)","function registry() view returns(address)","function owner() view returns(address)","function feeBps() view returns(uint64)","function maxAdvance() view returns(uint64)"], p);

const ok = (b) => b ? "PASS" : "FAIL";
const code = async (a) => (await p.getCode(a)).length > 2;

console.log("== bytecode deployed ==");
console.log("cUSDT   ", ok(await code(A.cUSDT)));
console.log("registry", ok(await code(A.registry)));
console.log("pool    ", ok(await code(A.pool)));

console.log("== token metadata ==");
console.log("name    ", await cusdt.name());
console.log("symbol  ", await cusdt.symbol());
console.log("decimals", (await cusdt.decimals()).toString());

console.log("== wiring ==");
const rC = await reg.cusdt(), rP = await reg.pool(), pC = await pool.cusdt(), pR = await pool.registry();
console.log("registry.cusdt == cUSDT   ", ok(rC.toLowerCase()===A.cUSDT.toLowerCase()));
console.log("registry.pool  == pool    ", ok(rP.toLowerCase()===A.pool.toLowerCase()));
console.log("pool.cusdt     == cUSDT   ", ok(pC.toLowerCase()===A.cUSDT.toLowerCase()));
console.log("pool.registry  == registry", ok(pR.toLowerCase()===A.registry.toLowerCase()));

console.log("== params / owners ==");
console.log("registry.owner ", await reg.owner());
console.log("pool.owner     ", await pool.owner());
console.log("registry.nextId", (await reg.nextId()).toString(), "(invoices created so far)");
console.log("pool.feeBps    ", (await pool.feeBps()).toString(), "(2.00%)");
console.log("pool.maxAdvance", (await pool.maxAdvance()).toString());
