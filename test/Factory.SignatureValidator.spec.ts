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
  SignatureValidator,
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

describe("Factory.SignatureValidator", function () {
  let wallets: SignerWithAddress[];
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;
  let factoryContract: Factory;
  let wethContract: WETH;
  let findContract: Find;
  let earnContract: Earn;
  let findnftContract: FindNFT;
  let userWallet1: SignerWithAddress;
  let userWallet2: SignerWithAddress;
  let userWallet3: SignerWithAddress;
  let userWallet4: SignerWithAddress;
  let nonfungiblePositionManager: INonfungiblePositionManager;
  let userWallets: SignerWithAddress[];

  const getOspName = function (number: number) {
    return "github.com/test/" + number;
  };

  const getOspSymbol = function (number: number) {
    return "0XTEST" + number;
  };

  const getOspProjectId = function (number: number) {
    return "github/1/" + number;
  };

  const deployWalletBuyFind = async function () {
    const swapRouter = (await ethers.getContractAt(
      "ISwapRouter02",
      UNISWAP_ROUTER
    )) as ISwapRouter02;

    await wethContract
      .connect(deployWallet)
      .approve(swapRouter.address, BigNumber.from(10).pow(18).mul(150));
    await swapRouter.connect(deployWallet).exactOutputSingle({
      tokenIn: wethContract.address,
      tokenOut: findContract.address,
      fee: FeeAmount.LOWEST,
      recipient: deployWallet.address,
      amountOut: BigNumber.from(10).pow(18).mul(100_000),
      amountInMaximum: BigNumber.from(10).pow(18).mul(150),
      sqrtPriceLimitX96: 0,
    });
    expect(await findContract.balanceOf(deployWallet.address)).eq(
      BigNumber.from(10).pow(18).mul(100_000)
    );
  };

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[deployWalletIndex];
    signatureWallet = wallets[signatureWalletIndex];
    userWallet = wallets[userWalletIndex];

    let allInfo = await deployAllContractWethFind();
    factoryContract = allInfo.factoryContract;
    earnContract = allInfo.earnContract;
    findnftContract = allInfo.findnftContract;
    wethContract = allInfo.wethContract;
    findContract = allInfo.findContract;

    userWallet1 = wallets[3];
    userWallet2 = wallets[4];
    userWallet3 = wallets[5];
    userWallet4 = wallets[6];
    userWallets = [userWallet1, userWallet2, userWallet3, userWallet4];

    nonfungiblePositionManager = (await ethers.getContractAt(
      "INonfungiblePositionManager",
      UNISWAP_V3_POSITIONS
    )) as INonfungiblePositionManager;

    // addNFTPercentConfig
    await factoryContract.connect(deployWallet).addNFTPercentConfig(500, 9500);

    // createFindUniswapPool
    await findContract
      .connect(deployWallet)
      .transfer(factoryContract.address, await findContract.totalSupply());

    await factoryContract.connect(deployWallet).createFindUniswapPool();

    // addOspPoolConfig 0
    await factoryContract
      .connect(deployWallet)
      .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);

    // addOspPoolConfig 1
    await factoryContract
      .connect(deployWallet)
      .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_1);

    await factoryContract.connect(deployWallet).addNFTPercentConfig(1100, 8900);

    await deployWalletBuyFind();
  });

  it("create osp SignatureValidator", async function () {
    const signatureValidatorContract = (await (
      await ethers.getContractFactory("SignatureValidator")
    ).deploy()) as SignatureValidator;

    await factoryContract.setSignatureAddress(
      signatureValidatorContract.address
    );

    // createOSP use find
    const osp1Params = {
      base: {
        name: getOspName(1),
        symbol: getOspSymbol(1),
        projectId: getOspProjectId(1),
        stars: 1,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0,
      },
      deadline: parseInt(
        (new Date().getTime() / 1000).toString().substr(0, 10)
      ),
      buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(3),
      buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
      tokenToFindOutPath: findContract.address,
      signature: "0x",
    };

    await findContract
      .connect(deployWallet)
      .transfer(userWallet1.address, osp1Params.buyNFTTokenAmountMax);
    await findContract
      .connect(userWallet1)
      .approve(factoryContract.address, osp1Params.buyNFTTokenAmountMax);

    await expect(
      factoryContract.connect(deployWallet).createOSP(osp1Params)
    ).revertedWith("SE1");

    await signatureValidatorContract.signMessage(
      ethers.utils.solidityKeccak256(
        ["string", "bytes32"],
        [
          "\x19Ethereum Signed Message:\n32",
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
                userWallet1.address,
              ]
            )
          ),
        ]
      )
    );

    expect(
      await factoryContract.projectId2OspToken(osp1Params.base.projectId)
    ).eq(ZERO_ADDRESS);

    osp1Params.signature = "0x1111";
    await expect(
      factoryContract.connect(userWallet1).createOSP(osp1Params)
    ).revertedWith("SLE");

    osp1Params.signature = "0x";
    await expect(
      factoryContract.connect(deployWallet).createOSP(osp1Params)
    ).revertedWith("SE1");

    await factoryContract.connect(userWallet1).createOSP(osp1Params);

    expect(
      await factoryContract.projectId2OspToken(osp1Params.base.projectId)
    ).not.eq(ZERO_ADDRESS);

    // createOSPAndMultiplySS use find
    const osp2Params = {
      base: {
        name: getOspName(2),
        symbol: getOspSymbol(2),
        projectId: getOspProjectId(2),
        stars: 2,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0,
      },
      deadline: parseInt(
        (new Date().getTime() / 1000).toString().substr(0, 10)
      ),
      buyNFTTokenAmountMax: BigNumber.from(10).pow(18).mul(3),
      buyNFTFindAmount: BigNumber.from(10).pow(18).mul(3),
      tokenToFindOutPath: findContract.address,
      signature: "0x",
    };

    const osp2AllFindAmount = BigNumber.from(10).pow(18).mul(100);
    const osp2AmountPayMax = BigNumber.from(10).pow(18).mul(100);
    await findContract
      .connect(deployWallet)
      .transfer(
        userWallet2.address,
        osp2Params.buyNFTTokenAmountMax.add(osp2AmountPayMax)
      );
    await findContract
      .connect(userWallet2)
      .approve(
        factoryContract.address,
        osp2Params.buyNFTTokenAmountMax.add(osp2AmountPayMax)
      );

    await expect(
      factoryContract
        .connect(userWallet2)
        .createOSPAndMultiply(osp2Params, osp2AllFindAmount, osp2AmountPayMax)
    ).revertedWith("SE1");

    await signatureValidatorContract.signMessage(
      ethers.utils.solidityKeccak256(
        ["string", "bytes32"],
        [
          "\x19Ethereum Signed Message:\n32",
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
                osp2Params.base,
                osp2Params.deadline,
                osp2Params.buyNFTTokenAmountMax,
                osp2Params.buyNFTFindAmount,
                osp2Params.tokenToFindOutPath,
                userWallet2.address,
              ]
            )
          ),
        ]
      )
    );

    expect(
      await factoryContract.projectId2OspToken(osp2Params.base.projectId)
    ).eq(ZERO_ADDRESS);

    osp2Params.signature = "0x1111";
    await expect(
      factoryContract
        .connect(userWallet2)
        .createOSPAndMultiply(osp2Params, osp2AllFindAmount, osp2AmountPayMax)
    ).revertedWith("SLE");

    osp2Params.signature = "0x";
    await expect(
      factoryContract
        .connect(deployWallet)
        .createOSPAndMultiply(osp2Params, osp2AllFindAmount, osp2AmountPayMax)
    ).revertedWith("SE1");

    await factoryContract
      .connect(userWallet2)
      .createOSPAndMultiply(osp2Params, osp2AllFindAmount, osp2AmountPayMax);

    expect(
      await factoryContract.projectId2OspToken(osp2Params.base.projectId)
    ).not.eq(ZERO_ADDRESS);

    // createOSPByProjectOwner
    const osp3Params = {
      base: {
        name: getOspName(3),
        symbol: getOspSymbol(3),
        projectId: getOspProjectId(3),
        stars: 3,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0,
      },
      deadline: parseInt(
        (new Date().getTime() / 1000).toString().substr(0, 10)
      ),
      signature: "0x",
    };

    await expect(
      factoryContract.connect(userWallet3).createOSPByProjectOwner(osp3Params)
    ).revertedWith("SE1");

    await signatureValidatorContract.signMessage(
      ethers.utils.solidityKeccak256(
        ["string", "bytes32"],
        [
          "\x19Ethereum Signed Message:\n32",
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp3Params.base, osp3Params.deadline, userWallet3.address]
            )
          ),
        ]
      )
    );

    expect(
      await factoryContract.projectId2OspToken(osp3Params.base.projectId)
    ).eq(ZERO_ADDRESS);

    osp3Params.signature = "0x1111";
    await expect(
      factoryContract.connect(userWallet3).createOSPByProjectOwner(osp3Params)
    ).revertedWith("SLE");

    osp3Params.signature = "0x";
    await expect(
      factoryContract.connect(deployWallet).createOSPByProjectOwner(osp3Params)
    ).revertedWith("SE1");

    await factoryContract
      .connect(userWallet3)
      .createOSPByProjectOwner(osp3Params);

    expect(
      await factoryContract.projectId2OspToken(osp3Params.base.projectId)
    ).not.eq(ZERO_ADDRESS);

    // createOSPByProjectOwnerAndMultiply use find
    const osp4Params = {
      base: {
        name: getOspName(4),
        symbol: getOspSymbol(4),
        projectId: getOspProjectId(4),
        stars: 4,
        poolConfigIndex: 0,
        nftPercentConfigIndex: 0,
      },
      deadline: parseInt(
        (new Date().getTime() / 1000).toString().substr(0, 10)
      ),
      signature: "0x",
    };
    const osp4TokenToFindOutPath = findContract.address;
    const osp4AllFindAmount = BigNumber.from(10).pow(18).mul(100);
    const osp4AmountPayMax = BigNumber.from(10).pow(18).mul(100);
    await findContract
      .connect(deployWallet)
      .transfer(userWallet4.address, osp4AmountPayMax);
    await findContract
      .connect(userWallet4)
      .approve(factoryContract.address, osp4AmountPayMax);

    await expect(
      factoryContract
        .connect(userWallet4)
        .createOSPByProjectOwnerAndMultiply(
          osp4Params,
          osp4TokenToFindOutPath,
          osp4AllFindAmount,
          osp4AmountPayMax
        )
    ).revertedWith("SE1");

    await signatureValidatorContract.signMessage(
      ethers.utils.solidityKeccak256(
        ["string", "bytes32"],
        [
          "\x19Ethereum Signed Message:\n32",
          ethers.utils.keccak256(
            ethers.utils.defaultAbiCoder.encode(
              [
                "tuple(string name,string symbol,string projectId,uint256 stars,uint256 poolConfigIndex,uint256 nftPercentConfigIndex)",
                "uint256",
                "address",
              ],
              [osp4Params.base, osp4Params.deadline, userWallet4.address]
            )
          ),
        ]
      )
    );

    expect(
      await factoryContract.projectId2OspToken(osp4Params.base.projectId)
    ).eq(ZERO_ADDRESS);

    osp4Params.signature = "0x1111";
    await expect(
      factoryContract
        .connect(userWallet4)
        .createOSPByProjectOwnerAndMultiply(
          osp4Params,
          osp4TokenToFindOutPath,
          osp4AllFindAmount,
          osp4AmountPayMax
        )
    ).revertedWith("SLE");

    osp4Params.signature = "0x";
    await expect(
      factoryContract
        .connect(deployWallet)
        .createOSPByProjectOwnerAndMultiply(
          osp4Params,
          osp4TokenToFindOutPath,
          osp4AllFindAmount,
          osp4AmountPayMax
        )
    ).revertedWith("SE1");

    await factoryContract
      .connect(userWallet4)
      .createOSPByProjectOwnerAndMultiply(
        osp4Params,
        osp4TokenToFindOutPath,
        osp4AllFindAmount,
        osp4AmountPayMax
      );

    expect(
      await factoryContract.projectId2OspToken(osp4Params.base.projectId)
    ).not.eq(ZERO_ADDRESS);
  });
});
