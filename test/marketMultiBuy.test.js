const { expect } = require("chai");

const init = require('../scripts/helpers/initEnvironment');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MarketMultiBuy - Valid Buyer Scenario', () => {
    let hex, minter, market;
    let supplier, buyer;

    const fee = 10;
    const stakeId = 1001;
    const heartsStaked = BigNumber.from("2000000000000000");

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        [supplier, buyer, claimer] = await init.getAccounts();
        
        env.init(hex, minter, market);
        await env.seedEnvironment([supplier, buyer, claimer]);

        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
    });

    it('should allow multi buying shares from market for self', async () => {
        // Act
        await market.connect(buyer.signer).multiBuyShares([
            { stakeId: stakeId, shareReceiver: buyer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 1, shareReceiver: buyer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 2, shareReceiver: buyer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 3, shareReceiver: buyer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 4, shareReceiver: buyer.address, sharesPurchased: 5000000000 }]);

        // Assert
        expect(await market.sharesOwned(stakeId, buyer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 1, buyer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 2, buyer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 3, buyer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 4, buyer.address)).to.equal(5000000000);
    });

    it('should allow multi buying shares from market for other', async () => {
        // Act
        await market.connect(buyer.signer).multiBuyShares([
            { stakeId: stakeId, shareReceiver: claimer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 1, shareReceiver: claimer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 2, shareReceiver: claimer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 3, shareReceiver: claimer.address, sharesPurchased: 5000000000 },
            { stakeId: stakeId + 4, shareReceiver: claimer.address, sharesPurchased: 5000000000 }]);

        // Assert
        expect(await market.sharesOwned(stakeId, claimer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 1, claimer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 2, claimer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 3, claimer.address)).to.equal(5000000000);
        expect(await market.sharesOwned(stakeId + 4, claimer.address)).to.equal(5000000000);
    });
});