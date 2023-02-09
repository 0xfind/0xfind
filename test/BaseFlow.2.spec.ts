import { expect } from "chai";
import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import { FeeAmount } from "@uniswap/v3-sdk";

import {
  Find,
  Factory,
  Earn,
  Math,
  Mortgage,
  IUniswapV3Pool,
  IFactory,
  FindNFT,
  INonfungiblePositionManager,
  IERC20,
  ISwapRouter02
} from "../typechain";

import {
  deployAllContractWethFind,
  DEFAULT_OSP_POOL_CONFIG_0,
  DEFAULT_OSP_POOL_CONFIG_1,
  ZERO_ADDRESS,
  UNISWAP_V3_POSITIONS,
  UNISWAP_ROUTER,
} from "./share/utils";

describe("BaseFlow.2", function () {
  it("base", async function () {
    const wallets = await ethers.getSigners();
    const deployWallet = wallets[0];
    const signatureWallet = wallets[1];
    const cnftOwnerWallet = wallets[2];
    const onftOwnerWallet = wallets[3];

    const userValWallet = wallets[4];


    const swapRouter = (await ethers.getContractAt(
      "ISwapRouter02", UNISWAP_ROUTER
    )) as ISwapRouter02;
    const nonfungiblePositionManager = (await ethers.getContractAt(
      "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
    )) as INonfungiblePositionManager;
    const wmatic = (await ethers.getContractAt(
      "IERC20",
      await nonfungiblePositionManager.WETH9()
    )) as IERC20;

    const allInfo = await deployAllContractWethFind();

    // weth
    const weth = allInfo.wethContract;
    // find
    const find = allInfo.findContract;
    // factory
    const factory = allInfo.factoryContract;
    // earn
    const earn = allInfo.earnContract;
    // findnft
    const findnft = allInfo.findnftContract;
    // math
    const math = allInfo.mathContract;
    // mortgage
    const mortgage = allInfo.mortgageContract;
    // init
    await find.connect(deployWallet).transfer(
      factory.address, await find.totalSupply()
    );
    const ifactory = (await ethers.getContractAt(
      "IFactory",
      factory.address
    )) as IFactory;

    // mortgage setMortgageFee
    expect(await mortgage.mortgageFee()).eq(5000);
    await mortgage.setMortgageFee(4000);
    expect(await mortgage.mortgageFee()).eq(4000);
    await mortgage.setMortgageFee(5000);
    expect(await mortgage.mortgageFee()).eq(5000);

    // add nftPercentConfig
    const nftPercentConfig0 = {
      cnft: 500,
      onft: 9500
    }
    await factory.addNFTPercentConfig(nftPercentConfig0.cnft, nftPercentConfig0.onft);
    const nftPercentConfig0read = await factory.nftPercentConfigs(0);
    expect(nftPercentConfig0read.cnft).eq(nftPercentConfig0.cnft);
    expect(nftPercentConfig0read.onft).eq(nftPercentConfig0.onft);

    // show find info
    let findInfo = await factory.findInfo();
    let ifindInfo = await ifactory.findInfo();
    let lpTokenIdList = await factory.findLpTokenIdList();
    let ilpTokenIdList = await ifactory.findLpTokenIdList();
    expect(findInfo.token).eq(ifindInfo.token);
    expect(findInfo.pool).eq(ifindInfo.pool);
    expect(findInfo.fee).eq(ifindInfo.fee);
    expect(findInfo.cnftTokenId).eq(ifindInfo.cnftTokenId);
    expect(findInfo.onftTokenId).eq(ifindInfo.onftTokenId);
    expect(lpTokenIdList.length).to.eq(ilpTokenIdList.length);
    expect(findInfo.token).eq(find.address);
    expect(findInfo.pool).eq(ZERO_ADDRESS);
    expect(findInfo.fee).eq(100);
    expect(findInfo.cnftTokenId).eq(0);
    expect(findInfo.onftTokenId).eq(0);
    expect(lpTokenIdList.length).eq(0);

    // create find pool
    await factory
      .connect(deployWallet)
      .createFindUniswapPool();
    // show find info
    findInfo = await factory.findInfo();
    findInfo = await factory.findInfo();
    ifindInfo = await ifactory.findInfo();
    lpTokenIdList = await factory.findLpTokenIdList();
    ilpTokenIdList = await ifactory.findLpTokenIdList();
    expect(findInfo.token).eq(ifindInfo.token);
    expect(findInfo.pool).eq(ifindInfo.pool);
    expect(findInfo.fee).eq(ifindInfo.fee);
    expect(findInfo.cnftTokenId).eq(ifindInfo.cnftTokenId);
    expect(findInfo.onftTokenId).eq(ifindInfo.onftTokenId);
    expect(lpTokenIdList.length).to.eq(ilpTokenIdList.length);
    expect(lpTokenIdList[0]).to.eq(ilpTokenIdList[0]);
    expect(findInfo.token).eq(find.address);
    expect(findInfo.pool).not.eq(ZERO_ADDRESS);
    expect(findInfo.fee).eq(100);
    expect(findInfo.cnftTokenId).eq(0);
    expect(findInfo.onftTokenId).eq(1);
    expect(lpTokenIdList.length).eq(1);
    expect(lpTokenIdList[0]).eq(96818);
    expect(await findnft.ownerOf(0)).eq(await factory.owner());
    expect(await findnft.ownerOf(1)).eq(await factory.owner());
    const findPool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      findInfo.pool
    )) as IUniswapV3Pool;
    expect(await findPool.fee()).eq(findInfo.fee);
    if (weth.address < find.address) {
      expect(await findPool.token0()).eq(weth.address);
      expect(await findPool.token1()).eq(find.address);
    } else {
      expect(await findPool.token0()).eq(find.address);
      expect(await findPool.token1()).eq(weth.address);
    }
    // cnft transferFrom to cnftOwnerWallet
    expect(await findnft.ownerOf(0)).eq(deployWallet.address);
    await findnft.connect(deployWallet).transferFrom(deployWallet.address, cnftOwnerWallet.address, 0);
    expect(await findnft.ownerOf(0)).eq(cnftOwnerWallet.address);

    // onft transferFrom to onftOwnerWallet
    expect(await findnft.ownerOf(1)).eq(deployWallet.address);
    await findnft.connect(deployWallet).transferFrom(deployWallet.address, onftOwnerWallet.address, 1);
    expect(await findnft.ownerOf(1)).eq(onftOwnerWallet.address);

    // add osp config
    expect(await factory.ospPoolConfigsCount()).eq(0);
    await factory.connect(deployWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);
    const config0read = await factory.getOspPoolConfigs(0);
    expect(await factory.ospPoolConfigsCount()).eq(1);
    expect(config0read.fee).eq(DEFAULT_OSP_POOL_CONFIG_0.fee);
    
    expect(config0read.ospFindPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.initSqrtPriceX96);
    expect(config0read.findOspPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_0.findOspPool.initSqrtPriceX96);

    expect(config0read.ospFindPoolPositions.length).eq(7);
    expect(config0read.ospFindPoolPositions.length).eq(
      DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions.length
    );
    expect(config0read.ospFindPoolPositions[0].tickLower).eq(
      DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[0].tickLower
    );
    expect(config0read.ospFindPoolPositions[0].tickUpper).eq(
      DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[0].tickUpper
    );
    expect(config0read.ospFindPoolPositions[0].amount).eq(
      DEFAULT_OSP_POOL_CONFIG_0.ospFindPool.positions[0].amount
    );

    expect(config0read.findOspPoolPositions.length).eq(7);
    expect(config0read.findOspPoolPositions.length).eq(
      DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions.length
    );
    expect(config0read.findOspPoolPositions[0].tickLower).eq(
      DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[0].tickLower
    );
    expect(config0read.findOspPoolPositions[0].tickUpper).eq(
      DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[0].tickUpper
    );
    expect(config0read.findOspPoolPositions[0].amount).eq(
      DEFAULT_OSP_POOL_CONFIG_0.findOspPool.positions[0].amount
    );

    // create osp1
    const osp1Params = {
      base: {
        name: "github.com/haha/1",
        symbol: "0xHAHA1",
        projectId: "github.com/1/1",
        stars: 20,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0
      },
      deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
      signature: ""
    }

    osp1Params.signature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
        [osp1Params.base, osp1Params.deadline, userValWallet.address]
      )))
    );
    const osp1TokenFindPath =
      "0x" +
      find.address.slice(2) +
      "0000" +
      FeeAmount.LOWEST.toString(16) +
      weth.address.slice(2);
    const osp1AllFindAmount = BigNumber.from(10).pow(18).mul(300);
    const os1AmountPayMax = BigNumber.from(10).pow(18).mul(1);

    await weth.connect(deployWallet).transfer(
      userValWallet.address,
      os1AmountPayMax
    );
    await weth.connect(userValWallet).approve(factory.address, os1AmountPayMax)

    const weth1 = await weth.balanceOf(userValWallet.address);
    await factory.connect(userValWallet).createOSPByProjectOwnerAndMultiply(
      osp1Params,
      osp1TokenFindPath,
      osp1AllFindAmount,
      os1AmountPayMax
    );
    const weth2 = await weth.balanceOf(userValWallet.address);

    expect(weth1.sub(weth2)).eq(BigNumber.from("4485003009243097"))

    // claimOSPOwnerNFT osp1
    const osp1 = (await ethers.getContractAt(
      "IERC20",
      await factory.projectId2OspToken(osp1Params.base.projectId)
    )) as IERC20;

    const osp1ClaimSignature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [osp1.address, userValWallet.address]
      )))
    );
    
    expect(await findnft.ownerOf(2)).eq(userValWallet.address)
    expect(await findnft.ownerOf(3)).eq(earn.address)
    const osp1Info = await factory.token2OspInfo(osp1.address);
    expect(await findnft.isClaimed(osp1Info.cnftTokenId)).eq(false);
    expect(await findnft.isClaimed(osp1Info.onftTokenId)).eq(false);
    await earn.connect(deployWallet).claimOSPOwnerNFT(osp1.address, userValWallet.address, osp1ClaimSignature);
    expect(await findnft.isClaimed(osp1Info.cnftTokenId)).eq(true);
    expect(await findnft.isClaimed(osp1Info.onftTokenId)).eq(true);
    expect(await findnft.ownerOf(2)).eq(userValWallet.address)
    expect(await findnft.ownerOf(3)).eq(userValWallet.address)
    
    await findnft.connect(userValWallet).transferFrom(
      userValWallet.address,
      cnftOwnerWallet.address,
      2
    );
    await findnft.connect(userValWallet).transferFrom(
      userValWallet.address,
      onftOwnerWallet.address,
      3
    );
    expect(await findnft.ownerOf(2)).eq(cnftOwnerWallet.address)
    expect(await findnft.ownerOf(3)).eq(onftOwnerWallet.address)
    
    // collect osp
    const cnftFind1 = await find.balanceOf(cnftOwnerWallet.address);
    const onftOsp1  = await osp1.balanceOf(onftOwnerWallet.address);
    await earn.collectOspUniswapLPFee(osp1.address);
    const cnftFind2 = await find.balanceOf(cnftOwnerWallet.address);
    const onftOsp2  = await osp1.balanceOf(onftOwnerWallet.address);

    expect(cnftFind1).eq(0);
    expect(onftOsp1).eq(0);
    expect(cnftFind2).eq(BigNumber.from("149999999999999999"))
    expect(onftOsp2).eq(BigNumber.from("2821263037514457299"))

    const onftFind1 = await find.balanceOf(onftOwnerWallet.address);
    await osp1.connect(onftOwnerWallet).approve(swapRouter.address, onftOsp2);
    await swapRouter.connect(onftOwnerWallet).exactInputSingle({
      tokenIn: osp1.address,
      tokenOut: find.address,
      fee: FeeAmount.HIGH,
      recipient: onftOwnerWallet.address,
      amountIn: onftOsp2,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const onftFind2 = await find.balanceOf(onftOwnerWallet.address);
    const onftWeth2 = await weth.balanceOf(onftOwnerWallet.address);

    expect(onftFind1).eq(0)
    expect(onftFind2).eq(BigNumber.from("2793285011090711811"))
    expect(onftWeth2).eq(0)

    await find.connect(onftOwnerWallet).approve(swapRouter.address, onftFind2);
    await swapRouter.connect(onftOwnerWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: weth.address,
      fee: FeeAmount.LOWEST,
      recipient: onftOwnerWallet.address,
      amountIn: onftFind2,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const onftWeth3 = await weth.balanceOf(onftOwnerWallet.address);
    const cnftWeth3 = await weth.balanceOf(cnftOwnerWallet.address);

    expect(onftWeth3).eq(BigNumber.from("2792728255820572"))
    expect(cnftWeth3).eq(0)

    await find.connect(cnftOwnerWallet).approve(swapRouter.address, cnftFind2);
    await swapRouter.connect(cnftOwnerWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: weth.address,
      fee: FeeAmount.LOWEST,
      recipient: cnftOwnerWallet.address,
      amountIn: cnftFind2,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const cnftWeth4 = await weth.balanceOf(cnftOwnerWallet.address);

    expect(cnftWeth4).eq(BigNumber.from("149970102122777"))

    // collectOspUniswapLPFee
    const cnftFind3 = await find.balanceOf(cnftOwnerWallet.address);
    const onftFind3 = await find.balanceOf(onftOwnerWallet.address);
    await earn.collectFindUniswapLPFee();
    await earn.collectForBuilder(weth.address);
    await earn.collectForBuilder(find.address);
    const cnftWeth5 = await weth.balanceOf(cnftOwnerWallet.address);
    const onftWeth5 = await weth.balanceOf(onftOwnerWallet.address);
    const cnftFind4 = await find.balanceOf(cnftOwnerWallet.address);
    const onftFind4 = await find.balanceOf(onftOwnerWallet.address);

    expect(cnftFind3).eq(0);
    expect(onftFind3).eq(0);

    expect(cnftWeth5).eq(BigNumber.from("149992527137823"))
    expect(onftWeth5).eq(BigNumber.from("2793154331106450"))
    expect(cnftFind4).eq(BigNumber.from("74264716425105567"))
    expect(onftFind4).eq(BigNumber.from("1411029612077005776"))

    await find.connect(cnftOwnerWallet).approve(swapRouter.address, cnftFind4);
    await swapRouter.connect(cnftOwnerWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: weth.address,
      fee: FeeAmount.LOWEST,
      recipient: cnftOwnerWallet.address,
      amountIn: cnftFind4,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await find.connect(onftOwnerWallet).approve(swapRouter.address, onftFind4);
    await swapRouter.connect(onftOwnerWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: weth.address,
      fee: FeeAmount.LOWEST,
      recipient: onftOwnerWallet.address,
      amountIn: onftFind4,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const cnftWeth6 = await weth.balanceOf(cnftOwnerWallet.address);
    const onftWeth6 = await weth.balanceOf(onftOwnerWallet.address);

    expect(cnftWeth6).eq(BigNumber.from("224242441180612"))
    expect(onftWeth6).eq(BigNumber.from("4203902697921853"))

    expect(cnftWeth6.add(onftWeth6)).eq(BigNumber.from("4428145139102465"))

  });
});
