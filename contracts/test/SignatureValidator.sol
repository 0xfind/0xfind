// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

contract SignatureValidator {
  bytes4 internal constant EIP1271_MAGIC_VALUE = 0x1626ba7e;

  mapping(bytes32 => uint256) internal signedMessages;

  constructor() {}

  function signMessage(bytes32 _hash) external {
    signedMessages[_hash] = 1;
  }

  function isValidSignature(bytes32 _hash, bytes memory)
    public
    view
    returns (bytes4 magicValue)
  {
    if (signedMessages[_hash] == 1) {
      magicValue = EIP1271_MAGIC_VALUE;
    } else {
      magicValue = 0x11111111;
    }
  }

  function isValidHash(bytes32 _hash) external view returns (bool isValid) {
    bytes memory _signature;
    isValid = isValidSignature(_hash, _signature) == EIP1271_MAGIC_VALUE;
  }
}
