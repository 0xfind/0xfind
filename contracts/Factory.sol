// SPDX-License-Identifier: MIT
pragma solidity =0.8.4;
pragma abicoder v2;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";

import "./interfaces/ISignatureValidator.sol";
import "./interfaces/external/INonfungiblePositionManager.sol";
import "./interfaces/external/ISwapRouter02.sol";
import "./interfaces/external/IUniswapV3Pool.sol";

import "./interfaces/IFindNFT.sol";
import "./interfaces/IMortgage.sol";
import "./interfaces/IMortgagePoolFactory.sol";
import "./interfaces/IMath.sol";

import "./libraries/BytesLib.sol";
import "./libraries/TransferHelper.sol";
import "./libraries/UniswapCreatePoolHelper.sol";
import "./libraries/UniswapConstants.sol";

import "./OSP.sol";

contract Factory is Ownable {
  using BytesLib for bytes;
  using ECDSA for bytes32;

  struct FindInfo {
    address token;
    address pool;
    uint256 cnftTokenId;
    uint256 onftTokenId;
    uint256[] lpTokenIdList;
    uint24 fee;
  }

  struct OspInfo {
    uint256 poolConfigIndex;
    uint256 stars;
    address pool;
    uint256 cnftTokenId;
    uint256 onftTokenId;
    uint256[] lpTokenIdList;
    string projectId;
  }

  struct OspPoolConfigPool {
    UniswapStruct.Position[] positions;
    uint160 initSqrtPriceX96;
  }

  struct OspPoolConfigParams {
    uint24 fee;
    OspPoolConfigPool ospFindPool;
    OspPoolConfigPool findOspPool;
  }

  struct OspPoolConfig {
    uint24 fee;
    OspPoolConfigPool ospFindPool;
    OspPoolConfigPool findOspPool;
    uint256 totalSupply;
  }

  struct CreateOSPBaseParams {
    string name;
    string symbol;
    string projectId;
    uint256 stars;
    uint256 poolConfigIndex;
    uint256 nftPercentConfigIndex;
  }

  struct CreateOSPByProjectOwnerParams {
    CreateOSPBaseParams base;
    uint256 deadline;
    bytes signature;
  }

  struct CreateOSPParams {
    CreateOSPBaseParams base;
    uint256 deadline;
    uint256 buyNFTTokenAmountMax;
    uint256 buyNFTFindAmount;
    bytes tokenToFindOutPath;
    bytes signature;
  }

  struct NFTPercent {
    uint24 cnft;
    uint24 onft;
  }

  address public immutable weth;
  address public immutable earn;
  address public immutable findnft;
  address public immutable mortgage;
  address public immutable mortgagePoolFactory;
  address public immutable math;

  address public signatureAddress;
  bool public disableSetSignatureAddressFlag;

  FindInfo public findInfo;

  NFTPercent[] public nftPercentConfigs;
  mapping(uint256 => OspPoolConfig) private ospPoolConfigs;
  uint256 public ospPoolConfigsCount;

  mapping(string => address) public projectId2OspToken;
  mapping(address => OspInfo) public token2OspInfo;

  event SetSignatureAddress(address signatureAddress);
  event DisableSetSignatureAddress();
  event AddOspPoolConfig(OspPoolConfigParams config);
  event AddNFTPercentConfig(uint24 cnftPercent, uint24 onftPercent);
  event CreateOSPByProjectOwner(CreateOSPByProjectOwnerParams params);
  event CreateOSPByProjectOwnerAndMultiply(
    CreateOSPByProjectOwnerParams params,
    uint256 tokenId
  );
  event CreateOSP(CreateOSPParams params);
  event CreateOSPAndMultiply(CreateOSPParams params, uint256 tokenId);

  constructor(
    address _find,
    address _weth,
    address _earn,
    address _findnft,
    address _mortgage,
    address _mortgagePoolFactory,
    address _math,
    address _signatureAddress
  ) {
    findInfo.fee = 100;

    findInfo.token = _find;
    weth = _weth;
    earn = _earn;
    findnft = _findnft;
    mortgage = _mortgage;
    mortgagePoolFactory = _mortgagePoolFactory;
    math = _math;
    signatureAddress = _signatureAddress;
  }

  modifier checkDeadline(uint256 deadline) {
    require(block.timestamp <= deadline, "CDL");
    _;
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

  function addOspPoolConfig(OspPoolConfigParams memory config)
    external
    onlyOwner
  {
    uint256 index = ospPoolConfigsCount;
    ospPoolConfigsCount = ospPoolConfigsCount + 1;

    ospPoolConfigs[index].fee = config.fee;
    ospPoolConfigs[index].ospFindPool.initSqrtPriceX96 = config
      .ospFindPool
      .initSqrtPriceX96;
    ospPoolConfigs[index].findOspPool.initSqrtPriceX96 = config
      .findOspPool
      .initSqrtPriceX96;
    for (uint256 i = 0; i < config.ospFindPool.positions.length; i++) {
      ospPoolConfigs[index].ospFindPool.positions.push(
        config.ospFindPool.positions[i]
      );
    }
    for (uint256 i = 0; i < config.findOspPool.positions.length; i++) {
      ospPoolConfigs[index].findOspPool.positions.push(
        config.findOspPool.positions[i]
      );
    }

    ospPoolConfigs[index].totalSupply = _getTotalSupplyFromParams(config);

    (
      address leftPool,
      uint256[] memory leftTokenIdList,
      address rightPool,
      uint256[] memory rightTokenIdList
    ) = IMortgagePoolFactory(mortgagePoolFactory).createPool(index);

    IMath(math).createPoolInfo(index, leftPool, leftTokenIdList, false);
    IMath(math).createPoolInfo(index, rightPool, rightTokenIdList, true);

    emit AddOspPoolConfig(config);
  }

  function addNFTPercentConfig(uint24 _cnftPercent, uint24 _onftPercent)
    external
    onlyOwner
  {
    require(_cnftPercent + _onftPercent == 10000, "E");

    nftPercentConfigs.push(
      NFTPercent({ cnft: _cnftPercent, onft: _onftPercent })
    );
    emit AddNFTPercentConfig(_cnftPercent, _onftPercent);
  }

  function getOspPoolConfigs(uint256 index)
    external
    view
    returns (
      uint24 fee,
      uint160 findOspPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory findOspPoolPositions,
      uint160 ospFindPoolInitSqrtPriceX96,
      UniswapStruct.Position[] memory ospFindPoolPositions,
      uint256 totalSupply
    )
  {
    OspPoolConfig memory config = ospPoolConfigs[index];
    fee = config.fee;

    findOspPoolInitSqrtPriceX96 = config.findOspPool.initSqrtPriceX96;
    findOspPoolPositions = config.findOspPool.positions;

    ospFindPoolInitSqrtPriceX96 = config.ospFindPool.initSqrtPriceX96;
    ospFindPoolPositions = config.ospFindPool.positions;

    totalSupply = config.totalSupply;
  }

  function findLpTokenIdList()
    external
    view
    returns (uint256[] memory lpTokenIdList)
  {
    lpTokenIdList = findInfo.lpTokenIdList;
  }

  function ospLpTokenIdList(address osp)
    external
    view
    returns (uint256[] memory lpTokenIdList)
  {
    lpTokenIdList = token2OspInfo[osp].lpTokenIdList;
  }

  function createFindUniswapPool() external onlyOwner {
    require(earn != address(0));
    // prevent duplicate creation
    require(findInfo.pool == address(0));

    (address pool, uint256[] memory lpTokenIdList) = _createFindUniswapPool();
    (uint256 cnftTokenId, uint256 onftTokenId) = _createFindNFT();

    findInfo.pool = pool;
    findInfo.cnftTokenId = cnftTokenId;
    findInfo.onftTokenId = onftTokenId;
    findInfo.lpTokenIdList = lpTokenIdList;
  }

  function createOSPByProjectOwner(CreateOSPByProjectOwnerParams memory params)
    external
    checkDeadline(params.deadline)
  {
    _verifyCreateByProjectOwnerSignature(params);

    _createOSPWithoutPay(params.base);

    emit CreateOSPByProjectOwner(params);
  }

  function createOSPByProjectOwnerAndMultiply(
    CreateOSPByProjectOwnerParams memory params,
    bytes memory tokenToFindOutPath,
    uint256 AllFindAmount,
    uint256 amountPayMax
  )
    external
    payable
    checkDeadline(params.deadline)
    returns (
      uint256 positionOspAmountDelta,
      uint256 amountNeedPay,
      address tokenPay,
      uint256 tokenId
    )
  {
    _verifyCreateByProjectOwnerSignature(params);

    address osp = _createOSPWithoutPay(params.base);

    address tokenIn = tokenToFindOutPath.toAddress(
      tokenToFindOutPath.length - 20
    );
    _processSenderTransfer(tokenIn, amountPayMax);

    _approveToTarget(tokenIn, mortgage, amountPayMax);

    (positionOspAmountDelta, amountNeedPay, tokenPay, tokenId) = _multiply(
      osp,
      AllFindAmount,
      amountPayMax,
      tokenToFindOutPath
    );

    _refund(tokenIn, amountPayMax - amountNeedPay);

    emit CreateOSPByProjectOwnerAndMultiply(params, tokenId);
  }

  function createOSP(CreateOSPParams memory params)
    external
    payable
    checkDeadline(params.deadline)
    returns (uint256 nftNeedPay, address tokenPay)
  {
    _verifyCreateSignature(params);

    _createOSPWithoutPay(params.base);

    address tokenIn = params.tokenToFindOutPath.toAddress(
      params.tokenToFindOutPath.length - 20
    );

    if (params.buyNFTFindAmount == 0) {
      require(params.buyNFTTokenAmountMax == 0, "E1");
      require(msg.value == 0, "E2");
      tokenPay = tokenIn;
    } else {
      _processSenderTransfer(tokenIn, params.buyNFTTokenAmountMax);

      _approveToTarget(
        tokenIn,
        UniswapConstants.UNISWAP_ROUTER,
        params.buyNFTTokenAmountMax
      );

      (tokenPay, nftNeedPay) = _pathSwapToFindAndTransferToEarn(
        params.tokenToFindOutPath,
        params.buyNFTTokenAmountMax,
        params.buyNFTFindAmount
      );

      _refund(tokenIn, params.buyNFTTokenAmountMax - nftNeedPay);
    }

    emit CreateOSP(params);
  }

  function createOSPAndMultiply(
    CreateOSPParams memory params,
    uint256 AllFindAmount,
    uint256 amountPayMax
  )
    external
    payable
    checkDeadline(params.deadline)
    returns (
      uint256 nftNeedPay,
      uint256 positionOspAmountDelta,
      uint256 amountNeedPay,
      address tokenPay,
      uint256 tokenId
    )
  {
    _verifyCreateSignature(params);

    address osp = _createOSPWithoutPay(params.base);

    address tokenIn = params.tokenToFindOutPath.toAddress(
      params.tokenToFindOutPath.length - 20
    );

    _processSenderTransfer(tokenIn, params.buyNFTTokenAmountMax + amountPayMax);

    if (params.buyNFTFindAmount == 0) {
      require(params.buyNFTTokenAmountMax == 0, "E1");
    } else {
      _approveToTarget(
        tokenIn,
        UniswapConstants.UNISWAP_ROUTER,
        params.buyNFTTokenAmountMax
      );

      (, nftNeedPay) = _pathSwapToFindAndTransferToEarn(
        params.tokenToFindOutPath,
        params.buyNFTTokenAmountMax,
        params.buyNFTFindAmount
      );
    }

    _approveToTarget(tokenIn, mortgage, amountPayMax);

    (positionOspAmountDelta, amountNeedPay, tokenPay, tokenId) = _multiply(
      osp,
      AllFindAmount,
      amountPayMax,
      params.tokenToFindOutPath
    );

    _refund(
      tokenIn,
      params.buyNFTTokenAmountMax + amountPayMax - nftNeedPay - amountNeedPay
    );

    emit CreateOSPAndMultiply(params, tokenId);
  }

  function _multiply(
    address osp,
    uint256 AllFindAmount,
    uint256 amountPayMax,
    bytes memory tokenToFindOutPath
  )
    private
    returns (
      uint256 positionOspAmountDelta,
      uint256 amountNeedPay,
      address tokenPay,
      uint256 tokenId
    )
  {
    uint256 value = msg.value == 0 ? 0 : amountPayMax;
    (positionOspAmountDelta, , amountNeedPay, tokenPay, tokenId) = IMortgage(
      mortgage
    ).multiply{ value: value }(
      osp,
      AllFindAmount,
      amountPayMax,
      tokenToFindOutPath
    );
    // transferFrom position nft
    IMortgage(mortgage).safeTransferFrom(address(this), _msgSender(), tokenId);
  }

  function _refund(address token, uint256 amount) private {
    if (amount > 0) {
      if (token != _weth9()) {
        TransferHelper.safeTransfer(token, _msgSender(), amount);
      } else {
        TransferHelper.safeTransferETH(_msgSender(), amount);
      }
    }
  }

  function _createOSPWithoutPay(CreateOSPBaseParams memory params)
    private
    returns (address osp)
  {
    require(earn != address(0));
    require(findInfo.token != address(0));
    require(projectId2OspToken[params.projectId] == address(0), "E");

    osp = address(
      new OSP(
        address(this),
        params.name,
        params.symbol,
        ospPoolConfigs[params.poolConfigIndex].totalSupply
      )
    );

    (address pool, uint256[] memory lpTokenIdList) = _createOspUniswapPool(
      osp,
      params
    );
    (uint256 cnftTokenId, uint256 onftTokenId) = _createOspNFT(
      osp,
      params,
      _msgSender(),
      earn
    );

    token2OspInfo[osp].poolConfigIndex = params.poolConfigIndex;
    token2OspInfo[osp].projectId = params.projectId;
    token2OspInfo[osp].stars = params.stars;
    token2OspInfo[osp].pool = pool;
    token2OspInfo[osp].cnftTokenId = cnftTokenId;
    token2OspInfo[osp].onftTokenId = onftTokenId;
    token2OspInfo[osp].lpTokenIdList = lpTokenIdList;

    projectId2OspToken[params.projectId] = osp;
  }

  function _getTotalSupplyFromParams(OspPoolConfigParams memory config)
    private
    pure
    returns (uint256 totalSupply)
  {
    uint256 ospFindTotalSupply;
    uint256 findOspTotalSupply;
    for (
      uint256 index = 0;
      index < config.ospFindPool.positions.length;
      index++
    ) {
      ospFindTotalSupply += config.ospFindPool.positions[index].amount;
    }
    for (
      uint256 index = 0;
      index < config.findOspPool.positions.length;
      index++
    ) {
      findOspTotalSupply += config.findOspPool.positions[index].amount;
    }
    require(findOspTotalSupply == ospFindTotalSupply, "TSE");
    totalSupply = findOspTotalSupply;
  }

  function _createOspUniswapPool(address osp, CreateOSPBaseParams memory params)
    private
    returns (address pool, uint256[] memory lpTokenIdList)
  {
    OspPoolConfig memory config = ospPoolConfigs[params.poolConfigIndex];
    require(config.fee != 0);
    OspPoolConfigPool memory poolParams;
    if (osp < findInfo.token) {
      poolParams = config.ospFindPool;
    } else {
      poolParams = config.findOspPool;
    }

    (pool, lpTokenIdList) = UniswapCreatePoolHelper.createUniswapPool(
      UniswapCreatePoolHelper.PoolParams({
        baseToken: findInfo.token,
        newToken: osp,
        fee: config.fee,
        initSqrtPriceX96: poolParams.initSqrtPriceX96,
        recipient: earn,
        positions: poolParams.positions
      })
    );
  }

  function _createFindUniswapPool()
    private
    returns (address pool, uint256[] memory lpTokenIdList)
  {
    (
      uint160 initSqrtPriceX96,
      UniswapStruct.Position[] memory positions
    ) = _getFindEthPoolPrams();
    (pool, lpTokenIdList) = UniswapCreatePoolHelper.createUniswapPool(
      UniswapCreatePoolHelper.PoolParams({
        baseToken: weth,
        newToken: findInfo.token,
        fee: findInfo.fee,
        initSqrtPriceX96: initSqrtPriceX96,
        recipient: earn,
        positions: positions
      })
    );
  }

  function _getFindEthPoolPrams()
    private
    view
    returns (
      uint160 initSqrtPriceX96,
      UniswapStruct.Position[] memory positions
    )
  {
    positions = new UniswapStruct.Position[](1);
    if (weth > findInfo.token) {
      // 0 is find, 1 is weth
      // int(math.sqrt(0.001 * (2**192)))
      initSqrtPriceX96 = 2505289222420813103173471269;
      positions[0] = UniswapStruct.Position({
        tickLower: -69082,
        tickUpper: -69081,
        amount: IERC20(findInfo.token).totalSupply()
      });
    } else {
      // 1 is find, 0 is weth
      // int(math.sqrt(1000 * (2**192)))
      initSqrtPriceX96 = 2505539751343055434542618388703;
      positions[0] = UniswapStruct.Position({
        tickLower: 69080,
        tickUpper: 69081,
        amount: IERC20(findInfo.token).totalSupply()
      });
    }
  }

  function _createOspNFT(
    address osp,
    CreateOSPBaseParams memory params,
    address cnftOwner,
    address onftOwner
  ) private returns (uint256 cnftTokenId, uint256 onftTokenId) {
    NFTPercent memory config = nftPercentConfigs[params.nftPercentConfigIndex];
    cnftTokenId = IFindNFT(findnft).mint(
      IFindNFT.MintParams({
        name: params.name,
        symbol: params.symbol,
        projectId: params.projectId,
        stars: params.stars,
        token: osp,
        percent: config.cnft,
        isCnft: true,
        owner: cnftOwner
      })
    );
    onftTokenId = IFindNFT(findnft).mint(
      IFindNFT.MintParams({
        name: params.name,
        symbol: params.symbol,
        projectId: params.projectId,
        stars: params.stars,
        token: osp,
        percent: config.onft,
        isCnft: false,
        owner: onftOwner
      })
    );
  }

  function _createFindNFT()
    private
    returns (uint256 cnftTokenId, uint256 onftTokenId)
  {
    NFTPercent memory config = nftPercentConfigs[0];

    IFindNFT.MintParams memory params = IFindNFT.MintParams({
      name: "github.com/0xfind",
      symbol: "0xHARBERGER",
      projectId: "github/105404818/000000",
      stars: 1,
      token: findInfo.token,
      percent: config.cnft,
      isCnft: true,
      owner: owner()
    });

    cnftTokenId = IFindNFT(findnft).mint(params);

    params.percent = config.onft;
    params.isCnft = false;
    onftTokenId = IFindNFT(findnft).mint(params);
  }

  function _processSenderTransfer(address tokenIn, uint256 amount) private {
    if (tokenIn != _weth9()) {
      require(msg.value == 0, "MVE1");
      TransferHelper.safeTransferFrom(
        tokenIn,
        _msgSender(),
        address(this),
        amount
      );
    } else {
      require(msg.value == amount, "MVE2");
    }
  }

  function _approveToTarget(
    address tokenIn,
    address target,
    uint256 amount
  ) private {
    if (tokenIn != _weth9()) {
      if (IERC20(tokenIn).allowance(address(this), target) < amount) {
        IERC20(tokenIn).approve(target, type(uint256).max);
      }
    }
  }

  function _pathSwapToFindAndTransferToEarn(
    bytes memory tokenToFindOutPath,
    uint256 buyNFTTokenAmountMax,
    uint256 buyNFTFindAmount
  ) private returns (address tokenIn, uint256 amountIn) {
    address tokenOut = tokenToFindOutPath.toAddress(0);
    tokenIn = tokenToFindOutPath.toAddress(tokenToFindOutPath.length - 20);

    require(tokenOut == findInfo.token, "PE");

    if (tokenIn == tokenOut) {
      require(tokenToFindOutPath.length == 20, "PE1");

      tokenIn = findInfo.token;
      amountIn = buyNFTFindAmount;
      TransferHelper.safeTransfer(findInfo.token, earn, amountIn);
    } else {
      // cannot contain multiply token
      uint256 value = msg.value == 0 ? 0 : buyNFTTokenAmountMax;
      amountIn = ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).exactOutput{
        value: value
      }(
        ISwapRouter02.ExactOutputParams({
          path: tokenToFindOutPath,
          recipient: earn,
          amountOut: buyNFTFindAmount,
          amountInMaximum: buyNFTTokenAmountMax
        })
      );

      ISwapRouter02(UniswapConstants.UNISWAP_ROUTER).refundETH();
    }
    require(buyNFTTokenAmountMax >= amountIn, "ME");
  }

  function _weth9() private view returns (address) {
    return
      INonfungiblePositionManager(UniswapConstants.UNISWAP_V3_POSITIONS)
        .WETH9();
  }

  function _verifyCreateByProjectOwnerSignature(
    CreateOSPByProjectOwnerParams memory params
  ) private view {
    bytes32 raw = keccak256(
      abi.encode(params.base, params.deadline, _msgSender())
    );

    _verifySignature(raw, params.signature);
  }

  function _verifyCreateSignature(CreateOSPParams memory params) private view {
    bytes32 raw = keccak256(
      abi.encode(
        params.base,
        params.deadline,
        params.buyNFTTokenAmountMax,
        params.buyNFTFindAmount,
        params.tokenToFindOutPath,
        _msgSender()
      )
    );

    _verifySignature(raw, params.signature);
  }

  function _verifySignature(bytes32 raw, bytes memory signature) private view {
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

  receive() external payable {}
}
