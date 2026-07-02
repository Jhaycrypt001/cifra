// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {euint64} from "@fhevm/solidity/lib/FHE.sol";

/// @title IFinancingPool
/// @notice Minimal interface the InvoiceRegistry uses to request an advance from the pool.
interface IFinancingPool {
    /// @notice Advance encrypted funds to `issuer` against an invoice of encrypted `amount`.
    /// @dev Caller must be the registry. The registry must grant the pool transient ACL on `amount`.
    function advance(
        uint256 invoiceId,
        address issuer,
        address payer,
        euint64 amount
    ) external returns (euint64 advanced);
}
