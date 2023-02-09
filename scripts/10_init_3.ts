import { ethers } from "hardhat";

import { Factory, Earn, Mortgage, FindNFT } from "../typechain";
import addresses from "./addresses.json";
import config from "./config.json";

async function transferOwnership() {
  const fac = (await ethers.getContractAt(
    "Factory",
    addresses.factory
  )) as Factory;
  await fac.transferOwnership(addresses.owner, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Factory transferOwnership:", addresses.owner);

  const earnCon = (await ethers.getContractAt("Earn", addresses.earn)) as Earn;
  await earnCon.transferOwnership(addresses.owner, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Earn transferOwnership:", addresses.owner);

  const findnftCon = (await ethers.getContractAt("FindNFT", addresses.findnft)) as FindNFT;
  await findnftCon.transferOwnership(addresses.owner, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("findnft transferOwnership:", addresses.owner);

  const mortgageCon = (await ethers.getContractAt(
    "Mortgage",
    addresses.mortgage
  )) as Mortgage;
  await mortgageCon.transferOwnership(addresses.owner, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas
  });
  console.log("Mortgage transferOwnership:", addresses.owner);
}

async function main() {
  await transferOwnership();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
