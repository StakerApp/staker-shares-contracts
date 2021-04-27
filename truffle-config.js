const HDWalletProvider = require("@truffle/hdwallet-provider");

require('dotenv').config();

module.exports = {
  networks: {
    development: {
      host: "127.0.0.1",
      port: 7545,
      network_id: "*"
    },

    ropsten: {
      provider: () => new HDWalletProvider(process.env.PK, `https://ropsten.infura.io/v3/${process.env.INFURA_API_KEY}`),
      network_id: 3,
      gas: 3000000,
      gasPrice: 42000000000
    },

    mainnet: {
      provider: () => new HDWalletProvider(process.env.PK, `https://mainnet.infura.io/v3/${process.env.INFURA_API_KEY}`),
      network_id: 1,
      gas: 3000000,
      gasPrice: 45000000000
    }
  },

  mocha: {
    reporter: 'eth-gas-reporter',
    reporterOptions: {
      excludeContracts: ['Migrations']
    }
  },

  compilers: {
    solc: {
      settings: {
        optimizer: {
          enabled: true,
          runs: 999999
        }
      },
      version: "0.8.3",
    }
  }
}