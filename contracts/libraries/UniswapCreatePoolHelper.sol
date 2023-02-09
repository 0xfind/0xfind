// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/external/INonfungiblePositionManager.sol";
import "./UniswapConstants.sol";
import "./UniswapStruct.sol";

library UniswapCreatePoolHelper {
  struct PoolParams {
    address baseToken;
    address newToken;
    uint24 fee;
    uint160 initSqrtPriceX96;
    address recipient;
    UniswapStruct.Position[] positions;
  }

  function createUniswapPool(PoolParams memory params)
    internal
    returns (address pool, uint256[] memory tokenIdList)
  {
    address token0;
    address token1;
    {
      if (params.baseToken < params.newToken) {
        token0 = params.baseToken;
        token1 = params.newToken;
      } else {
        token0 = params.newToken;
        token1 = params.baseToken;
      }
    }

    pool = INonfungiblePositionManager(UniswapConstants.UNISWAP_V3_POSITIONS)
      .createAndInitializePoolIfNecessary(
        token0,
        token1,
        params.fee,
        params.initSqrtPriceX96
      );

    IERC20(params.newToken).approve(
      UniswapConstants.UNISWAP_V3_POSITIONS,
      type(uint256).max
    );

    uint256 amount0Desired;
    uint256 amount1Desired;
    tokenIdList = new uint256[](params.positions.length);
    for (uint256 index = 0; index < params.positions.length; index++) {
      if (token1 == params.newToken) {
        amount0Desired = 0;
        amount1Desired = params.positions[index].amount;
      }
      if (token0 == params.newToken) {
        amount0Desired = params.positions[index].amount;
        amount1Desired = 0;
      }

      INonfungiblePositionManager.MintParams memory mintParams;
      {
        mintParams = INonfungiblePositionManager.MintParams({
          token0: token0,
          token1: token1,
          fee: params.fee,
          tickLower: params.positions[index].tickLower,
          tickUpper: params.positions[index].tickUpper,
          amount0Desired: amount0Desired,
          amount1Desired: amount1Desired,
          amount0Min: 0,
          amount1Min: 0,
          recipient: params.recipient,
          deadline: block.timestamp
        });
      }

      (uint256 tokenId, , , ) = INonfungiblePositionManager(
        UniswapConstants.UNISWAP_V3_POSITIONS
      ).mint(mintParams);
      tokenIdList[index] = tokenId;
    }
  }
}
