import { ethers } from "hardhat";

async function getContractAddress(sender: string, nonce: number) {
  console.log("sender ", sender);
  console.log("nonce ", nonce);
  return ethers.utils.getContractAddress({
    from: sender, nonce: nonce
  });
}

async function main() {
    const wallets = await ethers.getSigners();
    const deployWallet = wallets[0];
    const nextNoice = await deployWallet.getTransactionCount();

    const find = await getContractAddress(deployWallet.address, nextNoice);
    const factory = await getContractAddress(deployWallet.address, nextNoice+1);
    const earn = await getContractAddress(deployWallet.address, nextNoice+2);
    const findnft = await getContractAddress(deployWallet.address, nextNoice+3);
    const math = await getContractAddress(deployWallet.address, nextNoice+4);
    const mortgage = await getContractAddress(deployWallet.address, nextNoice+5);
    const findnftRender = await getContractAddress(deployWallet.address, nextNoice+6);
    const mortgageRender = await getContractAddress(deployWallet.address, nextNoice+7);
    const mortgagePoolFactory = await getContractAddress(deployWallet.address, nextNoice+8);


    console.log("find ", find);
    console.log("factory ", factory);
    console.log("earn ", earn);
    console.log("findnft ", findnft);
    console.log("math ", math);
    console.log("mortgage ", mortgage);
    console.log("findnftRender ", findnftRender);
    console.log("mortgageRender ", mortgageRender);
    console.log("mortgagePoolFactory ", mortgagePoolFactory);

    const output = {
      find: find,
      factory: factory,
      earn: earn,
      findnft: findnft,
      math: math,
      mortgage: mortgage,
      findnftRender: findnftRender,
      mortgageRender: mortgageRender,
      mortgagePoolFactory: mortgagePoolFactory,
    }
    console.log(output);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
