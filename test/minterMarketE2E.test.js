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
    const stakeLength = 5555;

    before(async () => {
        [hex, minter, market] = await init.deployContracts();
        env.init(hex, minter, market);

        allUsers = await init.getManyAccounts(550);
        suppliers = allUsers.slice(0, 50);
        buyers = allUsers.slice(50, 300);
        claimers = allUsers.slice(300, 550);

        await env.seedEnvironment(allUsers);
    });

    var stakeIds = [];
    it('should allow many minters to mint', async () => {
        //mint random amount of hex
        for (var i = 0; i < suppliers.length; i++) {
            let supplier = suppliers[i];
            let fee = Math.floor(Math.random() * 999);
            await minter
                .connect(supplier.signer)
                .mintShares(fee, market.address, supplier.address, heartsStaked, stakeLength);
            stakeIds.push(stakeId);
            stakeId++;
        }
    });

    var openClaimAddresses = [];
    it('should allow many buyers to buy', async () => {
        for (var i = 0; i < buyers.length; i++) {
            let buyer = buyers[Math.floor(Math.random() * buyers.length)];
            let stakeId = stakeIds[Math.floor(Math.random() * stakeIds.length)];
            let sharesOnMarket = (await market.listingBalances(stakeId)).shares;
            let sharesToPurchase = sharesOnMarket.div(Math.floor(Math.random() * 10 + 2));

            if (Math.random() < 0.5) {
                //buy for self
                await market
                    .connect(buyer.signer)
                    .buyShares(stakeId, buyer.address, sharesToPurchase);
                openClaimAddresses.push(buyer.address);
            } else {
                //buy for other
                let claimer = claimers[Math.floor(Math.random() * claimers.length)];
                await market
                    .connect(buyer.signer)
                    .buyShares(stakeId, claimer.address, sharesToPurchase);
                openClaimAddresses.push(claimer.address);
            }
        }
    });

    // it('should allow many claimers to claim', async () => {
    //     for (var i = 0; i < openClaimAddresses.length; i++) {
    //         //claim for self
    //     }
    // });

    // it('should allow many suppliers to withdraw', async () => {
    //     //withdraw for self
    //     //attempt to withdraw with nothing
    // });

    // const heartsToStake = (user) => {
    //     const max = await env.getBalance(user.address);
    //     const min = Math.ceil(max.div(10));
    //     return Math.floor(Math.random().multiply((max.sub(min)).add(min)));
    // }

    // const mintSharesToMarket = (user) => {
    //     const userBalanceBefore = await env.getBalance(user.address);

    //     // Act
    //     await minter.mintShares(fee, market.address, user.address, heartsStaked, 1);
    //     const sharesOnMarket = (await market.listingBalances(stakeId)).shares;

    //     // Assert
    //     const userBalanceAfter = await env.getBalance(user.address);
    //     expect(userBalanceAfter).to.equal(userBalanceBefore.sub(heartsStaked));
    //     expect(marketShares).to.equal(sharesOnMarket);
    // }
});