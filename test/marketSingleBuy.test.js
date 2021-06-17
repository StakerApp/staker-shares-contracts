const { expect } = require("chai");

const init = require('../scripts/helpers/initEnvironment');
const evm = require('./helpers/evmExtensions');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MarketSingleBuy - Valid Buyer Scenario', () => {
    let hex, minter, market;
    let supplier, buyer, claimer;

    const fee = 10;
    const stakeId = 1001;
    const heartsStaked = BigNumber.from("5000000000000000");
    const marketShares = BigNumber.from("2907373303321738");
    const heartsRewarded = BigNumber.from("4951683751017396");
    const splitHeartsRewarded = Math.floor(heartsRewarded.div(2));
    const minterHeartsRewarded = BigNumber.from("50017007586034");

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        [supplier, buyer, claimer] = await init.getAccounts();

        env.init(hex, minter, market);
        await env.seedEnvironment([supplier, buyer, claimer]);
    });

    it('should mint shares to market', async () => {
        // Arrange
        const supplierBalanceBefore = await env.getBalance(supplier.address);

        // Act
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        const sharesOnMarket = (await market.listingBalances(stakeId)).shares;

        // Assert
        const supplierBalanceAfter = await env.getBalance(supplier.address);
        expect(supplierBalanceAfter).to.equal(supplierBalanceBefore.sub(heartsStaked));
        expect(marketShares).to.equal(sharesOnMarket);
    });

    it('should allow buying shares from market for self', async () => {
        // Arrange
        const buyerBalanceBefore = await env.getBalance(buyer.address);
        const sharesBought = marketShares / 2;

        // Act
        await market.connect(buyer.signer).buyShares(stakeId, buyer.address, sharesBought);
        const sharesOnMarket = (await market.listingBalances(stakeId)).shares;
        const sharesOwned = await market.sharesOwned(stakeId, buyer.address);

        // Assert
        const buyerBalanceAfter = await env.getBalance(buyer.address);
        expect(buyerBalanceAfter).to.equal(buyerBalanceBefore.sub(heartsStaked.div(2)));
        expect(sharesOnMarket).to.equal(marketShares - sharesBought);
        expect(sharesOwned).to.equal(sharesBought);
    });

    it('should allow supplier to withdraw hearts from market before minting', async () => {
        // Arrange
        const minterEarnings = await market.supplierHeartsPayable(stakeId, supplier.address);
        const supplierBalanceBefore = await env.getBalance(supplier.address);

        // Act
        await market.supplierWithdraw(stakeId);
        await evm.catchRevert(market.supplierWithdraw(stakeId));

        // Assert
        const supplierBalanceAfter = await env.getBalance(supplier.address);
        expect(await market.supplierHeartsPayable(stakeId, supplier.address)).to.equal(0);
        expect(supplierBalanceAfter).to.equal(supplierBalanceBefore.add(heartsStaked.div(2)));
        expect(minterEarnings).to.equal(heartsStaked.div(2));
    });

    it('should allow buying shares from market for other', async () => {
        // Arrange
        const buyerBalanceBefore = await env.getBalance(buyer.address);
        const sharesBought = marketShares / 2;

        // Act
        await market.connect(buyer.signer).buyShares(stakeId, claimer.address, sharesBought);
        const sharesOnMarket = (await market.listingBalances(stakeId)).shares;
        const sharesOwned = await market.sharesOwned(stakeId, claimer.address);

        // Assert
        const buyerBalanceAfter = await env.getBalance(buyer.address);
        expect(buyerBalanceAfter).to.equal(buyerBalanceBefore.sub(heartsStaked.div(2)));
        expect(sharesOnMarket).to.equal(0);
        expect(sharesOwned).to.equal(sharesBought);
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(3 * DAY);
        await hex.dailyDataUpdate(0);
        await hex.stakeGoodAccounting(minter.address, 0, stakeId);
    });

    it('should mint stake earnings to minter and market', async () => {
        // Arrange
        const marketBalanceBefore = await env.getBalance(market.address);
        const minterBalanceBefore = await env.getBalance(supplier.address);

        // Act
        await minter.mintEarnings(0, stakeId);
        await evm.catchRevert(minter.mintEarnings(0, stakeId));

        // Assert
        const marketBalanceAfter = await env.getBalance(market.address);
        const minterBalanceAfter = await env.getBalance(supplier.address);
        expect(marketBalanceAfter).to.equal(marketBalanceBefore.add(heartsRewarded));
        expect(minterBalanceAfter).to.equal(minterBalanceBefore.add(minterHeartsRewarded));
    });

    it('should allow buyer to claim earnings', async () => {
        // Arrange
        const buyerBalanceBefore = await env.getBalance(buyer.address);

        // Act
        await market.connect(buyer.signer).claimEarnings(stakeId);
        const sharesOwned = await market.sharesOwned(stakeId, buyer.address);

        // Assert
        const buyerBalanceAfter = await env.getBalance(buyer.address);
        expect(buyerBalanceAfter).to.equal(buyerBalanceBefore.add(splitHeartsRewarded));
        expect(sharesOwned).to.equal(0);
    });

    it('should allow claimer to claim earnings', async () => {
        // Arrange
        const claimerBalanceBefore = await env.getBalance(claimer.address);

        // Act
        await market.connect(claimer.signer).claimEarnings(stakeId);
        const sharesOwned = await market.sharesOwned(stakeId, claimer.address);

        // Assert;
        const claimerBalanceAfter = await env.getBalance(claimer.address);
        expect(claimerBalanceAfter).to.equal(claimerBalanceBefore.add(splitHeartsRewarded));
        expect(sharesOwned).to.equal(0);
    });

    it('should allow supplier to withdraw hearts from market after minting', async () => {
        // Arrange
        const minterEarnings = await market.supplierHeartsPayable(stakeId, supplier.address);
        const supplierBalanceBefore = await env.getBalance(supplier.address);

        // Act
        await market.supplierWithdraw(stakeId);
        await evm.catchRevert(market.supplierWithdraw(stakeId));

        // Assert
        const supplierBalanceAfter = await env.getBalance(supplier.address);
        expect(await market.supplierHeartsPayable(stakeId, supplier.address)).to.equal(0);
        expect(supplierBalanceAfter).to.equal(supplierBalanceBefore.add(heartsStaked.div(2)));
        expect(minterEarnings).to.equal(heartsStaked.div(2));
    });

    it('should return supplier hearts staked and 1% stake payout', async () => {
        const supplierBalance = await env.getBalance(supplier.address);
        expect(supplierBalance).to.equal(env.initialBalance.add(minterHeartsRewarded));
    });
});