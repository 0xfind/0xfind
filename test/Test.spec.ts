import { ethers } from "hardhat";

import { MathTest, OldMathTest } from "../typechain";

describe("MathTest", function () {
  it("test", async function () {
    const mathTest = (await (
      await ethers.getContractFactory("MathTest")
    ).deploy()) as MathTest;

    await mathTest.test();
    console.log("11111111111111111");
    const oldMathTest = (await (
      await ethers.getContractFactory("OldMathTest")
    ).deploy()) as OldMathTest;

    await oldMathTest.test();
    console.log("22222222222");
    const wallets = await ethers.getSigners();
    const a = 1;
    const b = 2;
    const signatureRaw = ethers.utils.defaultAbiCoder.encode(
      ["uint256", "uint256"],
      [a, b]
    );
    const signatureRawkeccak256 = ethers.utils.keccak256(signatureRaw);
    const signature = await wallets[0].signMessage(
      ethers.utils.arrayify(signatureRawkeccak256)
    );
    await mathTest.connect(wallets[0]).test2(a,b,signature);
    console.log("33333333333333");
    const c = 3;
    const d = 4;
    const params = {
      base: {
        b: b,
        pool: {
          a: a
        },
      },
      c: c,
      d: d
    };
    const params2 = {
      base: {
        b: b,
        pool: {
          a: a
        },
      },
      c: c,
      d: c
    };
    const signatureRaw3 = ethers.utils.defaultAbiCoder.encode(
      ["tuple(tuple(uint256 b, tuple(uint256 a) pool) base, uint256 c, uint256 d)"],
      [params]
    );
    const signatureRawkeccak2563 = ethers.utils.keccak256(signatureRaw3);
    const signature3 = await wallets[0].signMessage(
      ethers.utils.arrayify(signatureRawkeccak2563)
    );
    await mathTest.connect(wallets[0]).test3(params, signature3);
    console.log("444444444444");
    await mathTest.connect(wallets[0]).test4();
    console.log("5555555555");
    await mathTest.connect(wallets[0]).test5();
  });
});
