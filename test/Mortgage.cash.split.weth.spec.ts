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

describe("Mortgage.cash.split.weth", function () {
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

  describe("cash", function () {
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
    const ospAmount5 = ospAmount1.mul(5);
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
      // find swap to osp1
      await findContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(90_000_000_000)
        );
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount20,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount20);

      // user1 get osp1
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount5);

      expect(await osp1.balanceOf(user1Wallet.address)).eq(ospAmount5);

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
      await findContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
      await wethContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
    });

    it("xxx", async function () {
      // find
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const mortgageStaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount5, findContract.address);
      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      expect(user1Find2.sub(user1Find1)).eq(
        BigNumber.from("106041929142800944598920")
      );

      const position = await mortgageContract.positions(mortgageStaticInfo.tokenId);
      expect(position.tokenId).eq(mortgageStaticInfo.tokenId);
      expect(position.ospAsset).eq(osp1.address);
      expect(position.ospAmount).eq(ospAmount5);

      await findContract
        .connect(user1Wallet)
        .approve(
          mortgageContract.address,
          BigNumber.from(10).pow(18).mul(20_0000)
        );
      const redeemInfoFind = await mortgageContract
        .connect(user1Wallet)
        .callStatic.redeem(
          position.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(20_0000),
          findContract.address
        );

      const user1Find3 = await findContract.balanceOf(user1Wallet.address);
      const earnFind3 = await findContract.balanceOf(earnContract.address);
      const mortgageFind3 = await findContract.balanceOf(mortgageContract.address);

      const user1Weth3 = await wethContract.balanceOf(user1Wallet.address);
      const earnWeth3 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth3 = await wethContract.balanceOf(mortgageContract.address);

      const user1Osp3 = await osp1.balanceOf(user1Wallet.address);
      const earnOsp3 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp3 = await osp1.balanceOf(mortgageContract.address);

      const findToWethInPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);

      const cashInfoFind = await mortgageContract
        .connect(user1Wallet)
        .callStatic.cash(position.tokenId, ospAmount5, findContract.address);
      const cashInfoWeth = await mortgageContract
        .connect(user1Wallet)
        .callStatic.cash(position.tokenId, ospAmount5, findToWethInPath);

      await osp1
        .connect(deployWallet)
        .approve(swapRouter.address, await osp1.totalSupply());
 
      const amountOut = await swapRouter
        .connect(deployWallet)
        .callStatic.exactInputSingle({
          tokenIn: osp1.address,
          tokenOut: findContract.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountIn: ospAmount5,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });

      const cashInfoSplit1 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.cash(position.tokenId, ospAmount1.mul(2), findToWethInPath);
      await mortgageContract
        .connect(user1Wallet)
        .cash(position.tokenId, ospAmount1.mul(2), findToWethInPath);
      const cashInfoSplit2 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.cash(position.tokenId, ospAmount1.mul(2), findToWethInPath);
      await mortgageContract
        .connect(user1Wallet)
        .cash(position.tokenId, ospAmount1.mul(2), findToWethInPath);
      const cashInfoSplit3 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.cash(position.tokenId, ospAmount1, findToWethInPath);
      await mortgageContract
        .connect(user1Wallet)
        .cash(position.tokenId, ospAmount1, findToWethInPath);

      const user1Find4 = await findContract.balanceOf(user1Wallet.address);
      const earnFind4 = await findContract.balanceOf(earnContract.address);
      const mortgageFind4 = await findContract.balanceOf(mortgageContract.address);

      const user1Weth4 = await wethContract.balanceOf(user1Wallet.address);
      const earnWeth4 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth4 = await wethContract.balanceOf(mortgageContract.address);

      const user1Osp4 = await osp1.balanceOf(user1Wallet.address);
      const earnOsp4 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp4 = await osp1.balanceOf(mortgageContract.address);
  
      expect(user1Find4).eq(user1Find3);
      expect(earnFind4).eq(earnFind3);
      expect(mortgageFind4).eq(mortgageFind3).eq(0);

      expect(user1Weth4.sub(user1Weth3))
      .eq(cashInfoWeth.amountOut.sub(1))
      .eq(
        cashInfoSplit1.amountOut
          .add(cashInfoSplit2.amountOut)
          .add(cashInfoSplit3.amountOut)
      );
      expect(earnWeth4).eq(earnWeth3).eq(0);
      expect(mortgageWeth4).eq(mortgageWeth3).eq(0);

      expect(user1Osp4).eq(user1Osp3);
      expect(earnOsp4).eq(earnOsp3).eq(0);
      expect(mortgageOsp3.sub(mortgageOsp4)).eq(ospAmount5);

      expect(cashInfoFind.tokenOut).eq(findContract.address);
      expect(cashInfoWeth.tokenOut).eq(wethContract.address);
      expect(cashInfoSplit1.tokenOut).eq(wethContract.address);
      expect(cashInfoSplit2.tokenOut).eq(wethContract.address);
      expect(cashInfoSplit3.tokenOut).eq(wethContract.address);

      expect(cashInfoWeth.outFindAmount.sub(1)).eq(
        cashInfoSplit1.outFindAmount
          .add(cashInfoSplit2.outFindAmount)
          .add(cashInfoSplit3.outFindAmount)
      );

      console.log("find", cashInfoWeth.outFindAmount);
      console.log("weth", cashInfoWeth.amountOut);

      expect(BigNumber.from("331417602685672325262697")).eq(amountOut);
      expect(BigNumber.from("106574803158593914169768")).eq(
        redeemInfoFind.amountIn
      );
      expect(BigNumber.from("224842799527078411092929")).eq(
        cashInfoFind.amountOut
      );

      const positions2 = await mortgageContract.positionsOfOwner(user1Wallet.address);
      expect(positions2.length).eq(0);
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);

      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await ethers.provider.getBalance(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);

    });
  });
});
