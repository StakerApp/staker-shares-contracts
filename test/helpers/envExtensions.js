const BigNumber = ethers.BigNumber;

const INITIAL_BALANCE = "10000000000000000"; //100m HEX
const STAKED_HEX = "6173611628000000000"; //61.7b HEX

let hex, minter, market;

init = (_hex, _minter, _market) => {
    hex = _hex;
    minter = _minter;
    market = _market;
}

getBalance = async (address) => (await hex.balanceOf(address));

setBalance = async (address, value) => await hex.setBalance(address, value);

logStakes = async (address) => {
    let stakeCount = (await hex.stakeCount(address)).toNumber();
    for (var i = 0; i < stakeCount; i++) {
        let stake = await hex.stakeLists(address, i);
        console.log(stake);
    }
}

seedEnvironment = async (account1, account2, account3) => {
    await setBalance(account1.address, STAKED_HEX);
    await hex.connect(account1.signer).stakeStart(STAKED_HEX, 3650);

    await setBalance(account1.address, INITIAL_BALANCE);
    await setBalance(account2.address, INITIAL_BALANCE);
    await setBalance(account3.address, INITIAL_BALANCE);

    await hex.connect(account1.signer).approve(minter.address, INITIAL_BALANCE);
    await hex.connect(account2.signer).approve(minter.address, INITIAL_BALANCE);
    await hex.connect(account3.signer).approve(minter.address, INITIAL_BALANCE);

    await hex.connect(account1.signer).approve(market.address, INITIAL_BALANCE);
    await hex.connect(account2.signer).approve(market.address, INITIAL_BALANCE);
    await hex.connect(account3.signer).approve(market.address, INITIAL_BALANCE);
}

module.exports = {
    init,
    initialBalance: BigNumber.from(INITIAL_BALANCE),
    getBalance,
    setBalance,
    logStakes,
    seedEnvironment
}