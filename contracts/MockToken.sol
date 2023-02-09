// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract MockToken is ERC20 {
  constructor(address math, uint256 _totalSupply) ERC20("mock", "MOCK") {
    _mint(math, _totalSupply);
  }
}
