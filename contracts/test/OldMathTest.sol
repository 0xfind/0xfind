// SPDX-License-Identifier: MIT
pragma solidity >=0.5.0;

import "hardhat/console.sol";

contract OldMathTest {
  constructor() {}

  function test() external view {
    uint8 a = 1;
    int24 b = int24(a);
    console.logInt(b);

    uint8 c = 255;
    int24 d = int24(c);
    console.logInt(d);

    int24 tick = 8388607;
    uint8 bitPos = uint8(tick % 256);
    console.logUint(bitPos);

    uint8 bitPos2 = 255;
    int24 tick2 = int24(bitPos2);
    console.logInt(tick2);

    uint256 denominator = 12;
    uint256 twos = -denominator & denominator;
    console.logUint(twos);
    console.logUint(-denominator);
    console.log(1);
  }
}
