import { ethers } from "hardhat";
import { BigNumber } from "ethers";

import {
  WETH,
  Find,
  Factory,
  Earn,
  Math,
  Mortgage,
  INonfungiblePositionManager,
  FindNFT,
  FindNFTRender,
  MortgageRender,
  MortgagePoolFactory
} from "../../typechain";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";

export const ZERO_ADDRESS = "0x0000000000000000000000000000000000000000";
export const UNISWAP_V3_POSITIONS = "0xC36442b4a4522E871399CD717aBDD847Ab11FE88";
export const UNISWAP_ROUTER = "0x68b3465833fb72A70ecDF485E0e4C7bD8665Fc45";

export function getPreContractAddress(sender: string, nonce: number) {
  return ethers.utils.getContractAddress({
    from: sender, nonce: nonce
  });
}

export async function getPreContractAddressesByCount(
  signerIndex: number,
  count: number
) {
  const wallets = await ethers.getSigners();
  const deployWallet = wallets[signerIndex];
  const nextNoice = await deployWallet.getTransactionCount();

  const result = [];
  for (let i = 0; i < count; i++) {
    result.push(getPreContractAddress(deployWallet.address, nextNoice + i));
  }

  return result;
}

export async function getPreContractAddressesByNames(
  signerIndex: number,
  contractNames: string[]
) {
  const addressList = await getPreContractAddressesByCount(
    signerIndex,
    contractNames.length
  );

  const result: any = {};
  contractNames.forEach((name, index) => {
    console.log(name, addressList[index]);
    result[name] = addressList[index];
  });
  return result;
}

type AllContractInfo = {
  wallets: any,
  deployWalletIndex: number,
  deployWallet: SignerWithAddress,
  signatureWalletIndex: number,
  signatureWallet: SignerWithAddress,
  userWalletIndex: number,
  userWallet: SignerWithAddress,
  contractAddresses: string[],
  wethContract: WETH,
  findContract: Find,
  factoryContract: Factory,
  earnContract: Earn,
  findnftContract: FindNFT,
  mathContract: Math,
  mortgageContract: Mortgage
  findNFTRenderContract: FindNFTRender
  mortgageRenderContract: MortgageRender
  mortgagePoolFactoryContract: MortgagePoolFactory
}

