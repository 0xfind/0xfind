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

describe("Factory.createOSPByProjectOwner", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    user1Wallet = wallets[2];
  });

  describe("createOSPByProjectOwner", function () {
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
    const ospAmount5 = BigNumber.from(10).pow(18).mul(105000);
    const ospAmount20 = ospAmount5.mul(4);
    let nonfungiblePositionManager: INonfungiblePositionManager;
    let usdtContract: USDT;
    let wmatic: IERC20;
    let swapRouter: ISwapRouter02;

    const createUsdtAndCreateUsdtWethPool = async function () {
      // deploy usdt
      usdtContract = (await (
        await ethers.getContractFactory("USDT")
      ).deploy()) as USDT;

      // usdt / weth = 1000 / 1
      let token0;
      let token1;
      let token0AmountDesired;
      let token1AmountDesired;
      let sqrtPriceX96;
      let fee;
      let tickLower;
      let tickUpper;
      let wethAmountDesired = BigNumber.from(10).pow(18).mul(1_000_000);
      if (usdtContract.address < wethContract.address) {
        token0 = usdtContract.address;
        token1 = wethContract.address;
        token0AmountDesired = BigNumber.from(0);
        token1AmountDesired = wethAmountDesired;
        sqrtPriceX96 = "2505414483750479311864138015696063";
        fee = FeeAmount.HIGH;
        tickLower = 206800;
        tickUpper = 207000;
      } else {
        token0 = wethContract.address;
        token1 = usdtContract.address;
        token0AmountDesired = wethAmountDesired;
        token1AmountDesired = BigNumber.from(0);
        sqrtPriceX96 = "2505414483750479311864138";
        fee = FeeAmount.HIGH;
        tickLower = -207000;
        tickUpper = -206800;
      }

      await nonfungiblePositionManager
        .connect(deployWallet)
        .createAndInitializePoolIfNecessary(token0, token1, fee, sqrtPriceX96);

      await wethContract
        .connect(deployWallet)
        .approve(nonfungiblePositionManager.address, wethAmountDesired);
      await nonfungiblePositionManager.connect(deployWallet).mint({
        token0: token0,
        token1: token1,
        fee: fee,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: token0AmountDesired,
        amount1Desired: token1AmountDesired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: deployWallet.address,
        deadline:
          parseInt((new Date().getTime() / 1000).toString().substr(0, 10)) +
          1000,
      });
    };

    const createWmaticWethPool = async function () {
      // wmatic / weth = 500 / 1
      let token0;
      let token1;
      let token0AmountDesired;
      let token1AmountDesired;
      let sqrtPriceX96;
      let fee;
      let tickLower;
      let tickUpper;
      let wethAmountDesired = BigNumber.from(10).pow(18).mul(1_000_000);
      if (wmatic.address < wethContract.address) {
        token0 = wmatic.address;
        token1 = wethContract.address;
        token0AmountDesired = BigNumber.from(0);
        token1AmountDesired = wethAmountDesired;
        sqrtPriceX96 = "3543191142285914205922034323";
        fee = FeeAmount.HIGH;
        tickLower = -62400;
        tickUpper = -62200;
      } else {
        token0 = wethContract.address;
        token1 = wmatic.address;
        token0AmountDesired = wethAmountDesired;
        token1AmountDesired = BigNumber.from(0);
        sqrtPriceX96 = "1771595571142957028654913257335";
        fee = FeeAmount.HIGH;
        tickLower = 62200;
        tickUpper = 62400;
      }

      await nonfungiblePositionManager
        .connect(deployWallet)
        .createAndInitializePoolIfNecessary(token0, token1, fee, sqrtPriceX96);

      await wethContract
        .connect(deployWallet)
        .approve(nonfungiblePositionManager.address, wethAmountDesired);
      await nonfungiblePositionManager.connect(deployWallet).mint({
        token0: token0,
        token1: token1,
        fee: fee,
        tickLower: tickLower,
        tickUpper: tickUpper,
        amount0Desired: token0AmountDesired,
        amount1Desired: token1AmountDesired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: deployWallet.address,
        deadline:
          parseInt((new Date().getTime() / 1000).toString().substr(0, 10)) +
          1000,
      });
    };

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
      await factoryContract.connect(deployWallet).addNFTPercentConfig(500, 9500);
      // addOspPoolConfig 0
      await factoryContract
        .connect(deployWallet)
        .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);
      // addOspPoolConfig 1
      await factoryContract
        .connect(deployWallet)
        .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_1);

      // createFindUniswapPool
      await findContract
        .connect(deployWallet)
        .transfer(factoryContract.address, await findContract.totalSupply());
      await factoryContract.connect(deployWallet).createFindUniswapPool();

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

      await createUsdtAndCreateUsdtWethPool();
      await createWmaticWethPool();

      // wmatic swap to weth
      const swapWmaticOut = BigNumber.from(10).pow(18).mul(2000);
      const swapWmaticInMax = swapWmaticOut.mul(600);
      await swapRouter.connect(deployWallet).exactOutputSingle(
        {
          tokenIn: wmatic.address,
          tokenOut: wethContract.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountOut: swapWmaticOut,
          amountInMaximum: swapWmaticInMax,
          sqrtPriceLimitX96: 0,
        },
        { value: swapWmaticInMax }
      );
      console.log("wmtaic swap to weth");
      // usdt swap to weth
      await usdtContract
        .connect(deployWallet)
        .approve(swapRouter.address, await usdtContract.totalSupply());
      const swapUsdtOut = BigNumber.from(10).pow(18).mul(2000);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: usdtContract.address,
        tokenOut: wethContract.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: swapUsdtOut,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log("usdt swap to weth");
      await swapRouter.refundETH();
    });

    it("xxx", async function () {
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
              [osp1Params.base, osp1Params.deadline, user1Wallet.address]
            )
          )
        )
      );

      const user1Find1 = await findContract.balanceOf(user1Wallet.address);

      const mortgageFind1 = await findContract.balanceOf(
        mortgageContract.address
      );

      const earnFind1 = await findContract.balanceOf(earnContract.address);

      const factoryFind1 = await findContract.balanceOf(
        factoryContract.address
      );

      await factoryContract
        .connect(user1Wallet)
        .createOSPByProjectOwner(
          osp1Params
        );

      osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;

      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2 = await osp1.balanceOf(user1Wallet.address);
      const mortgageFind2 = await findContract.balanceOf(
        mortgageContract.address
      );
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);

      const factoryFind2 = await findContract.balanceOf(
        factoryContract.address
      );
      const factoryOsp2 = await osp1.balanceOf(factoryContract.address);

      expect(user1Find1).eq(user1Find2);
      expect(user1Osp2).eq(0);

      expect(mortgageFind2).eq(mortgageFind1);
      expect(mortgageOsp2).eq(0);

      expect(factoryFind2).eq(factoryFind1);
      expect(factoryOsp2).eq(0);

      expect(await findContract.totalSupply())
        .eq(findOldTotalSupply);

      expect(earnFind2.sub(earnFind1)).eq(0);
    });
  });
});
