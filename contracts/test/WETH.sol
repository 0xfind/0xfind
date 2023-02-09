// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract WETH is ERC20 {
    string public constant NAME = "WETH";
    string public constant SYMBOL = "WETH";

    constructor() ERC20(NAME, SYMBOL) {
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }
}
