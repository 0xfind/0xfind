import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Factory, IFactory, IUniswapV3Pool, Find, WETH, USDT, OSP, INonfungiblePositionManager, IERC20, Mortgage, Earn, FindNFT, ISwapRouter02 } from "../typechain";

import { deployAllContractWethFind, DEFAULT_OSP_POOL_CONFIG_0, DEFAULT_OSP_POOL_CONFIG_1, ZERO_ADDRESS, UNISWAP_V3_POSITIONS, UNISWAP_ROUTER } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Earn.collectOspUniswapLPFee.c0", function () {
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

  describe("collect", function () {
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
      await factoryContract.connect(deployWallet).addNFTPercentConfig(0, 10000);
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
        const swapRouter = (await ethers.getContractAt(
            "ISwapRouter02", UNISWAP_ROUTER
        )) as ISwapRouter02;
    
        const osp1ProjectId = "github/1/1";
        const osp2ProjectId = "github/1/2";

        const osp2Address = await factoryContract.projectId2OspToken(osp2ProjectId);
        // osp2 claim success
        const osp2ClaimSignature = await signatureWallet.signMessage(
        ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
            ["address", "address"],
            [osp2Address, newOwnerWallet.address]
        )))
        );
        await earnContract.connect(userWallet).claimOSPOwnerNFT(osp2Address, newOwnerWallet.address, osp2ClaimSignature)

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
        // collect error address
        await expect(earnContract.collectOspUniswapLPFee(deployWallet.address)).revertedWith("NE");

        // collect empty osp1
        const osp1CnftOwnerFind1 = await findContract.balanceOf(osp1CnftOwner);
        const osp1CnftOwnerOsp1 = await osp1.balanceOf(osp1CnftOwner);
        const osp1OnftOwnerFind1 = await findContract.balanceOf(osp1OnftOwner);
        const osp1OnftOwnerOsp1 = await osp1.balanceOf(osp1OnftOwner);
        await earnContract.collectOspUniswapLPFee(osp1.address);
        const osp1CnftOwnerFind2 = await findContract.balanceOf(osp1CnftOwner);
        const osp1CnftOwnerOsp2 = await osp1.balanceOf(osp1CnftOwner);
        const osp1OnftOwnerFind2 = await findContract.balanceOf(osp1OnftOwner);
        const osp1OnftOwnerOsp2 = await osp1.balanceOf(osp1OnftOwner);
        expect(osp1CnftOwnerFind2.sub(osp1CnftOwnerFind1)).eq(0);
        expect(osp1CnftOwnerOsp2.sub(osp1CnftOwnerOsp1)).eq(0);
        expect(osp1OnftOwnerFind2.sub(osp1OnftOwnerFind1)).eq(0);
        expect(osp1OnftOwnerOsp2.sub(osp1OnftOwnerOsp1)).eq(0);

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
        expect(osp1CnftOwnerFind3.sub(osp1CnftOwnerFind2)).eq(collectOspUniswapLPFeeInfo1.cAmount).eq(0);
        expect(osp1CnftOwnerOsp3.sub(osp1CnftOwnerOsp2)).eq(0);
        expect(osp1OnftOwnerFind3.sub(osp1OnftOwnerFind2)).eq(0);
        expect(osp1OnftOwnerOsp3.sub(osp1OnftOwnerOsp2)).eq(collectOspUniswapLPFeeInfo1.oAmount).eq(BigNumber.from("989972277029413204"));

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

        expect(osp2CnftOwnerFind2.sub(osp2CnftOwnerFind1)).eq(collectOspUniswapLPFeeInfo2.cAmount).eq(0);
        expect(osp2CnftOwnerOsp2.sub(osp2CnftOwnerOsp1)).eq(0);
        expect(osp2OnftOwnerFind2.sub(osp2OnftOwnerFind1)).eq(0);
        expect(osp2OnftOwnerOsp2.sub(osp2OnftOwnerOsp1)).eq(collectOspUniswapLPFeeInfo2.oAmount).eq(BigNumber.from("10897504046045602318"));

        expect(earnFind2).eq(earnFind1);
        expect(earnOsp2_2).eq(earnOsp2_1);

     
    });
  });
});
