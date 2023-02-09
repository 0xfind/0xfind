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
  DEFAULT_OSP_POOL_CONFIG_3,
  DEFAULT_OSP_POOL_CONFIG_1,
  ZERO_ADDRESS,
  UNISWAP_V3_POSITIONS,
  UNISWAP_ROUTER,
} from "./share/utils";

describe("BaseFlow.3", function () {

    const collect = async function (
        find: Find, weth: IERC20, osp1: IERC20,
        earn: Earn, hcnftOwnerWallet: any,  honftOwnerWallet: any,
        pcnftOwnerWallet: any, ponftOwnerWallet: any
    ) {
            
    // collect osp
    const hcnftFind1 = await find.balanceOf(hcnftOwnerWallet.address);
    const honftOsp1  = await osp1.balanceOf(honftOwnerWallet.address);
    await earn.collectOspUniswapLPFee(osp1.address);
    const hcnftFind2 = await find.balanceOf(hcnftOwnerWallet.address);
    const honftOsp2  = await osp1.balanceOf(honftOwnerWallet.address);

    const hcnftAddFind = hcnftFind2.sub(hcnftFind1);
    const honftAddOsp = honftOsp2.sub(honftOsp1);

    console.log("collectOspUniswapLPFee");
    console.log("hcnftOwner find add", hcnftAddFind);
    console.log("honftOwner osp add", honftAddOsp);

    // collectOspUniswapLPFee
    const pcnftFind3 = await find.balanceOf(pcnftOwnerWallet.address);
    const ponftFind3 = await find.balanceOf(ponftOwnerWallet.address);
    const pcnftWeth3 = await weth.balanceOf(pcnftOwnerWallet.address);
    const ponftWeth3 = await weth.balanceOf(ponftOwnerWallet.address);

    const earnFind1 = await find.balanceOf(earn.address);
    const earnWeth1 = await weth.balanceOf(earn.address);
    await earn.collectFindUniswapLPFee();
    const earnFind2 = await find.balanceOf(earn.address);
    const earnWeth2 = await weth.balanceOf(earn.address);

    await earn.collectForBuilder(weth.address);
    await earn.collectForBuilder(find.address);
    const pcnftWeth4 = await weth.balanceOf(pcnftOwnerWallet.address);
    const ponftWeth4 = await weth.balanceOf(ponftOwnerWallet.address);
    const pcnftFind4 = await find.balanceOf(pcnftOwnerWallet.address);
    const ponftFind4 = await find.balanceOf(ponftOwnerWallet.address);

    const earnAddFind = earnFind2.sub(earnFind1);
    const earnAddWeth = earnWeth2.sub(earnWeth1);

    console.log("collectFindUniswapLPFee");
    console.log("earn add find", earnAddFind)
    console.log("earn add weth", earnAddWeth)

    const pcnftAddFind = pcnftFind4.sub(pcnftFind3);
    const pcnftAddWeth = pcnftWeth4.sub(pcnftWeth3);
    const ponftAddFind = ponftFind4.sub(ponftFind3);
    const ponftAddWeth = ponftWeth4.sub(ponftWeth3);

    console.log("collectForBuilder");
    console.log("pcnftOwner add find", pcnftAddFind)
    console.log("pcnftOwner add weth", pcnftAddWeth)
    console.log("====")
    console.log("ponftOwner add find", ponftAddFind)
    console.log("ponftOwner add weth", ponftAddWeth)

    console.log("====")
    // transfer
    // pco transfer weth find
    await find.connect(pcnftOwnerWallet).transfer(honftOwnerWallet.address, pcnftAddFind);
    await weth.connect(pcnftOwnerWallet).transfer(honftOwnerWallet.address, pcnftAddWeth);
    const pcnftFind = await find.balanceOf(pcnftOwnerWallet.address);
    const pcnftWeth = await weth.balanceOf(pcnftOwnerWallet.address);
    console.log("pcnft owner send find to ho", pcnftAddFind)
    console.log("pcnft owner send find to ho", pcnftAddWeth)
    console.log("pcnft owner have find", pcnftFind)
    console.log("pcnft owner have weth", pcnftWeth)

    console.log("====")
    // hco transfer weth find
    await find.connect(hcnftOwnerWallet).transfer(honftOwnerWallet.address, hcnftAddFind);
    const hcnftFind = await find.balanceOf(honftOwnerWallet.address);
    const hcnftWeth = await weth.balanceOf(honftOwnerWallet.address);
    console.log("hcnft owner send find to ho", hcnftAddFind)
    console.log("hcnft owner have find", hcnftFind)
    console.log("hcnft owner have weth", hcnftWeth)

    console.log("====")
    // po transfer weth find
    await find.connect(ponftOwnerWallet).transfer(honftOwnerWallet.address, ponftAddFind);
    await weth.connect(ponftOwnerWallet).transfer(honftOwnerWallet.address, ponftAddWeth);
    const ponftFind = await find.balanceOf(ponftOwnerWallet.address);
    const ponftWeth = await weth.balanceOf(ponftOwnerWallet.address);
    console.log("ponft owner send find to ho", ponftAddFind)
    console.log("ponft owner send find to ho", ponftAddWeth)
    console.log("ponft owner have find", ponftFind)
    console.log("ponft owner have weth", ponftWeth)

    console.log("====")
    const honftFind_1 = await find.balanceOf(honftOwnerWallet.address);
    const honftWeth_1 = await weth.balanceOf(honftOwnerWallet.address);
    const honftOsp_1 = await osp1.balanceOf(honftOwnerWallet.address);
    console.log("ho have find", honftFind_1)
    console.log("ho have weth", honftWeth_1)
    console.log("ho have osp", honftOsp_1)
    }

  it("base", async function () {
    const wallets = await ethers.getSigners();
    const deployWallet = wallets[0];

    const signatureWallet = wallets[1];

    const findOwnerWallet = wallets[2];

    const pcnftOwnerWallet = findOwnerWallet;
    const ponftOwnerWallet = wallets[3];

    const hcnftOwnerWallet = findOwnerWallet;
    const honftOwnerWallet = wallets[4];


    const swapRouter = (await ethers.getContractAt(
      "ISwapRouter02", UNISWAP_ROUTER
    )) as ISwapRouter02;

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

    // pcnft transferFrom to pcnftOwnerWallet
    expect(await findnft.ownerOf(0)).eq(deployWallet.address);
    await findnft.connect(deployWallet).transferFrom(deployWallet.address, pcnftOwnerWallet.address, 0);
    expect(await findnft.ownerOf(0)).eq(pcnftOwnerWallet.address);

    // ponft transferFrom to ponftOwnerWallet
    expect(await findnft.ownerOf(1)).eq(deployWallet.address);
    await findnft.connect(deployWallet).transferFrom(deployWallet.address, ponftOwnerWallet.address, 1);
    expect(await findnft.ownerOf(1)).eq(ponftOwnerWallet.address);

    // add osp config
    expect(await factory.ospPoolConfigsCount()).eq(0);
    await factory.connect(deployWallet).addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_3);
    const config0read = await factory.getOspPoolConfigs(0);
    expect(await factory.ospPoolConfigsCount()).eq(1);
    expect(config0read.fee).eq(DEFAULT_OSP_POOL_CONFIG_3.fee);
    
    expect(config0read.ospFindPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_3.ospFindPool.initSqrtPriceX96);
    expect(config0read.findOspPoolInitSqrtPriceX96).eq(DEFAULT_OSP_POOL_CONFIG_3.findOspPool.initSqrtPriceX96);

    expect(config0read.ospFindPoolPositions.length).eq(4);
    expect(config0read.ospFindPoolPositions.length).eq(
      DEFAULT_OSP_POOL_CONFIG_3.ospFindPool.positions.length
    );
    expect(config0read.ospFindPoolPositions[0].tickLower).eq(
      DEFAULT_OSP_POOL_CONFIG_3.ospFindPool.positions[0].tickLower
    );
    expect(config0read.ospFindPoolPositions[0].tickUpper).eq(
      DEFAULT_OSP_POOL_CONFIG_3.ospFindPool.positions[0].tickUpper
    );
    expect(config0read.ospFindPoolPositions[0].amount).eq(
      DEFAULT_OSP_POOL_CONFIG_3.ospFindPool.positions[0].amount
    );

    expect(config0read.findOspPoolPositions.length).eq(4);
    expect(config0read.findOspPoolPositions.length).eq(
      DEFAULT_OSP_POOL_CONFIG_3.findOspPool.positions.length
    );
    expect(config0read.findOspPoolPositions[0].tickLower).eq(
      DEFAULT_OSP_POOL_CONFIG_3.findOspPool.positions[0].tickLower
    );
    expect(config0read.findOspPoolPositions[0].tickUpper).eq(
      DEFAULT_OSP_POOL_CONFIG_3.findOspPool.positions[0].tickUpper
    );
    expect(config0read.findOspPoolPositions[0].amount).eq(
      DEFAULT_OSP_POOL_CONFIG_3.findOspPool.positions[0].amount
    );

    // create osp1
    const osp1Params = {
      base: {
        name: "github.com/0xfind/0xfind",
        symbol: "0x0XFIND",
        projectId: "github.com/1/1",
        stars: 1,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0
      },
      deadline: parseInt((new Date().getTime() / 1000).toString().substr(0, 10)),
      signature: ""
    }

    osp1Params.signature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)", "uint256", "address"],
        [osp1Params.base, osp1Params.deadline, findOwnerWallet.address]
      )))
    );
    const osp1TokenFindPath =
      "0x" +
      find.address.slice(2) +
      "0000" +
      FeeAmount.LOWEST.toString(16) +
      weth.address.slice(2);

    const osp1AllFindAmount = BigNumber.from("2675852842763699844193184");
    const os1AmountPayMax = BigNumber.from(10).pow(18).mul(41);

    await weth.connect(deployWallet).transfer(
      findOwnerWallet.address,
      os1AmountPayMax
    );
    await weth.connect(findOwnerWallet).approve(factory.address, os1AmountPayMax)

    const weth1 = await weth.balanceOf(findOwnerWallet.address);
    await factory.connect(findOwnerWallet).createOSPByProjectOwnerAndMultiply(
      osp1Params,
      osp1TokenFindPath,
      osp1AllFindAmount,
      os1AmountPayMax
    );
    const weth2 = await weth.balanceOf(findOwnerWallet.address);
    console.log("create use weth", weth1.sub(weth2))

    // claimOSPOwnerNFT osp1
    const osp1 = (await ethers.getContractAt(
      "IERC20",
      await factory.projectId2OspToken(osp1Params.base.projectId)
    )) as IERC20;

    const osp1ClaimSignature = await signatureWallet.signMessage(
      ethers.utils.arrayify(ethers.utils.keccak256(ethers.utils.defaultAbiCoder.encode(
        ["address", "address"],
        [osp1.address, honftOwnerWallet.address]
      )))
    );
    
    expect(await findnft.ownerOf(2)).eq(findOwnerWallet.address)
    expect(await findnft.ownerOf(3)).eq(earn.address)
    const osp1Info = await factory.token2OspInfo(osp1.address);
    expect(await findnft.isClaimed(osp1Info.cnftTokenId)).eq(false);
    expect(await findnft.isClaimed(osp1Info.onftTokenId)).eq(false);
    await earn.connect(deployWallet).claimOSPOwnerNFT(osp1.address, honftOwnerWallet.address, osp1ClaimSignature);
    expect(await findnft.isClaimed(osp1Info.cnftTokenId)).eq(true);
    expect(await findnft.isClaimed(osp1Info.onftTokenId)).eq(true);
    expect(await findnft.ownerOf(2)).eq(hcnftOwnerWallet.address)
    expect(await findnft.ownerOf(3)).eq(honftOwnerWallet.address)

    await collect(
        find, weth, osp1, earn, hcnftOwnerWallet,  honftOwnerWallet,
        pcnftOwnerWallet, ponftOwnerWallet
    )

    // find swap to osp
    const honftFind_1 = await find.balanceOf(honftOwnerWallet.address);
    await find.connect(honftOwnerWallet).approve(swapRouter.address, honftFind_1);
    await swapRouter.connect(honftOwnerWallet).exactInputSingle({
      tokenIn: find.address,
      tokenOut: osp1.address,
      fee: FeeAmount.HIGH,
      recipient: honftOwnerWallet.address,
      amountIn: honftFind_1,
      amountOutMinimum: 0,
      sqrtPriceLimitX96: 0,
    });
    console.log("=== find swap osp=")
    const honftFind_2 = await find.balanceOf(honftOwnerWallet.address);
    const honftWeth_2 = await weth.balanceOf(honftOwnerWallet.address);
    const honftOsp_2 = await osp1.balanceOf(honftOwnerWallet.address);
    console.log("ho have find", honftFind_2)
    console.log("ho have weth", honftWeth_2)
    console.log("ho have osp", honftOsp_2)

    const tokenInfoList = await mortgage.positionsOfOwnerByOsp(
        findOwnerWallet.address,
        osp1.address
    )
    expect(tokenInfoList.length).eq(1);

    await osp1.connect(honftOwnerWallet).approve(mortgage.address, honftOsp_2);
    await osp1.connect(findOwnerWallet).approve(mortgage.address, tokenInfoList[0].ospAmount);

    const hmor = await mortgage.connect(honftOwnerWallet).callStatic.mortgage(
        osp1.address,
        honftOsp_2,
        find.address
    )
    await mortgage.connect(honftOwnerWallet).mortgage(
        osp1.address,
        honftOsp_2,
        find.address
    )
    console.log("honftOwner mortgage all osp get find", hmor.outFindAmount)

  });
});
