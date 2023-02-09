// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../libraries/TransferHelper.sol";

contract MortgageTransferFromPositionCallbackMock {
  mapping(address => mapping(address => uint256)) public positions;
  mapping(address => mapping(address => bytes)) public positionData;

  constructor() {}

  function mortgageTransferFromPositionCallback(
    address ospAsset,
    uint256 outOspPositionAmount,
    address from,
    bytes calldata data
  ) external {
    positions[from][ospAsset] += outOspPositionAmount;
    positionData[from][ospAsset] = data;
  }
}
