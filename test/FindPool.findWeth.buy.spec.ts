import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { FeeAmount } from "@uniswap/v3-sdk";

import {
  WETH,
  Find,
  Factory,
  IUniswapV3Pool,
  ISwapRouter02,
} from "../typechain";

import {
  UNISWAP_ROUTER,
  deployAllContractWethFind,
} from "./share/utils";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";

describe("FindPool.findWeth.buy", function () {
  let wallets;
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;

  let wethContract: WETH;
  let findContract: Find;
  let factoryContract: Factory;
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

    wethContract = allInfo.wethContract;
    findContract = allInfo.findContract;
    factoryContract = allInfo.factoryContract;

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

  it("buy", async function () {
    const findinfo = await factoryContract.findInfo();
    const pool = findinfo.pool;
    const findPool = (await ethers.getContractAt("IUniswapV3Pool", pool)) as IUniswapV3Pool;
    
    console.log("0 is find, 1 is weth");
    expect(await findPool.fee()).eq(findinfo.fee).eq(100);
    expect(await findPool.token0()).eq(findContract.address);
    expect(await findPool.token1()).eq(wethContract.address);

    const swapRouter = (await ethers.getContractAt(
      "ISwapRouter02",
      UNISWAP_ROUTER
    )) as ISwapRouter02;

    await wethContract.connect(deployWallet).approve(swapRouter.address, await findContract.totalSupply());

    const buyFind = async function (amountOut: BigNumber): Promise<{ find: BigNumber; weth: BigNumber}> {
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
        weth: weth1.sub(weth2)
      }
    };

    // buy 1 find
    const buy1info = await buyFind(BigNumber.from(10).pow(18).mul(1));
    expect(buy1info.find).eq(BigNumber.from(10).pow(18).mul(1));

    expect(buy1info.weth).gt(BigNumber.from(10).pow(11).mul(10000));
    expect(buy1info.weth).lt(BigNumber.from(10).pow(11).mul(10001));

    // buy 95% find
    const buy2info = await buyFind(BigNumber.from(10).pow(18).mul(950_0000_0000));
    expect(buy2info.find).eq(BigNumber.from(10).pow(18).mul(950_0000_0000));

    expect(buy2info.weth).gt(BigNumber.from(10).pow(11).mul(950_0000_0000_0000));
    expect(buy2info.weth).lt(BigNumber.from(10).pow(11).mul(950_0950_0000_0000));

  });
});
