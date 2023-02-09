// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.4;

import "../libraries/BokkyPooBahsDateTimeLibrary.sol";

contract BokkyPooBahsDateTimeLibraryEchidnaTest {
  function daysToDate(uint256 _days) external pure {
    (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary._daysToDate(_days);
    assert(year >= 1970);
    assert(month >= 1 && month <= 12);
    assert(day >= 1 && day <= 31);
  }

  function timestampToDate(uint256 timestamp) external pure {
    (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary.timestampToDate(timestamp);
    assert(year >= 1970);
    assert(month >= 1 && month <= 12);
    assert(day >= 1 && day <= 31);
  }
}