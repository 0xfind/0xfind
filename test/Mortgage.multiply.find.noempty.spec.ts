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

describe("Mortgage.multiply.find.noempty", function () {
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

      await findContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
    });

    it("xxx", async function () {
      // buy osp
      await findContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(210000),
        amountInMaximum: BigNumber.from(10).pow(18).mul(100_000_000),
        sqrtPriceLimitX96: 0,
      });

      // find
      const AllFindAmount = BigNumber.from("107651316321812034514918");
      const amountPayMax = AllFindAmount;
      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, amountPayMax);

      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const mortgageFind1 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user1Osp1 = await osp1.balanceOf(user1Wallet.address);
      const earn1Osp1 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp1 = await osp1.balanceOf(mortgageContract.address);

      const info = await mortgageContract
        .connect(user1Wallet)
        .callStatic.multiply(
          osp1.address,
          AllFindAmount,
          amountPayMax,
          findContract.address
        );

      await mortgageContract
        .connect(user1Wallet)
        .multiply(
          osp1.address,
          AllFindAmount,
          amountPayMax,
          findContract.address
        );

      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const mortgageFind2 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user1Osp2 = await osp1.balanceOf(user1Wallet.address);
      const earn1Osp2 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      const ospAmount = BigNumber.from("79730814757037698326322");

      const inFind = BigNumber.from("27418915382037906216699");
      const feeFind = BigNumber.from("403177894169719237679");

      const redeemFind = BigNumber.from("80635578833943847535898");

      expect(user1Find1.sub(user1Find2)).eq(inFind);
      expect(earnFind2.sub(earnFind1)).eq(feeFind);
      expect(mortgageFind2).eq(mortgageFind1).eq(0);
      expect(user1Osp2).eq(user1Osp1).eq(0);
      expect(earn1Osp2).eq(earn1Osp1).eq(0);
      expect(mortgageOsp2.sub(mortgageOsp1)).eq(ospAmount);

      expect(info.positionOspAmountDelta).eq(ospAmount);
      expect(info.payFindAmount).eq(inFind);
      expect(info.amountNeedPay).eq(inFind);
      expect(info.tokenPay).eq(findContract.address);

      const positions = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      expect(positions.length).eq(1);
      expect(positions[0].tokenId).eq(info.tokenId);
      expect(positions[0].ospAsset).eq(osp1.address);
      expect(positions[0].ospAmount).eq(ospAmount);

      expect(await findContract.totalSupply())
        .eq(findOldTotalSupply.add(AllFindAmount).sub(inFind.sub(feeFind)))
        .eq(findOldTotalSupply.add(redeemFind));

      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      const infoRedeem = await mortgageContract
        .connect(user1Wallet)
        .callStatic.redeem(
          info.tokenId,
          ospAmount,
          await findContract.totalSupply(),
          findContract.address
        );
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          info.tokenId,
          ospAmount,
          await findContract.totalSupply(),
          findContract.address
        );

      expect(infoRedeem.amountIn).eq(BigNumber.from(redeemFind));
      const positions2 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      expect(positions2.length).eq(0);

      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
    });
  });
});
