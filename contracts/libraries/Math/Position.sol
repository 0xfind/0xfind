// SPDX-License-Identifier: BUSL-1.1
pragma solidity >=0.5.0;

import "./FullMath.sol";
import "./FixedPoint128.sol";
import "./LiquidityMath.sol";

/// @title Position
/// @notice Positions represent an owner address' liquidity between a lower and upper tick boundary
/// @dev Positions store additional state for tracking fees owed to the position
library Position {
  // info stored for each user's position
  struct Info {
    // the amount of liquidity owned by this position
    uint128 liquidity;
  }

  /// @notice Returns the Info struct of a position, given an owner and position boundaries
  /// @param self The mapping containing all user positions
  /// @param owner The address of the position owner
  /// @param tickLower The lower tick boundary of the position
  /// @param tickUpper The upper tick boundary of the position
  /// @return position The position info struct of the given owners' position
  function get(
    mapping(bytes32 => Info) storage self,
    address owner,
    int24 tickLower,
    int24 tickUpper
  ) internal view returns (Position.Info storage position) {
    position = self[keccak256(abi.encodePacked(owner, tickLower, tickUpper))];
  }

  /// @notice Credits accumulated fees to a user's position
  /// @param self The individual position to update
  /// @param liquidityDelta The change in pool liquidity as a result of the position updatess
  function update(Info storage self, int128 liquidityDelta) internal {
    Info memory _self = self;

    uint128 liquidityNext;
    if (liquidityDelta == 0) {
      require(_self.liquidity > 0, "NP"); // disallow pokes for 0 liquidity positions
      liquidityNext = _self.liquidity;
    } else {
      liquidityNext = LiquidityMath.addDelta(_self.liquidity, liquidityDelta);
    }

    // update the position
    if (liquidityDelta != 0) self.liquidity = liquidityNext;
  }
}
