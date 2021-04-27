const HEX = artifacts.require("HEX");
const ShareMinter = artifacts.require("ShareMinter");
const ShareMarket = artifacts.require("ShareMarket");

const evm = require('./helpers/EVMExtensions');

contract('MinterMarket - Valid No Buyer Scenario', (accounts) => {
    const supplierAccount = accounts[0];

    const stakeId = 1001;
    const heartsStaked = 50000;
    const shares = 29937;
    const marketShares = 29638;
    const heartsRewarded = 50009;

    const initialBalance = 100000;

    let hex;
    let minter;
    let market;

    let getBalance = async (address) => (await hex.balanceOf.call(address)).toNumber();
    let setBalance = async (address, value) => await hex.setBalance(address, value);

    before(async () => {
        hex = await HEX.deployed();
        await hex.dailyDataUpdate(0);
        minter = await ShareMinter.deployed(hex.addresss, accounts[0]);
        market = await ShareMarket.deployed(hex.address, minter.address);

        await setBalance(supplierAccount, initialBalance);

        await hex.approve(minter.address, 100000000000000);
    });

    it('should mint shares to market', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplierAccount);

        // Act
        await minter.mintShares(market.address, supplierAccount, heartsStaked, 1);
        const listing = await market.listingDetails(stakeId);
        const sharesOnMarket = listing.sharesAvailable;

        // Assert
        const supplierBalanceAfter = await getBalance(supplierAccount);
        assert.equal(supplierBalanceAfter, supplierBalanceBefore - heartsStaked);
        assert.equal(marketShares, sharesOnMarket);
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(3 * DAY);
        await hex.dailyDataUpdate(0);
        await hex.stakeGoodAccounting(minter.address, 0, stakeId);
    });

    it('should mint stake earnings to market', async () => {
        // Arrange
        const marketBalanceBefore = await getBalance(market.address);

        // Act
        await minter.mintEarnings(0, stakeId);

        // Assert
        const marketBalanceAfter = await getBalance(market.address);
        assert.equal(marketBalanceAfter, marketBalanceBefore + heartsRewarded);
    });

    it('should allow supplier to claim earning', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplierAccount);

        // Act
        await market.claimEarnings(stakeId);
        const sharesOwned = await market.sharesOwned(stakeId, supplierAccount);

        // Assert
        const supplierBalanceAfter = await getBalance(supplierAccount);
        assert.equal(supplierBalanceAfter, supplierBalanceBefore + heartsRewarded);
        assert.equal(sharesOwned, 0);
    });

    it('should return supplier hearts staked and 100% stake payout', async () => {
        const supplierBalance = await getBalance(supplierAccount);
        assert.equal(supplierBalance, initialBalance - heartsStaked + heartsRewarded);
    });
});