// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMortgagePoolFactory {
  function createPool(uint256 poolConfigIndex)
    external
    returns (
      address leftPool,
      uint256[] memory leftTokenIdList,
      address rightPool,
      uint256[] memory rightTokenIdList
    );
}
