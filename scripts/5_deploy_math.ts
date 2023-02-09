import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const fac = await ethers.getContractFactory("Math");
  const con = await fac.deploy(
    addresses.find,
    addresses.factory,
    addresses.mortgage, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 4
    }
  );

  await con.deployed();

  console.log("Math deployed to:", con.address);
  expect(con.address).eq(addresses.math);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
