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
  DEFAULT_OSP_POOL_CONFIG_2,
  ZERO_ADDRESS,
  UNISWAP_V3_POSITIONS,
  UNISWAP_ROUTER,
} from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Mortgage.mortgage.find", function () {
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

    let osp1Params: any;
    let osp2Params: any;
    let osp3Params: any;
    let osp4Params: any;
    let osp5Params: any;
    let osp6Params: any;

    let osp1: IERC20;
    let osp2: IERC20;
    let osp3: IERC20;
    let osp4: IERC20;
    let osp5: IERC20;
    let osp6: IERC20;

    const ospAmount5 = BigNumber.from(10).pow(18).mul(105000);
    let nonfungiblePositionManager: INonfungiblePositionManager;

    const getOspParams = function (index: any, poolConfigIndex: number) {
      return {
        base: {
          name: `github.com/test/${index}`,
          symbol: `0XTEST${index}`,
          projectId: `github/1/${index}`,
          stars: 1,
          poolConfigIndex: poolConfigIndex,
          nftPercentConfigIndex: 0,
        },
        deadline: parseInt(
          (new Date().getTime() / 1000).toString().substr(0, 10)
        ),
        signature: "",
      };
    };

    const createOsp = async function (ospParams: any) {
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

      nonfungiblePositionManager = (await ethers.getContractAt(
        "INonfungiblePositionManager",
        UNISWAP_V3_POSITIONS
      )) as INonfungiblePositionManager;

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
      // addOspPoolConfig 2
      await factoryContract
        .connect(deployWallet)
        .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_2);

      // createFindUniswapPool
      await findContract
        .connect(deployWallet)
        .transfer(factoryContract.address, await findContract.totalSupply());
      await factoryContract.connect(deployWallet).createFindUniswapPool();

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

    it("find", async function () {
      // FIND OSP
      // 0
      const config0FindOspPool = await mathContract.findOspPools(0);
      expect(config0FindOspPool.fee).eq(10000);
      expect(config0FindOspPool.tickSpacing).eq(200);
      expect(config0FindOspPool.maxLiquidityPerTick).eq(
        BigNumber.from("38350317471085141830651933667504588")
      );
      expect(config0FindOspPool.liquidity).eq(0);
      expect(config0FindOspPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_0.findOspPool.initSqrtPriceX96
      );
      expect(config0FindOspPool.slot0.tick).eq(100);
      expect(config0FindOspPool.slot0.unlocked).eq(true);
      expect(config0FindOspPool.balance0).eq(0);
      expect(config0FindOspPool.balance1).eq(
        BigNumber.from(10).pow(18).mul(210_0000)
      );
      // 1
      const config1FindOspPool = await mathContract.findOspPools(1);
      expect(config1FindOspPool.fee).eq(10000);
      expect(config1FindOspPool.tickSpacing).eq(200);
      expect(config1FindOspPool.maxLiquidityPerTick).eq(
        BigNumber.from("38350317471085141830651933667504588")
      );
      expect(config1FindOspPool.liquidity).eq(0);
      expect(config1FindOspPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_1.findOspPool.initSqrtPriceX96
      );
      expect(config1FindOspPool.slot0.tick).eq(100);
      expect(config1FindOspPool.slot0.unlocked).eq(true);
      expect(config1FindOspPool.balance0).eq(0);
      expect(config1FindOspPool.balance1).eq(
        BigNumber.from(10).pow(18).mul(100_0000)
      );
      // 2
      const config2FindOspPool = await mathContract.findOspPools(2);
      expect(config2FindOspPool.fee).eq(100);
      expect(config2FindOspPool.tickSpacing).eq(1);
      expect(config2FindOspPool.maxLiquidityPerTick).eq(
        BigNumber.from("191757530477355301479181766273477")
      );
      expect(config2FindOspPool.liquidity).eq(0);
      expect(config2FindOspPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_2.findOspPool.initSqrtPriceX96
      );
      expect(config2FindOspPool.slot0.tick).eq(100);
      expect(config2FindOspPool.slot0.unlocked).eq(true);
      expect(config2FindOspPool.balance0).eq(0);
      expect(config2FindOspPool.balance1).eq(
        BigNumber.from(10).pow(18).mul(200_0000)
      );

      // OSP FIND
      // 0
      const config0OspFindPool = await mathContract.ospFindPools(0);
      expect(config0OspFindPool.fee).eq(10000);
      expect(config0OspFindPool.tickSpacing).eq(200);
      expect(config0OspFindPool.maxLiquidityPerTick).eq(
        BigNumber.from("38350317471085141830651933667504588")
      );
      expect(config0OspFindPool.liquidity).eq(0);
      expect(config0OspFindPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.initSqrtPriceX96
      );
      expect(config0OspFindPool.slot0.tick).eq(-101);
      expect(config0OspFindPool.slot0.unlocked).eq(true);
      expect(config0OspFindPool.balance0).eq(
        BigNumber.from(10).pow(18).mul(210_0000)
      );
      expect(config0OspFindPool.balance1).eq(0);
      // 1
      const config1OspFindPool = await mathContract.ospFindPools(1);
      expect(config1OspFindPool.fee).eq(10000);
      expect(config1OspFindPool.tickSpacing).eq(200);
      expect(config1OspFindPool.maxLiquidityPerTick).eq(
        BigNumber.from("38350317471085141830651933667504588")
      );
      expect(config1OspFindPool.liquidity).eq(0);
      expect(config1OspFindPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.initSqrtPriceX96
      );
      expect(config1OspFindPool.slot0.tick).eq(-101);
      expect(config1OspFindPool.slot0.unlocked).eq(true);
      expect(config1OspFindPool.balance0).eq(
        BigNumber.from(10).pow(18).mul(100_0000)
      );
      expect(config1OspFindPool.balance1).eq(0);
      // 2
      const config2OspFindPool = await mathContract.ospFindPools(2);
      expect(config2OspFindPool.fee).eq(100);
      expect(config2OspFindPool.tickSpacing).eq(1);
      expect(config2OspFindPool.maxLiquidityPerTick).eq(
        BigNumber.from("191757530477355301479181766273477")
      );
      expect(config2OspFindPool.liquidity).eq(0);
      expect(config2OspFindPool.slot0.sqrtPriceX96).eq(
        DEFAULT_OSP_POOL_CONFIG_2.ospFindPool.initSqrtPriceX96
      );
      expect(config2OspFindPool.slot0.tick).eq(-101);
      expect(config2OspFindPool.slot0.unlocked).eq(true);
      expect(config2OspFindPool.balance0).eq(
        BigNumber.from(10).pow(18).mul(200_0000)
      );
      expect(config2OspFindPool.balance1).eq(0);

      // osp1 use 0
      let index = 0;

      console.log("try ", index);
      index += 1;
      osp1Params = getOspParams(index, 0);
      await createOsp(osp1Params);
      osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1Params.base.projectId)
      )) as IERC20;

      // osp3 use 1
      console.log("try ", index);
      index += 1;
      osp3Params = getOspParams(index, 1);
      await createOsp(osp3Params);
      osp3 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp3Params.base.projectId)
      )) as IERC20;

      // osp5 < find use 2
      while (true) {
        console.log("try ", index);
        index += 1;
        osp5Params = getOspParams(index, 2);
        await createOsp(osp5Params);
        osp5 = (await ethers.getContractAt(
          "IERC20",
          await factoryContract.projectId2OspToken(osp5Params.base.projectId)
        )) as IERC20;
        if (osp5.address < findContract.address) {
          break;
        }
      }
      console.log("5 done");
      // find < osp6 use 2
      while (true) {
        console.log("try ", index);
        index += 1;
        osp6Params = getOspParams(index, 2);
        await createOsp(osp6Params);
        osp6 = (await ethers.getContractAt(
          "IERC20",
          await factoryContract.projectId2OspToken(osp6Params.base.projectId)
        )) as IERC20;
        if (findContract.address < osp6.address) {
          break;
        }
      }

      const swapRouter = (await ethers.getContractAt(
        "ISwapRouter02",
        UNISWAP_ROUTER
      )) as ISwapRouter02;

      await findContract
        .connect(deployWallet)
        .approve(swapRouter.address, BigNumber.from(2).pow(256).sub(1));
      const amountInMaximum = BigNumber.from(10).pow(18).mul(21000).mul(50);
      const find1 = await findContract.balanceOf(deployWallet.address);
      console.log(1);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp1.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(21000).mul(10),
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0,
      });
      console.log(2);
      const find2 = await findContract.balanceOf(deployWallet.address);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp3.address,
        fee: FeeAmount.HIGH,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(10000).mul(10),
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0,
      });
      console.log(3);
      const find3 = await findContract.balanceOf(deployWallet.address);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp5.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(20000).mul(20),
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0,
      });
      console.log(4);
      const find4 = await findContract.balanceOf(deployWallet.address);
      await swapRouter.connect(deployWallet).exactOutputSingle({
        tokenIn: findContract.address,
        tokenOut: osp6.address,
        fee: FeeAmount.LOWEST,
        recipient: deployWallet.address,
        amountOut: BigNumber.from(10).pow(18).mul(20000).mul(20),
        amountInMaximum: amountInMaximum,
        sqrtPriceLimitX96: 0,
      });
      console.log(5);
      const find5 = await findContract.balanceOf(deployWallet.address);

      // osp1
      expect(BigNumber.from("218580936928223918185770")).eq(find1.sub(find2));
      // osp3
      expect(BigNumber.from("112193757699195973153094")).eq(find2.sub(find3));
      // osp5
      expect(BigNumber.from("669411478402251329820244")).eq(find3.sub(find4));
      // osp6
      expect(BigNumber.from("402418539897913949226717")).eq(find4.sub(find5));

      await osp1
        .connect(deployWallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp3
        .connect(deployWallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp5
        .connect(deployWallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));
      await osp6
        .connect(deployWallet)
        .approve(mortgageContract.address, BigNumber.from(2).pow(256).sub(1));

      const m1 = await mortgageContract.connect(deployWallet).callStatic.mortgage(osp1.address, BigNumber.from(10).pow(18).mul(21000).mul(10), findContract.address);
      const m3 = await mortgageContract.connect(deployWallet).callStatic.mortgage(osp3.address, BigNumber.from(10).pow(18).mul(10000).mul(10), findContract.address);
      const m5 = await mortgageContract.connect(deployWallet).callStatic.mortgage(osp5.address, BigNumber.from(10).pow(18).mul(20000).mul(20), findContract.address);
      const m6 = await mortgageContract.connect(deployWallet).callStatic.mortgage(osp6.address, BigNumber.from(10).pow(18).mul(20000).mul(20), findContract.address);
      
      expect(m1.outFindAmount).eq(BigNumber.from("215313151921146970608892"));
      expect(m3.outFindAmount).eq(BigNumber.from("110516461021592993354456"));
      expect(m5.outFindAmount).eq(BigNumber.from("665997814568139049163791"));
      expect(m6.outFindAmount).eq(BigNumber.from("400366406553704537042636"));

    });
  });
});
