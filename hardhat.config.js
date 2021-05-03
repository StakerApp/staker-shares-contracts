require("@nomiclabs/hardhat-ethers");
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-solhint");
require("@nomiclabs/hardhat-waffle");
require("@nomiclabs/hardhat-web3");
require('hardhat-docgen');
require("hardhat-gas-reporter");
require("solidity-coverage");

require('dotenv').config();

module.exports = {
  networks: {
    ropsten: {
      url: `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PK],
      chainId: 3
    },

    mainnet: {
      url: `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`,
      accounts: [process.env.PK],
      chainId: 1
    }
  },

  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY
  },

  gasReporter: {
    currency: 'USD'
  },

  docgen: {
    path: './docs',
    clear: true,
    runOnCompile: true,
  },

  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 999999
      }
    }
  }
};