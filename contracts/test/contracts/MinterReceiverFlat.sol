// Sources flattened with hardhat v2.2.1 https://hardhat.org

// File @openzeppelin/contracts/utils/introspection/IERC165.sol@v4.1.0

// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

/**
 * @dev Interface of the ERC165 standard, as defined in the
 * https://eips.ethereum.org/EIPS/eip-165[EIP].
 *
 * Implementers can declare support of contract interfaces, which can then be
 * queried by others ({ERC165Checker}).
 *
 * For an implementation, see {ERC165}.
 */
interface IERC165 {
    /**
     * @dev Returns true if this contract implements the interface defined by
     * `interfaceId`. See the corresponding
     * https://eips.ethereum.org/EIPS/eip-165#how-interfaces-are-identified[EIP section]
     * to learn more about how these ids are created.
     *
     * This function call must use less than 30 000 gas.
     */
    function supportsInterface(bytes4 interfaceId) external view returns (bool);
}


// File @openzeppelin/contracts/utils/introspection/ERC165.sol@v4.1.0



pragma solidity ^0.8.0;

/**
 * @dev Implementation of the {IERC165} interface.
 *
 * Contracts that want to implement ERC165 should inherit from this contract and override {supportsInterface} to check
 * for the additional interface id that will be supported. For example:
 *
 * ```solidity
 * function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
 *     return interfaceId == type(MyInterface).interfaceId || super.supportsInterface(interfaceId);
 * }
 * ```
 *
 * Alternatively, {ERC165Storage} provides an easier to use but more expensive implementation.
 */
abstract contract ERC165 is IERC165 {
    /**
     * @dev See {IERC165-supportsInterface}.
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(IERC165).interfaceId;
    }
}


// File contracts/MinterReceiver.sol


pragma solidity 0.8.4;

/// @title HEX Minter Receiver
/// @author Sam Presnal - Staker
/// @dev Receives shares and hearts earned from the ShareMinter
abstract contract MinterReceiver is ERC165 {
    /// @notice ERC165 ensures the minter receiver supports the interface
    /// @param interfaceId The MinterReceiver interface id
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return interfaceId == type(MinterReceiver).interfaceId || super.supportsInterface(interfaceId);
    }

    /// @notice Receives newly started stake properties
    /// @param stakeId The HEX stakeId
    /// @param supplier The reimbursement address for the supplier
    /// @param stakedHearts Hearts staked
    /// @param stakeShares Shares available
    function onSharesMinted(
        uint40 stakeId,
        address supplier,
        uint72 stakedHearts,
        uint72 stakeShares
    ) external virtual;

    /// @notice Receives newly ended stake properties
    /// @param stakeId The HEX stakeId
    /// @param heartsEarned Hearts earned from the stake
    function onEarningsMinted(uint40 stakeId, uint72 heartsEarned) external virtual;
}
