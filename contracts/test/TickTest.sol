// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;
pragma abicoder v2;

import '../libraries/Math/Tick.sol';

contract TickTest {
    using Tick for mapping(int24 => Tick.Info);

    mapping(int24 => Tick.Info) public ticks;

    function setTick(int24 tick, Tick.Info memory info) external {
        ticks[tick] = info;
    }

    function update(
        int24 tick,
        int128 liquidityDelta,
        bool upper,
        uint128 maxLiquidity
    ) external returns (bool flipped) {
        return
            ticks.update(
                tick,
                liquidityDelta,
                upper,
                maxLiquidity
            );
    }

    function cross(int24 tick) external returns (int128 liquidityNet) {
        return ticks.cross(tick);
    }
}
