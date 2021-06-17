# ShareMinter ShareMarket Contracts

## Ropsten
- HEX: https://ropsten.etherscan.io/address/0x483aaa4de67538c53d892486f50747e017b93b7e
- ShareMinter: https://ropsten.etherscan.io/address/0x6aAd1DA3b867f6BCBc068b9FEb350B9c744A2e20
- ShareMarket: https://ropsten.etherscan.io/address/0xCfA440Da535AC44D8E2203d397484D6797c52C6d

## Mainnet
- HEX: https://etherscan.io/address/0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39
- ShareMinter: https://etherscan.io/address/0xe89caA7B7E4CD6CDD6a0bd33b3b4Eec7068a8f85
- ShareMarket: https://etherscan.io/address/0x9661254261baA3967B7782aB7F5540d5565A88b4

<br>

_________________

## ShareMinter

### Methods
`mintShares` - Hex stakeStart and three new fields:
1. Receiver address (contract to mint shares to)
2. Supplier address (for HEX repayment)
3. Share rate premium 0-999 (0.0% - 99.9%)

`mintEarnings` - Normal hex endStake that transfers hearts earned to specified receiver address

`minterWithdraw` - If someone other than the original stake minter calls `mintEarnings` **before** the grace period ends, then the minter can later come back and withdraw his earnings.

### Share Rate Premium

The share rate premium dictates how much the minter would like to increase the cost of the shares being sent to the receiver.
```
Example
1. Call `mintShares` with 1,000,000 HEX staked and share rate premium of 1%
2. Stake creates 10T shares
3. Receiver gets 9.9T shares (1% premium = 0.1T shares)
4. Send data specifying 1,000,000 HEX staked and 9.9T shares created to receiver
5. Wait for stake to mature
6. Call `mintEarnings` and minter gets 1% of HEX rewarded
7. Receiver gets 99% of the HEX rewarded

Original share price
10T Shares / 1M HEX = 10M shares per HEX

Receiver share price
9.9T shares / 1M HEX = 9.9M shares per HEX
```

### Rules

The minter (caller of the contract) is considered the custodian of the stake so these rules apply:

1. Premature end stake is disabled
2. Anyone can call `mintEarnings`
3. If no one calls `mintEarnings` within **10 days** after the unlock date, **the minter's earnings are paid to the first caller**.

### Sequence Diagram
![ShareMinter](./diagrams/ShareMinter.png "ShareMinter")

<br>

_________________

## ShareMarket *(extends MinterReceiver)*

### Methods
`buyShares(stakeId, shareReceiver, sharesPurchased)` - Can buy shares for any address

`multiBuyShares` - Lumps hex owed into one transfer to save on gas

`claimEarnings(stakeId)` - Claim stake earnings after they have been minted to the market

`supplierWithdraw(stakeId)` - Claim stake earnings after they have been minted to the market

### Pros
1. Gas savings - `claimEarnings` costs approximately as much as an ERC20 transfer
2. Buy shares for any address
3. Don't worry about ending the stake
4. Discounted shares and ability to buy into a stake that has accrued interest already

### Cons
1. No emergency end stake
2. If the share rate premium is worth less than the cost to end stake then there's a risk it will fall on a share owner to end it

### Gas Usage
![ShareMarketGasUsage](./diagrams/ShareMarketGasUsage.png "ShareMarketGasUsage")

<br>

_________________

## Setup for Development - Hardhat
1. Run `npm install` to pull in packages
2. Available commands:
```
npm run <command>
  stage
    npm run lint & npm run test & npm run docs & npm run coverage
  compile
    hardhat compile
  lint
    hardhat check
  docs
    yarn run hardhat docgen
  coverage
    hardhat coverage
```

## Setup for Rinkeby / Mainnet
1. Create a file named `.env` in the root of the project
2. Populate the file with the following properties for running the deployer:
```
PK=YOUR_PRIVATE_KEY_HERE
INFURA_API_KEY=YOUR_INFURA_API_KEY_HERE
ETHERSCAN_API_KEY=YOUR_ETHERSCAN_API_KEY_HERE
```

## Commands

### Running tests

```
npx hardhat test
```

### Running Echidna (Fuzzer)
Note: PITA to set up if you don't know what you're doing. Will need to install the Echidna Docker image available and update the solc compiler to the required version.

**E2E_ShareMinterTest**
```
docker run -it --rm -v "%cd%":/src echidna-0.8.4 echidna-test /src/contracts/test/E2E_ShareMinterTest.sol --contract E2E_ShareMinterTest --config /src/contracts/test/E2E_ShareMinterTest.config.yaml
```
**E2E_ShareMarketTest**
```
docker run -it --rm -v "%cd%":/src echidna-0.8.4 echidna-test /src/contracts/test/E2E_ShareMarketTest.sol --contract E2E_ShareMarketTest --config /src/contracts/test/E2E_ShareMarketTest.config.yaml
```

### Deploy to Ropsten
```
npx hardhat run --network ropsten scripts/deploy_ropsten.js
```

### Deploy to Mainnet

```
npx hardhat run --network mainnet scripts/deploy_mainnet.js
```


