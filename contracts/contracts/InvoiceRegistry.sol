// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

import {FHE, euint64, externalEuint64} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "@openzeppelin/confidential-contracts/interfaces/IERC7984.sol";
import {IFinancingPool} from "./interfaces/IFinancingPool.sol";

/// @title InvoiceRegistry
/// @notice Confidential invoicing on the Zama Protocol. Invoice amounts are stored as encrypted
///         euint64 handles and are never revealed on-chain. Invoices settle in cUSDT (ERC-7984).
///         An open invoice can be sold to a FinancingPool for an instant, private advance.
contract InvoiceRegistry is ZamaEthereumConfig {
    enum Status {
        Open,
        Financed,
        Paid,
        Cancelled
    }

    struct Invoice {
        address issuer;
        address payer;
        euint64 amount; // encrypted; ACL: registry + issuer + payer
        uint64 dueDate; // public
        Status status;
        address recipient; // who receives settlement (issuer, or the pool once financed)
        string memo; // public, non-sensitive label (e.g. "Design work — June")
    }

    IERC7984 public immutable cusdt;
    IFinancingPool public pool;
    address public owner;

    uint256 public nextId;
    mapping(uint256 => Invoice) private _invoices;
    mapping(address => uint256[]) private _issuedBy;
    mapping(address => uint256[]) private _billedTo;

    event InvoiceCreated(
        uint256 indexed id, address indexed issuer, address indexed payer, uint64 dueDate, string memo
    );
    event InvoicePaid(uint256 indexed id, address recipient);
    event InvoiceFinanced(uint256 indexed id, address indexed pool);
    event InvoiceCancelled(uint256 indexed id);

    error NotOwner();
    error NotIssuer();
    error NotPayer();
    error BadStatus();
    error PoolNotSet();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    constructor(IERC7984 _cusdt) {
        cusdt = _cusdt;
        owner = msg.sender;
    }

    function setPool(IFinancingPool _pool) external onlyOwner {
        pool = _pool;
    }

    /// @notice Issue a confidential invoice. `encAmount`/`inputProof` come from the Relayer SDK.
    function createInvoice(
        address payer,
        externalEuint64 encAmount,
        bytes calldata inputProof,
        uint64 dueDate,
        string calldata memo
    ) external returns (uint256 id) {
        euint64 amount = FHE.fromExternal(encAmount, inputProof);
        // Persistent ACL so the registry can reuse the handle in later txs (pay / finance),
        // and both parties can decrypt their own view client-side.
        FHE.allowThis(amount);
        FHE.allow(amount, msg.sender);
        FHE.allow(amount, payer);

        id = nextId++;
        _invoices[id] = Invoice({
            issuer: msg.sender,
            payer: payer,
            amount: amount,
            dueDate: dueDate,
            status: Status.Open,
            recipient: msg.sender,
            memo: memo
        });
        _issuedBy[msg.sender].push(id);
        _billedTo[payer].push(id);

        emit InvoiceCreated(id, msg.sender, payer, dueDate, memo);
    }

    /// @notice Payer settles the invoice in cUSDT. The payer must first authorize this registry as
    ///         an operator on the cUSDT token: `cusdt.setOperator(registry, until)`.
    ///         If the invoice was financed, settlement routes to the pool instead of the issuer.
    function payInvoice(uint256 id) external {
        Invoice storage inv = _invoices[id];
        if (msg.sender != inv.payer) revert NotPayer();
        if (inv.status != Status.Open && inv.status != Status.Financed) revert BadStatus();

        bool financed = inv.status == Status.Financed;

        // Grant the token transient access to the encrypted amount for this transaction.
        FHE.allowTransient(inv.amount, address(cusdt));
        // Registry moves funds as an operator of the payer. Transfers "up to" the payer's balance.
        cusdt.confidentialTransferFrom(inv.payer, inv.recipient, inv.amount);

        // If financed, the pool just received the full face value; release the reserve
        // (invoice minus advance, minus fee) back to the issuer.
        if (financed) {
            FHE.allowTransient(inv.amount, address(pool));
            pool.releaseReserve(id, inv.issuer, inv.amount);
        }

        inv.status = Status.Paid;
        emit InvoicePaid(id, inv.recipient);
    }

    /// @notice Issuer sells an open invoice to the financing pool for an instant advance.
    function financeInvoice(uint256 id) external {
        Invoice storage inv = _invoices[id];
        if (msg.sender != inv.issuer) revert NotIssuer();
        if (inv.status != Status.Open) revert BadStatus();
        if (address(pool) == address(0)) revert PoolNotSet();

        // Let the pool compute on the encrypted amount for this transaction.
        FHE.allowTransient(inv.amount, address(pool));
        pool.advance(id, inv.issuer, inv.payer, inv.amount);

        inv.status = Status.Financed;
        inv.recipient = address(pool); // future settlement routes to the pool
        emit InvoiceFinanced(id, address(pool));
    }

    /// @notice Issuer cancels an unpaid, unfinanced invoice.
    function cancelInvoice(uint256 id) external {
        Invoice storage inv = _invoices[id];
        if (msg.sender != inv.issuer) revert NotIssuer();
        if (inv.status != Status.Open) revert BadStatus();
        inv.status = Status.Cancelled;
        emit InvoiceCancelled(id);
    }

    // ------------------------------------------------------------------ views

    function getInvoice(uint256 id)
        external
        view
        returns (
            address issuer,
            address payer,
            euint64 amount,
            uint64 dueDate,
            Status status,
            address recipient,
            string memory memo
        )
    {
        Invoice storage inv = _invoices[id];
        return (inv.issuer, inv.payer, inv.amount, inv.dueDate, inv.status, inv.recipient, inv.memo);
    }

    /// @notice Encrypted amount handle for an invoice (for client-side user-decryption).
    function amountHandle(uint256 id) external view returns (euint64) {
        return _invoices[id].amount;
    }

    function invoicesIssuedBy(address account) external view returns (uint256[] memory) {
        return _issuedBy[account];
    }

    function invoicesBilledTo(address account) external view returns (uint256[] memory) {
        return _billedTo[account];
    }
}
