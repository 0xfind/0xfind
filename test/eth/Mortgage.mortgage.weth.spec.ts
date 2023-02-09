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
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Mortgage.mortgage.weth", function () {
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

  describe("mortgage", function () {
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
      expect(await findContract.balanceOf(deployWallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
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

      // user1  get osp1
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount5);

      expect(await osp1.balanceOf(user1Wallet.address)).eq(ospAmount5);

      await swapRouter.refundETH();
    });

    it("weth", async function () {
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());

      const findToWethInPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);

      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const mortgageFind1 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user1Weth1 = await wethContract.balanceOf(user1Wallet.address);
      const earnWeth1 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth1 = await wethContract.balanceOf(
        mortgageContract.address
      );

      const user1Eth1 = await ethers.provider.getBalance(user1Wallet.address)
      const earnEth1 = await ethers.provider.getBalance(earnContract.address)
      const mortgageEth1 = await ethers.provider.getBalance(mortgageContract.address)

      const user1Osp1 = await osp1.balanceOf(user1Wallet.address);
      const earnOsp1 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp1 = await osp1.balanceOf(mortgageContract.address);

      const gasPrice = BigNumber.from("9938115156");

      const mortgageInfo = await mortgageContract
        .connect(user1Wallet)
        .callStatic.mortgage(osp1.address, ospAmount5, findToWethInPath);
      const t1 = await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount5, findToWethInPath, {
          gasPrice: gasPrice
        });

      const t1w = await t1.wait();
      const gas = t1w.gasUsed.mul(gasPrice);

      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const mortgageFind2 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user1Weth2 = await wethContract.balanceOf(user1Wallet.address);
      const earnWeth2 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth2 = await wethContract.balanceOf(
        mortgageContract.address
      );

      const user1Eth2 = await ethers.provider.getBalance(user1Wallet.address)
      const earnEth2 = await ethers.provider.getBalance(earnContract.address)
      const mortgageEth2 = await ethers.provider.getBalance(mortgageContract.address)

      const user1Osp2 = await osp1.balanceOf(user1Wallet.address);
      const earnOsp2 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp2 = await osp1.balanceOf(mortgageContract.address);

      const allFind = BigNumber.from("106574803158593914169768");
      const outFind = BigNumber.from("106041929142800944598920");
      const feeFind = BigNumber.from("532874015792969570848");
      expect(outFind.add(feeFind)).eq(allFind);

      const outEth = BigNumber.from("106020803548411226628");

      expect(user1Find2).eq(user1Find1);
      expect(earnFind2.sub(earnFind1)).eq(feeFind);
      expect(mortgageFind2).eq(mortgageFind1).eq(0);

      expect(user1Weth2).eq(user1Weth1);
      expect(mortgageWeth2).eq(mortgageWeth1).eq(0);
      expect(earnWeth2).eq(earnWeth1).eq(0);

      expect(user1Eth2.sub(user1Eth1).add(gas)).eq(outEth);
      expect(mortgageEth2).eq(mortgageEth1).eq(0);
      expect(earnEth2).eq(earnEth1).eq(0);

      expect(user1Osp1.sub(user1Osp2)).eq(ospAmount5);
      expect(earnOsp2).eq(earnOsp1).eq(0);
      expect(mortgageOsp2.sub(mortgageOsp1)).eq(ospAmount5);

      const position = await mortgageContract.positions(mortgageInfo.tokenId);
      expect(position.tokenId).eq(mortgageInfo.tokenId);
      expect(position.ospAsset).eq(osp1.address);
      expect(position.ospAmount).eq(ospAmount5);
      expect(await mortgageContract.ownerOf(mortgageInfo.tokenId)).eq(
        user1Wallet.address
      );

      expect(mortgageInfo.outFindAmount).eq(outFind);
      expect(mortgageInfo.amountOut).eq(outEth);
      expect(mortgageInfo.tokenOut).eq(wethContract.address);

      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply.add(allFind)
      );

      // redeem
      const wethToFindOutPath =
        "0x" +
        findContract.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wethContract.address.slice(2);

      const redeemInfo = await mortgageContract
        .connect(user1Wallet)
        .callStatic.redeem(
          mortgageInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(200),
          wethToFindOutPath,
          {value: BigNumber.from(10).pow(18).mul(200)}
        );

      const t2 = await mortgageContract
        .connect(user1Wallet)
        .redeem(
          mortgageInfo.tokenId,
          ospAmount5,
          BigNumber.from(10).pow(18).mul(200),
          wethToFindOutPath,
          {value: BigNumber.from(10).pow(18).mul(200), gasPrice: gasPrice}
        );
      const t2w = await t2.wait();
      const gas2 = t2w.gasUsed.mul(gasPrice)

      const user1Find3 = await findContract.balanceOf(user1Wallet.address);
      const earnFind3 = await findContract.balanceOf(earnContract.address);
      const mortgageFind3 = await findContract.balanceOf(
        mortgageContract.address
      );

      const user1Weth3 = await wethContract.balanceOf(user1Wallet.address);
      const earnWeth3 = await wethContract.balanceOf(earnContract.address);
      const mortgageWeth3 = await wethContract.balanceOf(
        mortgageContract.address
      );

      const user1Eth3 = await ethers.provider.getBalance(user1Wallet.address)
      const earnEth3 = await ethers.provider.getBalance(earnContract.address)
      const mortgageEth3 = await ethers.provider.getBalance(mortgageContract.address)

      const user1Osp3 = await osp1.balanceOf(user1Wallet.address);
      const earnOsp3 = await osp1.balanceOf(earnContract.address);
      const mortgageOsp3 = await osp1.balanceOf(mortgageContract.address);

      const redeemEth = BigNumber.from("106574885316781875292");

      expect(user1Find2).eq(user1Find3);
      expect(earnFind3).eq(earnFind2);
      expect(mortgageFind3).eq(mortgageFind2).eq(0);

      expect(user1Weth2).eq(user1Weth3);
      expect(earnWeth3).eq(earnWeth2);
      expect(mortgageWeth3).eq(mortgageWeth3);

      expect(user1Eth2.sub(user1Eth3).sub(gas2)).eq(redeemEth);
      expect(earnEth3).eq(earnEth2).eq(0);
      expect(mortgageEth3).eq(mortgageEth3).eq(0);

      expect(user1Osp3.sub(user1Osp2)).eq(ospAmount5);
      expect(earnOsp3).eq(earnOsp2).eq(0);
      expect(mortgageOsp2.sub(mortgageOsp3)).eq(ospAmount5);

      const position2 = await mortgageContract.positions(mortgageInfo.tokenId);
      expect(position2.tokenId).eq(0);
      expect(position2.ospAsset).eq(ZERO_ADDRESS);
      expect(position2.ospAmount).eq(0);
      await expect(mortgageContract.ownerOf(mortgageInfo.tokenId)).revertedWith(
        "ERC721: invalid token ID"
      );

      expect(redeemInfo.inFindAmount).eq(allFind);
      expect(redeemInfo.amountIn).eq(redeemEth);
      expect(redeemInfo.tokenIn).eq(wethContract.address);

      expect(await findContract.totalSupply()).eq(findOldTotalSupply);
    });
  });
});