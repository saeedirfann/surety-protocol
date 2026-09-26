// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice A single agent's collateral. Pending claims reserve funds and freeze withdrawals.
contract BondVault is AccessControl, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;
    bytes32 public constant CLAIMS_ROLE = keccak256("CLAIMS_ROLE");
    bytes32 public constant OPERATOR_ROLE = keccak256("OPERATOR_ROLE");
    IERC20 public immutable token;
    uint256 public reserved;
    uint256 public openClaims;
    event BondUpdated(uint256 balance, uint256 reserved);

    /// @param currency Exact-transfer collateral token. @param operator Vault owner. @param manager Claims controller.
    constructor(IERC20 currency, address operator, address manager) {
        require(address(currency) != address(0) && operator != address(0) && manager != address(0), "Invalid config");
        token = currency;
        _grantRole(DEFAULT_ADMIN_ROLE, manager);
        _grantRole(OPERATOR_ROLE, operator);
        _grantRole(CLAIMS_ROLE, manager);
    }
    /// @notice Add collateral. @param amount Amount in token base units.
    function deposit(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "Zero deposit");
        uint256 beforeBalance = token.balanceOf(address(this));
        token.safeTransferFrom(msg.sender, address(this), amount);
        require(token.balanceOf(address(this)) == beforeBalance + amount, "Unsupported token");
        emit BondUpdated(beforeBalance + amount, reserved);
    }
    /// @notice Withdraw only when all claims are closed. @param amount Amount in token base units.
    function withdraw(uint256 amount) external onlyRole(OPERATOR_ROLE) nonReentrant whenNotPaused {
        require(openClaims == 0 && amount > 0 && amount <= token.balanceOf(address(this)), "Withdrawal locked");
        token.safeTransfer(msg.sender, amount);
        emit BondUpdated(token.balanceOf(address(this)), reserved);
    }
    /// @notice Reserve damages for one claim. @param amount Reserved amount.
    function lock(uint256 amount) external onlyRole(CLAIMS_ROLE) {
        require(amount > 0 && amount <= token.balanceOf(address(this)) - reserved, "Insufficient coverage");
        reserved += amount; openClaims++;
        emit BondUpdated(token.balanceOf(address(this)), reserved);
    }
    /// @notice Close one claim and optionally pay damages. @param recipient Claimant. @param amount Reserved amount. @param pay Oracle outcome.
    function resolve(address recipient, uint256 amount, bool pay) external onlyRole(CLAIMS_ROLE) nonReentrant {
        require(openClaims > 0 && amount <= reserved && recipient != address(0), "Invalid claim");
        reserved -= amount; openClaims--;
        if (pay) token.safeTransfer(recipient, amount);
        emit BondUpdated(token.balanceOf(address(this)), reserved);
    }
    /// @notice Pause or resume deposits and withdrawals; resolution always remains available. @param enabled Pause flag.
    function setPaused(bool enabled) external onlyRole(OPERATOR_ROLE) { if (enabled) _pause(); else _unpause(); }
}
