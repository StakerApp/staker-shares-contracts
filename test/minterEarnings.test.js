const { expect } = require("chai");

const init = require('../scripts/helpers/initEnvironment');
const evm = require('./helpers/evmExtensions');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MinterEarnings - Valid Scenarios', () => {
    let hex, minter, market;
    let minter1, minter2;

    const fee = 10;
    const stakeId = 1001;
    const heartsStaked = BigNumber.from("5000000000000000");
    const minterHeartsRewarded = BigNumber.from("50016993826471");

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        [minter1, minter2, minter3] = await init.getAccounts();

        env.init(hex, minter, market);
        await env.seedEnvironment([minter1, minter2, minter3]);

        //Minter 1
        await minter.mintShares(fee, market.address, minter1.address, heartsStaked, 1);
        await minter.mintShares(fee, market.address, minter1.address, heartsStaked, 1);
        //Minter 2
        await minter.connect(minter2.signer).mintShares(fee, market.address, minter2.address, heartsStaked, 1);
        await minter.connect(minter2.signer).mintShares(fee, market.address, minter2.address, heartsStaked, 1);
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(3 * DAY);
        await hex.dailyDataUpdate(0);
        await hex.stakeGoodAccounting(minter.address, 0, stakeId);
        await hex.stakeGoodAccounting(minter.address, 1, stakeId + 1);
        await hex.stakeGoodAccounting(minter.address, 2, stakeId + 2);
        await hex.stakeGoodAccounting(minter.address, 3, stakeId + 3);
    });

    it('should pay earnings directly to minter if caller - within grace period', async () => {
        // Arrange
        const minterBalanceBefore = await env.getBalance(minter1.address);

        // Act
        await minter.mintEarnings(0, stakeId);

        // Assert
        const minterBalanceAfter = await env.getBalance(minter1.address);
        expect(minterBalanceAfter).to.equal(minterBalanceBefore.add(minterHeartsRewarded));
    });

    it('should record earnings for minter if minter not caller - within grace period', async () => {
        // Act
        await minter.connect(minter2.signer).mintEarnings(1, stakeId + 1);

        // Assert
        const minterHeartsOwed = await minter.minterHeartsOwed(minter1.address);
        expect(minterHeartsOwed).to.equal(minterHeartsRewarded);
    });

    it('should all minter to withdraw unclaimed earnings', async () => {
        // Arrange
        const minterBalanceBefore = await env.getBalance(minter1.address);
        const minterHeartsOwed = (await minter.minterHeartsOwed(minter1.address)).toNumber();

        // Act
        await minter.minterWithdraw();
        await evm.catchRevert(minter.minterWithdraw());

        // Assert
        const minterBalanceAfter = await env.getBalance(minter1.address);
        expect(minterBalanceAfter).to.equal(minterBalanceBefore.add(minterHeartsOwed));
    });

    it('should skip past minter grace period', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(11 * DAY);
        await hex.dailyDataUpdate(0);
    });

    it('should pay earnings directly to minter if caller - outside grace period', async () => {
        // Arrange
        const minterBalanceBefore = await env.getBalance(minter2.address);

        // Act
        await minter.connect(minter2.signer).mintEarnings(1, stakeId + 2);

        // Assert
        const minterBalanceAfter = await env.getBalance(minter2.address);
        expect(minterBalanceAfter).to.equal(minterBalanceBefore.add(minterHeartsRewarded));
    });

    it('should pay earnings to caller - outside grace period', async () => {
        // Arrange
        const callerBalanceBefore = await env.getBalance(minter1.address);

        // Act
        await minter.mintEarnings(0, stakeId + 3);

        // Assert
        const callerBalanceAfter = await env.getBalance(minter1.address);
        expect(callerBalanceAfter).to.equal(callerBalanceBefore.add(minterHeartsRewarded));
    });

});