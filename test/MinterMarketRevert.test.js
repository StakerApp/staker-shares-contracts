
const init = require('../scripts/helpers/initEnvironment');
const evm = require('./helpers/evmExtensions');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MinterMarketRevert - Invalid Scenarios', () => {
    let hex, minter, market;
    let supplier, buyer, claimer;

    const fee = 10;
    const stakeId = 1001;
    const heartsStaked = BigNumber.from("5000000000000000");
    const shares = BigNumber.from("2907373303321738");
    const marketShares = BigNumber.from("2907373303321738");

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        [supplier, buyer, claimer] = await init.getAccounts();

        env.init(hex, minter, market);
        await env.seedEnvironment(supplier, buyer, claimer);

        //mint shares in setup
        await minter.mintShares(fee, market.address, supplier.address, heartsStaked, 1);
    });

    it('should revert premium too high', async () => {
        const FEE_MAX = 1000;
        await evm.catchRevert(minter.mintShares(FEE_MAX, market.address, supplier.address, heartsStaked, 1));
    });

    it('should revert ending immature stake', async () => {
        await evm.catchRevert(minter.mintEarnings(0, stakeId));
    });

    it('should revert claiming invalid stakeId', async () => {
        await evm.catchRevert(market.claimEarnings(0));
    });

    it('should revert claiming immature stakeId', async () => {
        await evm.catchRevert(market.claimEarnings(stakeId));
    });

    it('should revert calling market invalid minter', async () => {
        await evm.catchRevert(market.onSharesMinted(
            stakeId,
            supplier.address,
            heartsStaked,
            shares
        ));
        await evm.catchRevert(market.onEarningsMinted(
            stakeId,
            shares
        ));
    });

    it('should revert calling invalid receiver', async () => {
        await evm.catchRevert(minter.mintShares(fee, buyer.address, supplier.address, heartsStaked, 1));
    });

    it('should revert 0 shares purchased', async () => {
        await evm.catchRevert(market.connect(buyer.signer).buyShares(stakeId, buyer.address, 0));
    });

    it('should revert not enough shares available', async () => {
        await market.connect(buyer.signer).buyShares(stakeId, buyer.address, marketShares);
        await evm.catchRevert(market.connect(buyer.signer).buyShares(stakeId, buyer.address, marketShares));
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
        await market.connect(buyer.signer).claimEarnings(stakeId);
        await evm.catchRevert(market.connect(buyer.signer).claimEarnings(stakeId));
    });

    it('should revert minter withdraw none available', async () => {
        await evm.catchRevert(minter.minterWithdraw());
    });

    it('should revert supplier withdraw none available', async () => {
        await evm.catchRevert(market.supplierWithdraw(stakeId));
    });
});