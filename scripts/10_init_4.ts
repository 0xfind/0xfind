import { ethers } from "hardhat";

import { FindNFT } from "../typechain";
import addresses from "./addresses.json";
import config from "./config.json";

async function transferpnft() {
  const wallets = await ethers.getSigners();
  const deployWallet = wallets[0];

  const findnftCon = (await ethers.getContractAt("FindNFT", addresses.findnft)) as FindNFT;

  await findnftCon.connect(deployWallet).transferFrom(
    deployWallet.address,
    addresses.pcnftOwner,
    0, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas
    }
  );
  console.log("findnft cnft transferFrom:", addresses.pcnftOwner);

  await findnftCon.connect(deployWallet).transferFrom(
    deployWallet.address,
    addresses.ponftOwner,
    1, {
      maxFeePerGas: config.maxFeePerGas,
      maxPriorityFeePerGas: config.maxPriorityFeePerGas
    }
  );
  console.log("findnft onft transferFrom:", addresses.ponftOwner);
}

async function main() {
  await transferpnft();
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
