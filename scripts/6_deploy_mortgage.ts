import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const fac = await ethers.getContractFactory("Mortgage");
  const con = await fac.deploy(
    addresses.find,
    addresses.factory,
    addresses.earn,
    addresses.math,
    addresses.mortgageRender, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 5
    }
  );

  await con.deployed();

  console.log("Mortgage deployed to:", con.address);
  expect(addresses.mortgage).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
