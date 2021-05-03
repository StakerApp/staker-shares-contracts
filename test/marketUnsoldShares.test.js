const { expect } = require("chai");

const init = require('../scripts/helpers/initEnvironment');
const evm = require('./helpers/evmExtensions');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MarketUnsoldShares - Valid No Buyer Scenario', () => {
    let hex, minter, market;
    let supplier, buyer;

    const fee = 10;
    const stakeId = 1001;
    const heartsStaked = BigNumber.from("5000000000000000");
    const marketShares = BigNumber.from("2907373303321738");
    const heartsRewarded = BigNumber.from("4951683751017396");
    const minterHeartsRewarded = BigNumber.from("50017007586034");

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        [supplier, buyer, claimer] = await init.getAccounts();

        env.init(hex, minter, market);
        await env.seedEnvironment(supplier, buyer, claimer);
    });

    it('should mint shares to market', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplier.address);

        // Act
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        const sharesOnMarket = (await market.listingBalances(stakeId)).shares;

        // Assert
        const supplierBalanceAfter = await getBalance(supplier.address);
        expect(supplierBalanceAfter).to.equal(supplierBalanceBefore.sub(heartsStaked));
        expect(marketShares).to.equal(sharesOnMarket);
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(3 * DAY);
        await hex.dailyDataUpdate(0);
        await hex.stakeGoodAccounting(minter.address, 0, stakeId);
    });

    it('should mint stake earnings to minter and market', async () => {
        // Arrange
        const marketBalanceBefore = await getBalance(market.address);
        const minterBalanceBefore = await getBalance(supplier.address);

        // Act
        await minter.mintEarnings(0, stakeId);
        await evm.catchRevert(minter.mintEarnings(0, stakeId));

        // Assert
        const marketBalanceAfter = await getBalance(market.address);
        const minterBalanceAfter = await getBalance(supplier.address);
        expect(marketBalanceAfter).to.equal(marketBalanceBefore.add(heartsRewarded));
        expect(minterBalanceAfter).to.equal(minterBalanceBefore.add(minterHeartsRewarded));
    });

    it('should allow supplier to claim earning', async () => {
        // Arrange
        const supplierBalanceBefore = await getBalance(supplier.address);

        // Act
        await market.supplierWithdraw(stakeId);
        const sharesOwned = await market.sharesOwned(stakeId, supplier.address);

        // Assert
        const supplierBalanceAfter = await getBalance(supplier.address);
        expect(supplierBalanceAfter).to.equal(supplierBalanceBefore.add(heartsRewarded));
        expect(sharesOwned).to.equal(0);
    });

    it('should return supplier hearts staked and 100% stake payout', async () => {
        const supplierBalance = await getBalance(supplier.address);
        expect(supplierBalance).to.equal(env.initialBalance.sub(heartsStaked).add(heartsRewarded).add(minterHeartsRewarded));
    });
});