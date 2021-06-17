// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.0;

import "./HEXMock.sol";
import "../ShareMinter.sol";
import "../ShareMarket.sol";

contract E2E_ShareMarketTest is ShareMarket {
    HEX private _hexState = new HEX();

    uint256 private constant INITIAL_BALANCE = 1e19;
    uint72 private constant STAKE_HEARTS = 1e17;
    uint72 private constant STAKE_SHARES = 1e15;
    uint72 private constant REWARD_HEARTS = 1e17;

    constructor() ShareMarket(IERC20(address(_hexState)), address(this)) {
        _hexState.mintHearts(address(this), INITIAL_BALANCE);
        _hexState.mintHearts(address(0x10000), INITIAL_BALANCE);
        _hexState.mintHearts(address(0x20000), INITIAL_BALANCE);
        _hexState.mintHearts(address(0x00a329C0648769a73afAC7F9381e08fb43DBEA70), INITIAL_BALANCE);
    }

    uint40 private _latestStakeId;

    struct Listing {
        uint40 stakeId;
        address supplier;
        uint72 stakedHearts;
        uint72 stakeShares;
        uint72 heartsEarned;
        bool earningsMinted;
    }
    Listing[] public _listings;

    uint256 private _heartsInterestMinted;

    function mint_shares(
        uint72 stakeHearts,
        uint72 stakeShares,
        uint72 rewardHearts
    ) public {
        require(stakeHearts != 0 && stakeShares != 0 && rewardHearts >= stakeHearts, "Invalid params");
        Listing memory listing = Listing(_latestStakeId++, msg.sender, stakeHearts, stakeShares, rewardHearts, false);

        _hexState.burnHearts(msg.sender, listing.stakedHearts);
        this.onSharesMinted(listing.stakeId, listing.supplier, listing.stakedHearts, listing.stakeShares);

        _listings.push(listing);
    }

    function mint_earnings() public {
        require(_listings.length != 0, "Requires listings");
        for (uint256 i = 0; i < _listings.length; i++) {
            Listing storage listing = _listings[i];
            if (listing.earningsMinted) continue;

            listing.earningsMinted = true;
            _hexState.mintHearts(address(this), listing.heartsEarned);
            _heartsInterestMinted += listing.heartsEarned - listing.stakedHearts;
            this.onEarningsMinted(listing.stakeId, listing.heartsEarned);
        }
    }

    function echidna_buy_shares() public returns (bool) {
        for (uint256 i = 0; i < _listings.length; i++) {
            Listing memory listing = _listings[i];
            (uint256 heartsBalance, uint256 sharesBalance) = this.listingBalances(listing.stakeId);

            if (sharesBalance != 0 && heartsBalance != 0 && hexContract.balanceOf(msg.sender) >= heartsBalance) {
                uint256 balBef = hexContract.balanceOf(msg.sender);
                uint256 sharesBef = this.sharesOwned(listing.stakeId, msg.sender);
                address(this).delegatecall(
                    abi.encodeWithSignature(
                        "buyShares(uint40,address,uint256)",
                        listing.stakeId,
                        msg.sender,
                        sharesBalance
                    )
                );
                uint256 balAft = hexContract.balanceOf(msg.sender);
                uint256 sharesAft = this.sharesOwned(listing.stakeId, msg.sender);

                uint256 heartsCost = balBef - balAft;
                if (heartsCost != heartsBalance) return false;

                uint256 sharesGained = sharesAft - sharesBef;
                if (sharesGained != sharesBalance) return false;
            }
        }
        return true;
    }

    function echidna_claim_earnings() public returns (bool) {
        for (uint256 i = 0; i < _listings.length; i++) {
            Listing memory listing = _listings[i];
            if (!listing.earningsMinted) continue;

            uint256 sharesOwned = this.sharesOwned(listing.stakeId, msg.sender);
            (uint256 heartsEarned, uint256 sharesTotal) = this.listingEarnings(listing.stakeId);
            uint256 expectedHeartsEarned = FullMath.mulDiv(heartsEarned, sharesOwned, sharesTotal);

            if (sharesOwned != 0 && heartsEarned != 0 && expectedHeartsEarned != 0) {
                uint256 balBef = hexContract.balanceOf(msg.sender);
                address(this).delegatecall(abi.encodeWithSignature("claimEarnings(uint40)", listing.stakeId));
                uint256 balAft = hexContract.balanceOf(msg.sender);
                uint256 earnings = balAft - balBef;

                if (expectedHeartsEarned != earnings) return false;
            }
        }
        return true;
    }

    function echidna_balance_never_exceeds_initial_plus_interest() public view returns (bool) {
        return
            hexContract.balanceOf(address(0x10000)) <= INITIAL_BALANCE + _heartsInterestMinted &&
            hexContract.balanceOf(address(0x20000)) <= INITIAL_BALANCE + _heartsInterestMinted &&
            hexContract.balanceOf(address(0x00a329C0648769a73afAC7F9381e08fb43DBEA70)) <=
            INITIAL_BALANCE + _heartsInterestMinted;
    }

    //hearts in listing cannot exceed hearts staked
    function echidna_listing_values_cannot_exceed_initial() public view returns (bool) {
        for (uint256 i = 0; i < _listings.length; i++) {
            Listing memory listing = _listings[i];
            ShareListing memory shareListing = shareListings[listing.stakeId];

            if (shareListing.heartsBalance > listing.stakedHearts || shareListing.sharesBalance > listing.stakeShares)
                return false;
        }
        return true;
    }
}
