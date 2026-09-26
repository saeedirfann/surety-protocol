// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {BondVault, IERC20, SafeERC20} from "./BondVault.sol";

/// @notice Pluggable proof-of-personhood gate.
interface IIdentityVerifier { function isVerified(address user) external view returns (bool); }

/// @notice Agent ownership, delayed policy changes, collateral and public loss history.
contract AgentRegistry is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct Policy { uint256 maxTxValue; address[] allowedContracts; bytes4[] allowedTxSelectors; uint256 requiresApprovalAbove; }
    struct Agent { address operator; address vault; string metadataURI; uint256 paidClaims; uint256 totalPaid; }
    IERC20 public immutable token;
    IIdentityVerifier public immutable identity;
    uint256 public immutable minimumBond;
    address public claimsManager;
    uint256 public agentCount;
    mapping(uint256 => Agent) public agents;
    mapping(uint256 => Policy) private policies;
    mapping(uint256 => Policy) private pending;
    mapping(uint256 => uint256) public policyReadyAt;
    event AgentRegistered(uint256 indexed agentId, address indexed operator, address vault, string metadataURI);
    event PolicyScheduled(uint256 indexed agentId, uint256 readyAt);
    event PolicyUpdated(uint256 indexed agentId);
    event LossUpdated(uint256 indexed agentId, uint256 paidClaims, uint256 totalPaid);

    /// @param currency Bond token. @param verifier Identity gate. @param floor Minimum registration bond.
    constructor(IERC20 currency, IIdentityVerifier verifier, uint256 floor) {
        require(address(currency) != address(0) && address(verifier) != address(0) && floor > 0, "Invalid config");
        token = currency; identity = verifier; minimumBond = floor;
    }
    /// @notice Bind controller once before registering agents. @param manager Claims contract.
    function setClaimsManager(address manager) external onlyOwner {
        require(claimsManager == address(0) && manager.code.length > 0, "Invalid manager"); claimsManager = manager;
    }
    /// @notice Register with a verified operator and funded vault. @param uri Metadata URI. @param policy Initial policy. @param bond Initial collateral. @return id Agent identifier.
    function registerAgent(string calldata uri, Policy calldata policy, uint256 bond) external nonReentrant returns (uint256 id) {
        require(identity.isVerified(msg.sender), "Identity required");
        require(claimsManager != address(0) && bond >= minimumBond && bytes(uri).length > 0, "Invalid registration");
        _validate(policy);
        BondVault vault = new BondVault(token, msg.sender, claimsManager);
        token.safeTransferFrom(msg.sender, address(this), bond);
        token.safeApprove(address(vault), bond); vault.deposit(bond);
        id = ++agentCount; agents[id] = Agent(msg.sender, address(vault), uri, 0, 0); policies[id] = policy;
        emit AgentRegistered(id, msg.sender, address(vault), uri);
    }
    /// @notice Queue a policy change with a one-hour delay. @param id Agent ID. @param policy New policy.
    function schedulePolicy(uint256 id, Policy calldata policy) external {
        require(agents[id].operator == msg.sender, "Not operator"); _validate(policy);
        pending[id] = policy; policyReadyAt[id] = block.timestamp + 1 hours;
        emit PolicyScheduled(id, policyReadyAt[id]);
    }
    /// @notice Apply a matured policy change. @param id Agent ID.
    function applyPolicy(uint256 id) external {
        require(agents[id].operator == msg.sender, "Not operator");
        require(policyReadyAt[id] > 0 && block.timestamp >= policyReadyAt[id], "Timelock active");
        policies[id] = pending[id]; delete pending[id]; delete policyReadyAt[id]; emit PolicyUpdated(id);
    }
    /// @notice Read full operating limits. @param id Agent ID. @return Current policy.
    function getPolicy(uint256 id) external view returns (Policy memory) { require(id > 0 && id <= agentCount, "Unknown agent"); return policies[id]; }
    /// @notice Record oracle-approved paid loss. @param id Agent ID. @param amount Damages.
    function recordLoss(uint256 id, uint256 amount) external {
        require(msg.sender == claimsManager && id > 0 && id <= agentCount && amount > 0, "Unauthorized loss");
        Agent storage agent = agents[id]; agent.paidClaims++; agent.totalPaid += amount;
        emit LossUpdated(id, agent.paidClaims, agent.totalPaid);
    }
    /// @notice Lifetime paid losses as basis points of current collateral plus paid losses. @param id Agent ID. @return Basis points.
    function lossRatio(uint256 id) external view returns (uint256) {
        Agent memory agent = agents[id]; require(agent.operator != address(0), "Unknown agent");
        uint256 exposure = token.balanceOf(agent.vault) + agent.totalPaid;
        return exposure == 0 ? 0 : Math.mulDiv(agent.totalPaid, 10000, exposure);
    }
    function _validate(Policy calldata policy) private pure {
        require(policy.maxTxValue > 0 && policy.requiresApprovalAbove <= policy.maxTxValue && policy.allowedContracts.length <= 32 && policy.allowedTxSelectors.length <= 32, "Invalid policy");
    }
}
