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


const createWmaticPool = async (wethWallet: any, weth: any) => {
  const nonfungiblePositionManager = (await ethers.getContractAt(
    "INonfungiblePositionManager", UNISWAP_V3_POSITIONS
  )) as INonfungiblePositionManager;
  const wmatic = (await ethers.getContractAt(
    "IERC20",
    await nonfungiblePositionManager.WETH9()
  )) as IERC20;

    // create wmatic weth pool
    // weth / wmatic = 33 / 100000
    let wmePoolToken0;
    let wmePoolToken1;
    let wmePoolToken0AmountDesired;
    let wmePoolToken1AmountDesired;
    let sqrtPriceX96;
    let wmaticAmountDesired = BigNumber.from(10).pow(18).mul(1_000_000);
    let wethAmountDesired = BigNumber.from(10).pow(18).mul(330);
    if (weth.address < wmatic.address) {
      wmePoolToken0 = weth;
      wmePoolToken1 = wmatic;
      wmePoolToken0AmountDesired = wethAmountDesired;
      wmePoolToken1AmountDesired = wmaticAmountDesired;
      sqrtPriceX96 = "4361366805287382863254395027456";
    } else {
      wmePoolToken0 = wmatic;
      wmePoolToken1 = weth;
      wmePoolToken0AmountDesired = wmaticAmountDesired;
      wmePoolToken1AmountDesired = wethAmountDesired;
      sqrtPriceX96 = "1439251045744836313559859200";
    }
    await nonfungiblePositionManager
      .connect(wethWallet)
      .createAndInitializePoolIfNecessary(
        wmePoolToken0.address,
        wmePoolToken1.address,
        FeeAmount.LOWEST,
        sqrtPriceX96
      );

    await weth
      .connect(wethWallet)
      .approve(nonfungiblePositionManager.address, wethAmountDesired);
    await nonfungiblePositionManager.connect(wethWallet).mint(
      {
        token0: wmePoolToken0.address,
        token1: wmePoolToken1.address,
        fee: FeeAmount.LOWEST,
        tickLower: -92000,
        tickUpper: 92000,
        amount0Desired: wmePoolToken0AmountDesired,
        amount1Desired: wmePoolToken1AmountDesired,
        amount0Min: 0,
        amount1Min: 0,
        recipient: wethWallet.address,
        deadline:
          parseInt((new Date().getTime() / 1000).toString().substr(0, 10)) +
          1000,
      },
      {
        value: wmaticAmountDesired,
      }
    );
}



