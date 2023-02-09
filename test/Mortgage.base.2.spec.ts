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

describe("Mortgage.base.2", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let newSignatureWallet: SignerWithAddress;
  let newOwnerWallet: SignerWithAddress;
  let userWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;
  let user2Wallet: SignerWithAddress;
  let user3Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    newSignatureWallet = wallets[2];
    newOwnerWallet = wallets[3];
    userWallet = wallets[4];

    user1Wallet = wallets[5];
    user2Wallet = wallets[6];
    user3Wallet = wallets[7];
  });

  describe("positions approve from", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let wethContract: WETH;
    let mortgageContract: Mortgage;
    let mathContract: Math;
    const osp1Info = {
        name: "github.com/1/1",
        symbol: "0XOSP1",
        projectid: "github/1/1"
    }
    const osp2Info = {
        name: "github.com/1/2",
        symbol: "0XOSP2",
        projectid: "github/1/2"
    }
    const osp3Info = {
        name: "github.com/1/3",
        symbol: "0XOSP3",
        projectid: "github/1/3"
    }
    const osp4Info = {
        name: "github.com/1/4",
        symbol: "0XOSP4",
        projectid: "github/1/4"
    }
    const osp5Info = {
        name: "github.com/1/5",
        symbol: "0XOSP5",
        projectid: "github/1/5"
    }
    const osp6Info = {
        name: "github.com/1/6",
        symbol: "0XOSP6",
        projectid: "github/1/6"
    }

    const createOsp = async function (
        name: string,
        symbol: string,
        projectid: string
      ) {
        // factory osp config0
        const ospParams = {
          base: {
            name: name,
            symbol: symbol,
            projectId: projectid,
            stars: 1,
            poolConfigIndex: 0,
            nftPercentConfigIndex: 0,
          },
          deadline: parseInt(
            (new Date().getTime() / 1000).toString().substr(0, 10)
          ),
          signature: "",
        };
        ospParams.signature = await signatureWallet.signMessage(
          ethers.utils.arrayify(
            ethers.utils.keccak256(
              ethers.utils.defaultAbiCoder.encode(
                [
                  "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                  "uint256",
                  "address",
                ],
                [ospParams.base, ospParams.deadline, userWallet.address]
              )
            )
          )
        );
        await factoryContract
          .connect(userWallet)
          .createOSPByProjectOwner(ospParams);
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

      await createOsp(osp1Info.name, osp1Info.symbol, osp1Info.projectid);
      await createOsp(osp2Info.name, osp2Info.symbol, osp2Info.projectid);
      await createOsp(osp3Info.name, osp3Info.symbol, osp3Info.projectid);
   
    });

    it("xxx", async function () {
      const osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1Info.projectid)
      )) as IERC20;
      const osp2 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp2Info.projectid)
      )) as IERC20;
      const osp3 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp3Info.projectid)
      )) as IERC20;

      const swapRouter = (await ethers.getContractAt(
        "ISwapRouter02",
        UNISWAP_ROUTER
      )) as ISwapRouter02;

      // buy find
      await wethContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      console.log(0);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: wethContract.address,
        tokenOut: findContract.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(90_000_000_000),
        amountInMaximum: BigNumber.from(10).pow(18).mul(100_000_000),
        sqrtPriceLimitX96: 0,
      });
      console.log(1);
      expect(await findContract.balanceOf(deployWallet.address)).eq(
        BigNumber.from(10).pow(18).mul(90_000_000_000)
      );

      // buy osp
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
        amountOut: BigNumber.from(10).pow(18).mul(10000),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(10000),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp3.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(10000),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });

      await osp1.connect(deployWallet).transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(1000))
      await osp1.connect(deployWallet).transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(1000))
      
      await osp2.connect(deployWallet).transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(1000))
      await osp2.connect(deployWallet).transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(1000))

      await findContract.connect(deployWallet).transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(1000))
      await findContract.connect(deployWallet).transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(1000))

      await osp1.connect(user1Wallet).approve(mortgageContract.address, await osp1.totalSupply())
      await osp1.connect(user2Wallet).approve(mortgageContract.address, await osp1.totalSupply())

      await osp2.connect(user1Wallet).approve(mortgageContract.address, await osp2.totalSupply())
      await osp2.connect(user2Wallet).approve(mortgageContract.address, await osp2.totalSupply())

      await findContract.connect(user1Wallet).approve(mortgageContract.address, await findContract.totalSupply())
      await findContract.connect(user2Wallet).approve(mortgageContract.address, await findContract.totalSupply())

      //// user1 mortage osp1
      //// user1 mortage osp2
      //// user2 mortage osp1
      //// user2 mortage osp2
      //// user1 mortage osp1

      // user1 mortage osp1
      const info1 = await mortgageContract.connect(user1Wallet).callStatic.mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )
      await mortgageContract.connect(user1Wallet).mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )

      //// user1 mortage osp2
      const info2 = await mortgageContract.connect(user1Wallet).callStatic.mortgage(
        osp2.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )
      await mortgageContract.connect(user1Wallet).mortgage(
        osp2.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )

      //// user2 mortage osp1
      const info3 = await mortgageContract.connect(user2Wallet).callStatic.mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )
      await mortgageContract.connect(user2Wallet).mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )

      //// user2 mortage osp2
      const info4 = await mortgageContract.connect(user2Wallet).callStatic.mortgage(
        osp2.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )
      await mortgageContract.connect(user2Wallet).mortgage(
        osp2.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )

      //// user1 mortage osp1
      const info5 = await mortgageContract.connect(user1Wallet).callStatic.mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )
      await mortgageContract.connect(user1Wallet).mortgage(
        osp1.address,
        BigNumber.from(10).pow(18).mul(100),
        findContract.address,
      )

      // positionsOfOwnerByOsp and positionsOfOwner
      const user1Positions = await mortgageContract.positionsOfOwner(user1Wallet.address);
      const user2Positions = await mortgageContract.positionsOfOwner(user2Wallet.address);

      //// user1 mortage osp1 1
      //// user1 mortage osp2 2
      //// user1 mortage osp1 5
      expect(user1Positions.length).eq(3)
      expect(user1Positions[0].tokenId).eq(info1.tokenId)
      expect(user1Positions[0].ospAsset).eq(osp1.address)
      expect(user1Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user1Positions[1].tokenId).eq(info2.tokenId)
      expect(user1Positions[1].ospAsset).eq(osp2.address)
      expect(user1Positions[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user1Positions[2].tokenId).eq(info5.tokenId)
      expect(user1Positions[2].ospAsset).eq(osp1.address)
      expect(user1Positions[2].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      //// user2 mortage osp1 3 
      //// user2 mortage osp2 4
      expect(user2Positions.length).eq(2)
      expect(user2Positions[0].tokenId).eq(info3.tokenId)
      expect(user2Positions[0].ospAsset).eq(osp1.address)
      expect(user2Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user2Positions[1].tokenId).eq(info4.tokenId)
      expect(user2Positions[1].ospAsset).eq(osp2.address)
      expect(user2Positions[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      //// user1 mortage osp1 1
      //// user1 mortage osp2 2
      //// user2 mortage osp1 3
      //// user2 mortage osp2 4
      //// user1 mortage osp1 5
      const user1Osp1Positions = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp1.address);
      const user1Osp2Positions = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp2.address);
      const user2Osp1Positions = await mortgageContract.positionsOfOwnerByOsp(user2Wallet.address, osp1.address);
      const user2Osp2Positions = await mortgageContract.positionsOfOwnerByOsp(user2Wallet.address, osp2.address);
      
      expect(user1Osp1Positions.length).eq(2)
      expect(user1Osp1Positions[0].tokenId).eq(info1.tokenId)
      expect(user1Osp1Positions[0].ospAsset).eq(osp1.address)
      expect(user1Osp1Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user1Osp1Positions[1].tokenId).eq(info5.tokenId)
      expect(user1Osp1Positions[1].ospAsset).eq(osp1.address)
      expect(user1Osp1Positions[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user1Osp2Positions.length).eq(1)
      expect(user1Osp2Positions[0].tokenId).eq(info2.tokenId)
      expect(user1Osp2Positions[0].ospAsset).eq(osp2.address)
      expect(user1Osp2Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user2Osp1Positions.length).eq(1)
      expect(user2Osp1Positions[0].tokenId).eq(info3.tokenId)
      expect(user2Osp1Positions[0].ospAsset).eq(osp1.address)
      expect(user2Osp1Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user2Osp2Positions.length).eq(1)
      expect(user2Osp2Positions[0].tokenId).eq(info4.tokenId)
      expect(user2Osp2Positions[0].ospAsset).eq(osp2.address)
      expect(user2Osp2Positions[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))


      await mortgageContract.connect(user1Wallet).approve(user2Wallet.address, info5.tokenId);
      await mortgageContract.connect(user2Wallet)["safeTransferFrom(address,address,uint256)"](
        user1Wallet.address,
        user2Wallet.address,
        info5.tokenId
      )

      // positionsOfOwnerByOsp and positionsOfOwner
      const user1Positions2 = await mortgageContract.positionsOfOwner(user1Wallet.address);
      const user2Positions2 = await mortgageContract.positionsOfOwner(user2Wallet.address);

      //// user1 mortage osp1 1
      //// user1 mortage osp2 2
      expect(user1Positions2.length).eq(2)
      expect(user1Positions2[0].tokenId).eq(info1.tokenId)
      expect(user1Positions2[0].ospAsset).eq(osp1.address)
      expect(user1Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user1Positions2[1].tokenId).eq(info2.tokenId)
      expect(user1Positions2[1].ospAsset).eq(osp2.address)
      expect(user1Positions2[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      //// user2 mortage osp1 3 
      //// user2 mortage osp2 4
      //// user2 have osp1 5
      expect(user2Positions2.length).eq(3)
      expect(user2Positions2[0].tokenId).eq(info3.tokenId)
      expect(user2Positions2[0].ospAsset).eq(osp1.address)
      expect(user2Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user2Positions2[1].tokenId).eq(info4.tokenId)
      expect(user2Positions2[1].ospAsset).eq(osp2.address)
      expect(user2Positions2[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user2Positions2[2].tokenId).eq(info5.tokenId)
      expect(user2Positions2[2].ospAsset).eq(osp1.address)
      expect(user2Positions2[2].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      //// user1 mortage osp1 1
      //// user1 mortage osp2 2
      //// user2 mortage osp1 3
      //// user2 mortage osp2 4
      //// user2 have osp1 5
      const user1Osp1Positions2 = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp1.address);
      const user1Osp2Positions2 = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp2.address);
      const user2Osp1Positions2 = await mortgageContract.positionsOfOwnerByOsp(user2Wallet.address, osp1.address);
      const user2Osp2Positions2 = await mortgageContract.positionsOfOwnerByOsp(user2Wallet.address, osp2.address);
      
      expect(user1Osp1Positions2.length).eq(1)
      expect(user1Osp1Positions2[0].tokenId).eq(info1.tokenId)
      expect(user1Osp1Positions2[0].ospAsset).eq(osp1.address)
      expect(user1Osp1Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user1Osp2Positions2.length).eq(1)
      expect(user1Osp2Positions2[0].tokenId).eq(info2.tokenId)
      expect(user1Osp2Positions2[0].ospAsset).eq(osp2.address)
      expect(user1Osp2Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user2Osp1Positions2.length).eq(2)
      expect(user2Osp1Positions2[0].tokenId).eq(info3.tokenId)
      expect(user2Osp1Positions2[0].ospAsset).eq(osp1.address)
      expect(user2Osp1Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))
      expect(user2Osp1Positions2[1].tokenId).eq(info5.tokenId)
      expect(user2Osp1Positions2[1].ospAsset).eq(osp1.address)
      expect(user2Osp1Positions2[1].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      expect(user2Osp2Positions2.length).eq(1)
      expect(user2Osp2Positions2[0].tokenId).eq(info4.tokenId)
      expect(user2Osp2Positions2[0].ospAsset).eq(osp2.address)
      expect(user2Osp2Positions2[0].ospAmount).eq(BigNumber.from(10).pow(18).mul(100))

      // user2 mortgageAdd token1
      // user2 multiplyAdd token1
      await expect(await mortgageContract.ownerOf(info1.tokenId)).eq(user1Wallet.address);
      await expect(
        mortgageContract.connect(user2Wallet).mortgageAdd(info1.tokenId, BigNumber.from(10).pow(18).mul(100), findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");
      await expect(
        mortgageContract.connect(user2Wallet).multiplyAdd(info1.tokenId, BigNumber.from(10).pow(18).mul(100), BigNumber.from(10).pow(18).mul(100), findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");
      await expect(
        mortgageContract.connect(user2Wallet).redeem(info1.tokenId, BigNumber.from(10).pow(18).mul(10), BigNumber.from(10).pow(18).mul(100), findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");
      await expect(
        mortgageContract.connect(user2Wallet).cash(info1.tokenId, BigNumber.from(10).pow(18).mul(10), findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");

      await mortgageContract.connect(user1Wallet).approve(user2Wallet.address, info1.tokenId);

      // user2 mortgageAdd token1
      await mortgageContract.connect(user2Wallet).mortgageAdd(info1.tokenId, BigNumber.from(10).pow(18).mul(100), findContract.address);
      // user2 multiplyAdd token1
      await mortgageContract.connect(user2Wallet).multiplyAdd(info1.tokenId, BigNumber.from(10).pow(18).mul(100), BigNumber.from(10).pow(18).mul(100), findContract.address)
      
      // user2 redeem token1
      await mortgageContract.connect(user2Wallet).redeem(info1.tokenId, BigNumber.from(10).pow(18).mul(10), BigNumber.from(10).pow(18).mul(100), findContract.address)

      // user2 cash token1
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(100000),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await mortgageContract.connect(user2Wallet).cash(info1.tokenId, BigNumber.from(10).pow(18).mul(10), findContract.address)

      // user1 split token3 (new token onwer is sender)
      // user merge 3 5
      await expect(await mortgageContract.ownerOf(info3.tokenId)).eq(user2Wallet.address);
      await expect(await mortgageContract.ownerOf(info5.tokenId)).eq(user2Wallet.address);
      
      await expect(
        mortgageContract.connect(user1Wallet).split(info3.tokenId, 1, 100, findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");
      await expect(
        mortgageContract.connect(user1Wallet).merge(info3.tokenId, info5.tokenId, findContract.address)
      ).revertedWith("ERC721: caller is not token owner nor approved");

      await mortgageContract.connect(user2Wallet).approve(user1Wallet.address, info3.tokenId);
      await mortgageContract.connect(user2Wallet).approve(user1Wallet.address, info5.tokenId);

      const splitInfo = await mortgageContract.connect(user1Wallet).callStatic.split(info3.tokenId, BigNumber.from(10).pow(18).mul(10), BigNumber.from(10).pow(18).mul(100), findContract.address)
      await mortgageContract.connect(user1Wallet).split(info3.tokenId, BigNumber.from(10).pow(18).mul(10), BigNumber.from(10).pow(18).mul(100), findContract.address)
      expect(await mortgageContract.ownerOf(splitInfo.newTokenId)).eq(user1Wallet.address);
      
      await mortgageContract.connect(user1Wallet).merge(info3.tokenId, info5.tokenId, findContract.address)

    });
  });
});
