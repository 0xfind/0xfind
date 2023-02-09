import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const factory = await ethers.getContractFactory("Find");
  const con = await factory.deploy(addresses.mortgage, {
    maxFeePerGas: config.maxFeePerGas,
    maxPriorityFeePerGas: config.maxPriorityFeePerGas,
    nonce: config.nonce0
  });

  await con.deployed();

  console.log("Find deployed to:", con.address);
  expect(con.address).eq(addresses.find);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
