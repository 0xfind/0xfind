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
  INonfungiblePositionManager,
  IERC20,
} from "../typechain";

import {
  DEFAULT_OSP_POOL_CONFIG_0,
  UNISWAP_V3_POSITIONS,
  deployAllContractWethFind,
  ZERO_ADDRESS,
} from "./share/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("OspPool.findOsp.init", function () {
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
  const osp1Params = {
    base: {
      name: "github.com/test/1",
      symbol: "0XTEST1",
      projectId: "github/1/1",
      stars: 1,
      poolConfigIndex: 0,
      nftPercentConfigIndex: 0,
    },
    deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
    signature: "",
  };
  let osp1: IERC20;

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

    // addOspPoolConfig 0
    await factoryContract
      .connect(deployWallet)
      .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);

    // create find pool
    await factoryContract.connect(deployWallet).createFindUniswapPool();

    osp1Params.signature = await signatureWallet.signMessage(
      ethers.utils.arrayify(
        ethers.utils.keccak256(
          ethers.utils.defaultAbiCoder.encode(
            [
              "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
              "uint256",
              "address",
            ],
            [osp1Params.base, osp1Params.deadline, userWallet.address]
          )
        )
      )
    );
    await factoryContract
      .connect(userWallet)
      .createOSPByProjectOwner(osp1Params);

    osp1 = (await ethers.getContractAt(
      "IERC20",
      await factoryContract.projectId2OspToken(osp1Params.base.projectId)
    )) as IERC20;
  });

  it("nft percent check", async function () {
    const nftPercentConfig0read = await factoryContract.nftPercentConfigs(0);
    expect(nftPercentConfig0read.cnft).eq(nftPercentConfig0.cnft);
    expect(nftPercentConfig0read.onft).eq(nftPercentConfig0.onft);
  });

  it("projectId2OspToken token2OspInfo ospLpTokenIdList", async function () {
    expect(await factoryContract.projectId2OspToken("x")).eq(ZERO_ADDRESS);
    expect(
      await factoryContract.projectId2OspToken(osp1Params.base.projectId)
    ).eq(osp1.address);

    const ifactory = (await ethers.getContractAt(
      "IFactory",
      factoryContract.address
    )) as IFactory;

    const ospInfo = await factoryContract.token2OspInfo(osp1.address);
    const iospInfo = await ifactory.token2OspInfo(osp1.address);

    expect(ospInfo.poolConfigIndex)
      .eq(ospInfo[0])
      .eq(iospInfo.poolConfigIndex)
      .eq(iospInfo[0])
      .eq(0);
    expect(ospInfo.stars)
      .eq(ospInfo[1])
      .eq(iospInfo.stars)
      .eq(iospInfo[1])
      .eq(osp1Params.base.stars);
    expect(ospInfo.pool)
      .eq(ospInfo[2])
      .eq(iospInfo.pool)
      .eq(iospInfo[2])
      .not.eq(ZERO_ADDRESS);
    expect(ospInfo.cnftTokenId)
      .eq(ospInfo[3])
      .eq(iospInfo.cnftTokenId)
      .eq(iospInfo[3])
      .eq(2);
    expect(ospInfo.onftTokenId)
      .eq(ospInfo[4])
      .eq(iospInfo.onftTokenId)
      .eq(iospInfo[4])
      .eq(3);
      expect(ospInfo.projectId)
      .eq(ospInfo[5])
      .eq(iospInfo.projectId)
      .eq(iospInfo[5])
      .eq(osp1Params.base.projectId);

    const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(
      osp1.address
    );
    const iospLpTokenIdList = await ifactory.ospLpTokenIdList(osp1.address);

    expect(ospLpTokenIdList.length).eq(iospLpTokenIdList.length).eq(7);
    expect(ospLpTokenIdList[0]).eq(iospLpTokenIdList[0]).not.eq(0);
    expect(ospLpTokenIdList[1]).eq(iospLpTokenIdList[1]).not.eq(0);
    expect(ospLpTokenIdList[2]).eq(iospLpTokenIdList[2]).not.eq(0);
    expect(ospLpTokenIdList[3]).eq(iospLpTokenIdList[3]).not.eq(0);
    expect(ospLpTokenIdList[4]).eq(iospLpTokenIdList[4]).not.eq(0);
    expect(ospLpTokenIdList[5]).eq(iospLpTokenIdList[5]).not.eq(0);
    expect(ospLpTokenIdList[6]).eq(iospLpTokenIdList[6]).not.eq(0);
  });

  it("osp pool info", async function () {
    const ospInfo = await factoryContract.token2OspInfo(osp1.address);
    const pool = ospInfo.pool;
    const ospPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      pool
    )) as IUniswapV3Pool;

    console.log("0 is find, 1 is osp");
    expect(await ospPool.fee())
      .eq(DEFAULT_OSP_POOL_CONFIG_0.fee)
      .eq(10000);
    expect(await ospPool.token0()).eq(findContract.address);
    expect(await ospPool.token1()).eq(osp1.address);

    expect(await findContract.balanceOf(ospPool.address)).eq(0);

    const tmp1 = await osp1.balanceOf(factoryContract.address);
    const tmp2 = await osp1.balanceOf(ospPool.address);
    expect(tmp1).lt(1000);
    expect(tmp2.add(tmp1)).eq(BigNumber.from(10).pow(18).mul(210_0000));
  });

  it("osp nft info", async function () {
    const ospInfo = await factoryContract.token2OspInfo(osp1.address);
    const cnftTokenId = ospInfo.cnftTokenId;
    const onftTokenId = ospInfo.onftTokenId;

    expect(cnftTokenId).eq(2);
    expect(onftTokenId).eq(3);

    expect(await findnftContract.ownerOf(cnftTokenId)).eq(userWallet.address);
    expect(await findnftContract.ownerOf(onftTokenId)).eq(earnContract.address);

    expect(await findnftContract.isClaimed(cnftTokenId)).eq(false);
    expect(await findnftContract.isClaimed(onftTokenId)).eq(false);

    const ifindnft = (await ethers.getContractAt(
      "IFindNFT",
      findnftContract.address
    )) as IFindNFT;
    const cinfo = await findnftContract.tokenId2Info(cnftTokenId);
    const oinfo = await findnftContract.tokenId2Info(onftTokenId);
    const icinfo = await ifindnft.tokenId2Info(cnftTokenId);
    const ioinfo = await ifindnft.tokenId2Info(onftTokenId);

    expect(cinfo.name)
      .eq(cinfo[0])
      .eq(icinfo.name)
      .eq(icinfo[0])
      .eq(osp1Params.base.name);
    expect(cinfo.symbol)
      .eq(cinfo[1])
      .eq(icinfo.symbol)
      .eq(icinfo[1])
      .eq(osp1Params.base.symbol);
    expect(cinfo.projectId)
      .eq(cinfo[2])
      .eq(icinfo.projectId)
      .eq(icinfo[2])
      .eq(osp1Params.base.projectId);
    expect(cinfo.stars)
      .eq(cinfo[3])
      .eq(icinfo.stars)
      .eq(icinfo[3])
      .eq(osp1Params.base.stars);
    expect(cinfo.token)
      .eq(cinfo[4])
      .eq(icinfo.token)
      .eq(icinfo[4])
      .eq(osp1.address);
    expect(cinfo.percent).eq(cinfo[5]).eq(icinfo.percent).eq(icinfo[5]).eq(500);
    expect(cinfo.isCnft).eq(cinfo[6]).eq(icinfo.isCnft).eq(icinfo[6]).eq(true);
    expect(cinfo.tokenId)
      .eq(cinfo[7])
      .eq(icinfo.tokenId)
      .eq(icinfo[7])
      .eq(cnftTokenId);

    expect(oinfo.name)
      .eq(oinfo[0])
      .eq(ioinfo.name)
      .eq(ioinfo[0])
      .eq(osp1Params.base.name);
    expect(oinfo.symbol)
      .eq(oinfo[1])
      .eq(ioinfo.symbol)
      .eq(ioinfo[1])
      .eq(osp1Params.base.symbol);
    expect(oinfo.projectId)
      .eq(oinfo[2])
      .eq(ioinfo.projectId)
      .eq(ioinfo[2])
      .eq(osp1Params.base.projectId);
    expect(oinfo.stars)
      .eq(oinfo[3])
      .eq(ioinfo.stars)
      .eq(ioinfo[3])
      .eq(osp1Params.base.stars);
    expect(oinfo.token)
      .eq(oinfo[4])
      .eq(ioinfo.token)
      .eq(ioinfo[4])
      .eq(osp1.address);
    expect(oinfo.percent).eq(oinfo[5]).eq(ioinfo.percent).eq(ioinfo[5]).eq(9500);
    expect(oinfo.isCnft).eq(oinfo[6]).eq(ioinfo.isCnft).eq(ioinfo[6]).eq(false);
    expect(oinfo.tokenId)
      .eq(oinfo[7])
      .eq(ioinfo.tokenId)
      .eq(ioinfo[7])
      .eq(onftTokenId);
  });

  it("osp lp token info", async function () {
    const ifactory = (await ethers.getContractAt(
        "IFactory",
        factoryContract.address
      )) as IFactory;

    let nonfungiblePositionManager = (await ethers.getContractAt(
      "INonfungiblePositionManager",
      UNISWAP_V3_POSITIONS
    )) as INonfungiblePositionManager;
    const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(
      osp1.address
    );
    expect(ospLpTokenIdList.length).eq(7);

    const ospInfo = await factoryContract.token2OspInfo(osp1.address);
    const config = await factoryContract.getOspPoolConfigs(ospInfo.poolConfigIndex);
    expect(ospInfo.poolConfigIndex).eq(0);

    for (let index = 0; index < ospLpTokenIdList.length; index++) {
      const tokenid = ospLpTokenIdList[index];

      let position = await nonfungiblePositionManager.positions(tokenid);

      console.log("0 is find, 1 is osp");
      expect(position.token0).eq(findContract.address);
      expect(position.token1).eq(osp1.address);
      expect(position.fee).eq(DEFAULT_OSP_POOL_CONFIG_0.fee).eq(config.fee).eq(10000);
    }
  });

});
