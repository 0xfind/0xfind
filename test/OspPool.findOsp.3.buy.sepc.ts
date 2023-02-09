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
  ISwapRouter02,
} from "../typechain";

import { FeeAmount } from "@uniswap/v3-sdk";

import {
  UNISWAP_ROUTER,
  DEFAULT_OSP_POOL_CONFIG_3,
  UNISWAP_V3_POSITIONS,
  deployAllContractWethFind,
  ZERO_ADDRESS,
} from "./share/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("OspPool.findOsp.buy", function () {
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
  let swapRouter: ISwapRouter02;

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
      .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_3);

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

    swapRouter = (await ethers.getContractAt(
      "ISwapRouter02",
      UNISWAP_ROUTER
    )) as ISwapRouter02;

    await wethContract
      .connect(deployWallet)
      .approve(swapRouter.address, await findContract.totalSupply());

    const buyFind = async function (
      amountOut: BigNumber
    ): Promise<{ find: BigNumber; weth: BigNumber }> {
      const find1 = await findContract.balanceOf(deployWallet.address);
      const weth1 = await wethContract.balanceOf(deployWallet.address);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: wethContract.address,
        tokenOut: findContract.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: amountOut,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      const find2 = await findContract.balanceOf(deployWallet.address);
      const weth2 = await wethContract.balanceOf(deployWallet.address);
      return {
        find: find2.sub(find1),
        weth: weth1.sub(weth2),
      };
    };
    await buyFind(BigNumber.from(10).pow(18).mul(950_0000_0000));
  });

  it("buy", async function () {
    const ospInfo = await factoryContract.token2OspInfo(osp1.address);
    const config = await factoryContract.getOspPoolConfigs(ospInfo.poolConfigIndex);
    const pool = (await ethers.getContractAt("IUniswapV3Pool", ospInfo.pool)) as IUniswapV3Pool;
    
    console.log("0 is find, 1 is osp");
    expect(await pool.fee()).eq(config.fee).eq(10000);
    expect(await pool.token0()).eq(findContract.address);
    expect(await pool.token1()).eq(osp1.address);

    const buyOspCallStatic = async function (
      amountOut: BigNumber
    ): Promise<{ find: BigNumber; osp: BigNumber }> {
      const amountIn = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: amountOut,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      return {
        find: amountIn,
        osp: amountOut,
      };
    };

    const buyOsp = async function (
        amountOut: BigNumber
      ): Promise<{ find: BigNumber; osp: BigNumber }> {
        const find1 = await findContract.balanceOf(deployWallet.address);
        const osp1_1 = await osp1.balanceOf(deployWallet.address);
        await swapRouter.connect(deployWallet).exactOutputSingle({
          tokenIn: findContract.address,
          tokenOut: osp1.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountOut: amountOut,
          amountInMaximum: await findContract.totalSupply(),
          sqrtPriceLimitX96: 0,
        });
        const find2 = await findContract.balanceOf(deployWallet.address);
        const osp1_2 = await osp1.balanceOf(deployWallet.address);
        return {
          find: find1.sub(find2),
          osp: osp1_2.sub(osp1_1),
        };
      };

    const osp1TotalSupply = await osp1.totalSupply();
    const osp1Amount1 = BigNumber.from(10).pow(18).mul(10000);
    await findContract.connect(deployWallet).approve(swapRouter.address, await findContract.totalSupply());
    // buy 1 osp
    const buy1info1 = await buyOspCallStatic(BigNumber.from(10).pow(18).mul(1));
    console.log(buy1info1.find.mul(99).div(100).toString())

    // buy 210_0000
    await buyOsp(osp1Amount1.mul(210))
    console.log("============= buy 210_0000 =============")
    const buy1info2 = await buyOspCallStatic(BigNumber.from(10).pow(18).mul(1));
    console.log(buy1info2.find.mul(99).div(100).toString())

    // buy 420_0000
    await buyOsp(osp1Amount1.mul(210))
    console.log("============= buy 420_0000 =============")
    const buy1info3 = await buyOspCallStatic(BigNumber.from(10).pow(18).mul(1));
    console.log(buy1info3.find.mul(99).div(100).toString())

    // buy 670_0000
    await buyOsp(osp1Amount1.mul(250))
    console.log("============= buy 670_0000 =============")
    const buy1info4 = await buyOspCallStatic(BigNumber.from(10).pow(18).mul(1));
    console.log(buy1info4.find.mul(99).div(100).toString())

    // buy 671_0000
    await buyOsp(osp1Amount1.mul(1))
    console.log("============= buy 671_0000 =============")
    const buy1info5 = await buyOspCallStatic(BigNumber.from(10).pow(18).mul(1));
    console.log(buy1info5.find.mul(99).div(100).toString())

  });
});
