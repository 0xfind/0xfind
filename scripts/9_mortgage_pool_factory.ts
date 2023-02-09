import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const fac = await ethers.getContractFactory("MortgagePoolFactory");
  const con = await fac.deploy(
    addresses.factory, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 8
    }
  );

  await con.deployed();

  console.log("MortgagePoolFactory deployed to:", con.address);
  expect(addresses.mortgagePoolFactory).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
