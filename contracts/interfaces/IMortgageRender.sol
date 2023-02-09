// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IMortgageRender {
  function tokenURI(uint256 tokenId)
    external
    view
    returns (string memory output);
}
