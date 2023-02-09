// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IFindNFTRender.sol";

contract FindNFT is ERC721Enumerable, Ownable {
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

  address public immutable factory;
  address public immutable earn;
  address public findnftRender;

  mapping(uint256 => Info) public tokenId2Info;
  // tokenid => bool
  mapping(uint256 => bool) public isClaimed;

  event SetFindnftRender(address findnftRender);
  event Claim(uint256 tokenId);
  event Mint(
    string name,
    string symbol,
    string projectId,
    uint256 stars,
    address token,
    uint256 percent,
    bool isCnft,
    uint256 tokenID,
    address owner
  );

  constructor(
    address _factory,
    address _earn,
    address _findnftRender
  ) ERC721("Harberger Tax", "HBGTAX") {
    factory = _factory;
    earn = _earn;
    findnftRender = _findnftRender;
  }

  modifier onlyFactory() {
    require(msg.sender == factory, "onlyFactory");
    _;
  }
  modifier onlyEarn() {
    require(msg.sender == earn, "onlyEarn");
    _;
  }

  function setFindnftRender(address _findnftRender) external onlyOwner {
    findnftRender = _findnftRender;
    emit SetFindnftRender(_findnftRender);
  }

  function claim(uint256 tokenId) external onlyEarn {
    _claim(tokenId);
  }

  function _claim(uint256 tokenId) private {
    require(!isClaimed[tokenId], "RE");
    require(_exists(tokenId), "NE");

    isClaimed[tokenId] = true;
    emit Claim(tokenId);
  }

  function mint(MintParams memory params)
    external
    onlyFactory
    returns (uint256 tokenId)
  {
    tokenId = totalSupply();
    _safeMint(params.owner, tokenId);

    Info memory info = Info({
      name: params.name,
      symbol: params.symbol,
      projectId: params.projectId,
      stars: params.stars,
      token: params.token,
      percent: params.percent,
      tokenId: tokenId,
      isCnft: params.isCnft,
      timestamp: block.timestamp
    });

    tokenId2Info[info.tokenId] = info;

    (address find, , , , ) = IFactory(factory).findInfo();
    if (find == info.token) {
      _claim(info.tokenId);
    }

    emit Mint(
      info.name,
      info.symbol,
      info.projectId,
      info.stars,
      info.token,
      info.percent,
      info.isCnft,
      info.tokenId,
      params.owner
    );
  }

  function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory output)
  {
    output = IFindNFTRender(findnftRender).tokenURI(tokenId);
  }
}
