const HEX = artifacts.require("HEX");
const ShareMinter = artifacts.require("ShareMinter");
const ShareMarket = artifacts.require("ShareMarket");

const evm = require('./helpers/EVMExtensions');

contract('MinterMarket - Valid Buyer Scenario', (accounts) => {
    const supplierAccount = accounts[0];
    const buyerAccount = accounts[1];
    const claimerAccount = accounts[2];

    const stakeId = 1001;
    const heartsStaked = 50000;
    const shares = 29937;
    const marketShares = 29638;
    const heartsRewarded = 50019;
    const splitHeartsRewarded = 24759;
    const supplierHeartsRewarded = 499;

    const initialBalance = 100000;

    let hex;
    let minter;
    let market;

    let getBalance = async (address) => (await hex.balanceOf.call(address)).toNumber();
    let setBalance = async (address, value) => await hex.setBalance(address, value);

    before(async () => {
        hex = await HEX.deployed();
        await hex.dailyDataUpdate(0);
        minter = await ShareMinter.deployed(hex.address, accounts[0]);
        market = await ShareMarket.deployed(hex.address, minter.address);

        await setBalance(supplierAccount, initialBalance);
        await setBalance(buyerAccount, initialBalance);

        await hex.approve(minter.address, 100000000000000);
        await hex.approve(market.address, 100000000000000, { from: buyerAccount });
    });

    it('should mint shares to market', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplierAccount);

        // Act
        await minter.mintShares(market.address, supplierAccount, heartsStaked, 1);
        const sharesOnMarket = (await market.shareListings(stakeId)).sharesAvailable;

        // Assert
        const supplierBalanceAfter = await getBalance(supplierAccount);
        assert.equal(supplierBalanceAfter, supplierBalanceBefore - heartsStaked);
        assert.equal(marketShares, sharesOnMarket);
    });

    it('should allow buying shares from market for self', async () => {
        // Arrange
        const buyerBalanceBefore = await getBalance(buyerAccount);
        const sharesBought = marketShares / 2;

        // Act
        await market.buyShares(stakeId, buyerAccount, sharesBought, { from: buyerAccount });
        const sharesOnMarket = (await market.shareListings(stakeId)).sharesAvailable;
        const sharesOwned = await market.sharesOwned(stakeId, buyerAccount);

        // Assert
        const buyerBalanceAfter = await getBalance(buyerAccount);
        assert.equal(buyerBalanceAfter, buyerBalanceBefore - heartsStaked / 2);
        assert.equal(sharesOnMarket, marketShares - sharesBought);
        assert.equal(sharesOwned, sharesBought);
    });

    it('should allow buying shares from market for other', async () => {
        // Arrange
        const buyerBalanceBefore = await getBalance(buyerAccount);
        const sharesBought = marketShares / 2;

        // Act
        await market.buyShares(stakeId, claimerAccount, sharesBought, { from: buyerAccount });
        const sharesOnMarket = (await market.shareListings(stakeId)).sharesAvailable;
        const sharesOwned = await market.sharesOwned(stakeId, claimerAccount);

        // Assert
        const buyerBalanceAfter = await getBalance(buyerAccount);
        assert.equal(buyerBalanceAfter, buyerBalanceBefore - heartsStaked / 2);
        assert.equal(sharesOnMarket, 0);
        assert.equal(sharesOwned, sharesBought);
    });

    it('should allow supplier to withdraw hearts from market', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplierAccount);

        // Act
        await market.supplierWithdraw(stakeId);
        await evm.catchRevert(market.supplierWithdraw(stakeId));

        // Assert
        const supplierBalanceAfter = await getBalance(supplierAccount);
        assert.equal(supplierBalanceAfter, supplierBalanceBefore + heartsStaked);

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
        await evm.catchRevert(minter.mintEarnings(0, stakeId));

        // Assert
        const marketBalanceAfter = await getBalance(market.address);
        assert.equal(marketBalanceAfter, marketBalanceBefore + heartsRewarded);
    });

    it('should allow buyer to claim earnings', async () => {
        // Arrange
        const buyerBalanceBefore = await getBalance(buyerAccount);

        // Act
        await market.claimEarnings(stakeId, { from: buyerAccount });
        const sharesOwned = await market.sharesOwned(stakeId, buyerAccount);

        // Assert
        const buyerBalanceAfter = await getBalance(buyerAccount);
        assert.equal(buyerBalanceAfter, buyerBalanceBefore + splitHeartsRewarded);
        assert.equal(sharesOwned, 0);
    });

    it('should allow claimer to claim earnings', async () => {
        // Arrange
        const claimerBalanceBefore = await getBalance(claimerAccount);

        // Act
        await market.claimEarnings(stakeId, { from: claimerAccount });
        const sharesOwned = await market.sharesOwned(stakeId, claimerAccount);

        // Assert;
        const claimerBalanceAfter = await getBalance(claimerAccount);
        assert.equal(claimerBalanceAfter, claimerBalanceBefore + splitHeartsRewarded);
        assert.equal(sharesOwned, 0);
    });

    it('should allow supplier to claim earnings', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplierAccount);

        // Act
        await market.claimEarnings(stakeId);
        const sharesOwned = await market.sharesOwned(stakeId, supplierAccount);

        // Assert;
        const supplierBalanceAfter = await getBalance(supplierAccount);
        assert.equal(supplierBalanceAfter, supplierBalanceBefore + supplierHeartsRewarded);
        assert.equal(sharesOwned, 0);
    });

    it('should return supplier hearts staked and 1% stake payout', async () => {
        const supplierBalance = await getBalance(supplierAccount);
        assert.equal(supplierBalance, initialBalance + supplierHeartsRewarded);
    });
});