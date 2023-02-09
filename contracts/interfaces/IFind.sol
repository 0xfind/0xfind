// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IFind {
    function mint(uint256 amount) external;

    function burn(uint256 amount) external;

    function transfer(address to, uint256 amount) external returns (bool);
}
