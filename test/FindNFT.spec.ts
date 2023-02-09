import { expect } from "chai";

import { ethers } from "hardhat";

import { FindNFT, IFindNFT, Factory, Earn, FindNFTRender } from "../typechain";

import { ZERO_ADDRESS, deployAllContractWethFind } from "./share/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("FindNFT", function () {
  let wallets: SignerWithAddress[];
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let userWalletIndex = 1;
  let userWallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[deployWalletIndex];
    userWallet = wallets[userWalletIndex];
  });

  describe("base", function () {
    let findnftContract: FindNFT;
    let factoryContract: Factory;
    let earnContract: Earn;
    let findNFTRender: FindNFTRender
  
    before(async function () {
      let allInfo = await deployAllContractWethFind();
      findnftContract = allInfo.findnftContract;
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findNFTRender = allInfo.findNFTRenderContract;
    });

    it("findnft contract init view", async function () {
      expect(await findnftContract.name()).eq("Harberger Tax");
      expect(await findnftContract.symbol()).eq("HBGTAX");
      expect(await findnftContract.totalSupply()).eq(0);
    });

    it("findnft contract link address", async function () {
      expect(await findnftContract.earn()).eq(earnContract.address);
      expect(await findnftContract.factory()).eq(factoryContract.address);
      expect(await findnftContract.findnftRender()).eq(findNFTRender.address)
    });

    it("findnft contract change owner", async function () {
      expect(await findnftContract.owner()).eq(deployWallet.address);

      await expect(
        findnftContract.connect(userWallet).setFindnftRender(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");

      expect(await findnftContract.findnftRender()).eq(findNFTRender.address);
      await findnftContract.connect(deployWallet).setFindnftRender(userWallet.address);
      expect(await findnftContract.findnftRender()).eq(userWallet.address);

      await expect(
        findnftContract.connect(userWallet).renounceOwnership()
      ).revertedWith("Ownable: caller is not the owner");
  
      await expect(
        findnftContract.connect(userWallet).transferOwnership(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");

      await findnftContract.connect(deployWallet).transferOwnership(userWallet.address);
      expect(await findnftContract.owner()).eq(userWallet.address);
      await findnftContract.connect(userWallet).renounceOwnership();
      expect(await findnftContract.owner()).eq(ZERO_ADDRESS);
    });

    it("findnft contract role check", async function () {
      await expect(
        findnftContract.connect(userWallet).mint({
          name: "name",
          symbol: "symbol",
          projectId: "id",
          stars: 1,
          token: ZERO_ADDRESS,
          percent: 5,
          isCnft: true,
          owner: ZERO_ADDRESS,
        })
      ).revertedWith("onlyFactory");

      await expect(findnftContract.connect(userWallet).claim(1)).revertedWith(
        "onlyEarn"
      );
    });
  });
});
