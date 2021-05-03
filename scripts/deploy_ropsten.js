const init = require('./helpers/initEnvironment');

async function main() {
    //Deploy everything
    [account1, account2, account3] = await init.getAccounts();
    [hex, minter, market] = await init.deployContracts();

    //Seed HEX with a stake
    const STAKED_HEX = "6173611628000000000";
    await hex.setBalance(account1.address, STAKED_HEX);
    await hex.stakeStart(STAKED_HEX, 3650, { gasLimit: 4000000 });

    //Sleep 60 seconds for Etherscan to recognize deployments
    await sleep(60000);

    //Verify ShareMinter
    await hre.run("verify:verify", {
        address: minter.address,
        constructorArguments: [hex.address],
    });

    //Verify ShareMarket
    await hre.run("verify:verify", {
        address: market.address,
        constructorArguments: [hex.address, minter.address],
    });
}

function sleep(ms) {
    return new Promise((resolve) => {
        setTimeout(resolve, ms);
    });
}

main()
    .then(() => process.exit(0))
    .catch(error => {
        console.error(error);
        process.exit(1);
    });