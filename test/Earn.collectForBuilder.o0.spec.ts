import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Factory, Find, WETH, USDT, INonfungiblePositionManager, IERC20, Earn, FindNFT, ISwapRouter02 } from "../typechain";

import { deployAllContractWethFind, DEFAULT_OSP_POOL_CONFIG_0, UNISWAP_V3_POSITIONS, UNISWAP_ROUTER } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Earn.collectForBuilder.o0", function () {
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

  describe("claim collect", function () {
    let usdtContract: USDT
    let wmatic: IERC20
    let nonfungiblePositionManager: INonfungiblePositionManager
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

      nonfungiblePositionManager = (await ethers.getContractAt(
        "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
      )) as INonfungiblePositionManager;
      wmatic = (await ethers.getContractAt(
        "IERC20",
        await nonfungiblePositionManager.WETH9()
      )) as IERC20;

      // addNFTPercentConfig
      await factoryContract.connect(deployWallet).addNFTPercentConfig(10000, 0);
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


    it("collect", async function () {
      const osp1ProjectId = "github/1/1";
      const osp2ProjectId = "github/1/2";

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


        // collect builder find
        const earnContractFind_3 = await findContract.balanceOf(earnContract.address);
        const findcnftOwnerFind_3 = await findContract.balanceOf(findcnftOwner)
        const findonftOwnerFind_3 = await findContract.balanceOf(findonftOwner)
        const collectForBuilderFind_3 = await earnContract.callStatic.collectForBuilder(findContract.address);
        await earnContract.collectForBuilder(findContract.address);
        const earnContractFind_4 = await findContract.balanceOf(earnContract.address);
        const findcnftOwnerFind_4 = await findContract.balanceOf(findcnftOwner)
        const findonftOwnerFind_4 = await findContract.balanceOf(findonftOwner)

        expect(findcnftOwnerFind_4.sub(findcnftOwnerFind_3)).eq(collectForBuilderFind_3.cAmount);
        expect(findonftOwnerFind_4.sub(findonftOwnerFind_3)).eq(collectForBuilderFind_3.oAmount).eq(0);

        expect(earnContractFind_3.sub(earnContractFind_4))
            .eq(collectForBuilderFind_3.cAmount)
            .eq(collectForBuilderFind_3.cAmount.add(collectForBuilderFind_3.oAmount));

    });
  });
});
