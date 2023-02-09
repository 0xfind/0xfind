// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface ISignatureValidator {
  function isValidSignature(bytes32 _hash, bytes memory _signature)
    external
    view
    returns (bytes4 magicValue);

  function isValidHash(bytes32 _hash) external view returns (bool isValid);
}
