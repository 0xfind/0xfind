import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  Find,
} from "../typechain";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Find", function () {
  let wallets;
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let userWalletIndex = 1;
  let userWallet: SignerWithAddress;
  let mortgageMock: SignerWithAddress;
  let totalSupply = BigNumber.from(10).pow(18).mul(100_000_000_000);

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[deployWalletIndex];
    userWallet = wallets[userWalletIndex];
    mortgageMock = wallets[2];
  });

  describe("base", function() {
    let findContract: Find;
    before(async function () {
      // deploy find
      findContract = (await (
        await ethers.getContractFactory("Find")
      ).deploy(mortgageMock.address)) as Find;
    });

    it("find contract link address", async function () {
      expect(await findContract.mortgage()).eq(mortgageMock.address);
    });
  
    it("find contract init view", async function () {
      expect(await findContract.name()).eq("find");
      expect(await findContract.symbol()).eq("FIND");
      expect(await findContract.totalSupply()).eq(totalSupply);
      expect(await findContract.balanceOf(deployWallet.address)).eq(totalSupply);  
    });
  
    it("find contract role check", async function () {
      await expect(findContract.connect(userWallet).mint(1)).revertedWith("NR");
  
      await expect(findContract.connect(userWallet).burn(1)).revertedWith("NR");
    });

  });

  describe("find mint burn", function() {
    let findContract: Find;
    before(async function () {
      // deploy find
      findContract = (await (
        await ethers.getContractFactory("Find")
      ).deploy(mortgageMock.address)) as Find;
    });

    it("find mint burn", async function () {
      await findContract.connect(mortgageMock).mint(10);
      expect(await findContract.balanceOf(mortgageMock.address)).eq(10);
      await findContract.connect(mortgageMock).burn(2);
      expect(await findContract.balanceOf(mortgageMock.address)).eq(10 - 2);
      expect(await findContract.totalSupply()).eq(totalSupply.add(10).sub(2));
    });
  });
});
