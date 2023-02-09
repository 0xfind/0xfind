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

describe("Mortgage.base", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let newSignatureWallet: SignerWithAddress;
  let newOwnerWallet: SignerWithAddress;
  let userWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;
  let user2Wallet: SignerWithAddress;
  let user3Wallet: SignerWithAddress;
  let user4Wallet: SignerWithAddress;
  let user5Wallet: SignerWithAddress;

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
    user4Wallet = wallets[8];
    user5Wallet = wallets[9];
  });

  describe("base", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let wethContract: WETH;
    let mortgageContract: Mortgage;
    let mathContract: Math;

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
      mortgageContract = allInfo.mortgageContract;
      mathContract = allInfo.mathContract;
    });

    it("mortgage contract link address", async function () {
      expect(await mortgageContract.find()).eq(findContract.address);
      expect(await mortgageContract.factory()).eq(factoryContract.address);
      expect(await mortgageContract.earn()).eq(earnContract.address);
      expect(await mortgageContract.math()).eq(mathContract.address);
      expect(await mortgageContract.owner()).eq(deployWallet.address);
    });

    it("mortgage contract init view", async function () {
      expect(await mortgageContract.mortgageFee()).eq(5000);
    });

    it("mortgage contract role check", async function () {
      await expect(
        mortgageContract.connect(userWallet).renounceOwnership()
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        mortgageContract
          .connect(userWallet)
          .transferOwnership(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        mortgageContract.connect(userWallet).setMortgageFee(10000)
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        mortgageContract.connect(userWallet).setMortgageRender(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("setSignatureAddress renounceOwnership transferOwnership", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let wethContract: WETH;
    let mortgageContract: Mortgage;
    let mathContract: Math;

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
      mortgageContract = allInfo.mortgageContract;
      mathContract = allInfo.mathContract;
    });

    it("setMortgageFee setMortgageRender renounceOwnership transferOwnership ", async function () {
      expect(await mortgageContract.owner()).eq(deployWallet.address);

      await mortgageContract.transferOwnership(newOwnerWallet.address);
      expect(await mortgageContract.owner()).eq(newOwnerWallet.address);

      await mortgageContract.connect(newOwnerWallet).setMortgageFee(4000);
      expect(await mortgageContract.mortgageFee()).eq(4000);
      await expect(
        mortgageContract.connect(newOwnerWallet).setMortgageFee(6000)
      ).revertedWith("TB");

      expect(await mortgageContract.mortgageRender()).not.eq(userWallet.address);
      await mortgageContract.connect(newOwnerWallet).setMortgageRender(userWallet.address);
      expect(await mortgageContract.mortgageRender()).eq(userWallet.address);

      await mortgageContract.connect(newOwnerWallet).renounceOwnership();
      expect(await mortgageContract.owner()).eq(ZERO_ADDRESS);
    });

  });

  describe("mortgage redeem multiply", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let wethContract: WETH;
    let mortgageContract: Mortgage;
    let mathContract: Math;
    const osp1ProjectId = "github/1/1";
    const osp2ProjectId = "github/1/2";
    const osp3ProjectId = "github/1/3";
    const osp4ProjectId = "github/1/4";
    const osp5ProjectId = "github/1/5";
    const osp6ProjectId = "github/1/6";

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

      // factory osp2 config1
      const osp2Params = {
        base: {
          name: "github.com/test/2",
          symbol: "0XTEST2",
          projectId: osp2ProjectId,
          stars: 2,
          poolConfigIndex: 1,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
      osp2Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp2Params.base, osp2Params.deadline, userWallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(userWallet)
        .createOSPByProjectOwner(osp2Params);

      // factory osp3 config0
      const osp3Params = {
        base: {
          name: "github.com/test/3",
          symbol: "0XTEST3",
          projectId: osp3ProjectId,
          stars: 2,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
      osp3Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp3Params.base, osp3Params.deadline, userWallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(userWallet)
        .createOSPByProjectOwner(osp3Params);

      // factory osp4 config0
      const osp4Params = {
        base: {
          name: "github.com/test/4",
          symbol: "0XTEST4",
          projectId: osp4ProjectId,
          stars: 3,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
      osp4Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp4Params.base, osp4Params.deadline, userWallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(userWallet)
        .createOSPByProjectOwner(osp4Params);

      // factory osp5 config0
      const osp5Params = {
        base: {
          name: "github.com/test/5",
          symbol: "0XTEST5",
          projectId: osp5ProjectId,
          stars: 4,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
      osp5Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp5Params.base, osp5Params.deadline, userWallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(userWallet)
        .createOSPByProjectOwner(osp5Params);

      // factory osp6 config0
      const osp6Params = {
        base: {
          name: "github.com/test/6",
          symbol: "0XTEST6",
          projectId: osp6ProjectId,
          stars: 5,
          poolConfigIndex: 0,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
      osp6Params.signature = await signatureWallet.signMessage(
        ethers.utils.arrayify(
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp6Params.base, osp6Params.deadline, userWallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(userWallet)
        .createOSPByProjectOwner(osp6Params);
    });

    it("xxx", async function () {
      const osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;
      const osp2 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp2ProjectId)
      )) as IERC20;
      const osp3 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp3ProjectId)
      )) as IERC20;
      const osp4 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp4ProjectId)
      )) as IERC20;
      const osp5 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp5ProjectId)
      )) as IERC20;
      const osp6 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp6ProjectId)
      )) as IERC20;
      const swapRouter = (await ethers.getContractAt(
        "ISwapRouter02",
        UNISWAP_ROUTER
      )) as ISwapRouter02;

      const findOldTotalSupply = await findContract.totalSupply();
      const ospAmount3 = BigNumber.from(10).pow(18).mul(63000);
      const ospAmount2 = BigNumber.from(10).pow(18).mul(42000);
      const ospAmount10 = BigNumber.from(10).pow(18).mul(210000);
      const ospAmount15 = ospAmount10.add(ospAmount3).add(ospAmount2);

      // buy osp1
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

      await findContract
        .connect(deployWallet)
        .transfer(
          user1Wallet.address,
          BigNumber.from(10).pow(18).mul(1_000_000)
        );
      await findContract
        .connect(deployWallet)
        .transfer(
          user2Wallet.address,
          BigNumber.from(10).pow(18).mul(1_000_000)
        );
      await findContract
        .connect(deployWallet)
        .transfer(
          user3Wallet.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      await findContract
        .connect(deployWallet)
        .transfer(
          user4Wallet.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      await findContract
        .connect(deployWallet)
        .transfer(
          user5Wallet.address,
          BigNumber.from(10).pow(18).mul(100_000_000)
        );
      expect(await findContract.balanceOf(deployWallet.address)).eq(
        BigNumber.from(10).pow(18).mul(89_698_000_000)
      );
      expect(await findContract.balanceOf(user1Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(1_000_000)
      );
      expect(await findContract.balanceOf(user2Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(1_000_000)
      );
      expect(await findContract.balanceOf(user3Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
      );
      expect(await findContract.balanceOf(user4Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
      );
      expect(await findContract.balanceOf(user5Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
      );

      await osp1
        .connect(deployWallet)
        .approve(swapRouter.address, await osp1.totalSupply());
      await osp2
        .connect(deployWallet)
        .approve(swapRouter.address, await osp1.totalSupply());
      // buy osp1 3%
      await findContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(90_000_000_000)
        );
      const deployWalletOsp1Find3WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
          tokenIn: findContract.address,
          tokenOut: osp1.address,
          fee: FeeAmount.HIGH,
          recipient: deployWallet.address,
          amountOut: ospAmount3,
          amountInMaximum: await findContract.totalSupply(),
          sqrtPriceLimitX96: 0,
        });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount3,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      const deployWalletOsp1Find3 = deployWalletOsp1Find3WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))
      console.log(2);

      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount3);
      // buy osp1 2%
      const deployWalletOsp1Find2WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount2,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount2,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(3);
      const deployWalletOsp1Find2 = deployWalletOsp1Find2WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))
      const deployWalletOsp1Find5 = deployWalletOsp1Find2.add(deployWalletOsp1Find3).sub(1)

      expect(await osp1.balanceOf(deployWallet.address)).eq(
        ospAmount2.add(ospAmount3)
      );
      // buy osp1 10%
      const deployWalletOsp1Find10WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount10,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount10,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(4);
      const deployWalletOsp1Find10 = deployWalletOsp1Find10WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))
      const deployWalletOsp1Find15 = deployWalletOsp1Find10.add(deployWalletOsp1Find5)

      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount15);
      // buy osp1 15%
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount15,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(5);

      expect(await osp1.balanceOf(deployWallet.address)).eq(ospAmount15.mul(2));
      // send 15% to user1
      await osp1
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount15);
      // send 15% to user2
      await osp1
        .connect(deployWallet)
        .transfer(user2Wallet.address, ospAmount15);

      // buy osp2
      // buy osp2 3%
      const deployWalletOsp2Find3WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount3,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount3,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(6);
      const deployWalletOsp2Find3 = deployWalletOsp2Find3WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))

      expect(await osp2.balanceOf(deployWallet.address)).eq(ospAmount3);
      // buy osp2 2%
      const deployWalletOsp2Find2WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount2,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount2,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(7);
      const deployWalletOsp2Find2 = deployWalletOsp2Find2WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))
      const deployWalletOsp2Find5 = deployWalletOsp2Find3.add(deployWalletOsp2Find2)

      const find7 = await findContract.balanceOf(deployWallet.address);
      expect(await osp2.balanceOf(deployWallet.address)).eq(
        ospAmount2.add(ospAmount3)
      );

      // buy osp2 10%
      const deployWalletOsp2Find10WithFee = await swapRouter.connect(deployWallet).callStatic.exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount10,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp2.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount10,
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      console.log(8);
      const deployWalletOsp2Find10 = deployWalletOsp2Find10WithFee.mul(BigNumber.from(10).pow(6).sub(FeeAmount.HIGH)).div(BigNumber.from(10).pow(6))
      const deployWalletOsp2Find15 = deployWalletOsp2Find10.add(deployWalletOsp2Find5).sub(1)

      const find8 = await findContract.balanceOf(deployWallet.address);
      expect(await osp2.balanceOf(deployWallet.address)).eq(ospAmount15);
      // send 15% to user1
      await osp2
        .connect(deployWallet)
        .transfer(user1Wallet.address, ospAmount15);

      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      await osp2
        .connect(user1Wallet)
        .approve(mortgageContract.address, await osp2.totalSupply());
      await osp1
        .connect(user2Wallet)
        .approve(mortgageContract.address, await osp1.totalSupply());
      await osp2
        .connect(user2Wallet)
        .approve(mortgageContract.address, await osp2.totalSupply());

      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());
      await findContract
        .connect(user2Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());

      // mortgage osp1
      // user1 mortgage osp1 3%
      const earnFind1 = await findContract.balanceOf(earnContract.address);
      const mortOsp1_1 = await osp1.balanceOf(mortgageContract.address);
      const user1Find1 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_1 = await osp1.balanceOf(user1Wallet.address);
      console.log(11);
      const user1MortgageStaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp1.address, ospAmount3, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount3, findContract.address);
      const earnFind2 = await findContract.balanceOf(earnContract.address);
      const mortOsp1_2 = await osp1.balanceOf(mortgageContract.address);
      const user1Find2 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_2 = await osp1.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      const user1Position1 = await mortgageContract.positions(
        user1MortgageStaticInfo.tokenId
      );
      expect(user1Position1.tokenId).eq(user1MortgageStaticInfo.tokenId);
      expect(user1Position1.ospAsset).eq(osp1.address);
      expect(user1Position1.ospAmount).eq(ospAmount3);

      expect(user1Osp1_1.sub(user1Osp1_2)).eq(ospAmount3);
      expect(mortOsp1_2.sub(mortOsp1_1)).eq(ospAmount3);
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(
        deployWalletOsp1Find3
      );
      expect(user1Find2.sub(user1Find1).add(earnFind2.sub(earnFind1))).eq(
        deployWalletOsp1Find3
      );
      expect(
        deployWalletOsp1Find3
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind2.sub(earnFind1));

      // user1 mortgage osp1 2%
      const earnFind3 = await findContract.balanceOf(earnContract.address);
      const user1Find3 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_3 = await osp1.balanceOf(user1Wallet.address);
      console.log(12);
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Position1.tokenId, ospAmount2, findContract.address);
      const earnFind4 = await findContract.balanceOf(earnContract.address);
      const user1Find4 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_4 = await osp1.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      const user1Position2 = await mortgageContract.positions(
        user1Position1.tokenId
      );
      expect(user1Position2.tokenId).eq(user1Position1.tokenId);
      expect(user1Position2.ospAsset).eq(osp1.address);
      expect(user1Position2.ospAmount).eq(ospAmount3.add(ospAmount2));

      expect(user1Osp1_3.sub(user1Osp1_4)).eq(ospAmount2);
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(
        deployWalletOsp1Find5
      );
      expect(user1Find4.sub(user1Find3).add(earnFind4.sub(earnFind3))).eq(
        deployWalletOsp1Find5.sub(deployWalletOsp1Find3)
      );
      expect(
        deployWalletOsp1Find5
          .sub(deployWalletOsp1Find3)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind4.sub(earnFind3));

      // user1 mortgage osp1 10%
      const earnFind5 = await findContract.balanceOf(earnContract.address);
      const user1Find5 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_5 = await osp1.balanceOf(user1Wallet.address);
      console.log(13);
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Position1.tokenId, ospAmount10, findContract.address);
      const earnFind6 = await findContract.balanceOf(earnContract.address);
      const user1Find6 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_6 = await osp1.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      const user1Position3 = await mortgageContract.positions(
        user1Position1.tokenId
      );
      expect(user1Position3.tokenId).eq(user1Position1.tokenId);
      expect(user1Position3.ospAsset).eq(osp1.address);
      expect(user1Position3.ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user1Osp1_5.sub(user1Osp1_6)).eq(ospAmount10);
      //
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(
        deployWalletOsp1Find15
      );
      expect(user1Find6.sub(user1Find5).add(earnFind6.sub(earnFind5))).eq(
        deployWalletOsp1Find15.sub(deployWalletOsp1Find5)
      );
      expect(
        deployWalletOsp1Find15
          .sub(deployWalletOsp1Find5)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind6.sub(earnFind5));

      // user2 mortgage osp1 3%
      const earnFind7 = await findContract.balanceOf(earnContract.address);
      const user2Find1 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_1 = await osp1.balanceOf(user2Wallet.address);
      console.log(14);
      const user2MortgageStaticInfo = await mortgageContract
        .connect(user2Wallet).callStatic
        .mortgage(osp1.address, ospAmount3, findContract.address);
      await mortgageContract
        .connect(user2Wallet)
        .mortgage(osp1.address, ospAmount3, findContract.address);
      const earnFind8 = await findContract.balanceOf(earnContract.address);
      const user2Find2 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_2 = await osp1.balanceOf(user2Wallet.address);

      // expect user2 find
      // expect user1 userr2 position
      const user1Position4 = await mortgageContract.positions(
        user1Position1.tokenId
      );
      const user2Position1 = await mortgageContract.positions(
        user2MortgageStaticInfo.tokenId
      );
      expect(user1Position4.ospAsset).eq(osp1.address);
      expect(user1Position4.ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position1.tokenId).eq(user2MortgageStaticInfo.tokenId);
      expect(user2Position1.ospAsset).eq(osp1.address);
      expect(user2Position1.ospAmount).eq(ospAmount3);

      expect(user2Osp1_1.sub(user2Osp1_2)).eq(ospAmount3);
      expect(
        (await findContract.totalSupply())
          .sub(findOldTotalSupply)
          .sub(deployWalletOsp1Find15)
      ).eq(deployWalletOsp1Find3);
      expect(user2Find2.sub(user2Find1).add(earnFind8.sub(earnFind7))).eq(
        deployWalletOsp1Find3
      );
      expect(
        deployWalletOsp1Find3
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind8.sub(earnFind7));

      // user2 mortgage osp1 2%
      const earnFind9 = await findContract.balanceOf(earnContract.address);
      const user2Find3 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_3 = await osp1.balanceOf(user2Wallet.address);
      console.log(15);
      await mortgageContract
        .connect(user2Wallet)
        .mortgageAdd(user2Position1.tokenId, ospAmount2, findContract.address);
      const earnFind10 = await findContract.balanceOf(earnContract.address);
      const user2Find4 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_4 = await osp1.balanceOf(user2Wallet.address);

      // expect user2 find
      // expect user1 userr2 position
      const user1Position5 = await mortgageContract.positions(
        user1Position1.tokenId
      );
      const user2Position2 = await mortgageContract.positions(
        user2Position1.tokenId
      );
      expect(user1Position5.ospAsset).eq(osp1.address);
      expect(user1Position5.ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position2.ospAsset).eq(osp1.address);
      expect(user2Position2.ospAmount).eq(ospAmount3.add(ospAmount2));

      expect(user2Osp1_3.sub(user2Osp1_4)).eq(ospAmount2);
      expect(
        (await findContract.totalSupply())
          .sub(findOldTotalSupply)
          .sub(deployWalletOsp1Find15)
      ).eq(deployWalletOsp1Find5);
      expect(user2Find4.sub(user2Find3).add(earnFind10.sub(earnFind9))).eq(
        deployWalletOsp1Find5.sub(deployWalletOsp1Find3)
      );
      expect(
        deployWalletOsp1Find5
          .sub(deployWalletOsp1Find3)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind10.sub(earnFind9));

      // user2 mortgage osp1 10%
      const earnFind11 = await findContract.balanceOf(earnContract.address);
      const user2Find5 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_5 = await osp1.balanceOf(user2Wallet.address);
      console.log(16);
      await mortgageContract
        .connect(user2Wallet)
        .mortgageAdd(user2Position1.tokenId, ospAmount10, findContract.address);
      const earnFind12 = await findContract.balanceOf(earnContract.address);
      const user2Find6 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_6 = await osp1.balanceOf(user2Wallet.address);

      // expect user2 find
      // expect user1 userr2 position
      const user1Position6 = await mortgageContract.positions(
        user1Position1.tokenId
      );
      const user2Position3 = await mortgageContract.positions(
        user2Position1.tokenId
      );

      expect(user1Position6.ospAsset).eq(osp1.address);
      expect(user1Position6.ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user2Position3.ospAsset).eq(osp1.address);
      expect(user2Position3.ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user2Osp1_5.sub(user2Osp1_6)).eq(ospAmount10);
      // 2wei is the expected deviation within the mortgage pool
      expect(
        (await findContract.totalSupply())
          .sub(findOldTotalSupply)
          .sub(deployWalletOsp1Find15)
      ).eq(deployWalletOsp1Find15.add(2));
      expect(user2Find6.sub(user2Find5).add(earnFind12.sub(earnFind11))).eq(
        deployWalletOsp1Find15.sub(deployWalletOsp1Find5).add(2)
      );
      expect(
        deployWalletOsp1Find15
          .sub(deployWalletOsp1Find5)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind12.sub(earnFind11));

      // mortgage osp2
      // user1 mortgage osp2 3%
      const earnFind13 = await findContract.balanceOf(earnContract.address);
      const user1Find13 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_13 = await osp2.balanceOf(user1Wallet.address);
      console.log(17);
      const user1Osp2MortgageStaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp2.address, ospAmount3, findContract.address);
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp2.address, ospAmount3, findContract.address);
      const earnFind14 = await findContract.balanceOf(earnContract.address);
      const user1Find14 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_14 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      const user1Position7 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position4 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position7.length).eq(2);
      expect(user1Position7[0].tokenId).eq(user1Position1.tokenId);
      expect(user1Position7[0].ospAsset).eq(osp1.address);
      expect(user1Position7[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user1Position7[1].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position7[1].ospAsset).eq(osp2.address);
      expect(user1Position7[1].ospAmount).eq(ospAmount3);
      expect(user2Position4.length).eq(1);
      expect(user2Position4[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position4[0].ospAsset).eq(osp1.address);
      expect(user2Position4[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user1Osp2_13.sub(user1Osp2_14)).eq(ospAmount3);
      // 2wei is the expected deviation within the mortgage pool
      expect(user1Find14.sub(user1Find13).add(earnFind14.sub(earnFind13)))
        .eq(
          (await findContract.totalSupply())
            .sub(findOldTotalSupply)
            .sub(deployWalletOsp1Find15)
            .sub(deployWalletOsp1Find15)
            .sub(2)
        )
        .eq(deployWalletOsp2Find3);
      expect(user1Find14.sub(user1Find13).add(earnFind14.sub(earnFind13))).eq(
        deployWalletOsp2Find3
      );
      expect(
        deployWalletOsp2Find3
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind14.sub(earnFind13));
      expect(deployWalletOsp2Find3).not.eq(deployWalletOsp1Find3);

      // user1 mortgage osp2 2%
      const earnFind15 = await findContract.balanceOf(earnContract.address);
      const user1Find15 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_15 = await osp2.balanceOf(user1Wallet.address);
      console.log(18);
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Osp2MortgageStaticInfo.tokenId, ospAmount2, findContract.address);
      const earnFind16 = await findContract.balanceOf(earnContract.address);
      const user1Find16 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_16 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      const user1Position8 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position5 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );

      expect(user1Position8.length).eq(2);
      expect(user1Position8[0].tokenId).eq(user1Position1.tokenId);
      expect(user1Position8[0].ospAsset).eq(osp1.address);
      expect(user1Position8[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user1Position8[1].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position8[1].ospAsset).eq(osp2.address);
      expect(user1Position8[1].ospAmount).eq(ospAmount3.add(ospAmount2));
      expect(user2Position5.length).eq(1);
      expect(user2Position5[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position5[0].ospAsset).eq(osp1.address);
      expect(user2Position5[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user1Osp2_15.sub(user1Osp2_16)).eq(ospAmount2);
      // 2wei is the expected deviation within the mortgage pool
      expect(
        (await findContract.totalSupply())
          .sub(findOldTotalSupply)
          .sub(deployWalletOsp1Find15)
          .sub(deployWalletOsp1Find15)
      ).eq(deployWalletOsp2Find5.add(2));
      expect(user1Find16.sub(user1Find15).add(earnFind16.sub(earnFind15))).eq(
        deployWalletOsp2Find5.sub(deployWalletOsp2Find3)
      );
      expect(
        deployWalletOsp2Find5
          .sub(deployWalletOsp2Find3)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind16.sub(earnFind15));

      expect(deployWalletOsp2Find5).not.eq(deployWalletOsp1Find5);

      // user1 mortgage osp2 10%
      const earnFind17 = await findContract.balanceOf(earnContract.address);
      const user1Find17 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_17 = await osp2.balanceOf(user1Wallet.address);
      console.log(19);
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Osp2MortgageStaticInfo.tokenId, ospAmount10, findContract.address);
      const earnFind18 = await findContract.balanceOf(earnContract.address);
      const user1Find18 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_18 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      const user1Position9 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position6 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );

      expect(user1Position9.length).eq(2);
      expect(user1Position9[0].tokenId).eq(user1Position1.tokenId);
      expect(user1Position9[0].ospAsset).eq(osp1.address);
      expect(user1Position9[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user1Position9[1].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position9[1].ospAsset).eq(osp2.address);
      expect(user1Position9[1].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position6.length).eq(1);
      expect(user2Position6[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position6[0].ospAsset).eq(osp1.address);
      expect(user2Position6[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      expect(user1Osp2_17.sub(user1Osp2_18)).eq(ospAmount10);
      // 2wei is the expected deviation within the mortgage pool
      expect(
        (await findContract.totalSupply())
          .sub(findOldTotalSupply)
          .sub(deployWalletOsp1Find15)
          .sub(deployWalletOsp1Find15)
      ).eq(deployWalletOsp2Find15.add(2));
      expect(user1Find18.sub(user1Find17).add(earnFind18.sub(earnFind17))).eq(
        deployWalletOsp2Find15.sub(deployWalletOsp2Find5)
      );
      expect(
        deployWalletOsp2Find15
          .sub(deployWalletOsp2Find5)
          .mul(await mortgageContract.mortgageFee())
          .div(await mortgageContract.MORTGAGE_FEE_DENOMINATOR())
      ).eq(earnFind18.sub(earnFind17));

      expect(deployWalletOsp2Find15).not.eq(deployWalletOsp1Find15);

      // redeem osp1
      // user1 redeem osp1 10%
      const earnFind19 = await findContract.balanceOf(earnContract.address);
      const mortOsp1_19 = await osp1.balanceOf(mortgageContract.address);
      const user1Find19 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_19 = await osp1.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Position1.tokenId,
          ospAmount10,
          deployWalletOsp1Find15.sub(deployWalletOsp1Find5),
          findContract.address
        );
      const earnFind20 = await findContract.balanceOf(earnContract.address);
      const mortOsp1_20 = await osp1.balanceOf(mortgageContract.address);
      const user1Find20 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_20 = await osp1.balanceOf(user1Wallet.address);
      // expect user1 find
      // expect user1 position
      expect(user1Osp1_20.sub(user1Osp1_19)).eq(ospAmount10);
      expect(mortOsp1_19.sub(mortOsp1_20)).eq(ospAmount10);
      expect(earnFind20).eq(earnFind19);
      // 2wei is the expected deviation within the mortgage pool
      expect(user1Find19.sub(user1Find20)).eq(
        deployWalletOsp1Find15.sub(deployWalletOsp1Find5).add(2)
      );

      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply
          .add(deployWalletOsp1Find15)
          .add(deployWalletOsp2Find15)
          .add(deployWalletOsp1Find5)
      );

      const user1Position10 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position7 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position10.length).eq(2);
      expect(user1Position10[0].tokenId).eq(user1Position1.tokenId);
      expect(user1Position10[0].ospAsset).eq(osp1.address);
      expect(user1Position10[0].ospAmount).eq(ospAmount3.add(ospAmount2));
      expect(user1Position10[1].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position10[1].ospAsset).eq(osp2.address);
      expect(user1Position10[1].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position7.length).eq(1);
      expect(user2Position7[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position7[0].ospAsset).eq(osp1.address);
      expect(user2Position7[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      // user1 redeem osp1 2%
      const earnFind21 = await findContract.balanceOf(earnContract.address);
      const user1Find21 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_21 = await osp1.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Position1.tokenId,
          ospAmount2,
          deployWalletOsp1Find5.sub(deployWalletOsp1Find3),
          findContract.address
        );
      const earnFind22 = await findContract.balanceOf(earnContract.address);
      const user1Find22 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_22 = await osp1.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      expect(user1Osp1_22.sub(user1Osp1_21)).eq(ospAmount2);
      expect(earnFind22).eq(earnFind21);
      // 1wei is the expected deviation within the mortgage pool
      expect(user1Find21.sub(user1Find22)).eq(
        deployWalletOsp1Find5.sub(deployWalletOsp1Find3).add(1)
      );

      // 1wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply
          .add(deployWalletOsp1Find15)
          .add(deployWalletOsp2Find15)
          .add(deployWalletOsp1Find3)
          .sub(1)
      );

      const user1Position11 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position8 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position11.length).eq(2);
      expect(user1Position11[0].tokenId).eq(user1Position1.tokenId);
      expect(user1Position11[0].ospAsset).eq(osp1.address);
      expect(user1Position11[0].ospAmount).eq(ospAmount3);
      expect(user1Position11[1].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position11[1].ospAsset).eq(osp2.address);
      expect(user1Position11[1].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position8.length).eq(1);
      expect(user2Position8[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position8[0].ospAsset).eq(osp1.address);
      expect(user2Position8[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      // user1 redeem osp1 3%
      const earnFind23 = await findContract.balanceOf(earnContract.address);
      const user1Find23 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_23 = await osp1.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Position1.tokenId,
          ospAmount3,
          deployWalletOsp1Find3,
          findContract.address
        );
      const earnFind24 = await findContract.balanceOf(earnContract.address);
      const user1Find24 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp1_24 = await osp1.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      expect(user1Osp1_24.sub(user1Osp1_23)).eq(ospAmount3);
      expect(earnFind24).eq(earnFind23);
      expect(user1Find23.sub(user1Find24)).eq(deployWalletOsp1Find3);

      // 1wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply
          .add(deployWalletOsp1Find15)
          .add(deployWalletOsp2Find15)
          .sub(1)
      );

      const user1Position12 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position9 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position12.length).eq(1);
      expect(user1Position12[0].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position12[0].ospAsset).eq(osp2.address);
      expect(user1Position12[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position9.length).eq(1);
      expect(user2Position9[0].tokenId).eq(user2Position1.tokenId);
      expect(user2Position9[0].ospAsset).eq(osp1.address);
      expect(user2Position9[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );

      // user2 redeem osp1 15%
      const earnFind25 = await findContract.balanceOf(earnContract.address);
      const user2Find25 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_25 = await osp1.balanceOf(user2Wallet.address);
      await mortgageContract
        .connect(user2Wallet)
        .redeem(
          user2Position1.tokenId,
          ospAmount15,
          deployWalletOsp1Find15,
          findContract.address
        );
      const earnFind26 = await findContract.balanceOf(earnContract.address);
      const user2Find26 = await findContract.balanceOf(user2Wallet.address);
      const user2Osp1_26 = await osp1.balanceOf(user2Wallet.address);

      // expect user2 find
      // expect user1 userr2 position
      expect(user2Osp1_26.sub(user2Osp1_25)).eq(ospAmount15);
      expect(earnFind26).eq(earnFind25);
      // 5wei is the expected deviation within the mortgage pool
      expect(user2Find25.sub(user2Find26)).eq(deployWalletOsp1Find15.add(5));
      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply.add(deployWalletOsp2Find15).sub(6)
      );

      const user1Position13 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position10 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position13.length).eq(1);
      expect(user1Position13[0].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position13[0].ospAsset).eq(osp2.address);
      expect(user1Position13[0].ospAmount).eq(
        ospAmount3.add(ospAmount2).add(ospAmount10)
      );
      expect(user2Position10.length).eq(0);

      // redeem osp2
      // user1 redeem osp2 10%
      const earnFind27 = await findContract.balanceOf(earnContract.address);
      const user1Find27 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_27 = await osp2.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Osp2MortgageStaticInfo.tokenId,
          ospAmount10,
          deployWalletOsp2Find15.sub(deployWalletOsp2Find5),
          findContract.address
        );
      const earnFind28 = await findContract.balanceOf(earnContract.address);
      const user1Find28 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_28 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      expect(user1Osp2_28.sub(user1Osp2_27)).eq(ospAmount10);
      expect(earnFind28).eq(earnFind27);
      expect(user1Find27.sub(user1Find28)).eq(
        deployWalletOsp2Find15.sub(deployWalletOsp2Find5)
      );
      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply.add(deployWalletOsp2Find5).sub(6)
      );

      const user1Position14 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position11 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position14.length).eq(1);
      expect(user1Position14[0].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position14[0].ospAsset).eq(osp2.address);
      expect(user1Position14[0].ospAmount).eq(ospAmount3.add(ospAmount2));
      expect(user2Position11.length).eq(0);

      // user1 redeem osp2 2%
      const earnFind29 = await findContract.balanceOf(earnContract.address);
      const user1Find29 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_29 = await osp2.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Osp2MortgageStaticInfo.tokenId,
          ospAmount2,
          deployWalletOsp2Find5.sub(deployWalletOsp2Find3),
          findContract.address
        );
      const earnFind30 = await findContract.balanceOf(earnContract.address);
      const user1Find30 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_30 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      expect(user1Osp2_30.sub(user1Osp2_29)).eq(ospAmount2);
      expect(earnFind30).eq(earnFind29);
      expect(user1Find29.sub(user1Find30)).eq(
        deployWalletOsp2Find5.sub(deployWalletOsp2Find3)
      );
      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(
        findOldTotalSupply.add(deployWalletOsp2Find3).sub(6)
      );

      const user1Position15 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position12 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position15.length).eq(1);
      expect(user1Position15[0].tokenId).eq(user1Osp2MortgageStaticInfo.tokenId);
      expect(user1Position15[0].ospAsset).eq(osp2.address);
      expect(user1Position15[0].ospAmount).eq(ospAmount3);
      expect(user2Position12.length).eq(0);

      // user1 redeem osp2 3%
      const earnFind31 = await findContract.balanceOf(earnContract.address);
      const user1Find31 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_31 = await osp2.balanceOf(user1Wallet.address);
      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          user1Osp2MortgageStaticInfo.tokenId,
          ospAmount3,
          deployWalletOsp2Find3,
          findContract.address
        );
      const earnFind32 = await findContract.balanceOf(earnContract.address);
      const user1Find32 = await findContract.balanceOf(user1Wallet.address);
      const user1Osp2_32 = await osp2.balanceOf(user1Wallet.address);

      // expect user1 find
      // expect user1 position
      // expect not qe osp1
      expect(user1Osp2_32.sub(user1Osp2_31)).eq(ospAmount3);
      expect(earnFind32).eq(earnFind31);
      expect(user1Find31.sub(user1Find32)).eq(deployWalletOsp2Find3);
      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(findOldTotalSupply.sub(6));

      const user1Position16 = await mortgageContract.positionsOfOwner(
        user1Wallet.address
      );
      const user2Position13 = await mortgageContract.positionsOfOwner(
        user2Wallet.address
      );
      expect(user1Position16.length).eq(0);
      expect(user2Position13.length).eq(0);

      // osp3 multiply
      expect(await findContract.balanceOf(user3Wallet.address)).eq(
        BigNumber.from(10).pow(18).mul(100_000_000)
      );

      const AllFindAmount1 = BigNumber.from(10).pow(18).mul(100_000);
      const payFindAmount = BigNumber.from("1495000000000000000000");
      const payFindAmountMax = payFindAmount.add(1);
      await findContract
        .connect(user3Wallet)
        .approve(mortgageContract.address, payFindAmountMax);
      const user3WalletFind1 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp3_1 = await osp3.balanceOf(user3Wallet.address);
      const earnFind33 = await findContract.balanceOf(earnContract.address);
      const mortOsp3_1 = await osp3.balanceOf(mortgageContract.address);
      const multiplyInfo1 = await mortgageContract
        .connect(user3Wallet)
        .callStatic.multiply(
          osp3.address,
          AllFindAmount1,
          payFindAmountMax,
          findContract.address
        );
      await mortgageContract
        .connect(user3Wallet)
        .multiply(
          osp3.address,
          AllFindAmount1,
          payFindAmountMax,
          findContract.address
        );
      // expect find osp3
      // expect total support
      const user3WalletFind2 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp3_2 = await osp3.balanceOf(user3Wallet.address);
      const earnFind34 = await findContract.balanceOf(earnContract.address);
      const mortOsp3_2 = await osp3.balanceOf(mortgageContract.address);
      const user3Position1 = await mortgageContract.positionsOfOwner(
        user3Wallet.address
      );

      expect(user3Position1.length).eq(1);
      expect(user3Position1[0].tokenId).eq(multiplyInfo1.tokenId);
      expect(user3Position1[0].ospAsset).eq(osp3.address);
      expect(user3Position1[0].ospAmount).eq(
        multiplyInfo1.positionOspAmountDelta
      );

      expect(multiplyInfo1.positionOspAmountDelta).eq(
        mortOsp3_2.sub(mortOsp3_1)
      );
      expect(user3WalletFind1.sub(user3WalletFind2)).eq(payFindAmount);
      expect(user3WalletOsp3_2).eq(user3WalletOsp3_1);
      // 6wei is the expected deviation within the mortgage pool
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(
        AllFindAmount1.sub(payFindAmount.sub(earnFind34.sub(earnFind33))).sub(6)
      );

      // redeem osp3
      await findContract
        .connect(user3Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());

      const user3WalletFind3 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp3_3 = await osp3.balanceOf(user3Wallet.address);
      const earnFind35 = await findContract.balanceOf(earnContract.address);
      const mortOsp3_3 = await osp3.balanceOf(mortgageContract.address);
      await mortgageContract
        .connect(user3Wallet)
        .redeem(
          multiplyInfo1.tokenId,
          user3Position1[0].ospAmount,
          AllFindAmount1.sub(payFindAmount.sub(earnFind34.sub(earnFind33))),
          findContract.address
        );
      const user3WalletFind4 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp3_4 = await osp3.balanceOf(user3Wallet.address);
      const earnFind36 = await findContract.balanceOf(earnContract.address);
      const mortOsp3_4 = await osp3.balanceOf(mortgageContract.address);

      const user3Position2 = await mortgageContract.positionsOfOwner(
        user3Wallet.address
      );
      expect(user3Position2.length).eq(0);

      expect(earnFind36).eq(earnFind35);
      expect(user3Position1[0].ospAmount)
        .eq(mortOsp3_3.sub(mortOsp3_4))
        .eq(user3WalletOsp3_4.sub(user3WalletOsp3_3));
      expect(user3WalletFind3.sub(user3WalletFind4)).eq(
        AllFindAmount1.sub(payFindAmount.sub(earnFind34.sub(earnFind33)))
      );
      // 6wei is the expected deviation within the mortgage pool
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(-6);

      // change fee to 0
      await mortgageContract.setMortgageFee(0);
      expect(await mortgageContract.mortgageFee()).eq(0);

      // multiply osp4
      const AllFindAmount2 = BigNumber.from(10).pow(18).mul(100_000);
      const payFindAmount2 = BigNumber.from("1000000000000000000000");
      const payFindAmountMax2 = payFindAmount2;
      await findContract
        .connect(user3Wallet)
        .approve(mortgageContract.address, payFindAmountMax2);
      const user3WalletFind5 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp4_5 = await osp4.balanceOf(user3Wallet.address);
      const earnFind37 = await findContract.balanceOf(earnContract.address);
      const mortOsp4_5 = await osp4.balanceOf(mortgageContract.address);
      const multiplyInfo2 = await mortgageContract
        .connect(user3Wallet)
        .callStatic.multiply(osp4.address, AllFindAmount2, payFindAmountMax2, findContract.address);
      await mortgageContract
        .connect(user3Wallet)
        .multiply(osp4.address, AllFindAmount2, payFindAmountMax2, findContract.address);
      const user3WalletFind6 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp4_6 = await osp4.balanceOf(user3Wallet.address);
      const earnFind38 = await findContract.balanceOf(earnContract.address);
      const mortOsp4_6 = await osp4.balanceOf(mortgageContract.address);
      const user3Position3 = await mortgageContract.positionsOfOwner(
        user3Wallet.address
      );

      expect(user3Position3.length).eq(1);
      expect(user3Position3[0].tokenId).eq(multiplyInfo2.tokenId);
      expect(user3Position3[0].ospAsset).eq(osp4.address);
      expect(user3Position3[0].ospAmount).eq(
        multiplyInfo2.positionOspAmountDelta
      );

      expect(multiplyInfo2.positionOspAmountDelta).eq(
        mortOsp4_6.sub(mortOsp4_5)
      );
      expect(user3WalletFind5.sub(user3WalletFind6)).eq(payFindAmount2);
      expect(user3WalletOsp4_6).eq(user3WalletOsp4_5);
      // 6wei is the expected deviation within the mortgage pool
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(
        AllFindAmount2.sub(payFindAmount2.sub(earnFind38.sub(earnFind37))).sub(6)
      );


      // redeem osp4
      await findContract
        .connect(user3Wallet)
        .approve(mortgageContract.address, await findContract.totalSupply());

      const user3WalletFind7 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp4_7 = await osp4.balanceOf(user3Wallet.address);
      const earnFind39 = await findContract.balanceOf(earnContract.address);
      const mortOsp4_7 = await osp4.balanceOf(mortgageContract.address);
      await mortgageContract
        .connect(user3Wallet)
        .redeem(multiplyInfo2.tokenId, user3Position3[0].ospAmount, AllFindAmount2.sub(payFindAmount2.sub(earnFind38.sub(earnFind37))), findContract.address);
      const user3WalletFind8 = await findContract.balanceOf(
        user3Wallet.address
      );
      const user3WalletOsp4_8 = await osp4.balanceOf(user3Wallet.address);
      const earnFind40 = await findContract.balanceOf(earnContract.address);
      const mortOsp4_8 = await osp4.balanceOf(mortgageContract.address);

      const user3Position4 = await mortgageContract.positionsOfOwner(
        user3Wallet.address
      );
      expect(user3Position4.length).eq(0);

      expect(earnFind40).eq(earnFind39);
      expect(user3Position3[0].ospAmount)
        .eq(mortOsp4_7.sub(mortOsp4_8))
        .eq(user3WalletOsp4_8.sub(user3WalletOsp4_7));
      expect(user3WalletFind7.sub(user3WalletFind8)).eq(
        AllFindAmount2.sub(payFindAmount2.sub(earnFind38.sub(earnFind37)))
      );
      // 6wei is the expected deviation within the mortgage pool
      expect((await findContract.totalSupply()).sub(findOldTotalSupply)).eq(-6);

      // change fee to default
      await mortgageContract.setMortgageFee(
        await mortgageContract.MORTGAGE_FEE_DEFAULT()
      );
      expect(await mortgageContract.mortgageFee()).eq(5000);

      // user4 multiply osp5
      console.log("user4 multiply osp5");
      const AllFindAmount5 = BigNumber.from(10).pow(18).mul(100_000);
      const payFindAmount5 = BigNumber.from("2466648238167951512735");
      const payFindAmountMax5 = payFindAmount5;
      await findContract
        .connect(user4Wallet)
        .approve(mortgageContract.address, payFindAmountMax5);
      const user4Osp5MultiplyStaticInfo = await mortgageContract
        .connect(user4Wallet).callStatic
        .multiply(osp5.address, AllFindAmount5, payFindAmountMax5, findContract.address);
      await mortgageContract
        .connect(user4Wallet)
        .multiply(osp5.address, AllFindAmount5, payFindAmountMax5, findContract.address);
      const user4Position1 = await mortgageContract.positionsOfOwner(
        user4Wallet.address
      );
      expect(user4Position1.length).eq(1);
      expect(user4Position1[0].tokenId).eq(user4Osp5MultiplyStaticInfo.tokenId);
      
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      console.log(1111111111);
      // await swapRouter.connect(deployWallet).exactOutputSingle({
      //   tokenIn: findContract.address,
      //   tokenOut: osp5.address,
      //   fee: FeeAmount.HIGH,
      //   recipient: deployWallet.address,
      //   amountOut: user4Position1[0].ospAmount,
      //   amountInMaximum: await findContract.totalSupply(),
      //   sqrtPriceLimitX96: 0,
      // });
      // user4 cash osp5
      // const user4cashOutFindAmount = await mortgageContract.connect(user4Wallet).callStatic.cash(osp5.address, user4Position1[0].ospAmount);

      // expect(await findContract.totalSupply()).eq(
      //   findOldTotalSupply.add(user4cashOutFindAmount)
      // );

      // const user4Osp5_1 = await osp5.balanceOf(user4Wallet.address);
      // const user4Find_1 = await findContract.balanceOf(user4Wallet.address);
      // const mortOsp5_1 = await osp5.balanceOf(mortgageContract.address);
      // const mortFind_1 = await findContract.balanceOf(mortgageContract.address);
      // console.log(222222222)
      await expect(
        mortgageContract
          .connect(user4Wallet)
          .cash(user4Osp5MultiplyStaticInfo.tokenId, user4Position1[0].ospAmount, findContract.address)
      ).revertedWith("FE");
      await findContract
        .connect(user4Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await mortgageContract
        .connect(user4Wallet)
        .redeem(user4Osp5MultiplyStaticInfo.tokenId, user4Position1[0].ospAmount, await findContract.balanceOf(user4Wallet.address), findContract.address);
      const user4Position2 = await mortgageContract.positionsOfOwner(
        user4Wallet.address
      );
      expect(user4Position2.length).eq(0);
      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(findOldTotalSupply.sub(6));
      // console.log(3333333333)
      // const user4Osp5_2 = await osp5.balanceOf(user4Wallet.address);
      // const user4Find_2 = await findContract.balanceOf(user4Wallet.address);
      // const mortOsp5_2 = await osp5.balanceOf(mortgageContract.address);
      // const mortFind_2 = await findContract.balanceOf(mortgageContract.address);

      // expect(await findContract.totalSupply()).eq(findOldTotalSupply);
      // expect(mortFind_2).eq(mortFind_1)
      // expect(user4Find_2.sub(user4Find_1)).eq(user4cashOutFindAmount)
      // expect(mortOsp5_1.sub(mortOsp5_2)).eq(user4Position1[0].ospAmount)
      // expect(user4Osp5_2.eq(user4Osp5_1))

      // const user4Position2 = await mortgageContract.positions(user4Wallet.address);
      // expect(user4Position2.length).eq(0);

      // multiply osp6
      const AllFindAmount6 = BigNumber.from(10).pow(18).mul(100_000);
      const payFindAmount6 = BigNumber.from("2466648238167951512735");
      const payFindAmountMax6 = payFindAmount6;
      await findContract
        .connect(user5Wallet)
        .approve(mortgageContract.address, payFindAmountMax6);
      const user5Osp6MultiplyStaticInfo = await mortgageContract
        .connect(user5Wallet).callStatic
        .multiply(osp6.address, AllFindAmount6, payFindAmountMax6, findContract.address);
      await mortgageContract
        .connect(user5Wallet)
        .multiply(osp6.address, AllFindAmount6, payFindAmountMax6, findContract.address);
      const user5Position1 = await mortgageContract.positionsOfOwner(
        user5Wallet.address
      );
      expect(user5Position1.length).eq(1);
      expect(user5Position1[0].tokenId).eq(user5Osp6MultiplyStaticInfo.tokenId);

      expect(await findContract.totalSupply()).gt(findOldTotalSupply);
      console.log(1111111111);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp6.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: user5Position1[0].ospAmount.mul(3),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      // cash osp6
      const user5cashInfoOutFindAmountInfo = await mortgageContract
        .connect(user5Wallet)
        .callStatic.cash(user5Osp6MultiplyStaticInfo.tokenId, user5Position1[0].ospAmount, findContract.address);
      expect(await findContract.totalSupply()).gt(findOldTotalSupply);

      const user5Osp6_1 = await osp6.balanceOf(user5Wallet.address);
      const user5Find_1 = await findContract.balanceOf(user5Wallet.address);
      const mortOsp6_1 = await osp6.balanceOf(mortgageContract.address);
      const mortFind_3 = await findContract.balanceOf(mortgageContract.address);
      console.log(222222222);
      await mortgageContract
        .connect(user5Wallet)
        .cash(user5Osp6MultiplyStaticInfo.tokenId, user5Position1[0].ospAmount, findContract.address);
      console.log(3333333333);
      const user5Osp6_2 = await osp6.balanceOf(user5Wallet.address);
      const user5Find_2 = await findContract.balanceOf(user5Wallet.address);
      const mortOsp6_2 = await osp6.balanceOf(mortgageContract.address);
      const mortFind_4 = await findContract.balanceOf(mortgageContract.address);

      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(findOldTotalSupply.sub(6));
      expect(mortFind_4).eq(mortFind_3);
      expect(user5Find_2.sub(user5Find_1)).eq(user5cashInfoOutFindAmountInfo.amountOut);
      expect(mortOsp6_1.sub(mortOsp6_2)).eq(user5Position1[0].ospAmount);
      expect(user5Osp6_2.eq(user5Osp6_1));

      const user5Position2 = await mortgageContract.positionsOfOwner(
        user5Wallet.address
      );
      expect(user5Position2.length).eq(0);

      // 6wei is the expected deviation within the mortgage pool
      expect(await findContract.totalSupply()).eq(findOldTotalSupply.sub(6));
      expect(await findContract.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp6.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp5.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp4.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp3.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp2.balanceOf(mortgageContract.address)).eq(0)
      expect(await osp1.balanceOf(mortgageContract.address)).eq(0)
    });
  });
});
