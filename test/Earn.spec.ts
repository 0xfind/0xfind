import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Factory, IFactory, IUniswapV3Pool, Find, WETH, USDT, OSP, INonfungiblePositionManager, IERC20, Mortgage, Earn, FindNFT, ISwapRouter02, SignatureValidator } from "../typechain";

import { deployAllContractWethFind, DEFAULT_OSP_POOL_CONFIG_0, DEFAULT_OSP_POOL_CONFIG_1, ZERO_ADDRESS, UNISWAP_V3_POSITIONS, UNISWAP_ROUTER } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Earn", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let newSignatureWallet: SignerWithAddress;
  let newOwnerWallet: SignerWithAddress;
  let userWallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    newSignatureWallet = wallets[2];
    newOwnerWallet = wallets[3];
    userWallet = wallets[4];
  });

  describe("base", function () {
    let factoryContract: Factory;
    let earnContract: Earn
    let findnftContract: FindNFT
    let findContract: Find
    let wethContract: WETH

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
    });

    it("earn contract link address", async function () {
        expect(await earnContract.factory()).eq(factoryContract.address);
        expect(await earnContract.find()).eq(findContract.address);
        expect(await earnContract.findnft()).eq(findnftContract.address);
        expect(await earnContract.signatureAddress()).eq(signatureWallet.address);
        expect(await earnContract.owner()).eq(deployWallet.address);
    });
  });

  describe("setSignatureAddress renounceOwnership transferOwnership", function () {
    let factoryContract: Factory;
    let earnContract: Earn
    let findnftContract: FindNFT
    let findContract: Find
    let wethContract: WETH

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
    });

    it("setSignatureAddress renounceOwnership transferOwnership", async function () {
        await earnContract.transferOwnership(newOwnerWallet.address);
        expect(await earnContract.owner()).eq(newOwnerWallet.address);

        await earnContract.connect(newOwnerWallet).setSignatureAddress(newSignatureWallet.address);
        expect(await earnContract.signatureAddress()).eq(newSignatureWallet.address);

        await earnContract.connect(newOwnerWallet).setSignatureAddress(factoryContract.address);
        expect(await earnContract.signatureAddress()).eq(factoryContract.address);

        expect(await earnContract.disableSetSignatureAddressFlag()).eq(false);
        await earnContract.connect(newOwnerWallet).disableSetSignatureAddress();
        expect(await earnContract.disableSetSignatureAddressFlag()).eq(true);
        await expect(
          earnContract.connect(newOwnerWallet).setSignatureAddress(newSignatureWallet.address)
        ).revertedWith("DE");

        await earnContract.connect(newOwnerWallet).renounceOwnership();
        expect(await earnContract.owner()).eq(ZERO_ADDRESS);

    });
  });

  describe("claim collect", function () {
    let usdtContract: USDT
    let wmatic: IERC20
    let nonfungiblePositionManager: INonfungiblePositionManager
    let factoryContract: Factory;
    let earnContract: Earn
    let findnftContract: FindNFT
    let findContract: Find
    let wethContract: WETH

    const createUsdtAndCreateUsdtWethPool = async function (){
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
        sqrtPriceX96 = "2505414483750479311864138015";
        fee = FeeAmount.HIGH;
        tickLower = -69400;
        tickUpper = -69200;
      } else {
        token0 = wethContract.address;
        token1 = usdtContract.address;
        token0AmountDesired = wethAmountDesired;
        token1AmountDesired = BigNumber.from(0);
        sqrtPriceX96 = "2505414483750479206779438107170";
        fee = FeeAmount.HIGH;
        tickLower = 69200;
        tickUpper = 69400;
      }

      await nonfungiblePositionManager
      .connect(deployWallet)
      .createAndInitializePoolIfNecessary(
        token0,
        token1,
        fee,
        sqrtPriceX96
      );

      await wethContract
      .connect(deployWallet)
      .approve(nonfungiblePositionManager.address, wethAmountDesired);
      await nonfungiblePositionManager.connect(deployWallet).mint(
        {
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
        }
      );


    }

    const createWmaticWethPool = async function (){
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
      .createAndInitializePoolIfNecessary(
        token0,
        token1,
        fee,
        sqrtPriceX96
      );

      await wethContract
      .connect(deployWallet)
      .approve(nonfungiblePositionManager.address, wethAmountDesired);
      await nonfungiblePositionManager.connect(deployWallet).mint(
        {
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
        }
      );

      
    }

    const deployWalletBuyFind = async function () {
      const swapRouter = (await ethers.getContractAt(
        "ISwapRouter02", UNISWAP_ROUTER
      )) as ISwapRouter02;

      await wethContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(150));
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: wethContract.address,
        tokenOut: findContract.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(100_000),
        amountInMaximum: BigNumber.from(10).pow(18).mul(150),
        sqrtPriceLimitX96: 0,
      });
      expect(await findContract.balanceOf(deployWallet.address)).eq(BigNumber.from(10).pow(18).mul(100_000));
    }

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;

      nonfungiblePositionManager = (await ethers.getContractAt(
        "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
      )) as INonfungiblePositionManager;
      wmatic = (await ethers.getContractAt(
        "IERC20",
        await nonfungiblePositionManager.WETH9()
      )) as IERC20;

      // addNFTPercentConfig
      await factoryContract.connect(deployWallet).addNFTPercentConfig(2000, 8000);
      // addOspPoolConfig 0
      await factoryContract.connect(deployWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);
      // createFindUniswapPool
      await findContract.connect(deployWallet).transfer(factoryContract.address, await findContract.totalSupply());
      await factoryContract.connect(deployWallet).createFindUniswapPool();

      // create osp1
      const osp1Params = {
        base: {
          name: "github.com/test/1",
          symbol: "0XTEST1",
          projectId: "github/1/1",
          stars: 1,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0
        },
        deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
        signature: ""
      }
      osp1Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
          ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
          [osp1Params.base, osp1Params.deadline, userWallet.address]
        )))
      );
      await factoryContract.connect(userWallet).createOSPByProjectOwner(osp1Params);

      // create osp2
      const osp2Params = {
        base: {
          name: "github.com/test/2",
          symbol: "0XTEST2",
          projectId: "github/1/2",
          stars: 2,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0
        },
        deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
        signature: ""
      }
      osp2Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
          ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
          [osp2Params.base, osp2Params.deadline, userWallet.address]
        )))
      );
      await factoryContract.connect(userWallet).createOSPByProjectOwner(osp2Params);

      await findnftContract.transferFrom(deployWallet.address, userWallet.address, 0);
    });

    it("find nft info", async function () {
      const info = await earnContract.findNFTInfo();
      expect(info.cnftOwner).eq(info[0]).eq(userWallet.address);
      expect(info.onftOnwer).eq(info[1]).eq(await factoryContract.owner());
      expect(info.cpercent).eq(info[2]).eq(2000)
      expect(info.opercent).eq(info[3]).eq(8000)
    });

    const expectOspNftInfo = async function (ospProjectId: string, cnftOwner: string, onftOnwer: string, isClaim: boolean) {
      const osp = await factoryContract.projectId2OspToken(ospProjectId);
      const info = await earnContract.ospNFTInfo(osp)
      expect(info.cnftOwner).eq(info[0]).eq(cnftOwner);
      expect(info.onftOnwer).eq(info[1]).eq(onftOnwer);
      expect(info.cpercent).eq(info[2]).eq(2000)
      expect(info.opercent).eq(info[3]).eq(8000)
      expect(info.isClaim).eq(info[4]).eq(isClaim)
    }

    it("claim collect", async function () {
      const osp1ProjectId = "github/1/1";
      const osp2ProjectId = "github/1/2";
      await expectOspNftInfo(osp1ProjectId, userWallet.address, earnContract.address, false)
      await expectOspNftInfo(osp2ProjectId, userWallet.address, earnContract.address, false)

      const osp1Address = await factoryContract.projectId2OspToken(osp1ProjectId);
      const osp2Address = await factoryContract.projectId2OspToken(osp2ProjectId);
      // osp2 claim error sig
      const osp2ClaimSignatureErr = await signatureWallet.signMessage(
        ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
          ["address", "address"],
          [osp2Address, userWallet.address]
        )))
      );
      await expect(
        earnContract.connect(userWallet).claimOSPOwnerNFT(osp2Address, newOwnerWallet.address, osp2ClaimSignatureErr)
      ).revertedWith("SE2");

      // osp2 claim success
      const osp2ClaimSignature = await signatureWallet.signMessage(
        ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
          ["address", "address"],
          [osp2Address, newOwnerWallet.address]
        )))
      );
      await earnContract.connect(userWallet).claimOSPOwnerNFT(osp2Address, newOwnerWallet.address, osp2ClaimSignature)

      // osp2 claim re
      await expect(
        earnContract.connect(userWallet).claimOSPOwnerNFT(osp2Address, newOwnerWallet.address, osp2ClaimSignature)
      ).revertedWith("AC1")

      // collect empty builder
      expect(await findContract.balanceOf(earnContract.address)).eq(0);
      const findcnftOwner = await findnftContract.ownerOf(0)
      const findonftOwner = await findnftContract.ownerOf(1)
      const findcnftOwnerFind1 = await findContract.balanceOf(findcnftOwner)
      const findonftOwnerFind1 = await findContract.balanceOf(findonftOwner)
      await earnContract.collectForBuilder(findContract.address);
      const findcnftOwnerFind2 = await findContract.balanceOf(findcnftOwner)
      const findonftOwnerFind2 = await findContract.balanceOf(findonftOwner)
      expect(findcnftOwnerFind2.sub(findcnftOwnerFind1)).eq(0);
      expect(findonftOwnerFind2.sub(findonftOwnerFind1)).eq(0);
      expect(await findContract.balanceOf(earnContract.address)).eq(0);

      // collect find
        // collect empty
        expect(await findContract.balanceOf(earnContract.address)).eq(0);
        expect(await wethContract.balanceOf(earnContract.address)).eq(0);
        await earnContract.collectFindUniswapLPFee();
        expect(await findContract.balanceOf(earnContract.address)).eq(0);
        expect(await wethContract.balanceOf(earnContract.address)).eq(0);
  
        // swap weth to find 100 WETH
        const swapRouter = (await ethers.getContractAt(
          "ISwapRouter02", UNISWAP_ROUTER
        )) as ISwapRouter02;

        await wethContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: wethContract.address,
          tokenOut: findContract.address,
          fee: FeeAmount.LOWEST,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        expect(await findContract.balanceOf(earnContract.address)).eq(0);
        expect(await wethContract.balanceOf(earnContract.address)).eq(0);
  
        const collectFindUniswapLPFeeInfo1 = await earnContract.callStatic.collectFindUniswapLPFee();
        // collect
        await earnContract.collectFindUniswapLPFee();
        const earnContractFind1 = await findContract.balanceOf(earnContract.address);
        const earnContractWeth1 = await wethContract.balanceOf(earnContract.address);
        expect(earnContractFind1).eq(collectFindUniswapLPFeeInfo1.findAmount).eq(0);
        expect(earnContractWeth1).eq(collectFindUniswapLPFeeInfo1.wethAmount);
        expect(earnContractWeth1).gt(BigNumber.from(10).pow(14).mul(99))
        expect(earnContractWeth1).lt(BigNumber.from(10).pow(14).mul(101))

        // swap find to weth 100 FIND
        await findContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: findContract.address,
          tokenOut: wethContract.address,
          fee: FeeAmount.LOWEST,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        const collectFindUniswapLPFeeInfo2 = await earnContract.callStatic.collectFindUniswapLPFee();
        // collect
        await earnContract.collectFindUniswapLPFee();
        const earnContractFind2 = await findContract.balanceOf(earnContract.address);
        const earnContractWeth2 = await wethContract.balanceOf(earnContract.address);
        expect(earnContractFind2.sub(earnContractFind1)).eq(collectFindUniswapLPFeeInfo2.findAmount);
        expect(earnContractWeth2.sub(earnContractWeth1)).eq(collectFindUniswapLPFeeInfo2.wethAmount).eq(0);
        expect(earnContractFind2.sub(earnContractFind1)).gt(BigNumber.from(10).pow(14).mul(100))
        expect(earnContractFind2.sub(earnContractFind1)).lt(BigNumber.from(10).pow(14).mul(101))

        // swap find to weth 100 FIND
        await findContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: findContract.address,
          tokenOut: wethContract.address,
          fee: FeeAmount.LOWEST,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        // swap weth to find 100 WETH
        await wethContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: wethContract.address,
          tokenOut: findContract.address,
          fee: FeeAmount.LOWEST,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        const collectFindUniswapLPFeeInfo3 = await earnContract.callStatic.collectFindUniswapLPFee();
        // collect
        await earnContract.collectFindUniswapLPFee();
        const earnContractFind3 = await findContract.balanceOf(earnContract.address);
        const earnContractWeth3 = await wethContract.balanceOf(earnContract.address);
        expect(earnContractFind3.sub(earnContractFind2)).eq(collectFindUniswapLPFeeInfo3.findAmount);
        expect(earnContractWeth3.sub(earnContractWeth2)).eq(collectFindUniswapLPFeeInfo3.wethAmount);

        expect(earnContractFind3.sub(earnContractFind2)).gt(BigNumber.from(10).pow(14).mul(100))
        expect(earnContractFind3.sub(earnContractFind2)).lt(BigNumber.from(10).pow(14).mul(101))
        expect(earnContractWeth3.sub(earnContractWeth2)).gt(BigNumber.from(10).pow(14).mul(99))
        expect(earnContractWeth3.sub(earnContractWeth2)).lt(BigNumber.from(10).pow(14).mul(101))

      // collect osp
        const osp1CnftOwner = await findnftContract.ownerOf(2)
        const osp1OnftOwner = await findnftContract.ownerOf(3)
        const osp2CnftOwner = await findnftContract.ownerOf(4)
        const osp2OnftOwner = await findnftContract.ownerOf(5)
        const osp1 = (await ethers.getContractAt(
          "IERC20",
          await factoryContract.projectId2OspToken(osp1ProjectId)
        )) as IERC20;
        const osp2 = (await ethers.getContractAt(
          "IERC20",
          await factoryContract.projectId2OspToken(osp2ProjectId)
        )) as IERC20;
        // collect empty osp1
        const osp1CnftOwnerFind1 = await findContract.balanceOf(osp1CnftOwner);
        const osp1CnftOwnerOsp1 = await osp1.balanceOf(osp1CnftOwner);
        const osp1OnftOwnerFind1 = await findContract.balanceOf(osp1OnftOwner);
        const osp1OnftOwnerOsp1 = await osp1.balanceOf(osp1OnftOwner);
        earnContract.collectOspUniswapLPFee(osp1.address);
        const osp1CnftOwnerFind2 = await findContract.balanceOf(osp1CnftOwner);
        const osp1CnftOwnerOsp2 = await osp1.balanceOf(osp1CnftOwner);
        const osp1OnftOwnerFind2 = await findContract.balanceOf(osp1OnftOwner);
        const osp1OnftOwnerOsp2 = await osp1.balanceOf(osp1OnftOwner);
        expect(osp1CnftOwnerFind2.sub(osp1CnftOwnerFind1)).eq(0);
        expect(osp1CnftOwnerOsp2.sub(osp1CnftOwnerOsp1)).eq(0);
        expect(osp1OnftOwnerFind2.sub(osp1OnftOwnerFind1)).eq(0);
        expect(osp1OnftOwnerOsp2.sub(osp1OnftOwnerOsp1)).eq(0);

        // swap find to osp1  100 find
        await findContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: findContract.address,
          tokenOut: osp1.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        // COLLECT
        const collectOspUniswapLPFeeInfo1 = await earnContract.callStatic.collectOspUniswapLPFee(osp1.address)
        await earnContract.collectOspUniswapLPFee(osp1.address)
        const osp1CnftOwnerFind3 = await findContract.balanceOf(osp1CnftOwner);
        const osp1CnftOwnerOsp3 = await osp1.balanceOf(osp1CnftOwner);
        const osp1OnftOwnerFind3 = await findContract.balanceOf(osp1OnftOwner);
        const osp1OnftOwnerOsp3 = await osp1.balanceOf(osp1OnftOwner);
        expect(osp1CnftOwnerFind3.sub(osp1CnftOwnerFind2)).eq(collectOspUniswapLPFeeInfo1.cAmount).eq(BigNumber.from("199999999999999999"));
        expect(osp1CnftOwnerOsp3.sub(osp1CnftOwnerOsp2)).eq(0);
        expect(osp1OnftOwnerFind3.sub(osp1OnftOwnerFind2)).eq(0);
        expect(osp1OnftOwnerOsp3.sub(osp1OnftOwnerOsp2)).eq(collectOspUniswapLPFeeInfo1.oAmount).eq(BigNumber.from("791977843691102453"));

        // swap find to osp2  1000 find
        await findContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(1000));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: findContract.address,
          tokenOut: osp2.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(1000),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        // swap osp2 to find  100 osp2
        await osp2.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
        await swapRouter.connect(deployWallet).exactInputSingle({
          tokenIn: osp2.address,
          tokenOut: findContract.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountIn: BigNumber.from(10).pow(18).mul(100),
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0,
        });
        const osp2CnftOwnerFind1 = await findContract.balanceOf(osp2CnftOwner);
        const osp2CnftOwnerOsp1 = await osp2.balanceOf(osp2CnftOwner);
        const osp2OnftOwnerFind1 = await findContract.balanceOf(osp2OnftOwner);
        const osp2OnftOwnerOsp1 = await osp2.balanceOf(osp2OnftOwner);
        const earnOsp2_1 = await osp2.balanceOf(earnContract.address);
        const earnFind1 = await findContract.balanceOf(earnContract.address);
        // COLLECT
        const collectOspUniswapLPFeeInfo2 = await earnContract.callStatic.collectOspUniswapLPFee(osp2.address)
        await earnContract.collectOspUniswapLPFee(osp2.address)
        const osp2CnftOwnerFind2 = await findContract.balanceOf(osp2CnftOwner);
        const osp2CnftOwnerOsp2 = await osp2.balanceOf(osp2CnftOwner);
        const osp2OnftOwnerFind2 = await findContract.balanceOf(osp2OnftOwner);
        const osp2OnftOwnerOsp2 = await osp2.balanceOf(osp2OnftOwner);
        const earnOsp2_2 = await osp2.balanceOf(earnContract.address);
        const earnFind2 = await findContract.balanceOf(earnContract.address);

        expect(osp2CnftOwnerFind2.sub(osp2CnftOwnerFind1)).eq(collectOspUniswapLPFeeInfo2.cAmount).eq(BigNumber.from("2198049650257652301"));
        expect(osp2CnftOwnerOsp2.sub(osp2CnftOwnerOsp1)).eq(0);
        expect(osp2OnftOwnerFind2.sub(osp2OnftOwnerFind1)).eq(0);
        expect(osp2OnftOwnerOsp2.sub(osp2OnftOwnerOsp1)).eq(collectOspUniswapLPFeeInfo2.oAmount).eq(BigNumber.from("8718005884164945090"));

        expect(earnFind2).eq(earnFind1);
        expect(earnOsp2_2).eq(earnOsp2_1);

      // collect builder osp1
      const earnContractOsp = await osp1.balanceOf(earnContract.address);
      const findcnftOwnerOsp1_1 = await osp1.balanceOf(findcnftOwner)
      const findonftOwnerOsp1_1 = await osp1.balanceOf(findonftOwner)
      const collectForBuilderOsp1 = await earnContract.callStatic.collectForBuilder(osp1.address);
      await earnContract.collectForBuilder(osp1.address);
      const findcnftOwnerOsp1_2 = await osp1.balanceOf(findcnftOwner)
      const findonftOwnerOsp1_2 = await osp1.balanceOf(findonftOwner)
      expect(findcnftOwnerOsp1_2.sub(findcnftOwnerOsp1_1)).eq(collectForBuilderOsp1.cAmount);
      expect(findonftOwnerOsp1_2.sub(findonftOwnerOsp1_1)).eq(collectForBuilderOsp1.oAmount);
      expect(collectForBuilderOsp1.cAmount.add(collectForBuilderOsp1.oAmount)).eq(earnContractOsp);

      // collect builder find
      const earnContractFind = await findContract.balanceOf(earnContract.address);
      const findcnftOwnerFind_1 = await findContract.balanceOf(findcnftOwner)
      const findonftOwnerFind_1 = await findContract.balanceOf(findonftOwner)
      const collectForBuilderFind = await earnContract.callStatic.collectForBuilder(findContract.address);
      await earnContract.collectForBuilder(findContract.address);
      const findcnftOwnerFind_2 = await findContract.balanceOf(findcnftOwner)
      const findonftOwnerFind_2 = await findContract.balanceOf(findonftOwner)
      expect(findcnftOwnerFind_2.sub(findcnftOwnerFind_1)).eq(collectForBuilderFind.cAmount);
      expect(findonftOwnerFind_2.sub(findonftOwnerFind_1)).eq(collectForBuilderFind.oAmount);
      expect(collectForBuilderFind.cAmount.add(collectForBuilderFind.oAmount)).eq(earnContractFind);

      // osp1 claim
      const signatureValidatorContract = (await (
        await ethers.getContractFactory("SignatureValidator")
      ).deploy()) as SignatureValidator;

      await earnContract.setSignatureAddress(signatureValidatorContract.address);

      let osp1ClaimMessageHashOrigin = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [osp1Address, newOwnerWallet.address]
      ));
      let osp1ClaimMessageHash = ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', osp1ClaimMessageHashOrigin],
      )
      let osp1ClaimMessageHashErrOrigin = ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [osp1Address, userWallet.address]
      ));
      let osp1ClaimMessageHashErr = ethers.utils.solidityKeccak256(
        ['string', 'bytes32'],
        ['\x19Ethereum Signed Message:\n32', osp1ClaimMessageHashErrOrigin],
      )

      await signatureValidatorContract.signMessage(osp1ClaimMessageHash);

      expect(
        await signatureValidatorContract.isValidHash(osp1ClaimMessageHash)
      ).eq(true)

      expect(
        await signatureValidatorContract.isValidHash(osp1ClaimMessageHashErr)
      ).eq(false)

      await expect(
        earnContract.connect(userWallet).claimOSPOwnerNFT(osp1Address, userWallet.address, "0x")
      ).revertedWith("SE1");

      await expect(
        earnContract.connect(userWallet).claimOSPOwnerNFT(osp1Address, newOwnerWallet.address, "0x1234")
      ).revertedWith("SLE");

      await earnContract.connect(userWallet).claimOSPOwnerNFT(osp1Address, newOwnerWallet.address, "0x")

      await expect(
        earnContract.connect(userWallet).claimOSPOwnerNFT(osp1Address, newOwnerWallet.address, "0x")
      ).revertedWith("AC1")

    });
  });
});
