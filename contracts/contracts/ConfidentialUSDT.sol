// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title ConfidentialUSDT
/// @notice A confidential USD stablecoin (ERC-7984) used by Cifra for settlement. Balances and
///         transfer amounts are encrypted end-to-end. Ships with a permissionless testnet faucet
///         so anyone can obtain a balance to try the app.
contract ConfidentialUSDT is ERC7984, ZamaEthereumConfig {
    constructor() ERC7984("Confidential USD", "cUSDT", "") {}

    /// @notice Faucet mint. The clear `amount` becomes an encrypted balance. Testnet convenience.
    function faucet(uint64 amount) external {
        _faucetTo(msg.sender, amount);
    }

    /// @notice Mint a clear amount to an arbitrary address (used when seeding demo accounts).
    function faucetTo(address to, uint64 amount) external {
        _faucetTo(to, amount);
    }

    function _faucetTo(address to, uint64 amount) internal {
        euint64 encAmount = FHE.asEuint64(amount);
        FHE.allowThis(encAmount);
        _mint(to, encAmount);
    }
}
