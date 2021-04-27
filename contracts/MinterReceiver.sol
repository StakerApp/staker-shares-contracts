// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import "@openzeppelin/contracts/utils/introspection/ERC165.sol";

abstract contract MinterReceiver is ERC165 {
    function onSharesMinted(
        uint40 stakeId,
        address supplier,
        uint72 stakedHearts,
        uint72 stakeShares
    ) external virtual;

    function onEarningsMinted(uint40 stakeId, uint72 heartsEarned)
        external
        virtual;

    function supportsInterface(bytes4 interfaceId)
        public
        view
        virtual
        override
        returns (bool)
    {
        return
            interfaceId == type(MinterReceiver).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