describe("BaseFlow", function () {
  it("base", async function () {
    const wallets = await ethers.getSigners();
    const deployWallet = wallets[0];
    const signatureWallet = wallets[1];
    const cnftOwnerWallet = wallets[2];
    const osp3ClaimOwner = wallets[3];
    const user1Wallet = wallets[4];
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
    // create wmatic pool
    await createWmaticPool(deployWallet, weth);
    // add osp config
    const config0 = {
      fee: 10000,
        ospFindPool: {
          initSqrtPriceX96: BigNumber.from("55459713759985032797043556352"),
          positions: [{
            tickLower: -7000,
            tickUpper: 92000,
            amount: BigNumber.from(10).pow(18).mul(1000000),
          }],
        },
        findOspPool: {
          initSqrtPriceX96: BigNumber.from("113183089306091913361089363968"),
          positions: [{
            tickLower: -92000,
            tickUpper: 7000,
            amount: BigNumber.from(10).pow(18).mul(1000000),
          }],
        },
    }
    expect(await factory.ospPoolConfigsCount()).eq(0);
    await factory.connect(deployWallet).addOspPoolConfig(config0);
    const config0read = await factory.getOspPoolConfigs(0);
    expect(await factory.ospPoolConfigsCount()).eq(1);
    expect(config0read.fee).eq(config0.fee);
    
    expect(config0read.ospFindPoolInitSqrtPriceX96).eq(config0.ospFindPool.initSqrtPriceX96);
    expect(config0read.findOspPoolInitSqrtPriceX96).eq(config0.findOspPool.initSqrtPriceX96);

    expect(config0read.ospFindPoolPositions.length).eq(1);
    expect(config0read.ospFindPoolPositions.length).eq(
      config0.ospFindPool.positions.length
    );
    expect(config0read.ospFindPoolPositions[0].tickLower).eq(
      config0.ospFindPool.positions[0].tickLower
    );
    expect(config0read.ospFindPoolPositions[0].tickUpper).eq(
      config0.ospFindPool.positions[0].tickUpper
    );
    expect(config0read.ospFindPoolPositions[0].amount).eq(
      config0.ospFindPool.positions[0].amount
    );

    expect(config0read.findOspPoolPositions.length).eq(1);
    expect(config0read.findOspPoolPositions.length).eq(
      config0.findOspPool.positions.length
    );
    expect(config0read.findOspPoolPositions[0].tickLower).eq(
      config0.findOspPool.positions[0].tickLower
    );
    expect(config0read.findOspPoolPositions[0].tickUpper).eq(
      config0.findOspPool.positions[0].tickUpper
    );
    expect(config0read.findOspPoolPositions[0].amount).eq(
      config0.findOspPool.positions[0].amount
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
        [osp1Params.base, osp1Params.deadline, deployWallet.address]
      )))
    );
    await factory.createOSPByProjectOwner(osp1Params);
    // create osp2
    const osp2Params = {
      base: {
        name: "github.com/haha/2",
        symbol: "0xHAHA2",
        projectId: "github.com/1/2",
        stars: 20,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0
      },
      deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
      signature: ""
    }
    const osp2TokenFindPath =
      "0x" +
      find.address.slice(2) +
      "0000" +
      FeeAmount.LOWEST.toString(16) +
      weth.address.slice(2);
    console.log("1111111111111");
    console.log((await factory.findInfo()).pool);
    console.log(weth.address);
    const osp2AllFindAmount = BigNumber.from(10).pow(18).mul(300);
    const osp2AmountPayMax = BigNumber.from(10).pow(18).mul(1);
    osp2Params.signature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
        [osp2Params.base, osp2Params.deadline, deployWallet.address]
      )))
    );
    await weth.connect(deployWallet).approve(factory.address, osp2AmountPayMax);
    await factory.createOSPByProjectOwnerAndMultiply(osp2Params, osp2TokenFindPath, osp2AllFindAmount, osp2AmountPayMax);

    // create osp3
    const osp3Params = {
      base: {
        name: "github.com/haha/3",
        symbol: "0xHAHA3",
        projectId: "github.com/1/3",
        stars: 20,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0
      },
      deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
      buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(100),
      buyNFTFindAmount: BigNumber.from(10).pow(18).mul(9),
      tokenToFindOutPath: "0x" +
        find.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        weth.address.slice(2) +
        "0000" +
        FeeAmount.LOWEST.toString(16) +
        wmatic.address.slice(2),
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
        [osp3Params.base, osp3Params.deadline, osp3Params.buyNFTTokenAmountMax, osp3Params.buyNFTFindAmount, osp3Params.tokenToFindOutPath, deployWallet.address]
      )))
    );
    await factory.createOSP(osp3Params, {value: osp3Params.buyNFTTokenAmountMax});
    // create osp4
    const osp4Params = {
      base: {
        name: "github.com/haha/4",
        symbol: "0xHAHA4",
        projectId: "github.com/1/4",
        stars: 20,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0
      },
      deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
      buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(100),
      buyNFTFindAmount: BigNumber.from(10).pow(18).mul(10),
      tokenToFindOutPath: find.address,
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
        [osp4Params.base, osp4Params.deadline, osp4Params.buyNFTTokenAmountMax,osp4Params.buyNFTFindAmount,osp4Params.tokenToFindOutPath, deployWallet.address]
      )))
    );
    const osp4AllFindAmount = BigNumber.from(10).pow(18).mul(100);
    const osp4AmountPayMax = BigNumber.from(10).pow(18).mul(100);
    await weth.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(5));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: weth.address,
      tokenOut: find.address,
      fee: FeeAmount.LOWEST,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(5),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    expect(await find.balanceOf(deployWallet.address)).gte(osp4Params.buyNFTTokenAmountMax.add(osp4AmountPayMax));
    await find.connect(deployWallet).approve(factory.address, osp4Params.buyNFTTokenAmountMax.add(osp4AmountPayMax));
    await factory.createOSPAndMultiply(osp4Params, osp4AllFindAmount, osp4AmountPayMax);
    // show osp info 4
    const osp4 = (await ethers.getContractAt(
      "IERC20",
      await factory.projectId2OspToken(osp4Params.base.projectId)
    )) as IERC20;
    const osp4Info = await factory.token2OspInfo(osp4.address);
    const iosp4Info = await ifactory.token2OspInfo(osp4.address);
    const osp4LpTokenIdList = await factory.ospLpTokenIdList(osp4.address);
    const iosp4LpTokenIdList = await ifactory.ospLpTokenIdList(osp4.address);
    expect(osp4Info.projectId).eq(iosp4Info.projectId);
    expect(osp4Info.stars).eq(iosp4Info.stars);
    expect(osp4Info.pool).eq(iosp4Info.pool);
    expect(osp4Info.cnftTokenId).eq(iosp4Info.cnftTokenId);
    expect(osp4Info.onftTokenId).eq(iosp4Info.onftTokenId);
    expect(osp4LpTokenIdList[0]).eq(iosp4LpTokenIdList[0]);
    expect(osp4Info.projectId).eq(osp4Params.base.projectId);
    expect(osp4Info.stars).eq(osp4Params.base.stars);
    expect(osp4LpTokenIdList[0]).eq(iosp4LpTokenIdList[0]);
    const osp4Pool = (await ethers.getContractAt(
      "IUniswapV3Pool",
      osp4Info.pool
    )) as IUniswapV3Pool;
    expect(await osp4Pool.fee()).eq(config0read.fee);
    if (osp4.address < find.address) {
      expect(await osp4Pool.token0()).eq(osp4.address);
      expect(await osp4Pool.token1()).eq(find.address);
    } else {
      expect(await osp4Pool.token0()).eq(find.address);
      expect(await osp4Pool.token1()).eq(osp4.address);
    }
    expect(osp4Info.cnftTokenId).eq(8);
    expect(osp4Info.onftTokenId).eq(9);
    expect(await findnft.ownerOf(8)).eq(deployWallet.address);
    expect(await findnft.ownerOf(9)).eq(earn.address);
    const osp4CNFTInfo = await findnft.tokenId2Info(8);
    const osp4ONFTInfo = await findnft.tokenId2Info(9);
    expect(osp4CNFTInfo.percent).eq(nftPercentConfig0read.cnft);
    expect(osp4ONFTInfo.percent).eq(nftPercentConfig0read.onft);
    // claimOSPOwnerNFT osp3
    const osp3 = (await ethers.getContractAt(
      "IERC20",
      await factory.projectId2OspToken(osp3Params.base.projectId)
    )) as IERC20;
    const osp3ClaimSignature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [osp3.address, osp3ClaimOwner.address]
      )))
    );
    const osp3Info = await factory.token2OspInfo(osp3.address);
    expect(await findnft.isClaimed(osp3Info.cnftTokenId)).eq(false);
    expect(await findnft.isClaimed(osp3Info.onftTokenId)).eq(false);
    await earn.connect(deployWallet).claimOSPOwnerNFT(osp3.address, osp3ClaimOwner.address, osp3ClaimSignature);
    expect(await findnft.isClaimed(osp3Info.cnftTokenId)).eq(true);
    expect(await findnft.isClaimed(osp3Info.onftTokenId)).eq(true);

    // collectForBuilder find
    const findCnftOnwer = await findnft.ownerOf(0);
    const findOnftOnwer = await findnft.ownerOf(1);
    const findCnftOnwerFind1 = await find.balanceOf(findCnftOnwer);
    const findOnftOnwerFind1 = await find.balanceOf(findOnftOnwer);
    await earn.collectForBuilder(find.address);
    const findCnftOnwerFind2 = await find.balanceOf(findCnftOnwer);
    const findOnftOnwerFind2 = await find.balanceOf(findOnftOnwer);
    const findCnftOnwerAddFind1 = findCnftOnwerFind2.sub(findCnftOnwerFind1);
    const findOnftOnwerAddFind1 = findOnftOnwerFind2.sub(findOnftOnwerFind1);
    expect(
      findOnftOnwerAddFind1.sub(findCnftOnwerAddFind1.mul(19))
    ).lt(20);

    // collectFindUniswapLPFee
    await find.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: weth.address,
      fee: FeeAmount.LOWEST,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(100),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const shareFind00 = await find.balanceOf(earn.address);
    const shareWeth00 = await weth.balanceOf(earn.address);
    const collectFindUniswapLPFee = await earn.callStatic.collectFindUniswapLPFee();
    await earn.collectFindUniswapLPFee();
    const shareFind01 = await find.balanceOf(earn.address);
    const shareWeth01 = await weth.balanceOf(earn.address);
    expect(collectFindUniswapLPFee.wethAmount).eq(
      shareWeth01.sub(shareWeth00)
    ).gt(0);
    expect(collectFindUniswapLPFee.findAmount).eq(
      shareFind01.sub(shareFind00)
    ).gt(0);

    const findCnftOnwerWeth1 = await weth.balanceOf(findCnftOnwer);
    const findOnftOnwerWeth1 = await weth.balanceOf(findOnftOnwer);
    const collectWeth = await earn.callStatic.collectForBuilder(weth.address);
    await earn.collectForBuilder(weth.address);
    const findCnftOnwerWeth2 = await weth.balanceOf(findCnftOnwer);
    const findOnftOnwerWeth2 = await weth.balanceOf(findOnftOnwer);
    expect(collectWeth.cAmount).eq(
      findCnftOnwerWeth2.sub(findCnftOnwerWeth1)
    ).gt(0);
    expect(collectWeth.oAmount).eq(
      findOnftOnwerWeth2.sub(findOnftOnwerWeth1)
    ).gt(0);
    // collectOspUniswapLPFee 3
    await find.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: osp3.address,
      fee: FeeAmount.HIGH,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(100),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await osp3.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: osp3.address,
      tokenOut: find.address,
      fee: FeeAmount.HIGH,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(100),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const osp3CnftOnwer = await findnft.ownerOf(6);
    const osp3OnftOnwer = await findnft.ownerOf(7);
    const osp3CnftOnwerFind1 = await find.balanceOf(osp3CnftOnwer);
    const osp3OnftOnwerOsp_1 = await osp3.balanceOf(osp3OnftOnwer);
    await earn.collectOspUniswapLPFee(osp3.address);
    const osp3CnftOnwerFind2 = await find.balanceOf(osp3CnftOnwer);
    const osp3OnftOnwerOsp_2 = await osp3.balanceOf(osp3OnftOnwer);
    expect(osp3OnftOnwerOsp_2.sub(osp3OnftOnwerOsp_1)).gt(0);
    expect(osp3CnftOnwerFind2.sub(osp3CnftOnwerFind1)).gt(0);

    // collectForBuilder osp3
    const findCnftOnwerOsp3_1 = await osp3.balanceOf(findCnftOnwer);
    const findOnftOnwerOsp3_1 = await osp3.balanceOf(findOnftOnwer);
    await earn.collectForBuilder(osp3.address);
    const findCnftOnwerOsp3_2 = await osp3.balanceOf(findCnftOnwer);
    const findOnftOnwerOsp3_2 = await osp3.balanceOf(findOnftOnwer);
    expect(findCnftOnwerOsp3_2.sub(findCnftOnwerOsp3_1)).eq(0);
    expect(findOnftOnwerOsp3_2.sub(findOnftOnwerOsp3_1)).eq(0);

    // collectOspUniswapLPFee 4
    await find.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: osp4.address,
      fee: FeeAmount.HIGH,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(100),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    await osp4.connect(deployWallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(100));
    await swapRouter.connect(deployWallet).exactInputSingle({
      tokenIn: osp4.address,
      tokenOut: find.address,
      fee: FeeAmount.HIGH,
      recipient: deployWallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(100),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const osp4CnftOnwer = await findnft.ownerOf(8);
    const osp4OnftOnwer = await findnft.ownerOf(9);
    const osp4CnftOnwerFind1 = await find.balanceOf(osp4CnftOnwer);
    const osp4OnftOnwerOsp4_1 = await osp4.balanceOf(osp4OnftOnwer);
    await earn.collectOspUniswapLPFee(osp4.address);
    const osp4CnftOnwerFind2 = await find.balanceOf(osp4CnftOnwer);
    const osp4OnftOnwerOsp4_2 = await osp4.balanceOf(osp4OnftOnwer);

    expect(osp4OnftOnwerOsp4_2.sub(osp4OnftOnwerOsp4_1)).gt(0);
    expect(osp4CnftOnwerFind2.sub(osp4CnftOnwerFind1)).gt(0);

    // collectForBuilder osp4
    const findCnftOnwerOsp4_1 = await osp4.balanceOf(findCnftOnwer);
    const findOnftOnwerOsp4_1 = await osp4.balanceOf(findOnftOnwer);
    await earn.collectForBuilder(osp4.address);
    const findCnftOnwerOsp4_2 = await osp4.balanceOf(findCnftOnwer);
    const findOnftOnwerOsp4_2 = await osp4.balanceOf(findOnftOnwer);
    expect(findCnftOnwerOsp4_2.sub(findCnftOnwerOsp4_1)).gt(0);
    expect(findOnftOnwerOsp4_2.sub(findOnftOnwerOsp4_1)).gt(0);

    // mortgage 1
    await find.connect(deployWallet).transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(2000))
    await find.connect(user1Wallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(1000));
    await swapRouter.connect(user1Wallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: osp4.address,
      fee: FeeAmount.HIGH,
      recipient: user1Wallet.address,
      amountIn: BigNumber.from(10).pow(18).mul(1000),
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    const user1WalletFind1 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_1 = await osp4.balanceOf(user1Wallet.address);
    const shareFind1 = await find.balanceOf(earn.address);
    await osp4.connect(user1Wallet).approve(mortgage.address, BigNumber.from(10).pow(18).mul(100));

    const mortgageInfo = await mortgage.connect(user1Wallet).callStatic.mortgage(osp4.address, BigNumber.from(10).pow(18).mul(100), find.address);
    await mortgage.connect(user1Wallet).mortgage(osp4.address, BigNumber.from(10).pow(18).mul(100), find.address);
    
    const user1WalletFind2 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_2 = await osp4.balanceOf(user1Wallet.address);
    const shareFind2 = await find.balanceOf(earn.address);
    expect(user1WalletFind2.sub(user1WalletFind1)).eq(BigNumber.from("49416873675254999717"));
    expect(user1WalletOsp4_1.sub(user1WalletOsp4_2)).eq(BigNumber.from(10).pow(18).mul(100));
    expect(shareFind2.sub(shareFind1)).eq(BigNumber.from("248325998368115576"));

    const positions1 = await mortgage.positions(mortgageInfo.tokenId);
    expect(positions1.tokenId).eq(mortgageInfo.tokenId);
    expect(positions1.ospAsset).eq(osp4.address);
    expect(positions1.ospAmount).eq(BigNumber.from(10).pow(18).mul(100));

    expect(await mortgage.ownerOf(mortgageInfo.tokenId)).eq(user1Wallet.address)

    // mortgage 2
    const user1WalletFind3 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_3 = await osp4.balanceOf(user1Wallet.address);
    const shareFind3 = await find.balanceOf(earn.address);
    await osp4.connect(user1Wallet).approve(mortgage.address, BigNumber.from(10).pow(18).mul(100));

    await mortgage.connect(user1Wallet).mortgageAdd(mortgageInfo.tokenId, BigNumber.from(10).pow(18).mul(100), find.address);

    const user1WalletFind4 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_4 = await osp4.balanceOf(user1Wallet.address);
    const shareFind4 = await find.balanceOf(earn.address);

    expect(user1WalletFind4.sub(user1WalletFind3)).eq(BigNumber.from("49426688973828356218"));
    expect(user1WalletOsp4_3.sub(user1WalletOsp4_4)).eq(BigNumber.from(10).pow(18).mul(100));
    expect(shareFind4.sub(shareFind3)).eq(BigNumber.from("248375321476524403"));
    const positions2 = await mortgage.positions(mortgageInfo.tokenId);
    expect(positions2.tokenId).eq(mortgageInfo.tokenId);
    expect(positions2.ospAsset).eq(osp4.address);
    expect(positions2.ospAmount).eq(BigNumber.from(10).pow(18).mul(200));
 
    expect(await mortgage.ownerOf(mortgageInfo.tokenId)).eq(user1Wallet.address)

    // redeem 1
    const osp4RedeemFind1 = user1WalletFind4.sub(user1WalletFind3).add(
      shareFind4.sub(shareFind3)
    );
    const user1WalletFind5 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_5 = await osp4.balanceOf(user1Wallet.address);
    await find.connect(user1Wallet).approve(mortgage.address, BigNumber.from(10).pow(18).mul(100));
    await mortgage.connect(user1Wallet).redeem(mortgageInfo.tokenId, BigNumber.from(10).pow(18).mul(100), BigNumber.from(10).pow(18).mul(100), find.address);
    const user1WalletOsp4_6 = await osp4.balanceOf(user1Wallet.address);
    const user1WalletFind6 = await find.balanceOf(user1Wallet.address);
    expect(user1WalletFind5.sub(user1WalletFind6)).eq(osp4RedeemFind1);
    expect(user1WalletOsp4_6).eq(user1WalletOsp4_5.add(BigNumber.from(10).pow(18).mul(100)));
    const positions3 = await mortgage.positions(mortgageInfo.tokenId);
    expect(positions3.tokenId).eq(mortgageInfo.tokenId);
    expect(positions3.ospAsset).eq(osp4.address);
    expect(positions3.ospAmount).eq(BigNumber.from(10).pow(18).mul(100));

    expect(await mortgage.ownerOf(mortgageInfo.tokenId)).eq(user1Wallet.address)

    // redeem 2
    const osp4RedeemFind2 = user1WalletFind2.sub(user1WalletFind1).add(
      shareFind2.sub(shareFind1)
    );
    const user1WalletFind7 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_7 = await osp4.balanceOf(user1Wallet.address);
    await find.connect(user1Wallet).approve(mortgage.address, BigNumber.from(10).pow(18).mul(100));
    await mortgage.connect(user1Wallet).redeem(mortgageInfo.tokenId, BigNumber.from(10).pow(18).mul(100), BigNumber.from(10).pow(18).mul(100), find.address);
    const user1WalletFind8 = await find.balanceOf(user1Wallet.address);
    const user1WalletOsp4_8 = await osp4.balanceOf(user1Wallet.address);
    expect(user1WalletFind7.sub(user1WalletFind8)).eq(osp4RedeemFind2);
    expect(user1WalletOsp4_8).eq(user1WalletOsp4_7.add(BigNumber.from(10).pow(18).mul(100)));
    const positions4 = await mortgage.positions(mortgageInfo.tokenId);
    expect(positions4.tokenId).eq(0);
    expect(positions4.ospAsset).eq(ZERO_ADDRESS);
    expect(positions4.ospAmount).eq(0);
    await expect(
      mortgage.ownerOf(mortgageInfo.tokenId)
    ).revertedWith("ERC721: invalid token ID");

    // multiply
    const osp4multiplyAllFind = BigNumber.from(10).pow(18).mul(100);
    const osp4multiplyNeedPayFind = BigNumber.from("1942822493760727443");
    const user1WalletFind9 = await find.balanceOf(user1Wallet.address);
    const shareFind5 = await find.balanceOf(earn.address);
    await find.connect(user1Wallet).approve(mortgage.address, osp4multiplyNeedPayFind);
    
    const multiplyInfo = await mortgage.connect(user1Wallet).callStatic.multiply(osp4.address, osp4multiplyAllFind, osp4multiplyNeedPayFind, find.address);
    await mortgage.connect(user1Wallet).multiply(osp4.address, osp4multiplyAllFind, osp4multiplyNeedPayFind, find.address);
    const user1WalletFind10 = await find.balanceOf(user1Wallet.address);
    const shareFind6 = await find.balanceOf(earn.address);
    const positions5 = await mortgage.positions(multiplyInfo.tokenId);
    expect(positions5.tokenId).eq(multiplyInfo.tokenId);
    expect(positions5.ospAsset).eq(osp4.address);
    
    expect(await mortgage.ownerOf(multiplyInfo.tokenId)).eq(user1Wallet.address)

    const user1WalletFind11 = await find.balanceOf(user1Wallet.address);
    await find.connect(user1Wallet).approve(mortgage.address, osp4multiplyAllFind);
    await mortgage.connect(user1Wallet).redeem(multiplyInfo.tokenId, positions5.ospAmount, osp4multiplyAllFind, find.address)
    const user1WalletFind12 = await find.balanceOf(user1Wallet.address);
    expect(user1WalletFind11.sub(user1WalletFind12).add(
      user1WalletFind9.sub(user1WalletFind10)
    ).sub(
      shareFind6.sub(shareFind5)
    )
    ).eq(osp4multiplyAllFind);

  // multiply 1 2 and cash
  const osp4multiplyAllFind2 = BigNumber.from(10).pow(18).mul(100);
  const osp4multiplyNeedPayFind2 = osp4multiplyAllFind2;
  const user1WalletFind13 = await find.balanceOf(user1Wallet.address);
  const shareFind7 = await find.balanceOf(earn.address);
  await find.connect(user1Wallet).approve(mortgage.address, osp4multiplyAllFind2);
  
  const multiplyInfo1 = await mortgage.connect(user1Wallet).callStatic.multiply(osp4.address, osp4multiplyAllFind2, osp4multiplyNeedPayFind2, find.address);
  await mortgage.connect(user1Wallet).multiply(osp4.address, osp4multiplyAllFind2, osp4multiplyNeedPayFind2, find.address);
  const user1WalletFind14 = await find.balanceOf(user1Wallet.address);
  const shareFind8 = await find.balanceOf(earn.address);
  const positions6 = await mortgage.positions(multiplyInfo1.tokenId);
  expect(positions6.tokenId).eq(multiplyInfo1.tokenId);
  expect(positions6.ospAsset).eq(osp4.address);

  expect(await mortgage.ownerOf(multiplyInfo1.tokenId)).eq(user1Wallet.address)
  expect(user1WalletFind13.sub(user1WalletFind14)).eq(multiplyInfo1.amountNeedPay);
  expect(shareFind8.sub(shareFind7)).gt(0);

  const osp4multiplyAllFind3 = BigNumber.from(10).pow(18).mul(100);
  const osp4multiplyNeedPayFind3 = osp4multiplyAllFind3;
  const user1WalletFind15 = await find.balanceOf(user1Wallet.address);
  const shareFind9 = await find.balanceOf(earn.address);
  await find.connect(user1Wallet).approve(mortgage.address, osp4multiplyNeedPayFind3);
  
  const multiplyAddInfo = await mortgage.connect(user1Wallet).callStatic.multiplyAdd(multiplyInfo1.tokenId, osp4multiplyAllFind3, osp4multiplyNeedPayFind3, find.address);

  await mortgage.connect(user1Wallet).multiplyAdd(multiplyInfo1.tokenId, osp4multiplyAllFind3, osp4multiplyNeedPayFind3, find.address);
  const user1WalletFind16 = await find.balanceOf(user1Wallet.address);
  const shareFind10 = await find.balanceOf(earn.address);
  const positions7 = await mortgage.positions(multiplyInfo1.tokenId);
  expect(positions7.tokenId).eq(multiplyInfo1.tokenId);
  expect(positions7.ospAsset).eq(osp4.address);
  expect(positions7.ospAmount).gt(positions6.ospAmount);

  expect(await mortgage.ownerOf(multiplyInfo1.tokenId)).eq(user1Wallet.address)
  expect(user1WalletFind15.sub(user1WalletFind16)).eq(multiplyAddInfo.amountNeedPay);
  expect(shareFind10.sub(shareFind9)).gt(0);

  await find.connect(deployWallet).transfer(user1Wallet.address, BigNumber.from(10).pow(18).mul(2000))
  await find.connect(user1Wallet).approve(swapRouter.address, BigNumber.from(10).pow(18).mul(2000));
  await swapRouter.connect(user1Wallet).exactInputSingle({
    tokenIn: find.address,
    tokenOut: osp4.address,
    fee: FeeAmount.HIGH,
    recipient: user1Wallet.address,
    amountIn: BigNumber.from(10).pow(18).mul(2000),
    amountOutMinimum: 0,
    sqrtPriceLimitX96: 0,
  });

  const mortgageOsp1 = await osp4.balanceOf(mortgage.address);
  const user1WalletFind17 = await find.balanceOf(user1Wallet.address);
  
  const cashInfo = await mortgage.connect(user1Wallet).callStatic.cash(multiplyInfo1.tokenId, positions7.ospAmount, find.address);
  await mortgage.connect(user1Wallet).cash(multiplyInfo1.tokenId, positions7.ospAmount, find.address);

  const mortgageOsp2 = await osp4.balanceOf(mortgage.address);
  const user1WalletFind18 = await find.balanceOf(user1Wallet.address);

  expect(mortgageOsp1.sub(mortgageOsp2)).eq(positions7.ospAmount);
  expect(user1WalletFind18.sub(user1WalletFind17)).eq(cashInfo.amountOut);

  const positions8 = await mortgage.positions(multiplyInfo1.tokenId);
  expect(positions8.tokenId).eq(0);
  expect(positions8.ospAsset).eq(ZERO_ADDRESS);
  expect(positions8.ospAmount).eq(0);
  await expect(
    mortgage.ownerOf(multiplyInfo1.tokenId)
  ).revertedWith("ERC721: invalid token ID");
  });
});
