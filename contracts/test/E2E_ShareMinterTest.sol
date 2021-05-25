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
        uint72 hearts,
        uint256 randomFee,
        uint256 stakedDays
    ) public {
        hexContract.mintHearts(address(this), uint256(hearts));
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

    function hex_skip_days(uint8 skipDays) public {
        uint256 currentDay = hexContract._currentDay();
        hexContract.setCurrentDay(currentDay + skipDays);
    }

    function echidna_all_stakes_received() public view returns (bool) {
        uint256 stakeCount = hexContract.stakeCount(address(minter));
        return stakeCount == shares.length;
    }

    function echidna_no_early_end_stake() public view returns (bool) {
        uint40 latestStakeId = hexContract._stakeId();
        for (uint40 stakeId = 0; stakeId <= latestStakeId; stakeId++) {
            (, , , uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, ) =
                hexContract._stakes(address(minter), stakeId);
            if (unlockedDay != 0 && unlockedDay < lockedDay + stakedDays) return false;
        }
        return true;
    }
}
