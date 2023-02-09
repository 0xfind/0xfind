// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "./interfaces/IMortgage.sol";

contract MortgageRender {
  address public immutable mortgage;

  constructor(address _mortgage) {
    mortgage = _mortgage;
  }

  function tokenURI(uint256 tokenId)
    public
    view
    returns (string memory output)
  {
    string[6] memory parts;

    (string memory symbol1, string memory symbol2) = _getOspSymbol(tokenId);
    parts[0] = string(
      abi.encodePacked(
        "<svg width='290' height='290' viewBox='0 0 290 290' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'><style>.b{font-family:'Helvetica Neue';word-break:break-all;}.t{color:rgba(255, 255, 255, 0.85);font-weight:500;}.n{color:rgba(255, 255, 255, 0.65);font-weight:400;}.f14{font-size:14px;}.gc{fill: #476A30;}</style><defs><clipPath id='c'><rect width='290' height='290' rx='42' ry='42' /></clipPath></defs><rect clip-path='url(#c)' class='gc' x='0' y='0' width='290' height='290' /><foreignObject x='35' y='52' width='220' height='123'><div class='b' xmlns='http://www.w3.org/1999/xhtml'><div class='t'><span style='font-size:16px;'>",
        symbol1,
        "</span><span style='font-size:24px;'>",
        symbol2
      )
    );

    parts[1] = "</span></div><div class='n f14' style='margin-top:14px;'>";
    parts[2] = _getOspName(tokenId);
    parts[
      3
    ] = "</div></div></foreignObject><foreignObject x='35' y='175' width='220' height='115'><div class='b' xmlns='http://www.w3.org/1999/xhtml'><div class='n f14'>Collateral Locked</div><div class='t' style='font-size:32px;'>";
    parts[4] = _getPositionAmount(tokenId);
    parts[5] = "</div></div></foreignObject></svg>";

    string memory partsOutput = string(
      abi.encodePacked(
        parts[0],
        parts[1],
        parts[2],
        parts[3],
        parts[4],
        parts[5]
      )
    );

    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{"name": "',
            _jsonName(tokenId),
            '", "description": "',
            _jsonDesc(),
            '", "image": "data:image/svg+xml;base64,',
            Base64.encode(bytes(partsOutput)),
            '"}'
          )
        )
      )
    );
    output = string(abi.encodePacked("data:application/json;base64,", json));
  }

  function _getPositionAmount(uint256 tokenId)
    private
    view
    returns (string memory)
  {
    (, , uint256 ospAmount) = IMortgage(mortgage).positions(tokenId);

    uint256 _int = ospAmount / (10**18);
    uint256 _dec = ospAmount / (10**16) - _int * 100;
    uint256 _dec1 = _dec / 10;
    uint256 _dec2 = _dec - _dec1 * 10;

    if (_dec1 == 0 && _dec2 == 0) {
      return Strings.toString(_int);
    }

    if (_dec1 != 0 && _dec2 == 0) {
      return
        string(
          abi.encodePacked(Strings.toString(_int), ".", Strings.toString(_dec1))
        );
    }

    return
      string(
        abi.encodePacked(
          Strings.toString(_int),
          ".",
          Strings.toString(_dec1),
          Strings.toString(_dec2)
        )
      );
  }

  function _getOspName(uint256 tokenId)
    private
    view
    returns (string memory name)
  {
    (, address ospAsset, ) = IMortgage(mortgage).positions(tokenId);
    name = IERC20Metadata(ospAsset).name();
  }

  function _getOspSymbol(uint256 tokenId)
    private
    view
    returns (string memory part1, string memory part2)
  {
    (, address ospAsset, ) = IMortgage(mortgage).positions(tokenId);
    string memory symbol = IERC20Metadata(ospAsset).symbol();

    bytes memory symbolBytes = bytes(symbol);
    bytes memory part1Bytes = new bytes(2);
    bytes memory part2Bytes = new bytes(symbolBytes.length - 2);
    for (uint256 index = 0; index < 2; index++) {
      part1Bytes[index] = symbolBytes[index];
    }
    for (uint256 index = 2; index < symbolBytes.length; index++) {
      part2Bytes[index - 2] = symbolBytes[index];
    }
    part1 = string(part1Bytes);
    part2 = string(part2Bytes);
  }

  function _jsonName(uint256 tokenId)
    private
    view
    returns (string memory output)
  {
    (string memory symbol1, string memory symbol2) = _getOspSymbol(tokenId);
    output = string(
      abi.encodePacked(
        symbol1,
        symbol2,
        " - ",
        _getOspName(tokenId),
        " - ",
        _getPositionAmount(tokenId)
      )
    );
  }

  function _jsonDesc() private pure returns (string memory output) {
    output = string(
      abi.encodePacked(
        "This NFT represents a HBG token collateral position in 0xfind system. The owner of this NFT can modify or redeem the position.\\n\\n",
        unicode"⚠️ DISCLAIMER: Due diligence is imperative when assessing this NFT. Make sure that the NFT image matches the number of $HBG in the collateral position. Due to data caching issues, it is highly recommended to click the Refresh button on the Opensea details page to synchronize the latest data before purchasing NFT."
      )
    );
  }
}
