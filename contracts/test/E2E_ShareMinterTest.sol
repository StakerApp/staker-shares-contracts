// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./HEXMock.sol";
import "../ShareMinter.sol";

contract E2E_ShareMinterTest is MinterReceiver, ShareMinter {
    HEX private _hexState = new HEX();

    uint256 private stakeCount;
    uint40[] private openStakes;

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

    constructor() ShareMinter(_hexState) {
        _hexState.mintHearts(address(this), 1e19);
        _hexState.mintHearts(address(0x10000), 1e19); //10b HEX
        _hexState.mintHearts(address(0x90000), 0); //0 HEART
        _hexState.mintHearts(address(0x00a329C0648769a73afAC7F9381e08fb43DBEA70), 1e19);
    }

    function onSharesMinted(
        uint40 stakeId,
        address supplier,
        uint72 stakedHearts,
        uint72 stakeShares
    ) external override {
        openStakes.push(stakeId);
        stakeCount++;
    }

    function onEarningsMinted(uint40 stakeId, uint72 heartsEarned) external override {}

    //mint earnings minter fee invariant
    function echidna_minter_withdraw() public returns (bool) {
        uint256 heartsOwed = minterHeartsOwed[msg.sender];
        if (heartsOwed == 0) return true;

        uint256 balBef = hexContract.balanceOf(msg.sender);
        address(this).delegatecall(abi.encodeWithSignature("minterWithdraw()"));
        uint256 balAft = hexContract.balanceOf(msg.sender);
        return heartsOwed == balAft - balBef;
    }

    function echidna_all_stakes_received() public view returns (bool) {
        return stakeCount == hexContract.stakeCount(address(this));
    }

    function echidna_mature_stake_mintable() public returns (bool) {
        uint256 openStakesLength = openStakes.length;
        if (openStakesLength > 100) openStakesLength = 100;
        for (uint256 i = openStakesLength; i > 0; i--) {
            (uint40 stakeId, , , uint16 lockedDay, uint16 stakedDays, uint16 unlockedDay, ) =
                hexContract.stakeLists(address(this), openStakes[i - 1]);

            if (
                unlockedDay == 0 &&
                hexContract.currentDay() > lockedDay &&
                hexContract.currentDay() - uint256(lockedDay) >= uint256(stakedDays)
            ) {
                address(this).delegatecall(abi.encodeWithSignature("mintEarnings(uint256,uint40)", 0, stakeId));
                (bool ended, , ) = _hexState._stakesMetadata(address(this), stakeId);

                if (ended) delete openStakes[i - 1];
                if (!ended) return false;
            }
        }
        return true;
    }

    function echidna_no_early_end_stake() public returns (bool) {
        uint256 openStakesLength = openStakes.length;
        if (openStakesLength > 100) openStakesLength = 100;
        for (uint256 i = openStakesLength; i > 0; i--) {
            uint40 stakeId = openStakes[i - 1];
            (bool ended, bool endedEarly, ) = _hexState._stakesMetadata(address(this), stakeId);

            if (ended) delete openStakes[i - 1];
            if (endedEarly) return false;
        }
        return true;
    }
}
