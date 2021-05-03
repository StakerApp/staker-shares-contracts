const init = require('./helpers/initEnvironment');

async function main() {
    //Deploy everything except HEX contract
    [account1, account2, account3] = await init.getAccounts();
    [hex, minter, market] = await init.deployContracts("0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39");

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