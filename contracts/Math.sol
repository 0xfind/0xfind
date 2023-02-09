// SPDX-License-Identifier: MIT
pragma solidity =0.7.6;
pragma abicoder v2;

import "./libraries/Math/TickMath.sol";
import "./libraries/Math/Position.sol";
import "./libraries/Math/Tick.sol";
import "./libraries/Math/TickBitmap.sol";
import "./libraries/Math/SafeCast.sol";
import "./libraries/Math/LowGasSafeMath.sol";
import "./libraries/Math/FullMath.sol";
import "./libraries/Math/FixedPoint128.sol";
import "./libraries/Math/SwapMath.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/external/IUniswapV3Pool.sol";
import "./interfaces/external/INonfungiblePositionManager.sol";
import "./interfaces/IERC20M.sol";
import "./libraries/UniswapConstants.sol";

contract Math {
  using LowGasSafeMath for uint256;
  using LowGasSafeMath for int256;
  using SafeCast for uint256;
  using SafeCast for int256;
  using Tick for mapping(int24 => Tick.Info);
  using TickBitmap for mapping(int16 => uint256);
  using Position for mapping(bytes32 => Position.Info);
  using Position for Position.Info;

  struct MortgageParamsPosition {
    int24 tickLower;
    int24 tickUpper;
    uint128 liquidity;
  }

  struct Slot0 {
    uint160 sqrtPriceX96;
    int24 tick;
    bool unlocked;
  }

  struct SwapCache {
    uint128 liquidityStart;
  }

  struct StepComputations {
    uint160 sqrtPriceStartX96;
    int24 tickNext;
    bool initialized;
    uint160 sqrtPriceNextX96;
    uint256 amountIn;
    uint256 amountOut;
    uint256 feeAmount;
  }

  struct SwapState {
    int256 amountSpecifiedRemaining;
    int256 amountCalculated;
    uint160 sqrtPriceX96;
    int24 tick;
    uint128 liquidity;
  }

  struct PoolInfo {
    uint24 fee;
    int24 tickSpacing;
    uint128 maxLiquidityPerTick;
    uint128 liquidity;
    Slot0 slot0;
    uint256 balance0;
    uint256 balance1;
    mapping(int24 => Tick.Info) ticks;
    mapping(int16 => uint256) tickBitmap;
    mapping(bytes32 => Position.Info) positions;
  }

  address public immutable find;
  address public immutable factory;
  address public immutable mortgageAddress;

  mapping(uint256 => PoolInfo) public ospFindPools;
  mapping(uint256 => PoolInfo) public findOspPools;

  constructor(
    address _find,
    address _factory,
    address _mortgage
  ) {
    find = _find;
    factory = _factory;
    mortgageAddress = _mortgage;
  }

  modifier onlyFactory() {
    require(msg.sender == factory, "onlyFactory");
    _;
  }

  modifier onlyMortgage() {
    require(msg.sender == mortgageAddress, "onlyMortgage");
    _;
  }

  function createPoolInfo(
    uint256 poolConfigIndex,
    address pool,
    uint256[] memory tokenIdList,
    bool isFindOspPool
  ) external onlyFactory {
    if (isFindOspPool) {
      PoolInfo storage poolInfo = findOspPools[poolConfigIndex];
      _createPoolInfo(poolInfo, pool, tokenIdList);
    } else {
      PoolInfo storage poolInfo = ospFindPools[poolConfigIndex];
      _createPoolInfo(poolInfo, pool, tokenIdList);
    }
  }

  function mortgage(address osp, uint256 ospAmount)
    external
    onlyMortgage
    returns (uint256 findAmount)
  {
    (uint256 poolConfigIndex, , , , , ) = IFactory(factory).token2OspInfo(osp);

    if (osp < find) {
      PoolInfo storage poolInfo = ospFindPools[poolConfigIndex];
      findAmount = _buyOsp(osp, ospAmount, poolInfo);
      _sellOsp(osp, ospAmount, poolInfo);
    } else {
      PoolInfo storage poolInfo = findOspPools[poolConfigIndex];
      findAmount = _buyOsp(osp, ospAmount, poolInfo);
      _sellOsp(osp, ospAmount, poolInfo);
    }
  }

  function _createPoolInfo(
    PoolInfo storage poolInfo,
    address pool,
    uint256[] memory tokenIdList
  ) private {
    require(poolInfo.fee == 0);

    address token0 = IUniswapV3Pool(pool).token0();
    address token1 = IUniswapV3Pool(pool).token1();

    uint256 balance0 = IERC20M(token0).balanceOf(pool);
    uint256 balance1 = IERC20M(token1).balanceOf(pool);

    poolInfo.fee = IUniswapV3Pool(pool).fee();
    poolInfo.tickSpacing = IUniswapV3Pool(pool).tickSpacing();
    poolInfo.maxLiquidityPerTick = IUniswapV3Pool(pool).maxLiquidityPerTick();
    poolInfo.liquidity = IUniswapV3Pool(pool).liquidity();
    (
      poolInfo.slot0.sqrtPriceX96,
      poolInfo.slot0.tick,
      ,
      ,
      ,
      ,

    ) = IUniswapV3Pool(pool).slot0();
    poolInfo.slot0.unlocked = true;

    poolInfo.balance0 = balance0;
    poolInfo.balance1 = balance1;

    for (uint256 index = 0; index < tokenIdList.length; index++) {
      uint256 tokenId = tokenIdList[index];

      int24 tickLower;
      int24 tickUpper;
      uint128 liquidity;

      (
        ,
        ,
        ,
        ,
        ,
        tickLower,
        tickUpper,
        liquidity,
        ,
        ,
        ,

      ) = INonfungiblePositionManager(UniswapConstants.UNISWAP_V3_POSITIONS)
        .positions(tokenId);
      MortgageParamsPosition memory position = MortgageParamsPosition({
        tickLower: tickLower,
        tickUpper: tickUpper,
        liquidity: liquidity
      });
      _updatePosition(poolInfo, position);
    }
  }

  function _buyOsp(
    address osp,
    uint256 ospAmountOut,
    PoolInfo storage poolInfo
  ) private returns (uint256 findAmountIn) {
    bool zeroForOne = find < osp;

    int256 amountSpecified = -SafeCast.toInt256(ospAmountOut);

    (int256 amount0, int256 amount1) = _swap(
      poolInfo,
      zeroForOne,
      amountSpecified
    );

    if (zeroForOne) {
      findAmountIn = uint256(amount0);
      require(ospAmountOut == uint256(-amount1), "MOE1");
    } else {
      findAmountIn = uint256(amount1);
      require(ospAmountOut == uint256(-amount0), "MOE2");
    }
  }

  function _sellOsp(
    address osp,
    uint256 ospAmountIn,
    PoolInfo storage poolInfo
  ) private {
    bool zeroForOne = osp < find;
    int256 amountSpecified = SafeCast.toInt256(ospAmountIn);

    (int256 amount0, int256 amount1) = _swap(
      poolInfo,
      zeroForOne,
      amountSpecified
    );

    if (zeroForOne) {
      require(ospAmountIn == uint256(amount0), "MIE1");
    } else {
      require(ospAmountIn == uint256(amount1), "MIE2");
    }
  }

  function _updatePosition(
    PoolInfo storage poolInfo,
    MortgageParamsPosition memory paramsPosition
  ) private returns (Position.Info storage position) {
    int128 liquidityDelta = int128(paramsPosition.liquidity);
    int24 tickLower = paramsPosition.tickLower;
    int24 tickUpper = paramsPosition.tickUpper;

    position = poolInfo.positions.get(address(this), tickLower, tickUpper);
    position.update(liquidityDelta);

    // if we need to update the ticks, do it
    if (liquidityDelta != 0) {
      bool flippedLower = poolInfo.ticks.update(
        tickLower,
        liquidityDelta,
        false,
        poolInfo.maxLiquidityPerTick
      );
      bool flippedUpper = poolInfo.ticks.update(
        tickUpper,
        liquidityDelta,
        true,
        poolInfo.maxLiquidityPerTick
      );

      if (flippedLower) {
        poolInfo.tickBitmap.flipTick(tickLower, poolInfo.tickSpacing);
      }
      if (flippedUpper) {
        poolInfo.tickBitmap.flipTick(tickUpper, poolInfo.tickSpacing);
      }
    }
  }

  function _swap(
    PoolInfo storage poolInfo,
    bool zeroForOne,
    int256 amountSpecified
  ) private returns (int256 amount0, int256 amount1) {
    uint160 sqrtPriceLimitX96 = zeroForOne
      ? TickMath.MIN_SQRT_RATIO + 1
      : TickMath.MAX_SQRT_RATIO - 1;

    require(amountSpecified != 0, "AS");

    Slot0 memory slot0Start = poolInfo.slot0;

    require(slot0Start.unlocked, "LOK");
    require(
      zeroForOne
        ? sqrtPriceLimitX96 < slot0Start.sqrtPriceX96 &&
          sqrtPriceLimitX96 > TickMath.MIN_SQRT_RATIO
        : sqrtPriceLimitX96 > slot0Start.sqrtPriceX96 &&
          sqrtPriceLimitX96 < TickMath.MAX_SQRT_RATIO,
      "SPL"
    );

    poolInfo.slot0.unlocked = false;

    SwapCache memory cache = SwapCache({ liquidityStart: poolInfo.liquidity });

    bool exactInput = amountSpecified > 0;

    SwapState memory state = SwapState({
      amountSpecifiedRemaining: amountSpecified,
      amountCalculated: 0,
      sqrtPriceX96: slot0Start.sqrtPriceX96,
      tick: slot0Start.tick,
      liquidity: cache.liquidityStart
    });

    // continue swapping as long as we haven't used the entire input/output and haven't reached the price limit
    while (
      state.amountSpecifiedRemaining != 0 &&
      state.sqrtPriceX96 != sqrtPriceLimitX96
    ) {
      StepComputations memory step;

      step.sqrtPriceStartX96 = state.sqrtPriceX96;

      (step.tickNext, step.initialized) = poolInfo
        .tickBitmap
        .nextInitializedTickWithinOneWord(
          state.tick,
          poolInfo.tickSpacing,
          zeroForOne
        );

      // ensure that we do not overshoot the min/max tick, as the tick bitmap is not aware of these bounds
      if (step.tickNext < TickMath.MIN_TICK) {
        step.tickNext = TickMath.MIN_TICK;
      } else if (step.tickNext > TickMath.MAX_TICK) {
        step.tickNext = TickMath.MAX_TICK;
      }

      // get the price for the next tick
      step.sqrtPriceNextX96 = TickMath.getSqrtRatioAtTick(step.tickNext);

      // compute values to swap to the target tick, price limit, or point where input/output amount is exhausted
      (
        state.sqrtPriceX96,
        step.amountIn,
        step.amountOut,
        step.feeAmount
      ) = SwapMath.computeSwapStep(
        state.sqrtPriceX96,
        (
          zeroForOne
            ? step.sqrtPriceNextX96 < sqrtPriceLimitX96
            : step.sqrtPriceNextX96 > sqrtPriceLimitX96
        )
          ? sqrtPriceLimitX96
          : step.sqrtPriceNextX96,
        state.liquidity,
        state.amountSpecifiedRemaining,
        0
      );

      if (exactInput) {
        state.amountSpecifiedRemaining -= (step.amountIn + step.feeAmount)
          .toInt256();
        state.amountCalculated = state.amountCalculated.sub(
          step.amountOut.toInt256()
        );
      } else {
        state.amountSpecifiedRemaining += step.amountOut.toInt256();
        state.amountCalculated = state.amountCalculated.add(
          (step.amountIn + step.feeAmount).toInt256()
        );
      }

      // shift tick if we reached the next price
      if (state.sqrtPriceX96 == step.sqrtPriceNextX96) {
        // if the tick is initialized, run the tick transition
        if (step.initialized) {
          int128 liquidityNet = poolInfo.ticks.cross(step.tickNext);
          // if we're moving leftward, we interpret liquidityNet as the opposite sign
          // safe because liquidityNet cannot be type(int128).min
          if (zeroForOne) liquidityNet = -liquidityNet;

          state.liquidity = LiquidityMath.addDelta(
            state.liquidity,
            liquidityNet
          );
        }

        state.tick = zeroForOne ? step.tickNext - 1 : step.tickNext;
      } else if (state.sqrtPriceX96 != step.sqrtPriceStartX96) {
        // recompute unless we're on a lower tick boundary (i.e. already transitioned ticks), and haven't moved
        state.tick = TickMath.getTickAtSqrtRatio(state.sqrtPriceX96);
      }
    }

    // update tick and write an oracle entry if the tick change
    if (state.tick != slot0Start.tick) {
      (poolInfo.slot0.sqrtPriceX96, poolInfo.slot0.tick) = (
        state.sqrtPriceX96,
        state.tick
      );
    } else {
      // otherwise just update the price
      poolInfo.slot0.sqrtPriceX96 = state.sqrtPriceX96;
    }

    // update liquidity if it changed
    if (cache.liquidityStart != state.liquidity)
      poolInfo.liquidity = state.liquidity;

    (amount0, amount1) = zeroForOne == exactInput
      ? (
        amountSpecified - state.amountSpecifiedRemaining,
        state.amountCalculated
      )
      : (
        state.amountCalculated,
        amountSpecified - state.amountSpecifiedRemaining
      );

    if (zeroForOne) {
      if (amount1 < 0) {
        require(poolInfo.balance1 >= uint256(-amount1), "BE1");
        poolInfo.balance1 = poolInfo.balance1.sub(uint256(-amount1));
      }
      poolInfo.balance0 = poolInfo.balance0.add(uint256(amount0));
    } else {
      if (amount0 < 0) {
        require(poolInfo.balance0 >= uint256(-amount0), "BE2");
        poolInfo.balance0 = poolInfo.balance0.sub(uint256(-amount0));
      }
      poolInfo.balance1 = poolInfo.balance1.add(uint256(amount1));
    }
    poolInfo.slot0.unlocked = true;
  }
}
