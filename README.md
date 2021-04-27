# Staker Shares Contracts

## Ropsten
- HEX: https://ropsten.etherscan.io/address/0xF1633e8D441F6F5E953956e31923F98B53c9fd89
- ShareMinter: https://ropsten.etherscan.io/address/0xef2aCd0d6a82eEA0E50ae9CC8d1B774C4672007c
- ShareMarket: https://ropsten.etherscan.io/address/0xa1af6542204C84576BF3334f6fF085d7FA837fc1

## Mainnet
- HEX: https://etherscan.io/address/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39
- ShareMinter: https://etherscan.io/address/0x47d62c3a4e96a7d45e9cf9fe6d4969c9ca1c9077
- ShareMarket: https://etherscan.io/address/0x0bce7f18fc2eacec694de53f1834cbbf5842f43c

## Setup for Development - Truffle
1. Run [Ganache](https://www.trufflesuite.com/ganache)
2. Execute `truffle test`

## Setup for Rinkeby / Mainnet
1. Create a file named `.env` in the root of the project
2. Populate the file with the following properties for running the deployer:
```
PK=YOUR_PRIVATE_KEY_HERE
INFURA_API_KEY=YOUR_INFURA_API_KEY_HERE
```

## Helpful Commands

### Running tests on Ganache

Optional `--debug` flag requires methods to be wrapped in `await debug(contract_execution)`
```
truffle test --show-events
```

### Deploy to Ropsten

Optional `--reset` flag to redeploy new contracts
```
truffle migrate --reset --network ropsten
```

### Verifying Contract on ropsten.etherscan.io

Combines contract dependencies into single file (you'll need to remove duplicates of the license)
```
npm run flatten
```

### Executing Contract Functions From Truffle CLI

Approve market contract to transfer HEX from EOA
```
truffle console --network ropsten

hex = await IHEX.at('0xF1633e8D441F6F5E953956e31923F98B53c9fd89')
minter = await ShareMinter.at('0xef2aCd0d6a82eEA0E50ae9CC8d1B774C4672007c')
market = await ShareMarket.at('0xa1af6542204C84576BF3334f6fF085d7FA837fc1')

await hex.approve(minter.address, 1000000000000000)
await hex.approve(market.address, 1000000000000000)

await minter.mintShares(market.address, accounts[0], 5000000000000, 1)
await minter.mintShares(market.address, accounts[0], 5000000000000, 1)
await minter.mintShares(market.address, accounts[0], 5000000000000, 1)
await minter.mintShares(market.address, accounts[0], 5000000000000, 1)

// get stakeId and shares from events
stakeId = 1130
await market.buyShares(stakeId, accounts[0], 2000000000000)
await market.multiBuyShares([{ stakeId: stakeId + 1, shareReceiver: accounts[0], sharesPurchased: 2000000000000 }, { stakeId: stakeId + 2, shareReceiver: accounts[0], sharesPurchased: 2000000000000 }, { stakeId: stakeId + 3, shareReceiver: accounts[0], sharesPurchased: 2000000000000 }])

// after stake has matured mint earnings
await minter.mintEarnings(0, 1101)

await market.claimEarnings(1101)
```
