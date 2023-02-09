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
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Mortgage.redeem", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let userWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;
  let user2Wallet: SignerWithAddress;
  let user3Wallet: SignerWithAddress;
  let user4Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    userWallet = wallets[2];

    user1Wallet = wallets[3];
    user2Wallet = wallets[4];
    user3Wallet = wallets[5];
    user4Wallet = wallets[6];
  });

  describe("redeem", function () {
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
    let gasPrice = BigNumber.from("400000000");

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
      const swapRouter = (await ethers.getContractAt(
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

      // user1 user2 user3 user4 get osp1
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount5);
      await osp1
        .connect(deployWallet)
        .transfer(user2Wallet.address, ospAmount5);
      await osp1
        .connect(deployWallet)
        .transfer(user3Wallet.address, ospAmount5);
      await osp1
        .connect(deployWallet)
        .transfer(user4Wallet.address, ospAmount5);
      expect(await osp1.balanceOf(user1Wallet.address)).eq(ospAmount5);
      expect(await osp1.balanceOf(user2Wallet.address)).eq(ospAmount5);
      expect(await osp1.balanceOf(user3Wallet.address)).eq(ospAmount5);
      expect(await osp1.balanceOf(user4Wallet.address)).eq(ospAmount5);

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
        .transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(200));
      await usdtContract
        .connect(deployWallet)
        .transfer(user4Wallet.address, BigNumber.from(10).pow(6).mul(20_0000));
    });

    it("xxx", async function () {
      // find
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1StaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount5, findContract.address);
      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      expect(user1Find2.sub(user1Find1)).eq(
        BigNumber.from("106041929142800944598920")
      );
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(ospAmount5);
      await findContract
        .connect(user1Wallet)
        .approve(
          mortgageContract.address,
          BigNumber.from(10).pow(18).mul(20_0000)
        );
      console.log(1);
      const redeemInfoFind = await mortgageContract
        .connect(user1Wallet)
        .callStatic.redeem(
          user1Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(20_0000),
          findContract.address
        );
      const user1Find3 = await findContract.balanceOf(user1Wallet.address);
      console.log(2);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(20_0000),
          findContract.address
        );
      const user1Find4 = await findContract.balanceOf(user1Wallet.address);

      expect(redeemInfoFind.tokenIn).eq(findContract.address);
      expect(redeemInfoFind.amountIn).eq(
        BigNumber.from("106574803158593914169768")
      );
      expect(user1Find3.sub(user1Find4)).eq(
        BigNumber.from("106574803158593914169768")
      );
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
      // weth
      await osp1
        .connect(user2Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const findToWethInPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);
      const user2Weth1 = await wethContract.balanceOf(user2Wallet.address);
      const user2Osp1StaticInfo = await mortgageContract
        .connect(user2Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findToWethInPath);
      await mortgageContract
        .connect(user2Wallet)
        .mortgage(osp1.address, ospAmount5, findToWethInPath);
      const user2Weth2 = await wethContract.balanceOf(user2Wallet.address);
      expect(user2Weth2.sub(user2Weth1)).eq(
        BigNumber.from("106030334746928850445")
      );
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await wethContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(ospAmount5);
      const wethToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);
      await wethContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, BigNumber.from(10).pow(18).mul(200));
      console.log(3);
      const redeemInfoWeth = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(200),
          wethToFindOutPath
        );
      const user2Weth3 = await wethContract.balanceOf(user2Wallet.address);
      console.log(4);
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(200),
          wethToFindOutPath
        );
      const user2Weth4 = await wethContract.balanceOf(user2Wallet.address);

      expect(user2Weth3.sub(user2Weth4)).eq(
        BigNumber.from("106584466326875649191")
      );
      expect(redeemInfoWeth.amountIn).eq(
        BigNumber.from("106584466326875649191")
      );
      expect(redeemInfoWeth.tokenIn).eq(wethContract.address);
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await wethContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
      // matic
      await osp1
        .connect(user3Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const findToMaticInPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2) +
        "00" +
        FeeAmount.HIGH.toString(16) +
        wmatic.address.slice(2);
      const user3WMatic1 = await wmatic.balanceOf(user3Wallet.address);
      const user3Matic1 = await user3Wallet.getBalance();
      const user3Osp1StaticInfo = await mortgageContract
        .connect(user3Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findToMaticInPath, {
          gasPrice: gasPrice,
        });
      const t1 = await mortgageContract
        .connect(user3Wallet)
        .mortgage(osp1.address, ospAmount5, findToMaticInPath, {
          gasPrice: gasPrice,
        });
      const t1w = await t1.wait();
      const user3WMatic2 = await wmatic.balanceOf(user3Wallet.address);
      const user3Matic2 = await user3Wallet.getBalance();
      expect(user3WMatic2.sub(user3WMatic1)).eq(0);
      expect(user3Matic2.sub(user3Matic1).add(t1w.gasUsed.mul(gasPrice))).eq(
        BigNumber.from("52754411045159749223381")
      );
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await wmatic.balanceOf(mortgageContract.address)).eq(0);
      expect(await ethers.provider.getBalance(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(ospAmount5);
      const maticToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2) +
        "00" +
        FeeAmount.HIGH.toString(16) +
        wmatic.address.slice(2);
      console.log(5);
      const redeemInfoMatic = await mortgageContract
        .connect(user3Wallet)
        .callStatic.redeem(
          user3Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(20_0000),
          maticToFindOutPath,
          { value: BigNumber.from(10).pow(18).mul(20_0000) }
        );

      const user3WMatic3 = await wmatic.balanceOf(user3Wallet.address);
      const user3Matic3 = await user3Wallet.getBalance();
      console.log(6);
      const t2 = await mortgageContract
        .connect(user3Wallet)
        .redeem(
          user3Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(20_0000),
          maticToFindOutPath,
          { value: BigNumber.from(10).pow(18).mul(20_0000), gasPrice: gasPrice }
        );

      const t2w = await t2.wait();
      const user3WMatic4 = await wmatic.balanceOf(user3Wallet.address);
      const user3Matic4 = await user3Wallet.getBalance();

      expect(user3WMatic3.sub(user3WMatic4)).eq(0);
      expect(user3Matic3.sub(user3Matic4).sub(t2w.gasUsed.mul(gasPrice))).eq(
        BigNumber.from("54106841069762742294923")
      );
      expect(redeemInfoMatic.amountIn).eq(
        BigNumber.from("54106841069762742294923")
      );
      expect(redeemInfoMatic.tokenIn).eq(wmatic.address);
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await wmatic.balanceOf(mortgageContract.address)).eq(0);
      expect(await ethers.provider.getBalance(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
      // usdt
      await osp1
        .connect(user4Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const findToUsdtInPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2) +
        "00" +
        FeeAmount.HIGH.toString(16) +
        usdtContract.address.slice(2);
      const user4usdt1 = await usdtContract.balanceOf(user4Wallet.address);
      const user4Osp1StaticInfo = await mortgageContract
        .connect(user4Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findToUsdtInPath);
      await mortgageContract
        .connect(user4Wallet)
        .mortgage(osp1.address, ospAmount5, findToUsdtInPath);
      const user4usdt2 = await usdtContract.balanceOf(user4Wallet.address);
      expect(user4usdt2.sub(user4usdt1)).eq(
        BigNumber.from("107556298426")
      );
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await usdtContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(ospAmount5);
      const usdtToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2) +
        "00" +
        FeeAmount.HIGH.toString(16) +
        usdtContract.address.slice(2);
      await usdtContract
        .connect(user4Wallet)
        .approve(
          mortgageContract.address,
          BigNumber.from(10).pow(6).mul(20_0000)
        );
      console.log(7);
      const redeemInfoUsdt = await mortgageContract
        .connect(user4Wallet)
        .callStatic.redeem(
          user4Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(6).mul(20_0000),
          usdtToFindOutPath
        );
      console.log(8);
      const user4usdt3 = await usdtContract.balanceOf(user4Wallet.address);
      await mortgageContract
        .connect(user4Wallet)
        .redeem(
          user4Osp1StaticInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(6).mul(20_0000),
          usdtToFindOutPath
        );

      const user4usdt4 = await usdtContract.balanceOf(user4Wallet.address);

      expect(user4usdt3.sub(user4usdt4)).eq(
        BigNumber.from("110313648276")
      );
      expect(redeemInfoUsdt.amountIn).eq(
        BigNumber.from("110313648276")
      );
      expect(redeemInfoUsdt.tokenIn).eq(usdtContract.address);
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await usdtContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
    });
  });
});
