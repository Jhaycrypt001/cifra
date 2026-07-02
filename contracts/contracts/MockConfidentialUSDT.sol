// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {ERC7984} from "@openzeppelin/confidential-contracts/token/ERC7984/ERC7984.sol";

/// @title MockConfidentialUSDT
/// @notice ERC-7984 confidential stablecoin used for local tests and the Sepolia demo, standing in
///         for the official cUSDT from the Confidential Token Registry. Ships with a permissionless
///         faucet so demo participants can obtain a balance. Do NOT use in production.
contract MockConfidentialUSDT is ERC7984, ZamaEthereumConfig {
    constructor() ERC7984("Confidential USD (Cifra Demo)", "cUSDT", "") {}

    /// @notice Faucet mint. The clear `amount` becomes a trivially-encrypted euint64 balance.
    /// @dev Testnet convenience only. Anyone may mint to themselves for the demo.
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
