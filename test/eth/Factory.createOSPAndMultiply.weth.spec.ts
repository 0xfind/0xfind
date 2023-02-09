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
} from "../../typechain";

import {
  deployAllContractWethFindForEth,
  DEFAULT_OSP_POOL_CONFIG_0,
  DEFAULT_OSP_POOL_CONFIG_1,
  ZERO_ADDRESS,
  UNISWAP_V3_POSITIONS,
  UNISWAP_ROUTER,
} from "../share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount, SwapRouter } from "@uniswap/v3-sdk";
import { Console } from "console";

describe("Factory.createOSPAndMultiply.weth", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    user1Wallet = wallets[2];
  });

  describe("createOSPAndMultiply", function () {
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
    let swapRouter: ISwapRouter02;

    before(async function () {
      let allInfo = await deployAllContractWethFindForEth();
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

      swapRouter = (await ethers.getContractAt(
        "ISwapRouter02",
        UNISWAP_ROUTER
      )) as ISwapRouter02;

      findOldTotalSupply = await findContract.totalSupply();

      await swapRouter.connect(deployWallet).exactOutputSingle(
        {
          tokenIn: wethContract.address,
          tokenOut: findContract.address,
          fee: FeeAmount.LOWEST,
          recipient: deployWallet.address,
          amountOut: BigNumber.from(10).pow(18).mul(100_000_000),
          amountInMaximum: BigNumber.from(10).pow(18).mul(200_000),
          sqrtPriceLimitX96: 0,
        },
        { value: BigNumber.from(10).pow(18).mul(200_000) }
      );
      await swapRouter.refundETH();
      expect(await findContract.balanceOf(deployWallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
      );
    });

    it("weth", async function () {
      expect(await findContract.balanceOf(factoryContract.address)).eq(928);
      const buyNFTFindAmount = BigNumber.from(10).pow(18).mul(3);
      const buyNFTTokenAmountMax = BigNumber.from(10).pow(18).mul(3);
      const otherToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);

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
        buyNFTTokenAmountMax: buyNFTTokenAmountMax,
        buyNFTFindAmount: buyNFTFindAmount,
        tokenToFindOutPath: otherToFindOutPath,
        signature: "",
      };
      osp1Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [
                osp1Params.base,
                osp1Params.deadline,
                osp1Params.buyNFTTokenAmountMax,
                osp1Params.buyNFTFindAmount,
                osp1Params.tokenToFindOutPath,
                user1Wallet.address
              ]
            )
          )
        )
      );
      const AllFindAmount = BigNumber.from("107651316321812034514918");
      const amountPayMax = BigNumber.from("107651316321812034514918");

      const staticInfo = await factoryContract
        .connect(user1Wallet)
        .callStatic.createOSPAndMultiply(
          osp1Params,
          AllFindAmount,
          amountPayMax,
          {value: amountPayMax.add(osp1Params.buyNFTTokenAmountMax)}
        );

      await expect(
        factoryContract
          .connect(user1Wallet)
          .createOSPAndMultiply(
            osp1Params,
            AllFindAmount,
            staticInfo.amountNeedPay.sub(1),
            {value: staticInfo.amountNeedPay.sub(1).add(osp1Params.buyNFTTokenAmountMax)}
          )
      ).revertedWith("E");

      const user1Eth1 = await user1Wallet.getBalance();
      const user1Weth1 = await wethContract.balanceOf(user1Wallet.address);
      const user1Find1 = await findContract.balanceOf(user1Wallet.address);

      const mortgageEth1 = await ethers.provider.getBalance(
        mortgageContract.address
      );
      const mortgageWeth1 = await wethContract.balanceOf(
        mortgageContract.address
      );
      const mortgageFind1 = await findContract.balanceOf(
        mortgageContract.address
      );

      const earnEth1 = await ethers.provider.getBalance(earnContract.address);
      const earnWeth1 = await wethContract.balanceOf(earnContract.address);
      const earnFind1 = await findContract.balanceOf(earnContract.address);

      const factoryEth1 = await ethers.provider.getBalance(
        earnContract.address
      );
      const factoryWeth1 = await wethContract.balanceOf(
        factoryContract.address
      );
      const factoryFind1 = await findContract.balanceOf(
        factoryContract.address
      );

      const gasPrice = BigNumber.from("9938115156");
      const t1 = await factoryContract
        .connect(user1Wallet)
        .createOSPAndMultiply(osp1Params, AllFindAmount, amountPayMax,
          { value: amountPayMax.add(osp1Params.buyNFTTokenAmountMax), gasPrice: gasPrice });
      const t1w = await t1.wait();
      const gas = t1w.gasUsed.mul(gasPrice);

      osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;

      const user1Eth2 = await user1Wallet.getBalance();
      const user1Weth2 = await wethContract.balanceOf(user1Wallet.address);
      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2 = await osp1.balanceOf(user1Wallet.address);

      const mortgageEth2 = await ethers.provider.getBalance(
        mortgageContract.address
      );
      const mortgageWeth2 = await wethContract.balanceOf(
        mortgageContract.address
      );
      const mortgageFind2 = await findContract.balanceOf(
        mortgageContract.address
      );
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      const earnEth2 = await ethers.provider.getBalance(earnContract.address);
      const earnWeth2 = await wethContract.balanceOf(earnContract.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);

      const factoryEth2 = await ethers.provider.getBalance(
        earnContract.address
      );
      const factoryWeth2 = await wethContract.balanceOf(
        factoryContract.address
      );
      const factoryFind2 = await findContract.balanceOf(
        factoryContract.address
      );
      const factoryOsp2 = await osp1.balanceOf(factoryContract.address);

      expect(staticInfo.nftNeedPay).eq(BigNumber.from("3000002312849750"));
      
      expect(staticInfo.positionOspAmountDelta).eq(ospAmount5);
      expect(staticInfo.tokenPay).eq(wethContract.address);

      expect(staticInfo.amountNeedPay).eq(
        BigNumber.from("1609388419768895395")
      );

      expect(user1Find1).eq(user1Find2);
      expect(user1Weth1).eq(user1Weth2);
      expect(user1Eth1.sub(user1Eth2).sub(gas)).eq(
        staticInfo.amountNeedPay.add(staticInfo.nftNeedPay)
      );
      expect(user1Osp2).eq(0);

      const position = await mortgageContract.positions(staticInfo.tokenId);

      expect(position.tokenId).eq(staticInfo.tokenId);
      expect(position.ospAsset).eq(osp1.address);
      expect(position.ospAmount).eq(ospAmount5);

      expect(await mortgageContract.ownerOf(staticInfo.tokenId)).eq(
        user1Wallet.address
      );

      expect(mortgageEth2).eq(mortgageEth1).eq(0);
      expect(mortgageWeth2).eq(mortgageWeth1).eq(0);
      expect(mortgageFind2).eq(mortgageFind1).eq(0);
      expect(mortgageOsp2).eq(ospAmount5);

      expect(factoryFind2).eq(factoryFind1);
      expect(factoryWeth2).eq(factoryWeth1).eq(0);
      expect(factoryEth2).eq(factoryEth1).eq(0);
      expect(factoryOsp2).eq(0);

      expect(await findContract.totalSupply()).eq(
        BigNumber.from("100000106574803158593914169768")
      );

      expect(earnWeth2).eq(earnWeth1).eq(0);
      expect(earnEth2).eq(earnEth1).eq(0);
      expect(earnFind2.sub(earnFind1).sub(buyNFTFindAmount)).eq(
        BigNumber.from("532874015792969570848")
      );

      expect(await findContract.balanceOf(factoryContract.address)).eq(928);
      expect(await wethContract.balanceOf(factoryContract.address)).eq(0);
      expect(await osp1.balanceOf(factoryContract.address)).eq(0);
    });
  });
});
