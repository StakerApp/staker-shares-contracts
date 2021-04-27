const HEX = artifacts.require("HEX");
const ShareMinter = artifacts.require("ShareMinter");
const ShareMarket = artifacts.require("ShareMarket");

const evm = require('./helpers/EVMExtensions');

contract('MinterMarket - Owner Scenarios', (accounts) => {
    const StakerSafe = '0x52B87a21A4aaa1e1fb2A1d6709fF8192137b0dfA';
    const adminAccount = accounts[0];
    const unknownAccount = accounts[1];

    let hex;
    let minter;
    let market;

    before(async () => {
        hex = await HEX.deployed();
        minter = await ShareMinter.deployed(hex.address, accounts[0]);
        market = await ShareMarket.deployed(hex.address, minter.address);
    });

    it('should update buyer fee', async () => {
        // Arrange
        const expectedInitialFee = 10;
        const expectedUpdatedFee = 50;

        // Act
        const initialBuyerFee = await market.buyerFee();
        await market.updateBuyerFee(expectedUpdatedFee);
        const updatedBuyerFee = await market.buyerFee();

        // Assert
        assert.equal(expectedInitialFee, initialBuyerFee);
        assert.equal(expectedUpdatedFee, updatedBuyerFee);
    });

    it('should be able to transfer ownership', async () => {
        // Act
        await market.transferOwnership(StakerSafe);
        const newOwner = await market.owner();

        // Assert
        assert.equal(StakerSafe, newOwner);
    });

    it('should prevent transfer ownership from unknown', async () => {
        await evm.catchRevert(market.transferOwnership(unknownAccount));
    });

    it('should prevent updating buyer fee from unknown', async () => {
        await evm.catchRevert(market.updateBuyerFee(5));
    });
});