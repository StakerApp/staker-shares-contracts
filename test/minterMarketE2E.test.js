const { expect } = require("chai");

const init = require('../scripts/helpers/initEnvironment');
const evm = require('./helpers/evmExtensions');
const env = require('./helpers/envExtensions');

const BigNumber = ethers.BigNumber;

describe('MinterMarketE2E - Many accounts... this can take a while', function () {
    this.timeout(120000);

    let hex, minter, market;
    let allUsers, suppliers, buyers, claimers;

    let stakeId = 1001;
    const heartsStaked = BigNumber.from("1000000000000000");
    const stakeLength = 10;

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        env.init(hex, minter, market);

        allUsers = await init.getManyAccounts(550);
        suppliers = allUsers.slice(0, 50);
        buyers = allUsers.slice(50, 300);
        claimers = allUsers.slice(300, 550);

        await env.seedEnvironment(allUsers);
    });

    var stakesSupplied = [];
    it('should allow many minters to mint', async () => {
        //mint random amount of hex
        for (var i = 0; i < suppliers.length; i++) {
            let supplier = suppliers[i];
            let fee = Math.floor(Math.random() * 999);
            await minter
                .connect(supplier.signer)
                .mintShares(fee, market.address, supplier.address, heartsStaked, stakeLength);
            stakesSupplied.push({
                stakeId,
                address: supplier.address,
                signer: supplier.signer
            });
            stakeId++;
        }
    });

    var openClaimAddresses = [];
    it('should allow many buyers to buy', async () => {
        for (var i = 0; i < buyers.length; i++) {
            let buyer = buyers[Math.floor(Math.random() * buyers.length)];
            let stakeId = stakesSupplied[Math.floor(Math.random() * stakesSupplied.length)].stakeId;
            let sharesOnMarket = (await market.listingBalances(stakeId)).shares;
            let sharesToPurchase = sharesOnMarket.div(Math.floor(Math.random() * 10 + 2));

            const balBefore = await env.getBalance(buyer.address);
            if (Math.random() < 0.5) {
                //buy for self
                await market
                    .connect(buyer.signer)
                    .buyShares(stakeId, buyer.address, sharesToPurchase);
                openClaimAddresses.push({ stakeId, address: buyer.address, signer: buyer.signer });
            } else {
                //buy for other
                let claimer = claimers[Math.floor(Math.random() * claimers.length)];
                await market
                    .connect(buyer.signer)
                    .buyShares(stakeId, claimer.address, sharesToPurchase);
                openClaimAddresses.push({ stakeId, address: claimer.address, signer: claimer.signer });
            }
            const balAfter = await env.getBalance(buyer.address);

            expect(balAfter).to.be.below(balBefore);
        }
    });

    it('should skip to stake maturity', async () => {
        const DAY = 84000;
        await evm.advanceTimeAndBlock(12 * DAY);
        await hex.dailyDataUpdate(0);
    });

    it('should mint stake earnings', async () => {
        //end in reverse order since stake index shifts otherwise
        for (var i = stakesSupplied.length - 1; i >= 0; i--) {
            let { stakeId, address, signer } = stakesSupplied[i];
            await minter
                .connect(signer)
                .mintEarnings(i, stakeId);
        }
    });

    const completedClaim = {};
    it('should allow many claimers to claim', async () => {
        for (var i = 0; i < openClaimAddresses.length; i++) {
            let { stakeId, address, signer } = openClaimAddresses[i];

            if (completedClaim[stakeId + address]) {
                continue;
            }
            const balBefore = await env.getBalance(address);
            await market
                .connect(signer)
                .claimEarnings(stakeId);
            completedClaim[stakeId + address] = true;
            const balAfter = await env.getBalance(address);

            expect(balAfter).to.be.above(balBefore);
        }
    });

    it('should allow many suppliers to withdraw', async () => {
        for (var i = 0; i < suppliers.length; i++) {
            let { stakeId, address, signer } = stakesSupplied[i];

            const balBefore = await env.getBalance(address);
            await market
                .connect(signer)
                .supplierWithdraw(stakeId);
            const balAfter = await env.getBalance(address);

            expect(balAfter).to.be.above(balBefore);
        }
    });
});