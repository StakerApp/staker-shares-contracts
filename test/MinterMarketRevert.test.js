const HEX = artifacts.require("HEX");
const ShareMinter = artifacts.require("ShareMinter");
const ShareMarket = artifacts.require("ShareMarket");

const evm = require('./helpers/EVMExtensions');

contract('MinterMarket - Invalid Scenarios', (accounts) => {
    const supplierAccount = accounts[0];
    const buyerAccount = accounts[1];

    const stakeId = 1001;
    const heartsStaked = 50000;
    const shares = 29937;
    const marketShares = 29638;

    let hex;
    let minter;
    let market;

    let setBalance = async (address, value) => await hex.setBalance(address, value);

    before(async () => {
        hex = await HEX.deployed();
        await hex.dailyDataUpdate(0);
        minter = await ShareMinter.deployed(hex.address, accounts[0]);
        market = await ShareMarket.deployed(hex.address, minter.address);

        await setBalance(supplierAccount, 100000);
        await setBalance(buyerAccount, 100000);

        await hex.approve(minter.address, 100000000000000);
        await hex.approve(market.address, 100000000000000, { from: buyerAccount });

        //mint shares in setup
        await minter.mintShares(market.address, supplierAccount, heartsStaked, 1);
    });

    it('should revert ending immature stake', async () => {
        await evm.catchRevert(minter.mintEarnings(0, stakeId));
    });

    it('should revert calling market invalid minter', async () => {
        await evm.catchRevert(market.onSharesMinted(
            stakeId,
            supplierAccount,
            heartsStaked,
            shares
        ));
        await evm.catchRevert(market.onEarningsMinted(
            stakeId,
            shares
        ));
    });

    it('should revert calling invalid receiver', async () => {
        await evm.catchRevert(minter.mintShares(buyerAccount, supplierAccount, heartsStaked, 1));
    });

    it('should revert not enough shares available', async () => {
        await market.buyShares(stakeId, buyerAccount, marketShares, { from: buyerAccount });
        await evm.catchRevert(market.buyShares(stakeId, buyerAccount, marketShares, { from: buyerAccount }));
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(3 * DAY);
        await hex.dailyDataUpdate(0);
        await hex.stakeGoodAccounting(minter.address, 0, stakeId);
    });

    it('should revert minting earnings 2x', async () => {
        await minter.mintEarnings(0, stakeId);
        await evm.catchRevert(minter.mintEarnings(0, stakeId));
    });

    it('should revert claiming share earnings 2x', async () => {
        await market.claimEarnings(stakeId, { from: buyerAccount });
        await evm.catchRevert(market.claimEarnings(stakeId, { from: buyerAccount }));
    });

    it('should revert supplier withdraw 2x', async () => {
        await market.supplierWithdraw(stakeId);
        await evm.catchRevert(market.supplierWithdraw(stakeId));
    });
});