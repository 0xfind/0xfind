import { expect } from "chai";
import { ethers } from "hardhat";

import { Factory,  Earn  } from "../typechain";

import { deployAllContractWethFind } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Factory", function () {
  let wallets: SignerWithAddress[];
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;
  let newSignatureWalletIndex = 3;
  let newSignatureWallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[deployWalletIndex];
    signatureWallet = wallets[signatureWalletIndex];
    userWallet = wallets[userWalletIndex];
    newSignatureWallet = wallets[newSignatureWalletIndex];
  });

  describe("base", function () {
    let factoryContract: Factory;
    let earnContract: Earn
  
    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
    });

    it("setSignatureAddress", async function () {
      await factoryContract.connect(deployWallet).setSignatureAddress(newSignatureWallet.address);
      expect(await factoryContract.signatureAddress()).eq(newSignatureWallet.address);

      await factoryContract.connect(deployWallet).setSignatureAddress(earnContract.address);
      expect(await factoryContract.signatureAddress()).eq(earnContract.address);

      expect(await factoryContract.disableSetSignatureAddressFlag()).eq(false);
      await factoryContract.connect(deployWallet).disableSetSignatureAddress();
      expect(await factoryContract.disableSetSignatureAddressFlag()).eq(true);
      await expect(
        factoryContract.connect(deployWallet).setSignatureAddress(newSignatureWallet.address)
      ).revertedWith("DE");
    });


  });
});
