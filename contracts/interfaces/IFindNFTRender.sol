// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IFindNFTRender {
  function tokenURI(uint256 tokenId)
    external
    view
    returns (string memory output);
}
