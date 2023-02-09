// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "hardhat/console.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "../libraries/BokkyPooBahsDateTimeLibrary.sol";

contract MathTest {
  using ECDSA for bytes32;

  constructor() {}

  function test() external view {
    uint8 a = 1;
    int24 b = int24(uint24(a));
    console.logInt(b);

    uint8 c = 255;
    int24 d = int24(uint24(c));
    console.logInt(d);

    int24 tick = 8388607;
    uint8 bitPos = uint8(int8(tick % 256));
    console.logUint(bitPos);

    uint8 bitPos2 = 255;
    int24 tick2 = int24(uint24(bitPos2));
    console.logInt(tick2);
  }

  function test2(
    uint256 a,
    uint256 b,
    bytes memory signature
  ) external view {
    bytes32 raw = keccak256(abi.encode(a, b));
    require(
      raw.toEthSignedMessageHash().recover(signature) == msg.sender,
      "SE"
    );
  }

  struct Test3ParamsBasePool {
    uint256 a;
  }
  struct Test3ParamsBase {
    uint256 b;
    Test3ParamsBasePool pool;
  }
  struct Test3Params {
    Test3ParamsBase base;
    uint256 c;
    uint256 d;
  }

  function test3(Test3Params memory params, bytes memory signature)
    external
    view
  {
    bytes32 raw = keccak256(abi.encode(params));
    require(
      raw.toEthSignedMessageHash().recover(signature) == msg.sender,
      "SE"
    );
  }

  function test4()
    external
    view
    returns (
      uint256 year,
      uint256 month,
      uint256 day
    )
  {
    (year, month, day) = BokkyPooBahsDateTimeLibrary.timestampToDate(
      block.timestamp
    );
    console.logUint(block.timestamp);
    console.logUint(year);
    console.logUint(month);
    console.logUint(day);
  }

  function test5() external view {
    bytes memory b = bytes("0xREDIS");
    bytes memory c = new bytes(2);
    bytes memory d = new bytes(b.length - 2);
    for (uint256 index = 0; index < 2; index++) {
      c[index] = b[index];
    }
    for (uint256 index = 2; index < b.length; index++) {
      d[index - 2] = b[index];
    }
    console.log(string(c));
    console.log(string(d));
  }
}
