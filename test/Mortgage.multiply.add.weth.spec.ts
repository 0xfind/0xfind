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
  MortgageTransferFromPositionCallbackMock,
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

describe("Mortgage.multiply.add.weth", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;
  let user2Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];

    user1Wallet = wallets[2];
    user2Wallet = wallets[3];
  });

  describe("multiply", function () {
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
              [osp1Params.base, osp1Params.deadline, user1Wallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(user1Wallet)
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
      // user2 get find
      await findContract
        .connect(deployWallet)
        .transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
      await wethContract
        .connect(deployWallet)
        .transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));

      // user2 multiply 2
      // user2 multiply 2
      // user2 multiply 1
      const AllFindAmount = BigNumber.from("107651316321812034514918");
      const amountPayMax = BigNumber.from("107651316321812034514918");
      const user2AllFindAmount1 = BigNumber.from("43060526528724813805966");
      const user2amountPayMax1 = BigNumber.from("43060526528724813805966");
      const user2AllFindAmount2 = BigNumber.from("43060526528724813805966");
      const user2amountPayMax2 = BigNumber.from("43060526528724813805966");
      const user2AllFindAmount3 = BigNumber.from("21530263264362406902986");
      const user2amountPayMax3 = BigNumber.from("21530263264362406902986");
      expect(AllFindAmount).eq(
        user2AllFindAmount1.add(user2AllFindAmount2).add(user2AllFindAmount3)
      );

      const user2Find1 = await findContract.balanceOf(user2Wallet.address);
      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const mortgageFind1 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user2Weth1 = await wethContract.balanceOf(user2Wallet.address);
      const earnWeth1 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth1 = await wethContract.balanceOf(
        mortgageContract.address
      );

      const user2Osp1 = await osp1.balanceOf(user2Wallet.address);
      const earnOsp1 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp1 = await osp1.balanceOf(mortgageContract.address);

      const wethToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);

      await wethContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, AllFindAmount);
      const user2MultiplyInfo = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiply(
          osp1.address,
          AllFindAmount,
          amountPayMax,
          wethToFindOutPath
        );
      const user2MultiplyInfoSplit1 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiply(
          osp1.address,
          user2AllFindAmount1,
          user2amountPayMax1,
          wethToFindOutPath
        );
      await mortgageContract
        .connect(user2Wallet)
        .multiply(
          osp1.address,
          user2AllFindAmount1,
          user2amountPayMax1,
          wethToFindOutPath
        );
      const user2MultiplyInfoSplit2 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiplyAdd(
          user2MultiplyInfo.tokenId,
          user2AllFindAmount2,
          user2amountPayMax2,
          wethToFindOutPath
        );
      await mortgageContract
        .connect(user2Wallet)
        .multiplyAdd(
          user2MultiplyInfo.tokenId,
          user2AllFindAmount2,
          user2amountPayMax2,
          wethToFindOutPath
        );
      const user2MultiplyInfoSplit3 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiplyAdd(
          user2MultiplyInfo.tokenId,
          user2AllFindAmount3,
          user2amountPayMax3,
          wethToFindOutPath
        );
      await mortgageContract
        .connect(user2Wallet)
        .multiplyAdd(
          user2MultiplyInfo.tokenId,
          user2AllFindAmount3,
          user2amountPayMax3,
          wethToFindOutPath
        );

      const user2Find2 = await findContract.balanceOf(user2Wallet.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const mortgageFind2 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user2Weth2 = await wethContract.balanceOf(user2Wallet.address);
      const earnWeth2 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth2 = await wethContract.balanceOf(
        mortgageContract.address
      );

      const user2Osp2 = await osp1.balanceOf(user2Wallet.address);
      const earnOsp2 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      expect(user2Find1).eq(user2Find2);
      expect(earnFind2.sub(earnFind1)).eq(
        BigNumber.from("532874015792969570848").sub(1)
      );
      expect(mortgageFind2).eq(mortgageFind1).eq(0);

      expect(user2Weth1.sub(user2Weth2))
      .eq(user2MultiplyInfo.amountNeedPay.add(801))
      .eq(
        user2MultiplyInfoSplit1.amountNeedPay
          .add(user2MultiplyInfoSplit2.amountNeedPay)
          .add(user2MultiplyInfoSplit3.amountNeedPay)
      );
      expect(earnWeth2).eq(earnWeth1).eq(0);
      expect(mortgageWeth2).eq(mortgageWeth1).eq(0);

      expect(user2Osp2).eq(user2Osp1).eq(0);
      expect(earnOsp2).eq(earnOsp1).eq(0);
      expect(mortgageOsp2.sub(mortgageOsp1)).eq(ospAmount5.sub(2));

      expect(user2MultiplyInfo.payFindAmount.add(1)).eq(
        user2MultiplyInfoSplit1.payFindAmount
          .add(user2MultiplyInfoSplit2.payFindAmount)
          .add(user2MultiplyInfoSplit3.payFindAmount)
      );

      expect(user2MultiplyInfoSplit1.tokenPay).eq(wethContract.address);
      expect(user2MultiplyInfoSplit2.tokenPay).eq(wethContract.address);
      expect(user2MultiplyInfoSplit3.tokenPay).eq(wethContract.address);

      console.log("weth", user2MultiplyInfo.amountNeedPay);
      console.log("find", user2MultiplyInfo.payFindAmount);

      const user2Position1 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user2Position1.length).eq(1);
      expect(user2Position1[0].tokenId).eq(user2MultiplyInfo.tokenId);
      expect(user2Position1[0].ospAsset).eq(osp1.address);
      expect(user2Position1[0].ospAmount).eq(ospAmount5.sub(2));

      const user2MintTotalSupply = await findContract.totalSupply();

      expect(user2MintTotalSupply).eq(
        BigNumber.from("100000106574803158593914169768").sub(2)
      );

      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(
        ospAmount5.sub(2)
      );

      // user2 redeem 5
      // psoitoio no
      await findContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      const user2ReddemInfo = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2MultiplyInfo.tokenId,
          ospAmount5.sub(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2MultiplyInfo.tokenId,
          ospAmount5.sub(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      const user2Position2 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user2Position2.length).eq(0);

      expect(user2ReddemInfo.amountIn).eq(
        BigNumber.from("106574803158593914169768").sub(2)
      );
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);

      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
    });
  });
});
