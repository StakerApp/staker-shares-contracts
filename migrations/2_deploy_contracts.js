const HEX = artifacts.require("HEX");
const ShareMinter = artifacts.require("ShareMinter");
const ShareMarket = artifacts.require("ShareMarket");

const StakerSafe = '0x52B87a21A4aaa1e1fb2A1d6709fF8192137b0dfA';

module.exports = async function (deployer, network, accounts) {
  if (network == 'ropsten' || network == 'ropsten-fork') {
    const hex = await HEX.at('0xF1633e8D441F6F5E953956e31923F98B53c9fd89');
    await deployer.deploy(ShareMinter, hex.address);
    const market = await deployer.deploy(ShareMarket, hex.address, ShareMinter.address);
    await market.transferOwnership(StakerSafe);

  } else if (network == 'mainnet' || network == 'mainnet-fork') {
    const hex = await HEX.at('0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39');
    await deployer.deploy(ShareMinter, hex.address);
    const market = await deployer.deploy(ShareMarket, hex.address, ShareMinter.address);
    await market.transferOwnership(StakerSafe);

  } else {
    await deployer.deploy(HEX);
    await deployer.deploy(ShareMinter, HEX.address);
    await deployer.deploy(ShareMarket, HEX.address, ShareMinter.address);
    // Skip ownership transfer for development environment

  }
};
