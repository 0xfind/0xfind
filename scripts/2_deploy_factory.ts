import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const factory = await ethers.getContractFactory("Factory");
  const con = await factory.deploy(
    addresses.find, 
    addresses.weth, 
    addresses.earn, 
    addresses.findnft,
    addresses.mortgage,
    addresses.mortgagePoolFactory,
    addresses.math,
    addresses.signatureAddress, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 1
    }
  );

  await con.deployed();

  console.log("Factory deployed to:", con.address);
  expect(addresses.factory).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