export async function deployAllContract(wethIsFirst: boolean, wethIsMock: boolean): Promise<AllContractInfo> {
  let wallets;
  let deployWalletIndex = 0;
  let deployWallet: SignerWithAddress;
  let signatureWalletIndex = 1;
  let signatureWallet: SignerWithAddress;
  let userWalletIndex = 2;
  let userWallet: SignerWithAddress;

  let contractAddresses: any;
  let wethContract: WETH;
  let findContract: Find;
  let factoryContract: Factory;
  let earnContract: Earn;
  let findnftContract: FindNFT;
  let mathContract: Math;
  let mortgageContract: Mortgage;
  let findNFTRenderContract: FindNFTRender;
  let mortgageRenderContract: MortgageRender;
  let mortgagePoolFactoryContract: MortgagePoolFactory;

  // get address
  wallets = await ethers.getSigners();
  deployWallet = wallets[deployWalletIndex];
  signatureWallet = wallets[signatureWalletIndex];
  userWallet = wallets[userWalletIndex];

  let names;
  if (wethIsMock) {
    if (wethIsFirst) {
      names = [
        "weth",
        "find",
        "factory",
        "earn",
        "findnft",
        "math",
        "mortgage",
        "findNFTRender",
        "mortgageRender",
        "mortgagePoolFactory",
      ];
    } else {
      names = [
        "find",
        "weth",
        "factory",
        "earn",
        "findnft",
        "math",
        "mortgage",
        "findNFTRender",
        "mortgageRender",
        "mortgagePoolFactory",
      ];
    }
    contractAddresses = await getPreContractAddressesByNames(0, names);
  } else {
      names = [
        "find",
        "factory",
        "earn",
        "findnft",
        "math",
        "mortgage",
        "findNFTRender",
        "mortgageRender",
        "mortgagePoolFactory",
      ];
      contractAddresses = await getPreContractAddressesByNames(0, names);
  }
 
  if (wethIsMock) {
    if(wethIsFirst) {
      // deploy weth
      wethContract = (await (
        await ethers.getContractFactory("WETH")
      ).deploy()) as WETH;
  
      // deploy find
      findContract = (await (
        await ethers.getContractFactory("Find")
      ).deploy(contractAddresses.mortgage)) as Find;
    } else {
      // deploy find
      findContract = (await (
        await ethers.getContractFactory("Find")
      ).deploy(contractAddresses.mortgage)) as Find;
  
      // deploy weth
      wethContract = (await (
        await ethers.getContractFactory("WETH")
      ).deploy()) as WETH;
    }
  } else {
    // deploy find
    findContract = (await (
      await ethers.getContractFactory("Find")
    ).deploy(contractAddresses.mortgage)) as Find;

    const nonfungiblePositionManager = (await ethers.getContractAt(
      "INonfungiblePositionManager",
      UNISWAP_V3_POSITIONS
    )) as INonfungiblePositionManager;

    wethContract = (await ethers.getContractAt(
      "IERC20",
      await nonfungiblePositionManager.WETH9()
    )) as WETH;
    contractAddresses["weth"] = wethContract.address;
  }
 
  // deploy factory
  factoryContract = (await (
    await ethers.getContractFactory("Factory")
  ).deploy(
    contractAddresses.find,
    contractAddresses.weth,
    contractAddresses.earn,
    contractAddresses.findnft,
    contractAddresses.mortgage,
    contractAddresses.mortgagePoolFactory,
    contractAddresses.math,
    signatureWallet.address
  )) as Factory;

  // deploy earn
  earnContract = (await (
    await ethers.getContractFactory("Earn")
  ).deploy(
    contractAddresses.find,
    contractAddresses.factory,
    contractAddresses.findnft,
    signatureWallet.address
  )) as Earn;

  // deploy findnft
  findnftContract = (await (
    await ethers.getContractFactory("FindNFT")
  ).deploy(factoryContract.address, earnContract.address, contractAddresses.findNFTRender)) as FindNFT;

  // deploy math
  mathContract = (await (
    await ethers.getContractFactory("Math")
  ).deploy(
    contractAddresses.find,
    contractAddresses.factory,
    contractAddresses.mortgage
  )) as Math;

  // deploy mortgage
  mortgageContract = (await (
    await ethers.getContractFactory("Mortgage")
  ).deploy(
    contractAddresses.find,
    contractAddresses.factory,
    contractAddresses.earn,
    contractAddresses.math,
    contractAddresses.mortgageRender,
  )) as Mortgage;

  // deploy findNFTRender
  findNFTRenderContract = (await (
    await ethers.getContractFactory("FindNFTRender")
  ).deploy(
    contractAddresses.factory,
    contractAddresses.findnft
  )) as FindNFTRender;

  // deploy mortgageRender: MortgageRender
  mortgageRenderContract = (await (
    await ethers.getContractFactory("MortgageRender")
  ).deploy(contractAddresses.mortgage)) as MortgageRender;

  // deploy mortgagePoolFactoryContract: MortgagePoolFactory;
  mortgagePoolFactoryContract = (await (
    await ethers.getContractFactory("MortgagePoolFactory")
  ).deploy(contractAddresses.factory)) as MortgagePoolFactory;

  expect(wethContract.address).eq(contractAddresses.weth);
  expect(findContract.address).eq(contractAddresses.find);
  expect(factoryContract.address).eq(contractAddresses.factory);
  expect(earnContract.address).eq(contractAddresses.earn);
  expect(findnftContract.address).eq(contractAddresses.findnft);
  expect(mathContract.address).eq(contractAddresses.math);
  expect(mortgageContract.address).eq(contractAddresses.mortgage);
  expect(findNFTRenderContract.address).eq(contractAddresses.findNFTRender);
  expect(mortgageRenderContract.address).eq(contractAddresses.mortgageRender);
  expect(mortgagePoolFactoryContract.address).eq(contractAddresses.mortgagePoolFactory);

  return {
    wallets,
    deployWalletIndex,
    deployWallet,
    signatureWalletIndex,
    signatureWallet,
    userWalletIndex,
    userWallet,

    contractAddresses,
    wethContract,
    findContract,
    factoryContract,
    earnContract,
    findnftContract,
    mathContract,
    mortgageContract,
    findNFTRenderContract,
    mortgageRenderContract,
    mortgagePoolFactoryContract
  }
}

export async function deployAllContractWethFindForEth(): Promise<AllContractInfo> {
  return deployAllContract(true, false);
}

export async function deployAllContractWethFind(): Promise<AllContractInfo> {
  return deployAllContract(true, true);
}

export async function deployAllContractFindWeth(): Promise<AllContractInfo> {
  return deployAllContract(false, true);
}

