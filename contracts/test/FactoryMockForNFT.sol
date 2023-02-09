// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

import "../interfaces/IFindNFT.sol";

contract FactoryMockForNFT {
  address public find;

  constructor(address _find) {
    find = _find;
  }

  function mint(address findNft, IFindNFT.MintParams memory params)
    external
    returns (uint256 tokenId)
  {
    tokenId = IFindNFT(findNft).mint(params);
  }

  function token2OspInfo(address)
    external
    view
    returns (
      uint256 poolConfigIndex,
      uint256 stars,
      address pool,
      uint256 cnftTokenId,
      uint256 onftTokenId,
      string memory projectId
    )
  {
    poolConfigIndex = 0;
    stars = 0;
    pool = address(this);
    cnftTokenId = 0;
    onftTokenId = 0;
    projectId = "";
  }

  function findInfo()
    external
    view
    returns (
      address token,
      address pool,
      uint256 cnftTokenId,
      uint256 onftTokenId,
      uint24 fee
    )
  {
    token = find;
    pool = find;
    fee = 100;
    cnftTokenId = 0;
    onftTokenId = 1;
  }
}
