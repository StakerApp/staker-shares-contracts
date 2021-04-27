// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./libraries/FullMath.sol";
import "./MinterReceiver.sol";

contract ShareMarket is Ownable, MinterReceiver {
    IERC20 public immutable hexContract;
    address public immutable minterContract;
    uint256 public buyerFee = 10;

    uint256 private constant FEE_SCALE = 1000;

    struct ShareOrder {
        uint40 stakeId;
        uint72 sharesPurchased;
        address shareReceiver;
    }
    struct ShareListing {
        uint8 buyerFee;
        uint72 heartsStaked;
        uint72 sharesTotal;
        uint72 sharesAvailable;
        uint72 heartsEarned;
        uint72 supplierHeartsOwed;
        address supplier;
        mapping(address => uint72) shareOwners;
    }
    mapping(uint40 => ShareListing) public shareListings;

    event BuyerFeeUpdate(uint8 oldFee, uint8 newFee);
    event AddListing(
        uint40 indexed stakeId,
        address indexed supplier,
        uint72 shares
    );
    event SharesUpdate(
        uint40 indexed stakeId,
        address indexed updater,
        uint72 sharesAvailable
    );
    event AddEarnings(uint40 indexed stakeId, uint72 heartsEarned);
    event BuyShares(
        uint40 indexed stakeId,
        address indexed owner,
        uint72 sharesPurchased,
        uint72 sharesOwned
    );
    event ClaimEarnings(
        uint40 indexed stakeId,
        address indexed claimer,
        uint256 heartsClaimed
    );
    event SupplierWithdraw(
        uint40 indexed stakeId,
        address indexed supplier,
        uint72 heartsWithdrawn
    );

    uint256 private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(IERC20 _hex, address _minter) {
        hexContract = _hex;
        minterContract = _minter;
    }

    function updateBuyerFee(uint8 newBuyerFee) external onlyOwner {
        emit BuyerFeeUpdate(uint8(buyerFee), newBuyerFee);
        buyerFee = uint256(newBuyerFee);
    }

    function listingDetails(uint40 stakeId)
        public
        view
        returns (
            uint72 hearts,
            uint72 shares,
            uint72 sharesAvailable
        )
    {
        ShareListing storage listing = shareListings[stakeId];
        hearts = listing.heartsStaked;
        shares = _marketShares(listing.sharesTotal, listing.buyerFee);
        sharesAvailable = listing.sharesAvailable;
    }

    function sharesOwned(uint40 stakeId, address owner)
        public
        view
        returns (uint72)
    {
        return shareListings[stakeId].shareOwners[owner];
    }

    function _supplierShares(uint72 sharesTotal, uint256 fee)
        private
        pure
        returns (uint72)
    {
        return uint72(FullMath.mulDiv(sharesTotal, fee, FEE_SCALE));
    }

    function _marketShares(uint72 sharesTotal, uint256 fee)
        private
        pure
        returns (uint72)
    {
        return sharesTotal - _supplierShares(sharesTotal, fee);
    }

    function onSharesMinted(
        uint40 stakeId,
        address supplier,
        uint72 stakedHearts,
        uint72 stakeShares
    ) external override {
        require(msg.sender == minterContract, "CALLER_NOT_MINTER");

        uint72 supplierShares = _supplierShares(stakeShares, buyerFee);
        uint72 marketShares = _marketShares(stakeShares, buyerFee);

        ShareListing storage listing = shareListings[stakeId];
        listing.buyerFee = uint8(buyerFee);
        listing.heartsStaked = stakedHearts;
        listing.sharesTotal = stakeShares;
        listing.sharesAvailable = marketShares;
        listing.supplier = supplier;
        emit AddListing(stakeId, supplier, marketShares);

        listing.shareOwners[supplier] = supplierShares;
        emit BuyShares(stakeId, supplier, 0, supplierShares);
    }

    function onEarningsMinted(uint40 stakeId, uint72 heartsEarned)
        external
        override
    {
        require(msg.sender == minterContract, "CALLER_NOT_MINTER");

        shareListings[stakeId].heartsEarned = heartsEarned;

        emit AddEarnings(stakeId, heartsEarned);
    }

    function _buyShares(
        uint40 stakeId,
        address shareReceiver,
        uint72 sharesPurchased
    ) private returns (uint72 heartsOwed) {
        require(sharesPurchased != 0, "INSUFFICIENT_SHARES_PURCHASED");

        ShareListing storage listing = shareListings[stakeId];

        require(
            sharesPurchased <= listing.sharesAvailable,
            "INSUFFICIENT_SHARES_AVAILABLE"
        );

        heartsOwed = uint72(
            FullMath.mulDivRoundingUp(
                sharesPurchased,
                listing.heartsStaked,
                _marketShares(listing.sharesTotal, listing.buyerFee)
            )
        );
        require(heartsOwed != 0, "INSUFFICIENT_HEARTS_INPUT");

        listing.sharesAvailable -= sharesPurchased;
        emit SharesUpdate(stakeId, msg.sender, listing.sharesAvailable);

        uint72 newSharesOwned =
            listing.shareOwners[shareReceiver] + sharesPurchased;
        listing.shareOwners[shareReceiver] = newSharesOwned;
        listing.supplierHeartsOwed += heartsOwed;
        emit BuyShares(stakeId, shareReceiver, sharesPurchased, newSharesOwned);

        return heartsOwed;
    }

    function multiBuyShares(ShareOrder[] memory orders) external lock {
        uint256 orderCount = orders.length;
        require(orderCount <= 30, "EXCEEDED_ORDER_LIMIT");

        uint256 totalHeartsOwed;
        for (uint256 i = 0; i < orderCount; i++) {
            ShareOrder memory order = orders[i];
            totalHeartsOwed += _buyShares(
                order.stakeId,
                order.shareReceiver,
                order.sharesPurchased
            );
        }

        hexContract.transferFrom(msg.sender, address(this), totalHeartsOwed);
    }

    function buyShares(
        uint40 stakeId,
        address shareReceiver,
        uint72 sharesPurchased
    ) external lock {
        uint72 heartsOwed = _buyShares(stakeId, shareReceiver, sharesPurchased);
        hexContract.transferFrom(msg.sender, address(this), heartsOwed);
    }

    function claimEarnings(uint40 stakeId) external lock {
        ShareListing storage listing = shareListings[stakeId];
        require(listing.heartsEarned != 0, "SHARES_NOT_MATURE");

        uint72 ownedShares = listing.shareOwners[msg.sender];

        if (msg.sender == listing.supplier) {
            ownedShares += listing.sharesAvailable;
            listing.sharesAvailable = 0;
            emit SharesUpdate(stakeId, msg.sender, 0);
        }

        uint256 heartsOwed =
            FullMath.mulDiv(
                listing.heartsEarned,
                ownedShares,
                listing.sharesTotal
            );
        require(heartsOwed != 0, "NO_HEARTS_CLAIMABLE");

        listing.shareOwners[msg.sender] = 0;
        hexContract.transfer(msg.sender, heartsOwed);

        emit ClaimEarnings(stakeId, msg.sender, heartsOwed);
    }

    function supplierWithdraw(uint40 stakeId) external lock {
        ShareListing storage listing = shareListings[stakeId];
        require(msg.sender == listing.supplier, "SENDER_NOT_SUPPLIER");

        uint72 heartsOwed = listing.supplierHeartsOwed;
        require(heartsOwed != 0, "NO_HEARTS_OWED");

        listing.supplierHeartsOwed = 0;
        hexContract.transfer(msg.sender, heartsOwed);

        emit SupplierWithdraw(stakeId, msg.sender, heartsOwed);
    }
}
