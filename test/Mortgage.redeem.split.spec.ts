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

describe("Mortgage.redeem.split", function () {
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
    const ospAmount1 = BigNumber.from(10).pow(18).mul(21000);
    const ospAmount5 = ospAmount1.mul(5);
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
        amountOut: ospAmount5.mul(13),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount5.mul(13));
    });

    it("xxx", async function () {
      // user1 user2 get osp get find

      await findContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
      await findContract
        .connect(deployWallet)
        .transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount5);
      await osp1
        .connect(deployWallet)
        .transfer(user2Wallet.address, ospAmount5);

      // user1 morget 5
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const user1MortgageInfo = await mortgageContract
        .connect(user1Wallet)
        .callStatic.mortgage(osp1.address, ospAmount5, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount5, findContract.address);
      const user1Position1 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      expect(user1Position1.length).eq(1);
      expect(user1Position1[0].tokenId).eq(user1MortgageInfo.tokenId);
      expect(user1Position1[0].ospAsset).eq(osp1.address);
      expect(user1Position1[0].ospAmount).eq(ospAmount5);

      // user1 redeem 5
      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      const user1ReddemInfo = await mortgageContract
        .connect(user1Wallet)
        .callStatic.redeem(
          user1MortgageInfo.tokenId,
          ospAmount5,
          await findContract.balanceOf(user1Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1MortgageInfo.tokenId,
          ospAmount5,
          await findContract.balanceOf(user1Wallet.address),
          findContract.address
        );
      const user1Position2 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      expect(user1Position2.length).eq(0);
      expect(user1MortgageInfo.amountOut).lt(user1ReddemInfo.amountIn);
      expect(await findContract.totalSupply()).eq(findOldTotalSupply);

      // user2 mortgage 5
      await osp1
        .connect(user2Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      const user2Osp1StaticInfo = await mortgageContract
        .connect(user2Wallet).callStatic
        .mortgage(osp1.address, ospAmount5, findContract.address);
      await mortgageContract
        .connect(user2Wallet)
        .mortgage(osp1.address, ospAmount5, findContract.address);
      const user2Position1 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user2Position1.length).eq(1);
      expect(user2Position1[0].tokenId).eq(user2Osp1StaticInfo.tokenId);
      expect(user2Position1[0].ospAsset).eq(osp1.address);
      expect(user2Position1[0].ospAmount).eq(ospAmount5);

      // user2 redeem 2
      // user2 redeem 2
      // user2 redeem 1
      // psoitoio no

      const user2Find1 = await findContract.balanceOf(user2Wallet.address);
      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const mortgageFind1 = await findContract.balanceOf(mortgageContract.address);

      const user2Osp1 = await osp1.balanceOf(user2Wallet.address);
      const earnOsp1 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp1 = await osp1.balanceOf(mortgageContract.address);

      await findContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      const user2ReddemInfo = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount5,
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      const user2ReddemInfoSplit1 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      const user2ReddemInfoSplit2 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      const user2ReddemInfoSplit3 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(1),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2Osp1StaticInfo.tokenId,
          ospAmount1.mul(1),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );

      const user2Find2 = await findContract.balanceOf(user2Wallet.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const mortgageFind2 = await findContract.balanceOf(mortgageContract.address);

      const user2Osp2 = await osp1.balanceOf(user2Wallet.address);
      const earnOsp2 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      expect(user2Find1.sub(user2Find2)).eq(user2ReddemInfo.amountIn);
      expect(earnFind2).eq(earnFind1);
      expect(mortgageFind2).eq(mortgageFind1);

      expect(user2Osp2.sub(user2Osp1)).eq(ospAmount5);
      expect(earnOsp2).eq(earnOsp1).eq(0);
      expect(mortgageOsp1.sub(mortgageOsp2)).eq(ospAmount5);
  
      const user2Position2 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user2Position2.length).eq(0);

      expect(user2ReddemInfo.amountIn)
      .eq(
        user2ReddemInfoSplit1.amountIn
          .add(user2ReddemInfoSplit2.amountIn)
          .add(user2ReddemInfoSplit3.amountIn)
      ).eq(
        user2ReddemInfoSplit1.inFindAmount
          .add(user2ReddemInfoSplit2.inFindAmount)
          .add(user2ReddemInfoSplit3.inFindAmount)
      );

      expect(user2ReddemInfoSplit1.tokenIn).eq(findContract.address);
      expect(user2ReddemInfoSplit2.tokenIn).eq(findContract.address);
      expect(user2ReddemInfoSplit3.tokenIn).eq(findContract.address);

      expect(user2ReddemInfoSplit1.amountIn).gt(user2ReddemInfoSplit2.amountIn);

      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0);
    });
  });
});
