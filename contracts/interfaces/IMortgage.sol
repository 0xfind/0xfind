// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMortgage {
  function multiply(
    address ospAsset,
    uint256 AllFindAmount,
    uint256 amountPayMax,
    bytes memory otherToFindOutPath
  )
    external
    payable
    returns (
      uint256 positionOspAmountDelta,
      uint256 payFindAmount,
      uint256 amountNeedPay,
      address tokenPay,
      uint256 tokenId
    );

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external;

  function positions(uint256 _tokenId)
    external
    view
    returns (
      uint256 tokenId,
      address ospAsset,
      uint256 ospAmount
    );
}
