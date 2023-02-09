// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma abicoder v2;

import "./MockToken.sol";
import "./interfaces/IFactory.sol";
import "./libraries/UniswapCreatePoolHelper.sol";

contract MortgagePoolFactory {
  address public factory;

  constructor(address _factory) {
    factory = _factory;
  }

  modifier onlyFactory() {
    require(msg.sender == factory, "onlyFactory");
    _;
  }

  function createPool(uint256 poolConfigIndex)
    external
    onlyFactory
    returns (
      address leftPool,
      uint256[] memory leftTokenIdList,
      address rightPool,
      uint256[] memory rightTokenIdList
    )
  {
    (
      uint24 fee,
      uint160 findOspPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory findOspPoolPositions,
      uint160 ospFindPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory ospFindPoolPositions
    ) = IFactory(factory).getOspPoolConfigs(poolConfigIndex);

    uint256 totalSupply;
    {
      uint256 ospFindTotalSupply;
      uint256 findOspTotalSupply;
      for (uint256 index = 0; index < ospFindPoolPositions.length; index++) {
        ospFindTotalSupply += ospFindPoolPositions[index].amount;
      }
      for (uint256 index = 0; index < findOspPoolPositions.length; index++) {
        findOspTotalSupply += findOspPoolPositions[index].amount;
      }
      require(findOspTotalSupply == ospFindTotalSupply, "TSE");
      totalSupply = findOspTotalSupply;
    }

    address left;
    address center;
    address right;
    {
      left = address(new MockToken(address(this), totalSupply));
      center = address(new MockToken(address(this), totalSupply));
      right = address(new MockToken(address(this), totalSupply));

      (left, center) = _sort(left, center);
      (center, right) = _sort(center, right);
      (left, center) = _sort(left, center);
    }

    (leftPool, leftTokenIdList) = UniswapCreatePoolHelper.createUniswapPool(
      UniswapCreatePoolHelper.PoolParams({
        baseToken: center,
        newToken: left,
        fee: fee,
        initSqrtPriceX96: ospFindPoolInitSqrtPriceX96,
        recipient: address(this),
        positions: ospFindPoolPositions
      })
    );

    (rightPool, rightTokenIdList) = UniswapCreatePoolHelper.createUniswapPool(
      UniswapCreatePoolHelper.PoolParams({
        baseToken: center,
        newToken: right,
        fee: fee,
        initSqrtPriceX96: findOspPoolInitSqrtPriceX96,
        recipient: address(this),
        positions: findOspPoolPositions
      })
    );
  }

  function _sort(address a, address b)
    private
    pure
    returns (address min, address max)
  {
    if (b < a) {
      min = b;
      max = a;
    } else {
      min = a;
      max = b;
    }
  }
}
