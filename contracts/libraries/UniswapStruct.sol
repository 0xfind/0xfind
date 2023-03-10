// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;

library UniswapStruct {
  struct Position {
    int24 tickLower;
    int24 tickUpper;
    uint256 amount;
  }
}
