// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract OSP is ERC20 {
  constructor(
    address factory,
    string memory name,
    string memory symbol,
    uint256 _totalSupply
  ) ERC20(name, symbol) {
    _mint(factory, _totalSupply);
  }
}
