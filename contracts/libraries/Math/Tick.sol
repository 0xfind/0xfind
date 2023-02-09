// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.5.0;

import "./LowGasSafeMath.sol";
import "./SafeCast.sol";

import "./TickMath.sol";
import "./LiquidityMath.sol";

/// @title Tick
/// @notice Contains functions for managing tick processes and relevant calculations
library Tick {
  using LowGasSafeMath for int256;
  using SafeCast for int256;

  // info stored for each initialized individual tick
  struct Info {
    // the total position liquidity that references this tick
    uint128 liquidityGross;
    // amount of net liquidity added (subtracted) when tick is crossed from left to right (right to left),
    int128 liquidityNet;
    // true iff the tick is initialized, i.e. the value is exactly equivalent to the expression liquidityGross != 0
    // these 8 bits are set to prevent fresh sstores when crossing newly initialized ticks
    bool initialized;
  }

  /// @notice Updates a tick and returns true if the tick was flipped from initialized to uninitialized, or vice versa
  /// @param self The mapping containing all tick information for initialized ticks
  /// @param tick The tick that will be updated
  /// @param liquidityDelta A new amount of liquidity to be added (subtracted) when tick is crossed from left to right (right to left)
  /// @param upper true for updating a position's upper tick, or false for updating a position's lower tick
  /// @param maxLiquidity The maximum liquidity allocation for a single tick
  /// @return flipped Whether the tick was flipped from initialized to uninitialized, or vice versa
  function update(
    mapping(int24 => Tick.Info) storage self,
    int24 tick,
    int128 liquidityDelta,
    bool upper,
    uint128 maxLiquidity
  ) internal returns (bool flipped) {
    Tick.Info storage info = self[tick];

    uint128 liquidityGrossBefore = info.liquidityGross;
    uint128 liquidityGrossAfter = LiquidityMath.addDelta(
      liquidityGrossBefore,
      liquidityDelta
    );

    require(liquidityGrossAfter <= maxLiquidity, "LO");

    flipped = (liquidityGrossAfter == 0) != (liquidityGrossBefore == 0);

    if (liquidityGrossBefore == 0) {
      // by convention, we assume that all growth before a tick was initialized happened _below_ the tick
      info.initialized = true;
    }

    info.liquidityGross = liquidityGrossAfter;

    // when the lower (upper) tick is crossed left to right (right to left), liquidity must be added (removed)
    info.liquidityNet = upper
      ? int256(info.liquidityNet).sub(liquidityDelta).toInt128()
      : int256(info.liquidityNet).add(liquidityDelta).toInt128();
  }

  function cross(mapping(int24 => Tick.Info) storage self, int24 tick)
    internal
    view
    returns (int128 liquidityNet)
  {
    Tick.Info storage info = self[tick];
    liquidityNet = info.liquidityNet;
  }
}
