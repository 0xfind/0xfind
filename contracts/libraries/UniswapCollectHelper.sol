// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/external/ISwapRouter02.sol";
import "../interfaces/external/INonfungiblePositionManager.sol";
import "./UniswapConstants.sol";
import "./SwapRouterHelper.sol";

library UniswapCollectHelper {
  struct FeeResult {
    address token0;
    address token1;
    uint256 token0Add;
    uint256 token1Add;
  }

  struct SwapPoolFeeToTokenOutParams {
    address token0;
    address token1;
    uint256 token0Amount;
    uint256 token1Amount;
    uint24 fee;
    address tokenOut;
    address recipient;
  }

  function collectFeeWithLpList(
    uint256[] memory lpTokenIdList,
    address recipient
  ) internal returns (FeeResult memory result) {
    result.token0Add = 0;
    result.token1Add = 0;

    for (uint256 index = 0; index < lpTokenIdList.length; index++) {
      FeeResult memory sResult = collectFeeWithLp(
        lpTokenIdList[index],
        recipient
      );
      if (index == 0) {
        result.token0 = sResult.token0;
        result.token1 = sResult.token1;
      } else {
        require(result.token0 == sResult.token0, "CFE");
        require(result.token1 == sResult.token1, "CFE");
      }
      result.token0Add += sResult.token0Add;
      result.token1Add += sResult.token1Add;
    }
  }

  function collectFeeWithLp(uint256 lpTokenId, address recipient)
    internal
    returns (FeeResult memory result)
  {
    INonfungiblePositionManager inpm = INonfungiblePositionManager(
      UniswapConstants.UNISWAP_V3_POSITIONS
    );

    (, , result.token0, result.token1, , , , , , , , ) = inpm.positions(
      lpTokenId
    );

    (result.token0Add, result.token1Add) = inpm.collect(
      INonfungiblePositionManager.CollectParams({
        tokenId: lpTokenId,
        recipient: recipient,
        amount0Max: type(uint128).max,
        amount1Max: type(uint128).max
      })
    );
  }

  function swapPoolFeeToTokenOut(SwapPoolFeeToTokenOutParams memory params)
    internal
    returns (uint256 amountOut)
  {
    uint256 amountOutPart1;
    uint256 otherAmount;
    address other;
    if (params.token0 == params.tokenOut) {
      amountOutPart1 = params.token0Amount;
      otherAmount = params.token1Amount;
      other = params.token1;
    } else {
      require(params.token1 == params.tokenOut);
      amountOutPart1 = params.token1Amount;
      otherAmount = params.token0Amount;
      other = params.token0;
    }
    uint256 amountOutPart2 = 0;
    if (otherAmount > 0) {
      amountOutPart2 = swapInputSingle(
        other,
        params.tokenOut,
        params.fee,
        otherAmount,
        params.recipient
      );
    }
    amountOut = amountOutPart1 + amountOutPart2;
  }

  function swapInputSingle(
    address tokenIn,
    address tokenOut,
    uint24 fee,
    uint256 amountIn,
    address recipient
  ) internal returns (uint256 amountOut) {
    if (
      IERC20(tokenIn).allowance(
        address(this),
        UniswapConstants.UNISWAP_ROUTER
      ) < amountIn
    ) {
      IERC20(tokenIn).approve(
        UniswapConstants.UNISWAP_ROUTER,
        type(uint256).max
      );
    }

    amountOut = SwapRouterHelper.exactInputSingle(
      ISwapRouter02.ExactInputSingleParams({
        tokenIn: tokenIn,
        tokenOut: tokenOut,
        fee: fee,
        recipient: recipient,
        amountIn: amountIn,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      })
    );
  }
}
