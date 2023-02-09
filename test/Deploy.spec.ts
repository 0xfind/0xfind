import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  WETH,
  Find,
  Factory,
  Earn,
  Math,
  Mortgage,
  FindNFT,
  IFactory,
  FindNFTRender,
  MortgageRender,
  MortgagePoolFactory,
} from "../typechain";

import { deployAllContractWethFind, DEFAULT_OSP_POOL_CONFIG_0, ZERO_ADDRESS } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("Deploy", function () {
  let wallets;
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;

  let contractAddresses: any;

  let wethContract: WETH;
  let findContract: Find;
  let factoryContract: Factory;
  let earnContract: Earn;
  let findnftContract: FindNFT;
  let mathContract: Math;
  let mortgageContract: Mortgage;
  let findNFTRenderContract: FindNFTRender;
  let mortgageRenderContract: MortgageRender;
  let mortgagePoolFactoryContract: MortgagePoolFactory

  before(async function() {
    let allInfo = await deployAllContractWethFind();

    wallets = allInfo.wallets;
    deployWalletIndex = allInfo.deployWalletIndex;
    deployWallet = allInfo.deployWallet;
    signatureWalletIndex = allInfo.signatureWalletIndex;
    signatureWallet = allInfo.signatureWallet;
    userWalletIndex = allInfo.userWalletIndex;
    userWallet = allInfo.userWallet;
    contractAddresses = allInfo.contractAddresses;
    wethContract = allInfo.wethContract;
    findContract = allInfo.findContract;
    factoryContract = allInfo.factoryContract;
    earnContract = allInfo.earnContract;
    findnftContract = allInfo.findnftContract;
    mathContract = allInfo.mathContract;
    mortgageContract = allInfo.mortgageContract;
    findNFTRenderContract = allInfo.findNFTRenderContract;
    mortgageRenderContract = allInfo.mortgageRenderContract;
    mortgagePoolFactoryContract = allInfo.mortgagePoolFactoryContract
  })

  it("contract pre address", async function () {
    expect(findContract.address).eq(contractAddresses.find);
    expect(wethContract.address).eq(contractAddresses.weth);
    expect(factoryContract.address).eq(contractAddresses.factory);
    expect(earnContract.address).eq(contractAddresses.earn);
    expect(findnftContract.address).eq(contractAddresses.findnft);
    expect(mathContract.address).eq(contractAddresses.math);
    expect(mortgageContract.address).eq(contractAddresses.mortgage);
    expect(findNFTRenderContract.address).eq(contractAddresses.findNFTRender);
    expect(mortgageRenderContract.address).eq(contractAddresses.mortgageRender);
    expect(mortgagePoolFactoryContract.address).eq(contractAddresses.mortgagePoolFactory);
  });

  it("find contract link address", async function () {
    expect(await findContract.mortgage()).eq(mortgageContract.address);
  });

  it("factory contract link address", async function () {
    expect((await factoryContract.findInfo()).token).eq(findContract.address);
    expect(await factoryContract.weth()).eq(wethContract.address);
    expect(await factoryContract.earn()).eq(earnContract.address);
    expect(await factoryContract.findnft()).eq(findnftContract.address);
    expect(await factoryContract.mortgage()).eq(mortgageContract.address);
    expect(await factoryContract.mortgagePoolFactory()).eq(mortgagePoolFactoryContract.address);
    expect(await factoryContract.math()).eq(mathContract.address);
    expect(await factoryContract.signatureAddress()).eq(signatureWallet.address);    
    expect(await factoryContract.owner()).eq(deployWallet.address);
  });

  it("earn contract link address", async function () {
    expect(await earnContract.find()).eq(findContract.address);
    expect(await earnContract.factory()).eq(factoryContract.address);
    expect(await earnContract.findnft()).eq(findnftContract.address);
    expect(await earnContract.signatureAddress()).eq(signatureWallet.address);
    expect(await earnContract.owner()).eq(deployWallet.address);
  });

  it("findnft contract link address", async function () {
    expect(await findnftContract.factory()).eq(factoryContract.address);
    expect(await findnftContract.earn()).eq(earnContract.address);
    expect(await findnftContract.findnftRender()).eq(findNFTRenderContract.address);
    expect(await findnftContract.owner()).eq(deployWallet.address);
  });

  it("math contract link address", async function () {
    expect(await mathContract.find()).eq(findContract.address);
    expect(await mathContract.factory()).eq(factoryContract.address);
    expect(await mathContract.mortgageAddress()).eq(mortgageContract.address);
  });

  it("mortgage contract link address", async function () {
    expect(await mortgageContract.find()).eq(findContract.address);
    expect(await mortgageContract.factory()).eq(factoryContract.address);
    expect(await mortgageContract.earn()).eq(earnContract.address);
    expect(await mortgageContract.math()).eq(mathContract.address);
    expect(await mortgageContract.owner()).eq(deployWallet.address);
  });

  it("findNFTRender contract link address", async function () {
    expect(await findNFTRenderContract.factory()).eq(factoryContract.address);
    expect(await findNFTRenderContract.findnft()).eq(findnftContract.address);
  });

  it("mortgageRender contract link address", async function () {
    expect(await mortgageRenderContract.mortgage()).eq(mortgageContract.address);
  });

  it("mortgagePoolFactory contract link address", async function () {
    expect(await mortgagePoolFactoryContract.factory()).eq(factoryContract.address);
  });

  it("find contract init view", async function () {
    expect(await findContract.name()).eq("find");
    expect(await findContract.symbol()).eq("FIND");
    expect(await findContract.totalSupply()).eq(BigNumber.from(10).pow(18).mul(100_000_000_000));
    expect(await findContract.balanceOf(deployWallet.address)).eq(BigNumber.from(10).pow(18).mul(100_000_000_000));
  });

  it("factory contract init view", async function () {
    expect((await factoryContract.findInfo()).fee).eq(100);
  });

  it("findnft contract init view", async function () {
    expect(await findnftContract.name()).eq("Harberger Tax");
    expect(await findnftContract.symbol()).eq("HBGTAX");
    expect(await findnftContract.totalSupply()).eq(0);
  });

  it("mortgage contract init view", async function () {
    expect(await mortgageContract.mortgageFee()).eq(5000);
  });

  it("find contract role check", async function () {
    await expect(
      findContract.connect(userWallet).mint(1)
    ).revertedWith("NR");

    await expect(
      findContract.connect(userWallet).burn(1)
    ).revertedWith("NR");
  });

  it("factory contract role check", async function () {
    await expect(
      factoryContract.connect(userWallet).renounceOwnership()
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      factoryContract.connect(userWallet).transferOwnership(userWallet.address)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      factoryContract.connect(userWallet).setSignatureAddress(userWallet.address)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      factoryContract.connect(userWallet).createFindUniswapPool()
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      factoryContract.connect(userWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      factoryContract.connect(userWallet).addNFTPercentConfig(1000,9000)
    ).revertedWith("Ownable: caller is not the owner");

  });

  it("earn contract role check", async function () {
    await expect(
      earnContract.connect(userWallet).renounceOwnership()
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      earnContract.connect(userWallet).transferOwnership(userWallet.address)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      earnContract.connect(userWallet).setSignatureAddress(userWallet.address)
    ).revertedWith("Ownable: caller is not the owner");

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
        owner: ZERO_ADDRESS
      })
    ).revertedWith("onlyFactory");

    await expect(
      findnftContract.connect(userWallet).claim(1)
    ).revertedWith("onlyEarn");

  });

  it("mortgage contract role check", async function () {
    await expect(
      mortgageContract.connect(userWallet).renounceOwnership()
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      mortgageContract.connect(userWallet).transferOwnership(userWallet.address)
    ).revertedWith("Ownable: caller is not the owner");

    await expect(
      mortgageContract.connect(userWallet).setMortgageFee(10000)
    ).revertedWith("Ownable: caller is not the owner");
  });

  it("factory empty findinfo", async function () {
    const findinfo = await factoryContract.findInfo();
    const findLpTokenIdList = await factoryContract.findLpTokenIdList();
    expect(findinfo.token).eq(findinfo[0]).eq(findContract.address);
    expect(findinfo.pool).eq(findinfo[1]).eq(ZERO_ADDRESS);
    expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(0);
    expect(findinfo.onftTokenId).eq(findinfo[3]).eq(0);
    expect(findinfo.fee).eq(findinfo[4]).eq(100);
    expect(findLpTokenIdList.length).eq(0);
  });

  it("ifactory empty findinfo", async function () {
    const ifactory = (await ethers.getContractAt(
      "IFactory",
      factoryContract.address
    )) as IFactory;

    const findinfo = await ifactory.findInfo();
    const findLpTokenIdList = await ifactory.findLpTokenIdList();

    expect(findinfo.token).eq(findinfo[0]).eq(findContract.address);
    expect(findinfo.pool).eq(findinfo[1]).eq(ZERO_ADDRESS);
    expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(0);
    expect(findinfo.onftTokenId).eq(findinfo[3]).eq(0);
    expect(findinfo.fee).eq(findinfo[4]).eq(100);
    expect(findLpTokenIdList.length).eq(0);
  });

});
