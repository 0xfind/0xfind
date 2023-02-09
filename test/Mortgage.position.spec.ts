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

describe("Mortgage.position", function () {
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
    let osp2: IERC20;
    let osp3: IERC20;
    let osp4: IERC20;
    const osp1ProjectId = "github/1/1";
    const osp2ProjectId = "github/1/2";
    const osp3ProjectId = "github/1/3";
    const osp4ProjectId = "github/1/4";
    let findOldTotalSupply: BigNumber;
    const ospAmount1 = BigNumber.from(10).pow(18).mul(21000);
    const ospAmount5 = ospAmount1.mul(5);
    let nonfungiblePositionManager: INonfungiblePositionManager;
    let usdtContract: USDT;
    let wmatic: IERC20;
    let swapRouter: ISwapRouter02;

    const createOsp = async function (
      name: string,
      symbol: string,
      projectid: string
    ) {
      // factory osp1 config0
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
              [ospParams.base, ospParams.deadline, user1Wallet.address]
            )
          )
        )
      );
      await factoryContract
        .connect(user1Wallet)
        .createOSPByProjectOwner(ospParams);
    };

    const buyOsp = async function (osp: IERC20) {
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: ospAmount5.mul(4),
        amountInMaximum: await findContract.totalSupply(),
        sqrtPriceLimitX96: 0,
      });
      expect(await osp.balanceOf(deployWallet.address)).eq(ospAmount5.mul(4));
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

      await createOsp("github.com/test/1", "0XTEST1", osp1ProjectId);
      await createOsp("github.com/test/2", "0XTEST2", osp2ProjectId);
      await createOsp("github.com/test/3", "0XTEST3", osp3ProjectId);
      await createOsp("github.com/test/4", "0XTEST4", osp4ProjectId);

      osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;
      osp2 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp2ProjectId)
      )) as IERC20;
      osp3 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp3ProjectId)
      )) as IERC20;
      osp4 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp4ProjectId)
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

      // find swap to osp
      await findContract
        .connect(deployWallet)
        .approve(
          swapRouter.address,
          BigNumber.from(10).pow(18).mul(90_000_000_000)
        );
      await buyOsp(osp1);
      await buyOsp(osp2);
      await buyOsp(osp3);
      await buyOsp(osp4);

      await osp1.transfer(user1Wallet.address, ospAmount5.mul(2));
      await osp1.transfer(user2Wallet.address, ospAmount5.mul(2));

      await osp2.transfer(user1Wallet.address, ospAmount5.mul(2));
      await osp2.transfer(user2Wallet.address, ospAmount5.mul(2));

      await osp3.transfer(user1Wallet.address, ospAmount5.mul(2));
      await osp3.transfer(user2Wallet.address, ospAmount5.mul(2));

      await osp4.transfer(user1Wallet.address, ospAmount5.mul(2));
      await osp4.transfer(user2Wallet.address, ospAmount5.mul(2));

      await findContract.transfer(user1Wallet.address, ospAmount5.mul(4));
      await findContract.transfer(user2Wallet.address, ospAmount5.mul(4));
    });

    const testReddemError = async function () {
      await expect(
        mortgageContract
          .connect(user1Wallet)
          .redeem(signatureWallet.address, 1, 1, findContract.address)
      ).revertedWith("");
    };

    const assertPosition = async function (
      userAddress: string,
      len: number,
      positions: { ospAsset: string; ospAmount: BigNumber }[]
    ) {
      const userPositions = await mortgageContract.positionsOfOwner(userAddress);
      expect(userPositions.length).eq(len);

      for (let index = 0; index < positions.length; index++) {
        let position = positions[index];
        expect(userPositions[index].ospAmount).eq(position.ospAmount);
        expect(userPositions[index].ospAsset).eq(position.ospAsset);
      }
    };

    const testMortgage = async function () {
      console.log("testMortgage");
      await assertPosition(user1Wallet.address, 0, []);
      await assertPosition(user2Wallet.address, 0, []);
      const user1Osp1StaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp1.address, ospAmount1, findContract.address);
      // user1 mortgage osp1 1
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp1.address, ospAmount1, findContract.address);
      await assertPosition(user1Wallet.address, 1, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1,
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 mortgage osp2 2
      const user1Osp2StaticInfo = await mortgageContract
        .connect(user1Wallet).callStatic
        .mortgage(osp2.address, ospAmount1.mul(2), findContract.address);

      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp2.address, ospAmount1.mul(2), findContract.address);

      await assertPosition(user1Wallet.address, 2, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1,
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(2),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 mortgage osp3 3
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp3.address, ospAmount1.mul(3), findContract.address);

      await assertPosition(user1Wallet.address, 3, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1,
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 mortgage osp4 4
      await mortgageContract
        .connect(user1Wallet)
        .mortgage(osp4.address, ospAmount1.mul(4), findContract.address);

      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1,
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 mortgage osp1 5
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Osp1StaticInfo.tokenId, ospAmount1.mul(5), findContract.address);

      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 mortgage osp2 6
      await mortgageContract
        .connect(user1Wallet)
        .mortgageAdd(user1Osp2StaticInfo.tokenId, ospAmount1.mul(6), findContract.address);

      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);
    };

    const user1RedeemOsp = async function (osp: IERC20, ospAmount: BigNumber) {
      const positions = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp.address);
      const tokenId = positions[0].tokenId;

      await mortgageContract
        .connect(user1Wallet)
        .redeem(
          tokenId,
          ospAmount,
          await findContract.balanceOf(user1Wallet.address),
          findContract.address
        );
    };

    const user1RedeemOsp1 = async function () {
      // user1 redeem osp1 6
      const find1 = await findContract.balanceOf(user1Wallet.address);
      await user1RedeemOsp(osp1, ospAmount1.mul(6));
      const find2 = await findContract.balanceOf(user1Wallet.address);
      expect(find1.sub(find2)).eq(BigNumber.from("128274539313509065183592"));
    };

    const user1RedeemOsp2 = async function () {
      // user1 redeem osp2 8
      const find1 = await findContract.balanceOf(user1Wallet.address);
      await user1RedeemOsp(osp2, ospAmount1.mul(8));
      const find2 = await findContract.balanceOf(user1Wallet.address);
      expect(find1.sub(find2)).eq(BigNumber.from("172068104450215790477478"));
    };

    const user1RedeemOsp3 = async function () {
      // user1 redeem osp3 3
      const find1 = await findContract.balanceOf(user1Wallet.address);
      await user1RedeemOsp(osp3, ospAmount1.mul(3));
      const find2 = await findContract.balanceOf(user1Wallet.address);
      expect(find1.sub(find2)).eq(BigNumber.from("63563548270062515442151"));
    };

    const user1RedeemOsp4 = async function () {
      // user1 redeem osp4 4
      const find1 = await findContract.balanceOf(user1Wallet.address);
      await user1RedeemOsp(osp4, ospAmount1.mul(4));
      const find2 = await findContract.balanceOf(user1Wallet.address);
      expect(find1.sub(find2)).eq(BigNumber.from("85004859818801832242601"));
    };

    const testReddem1 = async function () {
      const positions = await mortgageContract.positionsOfOwnerByOsp(user1Wallet.address, osp3.address);
      const osp3TokenId = positions[0].tokenId;

      console.log("testReddem1");
      await expect(
        mortgageContract
          .connect(user1Wallet)
          .redeem(
            osp3TokenId,
            ospAmount1.mul(5),
            await findContract.balanceOf(user1Wallet.address),
            findContract.address
          )
      ).revertedWith("E2");

      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp3 3
      await user1RedeemOsp3();
      await assertPosition(user1Wallet.address, 3, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp4 4
      await user1RedeemOsp4();
      await assertPosition(user1Wallet.address, 2, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp1 6
      await user1RedeemOsp1();
      await assertPosition(user1Wallet.address, 1, [
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp2 8
      await user1RedeemOsp2();
      await assertPosition(user1Wallet.address, 0, []);
      await assertPosition(user2Wallet.address, 0, []);
    };

    const testReddem2 = async function () {
      console.log("testReddem2");
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);
      // user1 redeem osp4 4
      await user1RedeemOsp4();
      await assertPosition(user1Wallet.address, 3, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp2 8
      await user1RedeemOsp2();
      await assertPosition(user1Wallet.address, 2, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp1 6
      await user1RedeemOsp1();
      await assertPosition(user1Wallet.address, 1, [
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp3 3
      await user1RedeemOsp3();
      await assertPosition(user1Wallet.address, 0, []);
      await assertPosition(user2Wallet.address, 0, []);
    };

    const testReddem3 = async function () {
      console.log("testReddem3");
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp1 6
      await user1RedeemOsp1();
      await assertPosition(user1Wallet.address, 3, [
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp3 3
      await user1RedeemOsp3();
      await assertPosition(user1Wallet.address, 2, [
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp2 8
      await user1RedeemOsp2();
      await assertPosition(user1Wallet.address, 1, [
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp4 4
      await user1RedeemOsp4();
      await assertPosition(user1Wallet.address, 0, []);
      await assertPosition(user2Wallet.address, 0, []);
    };

    const testReddem4 = async function () {
      console.log("testReddem4");
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp2 8
      await user1RedeemOsp2();
      await assertPosition(user1Wallet.address, 3, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp3 3
      await user1RedeemOsp3();
      await assertPosition(user1Wallet.address, 2, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp1 6
      await user1RedeemOsp1();
      await assertPosition(user1Wallet.address, 1, [
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp4 4
      await user1RedeemOsp4();
      await assertPosition(user1Wallet.address, 0, []);
      await assertPosition(user2Wallet.address, 0, []);
    };

    const testReddemSome = async function () {
      console.log("testReddemSome");
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(8),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp2 1
      await user1RedeemOsp(osp2, ospAmount1);
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(7),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(3),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp3 1
      await user1RedeemOsp(osp3, ospAmount1);
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(6),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(7),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp1 1
      await user1RedeemOsp(osp1, ospAmount1);
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(5),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(7),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(4),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);

      // user1 redeem osp4 1
      await user1RedeemOsp(osp4, ospAmount1);
      await assertPosition(user1Wallet.address, 4, [
        {
          ospAsset: osp1.address,
          ospAmount: ospAmount1.mul(5),
        },
        {
          ospAsset: osp2.address,
          ospAmount: ospAmount1.mul(7),
        },
        {
          ospAsset: osp3.address,
          ospAmount: ospAmount1.mul(2),
        },
        {
          ospAsset: osp4.address,
          ospAmount: ospAmount1.mul(3),
        },
      ]);
      await assertPosition(user2Wallet.address, 0, []);
    };

    it("xxx", async function () {
      await osp1
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp2
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp3
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp4
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));

      await findContract
        .connect(user1Wallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));

      await testReddemError();

      await testMortgage();
      await testReddem1();

      await testMortgage();
      await testReddem2();

      await testMortgage();
      await testReddem3();

      await testMortgage();
      await testReddem4();

      await testMortgage();
      await testReddemSome();
    });
  });
});
