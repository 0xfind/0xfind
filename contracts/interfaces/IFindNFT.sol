// SPDX-License-Identifier: MIT
pragma solidity >=0.8.4;

interface IFindNFT {
  struct Info {
    string name;
    string symbol;
    string projectId;
    uint256 stars;
    address token;
    uint256 percent;
    bool isCnft;
    uint256 tokenId;
    uint256 timestamp;
  }

  struct MintParams {
    string name;
    string symbol;
    string projectId;
    uint256 stars;
    address token;
    uint256 percent;
    bool isCnft;
    address owner;
  }

  function ownerOf(uint256 tokenId) external view returns (address owner);

  function tokenId2Info(uint256 _tokenId)
    external
    view
    returns (
      string memory name,
      string memory symbol,
      string memory projectId,
      uint256 stars,
      address token,
      uint256 percent,
      bool isCnft,
      uint256 tokenId,
      uint256 timestamp
    );

  function mint(MintParams memory params) external returns (uint256 tokenId);

  function safeTransferFrom(
    address from,
    address to,
    uint256 tokenId
  ) external;

  function isClaimed(uint256 tokenId) external view returns (bool);

  function claim(uint256 tokenId) external;
}
