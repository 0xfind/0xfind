// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721Enumerable.sol";

import "./interfaces/IFind.sol";
import "./interfaces/IFactory.sol";
import "./interfaces/IMath.sol";
import "./interfaces/IMortgageRender.sol";
import "./interfaces/external/IUniswapV3Pool.sol";
import "./interfaces/external/INonfungiblePositionManager.sol";
import "./interfaces/external/IWETH9.sol";
import "./interfaces/external/ISwapRouter02.sol";

import "./libraries/TransferHelper.sol";
import "./libraries/UniswapConstants.sol";
import "./libraries/SwapRouterHelper.sol";
import "./libraries/BytesLib.sol";

contract Mortgage is ERC721Enumerable, Ownable {
  using BytesLib for bytes;
  struct Position {
    uint256 tokenId;
    address ospAsset;
    uint256 ospAmount;
  }
  struct MultiplyEventParams {
    address sender;
    uint256 tokenId;
    address ospAsset;
    uint256 ospAmount;
    uint256 AllFindAmount;
    uint256 payFindAmount;
    uint256 feeFindAmount;
    uint256 amountNeedPay;
    address tokenPay;
  }

  // fee is 0.5%
  uint24 public constant MORTGAGE_FEE_DENOMINATOR = 1000000;
  uint24 public constant MORTGAGE_FEE_DEFAULT = 5000;

  uint24 public mortgageFee;
  address public immutable find;
  address public immutable factory;
  address public immutable earn;
  address public immutable math;

  address public mortgageRender;

  // tokenId -> Position
  mapping(uint256 => Position) public positions;

  uint256 private _nextId = 1;

  event SetMortgageFee(uint24 newMortgageFee);
  event SetMortgageRender(address newMortgageRender);
  event MortgageEvent(
    address sender,
    uint256 tokenId,
    address ospAsset,
    uint256 inOspAmount,
    uint256 outFindAmount,
    uint256 feeFindAmount,
    uint256 amountOut,
    address tokenOut
  );
  event Multiply(MultiplyEventParams params);

  event Redeem(
    address sender,
    uint256 tokenId,
    address ospAsset,
    uint256 outOspAmount,
    uint256 inFindAmount,
    uint256 amountIn,
    address tokenIn
  );
  event Cash(
    address sender,
    uint256 tokenId,
    address ospAsset,
    uint256 outOspPositionAmount,
    uint256 outFindAmount,
    uint256 amountOut,
    address tokenOut
  );
  event Split(
    address sender,
    uint256 tokenId,
    uint256 newTokenId,
    address ospAsset,
    uint256 newOspAmount,
    uint256 inFindAmount,
    uint256 amountIn,
    address tokenIn
  );
  event Merge(
    address sender,
    uint256 tokenId,
    uint256 otherTokenId,
    address ospAsset,
    uint256 outFindAmount,
    uint256 feeFindAmount,
    uint256 amountOut,
    address tokenOut
  );

  constructor(
    address _find,
    address _factory,
    address _earn,
    address _math,
    address _mortgageRender
  ) ERC721("HBG Position", "POSITION") {
    mortgageFee = MORTGAGE_FEE_DEFAULT;

    find = _find;
    factory = _factory;
    earn = _earn;
    math = _math;
    mortgageRender = _mortgageRender;
  }

  function setMortgageFee(uint24 newMortgageFee) external onlyOwner {
    require(newMortgageFee <= MORTGAGE_FEE_DEFAULT, "TB");
    mortgageFee = newMortgageFee;
    emit SetMortgageFee(newMortgageFee);
  }

  function setMortgageRender(address newMortgageRender) external onlyOwner {
    mortgageRender = newMortgageRender;
    emit SetMortgageRender(newMortgageRender);
  }

  function positionsOfOwner(address owner)
    public
    view
    returns (Position[] memory _positions)
  {
    uint256 count = balanceOf(owner);
    _positions = new Position[](count);
    for (uint256 index = 0; index < count; index++) {
      uint256 tokenId = tokenOfOwnerByIndex(owner, index);
      _positions[index] = positions[tokenId];
    }
  }

  function positionsOfOwnerByOsp(address owner, address ospAsset)
    external
    view
    returns (Position[] memory _positions)
  {
    uint256 count = 0;
    Position[] memory _positionsOfOwner = positionsOfOwner(owner);
    for (uint256 index = 0; index < _positionsOfOwner.length; index++) {
      if (_positionsOfOwner[index].ospAsset == ospAsset) {
        count += 1;
      }
    }
    _positions = new Position[](count);
    uint256 currentIndex = 0;
    for (uint256 index = 0; index < _positionsOfOwner.length; index++) {
      if (_positionsOfOwner[index].ospAsset == ospAsset) {
        _positions[currentIndex] = _positionsOfOwner[index];
        currentIndex += 1;
      }
    }
  }

  function tokenURI(uint256 tokenId)
    public
    view
    override
    returns (string memory output)
  {
    output = IMortgageRender(mortgageRender).tokenURI(tokenId);
  }

  // create a new position
  function mortgage(
    address ospAsset,
    uint256 inOspAmount,
    bytes memory findToOtherInPath
  )
    external
    returns (
      uint256 outFindAmount,
      uint256 amountOut,
      address tokenOut,
      uint256 tokenId
    )
  {
    tokenId = _mintEmpty(ospAsset);
    (outFindAmount, amountOut, tokenOut) = _mortgageAdd(
      tokenId,
      inOspAmount,
      findToOtherInPath
    );
  }

  // update a position
  function mortgageAdd(
    uint256 tokenId,
    uint256 inOspAmount,
    bytes memory findToOtherInPath
  )
    external
    returns (
      uint256 outFindAmount,
      uint256 amountOut,
      address tokenOut
    )
  {
    (outFindAmount, amountOut, tokenOut) = _mortgageAdd(
      tokenId,
      inOspAmount,
      findToOtherInPath
    );
  }

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
    )
  {
    tokenId = _mintEmpty(ospAsset);
    (
      positionOspAmountDelta,
      payFindAmount,
      amountNeedPay,
      tokenPay
    ) = _multiplyAdd(tokenId, AllFindAmount, amountPayMax, otherToFindOutPath);
  }

  function multiplyAdd(
    uint256 tokenId,
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
      address tokenPay
    )
  {
    (
      positionOspAmountDelta,
      payFindAmount,
      amountNeedPay,
      tokenPay
    ) = _multiplyAdd(tokenId, AllFindAmount, amountPayMax, otherToFindOutPath);
  }

  function redeem(
    uint256 tokenId,
    uint256 outOspAmount,
    uint256 amountInMax,
    bytes memory otherToFindOutPath
  )
    external
    payable
    returns (
      uint256 inFindAmount,
      uint256 amountIn,
      address tokenIn
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );
    address ospAsset = positions[tokenId].ospAsset;

    inFindAmount = _mathAndRemovePosition(tokenId, outOspAmount);

    (amountIn, tokenIn) = _transferFindOrPathTokenFromUser(
      otherToFindOutPath,
      inFindAmount,
      amountInMax,
      _msgSender()
    );
    IFind(find).burn(inFindAmount);
    TransferHelper.safeTransfer(ospAsset, _msgSender(), outOspAmount);

    emit Redeem(
      _msgSender(),
      tokenId,
      ospAsset,
      outOspAmount,
      inFindAmount,
      amountIn,
      tokenIn
    );
  }

  function cash(
    uint256 tokenId,
    uint256 outOspPositionAmount,
    bytes memory findToOtherInPath
  )
    external
    returns (
      uint256 outFindAmount,
      uint256 amountOut,
      address tokenOut
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );

    address ospAsset = positions[tokenId].ospAsset;

    uint256 needFindAmount = _mathAndRemovePosition(
      tokenId,
      outOspPositionAmount
    );

    if (
      IERC20(ospAsset).allowance(
        address(this),
        UniswapConstants.UNISWAP_ROUTER
      ) < outOspPositionAmount
    ) {
      IERC20(ospAsset).approve(
        UniswapConstants.UNISWAP_ROUTER,
        type(uint256).max
      );
    }

    (uint256 poolConfigIndex, , , , , ) = IFactory(factory).token2OspInfo(
      ospAsset
    );
    (uint24 fee, , , , ) = IFactory(factory).getOspPoolConfigs(poolConfigIndex);

    uint256 swapFindAmount = SwapRouterHelper.exactInputSingle(
      ISwapRouter02.ExactInputSingleParams({
        tokenIn: ospAsset,
        tokenOut: find,
        fee: fee,
        recipient: address(this),
        amountIn: outOspPositionAmount,
        amountOutMinimum: 0,
        sqrtPriceLimitX96: 0
      })
    );

    require(swapFindAmount >= needFindAmount, "FE");
    outFindAmount = swapFindAmount - needFindAmount;

    IFind(find).burn(needFindAmount);
    if (outFindAmount > 0) {
      (amountOut, tokenOut) = _transferFindOrPathTokenToUser(
        findToOtherInPath,
        outFindAmount,
        _msgSender()
      );
    }
    emit Cash(
      _msgSender(),
      tokenId,
      ospAsset,
      outOspPositionAmount,
      outFindAmount,
      amountOut,
      tokenOut
    );
  }

  function split(
    uint256 tokenId,
    uint256 splitOspAmount,
    uint256 amountInMax,
    bytes memory otherToFindOutPath
  )
    external
    payable
    returns (
      uint256 needFind,
      uint256 amountIn,
      address tokenIn,
      uint256 newTokenId
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );
    require(splitOspAmount < positions[tokenId].ospAmount, "AE");

    address ospAsset = positions[tokenId].ospAsset;
    {
      uint256 inFindAmount = _mathAndRemovePosition(tokenId, splitOspAmount);
      newTokenId = _mintEmpty(ospAsset);

      (
        uint256 outFindAmountSplit,
        uint256 feeFindAmountSplit
      ) = _mathAndAddPosition(newTokenId, splitOspAmount);
      uint256 baseFind = outFindAmountSplit + feeFindAmountSplit;
      needFind = inFindAmount - baseFind;
    }

    (amountIn, tokenIn) = _transferFindOrPathTokenFromUser(
      otherToFindOutPath,
      needFind,
      amountInMax,
      _msgSender()
    );

    IFind(find).burn(needFind);

    emit Split(
      _msgSender(),
      tokenId,
      newTokenId,
      ospAsset,
      splitOspAmount,
      needFind,
      amountIn,
      tokenIn
    );
  }

  function merge(
    uint256 tokenId,
    uint256 otherTokenId,
    bytes memory findToOtherInPath
  )
    external
    returns (
      uint256 outFind,
      uint256 amountOut,
      address tokenOut
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );
    require(
      _isApprovedOrOwner(_msgSender(), otherTokenId),
      "ERC721: caller is not token owner nor approved"
    );
    require(
      positions[tokenId].ospAsset == positions[otherTokenId].ospAsset,
      "OE"
    );
    require(positions[tokenId].ospAmount > 0, "AE1");
    require(positions[otherTokenId].ospAmount > 0, "AE2");

    address ospAsset = positions[tokenId].ospAsset;

    uint256 feeFind;
    {
      uint256 otherOspAmount = positions[otherTokenId].ospAmount;

      uint256 baseFind = _mathAndRemovePosition(otherTokenId, otherOspAmount);
      (
        uint256 outFindAmountMerge,
        uint256 feeFindAmountMerge
      ) = _mathAndAddPosition(tokenId, otherOspAmount);
      uint256 outFindAmountMergeWithFee = outFindAmountMerge +
        feeFindAmountMerge;
      uint256 outFindWithFee = outFindAmountMergeWithFee - baseFind;
      (outFind, feeFind) = _mathFee(outFindWithFee);

      IFind(find).mint(outFindWithFee);
    }

    if (feeFind > 0) {
      TransferHelper.safeTransfer(find, earn, feeFind);
    }

    if (outFind > 0) {
      (amountOut, tokenOut) = _transferFindOrPathTokenToUser(
        findToOtherInPath,
        outFind,
        _msgSender()
      );
    }

    emit Merge(
      _msgSender(),
      tokenId,
      otherTokenId,
      ospAsset,
      outFind,
      feeFind,
      amountOut,
      tokenOut
    );
  }

  function _multiplyAdd(
    uint256 tokenId,
    uint256 AllFindAmount,
    uint256 amountPayMax,
    bytes memory otherToFindOutPath
  )
    private
    returns (
      uint256 positionOspAmountDelta,
      uint256 payFindAmount,
      uint256 amountNeedPay,
      address tokenPay
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );
    address ospAsset = positions[tokenId].ospAsset;

    IFind(find).mint(AllFindAmount);

    if (
      IERC20(find).allowance(address(this), UniswapConstants.UNISWAP_ROUTER) <
      AllFindAmount
    ) {
      IERC20(find).approve(UniswapConstants.UNISWAP_ROUTER, type(uint256).max);
    }

    {
      (uint256 poolConfigIndex, , , , , ) = IFactory(factory).token2OspInfo(
        ospAsset
      );
      (uint24 fee, , , , ) = IFactory(factory).getOspPoolConfigs(
        poolConfigIndex
      );

      positionOspAmountDelta = SwapRouterHelper.exactInputSingle(
        ISwapRouter02.ExactInputSingleParams({
          tokenIn: find,
          tokenOut: ospAsset,
          fee: fee,
          recipient: address(this),
          amountIn: AllFindAmount,
          amountOutMinimum: 0,
          sqrtPriceLimitX96: 0
        })
      );
    }

    uint256 feeFindAmount;
    {
      uint256 outFindAmount;
      (outFindAmount, feeFindAmount) = _mathAndAddPosition(
        tokenId,
        positionOspAmountDelta
      );

      payFindAmount = AllFindAmount - outFindAmount;

      (amountNeedPay, tokenPay) = _transferFindOrPathTokenFromUser(
        otherToFindOutPath,
        payFindAmount,
        amountPayMax,
        _msgSender()
      );

      require(amountNeedPay <= amountPayMax, "E");
      IFind(find).burn(payFindAmount - feeFindAmount);

      TransferHelper.safeTransfer(find, earn, feeFindAmount);
    }

    emit Multiply(
      MultiplyEventParams({
        sender: _msgSender(),
        tokenId: tokenId,
        ospAsset: ospAsset,
        ospAmount: positionOspAmountDelta,
        AllFindAmount: AllFindAmount,
        payFindAmount: payFindAmount,
        feeFindAmount: feeFindAmount,
        amountNeedPay: amountNeedPay,
        tokenPay: tokenPay
      })
    );
  }

  function _mortgageAdd(
    uint256 tokenId,
    uint256 inOspAmount,
    bytes memory findToOtherInPath
  )
    private
    returns (
      uint256 outFindAmount,
      uint256 amountOut,
      address tokenOut
    )
  {
    require(
      _isApprovedOrOwner(_msgSender(), tokenId),
      "ERC721: caller is not token owner nor approved"
    );

    address ospAsset = positions[tokenId].ospAsset;

    uint256 feeFindAmount;
    (outFindAmount, feeFindAmount) = _mathAndAddPosition(tokenId, inOspAmount);

    TransferHelper.safeTransferFrom(
      ospAsset,
      _msgSender(),
      address(this),
      inOspAmount
    );

    IFind(find).mint(outFindAmount + feeFindAmount);
    TransferHelper.safeTransfer(find, earn, feeFindAmount);
    (amountOut, tokenOut) = _transferFindOrPathTokenToUser(
      findToOtherInPath,
      outFindAmount,
      _msgSender()
    );

    emit MortgageEvent(
      _msgSender(),
      tokenId,
      ospAsset,
      inOspAmount,
      outFindAmount,
      feeFindAmount,
      amountOut,
      tokenOut
    );
  }

  function _transferFindOrPathTokenFromUser(
    bytes memory otherToFindOutPath,
    uint256 needInFindAmount,
    uint256 amountInMax,
    address user
  ) private returns (uint256 amountIn, address tokenIn) {
    if (otherToFindOutPath.length == 20) {
      tokenIn = otherToFindOutPath.toAddress(0);
      require(tokenIn == find, "PE1");
      amountIn = needInFindAmount;
      TransferHelper.safeTransferFrom(
        find,
        user,
        address(this),
        needInFindAmount
      );
    } else {
      (amountIn, tokenIn) = _transferFromAndSwapOtherToFindByOut(
        otherToFindOutPath,
        needInFindAmount,
        amountInMax,
        user
      );
    }
  }

  function _transferFindOrPathTokenToUser(
    bytes memory swapInPath,
    uint256 outFindAmount,
    address user
  ) private returns (uint256 amountOut, address tokenOut) {
    if (swapInPath.length == 20) {
      require(swapInPath.toAddress(0) == find);
      tokenOut = find;
      amountOut = outFindAmount;
    } else {
      (amountOut, tokenOut) = _swapFindToOtherByIn(swapInPath, outFindAmount);
    }

    if (tokenOut != _weth9()) {
      TransferHelper.safeTransfer(tokenOut, user, amountOut);
    } else {
      IWETH9(_weth9()).withdraw(amountOut);
      TransferHelper.safeTransferETH(user, amountOut);
    }
  }

  function _swapFindToOtherByIn(
    bytes memory findToOtherInPath,
    uint256 inFindAmount
  ) private returns (uint256 amountOut, address tokenOut) {
    require(findToOtherInPath.toAddress(0) == find);
    tokenOut = findToOtherInPath.toAddress(findToOtherInPath.length - 20);
    require(tokenOut != find);

    if (
      IERC20(find).allowance(address(this), UniswapConstants.UNISWAP_ROUTER) <
      type(uint256).max
    ) {
      IERC20(find).approve(UniswapConstants.UNISWAP_ROUTER, type(uint256).max);
    }

    amountOut = SwapRouterHelper.exactInput(
      ISwapRouter02.ExactInputParams({
        path: findToOtherInPath,
        recipient: address(this),
        amountIn: inFindAmount,
        amountOutMinimum: 0
      })
    );
  }

  function _transferFromAndSwapOtherToFindByOut(
    bytes memory otherToFindOutPath,
    uint256 needFindAmount,
    uint256 amountInMax,
    address user
  ) private returns (uint256 amountIn, address tokenIn) {
    tokenIn = otherToFindOutPath.toAddress(otherToFindOutPath.length - 20);
    address tokenOut = otherToFindOutPath.toAddress(0);
    require(tokenIn != find, "PE2");
    require(tokenOut == find, "PE3");

    // prepare for swap
    if (tokenIn != _weth9()) {
      require(msg.value == 0, "VE1");
      TransferHelper.safeTransferFrom(
        tokenIn,
        user,
        address(this),
        amountInMax
      );

      if (
        IERC20(tokenIn).allowance(
          address(this),
          UniswapConstants.UNISWAP_ROUTER
        ) < type(uint256).max
      ) {
        IERC20(tokenIn).approve(
          UniswapConstants.UNISWAP_ROUTER,
          type(uint256).max
        );
      }
    } else {
      require(msg.value == amountInMax, "VE2");
    }

    // swap
    amountIn = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).exactOutput{
      value: msg.value
    }(
      ISwapRouter02.ExactOutputParams({
        path: otherToFindOutPath,
        recipient: address(this),
        amountOut: needFindAmount,
        amountInMaximum: amountInMax
      })
    );
    // refund
    if (tokenIn == _weth9()) {
      ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).refundETH();
    }

    uint256 refund = amountInMax - amountIn;

    if (refund > 0) {
      if (tokenIn != _weth9()) {
        TransferHelper.safeTransfer(tokenIn, user, refund);
      } else {
        TransferHelper.safeTransferETH(user, refund);
      }
    }
  }

  function _mathAndAddPosition(uint256 tokenId, uint256 inOspAmount)
    private
    returns (uint256 outFindAmount, uint256 feeFindAmount)
  {
    uint256 newPositionOspAmount = 0;
    (outFindAmount, feeFindAmount, newPositionOspAmount) = _mathForMortgage(
      tokenId,
      inOspAmount
    );
    positions[tokenId].ospAmount = newPositionOspAmount;
  }

  function _mathAndRemovePosition(uint256 tokenId, uint256 outOspAmount)
    private
    returns (uint256 inFindAmount)
  {
    uint256 positionOspAmount = positions[tokenId].ospAmount;

    require(positionOspAmount > 0, "E1");
    require(outOspAmount <= positionOspAmount, "E2");
    require(outOspAmount > 0, "E3");

    uint256 newPositionOspAmount = 0;
    (inFindAmount, newPositionOspAmount) = _mathForRedeem(
      tokenId,
      outOspAmount
    );

    if (newPositionOspAmount == 0) {
      _burn(tokenId);
      delete positions[tokenId];
    } else {
      positions[tokenId].ospAmount = newPositionOspAmount;
    }
  }

  function _mathForMortgage(uint256 tokenId, uint256 inOspAmount)
    private
    returns (
      uint256 outFindAmount,
      uint256 feeFindAmount,
      uint256 newPositionOspAmount
    )
  {
    uint256 positionOspAmount = positions[tokenId].ospAmount;
    address ospAsset = positions[tokenId].ospAsset;

    newPositionOspAmount = positionOspAmount + inOspAmount;

    uint256 oldFind = 0;
    if (positionOspAmount != 0) {
      oldFind = _mortgage(ospAsset, positionOspAmount);
    }
    uint256 newFind = _mortgage(ospAsset, newPositionOspAmount);
    uint256 outFindAmountWithFee = newFind - oldFind;

    (outFindAmount, feeFindAmount) = _mathFee(outFindAmountWithFee);
  }

  function _mathForRedeem(uint256 tokenId, uint256 outOspAmount)
    private
    returns (uint256 inFindAmount, uint256 newPositionOspAmount)
  {
    uint256 positionOspAmount = positions[tokenId].ospAmount;
    address ospAsset = positions[tokenId].ospAsset;

    newPositionOspAmount = positionOspAmount - outOspAmount;

    uint256 oldFind = _mortgage(ospAsset, positionOspAmount);
    uint256 newFind = 0;
    if (newPositionOspAmount != 0) {
      newFind = _mortgage(ospAsset, newPositionOspAmount);
    }

    inFindAmount = oldFind - newFind;
  }

  function _mathFee(uint256 findAmountWithFee)
    private
    view
    returns (uint256 outFindAmout, uint256 feeFindAmount)
  {
    feeFindAmount =
      (findAmountWithFee * mortgageFee) /
      MORTGAGE_FEE_DENOMINATOR;
    outFindAmout = findAmountWithFee - feeFindAmount;
  }

  function _mortgage(address ospAsset, uint256 ospAmount)
    private
    returns (uint256 findAmount)
  {
    findAmount = IMath(math).mortgage(ospAsset, ospAmount);
  }

  function _weth9() private view returns (address) {
    return
      INonfungiblePositionManager(UniswapConstants.UNISWAP_V3_POSITIONS)
        .WETH9();
  }

  function _mintEmpty(address ospAsset) private returns (uint256 tokenId) {
    (, , address pool, , , ) = IFactory(factory).token2OspInfo(ospAsset);

    require(pool != address(0), "NE");

    tokenId = _nextId;
    _nextId += 1;
    _mint(msg.sender, tokenId);
    positions[tokenId] = Position({
      tokenId: tokenId,
      ospAsset: ospAsset,
      ospAmount: 0
    });
  }

  receive() external payable {}
}
