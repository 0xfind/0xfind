// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
  string public constant NAME = "USDT";
  string public constant SYMBOL = "USDT";

  constructor() ERC20(NAME, SYMBOL) {
    _mint(msg.sender, 1_000_000_000 * 10**decimals());
  }

  function decimals() public pure override returns (uint8) {
    return 6;
  }
}
