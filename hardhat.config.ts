import * as dotenv from "dotenv";

import { HardhatUserConfig, task } from "hardhat/config";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "hardhat-gas-reporter";
import "solidity-coverage";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";

dotenv.config();

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const OLD_COMPILER_SETTINGS = {
  version: '0.7.6',
  settings: {
    optimizer: {
      enabled: true,
      runs: 2000,
    },
    metadata: {
      bytecodeHash: 'none',
    },
  }
}

const DEFAULT_COMPILER_SETTINGS = {
  version: "0.8.4",
  settings: {
    optimizer: {
      enabled: true,
      runs: 200,
    },
  },
}
// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

const config: HardhatUserConfig = {
  solidity: {
    compilers: [DEFAULT_COMPILER_SETTINGS],
    overrides: {
      'contracts/test/OldMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/Math.sol':  OLD_COMPILER_SETTINGS,
      'contracts/interfaces/IERC20M.sol': OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/BitMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/FixedPoint96.sol': OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/FixedPoint128.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/FullMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/LiquidityMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/LowGasSafeMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/Position.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/SafeCast.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/SqrtPriceMath.sol': OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/SwapMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/Tick.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/TickBitmap.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/TickMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/libraries/Math/UnsafeMath.sol':  OLD_COMPILER_SETTINGS,
      'contracts/test/BitMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/BitMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickBitmapTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickBitmapEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/SwapMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/SwapMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/SqrtPriceMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/SqrtPriceMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/FullMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/FullMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/LiquidityMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickOverflowSafetyEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickMathTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/TickMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/LowGasSafeMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
      'contracts/test/UnsafeMathEchidnaTest.sol': OLD_COMPILER_SETTINGS,
    },
  },
  networks: {
    hardhat: {
      allowUnlimitedContractSize: true,
      // forking: {
      //   url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
      //   blockNumber: 7848086,
      // },
      forking: {
        url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
        blockNumber: 27324926,
      },
      accounts: {
        accountsBalance: "100000000000000000000000000",
      },
    },
    mumbai: {
      url: `https://polygon-mumbai.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    polygon: {
      url: `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    goerli: {
      url: `https://eth-goerli.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
    eth: {
      url: `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMYAPI_API_KEY}`,
      accounts:
        process.env.PRIVATE_KEY !== undefined ? [process.env.PRIVATE_KEY] : [],
    },
  },
  mocha: {
    timeout: 15000000,
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  contractSizer: {
    alphaSort: true,
    disambiguatePaths: false,
    runOnCompile: true,
    strict: true,
  },
};

export default config;
