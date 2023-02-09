// SPDX-License-Identifier: UNLICENSED
pragma solidity =0.7.6;

import '../libraries/Math/Tick.sol';

contract TickEchidnaTest {
    function checkTickSpacingToParametersInvariants(int24 tickSpacing) external pure {
        require(tickSpacing <= TickMath.MAX_TICK);
        require(tickSpacing > 0);

        int24 minTick = (TickMath.MIN_TICK / tickSpacing) * tickSpacing;
        int24 maxTick = (TickMath.MAX_TICK / tickSpacing) * tickSpacing;

        // symmetry around 0 tick
        assert(maxTick == -minTick);
        // positive max tick
        assert(maxTick > 0);
        // divisibility
        assert((maxTick - minTick) % tickSpacing == 0);

    }
}
