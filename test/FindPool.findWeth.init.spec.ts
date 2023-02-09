import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import {
  WETH,
  Find,
  Factory,
  Earn,
  Math,
  Mortgage,
  IUniswapV3Pool,
  FindNFT,
  IFactory,
  IFindNFT,
  INonfungiblePositionManager
} from "../typechain";

import { UNISWAP_V3_POSITIONS, deployAllContractWethFind, ZERO_ADDRESS } from "./share/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("FindPool.findWeth.init", function () {
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
  let nftPercentConfig0 = {
    cnft: 500,
    onft: 9500,
  };

  before(async function () {
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

    // init
    await findContract
      .connect(deployWallet)
      .transfer(factoryContract.address, await findContract.totalSupply());

    // add nftPercentConfig
    await factoryContract.addNFTPercentConfig(
      nftPercentConfig0.cnft,
      nftPercentConfig0.onft
    );

    // create find pool
    await factoryContract.connect(deployWallet).createFindUniswapPool();
  });

  it("nft percent check", async function () {
    const nftPercentConfig0read = await factoryContract.nftPercentConfigs(0);
    expect(nftPercentConfig0read.cnft).eq(nftPercentConfig0.cnft);
    expect(nftPercentConfig0read.onft).eq(nftPercentConfig0.onft);
  });

  it("factory findinfo findLpTokenIdList", async function () {
    const ifactory = (await ethers.getContractAt(
      "IFactory",
      factoryContract.address
    )) as IFactory;

    const findinfo = await factoryContract.findInfo();
    const ifindinfo = await ifactory.findInfo();

    expect(findinfo.token).eq(findinfo[0]).eq(ifindinfo.token).eq(ifindinfo[0]).eq(findContract.address);
    expect(findinfo.pool).eq(findinfo[1]).eq(ifindinfo.pool).eq(ifindinfo[1]).not.eq(ZERO_ADDRESS);
    expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(ifindinfo.cnftTokenId).eq(ifindinfo[2]).eq(0);
    expect(findinfo.onftTokenId).eq(findinfo[3]).eq(ifindinfo.onftTokenId).eq(ifindinfo[3]).eq(1);
    expect(findinfo.fee).eq(findinfo[4]).eq(ifindinfo.fee).eq(ifindinfo[4]).eq(100);

    const findLpTokenIdList = await factoryContract.findLpTokenIdList();
    const ifindLpTokenIdList = await ifactory.findLpTokenIdList();

    expect(findLpTokenIdList.length).eq(ifindLpTokenIdList.length).eq(1);
    expect(findLpTokenIdList[0]).eq(ifindLpTokenIdList[0]).not.eq(0);

  });

  it("find pool info", async function () {
    const findinfo = await factoryContract.findInfo();
    const pool = findinfo.pool;
    const findPool = (await ethers.getContractAt("IUniswapV3Pool", pool)) as IUniswapV3Pool;
    
    console.log("0 is find, 1 is weth");
    expect(await findPool.fee()).eq(findinfo.fee).eq(100);
    expect(await findPool.token0()).eq(findContract.address);
    expect(await findPool.token1()).eq(wethContract.address);

    expect(await wethContract.balanceOf(findPool.address)).eq(0)

    const tmp1 = await findContract.balanceOf(factoryContract.address);
    const tmp2 = await findContract.balanceOf(findPool.address);
    expect(tmp1).lt(1000);
    expect(tmp2.add(tmp1)).eq(BigNumber.from(10).pow(18).mul(1000_0000_0000))
  });

  it("find nft info", async function () {
    const findinfo = await factoryContract.findInfo();
    const cnftTokenId = findinfo.cnftTokenId;
    const onftTokenId = findinfo.onftTokenId;

    expect(cnftTokenId).eq(0);
    expect(onftTokenId).eq(1);

    expect(await findnftContract.ownerOf(cnftTokenId)).eq(await factoryContract.owner())
    expect(await findnftContract.ownerOf(onftTokenId)).eq(await factoryContract.owner())
    
    expect(await findnftContract.isClaimed(cnftTokenId)).eq(true)
    expect(await findnftContract.isClaimed(onftTokenId)).eq(true)

    const ifindnft = (await ethers.getContractAt(
      "IFindNFT",
      findnftContract.address
    )) as IFindNFT;
    const cinfo = await findnftContract.tokenId2Info(cnftTokenId);
    const oinfo = await findnftContract.tokenId2Info(onftTokenId);
    const icinfo = await ifindnft.tokenId2Info(cnftTokenId);
    const ioinfo = await ifindnft.tokenId2Info(onftTokenId);

    expect(cinfo.name).eq(cinfo[0]).eq(icinfo.name).eq(icinfo[0]).eq("github.com/0xfind");
    expect(cinfo.symbol).eq(cinfo[1]).eq(icinfo.symbol).eq(icinfo[1]).eq("0xHARBERGER");
    expect(cinfo.projectId).eq(cinfo[2]).eq(icinfo.projectId).eq(icinfo[2]).eq("github/105404818/000000");
    expect(cinfo.stars).eq(cinfo[3]).eq(icinfo.stars).eq(icinfo[3]).eq(1)
    expect(cinfo.token).eq(cinfo[4]).eq(icinfo.token).eq(icinfo[4]).eq(findContract.address)
    expect(cinfo.percent).eq(cinfo[5]).eq(icinfo.percent).eq(icinfo[5]).eq(500)
    expect(cinfo.isCnft).eq(cinfo[6]).eq(icinfo.isCnft).eq(icinfo[6]).eq(true)
    expect(cinfo.tokenId).eq(cinfo[7]).eq(icinfo.tokenId).eq(icinfo[7]).eq(cnftTokenId)

    expect(oinfo.name).eq(oinfo[0]).eq(ioinfo.name).eq(ioinfo[0]).eq("github.com/0xfind");
    expect(oinfo.symbol).eq(oinfo[1]).eq(ioinfo.symbol).eq(ioinfo[1]).eq("0xHARBERGER");
    expect(oinfo.projectId).eq(oinfo[2]).eq(ioinfo.projectId).eq(ioinfo[2]).eq("github/105404818/000000");
    expect(oinfo.stars).eq(oinfo[3]).eq(ioinfo.stars).eq(ioinfo[3]).eq(1)
    expect(oinfo.token).eq(oinfo[4]).eq(ioinfo.token).eq(ioinfo[4]).eq(findContract.address)
    expect(oinfo.percent).eq(oinfo[5]).eq(ioinfo.percent).eq(ioinfo[5]).eq(9500)
    expect(oinfo.isCnft).eq(oinfo[6]).eq(ioinfo.isCnft).eq(ioinfo[6]).eq(false)
    expect(oinfo.tokenId).eq(oinfo[7]).eq(ioinfo.tokenId).eq(ioinfo[7]).eq(onftTokenId)

  });

  it("find lp token info", async function () {
    let nonfungiblePositionManager = (await ethers.getContractAt(
      "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
    )) as INonfungiblePositionManager;
    const findLpTokenIdList = await factoryContract.findLpTokenIdList();
    const tokenid = findLpTokenIdList[0];
    
    let position = await nonfungiblePositionManager.positions(tokenid);

    console.log("0 is find, 1 is weth");
    expect(position.token0).eq(findContract.address)
    expect(position.token1).eq(wethContract.address)
    expect(position.fee).eq(100)

    expect(position.tickLower).eq(-69082);
    expect(position.tickUpper).eq(-69081);

  });

});
