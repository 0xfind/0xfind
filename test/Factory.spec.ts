import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import { Factory, IFactory, IUniswapV3Pool, Find, WETH, USDT, OSP, INonfungiblePositionManager, IERC20, Mortgage, Earn, FindNFT, ISwapRouter02 } from "../typechain";

import { deployAllContractWethFind, DEFAULT_OSP_POOL_CONFIG_0, DEFAULT_OSP_POOL_CONFIG_1, ZERO_ADDRESS, UNISWAP_V3_POSITIONS, UNISWAP_ROUTER } from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { FeeAmount } from "@uniswap/v3-sdk";

describe("Factory", function () {
  let wallets: SignerWithAddress[];
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[deployWalletIndex];
    signatureWallet = wallets[signatureWalletIndex];
    userWallet = wallets[userWalletIndex];
  });

  describe("base", function () {
    let factoryContract: Factory;
    let wethContract: WETH
    let findContract: Find
    let earnContract: Earn
    let findnftContract: FindNFT
  
    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      wethContract = allInfo.wethContract;
      findContract = allInfo.findContract;
    });

    it("factory contract link address", async function () {
      expect(await factoryContract.earn()).eq(earnContract.address);
      expect((await factoryContract.findInfo()).token).eq(findContract.address);
      expect(await factoryContract.weth()).eq(wethContract.address);
      expect(await factoryContract.findnft()).eq(findnftContract.address);
      expect(await factoryContract.owner()).eq(deployWallet.address);
    });

    it("factory contract init view", async function () {
      expect((await factoryContract.findInfo()).fee).eq(100);
    });

    it("factory empty findinfo", async function () {
      const findinfo = await factoryContract.findInfo();
      const findLpTokenIdList = await factoryContract.findLpTokenIdList();

      expect(findinfo.token).eq(findinfo[0]).eq(findContract.address);
      expect(findinfo.pool).eq(findinfo[1]).eq(ZERO_ADDRESS);
      expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(0);
      expect(findinfo.onftTokenId).eq(findinfo[3]).eq(0);
      expect(findinfo.fee).eq(findinfo[4]).eq(100);
      expect(findLpTokenIdList.length).eq(0);
    });

    it("factory empty osp config", async function () {
      const ospPoolConfigsCount = await factoryContract.ospPoolConfigsCount();
      expect(ospPoolConfigsCount).eq(0);
    });

    it("ifactory empty findinfo", async function () {
      const ifactory = (await ethers.getContractAt(
        "IFactory",
        factoryContract.address
      )) as IFactory;

      const findinfo = await ifactory.findInfo();
      const findLpTokenIdList = await ifactory.findLpTokenIdList();

      expect(findinfo.token).eq(findinfo[0]).eq(findContract.address);
      expect(findinfo.pool).eq(findinfo[1]).eq(ZERO_ADDRESS);
      expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(0);
      expect(findinfo.onftTokenId).eq(findinfo[3]).eq(0);
      expect(findinfo.fee).eq(findinfo[4]).eq(100);

      expect(findLpTokenIdList.length).eq(0);
    });

    it("factory contract role check", async function () {
      await expect(
        factoryContract.connect(userWallet).renounceOwnership()
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        factoryContract
          .connect(userWallet)
          .transferOwnership(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        factoryContract
          .connect(userWallet)
          .setSignatureAddress(userWallet.address)
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        factoryContract.connect(userWallet).createFindUniswapPool()
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        factoryContract
          .connect(userWallet)
          .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0)
      ).revertedWith("Ownable: caller is not the owner");

      await expect(
        factoryContract.connect(userWallet).addNFTPercentConfig(1000, 9000)
      ).revertedWith("Ownable: caller is not the owner");
    });

    describe("transferOwnership", function() {
      let factoryContract: Factory;
      before(async function () {
        let allInfo = await deployAllContractWethFind();
        factoryContract = allInfo.factoryContract;
      });
      it("transferOwnership", async function () {
        expect(await factoryContract.owner()).eq(deployWallet.address);
        await factoryContract.connect(deployWallet).transferOwnership(userWallet.address);
        expect(await factoryContract.owner()).eq(userWallet.address);
        await factoryContract.connect(userWallet).renounceOwnership();
        expect(await factoryContract.owner()).eq(ZERO_ADDRESS);
      })
    });

    describe("create find pool and add osp config", function() {
      before(async function () {
        // addNFTPercentConfig
        await factoryContract.connect(deployWallet).addNFTPercentConfig(500, 9500);
        // createFindUniswapPool
        await findContract.connect(deployWallet).transfer(factoryContract.address, await findContract.totalSupply());
        await factoryContract.connect(deployWallet).createFindUniswapPool();
        // addOspPoolConfig 0
        await factoryContract.connect(deployWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);
        // addOspPoolConfig 1
        await factoryContract.connect(deployWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_1);

        await factoryContract.connect(deployWallet).addNFTPercentConfig(1100, 8900);
      });

      it("find nft info", async function () {
        const findinfo = await factoryContract.findInfo();

        const cinfo = await findnftContract.tokenId2Info(findinfo.cnftTokenId);
        expect(cinfo.name).eq(cinfo[0]).eq("github.com/0xfind");
        expect(cinfo.symbol).eq(cinfo[1]).eq("0xHARBERGER");
        expect(cinfo.projectId).eq(cinfo[2]).eq("github/105404818/000000");
        expect(cinfo.stars).eq(cinfo[3]).eq(1)
        expect(cinfo.token).eq(cinfo[4]).eq(findContract.address)
        expect(cinfo.percent).eq(cinfo[5]).eq(500)
        expect(cinfo.isCnft).eq(cinfo[6]).eq(true)
        expect(cinfo.tokenId).eq(cinfo[7]).eq(findinfo.cnftTokenId)

        const oinfo = await findnftContract.tokenId2Info(findinfo.onftTokenId);
        expect(oinfo.name).eq(oinfo[0]).eq("github.com/0xfind");
        expect(oinfo.symbol).eq(oinfo[1]).eq("0xHARBERGER");
        expect(oinfo.projectId).eq(oinfo[2]).eq("github/105404818/000000");
        expect(oinfo.stars).eq(oinfo[3]).eq(1)
        expect(oinfo.token).eq(oinfo[4]).eq(findContract.address)
        expect(oinfo.percent).eq(oinfo[5]).eq(9500)
        expect(oinfo.isCnft).eq(oinfo[6]).eq(false)
        expect(oinfo.tokenId).eq(oinfo[7]).eq(findinfo.onftTokenId)

        expect(await findnftContract.ownerOf(findinfo.cnftTokenId)).eq(await factoryContract.owner())
        expect(await findnftContract.ownerOf(findinfo.onftTokenId)).eq(await factoryContract.owner())

        expect(await findnftContract.isClaimed(findinfo.cnftTokenId)).eq(true);
        expect(await findnftContract.isClaimed(findinfo.onftTokenId)).eq(true);
      })

      it("factory findinfo findLpTokenIdList", async function () {
        const findinfo = await factoryContract.findInfo();
        const findLpTokenIdList = await factoryContract.findLpTokenIdList();
  
        expect(findinfo.token).eq(findinfo[0]).eq(findContract.address);
        expect(findinfo.pool).eq(findinfo[1]).not.eq(ZERO_ADDRESS);
        expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(0);
        expect(findinfo.onftTokenId).eq(findinfo[3]).eq(1);
        expect(findinfo.fee).eq(findinfo[4]).eq(100);

        expect(findLpTokenIdList.length).eq(1);
        expect(findLpTokenIdList[0]).not.eq(0);

        let nonfungiblePositionManager = (await ethers.getContractAt(
          "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
        )) as INonfungiblePositionManager;

        let position = await nonfungiblePositionManager.positions(findLpTokenIdList[0])

        const findPool = (await ethers.getContractAt(
          "IUniswapV3Pool",
          findinfo.pool
        )) as IUniswapV3Pool;
        expect(await findPool.fee()).eq(findinfo.fee);
        if ((await findPool.token0()) == findinfo.token) {
          expect(await findPool.token1()).eq(await factoryContract.weth());

          expect(position.token0).eq(findinfo.token)
          expect(position.token1).eq(await factoryContract.weth())
          expect(position.fee).eq(findinfo.fee)

          expect(position.tickLower).eq(-69082);
          expect(position.tickUpper).eq(-69081);
        } else {
          expect(await findPool.token0()).eq(await factoryContract.weth());
          expect(await findPool.token1()).eq(findinfo.token);

          expect(position.token0).eq(await factoryContract.weth())
          expect(position.token1).eq(findinfo.token)
          expect(position.fee).eq(findinfo.fee)

          expect(position.tickLower).eq(69080);
          expect(position.tickUpper).eq(69081);

        }


      });

      it("ifactory findinfo findLpTokenIdList", async function () {
        const ifactory = (await ethers.getContractAt(
          "IFactory",
          factoryContract.address
        )) as IFactory;

        const findinfo = await factoryContract.findInfo();
        const ifindinfo = await ifactory.findInfo();
        const ifindLpTokenIdList = await ifactory.findLpTokenIdList();
        const findLpTokenIdList = await factoryContract.findLpTokenIdList();
  
        expect(findinfo.token).eq(findinfo[0]).eq(ifindinfo.token).eq(ifindinfo[0])
        expect(findinfo.pool).eq(findinfo[1]).eq(ifindinfo.pool).eq(ifindinfo[1])
        expect(findinfo.cnftTokenId).eq(findinfo[2]).eq(ifindinfo.cnftTokenId).eq(ifindinfo[2])
        expect(findinfo.onftTokenId).eq(findinfo[3]).eq(ifindinfo.onftTokenId).eq(ifindinfo[3])
        expect(findinfo.fee).eq(findinfo[4]).eq(ifindinfo.fee).eq(ifindinfo[4])

        expect(findLpTokenIdList.length).eq(ifindLpTokenIdList.length);
        expect(findLpTokenIdList[0]).eq(ifindLpTokenIdList[0]);
      });

      it("nftPercentConfigs", async function () {
        const config = await factoryContract.nftPercentConfigs(0);
        expect(config.cnft).eq(config[0]).eq(500);
        expect(config.onft).eq(config[1]).eq(9500);

        const config1 = await factoryContract.nftPercentConfigs(1);
        expect(config1.cnft).eq(config1[0]).eq(1100);
        expect(config1.onft).eq(config1[1]).eq(8900);
      });

      it("ospPoolConfigsCount getOspPoolConfigs", async function () {
        const count = await factoryContract.ospPoolConfigsCount();
        expect(count).eq(2);

        const config = await factoryContract.getOspPoolConfigs(0);
        expect(config.fee).eq(DEFAULT_OSP_POOL_CONFIG_0.fee);
        expect(config.findOspPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.initSqrtPriceX96);
        expect(config.ospFindPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.initSqrtPriceX96);
        expect(config.findOspPoolPositions.length).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions.length);
        expect(config.ospFindPoolPositions.length).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions.length);

        // findOspPoolPositions
        for (let index = 0; index < config.findOspPoolPositions.length; index ++) {
          expect(config.findOspPoolPositions[index].tickLower).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[index].tickLower);
          expect(config.findOspPoolPositions[index].tickUpper).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[index].tickUpper);
          expect(config.findOspPoolPositions[index].amount).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[index].amount);
        }

        // ospFindPoolPositions
        for (let index = 0; index < config.ospFindPoolPositions.length; index ++) {
          expect(config.ospFindPoolPositions[index].tickLower).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[index].tickLower);
          expect(config.ospFindPoolPositions[index].tickUpper).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[index].tickUpper);
          expect(config.ospFindPoolPositions[index].amount).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[index].amount);
        }

        const config1 = await factoryContract.getOspPoolConfigs(1);
        expect(config1.fee).eq(DEFAULT_OSP_POOL_CONFIG_1.fee);
        expect(config1.findOspPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_1.findOspPool.initSqrtPriceX96);
        expect(config1.ospFindPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.initSqrtPriceX96);
        expect(config1.findOspPoolPositions.length).eq(DEFAULT_OSP_POOL_CONFIG_1.findOspPool.positions.length);
        expect(config1.ospFindPoolPositions.length).eq(DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.positions.length);

        // findOspPoolPositions
        expect(config1.findOspPoolPositions[0].tickLower).eq(DEFAULT_OSP_POOL_CONFIG_1.findOspPool.positions[0].tickLower);

        // ospFindPoolPositions
        expect(config1.ospFindPoolPositions[0].tickLower).eq(DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.positions[0].tickLower);

      });

      describe("create osp all way", function() {
        let usdtContract: USDT
        let userWallet1: SignerWithAddress
        let userWallet2: SignerWithAddress
        let userWallet3: SignerWithAddress
        let userWallet4: SignerWithAddress
        let userWallet5: SignerWithAddress
        let userWallet6: SignerWithAddress
        let userWallet7: SignerWithAddress
        let userWallet8: SignerWithAddress
        let userWallet9: SignerWithAddress
        let userWallet10: SignerWithAddress
        let userWallet11: SignerWithAddress
        let userWallet12: SignerWithAddress
        let userWallet13: SignerWithAddress
        let wmatic: IERC20
        let nonfungiblePositionManager: INonfungiblePositionManager
        let userWallets: SignerWithAddress[]
        let userWalletOtherConfig: SignerWithAddress
        let newSignature: SignerWithAddress

        const getOspName = function (number: number) {
          return "github.com/test/" + number;
        }

        const getOspSymbol = function (number: number) {
          return "0XTEST" + number;
        }

        const getOspProjectId = function (number: number) {
          return "github/1/" + number;
        }

        const createUsdtAndCreateUsdtWethPool = async function () {
          // deploy usdt
          usdtContract = (await (
            await ethers.getContractFactory("USDT")
          ).deploy()) as USDT;
    
          // usdt / weth = 1000 / 1
          let token0;
          let token1;
          let token0AmountDesired;
          let token1AmountDesired;
          let sqrtPriceX96;
          let fee;
          let tickLower;
          let tickUpper;
          let wethAmountDesired = BigNumber.from(10).pow(18).mul(1_000_000);
          if (usdtContract.address < wethContract.address) {
            token0 = usdtContract.address;
            token1 = wethContract.address;
            token0AmountDesired = BigNumber.from(0);
            token1AmountDesired = wethAmountDesired;
            sqrtPriceX96 = "2505414483750479311864138015696063";
            fee = FeeAmount.HIGH;
            tickLower = 206800;
            tickUpper = 207000;
          } else {
            token0 = wethContract.address;
            token1 = usdtContract.address;
            token0AmountDesired = wethAmountDesired;
            token1AmountDesired = BigNumber.from(0);
            sqrtPriceX96 = "2505414483750479311864138";
            fee = FeeAmount.HIGH;
            tickLower = -207000;
            tickUpper = -206800;
          }
    
          await nonfungiblePositionManager
            .connect(deployWallet)
            .createAndInitializePoolIfNecessary(token0, token1, fee, sqrtPriceX96);
    
          await wethContract
            .connect(deployWallet)
            .approve(nonfungiblePositionManager.address, wethAmountDesired);
          await nonfungiblePositionManager.connect(deployWallet).mint({
            token0: token0,
            token1: token1,
            fee: fee,
            tickLower: tickLower,
            tickUpper: tickUpper,
            amount0Desired: token0AmountDesired,
            amount1Desired: token1AmountDesired,
            amount0Min: 0,
            amount1Min: 0,
            recipient: deployWallet.address,
            deadline:
              parseInt((new Date().getTime() / 1000).toString().substr(0, 10)) +
              1000,
          });
        };

        const createWmaticWethPool = async function (){
          // wmatic / weth = 500 / 1
          let token0;
          let token1;
          let token0AmountDesired;
          let token1AmountDesired;
          let sqrtPriceX96;
          let fee;
          let tickLower;
          let tickUpper;
          let wethAmountDesired = BigNumber.from(10).pow(18).mul(1_000_000);
          if (wmatic.address < wethContract.address) {
            token0 = wmatic.address;
            token1 = wethContract.address;
            token0AmountDesired = BigNumber.from(0);
            token1AmountDesired = wethAmountDesired;
            sqrtPriceX96 = "3543191142285914205922034323";
            fee = FeeAmount.HIGH;
            tickLower = -62400;
            tickUpper = -62200;
          } else {
            token0 = wethContract.address;
            token1 = wmatic.address;
            token0AmountDesired = wethAmountDesired;
            token1AmountDesired = BigNumber.from(0);
            sqrtPriceX96 = "1771595571142957028654913257335";
            fee = FeeAmount.HIGH;
            tickLower = 62200;
            tickUpper = 62400;
          }

          await nonfungiblePositionManager
          .connect(deployWallet)
          .createAndInitializePoolIfNecessary(
            token0,
            token1,
            fee,
            sqrtPriceX96
          );

          await wethContract
          .connect(deployWallet)
          .approve(nonfungiblePositionManager.address, wethAmountDesired);
          await nonfungiblePositionManager.connect(deployWallet).mint(
            {
              token0: token0,
              token1: token1,
              fee: fee,
              tickLower: tickLower,
              tickUpper: tickUpper,
              amount0Desired: token0AmountDesired,
              amount1Desired: token1AmountDesired,
              amount0Min: 0,
              amount1Min: 0,
              recipient: deployWallet.address,
              deadline:
                parseInt((new Date().getTime() / 1000).toString().substr(0, 10)) +
                1000,
            }
          );

          
        }

        const deployWalletBuyFind = async function () {
          const swapRouter = (await ethers.getContractAt(
            "ISwapRouter02", UNISWAP_ROUTER
          )) as ISwapRouter02;

          await wethContract.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(150));
          await swapRouter.connect(deployWallet).exactOutputSingle({
            tokenIn: wethContract.address,
            tokenOut: findContract.address,
            fee: FeeAmount.LOWEST,
            recipient: deployWallet.address,
            amountOut: BigNumber.from(10).pow(18).mul(100_000),
            amountInMaximum: BigNumber.from(10).pow(18).mul(150),
            sqrtPriceLimitX96: 0,
          });
          expect(await findContract.balanceOf(deployWallet.address)).eq(BigNumber.from(10).pow(18).mul(100_000));
        }

        before(async function () {
          userWallet1 = wallets[3];
          userWallet2 = wallets[4];
          userWallet3 = wallets[5];
          userWallet4 = wallets[6];
          userWallet5 = wallets[7];
          userWallet6 = wallets[8];
          userWallet7 = wallets[9];
          userWallet8 = wallets[10];
          userWallet9 = wallets[11];
          userWallet10 = wallets[12];
          userWallet11 = wallets[13];
          userWallet12 = wallets[14];
          userWallet13 = wallets[15];
          userWallets = [
            userWallet1, userWallet2, userWallet3, userWallet4,
            userWallet5, userWallet6, userWallet7, userWallet8,
            userWallet9, userWallet10, userWallet11, userWallet12, userWallet13
          ]
          userWalletOtherConfig = wallets[16];
          newSignature = wallets[17];
          

          nonfungiblePositionManager = (await ethers.getContractAt(
            "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
          )) as INonfungiblePositionManager;
          wmatic = (await ethers.getContractAt(
            "IERC20",
            await nonfungiblePositionManager.WETH9()
          )) as IERC20;

          await createUsdtAndCreateUsdtWethPool();
          await createWmaticWethPool();
          await deployWalletBuyFind();

          const earnFind1 = await findContract.balanceOf(earnContract.address);

          // createOSP use find
          const osp1Params = {
            base: {
              name: getOspName(1),
              symbol: getOspSymbol(1),
              projectId: getOspProjectId(1),
              stars: 1,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(3),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: findContract.address,
            signature: ""
          }
          osp1Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp1Params.base, osp1Params.deadline, osp1Params.buyNFTTokenAmountMax, osp1Params.buyNFTFindAmount, osp1Params.tokenToFindOutPath, userWallet1.address]
            )))
          );
          await findContract.connect(deployWallet).transfer(userWallet1.address, osp1Params.buyNFTTokenAmountMax);
          await findContract.connect(userWallet1).approve(factoryContract.address, osp1Params.buyNFTTokenAmountMax);

          await expect(
            factoryContract.connect(deployWallet).createOSP(osp1Params)
          ).revertedWith("SE2");

          await factoryContract.connect(userWallet1).createOSP(osp1Params);

          const earnFind2 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind2.sub(earnFind1))
          expect(earnFind2.sub(earnFind1)).eq(BigNumber.from(10).pow(18).mul(3));

          // createOSP use weth
          const osp2Params = {
            base: {
              name: getOspName(2),
              symbol: getOspSymbol(2),
              projectId: getOspProjectId(2),
              stars: 2,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(1),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2),
            signature: ""
          }
          osp2Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp2Params.base, osp2Params.deadline, osp2Params.buyNFTTokenAmountMax, osp2Params.buyNFTFindAmount, osp2Params.tokenToFindOutPath, userWallet2.address]
            )))
          );
          await wethContract.connect(deployWallet).transfer(userWallet2.address, osp2Params.buyNFTTokenAmountMax);
          await wethContract.connect(userWallet2).approve(factoryContract.address, osp2Params.buyNFTTokenAmountMax);
          await factoryContract.connect(userWallet2).createOSP(osp2Params);

          const earnFind3 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind3.sub(earnFind2))
          expect(earnFind3.sub(earnFind2)).eq(BigNumber.from(10).pow(18).mul(3));

          // createOSP use usdt
          const osp3Params = {
            base: {
              name: getOspName(3),
              symbol: getOspSymbol(3),
              projectId: getOspProjectId(3),
              stars: 3,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(6).mul(30),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2) +
              "00" +
              FeeAmount.HIGH.toString(16) +
              usdtContract.address.slice(2),
            signature: ""
          }
          osp3Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp3Params.base, osp3Params.deadline, osp3Params.buyNFTTokenAmountMax, osp3Params.buyNFTFindAmount, osp3Params.tokenToFindOutPath, userWallet3.address]
            )))
          );
          await usdtContract.connect(deployWallet).transfer(userWallet3.address, osp3Params.buyNFTTokenAmountMax);
          await usdtContract.connect(userWallet3).approve(factoryContract.address, osp3Params.buyNFTTokenAmountMax);
          await factoryContract.connect(userWallet3).createOSP(osp3Params);

          const earnFind4 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind4.sub(earnFind3))
          expect(earnFind4.sub(earnFind3)).eq(BigNumber.from(10).pow(18).mul(3));

          // createOSP use matic
          const osp4Params = {
            base: {
              name: getOspName(4),
              symbol: getOspSymbol(4),
              projectId: getOspProjectId(4),
              stars: 4,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(30),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2) +
              "00" +
              FeeAmount.HIGH.toString(16) +
              wmatic.address.slice(2),
            signature: ""
          }
          osp4Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp4Params.base, osp4Params.deadline, osp4Params.buyNFTTokenAmountMax, osp4Params.buyNFTFindAmount, osp4Params.tokenToFindOutPath, userWallet4.address]
            )))
          );
          await factoryContract.connect(userWallet4).createOSP(osp4Params, {value: osp4Params.buyNFTTokenAmountMax});

          const earnFind5 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind5.sub(earnFind4))
          expect(earnFind5.sub(earnFind4)).eq(BigNumber.from(10).pow(18).mul(3));

          // createOSPAndMultiplySS use find
          const osp5Params = {
            base: {
              name: getOspName(5),
              symbol: getOspSymbol(5),
              projectId: getOspProjectId(5),
              stars: 5,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(3),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: findContract.address,
            signature: ""
          }
          osp5Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp5Params.base, osp5Params.deadline, osp5Params.buyNFTTokenAmountMax,osp5Params.buyNFTFindAmount,osp5Params.tokenToFindOutPath, userWallet5.address]
            )))
          );
          const osp5AllFindAmount = BigNumber.from(10).pow(18).mul(100);
          const osp5AmountPayMax = BigNumber.from(10).pow(18).mul(100);
          await findContract.connect(deployWallet).transfer(userWallet5.address, osp5Params.buyNFTTokenAmountMax.add(osp5AmountPayMax));
          await findContract.connect(userWallet5).approve(factoryContract.address, osp5Params.buyNFTTokenAmountMax.add(osp5AmountPayMax));

          await expect(
            factoryContract.connect(deployWallet).createOSPAndMultiply(osp5Params, osp5AllFindAmount, osp5AmountPayMax)
          ).revertedWith("SE2");

          await factoryContract.connect(userWallet5).createOSPAndMultiply(osp5Params, osp5AllFindAmount, osp5AmountPayMax);

          const earnFind6 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind6.sub(earnFind5))
          expect(earnFind6.sub(earnFind5)).eq(BigNumber.from("3495000000000000000"));

          // createOSPAndMultiply use weth
          const osp6Params = {
            base: {
              name: getOspName(6),
              symbol: getOspSymbol(6),
              projectId: getOspProjectId(6),
              stars: 6,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(1),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2),
            signature: ""
          }
          osp6Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp6Params.base, osp6Params.deadline, osp6Params.buyNFTTokenAmountMax,osp6Params.buyNFTFindAmount,osp6Params.tokenToFindOutPath, userWallet6.address]
            )))
          );
          const osp6AllFindAmount = BigNumber.from(10).pow(18).mul(2);
          const osp6AmountPayMax = BigNumber.from(10).pow(18).mul(2);
          await wethContract.connect(deployWallet).transfer(userWallet6.address, osp6Params.buyNFTTokenAmountMax.add(osp6AmountPayMax));
          await wethContract.connect(userWallet6).approve(factoryContract.address, osp6Params.buyNFTTokenAmountMax.add(osp6AmountPayMax));
          await factoryContract.connect(userWallet6).createOSPAndMultiply(osp6Params, osp6AllFindAmount, osp6AmountPayMax);

          const earnFind7 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind7.sub(earnFind6))
          expect(earnFind7.sub(earnFind6)).eq(BigNumber.from("3009900000000000000"));

          // createOSPAndMultiply use usdt
          const osp7Params = {
            base: {
              name: getOspName(7),
              symbol: getOspSymbol(7),
              projectId: getOspProjectId(7),
              stars: 7,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(6).mul(30),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2) +
              "00" +
              FeeAmount.HIGH.toString(16) +
              usdtContract.address.slice(2),
            signature: ""
          }
          osp7Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp7Params.base, osp7Params.deadline, osp7Params.buyNFTTokenAmountMax,osp7Params.buyNFTFindAmount,osp7Params.tokenToFindOutPath, userWallet7.address]
            )))
          );
          const osp7AllFindAmount = BigNumber.from(10).pow(18).mul(2);
          const osp7AmountPayMax = BigNumber.from(10).pow(6).mul(2);
          await usdtContract.connect(deployWallet).transfer(userWallet7.address, osp7Params.buyNFTTokenAmountMax.add(osp7AmountPayMax));
          await usdtContract.connect(userWallet7).approve(factoryContract.address, osp7Params.buyNFTTokenAmountMax.add(osp7AmountPayMax));
          await factoryContract.connect(userWallet7).createOSPAndMultiply(osp7Params, osp7AllFindAmount, osp7AmountPayMax);

          const earnFind8 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind8.sub(earnFind7))
          expect(earnFind8.sub(earnFind7)).eq(BigNumber.from("3009900000000000000"));

          // createOSPAndMultiply use matic
          const osp8Params = {
            base: {
              name: getOspName(8),
              symbol: getOspSymbol(8),
              projectId: getOspProjectId(8),
              stars: 8,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(30),
            buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
            tokenToFindOutPath: "0x" +
              findContract.address.slice(2) +
              "0000" +
              FeeAmount.LOWEST.toString(16) +
              wethContract.address.slice(2) +
              "00" +
              FeeAmount.HIGH.toString(16) +
              wmatic.address.slice(2),
            signature: ""
          }
          osp8Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", 
                "uint256", 
                "uint256",
                "uint256",
                "bytes",
                "address",
              ],
              [osp8Params.base, osp8Params.deadline, osp8Params.buyNFTTokenAmountMax,osp8Params.buyNFTFindAmount,osp8Params.tokenToFindOutPath, userWallet8.address]
            )))
          );
          const osp8AllFindAmount = BigNumber.from(10).pow(18).mul(2);
          const osp8AmountPayMax = BigNumber.from(10).pow(18).mul(2);
          await factoryContract.connect(userWallet8).createOSPAndMultiply(osp8Params, osp8AllFindAmount, osp8AmountPayMax, {value: osp8Params.buyNFTTokenAmountMax.add(osp8AmountPayMax)});

          const earnFind9 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind9.sub(earnFind8))
          expect(earnFind9.sub(earnFind8)).eq(BigNumber.from("3009900000000000000"));

          // createOSPByProjectOwner
          const osp9Params = {
            base: {
              name: getOspName(9),
              symbol: getOspSymbol(9),
              projectId: getOspProjectId(9),
              stars: 9,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
      
          osp9Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [osp9Params.base, osp9Params.deadline, userWallet9.address]
            )))
          );

          await expect(
            factoryContract.connect(deployWallet).createOSPByProjectOwner(osp9Params)
          ).revertedWith("SE2");

          await factoryContract.connect(userWallet9).createOSPByProjectOwner(osp9Params)

          const earnFind10 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind10.sub(earnFind9))
          expect(earnFind10.sub(earnFind9)).eq(0);

          // createOSPByProjectOwnerAndMultiply use find
          const osp10Params = {
            base: {
              name: getOspName(10),
              symbol: getOspSymbol(10),
              projectId: getOspProjectId(10),
              stars: 10,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
          const osp10TokenToFindOutPath = findContract.address;
          const osp10AllFindAmount = BigNumber.from(10).pow(18).mul(100);
          const osp10AmountPayMax = BigNumber.from(10).pow(18).mul(100);
      
          osp10Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [osp10Params.base, osp10Params.deadline, userWallet10.address]
            )))
          );
          await findContract.connect(deployWallet).transfer(userWallet10.address, osp10AmountPayMax);
          await findContract.connect(userWallet10).approve(factoryContract.address, osp10AmountPayMax);
      
          await expect(
            factoryContract.connect(deployWallet).createOSPByProjectOwnerAndMultiply(osp10Params, osp10TokenToFindOutPath, osp10AllFindAmount, osp10AmountPayMax)
          ).revertedWith("SE2");

          await factoryContract.connect(userWallet10).createOSPByProjectOwnerAndMultiply(osp10Params, osp10TokenToFindOutPath, osp10AllFindAmount, osp10AmountPayMax);
      
          const earnFind11 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind11.sub(earnFind10))
          expect(earnFind11.sub(earnFind10)).eq(BigNumber.from("495000000000000000"));

          // createOSPByProjectOwnerAndMultiply use weth
          const osp11Params = {
            base: {
              name: getOspName(11),
              symbol: getOspSymbol(11),
              projectId: getOspProjectId(11),
              stars: 11,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
          const osp11TokenToFindOutPath = "0x" +
            findContract.address.slice(2) +
            "0000" +
            FeeAmount.LOWEST.toString(16) +
            wethContract.address.slice(2);
          const osp11AllFindAmount = BigNumber.from(10).pow(18).mul(1);
          const osp11AmountPayMax = BigNumber.from(10).pow(18).mul(1);
      
          osp11Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [osp11Params.base, osp11Params.deadline, userWallet11.address]
            )))
          );
          await wethContract.connect(deployWallet).transfer(userWallet11.address, osp11AmountPayMax);
          await wethContract.connect(userWallet11).approve(factoryContract.address, osp11AmountPayMax);
          await factoryContract.connect(userWallet11).createOSPByProjectOwnerAndMultiply(osp11Params, osp11TokenToFindOutPath, osp11AllFindAmount, osp11AmountPayMax);
      
          const earnFind12 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind12.sub(earnFind11))
          expect(earnFind12.sub(earnFind11)).eq(BigNumber.from("4950000000000000"));

          // createOSPByProjectOwnerAndMultiply use usdt
          const osp12Params = {
            base: {
              name: getOspName(12),
              symbol: getOspSymbol(12),
              projectId: getOspProjectId(12),
              stars: 12,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
          const osp12TokenToFindOutPath = "0x" +
            findContract.address.slice(2) +
            "0000" +
            FeeAmount.LOWEST.toString(16) +
            wethContract.address.slice(2) +
            "00" +
            FeeAmount.HIGH.toString(16) +
            usdtContract.address.slice(2);
          const osp12AllFindAmount = BigNumber.from(10).pow(18).mul(1000);
          const osp12AmountPayMax = BigNumber.from(10).pow(6).mul(1000);
      
          osp12Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [osp12Params.base, osp12Params.deadline, userWallet12.address]
            )))
          );
          await usdtContract.connect(deployWallet).transfer(userWallet12.address, osp12AmountPayMax);
          await usdtContract.connect(userWallet12).approve(factoryContract.address, osp12AmountPayMax);
          await factoryContract.connect(userWallet12).createOSPByProjectOwnerAndMultiply(osp12Params, osp12TokenToFindOutPath, osp12AllFindAmount, osp12AmountPayMax);
      
          const earnFind13 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind13.sub(earnFind12))
          expect(earnFind13.sub(earnFind12)).eq(BigNumber.from("4950000000000000000"));

          // createOSPByProjectOwnerAndMultiply use matic
          const osp13Params = {
            base: {
              name: getOspName(13),
              symbol: getOspSymbol(13),
              projectId: getOspProjectId(13),
              stars: 13,
              poolConfigIndex: 0,
              nftPercentConfigIndex: 0
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
          const osp13TokenToFindOutPath = "0x" +
            findContract.address.slice(2) +
            "0000" +
            FeeAmount.LOWEST.toString(16) +
            wethContract.address.slice(2) +
            "00" +
            FeeAmount.HIGH.toString(16) +
            wmatic.address.slice(2);
          const osp13AllFindAmount = BigNumber.from(10).pow(18).mul(1000);
          const osp13AmountPayMax = BigNumber.from(10).pow(18).mul(1000);
      
          osp13Params.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [osp13Params.base, osp13Params.deadline, userWallet13.address]
            )))
          );
          await factoryContract.connect(userWallet13).createOSPByProjectOwnerAndMultiply(osp13Params, osp13TokenToFindOutPath, osp13AllFindAmount, osp13AmountPayMax, {value: osp13AmountPayMax});
      
          const earnFind14 = await findContract.balanceOf(earnContract.address);
          console.log(earnFind14.sub(earnFind13))
          expect(earnFind14.sub(earnFind13)).eq(BigNumber.from("4950000000000000000"));

          expect(await factoryContract.signatureAddress()).eq(signatureWallet.address);
          await factoryContract.connect(deployWallet).setSignatureAddress(newSignature.address);
          expect(await factoryContract.signatureAddress()).eq(newSignature.address);

          // createOSPByProjectOwner
          const ospOtherConfigParams = {
            base: {
              name: getOspName(14),
              symbol: getOspSymbol(14),
              projectId: getOspProjectId(14),
              stars: 14,
              poolConfigIndex: 1,
              nftPercentConfigIndex: 1
            },
            deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
            signature: ""
          }
      
          ospOtherConfigParams.signature = await signatureWallet.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [ospOtherConfigParams.base, ospOtherConfigParams.deadline, userWalletOtherConfig.address]
            )))
          );
          await expect(
            factoryContract.connect(userWalletOtherConfig).createOSPByProjectOwner(ospOtherConfigParams)
          ).revertedWith("SE")

          ospOtherConfigParams.signature = await newSignature.signMessage(
            ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
              ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
              [ospOtherConfigParams.base, ospOtherConfigParams.deadline, userWalletOtherConfig.address]
            )))
          );
          await factoryContract.connect(userWalletOtherConfig).createOSPByProjectOwner(ospOtherConfigParams)

        });

        for(let ospNumber=1; ospNumber<=13; ospNumber++){
          describe(`osp${ospNumber} ospinfo`, function(){
            it("nft info", async function () {
              const number = ospNumber;
              const osp = await factoryContract.projectId2OspToken(getOspProjectId(number));
              const token2OspInfo = await factoryContract.token2OspInfo(osp);
              expect(token2OspInfo.cnftTokenId).eq(token2OspInfo[3]).eq(number*2);
              expect(token2OspInfo.onftTokenId).eq(token2OspInfo[4]).eq(number*2+1);
              
              expect(await findnftContract.ownerOf(token2OspInfo.cnftTokenId)).eq(userWallets[number-1].address);
              expect(await findnftContract.ownerOf(token2OspInfo.onftTokenId)).eq(earnContract.address);
              
              const cinfo = await findnftContract.tokenId2Info(token2OspInfo.cnftTokenId);
              const oinfo = await findnftContract.tokenId2Info(token2OspInfo.onftTokenId);

              expect(cinfo.name).eq(cinfo[0]).eq(getOspName(number))
              expect(cinfo.symbol).eq(cinfo[1]).eq(getOspSymbol(number))
              expect(cinfo.projectId).eq(cinfo[2]).eq(getOspProjectId(number))
              expect(cinfo.stars).eq(cinfo[3]).eq(number)
              expect(cinfo.token).eq(cinfo[4]).eq(osp)
              expect(cinfo.percent).eq(cinfo[5]).eq(500)
              expect(cinfo.isCnft).eq(cinfo[6]).eq(true)
              expect(cinfo.tokenId).eq(cinfo[7]).eq(token2OspInfo.cnftTokenId)

              expect(oinfo.name).eq(oinfo[0]).eq(getOspName(number))
              expect(oinfo.symbol).eq(oinfo[1]).eq(getOspSymbol(number))
              expect(oinfo.projectId).eq(oinfo[2]).eq(getOspProjectId(number))
              expect(oinfo.stars).eq(oinfo[3]).eq(number)
              expect(oinfo.token).eq(oinfo[4]).eq(osp)
              expect(oinfo.percent).eq(oinfo[5]).eq(9500)
              expect(oinfo.isCnft).eq(oinfo[6]).eq(false)
              expect(oinfo.tokenId).eq(oinfo[7]).eq(token2OspInfo.onftTokenId)

              expect(await findnftContract.isClaimed(token2OspInfo.cnftTokenId)).eq(false);
              expect(await findnftContract.isClaimed(token2OspInfo.onftTokenId)).eq(false);
            })

            it("projectId2OspToken token2OspInfo pool2OspPoolInfo ospLpTokenIdList initLpPositions", async function () {
              const number = ospNumber;
              const osp = await factoryContract.projectId2OspToken(getOspProjectId(number));
              const token2OspInfo = await factoryContract.token2OspInfo(osp);
  
              expect(token2OspInfo.poolConfigIndex).eq(token2OspInfo[0]).eq(0);
              expect(token2OspInfo.stars).eq(token2OspInfo[1]).eq(number);
              expect(token2OspInfo.pool).eq(token2OspInfo[2]).not.eq(ZERO_ADDRESS);
              expect(token2OspInfo.cnftTokenId).eq(token2OspInfo[3]).eq(number*2);
              expect(token2OspInfo.onftTokenId).eq(token2OspInfo[4]).eq(number*2+1);
              expect(token2OspInfo.projectId).eq(token2OspInfo[5]).eq(getOspProjectId(number));

              const ospPool = (await ethers.getContractAt(
                "IUniswapV3Pool",
                token2OspInfo.pool
              )) as IUniswapV3Pool;

              if((await ospPool.token0()) == findContract.address) {
                console.log(`find < osp${number}`)
                expect(await ospPool.token1()).eq(osp);
  
              } else {
                console.log(`osp${number} < find`)
  
                expect(await ospPool.token0()).eq(osp);
                expect(await ospPool.token1()).eq(findContract.address);
  
              }
  
              const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(osp);
              expect(ospLpTokenIdList.length).eq(7);
              for (let index=0; index<ospLpTokenIdList.length; index++) {
                const tokenid = ospLpTokenIdList[index]
                expect(tokenid).eq(96837 + (number-1)*7 + index);
  
                let position = await nonfungiblePositionManager.positions(tokenid)

                if((await ospPool.token0()) == findContract.address) {
                  console.log(`find < osp${number}`)
  
                  expect(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[index].tickLower).eq(position.tickLower);
                  expect(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[index].tickUpper).eq(position.tickUpper);
   
                } else {
                  console.log(`osp${number} < find`)
  
                  expect(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[index].tickLower).eq(position.tickLower);
                  expect(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[index].tickUpper).eq(position.tickUpper);

                }
  
              }
            });
            
            it("ifactory token2OspInfo pool2OspPoolInfo ospLpTokenIdList initLpPositions", async function () {
              const number = ospNumber;
  
              const ifactory = (await ethers.getContractAt(
                "IFactory",
                factoryContract.address
              )) as IFactory;
  
              const osp = await factoryContract.projectId2OspToken(getOspProjectId(number));
  
              const token2OspInfo = await factoryContract.token2OspInfo(osp);
              const itoken2OspInfo = await ifactory.token2OspInfo(osp);
  
              expect(token2OspInfo.poolConfigIndex).eq(token2OspInfo[0]).eq(itoken2OspInfo.poolConfigIndex).eq(itoken2OspInfo[0])
              expect(token2OspInfo.stars).eq(token2OspInfo[1]).eq(itoken2OspInfo.stars).eq(itoken2OspInfo[1])
              expect(token2OspInfo.pool).eq(token2OspInfo[2]).eq(itoken2OspInfo.pool).eq(itoken2OspInfo[2])
              expect(token2OspInfo.cnftTokenId).eq(token2OspInfo[3]).eq(itoken2OspInfo.cnftTokenId).eq(itoken2OspInfo[3])
              expect(token2OspInfo.onftTokenId).eq(token2OspInfo[4]).eq(itoken2OspInfo.onftTokenId).eq(itoken2OspInfo[4])
              expect(token2OspInfo.projectId).eq(token2OspInfo[5]).eq(itoken2OspInfo.projectId).eq(itoken2OspInfo[5])

              const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(osp);
              const iospLpTokenIdList = await ifactory.ospLpTokenIdList(osp);
  
              expect(ospLpTokenIdList.length).eq(7);
              expect(iospLpTokenIdList.length).eq(7);
              for (let index=0; index<ospLpTokenIdList.length; index++) {
                expect(ospLpTokenIdList[index]).eq(iospLpTokenIdList[index]);
              }
            });
  
  
  
          });
        }

        it("osp1 balanceOf", async function () {
          expect(await findContract.balanceOf(userWallet1.address)).eq(0);

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(1));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          expect(await osp.balanceOf(userWallet1.address)).eq(0)
        })

        it("osp2 balanceOf", async function () {
          expect(await wethContract.balanceOf(userWallet2.address)).eq(BigNumber.from("996999997986828447"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(2));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          expect(await osp.balanceOf(userWallet2.address)).eq(0)
        })

        it("osp3 balanceOf", async function () {
          expect(await usdtContract.balanceOf(userWallet3.address)).eq(BigNumber.from("26895153"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(3));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          expect(await osp.balanceOf(userWallet3.address)).eq(0)
        })

        it("osp4 balanceOf", async function () {
          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(4));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          expect(await osp.balanceOf(userWallet4.address)).eq(0)
          const cha = BigNumber.from(10).pow(18 + 8).sub(await userWallet4.getBalance());
          expect(cha).gt(BigNumber.from("1531000000000000000"));
          expect(cha).lt(BigNumber.from("1533000000000000000"));
        })

        it("osp5 balanceOf", async function () {
          expect(await findContract.balanceOf(userWallet5.address)).eq(BigNumber.from("98505000000000000000"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(5));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet5.address);
          expect(val).eq(0);
        })

        it("osp6 balanceOf", async function () {
          expect(await wethContract.balanceOf(userWallet6.address)).eq(BigNumber.from("2996970097966763281"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(6));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet6.address);
          expect(val).eq(0);
        })

        it("osp7 balanceOf", async function () {
          expect(await usdtContract.balanceOf(userWallet7.address)).eq(BigNumber.from("28864207"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(7));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet7.address);
          expect(val).eq(0);
        })

        it("osp8 balanceOf", async function () {
          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(8));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet8.address);
          console.log("val osp8", val);
          
          const cha = BigNumber.from(10).pow(18 + 8).sub(await userWallet8.getBalance());
          console.log("val osp8 2", cha);
        })

        it("osp9 balanceOf", async function () {
          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(9));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet9.address);
          expect(val).eq(0);
        })

        it("osp10 balanceOf", async function () {
          expect(await findContract.balanceOf(userWallet10.address)).eq(BigNumber.from("98505000000000000000"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(10));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet10.address);
          expect(val).eq(0);
        })

        it("osp11 balanceOf", async function () {
          expect(await wethContract.balanceOf(userWallet11.address)).eq(BigNumber.from("999985049989967017"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(11));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet11.address);
          expect(val).eq(0);
        })

        it("osp12 balanceOf", async function () {
          expect(await usdtContract.balanceOf(userWallet12.address)).eq(BigNumber.from("984527518"));

          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(12));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet12.address);
          console.log(val.toString())
          expect(val).eq(0);
        })

        it("osp13 balanceOf", async function () {
          const ospAddress = await factoryContract.projectId2OspToken(getOspProjectId(13));
          const osp = (await ethers.getContractAt("OSP", ospAddress)) as OSP;
          const val = await osp.balanceOf(userWallet13.address);
          console.log("osp13 balanceOf", val.toString())

          const cha = BigNumber.from(10).pow(18 + 8).sub(await userWallet13.getBalance());
          console.log("osp13 balanceOf 2", cha.toString())
        })

        describe(`osp change config ospinfo`, function(){
        
          it("projectId2OspToken token2OspInfo pool2OspPoolInfo ospLpTokenIdList initLpPositions", async function () {
            const number = 14;
            const osp = await factoryContract.projectId2OspToken(getOspProjectId(number));
            const token2OspInfo = await factoryContract.token2OspInfo(osp);

            expect(token2OspInfo.poolConfigIndex).eq(token2OspInfo[0]).eq(1);
            expect(token2OspInfo.stars).eq(token2OspInfo[1]).eq(number);
            expect(token2OspInfo.pool).eq(token2OspInfo[2]).not.eq(ZERO_ADDRESS);
            expect(token2OspInfo.cnftTokenId).eq(token2OspInfo[3]).eq(number*2);
            expect(token2OspInfo.onftTokenId).eq(token2OspInfo[4]).eq(number*2+1);
            expect(token2OspInfo.projectId).eq(token2OspInfo[5]).eq(getOspProjectId(number));

            const ospPool = (await ethers.getContractAt(
              "IUniswapV3Pool",
              token2OspInfo.pool
            )) as IUniswapV3Pool;
            
            if((await ospPool.token0()) == findContract.address) {
              console.log(`find < osp${number}`)
              expect(await ospPool.token1()).eq(osp);
            } else {
              console.log(`osp${number} < find`)

              expect(await ospPool.token0()).eq(osp);
              expect(await ospPool.token1()).eq(findContract.address);
            }

            const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(osp);
            expect(ospLpTokenIdList.length).eq(1);

            const tokenid = ospLpTokenIdList[0]
            expect(tokenid).eq(96837 + (number-1)*7);

            let position = await nonfungiblePositionManager.positions(tokenid)

            if((await ospPool.token0()) == findContract.address) {
              console.log(`find < osp${number}`)

              expect(DEFAULT_OSP_POOL_CONFIG_1.findOspPool.positions[0].tickLower).eq(position.tickLower);
              expect(DEFAULT_OSP_POOL_CONFIG_1.findOspPool.positions[0].tickUpper).eq(position.tickUpper);
    
            } else {
              console.log(`osp${number} < find`)

              expect(DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.positions[0].tickLower).eq(position.tickLower);
              expect(DEFAULT_OSP_POOL_CONFIG_1.ospFindPool.positions[0].tickUpper).eq(position.tickUpper);

            }

          });
          
          it("ifactory token2OspInfo pool2OspPoolInfo ospLpTokenIdList initLpPositions", async function () {
            const ifactory = (await ethers.getContractAt(
              "IFactory",
              factoryContract.address
            )) as IFactory;

            const osp = await factoryContract.projectId2OspToken(getOspProjectId(14));

            const token2OspInfo = await factoryContract.token2OspInfo(osp);
            const itoken2OspInfo = await ifactory.token2OspInfo(osp);

            expect(token2OspInfo.poolConfigIndex).eq(token2OspInfo[0]).eq(itoken2OspInfo.poolConfigIndex).eq(itoken2OspInfo[0])
            expect(token2OspInfo.stars).eq(token2OspInfo[1]).eq(itoken2OspInfo.stars).eq(itoken2OspInfo[1])
            expect(token2OspInfo.pool).eq(token2OspInfo[2]).eq(itoken2OspInfo.pool).eq(itoken2OspInfo[2])
            expect(token2OspInfo.cnftTokenId).eq(token2OspInfo[3]).eq(itoken2OspInfo.cnftTokenId).eq(itoken2OspInfo[3])
            expect(token2OspInfo.onftTokenId).eq(token2OspInfo[4]).eq(itoken2OspInfo.onftTokenId).eq(itoken2OspInfo[4])
            expect(token2OspInfo.projectId).eq(token2OspInfo[5]).eq(itoken2OspInfo.projectId).eq(itoken2OspInfo[5])

            const ospLpTokenIdList = await factoryContract.ospLpTokenIdList(osp);
            const iospLpTokenIdList = await ifactory.ospLpTokenIdList(osp);

            expect(ospLpTokenIdList.length).eq(1);
            expect(iospLpTokenIdList.length).eq(1);
            for (let index=0; index<ospLpTokenIdList.length; index++) {
              expect(ospLpTokenIdList[index]).eq(iospLpTokenIdList[index]);
            }
          });
        })

      });
    });

  });
});