export const DEFAULT_OSP_POOL_CONFIG_0 = {
  fee: 10000,
  ospFindPool: {
    initSqrtPriceX96: BigNumber.from("78831026366734652303669917531"),
    positions: [
      { tickLower: 0, tickUpper: 600, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: 600, tickUpper: 16200, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: 16200, tickUpper: 38000, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: 38000, tickUpper: 53400, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: 53400, tickUpper: 66000, amount: BigNumber.from(10).pow(18).mul(420_000) },
      { tickLower: 66000, tickUpper: 68400, amount: BigNumber.from(10).pow(18).mul(420_000) },
      { tickLower: 68400, tickUpper: 115000, amount: BigNumber.from(10).pow(18).mul(420_000) },
    ],
  },
  findOspPool: {
    initSqrtPriceX96: BigNumber.from("79627299360338032760430980940"),
    positions: [
      { tickLower: -115000, tickUpper: -68400, amount: BigNumber.from(10).pow(18).mul(420_000) },
      { tickLower: -68400, tickUpper: -66000, amount: BigNumber.from(10).pow(18).mul(420_000) },
      { tickLower: -66000, tickUpper: -53400, amount: BigNumber.from(10).pow(18).mul(420_000) },
      { tickLower: -53400, tickUpper: -38000, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: -38000, tickUpper: -16200, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: -16200, tickUpper: -600, amount: BigNumber.from(10).pow(18).mul(210_000) },
      { tickLower: -600, tickUpper: 0, amount: BigNumber.from(10).pow(18).mul(210_000) },
    ],
  },
};

export const DEFAULT_OSP_POOL_CONFIG_1 = {
  fee: 10000,
  ospFindPool: {
    initSqrtPriceX96: BigNumber.from("78831026366734652303669917531"),
    positions: [
      { tickLower: 0, tickUpper: 115000, amount: BigNumber.from(10).pow(18).mul(1_000_000) }
    ],
  },
  findOspPool: {
    initSqrtPriceX96: BigNumber.from("79627299360338032760430980940"),
    positions: [
      { tickLower: -115000, tickUpper: 0, amount: BigNumber.from(10).pow(18).mul(1_000_000) },    
    ],
  },
};

export const DEFAULT_OSP_POOL_CONFIG_2 = {
  fee: 100,
  ospFindPool: {
    initSqrtPriceX96: BigNumber.from("78831026366734652303669917531"),
    positions: [
      { tickLower: 0, tickUpper: 600, amount: BigNumber.from(10).pow(18).mul(200_000) },
      { tickLower: 600, tickUpper: 16200, amount: BigNumber.from(10).pow(18).mul(200_000) },
      { tickLower: 16200, tickUpper: 38000, amount: BigNumber.from(10).pow(18).mul(200_000) },
      { tickLower: 38000, tickUpper: 53400, amount: BigNumber.from(10).pow(18).mul(200_000) },
      { tickLower: 53400, tickUpper: 66000, amount: BigNumber.from(10).pow(18).mul(400_000) },
      { tickLower: 66000, tickUpper: 68400, amount: BigNumber.from(10).pow(18).mul(400_000) },
      { tickLower: 68400, tickUpper: 115000, amount: BigNumber.from(10).pow(18).mul(400_000) },
    ],
  },
  findOspPool: {
    initSqrtPriceX96: BigNumber.from("79627299360338032760430980940"),
    positions: [
      { tickLower: -600, tickUpper: 0, amount: BigNumber.from(10).pow(18).mul(2_000_000) },    
    ],
  },
};

export const DEFAULT_OSP_POOL_CONFIG_3 = {
  fee: 10000,
  ospFindPool: {
    initSqrtPriceX96: BigNumber.from("78831026366734652303669917531"),
    positions: [
      { tickLower: 0, tickUpper: 4000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
      { tickLower: 4000, tickUpper: 23000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
      { tickLower: 23000, tickUpper: 46000, amount: BigNumber.from(10).pow(18).mul(2500_000) },
      { tickLower: 46000, tickUpper: 115000, amount: BigNumber.from(10).pow(18).mul(100_000) }
    ],
  },
  findOspPool: {
    initSqrtPriceX96: BigNumber.from("79627299360338032760430980940"),
    positions: [
      { tickLower: -115000, tickUpper: -46000, amount: BigNumber.from(10).pow(18).mul(100_000) },
      { tickLower: -46000, tickUpper: -23000, amount: BigNumber.from(10).pow(18).mul(2500_000) },
      { tickLower: -23000, tickUpper: -4000, amount: BigNumber.from(10).pow(18).mul(2100_000) },
      { tickLower: -4000, tickUpper: 0, amount: BigNumber.from(10).pow(18).mul(2100_000) },
    ],
  },
};
