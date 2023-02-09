import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

import {
  Factory,
  Find,
  IERC20,
  Earn,
  FindNFT,
} from "../typechain";

import {
  deployAllContractWethFind,
  DEFAULT_OSP_POOL_CONFIG_0,
} from "./share/utils";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import * as fs from "fs";


const saveNFTSVG = async (title: any, content: any) => {
  let str: string = content.split(",")[1];
  let buff = Buffer.from(str, "base64");
  str = buff.toString("utf8");
  console.log("str", str);
  const desc = JSON.parse(str).description;
  console.log("desc ", desc);
  str = JSON.parse(str).image;
  str = str.split(",")[1];
  buff = Buffer.from(str, "base64");
  str = buff.toString("utf8");
  fs.writeFile("./tmp/" + title + ".svg", str, (err: any) => {
    if (err) {
      console.error(err);
    }
  });
};

describe("NFT.show.find.osp", function () {
  let wallets: SignerWithAddress[];

  let deployWallet: SignerWithAddress;

  let signatureWallet: SignerWithAddress;
  let user1Wallet: SignerWithAddress;

  before(async function () {
    wallets = await ethers.getSigners();
    deployWallet = wallets[0];
    signatureWallet = wallets[1];
    user1Wallet = wallets[2];
  });

  describe("find.osp", function () {
    let factoryContract: Factory;
    let earnContract: Earn;
    let findnftContract: FindNFT;
    let findContract: Find;
    let osp1: IERC20;
    const osp1ProjectId = "github/1/1";

    before(async function () {
      let allInfo = await deployAllContractWethFind();
      factoryContract = allInfo.factoryContract;
      earnContract = allInfo.earnContract;
      findnftContract = allInfo.findnftContract;
      findContract = allInfo.findContract;

      // factory add config two
      await factoryContract.connect(deployWallet).addNFTPercentConfig(500, 9500);
      // addOspPoolConfig 0
      await factoryContract
        .connect(deployWallet)
        .addOspPoolConfig(DEFAULT_OSP_POOL_CONFIG_0);
      // createFindUniswapPool
      await findContract
        .connect(deployWallet)
        .transfer(factoryContract.address, await findContract.totalSupply());
      await factoryContract.connect(deployWallet).createFindUniswapPool();
    });

    it("xxx", async function () {
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
              [osp1Params.base, osp1Params.deadline, user1Wallet.address]
            )
          )
        )
      );

      await factoryContract
        .connect(user1Wallet)
        .createOSPByProjectOwner(
          osp1Params
        );

      osp1 = (await ethers.getContractAt(
        "IERC20",
        await factoryContract.projectId2OspToken(osp1ProjectId)
      )) as IERC20;

      console.log("find.cnft");
      await saveNFTSVG("find.cnft", await findnftContract.tokenURI(0));
      console.log("find.onft");
      await saveNFTSVG("find.onft", await findnftContract.tokenURI(1));
      console.log("osp.cnft");
      await saveNFTSVG("osp.cnft", await findnftContract.tokenURI(2));
      console.log("osp.onft");
      await saveNFTSVG("osp.onft", await findnftContract.tokenURI(3));
  
      console.log("find pool ", (await factoryContract.findInfo()).pool);
      console.log("osp pool ", (await factoryContract.token2OspInfo(osp1.address)).pool);
    });
  });
});
