// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4;

import "../libraries/BokkyPooBahsDateTimeLibrary.sol";

contract BokkyPooBahsDateTimeLibraryTest {
  function daysToDate(uint256 _days) public pure returns (
      uint256 year,
      uint256 month,
      uint256 day
    ) {
    return BokkyPooBahsDateTimeLibrary._daysToDate(_days);
  }

  function timestampToDate(uint256 timestamp) public pure returns (
      uint256 year,
      uint256 month,
      uint256 day
    ) {
    return BokkyPooBahsDateTimeLibrary.timestampToDate(timestamp);
  }
}