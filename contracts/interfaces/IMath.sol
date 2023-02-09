// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMath {
  function createPoolInfo(
    uint256 poolConfigIndex,
    address pool,
    uint256[] memory tokenIdList,
    bool isFindOspPool
  ) external;

  function mortgage(address osp, uint256 ospAmount)
    external
    returns (uint256 findAmount);
}
