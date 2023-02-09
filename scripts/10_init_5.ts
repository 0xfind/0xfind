import { ethers } from "hardhat";

import { Earn } from "../typechain";
import addresses from "./addresses.json";
import config from "./config.json";

async function collect() {
  const earnCon = (await ethers.getContractAt("Earn", addresses.earn)) as Earn;

  await earnCon.collectOspUniswapLPFee("osp token address", {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });

  await earnCon.collectFindUniswapLPFee({
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  await earnCon.collectForBuilder(addresses.find, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  await earnCon.collectForBuilder(addresses.weth, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
}

async function main() {
  await collect();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
