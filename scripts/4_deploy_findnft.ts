import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const fac = await ethers.getContractFactory("FindNFT");
  const con = await fac.deploy(
    addresses.factory,
    addresses.earn,
    addresses.findnftRender, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 3
    }
  );

  await con.deployed();

  console.log("FindNFT deployed to:", con.address);
  expect(addresses.findnft).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
