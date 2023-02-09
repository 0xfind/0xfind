import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Find, Factory } from "../typechain";
import addresses from "./addresses.json";
import config from "./config.json";

async function initFactory() {
  const findCon = (await ethers.getContractAt("Find", addresses.find)) as Find;

  const fac = (await ethers.getContractAt(
    "Factory",
    addresses.factory
  )) as Factory;

  await findCon.transfer(addresses.factory, await findCon.totalSupply(),{
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Factory transfer");

  const nftConfig = {
    cnft: 500,
    onft: 9500,
  };
  await fac.addNFTPercentConfig(nftConfig.cnft, nftConfig.onft,{
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Factory addNFTPercentConfig");

  const config0 = {
    fee: 10000,
    ospFindPool: {
      initSqrtPriceX96: BigNumber.from("78831026366734652303669917531"),
      positions: [
        { tickLower: 0, tickUpper: 4000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
        { tickLower: 4000, tickUpper: 23000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
        { tickLower: 23000, tickUpper: 46000, amount: BigNumber.from(10).pow(18).mul(2600_000) }
      ],
    },
    findOspPool: {
      initSqrtPriceX96: BigNumber.from("79627299360338032760430980940"),
      positions: [
        { tickLower: -46000, tickUpper: -23000, amount: BigNumber.from(10).pow(18).mul(2600_000) },
        { tickLower: -23000, tickUpper: -4000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
        { tickLower: -4000, tickUpper: 0, amount: BigNumber.from(10).pow(18).mul(2100_000) },
      ],
    },
  };
  await fac.addOspPoolConfig(config0,{
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Factory addOspPoolConfig");
}

async function main() {
  await initFactory();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
