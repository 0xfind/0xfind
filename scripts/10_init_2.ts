import { ethers } from "hardhat";
import { Factory } from "../typechain";
import addresses from "./addresses.json";
import config from "./config.json";

async function createFindPool() {
  const fac = (await ethers.getContractAt(
    "Factory",
    addresses.factory
  )) as Factory;

  await fac.createFindUniswapPool({
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("createFindUniswapPool");
}

async function main() {
  await createFindPool();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
