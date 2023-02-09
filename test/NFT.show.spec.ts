import { ethers } from "hardhat";

import { FindNFT, FactoryMockForNFT, FindNFTRender } from "../typechain";

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

describe("NFT.show", function () {
  it("cnft", async function () {
    const wallets = await ethers.getSigners();

    const factoryMock = (await (
      await ethers.getContractFactory("FactoryMockForNFT")
    ).deploy(wallets[0].address)) as FactoryMockForNFT;

    const findnft = (await (
      await ethers.getContractFactory("FindNFT")
    ).deploy(factoryMock.address, wallets[1].address, wallets[1].address)) as FindNFT;

    const findNFTRender = (await (
      await ethers.getContractFactory("FindNFTRender")
    ).deploy(factoryMock.address, findnft.address)) as FindNFTRender;

    await findnft.setFindnftRender(findNFTRender.address);

    await factoryMock.mint(findnft.address, {
      name: "github.com/show/show",
      symbol: "0xSHOW",
      projectId: "github/1234/4561",
      stars: 1234,
      token: wallets[1].address,
      percent: 710,
      isCnft: true,
      owner: wallets[2].address,
    });
    console.log("factoryMock", factoryMock.address);
    const show = await findnft.tokenURI(0);
    await saveNFTSVG("cnft.no", show);

    await findnft.connect(wallets[1]).claim(0);
    const show2 = await findnft.tokenURI(0);
    await saveNFTSVG("cnft.claim", show2);
  });

  it("onft", async function () {
    const wallets = await ethers.getSigners();

    const factoryMock = (await (
      await ethers.getContractFactory("FactoryMockForNFT")
    ).deploy(wallets[0].address)) as FactoryMockForNFT;

    const findnft = (await (
      await ethers.getContractFactory("FindNFT")
    ).deploy(factoryMock.address, wallets[1].address, wallets[1].address)) as FindNFT;

    const findNFTRender = (await (
      await ethers.getContractFactory("FindNFTRender")
    ).deploy(factoryMock.address, findnft.address)) as FindNFTRender;

    await findnft.setFindnftRender(findNFTRender.address);

    await factoryMock.mint(findnft.address, {
      name: "github.com/show/show",
      symbol: "0xSHOW",
      projectId: "github/1234/4561",
      stars: 1234,
      token: wallets[1].address,
      percent: 9290,
      isCnft: false,
      owner: wallets[2].address,
    });
    console.log("factoryMock", factoryMock.address);
    const show = await findnft.tokenURI(0);
    await saveNFTSVG("onft.no", show);

    await findnft.connect(wallets[1]).claim(0);
    const show2 = await findnft.tokenURI(0);
    await saveNFTSVG("onft.claim", show2);
  });
});
