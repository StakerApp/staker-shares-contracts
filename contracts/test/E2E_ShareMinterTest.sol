// SPDX-License-Identifier: UNLICENSED
pragma solidity 0.8.4;

import "./contracts/HEXMock.sol";
import "./contracts/ShareMinterFlat.sol";

contract E2E_ShareMinterTest is MinterReceiver {
    HEX private hexContract;
    ShareMinter private minter;

    struct MintedShares {
        uint40 stakeId;
        address supplier;
        uint24 unlockDay;
        uint72 stakedHearts;
        uint72 stakeShares;
    }
    MintedShares[] private shares;

    struct MintedEarnings {
        uint40 stakeId;
        uint72 heartsEarned;
    }
    MintedEarnings[] private earnings;

    constructor() {
        hexContract = new HEX();
        minter = new ShareMinter(hexContract);
    }

    function onSharesMinted(
        uint40 stakeId,
        address supplier,
        uint72 stakedHearts,
        uint72 stakeShares
    ) external override {
        (, , , uint16 _lockedDay, uint16 _stakedDays, , ) = hexContract.stakeLists(address(minter), stakeId);
        shares.push(MintedShares(stakeId, supplier, _lockedDay + _stakedDays, stakedHearts, stakeShares));
    }

    function onEarningsMinted(uint40 stakeId, uint72 heartsEarned) external override {
        earnings.push(MintedEarnings(stakeId, heartsEarned));
    }

    function random() private view returns (uint256) {
        return uint256(keccak256(abi.encodePacked(block.difficulty, block.timestamp)));
    }

    function mint_shares(
        uint256 hearts,
        uint256 randomFee,
        uint256 stakedDays
    ) public {
        hexContract.mintHearts(address(this), hearts);
        minter.mintShares(uint16(randomFee), MinterReceiver(this), address(this), hearts, uint16(stakedDays));
    }

    function mint_earnings() public {
        uint256 sharesLength = shares.length;
        require(sharesLength > 0, "shares must exist");

        uint256 randomPosition = random() % sharesLength;
        MintedShares memory mintedShares = shares[randomPosition];

        minter.mintEarnings(0, mintedShares.stakeId);
    }

    function minter_withdraw() public {
        minter.minterWithdraw();
    }

    function echidna_test_mint() public returns (bool) {
        uint256 hearts = random();
        uint256 randomFee = random() % 999;
        uint256 stakedDays = random() % 5555;

        uint256 sharesLength = shares.length;
        mint_shares(hearts, randomFee, stakedDays);

        return sharesLength + 1 == shares.length;
    }

    function echidna_test_end() public returns (bool) {
        echidna_test_mint();

        uint256 sharesLength = shares.length;
        require(sharesLength > 0, "shares must exist");

        uint256 randomPosition = random() % sharesLength;
        MintedShares memory mintedShares = shares[randomPosition];

        uint256 earningsCount = earnings.length;
        hexContract.setCurrentDay(uint16(mintedShares.unlockDay));
        minter.mintEarnings(0, mintedShares.stakeId);
        return earningsCount + 1 == earnings.length;
    }
}
