// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, ebool, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IFinancingPool} from "./interfaces/IFinancingPool.sol";

/// @title FinancingPool
/// @notice A liquidity pool that factors open invoices. Like real-world invoice factoring
///         (Bluevine / Fundbox), it advances a percentage of the invoice up front (the advance
///         rate) and holds the rest as a reserve. When the payer settles, the reserve is released
///         to the issuer minus the pool's fee. The pool keeps the fee as LP yield.
///         Everything is computed homomorphically on ciphertext — the pool never reads the amount.
///
///         Lifecycle for a financed invoice of value A:
///           finance:  issuer receives  A * advanceBps/10000            (e.g. 85%)
///           settle:   payer pays A to pool, pool releases the reserve minus fee to issuer:
///                     rebate = A * (10000 - advanceBps - feeBps)/10000 (e.g. 13%)
///           pool net: A - advance - rebate = A * feeBps/10000          (e.g. 2% yield)
contract FinancingPool is IFinancingPool, ZamaEthereumConfig {
    IERC7984 public immutable cusdt;
    address public registry;
    address public owner;

    uint64 public advanceBps = 8500; // 85.00% advanced up front
    uint64 public feeBps = 200; // 2.00% fee kept by the pool (LP yield)
    uint64 public maxAdvance = 1_000_000_000000; // per-invoice cap: 1,000,000 cUSDT (6 decimals)

    mapping(address => euint64) private _deposits; // encrypted LP balances

    event Deposited(address indexed lp);
    event Withdrawn(address indexed lp);
    event Advanced(uint256 indexed invoiceId, address indexed issuer);
    event ReserveReleased(uint256 indexed invoiceId, address indexed issuer);
    event ParamsUpdated(uint64 advanceBps, uint64 feeBps, uint64 maxAdvance);

    error NotOwner();
    error NotRegistry();
    error BadParams();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC7984 _cusdt) {
        cusdt = _cusdt;
        owner = msg.sender;
    }

    function setRegistry(address _registry) external onlyOwner {
        registry = _registry;
    }

    function setParams(uint64 _advanceBps, uint64 _feeBps, uint64 _maxAdvance) external onlyOwner {
        if (_feeBps > 10000 || _advanceBps > 10000 || uint256(_advanceBps) + _feeBps > 10000) revert BadParams();
        advanceBps = _advanceBps;
        feeBps = _feeBps;
        maxAdvance = _maxAdvance;
        emit ParamsUpdated(_advanceBps, _feeBps, _maxAdvance);
    }

    /// @notice LP adds liquidity. Must first call `cusdt.setOperator(pool, until)`.
    function deposit(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        FHE.allowTransient(amount, address(cusdt));
        euint64 moved = cusdt.confidentialTransferFrom(msg.sender, address(this), amount);

        euint64 bal = FHE.add(_deposits[msg.sender], moved);
        FHE.allowThis(bal);
        FHE.allow(bal, msg.sender);
        _deposits[msg.sender] = bal;
        emit Deposited(msg.sender);
    }

    /// @notice LP withdraws up to their tracked deposit (best-effort against live pool balance).
    function withdraw(externalEuint64 encAmount, bytes calldata inputProof) external {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);

        ebool ok = FHE.le(amount, _deposits[msg.sender]);
        euint64 toSend = FHE.select(ok, amount, FHE.asEuint64(0));

        euint64 newBal = FHE.sub(_deposits[msg.sender], toSend);
        FHE.allowThis(newBal);
        FHE.allow(newBal, msg.sender);
        _deposits[msg.sender] = newBal;

        FHE.allowThis(toSend);
        FHE.allowTransient(toSend, address(cusdt));
        cusdt.confidentialTransfer(msg.sender, toSend);
        emit Withdrawn(msg.sender);
    }

    /// @notice LP's own encrypted deposit handle (for client-side user-decryption).
    function depositOf(address lp) external view returns (euint64) {
        return _deposits[lp];
    }

    /// @inheritdoc IFinancingPool
    function advance(
        uint256 invoiceId,
        address issuer,
        address, /* payer */
        euint64 amount
    ) external returns (euint64 advanced) {
        if (msg.sender != registry) revert NotRegistry();

        // Risk gate on ciphertext: fund only if amount <= maxAdvance, otherwise fund 0.
        ebool ok = FHE.le(amount, maxAdvance);
        euint64 gross = FHE.select(ok, amount, FHE.asEuint64(0));

        // advance = gross * advanceBps / 10000 (e.g. 85%). Scalar mul/div on ciphertext.
        advanced = FHE.div(FHE.mul(gross, advanceBps), uint64(10000));

        FHE.allowThis(advanced);
        FHE.allowTransient(advanced, address(cusdt));
        cusdt.confidentialTransfer(issuer, advanced); // pays from the pool's own balance

        emit Advanced(invoiceId, issuer);
    }

    /// @inheritdoc IFinancingPool
    /// @notice Called by the registry when a financed invoice is settled. Releases the reserve
    ///         (invoice minus advance) minus the fee to the issuer. Pool keeps the fee as yield.
    function releaseReserve(uint256 invoiceId, address issuer, euint64 amount) external returns (euint64 rebate) {
        if (msg.sender != registry) revert NotRegistry();

        // Mirror the funding gate so an over-cap (unfunded) invoice releases nothing.
        ebool ok = FHE.le(amount, maxAdvance);
        euint64 gross = FHE.select(ok, amount, FHE.asEuint64(0));

        // rebate = gross * (10000 - advanceBps - feeBps) / 10000 (e.g. 13%).
        rebate = FHE.div(FHE.mul(gross, uint64(10000) - advanceBps - feeBps), uint64(10000));

        FHE.allowThis(rebate);
        FHE.allowTransient(rebate, address(cusdt));
        cusdt.confidentialTransfer(issuer, rebate);

        emit ReserveReleased(invoiceId, issuer);
    }
}
