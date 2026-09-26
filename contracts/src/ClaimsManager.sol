// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";
import {OptimisticOracleV3Interface} from "@uma/core/contracts/optimistic-oracle-v3/interfaces/OptimisticOracleV3Interface.sol";
import {AgentRegistry, BondVault, IERC20, SafeERC20, ReentrancyGuard} from "./AgentRegistry.sol";

/// @notice Claims use UMA's real assertion, challenge, DVM arbitration and bond accounting.
contract ClaimsManager is ReentrancyGuard {
    using SafeERC20 for IERC20;
    enum Status { Missing, Pending, Disputed, Paid, Rejected }
    struct Claim { uint256 agentId; address claimant; uint256 damages; uint256 bond; uint64 deadline; Status status; string evidenceURI; }
    AgentRegistry public immutable registry;
    OptimisticOracleV3Interface public immutable oracle;
    IERC20 public immutable token;
    uint64 public immutable liveness;
    bytes32[] public claimIds;
    mapping(bytes32 => Claim) public claims;
    event ClaimFiled(bytes32 indexed assertionId, uint256 indexed agentId, address indexed claimant, uint256 damages, uint256 bond, uint64 deadline, string evidenceURI);
    event ClaimDisputed(bytes32 indexed assertionId);
    event ClaimResolved(bytes32 indexed assertionId, uint256 indexed agentId, bool paid, uint256 damages);

    /// @param agents Registry. @param oo UMA OOv3. @param windowSeconds Challenge window, short only on local demo.
    constructor(AgentRegistry agents, OptimisticOracleV3Interface oo, uint64 windowSeconds) {
        require(address(agents) != address(0) && address(oo) != address(0) && windowSeconds > 0, "Invalid config");
        registry = agents; oracle = oo; token = agents.token(); liveness = windowSeconds;
    }
    /// @notice Compute claim bond, subject to UMA's minimum. @param damages Claimed amount. @return Required bond.
    function claimBond(uint256 damages) public view returns (uint256) { return Math.max(Math.max(damages / 10, 1e6), oracle.getMinimumBond(address(token))); }
    /// @notice File a bonded, evidence-backed claim. @param agentId Agent ID. @param evidenceURI Evidence URI. @param damages Claimed loss. @return id UMA assertion ID.
    function fileClaim(uint256 agentId, string calldata evidenceURI, uint256 damages) external nonReentrant returns (bytes32 id) {
        require(registry.identity().isVerified(msg.sender), "Identity required");
        require(damages > 0 && bytes(evidenceURI).length > 0 && bytes(evidenceURI).length <= 2048, "Invalid evidence");
        (, address vault,,,) = registry.agents(agentId); require(vault != address(0), "Unknown agent");
        BondVault(vault).lock(damages);
        uint256 bond = claimBond(damages);
        token.safeTransferFrom(msg.sender, address(this), bond); token.safeApprove(address(oracle), bond);
        id = oracle.assertTruth(abi.encode("Surety damages claim", block.chainid, address(this), agentId, damages, evidenceURI), msg.sender, address(this), address(0), liveness, token, bond, oracle.defaultIdentifier(), bytes32(0));
        uint64 deadline = uint64(block.timestamp) + liveness;
        claims[id] = Claim(agentId, msg.sender, damages, bond, deadline, Status.Pending, evidenceURI); claimIds.push(id);
        emit ClaimFiled(id, agentId, msg.sender, damages, bond, deadline, evidenceURI);
    }
    /// @notice Oracle-only dispute notification; arbitration remains with UMA. @param id Assertion ID.
    function assertionDisputedCallback(bytes32 id) external {
        require(msg.sender == address(oracle) && claims[id].status == Status.Pending, "Invalid callback");
        claims[id].status = Status.Disputed; emit ClaimDisputed(id);
    }
    /// @notice Oracle-only terminal callback. @param id Assertion ID. @param truthful Resolved truth.
    function assertionResolvedCallback(bytes32 id, bool truthful) external nonReentrant {
        Claim storage claim = claims[id];
        require(msg.sender == address(oracle) && (claim.status == Status.Pending || claim.status == Status.Disputed), "Invalid callback");
        claim.status = truthful ? Status.Paid : Status.Rejected;
        (, address vault,,,) = registry.agents(claim.agentId);
        BondVault(vault).resolve(claim.claimant, claim.damages, truthful);
        if (truthful) registry.recordLoss(claim.agentId, claim.damages);
        emit ClaimResolved(id, claim.agentId, truthful, claim.damages);
    }
    /// @notice Permissionless oracle settlement; UMA checks expiration and arbitration. @param id Assertion ID.
    function settle(bytes32 id) public { require(claims[id].status == Status.Pending || claims[id].status == Status.Disputed, "Claim closed"); oracle.settleAssertion(id); }
    /// @notice Chainlink-compatible check for one mature undisputed claim. @return needed Whether work exists. @return data Encoded assertion ID.
    function checkUpkeep(bytes calldata) external view returns (bool needed, bytes memory data) {
        for (uint256 i; i < claimIds.length; ++i) { bytes32 id = claimIds[i]; if (claims[id].status == Status.Pending && block.timestamp >= claims[id].deadline) return (true, abi.encode(id)); }
        return (false, bytes(""));
    }
    /// @notice Permissionless upkeep; validates supplied claim through settlement. @param data Encoded assertion ID.
    function performUpkeep(bytes calldata data) external { settle(abi.decode(data, (bytes32))); }
    /// @notice Number of assertions. @return Count.
    function claimCount() external view returns (uint256) { return claimIds.length; }
}
