// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/introspection/ERC165Checker.sol";
import "./interfaces/IHEX.sol";
import "./MinterReceiver.sol";

contract ShareMinter {
    IHEX public hexContract;

    struct Stake {
        uint24 unlockDay;
        MinterReceiver receiver;
    }
    mapping(uint40 => Stake) public stakes;

    event MintShares(uint40 stakeId, MinterReceiver receiver, uint72 shares);
    event MintEarnings(uint40 stakeId, MinterReceiver receiver, uint72 hearts);

    uint256 private unlocked = 1;
    modifier lock() {
        require(unlocked == 1, "LOCKED");
        unlocked = 0;
        _;
        unlocked = 1;
    }

    constructor(IHEX _hex) {
        hexContract = _hex;
    }

    function mintShares(
        MinterReceiver receiver,
        address supplier,
        uint256 newStakedHearts,
        uint256 newStakedDays
    ) external lock {
        require(
            ERC165Checker.supportsInterface(
                address(receiver),
                type(MinterReceiver).interfaceId
            ),
            "UNSUPPORTED_RECEIVER"
        );

        hexContract.transferFrom(msg.sender, address(this), newStakedHearts);
        hexContract.stakeStart(newStakedHearts, newStakedDays);

        uint256 stakeCount = hexContract.stakeCount(address(this));
        (
            uint40 stakeId,
            uint72 stakedHearts,
            uint72 stakeShares,
            uint16 lockedDay,
            uint16 stakedDays,
            ,

        ) = hexContract.stakeLists(address(this), stakeCount - 1);
        uint24 unlockDay = lockedDay + stakedDays;

        Stake storage stake = stakes[stakeId];
        stake.receiver = receiver;
        stake.unlockDay = unlockDay;

        receiver.onSharesMinted(stakeId, supplier, stakedHearts, stakeShares);

        emit MintShares(stakeId, receiver, stakeShares);
    }

    function mintEarnings(uint256 stakeIndex, uint40 stakeId) external lock {
        Stake memory stake = stakes[stakeId];
        uint256 currentDay = hexContract.currentDay();
        require(currentDay >= stake.unlockDay, "STAKE_NOT_MATURE");

        uint256 prevHearts = hexContract.balanceOf(address(this));
        hexContract.stakeEnd(stakeIndex, stakeId);
        uint256 newHearts = hexContract.balanceOf(address(this));
        uint72 heartsEarned = uint72(newHearts - prevHearts);

        hexContract.transfer(address(stake.receiver), heartsEarned);
        stake.receiver.onEarningsMinted(stakeId, heartsEarned);

        emit MintEarnings(stakeId, stake.receiver, heartsEarned);
    }
}
