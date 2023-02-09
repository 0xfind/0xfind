// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../interfaces/external/ISwapRouter02.sol";

import "./UniswapConstants.sol";
import "./Path.sol";

library SwapRouterHelper {
  function exactInputSingle(ISwapRouter02.ExactInputSingleParams memory params)
    internal
    returns (uint256 amountOut)
  {
    uint256 balanceOfBefore = IERC20(params.tokenIn).balanceOf(address(this));

    amountOut = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).exactInputSingle(
        params
      );

    uint256 balanceOfAfter = IERC20(params.tokenIn).balanceOf(address(this));
    require(balanceOfBefore - balanceOfAfter == params.amountIn, "IE");
  }

  function exactInput(ISwapRouter02.ExactInputParams memory params)
    internal
    returns (uint256 amountOut)
  {
    uint256[] memory balanceOfsBefore = _getPathTokenBalanceOf(params.path);

    amountOut = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).exactInput(
      params
    );
    uint256[] memory balanceOfsAfter = _getPathTokenBalanceOf(params.path);
    _assertBalanceOf(balanceOfsBefore, balanceOfsAfter, params.amountIn);
  }

  function _assertBalanceOf(
    uint256[] memory balanceOfsBefore,
    uint256[] memory balanceOfsAfter,
    uint256 amountIn
  ) private pure {
    require(balanceOfsBefore.length == balanceOfsAfter.length, "LE");

    for (uint256 i = 0; i < balanceOfsBefore.length; i++) {
      if (i == 0) {
        require(balanceOfsBefore[i] - balanceOfsAfter[i] == amountIn, "LEF0");
      } else {
        require(balanceOfsBefore[i] == balanceOfsAfter[i], "LEF1");
      }
    }
  }

  function _getPathTokenBalanceOf(bytes memory path)
    private
    view
    returns (uint256[] memory balanceOfs)
  {
    balanceOfs = new uint256[](Path.numPools(path));
    for (uint256 i = 0; i < balanceOfs.length; i++) {
      if (i == 0) {
        (address tokenIn, , ) = Path.decodeFirstPool(path);
        balanceOfs[i] = IERC20(tokenIn).balanceOf(address(this));
      } else {
        path = Path.skipToken(path);
        (address tokenIn, , ) = Path.decodeFirstPool(path);
        balanceOfs[i] = IERC20(tokenIn).balanceOf(
          UniswapConstants.UNISWAP_ROUTER
        );
      }
    }
  }
}
