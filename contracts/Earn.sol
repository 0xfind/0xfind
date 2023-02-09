// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC721/utils/ERC721Holder.sol";

import "./interfaces/ISignatureValidator.sol";
import "./libraries/UniswapConstants.sol";
import "./libraries/TransferHelper.sol";
import "./libraries/UniswapCollectHelper.sol";

import "./interfaces/external/ISwapRouter02.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IFindNFT.sol";

contract Earn is Ownable, ERC721Holder {
  using ECDSA for bytes32;

  address public immutable find;
  address public immutable factory;
  address public immutable findnft;

  address public signatureAddress;
  bool public disableSetSignatureAddressFlag;

  event SetSignatureAddress(address signatureAddress);
  event DisableSetSignatureAddress();
  event ClaimOSPOwnerNFT(address osp, address nftOwner);
  event CollectForBuilder(address token, uint256 cAmount, uint256 oAmount);
  event CollectFindUniswapLPFee(uint256 findAmount, uint256 wethAmount);
  event CollectOspUniswapLPFee(address osp, uint256 cAmount, uint256 oAmount);

  constructor(
    address _find,
    address _factory,
    address _findnft,
    address _signatureAddress
  ) {
    find = _find;
    factory = _factory;
    findnft = _findnft;
    signatureAddress = _signatureAddress;
  }

  function setSignatureAddress(address _signatureAddress) external onlyOwner {
    require(!disableSetSignatureAddressFlag, "DE");

    signatureAddress = _signatureAddress;
    emit SetSignatureAddress(_signatureAddress);
  }

  function disableSetSignatureAddress() external onlyOwner {
    disableSetSignatureAddressFlag = true;
    emit DisableSetSignatureAddress();
  }

  function claimOSPOwnerNFT(
    address osp,
    address nftOwner,
    bytes memory signature
  ) external {
    _verifyclaimOSPOwnerNFTSignature(osp, nftOwner, signature);

    (, , address pool, uint256 cnftTokenId, uint256 onftTokenId, ) = IFactory(
      factory
    ).token2OspInfo(osp);

    require(pool != address(0), "NE");

    require(IFindNFT(findnft).isClaimed(cnftTokenId) == false, "AC1");
    require(IFindNFT(findnft).isClaimed(onftTokenId) == false, "AC2");

    require(IFindNFT(findnft).ownerOf(onftTokenId) == address(this), "E");

    IFindNFT(findnft).safeTransferFrom(address(this), nftOwner, onftTokenId);

    IFindNFT(findnft).claim(cnftTokenId);
    IFindNFT(findnft).claim(onftTokenId);

    emit ClaimOSPOwnerNFT(osp, nftOwner);
  }

  function findNFTInfo()
    public
    view
    returns (
      address cnftOwner,
      address onftOnwer,
      uint256 cpercent,
      uint256 opercent
    )
  {
    (, , uint256 cnftTokenId, uint256 onftTokenId, ) = IFactory(factory)
      .findInfo();
    cnftOwner = IFindNFT(findnft).ownerOf(cnftTokenId);
    onftOnwer = IFindNFT(findnft).ownerOf(onftTokenId);
    (, , , , , cpercent, , , ) = IFindNFT(findnft).tokenId2Info(cnftTokenId);
    (, , , , , opercent, , , ) = IFindNFT(findnft).tokenId2Info(onftTokenId);
  }

  function ospNFTInfo(address osp)
    public
    view
    returns (
      address cnftOwner,
      address onftOnwer,
      uint256 cpercent,
      uint256 opercent,
      bool isClaim
    )
  {
    (, , address pool, uint256 cnftTokenId, uint256 onftTokenId, ) = IFactory(
      factory
    ).token2OspInfo(osp);

    require(pool != address(0), "NE");

    cnftOwner = IFindNFT(findnft).ownerOf(cnftTokenId);
    onftOnwer = IFindNFT(findnft).ownerOf(onftTokenId);
    (, , , , , cpercent, , , ) = IFindNFT(findnft).tokenId2Info(cnftTokenId);
    (, , , , , opercent, , , ) = IFindNFT(findnft).tokenId2Info(onftTokenId);
    isClaim = IFindNFT(findnft).isClaimed(onftTokenId);
  }

  function collectForBuilder(address token)
    external
    returns (uint256 cAmount, uint256 oAmount)
  {
    (address cnftOwner, address onftOnwer, uint256 cpercent, ) = findNFTInfo();
    uint256 allAmount = IERC20(token).balanceOf(address(this));
    if (allAmount > 0) {
      cAmount = (allAmount * cpercent) / 10000;
      oAmount = allAmount - cAmount;
      if (cAmount > 0) {
        TransferHelper.safeTransfer(token, cnftOwner, cAmount);
      }
      if (oAmount > 0) {
        TransferHelper.safeTransfer(token, onftOnwer, oAmount);
      }
    }

    emit CollectForBuilder(token, cAmount, oAmount);
  }

  function collectFindUniswapLPFee()
    external
    returns (uint256 findAmount, uint256 wethAmount)
  {
    uint256[] memory lpTokenIdList = IFactory(factory).findLpTokenIdList();
    UniswapCollectHelper.FeeResult memory result = UniswapCollectHelper
      .collectFeeWithLpList(lpTokenIdList, address(this));
    if (result.token0 == find) {
      findAmount = result.token0Add;
      wethAmount = result.token1Add;
    } else {
      findAmount = result.token1Add;
      wethAmount = result.token0Add;
    }

    emit CollectFindUniswapLPFee(findAmount, wethAmount);
  }

  function collectOspUniswapLPFee(address osp)
    external
    returns (uint256 cAmount, uint256 oAmount)
  {
    (address cnftOwner, address onftOnwer, uint256 cpercent, , ) = ospNFTInfo(
      osp
    );

    UniswapCollectHelper.FeeResult memory result;
    {
      uint256[] memory lpTokenIdList = IFactory(factory).ospLpTokenIdList(osp);
      result = UniswapCollectHelper.collectFeeWithLpList(
        lpTokenIdList,
        address(this)
      );
    }

    (uint256 poolConfigIndex, , , , , ) = IFactory(factory).token2OspInfo(osp);
    (uint24 fee, , , , ) = IFactory(factory).getOspPoolConfigs(poolConfigIndex);

    uint256 cToken0Add = (result.token0Add * cpercent) / 10000;
    uint256 oToken0Add = result.token0Add - cToken0Add;

    uint256 cToken1Add = (result.token1Add * cpercent) / 10000;
    uint256 oToken1Add = result.token1Add - cToken1Add;

    cAmount = UniswapCollectHelper.swapPoolFeeToTokenOut(
      UniswapCollectHelper.SwapPoolFeeToTokenOutParams({
        token0: result.token0,
        token1: result.token1,
        token0Amount: cToken0Add,
        token1Amount: cToken1Add,
        fee: fee,
        tokenOut: find,
        recipient: address(this)
      })
    );

    oAmount = UniswapCollectHelper.swapPoolFeeToTokenOut(
      UniswapCollectHelper.SwapPoolFeeToTokenOutParams({
        token0: result.token0,
        token1: result.token1,
        token0Amount: oToken0Add,
        token1Amount: oToken1Add,
        fee: fee,
        tokenOut: osp,
        recipient: address(this)
      })
    );

    if (cAmount > 0) {
      TransferHelper.safeTransfer(find, cnftOwner, cAmount);
    }

    if (onftOnwer != address(this)) {
      if (oAmount > 0) {
        TransferHelper.safeTransfer(osp, onftOnwer, oAmount);
      }
    }

    emit CollectOspUniswapLPFee(osp, cAmount, oAmount);
  }

  function _verifyclaimOSPOwnerNFTSignature(
    address ospToken,
    address nftOwner,
    bytes memory signature
  ) private view {
    bytes32 raw = keccak256(abi.encode(ospToken, nftOwner));

    if (Address.isContract(signatureAddress)) {
      require(signature.length == 0, "SLE");
      require(
        ISignatureValidator(signatureAddress).isValidHash(
          raw.toEthSignedMessageHash()
        ),
        "SE1"
      );
    } else {
      require(
        raw.toEthSignedMessageHash().recover(signature) == signatureAddress,
        "SE2"
      );
    }
  }
}
