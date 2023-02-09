import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const render = await ethers.getContractFactory("FindNFTRender");
  const con = await render.deploy(
    addresses.factory,
    addresses.findnft, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 6
    }
  );

  await con.deployed();

  console.log("FindNFTRender deployed to:", con.address);
  expect(addresses.findnftRender).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
