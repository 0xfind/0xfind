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

describe("Mortgage.multiply.add.approve", function () {
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
    });

    it("xxx", async function () {
      // user1 get find
      await findContract
        .connect(deployWallet)
        .transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));
      // user2 get find
      await findContract
        .connect(deployWallet)
        .transfer(user2Wallet.address, BigNumber.from(10).pow(18).mul(20_0000));

      // user1 multiply 2
      // user2 multiply 2
      // user2 multiply 1
      const AllFindAmount = BigNumber.from("107651316321812034514918");
      const amountPayMax = BigNumber.from("107651316321812034514918");
      const user1AllFindAmount1 = BigNumber.from("43060526528724813805966");
      const user1amountPayMax1 = BigNumber.from("43060526528724813805966");
      const user2AllFindAmount2 = BigNumber.from("43060526528724813805966");
      const user2amountPayMax2 = BigNumber.from("43060526528724813805966");
      const user2AllFindAmount3 = BigNumber.from("21530263264362406902986");
      const user2amountPayMax3 = BigNumber.from("21530263264362406902986");
      expect(AllFindAmount).eq(
        user1AllFindAmount1.add(user2AllFindAmount2).add(user2AllFindAmount3)
      );

      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const user2Find1 = await findContract.balanceOf(user2Wallet.address);
      const mortgageFind1 = await findContract.balanceOf(mortgageContract.address);
      const earnOsp1 = await osp1.balanceOf(earnContract.address);
      const user1Osp1 = await osp1.balanceOf(user1Wallet.address);
      const user2Osp1 = await osp1.balanceOf(user2Wallet.address);
      const mortgageOsp1 = await osp1.balanceOf(mortgageContract.address);

      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, AllFindAmount);
      await findContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, AllFindAmount);

      const user1MultiplyInfo = await mortgageContract
        .connect(user1Wallet)
        .callStatic.multiply(
          osp1.address,
          AllFindAmount,
          amountPayMax,
          findContract.address
        );


      const user1MultiplyInfoSplit1 = await mortgageContract
        .connect(user1Wallet)
        .callStatic.multiply(
          osp1.address,
          user1AllFindAmount1,
          user1amountPayMax1,
          findContract.address
        );
      await mortgageContract
        .connect(user1Wallet)
        .multiply(
          osp1.address,
          user1AllFindAmount1,
          user1amountPayMax1,
          findContract.address
        );

      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const user2Find2 = await findContract.balanceOf(user2Wallet.address);
      const mortgageFind2 = await findContract.balanceOf(mortgageContract.address);
      const earnOsp2 = await osp1.balanceOf(earnContract.address);
      const user1Osp2 = await osp1.balanceOf(user1Wallet.address);
      const user2Osp2 = await osp1.balanceOf(user2Wallet.address);
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      expect(earnFind2).gt(earnFind1);
      expect(user1Find1.sub(user1Find2)).eq(user1MultiplyInfoSplit1.amountNeedPay);
      expect(user2Find2).eq(user2Find1);
      expect(mortgageFind2).eq(mortgageFind1).eq(0);
      expect(earnOsp2).eq(earnOsp1).eq(0);
      expect(user1Osp1).eq(user1Osp2).eq(0);
      expect(user2Osp1).eq(user2Osp2).eq(0);
      expect(mortgageOsp2.sub(mortgageOsp1)).eq(user1MultiplyInfoSplit1.positionOspAmountDelta)
   
      await mortgageContract.connect(user1Wallet).approve(user2Wallet.address, user1MultiplyInfo.tokenId);

      const user2MultiplyInfoSplit2 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiplyAdd(
          user1MultiplyInfo.tokenId,
          user2AllFindAmount2,
          user2amountPayMax2,
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .multiplyAdd(
          user1MultiplyInfo.tokenId,
          user2AllFindAmount2,
          user2amountPayMax2,
          findContract.address
        );


      const user2MultiplyInfoSplit3 = await mortgageContract
        .connect(user2Wallet)
        .callStatic.multiplyAdd(
          user1MultiplyInfo.tokenId,
          user2AllFindAmount3,
          user2amountPayMax3,
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .multiplyAdd(
          user1MultiplyInfo.tokenId,
          user2AllFindAmount3,
          user2amountPayMax3,
          findContract.address
        );

      const earnFind3 = await findContract.balanceOf(earnContract.address);
      const user1Find3 = await findContract.balanceOf(user1Wallet.address);
      const user2Find3 = await findContract.balanceOf(user2Wallet.address);
      const mortgageFind3 = await findContract.balanceOf(mortgageContract.address);
      const earnOsp3 = await osp1.balanceOf(earnContract.address);
      const user1Osp3 = await osp1.balanceOf(user1Wallet.address);
      const user2Osp3 = await osp1.balanceOf(user2Wallet.address);
      const mortgageOsp3 = await osp1.balanceOf(mortgageContract.address);

      expect(earnFind3).gt(earnFind2);
      expect(user1Find3).eq(user1Find2);
      expect(user2Find2.sub(user2Find3)).eq(
        user2MultiplyInfoSplit2.amountNeedPay.add(
          user2MultiplyInfoSplit3.amountNeedPay
        )
      )
      expect(mortgageFind3).eq(mortgageFind2).eq(0);
      expect(earnOsp3).eq(earnOsp2).eq(0);
      expect(user1Osp3).eq(user1Osp2).eq(0);
      expect(user2Osp3).eq(user2Osp2).eq(0);
      expect(mortgageOsp3.sub(mortgageOsp2)).eq(
        user2MultiplyInfoSplit2.positionOspAmountDelta.add(
          user2MultiplyInfoSplit3.positionOspAmountDelta
        )
      );

      const user1Position1 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      expect(user1Position1.length).eq(1);
      expect(user1Position1[0].tokenId).eq(user1MultiplyInfo.tokenId);
      expect(user1Position1[0].ospAsset).eq(osp1.address);
      expect(user1Position1[0].ospAmount).eq(ospAmount5.sub(2));

      const user2MintTotalSupply = await findContract.totalSupply();

      expect(user2MintTotalSupply).eq(
        BigNumber.from("100000106574803158593914169768").sub(2)
      );
      expect(earnFind3.sub(earnFind1)).eq(
        BigNumber.from("532874015792969570848").sub(1)
      );

      expect(user1Find1.sub(user1Find2).add(user2Find2.sub(user2Find3)))
        .eq(user1MultiplyInfo.amountNeedPay.add(1))
        .eq(
          user1MultiplyInfoSplit1.amountNeedPay
            .add(user2MultiplyInfoSplit2.amountNeedPay)
            .add(user2MultiplyInfoSplit3.amountNeedPay)
        );

      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0);
      expect(await osp1.balanceOf(mortgageContract.address)).eq(ospAmount5.sub(2));

      // user2 redeem 5
      // psoitoio no
      await findContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      const user2ReddemInfo = await mortgageContract
        .connect(user2Wallet)
        .callStatic.redeem(
          user1MultiplyInfo.tokenId,
          ospAmount5.sub(2),
          await findContract.balanceOf(user2Wallet.address),
          findContract.address
        );
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user1MultiplyInfo.tokenId,
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
