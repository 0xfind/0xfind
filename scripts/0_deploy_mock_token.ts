import { ethers } from "hardhat";

async function main() {
  const weth = await (await ethers.getContractFactory("WETH")).deploy();
  await weth.deployed();
  console.log("weth deployed to:", weth.address);

  const dai = await (await ethers.getContractFactory("DAI")).deploy();
  await dai.deployed();
  console.log("dai deployed to:", dai.address);

  const usdt = await (await ethers.getContractFactory("USDT")).deploy();
  await usdt.deployed();
  console.log("usdt deployed to:", usdt.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
