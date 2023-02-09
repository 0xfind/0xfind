import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const fac = await ethers.getContractFactory("Earn");
  const con = await fac.deploy(
    addresses.find,
    addresses.factory,
    addresses.findnft,
    addresses.signatureAddress, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 2
    }
  );

  await con.deployed();

  console.log("Earn deployed to:", con.address);
  expect(addresses.earn).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
