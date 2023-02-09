// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "base64-sol/base64.sol";
import "@openzeppelin/contracts/utils/Strings.sol";
import "./libraries/BokkyPooBahsDateTimeLibrary.sol";
import "./interfaces/IFindNFT.sol";
import "./interfaces/IFactory.sol";

contract FindNFTRender {
  address public immutable factory;
  address public immutable findnft;

  constructor(address _factory, address _findnft) {
    factory = _factory;
    findnft = _findnft;
  }

  function tokenURI(uint256 tokenId)
    public
    view
    returns (string memory output)
  {
    string memory style;
    string
      memory p6 = "<path class='p6b' d='M 147.047 220.873 Q 151.7 218.124 156.353 220.873 L 198.747 245.915 Q 203.4 248.664 203.4 254.161 L 203.4 304.247 Q 203.4 309.744 198.747 312.493 L 156.353 337.535 Q 151.7 340.284 147.047 337.535 L 104.653 312.493 Q 100 309.744 100 304.247 L 100 254.161 Q 100 248.664 104.653 245.915 Z'  /><path class='p6s' d='M 199.576 220.663 Q 203.454 218.337 207.332 220.663 L 225.43 231.52 Q 229.308 233.846 229.308 238.499 L 229.308 260.211 Q 229.308 264.864 225.43 267.19 L 207.332 278.047 Q 203.454 280.373 199.576 278.047 L 181.478 267.19 Q 177.6 264.864 177.6 260.211 L 177.6 238.499 Q 177.6 233.846 181.478 231.52 Z' />";
    string
      memory bee = "<image x='57' y='192' href='data:image/png;base64,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' />";

    IFindNFT.Info memory info = _tokenId2Info(tokenId);
    bool isClaimed = IFindNFT(findnft).isClaimed(tokenId);

    if (isClaimed) {
      p6 = string(abi.encodePacked(bee, p6));
    }

    if (info.isCnft) {
      style = "<style>.b{font-family:'Helvetica Neue';word-break:break-all;}.t{color:rgba(44, 39, 45, 0.85);font-weight:500;}.n{color:rgba(44, 39, 45, 0.65);font-weight:400;}.f12{font-size:12px;}.f14{font-size:14px;}.gc{fill: #D6D5DA;}.fc{fill: rgba(44, 39, 45, 0.65); font-family: 'Helvetica Neue'; font-size: 10px; font-weight:150;}.p6s{fill: rgba(247, 121, 35, 0.7);}.p6b{fill: rgba(217, 186, 46, 0.7);}</style>";
    } else {
      style = "<style>.b{font-family:'Helvetica Neue';word-break:break-all;}.t{color:rgba(255, 255, 255, 0.85);font-weight:500;}.n{color:rgba(255, 255, 255, 0.65);font-weight:400;}.f12{font-size:12px;}.f14{font-size:14px;}.gc{fill: #2C272D;}.fc{fill: rgba(255, 255, 255, 0.65); font-family: 'Helvetica Neue'; font-size: 10px; font-weight:150;}.p6s{fill: rgba(247, 121, 35, 0.7);}.p6b{fill: rgba(217, 186, 46, 0.7);}</style>";
    }

    output = _tokenURI(tokenId, style, p6);
  }

  function _tokenURI(
    uint256 tokenId,
    string memory style,
    string memory p6
  ) internal view returns (string memory output) {
    string memory nftTitle = _nftTitle(tokenId);

    IFindNFT.Info memory info = _tokenId2Info(tokenId);

    (string memory symbolPart1, string memory symbolPart2) = _splitSymbol(
      info.symbol
    );
    string[19] memory parts;

    parts[
      0
    ] = "<svg width='290' height='500' viewBox='0 0 290 500' xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink'>";
    parts[1] = style;
    parts[
      2
    ] = "<defs><clipPath id='c'><rect width='290' height='500' rx='42' ry='42' /></clipPath><path id='p1' d='M20 63 V42 A22 22 0 0 1 42 20 H248 A22 22 0 0 1 270 42 V250 z' /><path id='p2' d='M220 488 H248 A30 30 0 0 0 278 458 V42 z' /></defs><rect clip-path='url(#c)' class='gc' x='0' y='0' width='290' height='500' /><text class='fc'><textPath startOffset='0' xlink:href='#p1'>";
    parts[3] = string(
      abi.encodePacked(nftTitle, " id:", Strings.toString(tokenId))
    );
    parts[4] = "</textPath><textPath startOffset='0' xlink:href='#p2'>";
    parts[5] = string(abi.encodePacked("uri:", info.projectId));
    parts[6] = "</textPath></text>";
    parts[7] = p6;
    parts[
      8
    ] = "<foreignObject x='35' y='77' width='222' height='300'><div class='b' xmlns='http://www.w3.org/1999/xhtml'><div class='t'>";
    parts[9] = string(
      abi.encodePacked(
        "<span style='font-size:15px;'>",
        symbolPart1,
        "</span><span style='font-size:24px;'>",
        symbolPart2,
        "</span>"
      )
    );

    parts[10] = "</div><div class='n f14' style='margin-top:14px;'>";
    parts[11] = info.name;
    parts[
      12
    ] = "</div></div></foreignObject><foreignObject x='35' y='375' width='222' height='85'><div class='b n f12' xmlns='http://www.w3.org/1999/xhtml'><div>when created</div><div class='t f14'>";
    parts[13] = Strings.toString(info.stars);
    parts[14] = "</div><div style='margin-top:8px;'>";
    parts[15] = string(
      abi.encodePacked("own ", _percentStr(info.percent), "% LP income")
    );
    parts[16] = "</div><div style='margin-top:8px;'>";
    parts[17] = _datetime(info.timestamp);
    parts[18] = "</div></div></foreignObject></svg>";

    output = _toPack(tokenId, parts);
  }

  function _percentStr(uint256 percent) private pure returns (string memory) {
    uint256 _int = percent / 100;
    uint256 _dec1 = (percent - _int * 100) / 10;
    uint256 _dec2 = percent - _int * 100 - _dec1 * 10;

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

  function _tokenId2Info(uint256 _tokenId)
    private
    view
    returns (IFindNFT.Info memory info)
  {
    (
      string memory name,
      string memory symbol,
      string memory projectId,
      uint256 stars,
      address token,
      uint256 percent,
      bool isCnft,
      uint256 tokenId,
      uint256 timestamp
    ) = IFindNFT(findnft).tokenId2Info(_tokenId);
    info = IFindNFT.Info({
      name: name,
      symbol: symbol,
      projectId: projectId,
      stars: stars,
      token: token,
      percent: percent,
      isCnft: isCnft,
      tokenId: tokenId,
      timestamp: timestamp
    });
  }

  function _datetime(uint256 timestamp)
    private
    pure
    returns (string memory date)
  {
    (uint256 year, uint256 month, uint256 day) = BokkyPooBahsDateTimeLibrary
      .timestampToDate(timestamp);
    string memory yearStr = Strings.toString(year);
    string memory monthStr = Strings.toString(month);
    string memory dayStr = Strings.toString(day);
    if (bytes(dayStr).length == 1) {
      dayStr = string(abi.encodePacked("0", dayStr));
    }
    if (bytes(monthStr).length == 1) {
      monthStr = string(abi.encodePacked("0", monthStr));
    }
    date = string(abi.encodePacked(monthStr, "/", dayStr, "/", yearStr));
  }

  function _splitSymbol(string memory symbol)
    private
    pure
    returns (string memory part1, string memory part2)
  {
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

  function _nftTitle(uint256 tokenId)
    private
    view
    returns (string memory output)
  {
    IFindNFT.Info memory info = _tokenId2Info(tokenId);

    string memory _type;
    if (info.isCnft) {
      _type = "Create";
    } else {
      _type = "Owner";
    }

    output = string(abi.encodePacked(_type, " NFT"));
  }

  function _jsonName(uint256 tokenId)
    private
    view
    returns (string memory output)
  {
    IFindNFT.Info memory info = _tokenId2Info(tokenId);
    string memory nftTitle = _nftTitle(tokenId);
    output = string(abi.encodePacked(nftTitle, " - ", info.name));
  }

  function _jsonDesc(uint256 tokenId)
    private
    view
    returns (string memory output)
  {
    address pool;
    string memory pair;
    {
      IFindNFT.Info memory info = _tokenId2Info(tokenId);
      (address find, address findPool, , , ) = IFactory(factory).findInfo();

      if (info.token == find) {
        pool = findPool;
        pair = "$FIND / $ETH";
      } else {
        (, , pool, , , ) = IFactory(factory).token2OspInfo(info.token);
        pair = "$HBG / $FIND";
      }
    }

    output = string(
      abi.encodePacked(
        "This NFT represents the right to collect taxes on an ",
        pair,
        " transaction pair on 0xfind. The holder of this NFT can permanently collect the fees generated by the pair on Uniswap.",
        "\\n\\nPool Address:",
        Strings.toHexString(pool),
        "\\n\\n",
        unicode"⚠️ DISCLAIMER:  Due diligence is imperative when assessing this NFT. Make sure that the ",
        pair,
        " transaction pair matches the expectation, as token symbols may be imitated."
      )
    );
  }

  function _toPack(uint256 tokenId, string[19] memory parts)
    private
    view
    returns (string memory output)
  {
    string memory partsOutput = string(
      abi.encodePacked(
        parts[0],
        parts[1],
        parts[2],
        parts[3],
        parts[4],
        parts[5],
        parts[6]
      )
    );

    partsOutput = string(
      abi.encodePacked(
        partsOutput,
        parts[7],
        parts[8],
        parts[9],
        parts[10],
        parts[11],
        parts[12]
      )
    );

    partsOutput = string(
      abi.encodePacked(
        partsOutput,
        parts[13],
        parts[14],
        parts[15],
        parts[16],
        parts[17],
        parts[18]
      )
    );

    string memory json = Base64.encode(
      bytes(
        string(
          abi.encodePacked(
            '{"name": "',
            _jsonName(tokenId),
            '", "description": "',
            _jsonDesc(tokenId),
            '", "image": "data:image/svg+xml;base64,',
            Base64.encode(bytes(partsOutput)),
            '"}'
          )
        )
      )
    );
    output = string(abi.encodePacked("data:application/json;base64,", json));
  }
}
