// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract DAI is ERC20 {
    string public constant NAME = "DAI";
    string public constant SYMBOL = "DAI";

    constructor() ERC20(NAME, SYMBOL) {
        _mint(msg.sender, 1_000_000_000 * 10**decimals());
    }
}
