getAccounts = async () => {
    const accounts = await ethers.getSigners();
    const supplierAddress = accounts[0] ? await accounts[0].getAddress() : null;
    const buyerAddress = accounts[1] ? await accounts[1].getAddress() : null;
    const claimerAddress = accounts[2] ? await accounts[2].getAddress() : null;
    return [
        {
            signer: accounts[0],
            address: supplierAddress
        },
        {
            signer: accounts[1],
            address: buyerAddress
        },
        {
            signer: accounts[2],
            address: claimerAddress
        }
    ];
}

deployContracts = async (hexAddress, minterAddress, marketAddress) => {
    const HEX = await ethers.getContractFactory("HEX");
    const ShareMinter = await ethers.getContractFactory("ShareMinter");
    const ShareMarket = await ethers.getContractFactory("ShareMarket");

    const hex = hexAddress
        ? HEX.attach(hexAddress)
        : await HEX.deploy();
    const minter = minterAddress
        ? ShareMinter.attach(minterAddress)
        : await ShareMinter.deploy(hex.address);
    const market = marketAddress
        ? ShareMarket.attach(marketAddress)
        : await ShareMarket.deploy(hex.address, minter.address);

    return [
        hex,
        minter,
        market
    ];
};

module.exports = {
    getAccounts,
    deployContracts
}