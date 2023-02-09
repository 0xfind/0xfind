// SPDX-License-Identifier: MIT
pragma solidity >=0.7.6;
pragma abicoder v2;

import "../libraries/UniswapStruct.sol";

interface IFactory {
  function getOspPoolConfigs(uint256 index)
    external
    view
    returns (
      uint24 fee,
      uint160 findOspPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory findOspPoolPositions,
      uint160 ospFindPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory ospFindPoolPositions
    );

  function findInfo()
    external
    view
    returns (
      address token,
      address pool,
      uint256 cnftTokenId,
      uint256 onftTokenId,
      uint24 fee
    );

  function findLpTokenIdList()
    external
    view
    returns (uint256[] memory lpTokenIdList);

  function token2OspInfo(address _token)
    external
    view
    returns (
      uint256 poolConfigIndex,
      uint256 stars,
      address pool,
      uint256 cnftTokenId,
      uint256 onftTokenId,
      string memory projectId
    );

  function ospLpTokenIdList(address osp)
    external
    view
    returns (uint256[] memory lpTokenIdList);
}
