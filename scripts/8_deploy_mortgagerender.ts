import { expect } from "chai";
import { ethers } from "hardhat";
import addresses from "./addresses.json";
import config from "./config.json";

async function main() {
  const render = await ethers.getContractFactory("MortgageRender");
  const con = await render.deploy(
    addresses.mortgage, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas,
      nonce: config.nonce0 + 7
    }
  );

  await con.deployed();

  console.log("MortgageRender deployed to:", con.address);
  expect(addresses.mortgageRender).eq(con.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
