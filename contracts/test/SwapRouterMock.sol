// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import "../libraries/UniswapConstants.sol";
import "../interfaces/external/ISwapRouter02.sol";
import "../libraries/TransferHelper.sol";
import "hardhat/console.sol";

contract SwapRouterMock {
  constructor() {}

  function exactOutputSingleAndExactInputSingle(
    uint256 amountIn,
    ISwapRouter02.ExactOutputSingleParams memory params1,
    ISwapRouter02.ExactInputSingleParams memory params2
  ) external returns (uint256 amountOut) {
    TransferHelper.safeTransferFrom(
      params1.tokenIn,
      msg.sender,
      address(this),
      amountIn
    );

    IERC20(params1.tokenIn).approve(
      UniswapConstants.UNISWAP_ROUTER,
      type(uint256).max
    );
    IERC20(params2.tokenIn).approve(
      UniswapConstants.UNISWAP_ROUTER,
      type(uint256).max
    );

    uint256 balanceOfBefore1 = IERC20(params1.tokenOut).balanceOf(
      address(this)
    );
    uint256 amountIn1 = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER)
      .exactOutputSingle(params1);
    uint256 balanceOfAfter1 = IERC20(params1.tokenOut).balanceOf(address(this));
    require(balanceOfAfter1 - balanceOfBefore1 == params1.amountOut);
    console.log("amountIn", amountIn1);

    uint256 balanceOfBefore2 = IERC20(params2.tokenIn).balanceOf(address(this));
    amountOut = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).exactInputSingle(
        params2
      );
    uint256 balanceOfAfter2 = IERC20(params2.tokenIn).balanceOf(address(this));
    require(balanceOfBefore2 - balanceOfAfter2 == params2.amountIn);
    console.log("amountOut", amountOut);
  }
}
