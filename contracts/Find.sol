// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Find is ERC20 {
  address public immutable mortgage;

  event Mint(uint256 amount);
  event Burn(uint256 amount);

  constructor(address _mortgage) ERC20("find", "FIND") {
    _mint(_msgSender(), 100_000_000_000 * 10**decimals());
    mortgage = _mortgage;
  }

  function mint(uint256 amount) external {
    require(_msgSender() == mortgage, "NR");
    _mint(_msgSender(), amount);
    emit Mint(amount);
  }

  function burn(uint256 amount) external {
    require(_msgSender() == mortgage, "NR");
    _burn(_msgSender(), amount);
    emit Burn(amount);
  }
}
