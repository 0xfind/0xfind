import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  Factory,
  IFactory,
  IUniswapV3Pool,
  Find,
  WETH,
  USDT,
  OSP,
  INonfungiblePositionManager,
  IERC20,
  Mortgage,
  Earn,
  FindNFT,
  ISwapRouter02,
  Math,
  ERC20,
} from "../typechain";

import {
  deployAllContractWethFind,
  DEFAULT_OSP_POOL_CONFIG_0,
  DEFAULT_OSP_POOL_CONFIG_1,
  ZERO_ADDRESS,
  UNISWAP_V3_POSITIONS,
  UNISWAP_ROUTER,
} from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount, SwapRouter } from "@uniswap/v3-sdk";

describe("Mortgage.merge.split", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let userWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    userWallet = wallets[2];

    user1Wallet = wallets[3];
  });

  describe("merge.split", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let wethContract: WETH;
    let mortgageContract: Mortgage;
    let mathContract: Math;
    let osp1: IERC20;
    const osp1ProjectId = "github/1/1";
    let findOldTotalSupply: BigNumber;
    const ospAmount1 = BigNumber.from(10).pow(18).mul(21000);
    const ospAmount2 = ospAmount1.mul(2);
    let nonfungiblePositionManager: INonfungiblePositionManager;
    let usdtContract: USDT;
    let wmatic: IERC20;
    let swapRouter: ISwapRouter02;

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
      mortgageContract = allInfo.mortgageContract;
      mathContract = allInfo.mathContract;

      nonfungiblePositionManager = (await ethers.getContractAt(
        "INonfungiblePositionManager",
        UNISWAP_V3_POSITIONS
      )) as INonfungiblePositionManager;
      wmatic = (await ethers.getContractAt(
        "IERC20",
        await nonfungiblePositionManager.WETH9()
      )) as IERC20;

      // factory add config two
      await factoryContract
        .connect(deployWallet)
        .addNFTPercentConfig(500, 9500);
      // addOspPoolConfig 0
      await factoryContract
        .connect(deployWallet)
        .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);

      // createFindUniswapPool
      await findContract
        .connect(deployWallet)
        .transfer(factoryContract.address, await findContract.totalSupply());
      await factoryContract.connect(deployWallet).createFindUniswapPool();

      // factory osp1 config0
      const osp1Params = {
        base: {
          name: "github.com/test/1",
          symbol: "0XTEST1",
          projectId: osp1ProjectId,
          stars: 1,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
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
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;
      swapRouter = (await ethers.getContractAt(
        "ISwapRouter02",
        UNISWAP_ROUTER
      )) as ISwapRouter02;

      findOldTotalSupply = await findContract.totalSupply();

      // buy find
      await wethContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: wethContract.address,
        tokenOut: findContract.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(90_000_000_000),
        amountInMaximum: BigNumber.from(10).pow(18).mul(100_000_000),
        sqrtPriceLimitX96: 0,
      });
      expect(await findContract.balanceOf(deployWallet.address)).eq(
        BigNumber.from(10).pow(18).mul(90_000_000_000)
      );

      await findContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));

      // find swap to osp1
      await findContract
        .connect(deployWallet)
        .approve(swapRouter.address, BigNumber.from(2).pow(256).sub(1));
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount1.mul(6),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount1.mul(6));
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount1.mul(6));
    });

    it("xxx", async function () {
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));

      const info1 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.mortgage(osp1.address, ospAmount1, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount1, findContract.address);

      const info2 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.mortgage(
          osp1.address,
          ospAmount1.mul(2),
          findContract.address
        );
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount1.mul(2), findContract.address);

        const earnFind1 = await findContract.balanceOf(earnContract.address);
      const infoMerge = await mortgageContract
        .connect(user1Wallet)
        .callStatic.merge(info2.tokenId, info1.tokenId, findContract.address);

      await mortgageContract
        .connect(user1Wallet)
        .merge(info1.tokenId, info2.tokenId, findContract.address);

        const earnFind2 = await findContract.balanceOf(earnContract.address);

      const info3 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.mortgage(
          osp1.address,
          ospAmount1.mul(3),
          findContract.address
        );
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount1.mul(3), findContract.address);

      expect(
        info1.outFindAmount.add(info2.outFindAmount).add(infoMerge.outFind)
      ).eq(info3.outFindAmount.add(1));

      await findContract
      .connect(user1Wallet)
      .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));

      const sInfo1 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.split(
          info3.tokenId,
          ospAmount1,
          await findContract.balanceOf(user1Wallet.address),
          findContract.address
        );

        console.log("merge", infoMerge.outFind.add(
            earnFind2.sub(earnFind1)
        ));
        console.log("split", sInfo1.needFind);

        // merge user get find + earn get fee = split user 
    });
  });
});
