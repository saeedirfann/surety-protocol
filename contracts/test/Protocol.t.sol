// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {Test} from "forge-std/Test.sol";
import {DemoEnvironment} from "./fixtures/DemoEnvironment.sol";
import {AgentRegistry, BondVault, IERC20, IIdentityVerifier} from "../src/AgentRegistry.sol";
import {WorldIDGate, IWorldID} from "../src/WorldIDGate.sol";
import {ClaimsManager, OptimisticOracleV3Interface} from "../src/ClaimsManager.sol";

/// @notice Deterministic World verifier fixture; never shipped as a real verification service.
contract ProofFixture is IWorldID {
    function verifyProof(uint256 root,uint256,uint256,uint256,uint256,uint256[8] calldata) external pure { require(root == 1, "Bad proof"); }
}
/// @notice Integration tests exercise genuine UMA contracts, token movements and security boundaries.
contract ProtocolTest is Test {
    DemoEnvironment env;
    AgentRegistry registry;
    ClaimsManager manager;
    IERC20 token;
    BondVault vault;
    address operator = address(0xA11CE);
    address claimant = address(0xB0B);
    address outsider = address(0xBAD);
    function setUp() public {
        vm.chainId(31337);
        address[] memory users = new address[](3); users[0] = operator; users[1] = claimant; users[2] = outsider;
        env = new DemoEnvironment(users); registry = env.registry(); manager = env.manager(); token = IERC20(address(env.token()));
        vm.startPrank(operator); env.identity().verifyMock(); token.approve(address(registry), type(uint256).max);
        uint256 id = registry.registerAgent("Atlas", policy(), 1000e6); vm.stopPrank();
        (, address v,,,) = registry.agents(id); vault = BondVault(v);
        vm.startPrank(claimant); env.identity().verifyMock(); token.approve(address(manager), type(uint256).max); vm.stopPrank();
        vm.startPrank(operator); token.approve(address(env.oracle()), type(uint256).max); vm.stopPrank();
    }
    function policy() internal view returns (AgentRegistry.Policy memory p) {
        address[] memory targets = new address[](1); targets[0] = address(token);
        bytes4[] memory selectors = new bytes4[](1); selectors[0] = IERC20.transfer.selector;
        p = AgentRegistry.Policy(50e6, targets, selectors, 25e6);
    }
    function file(uint256 amount) internal returns (bytes32 id) { vm.prank(claimant); id = manager.fileClaim(1, "ipfs://evidence", amount); }
    function adjudicate(bytes32 id, bool uphold) internal {
        vm.startPrank(operator); env.oracle().disputeAssertion(id, operator); vm.stopPrank();
        OptimisticOracleV3Interface.Assertion memory a = env.oracle().getAssertion(id);
        env.dvm().pushPrice(a.identifier, a.assertionTime, env.oracle().stampAssertion(id), uphold ? int256(1e18) : int256(0));
        manager.settle(id);
    }
    function test_Register() public { assertEq(registry.agentCount(), 1); assertEq(token.balanceOf(address(vault)), 1000e6); }
    function test_RegisterInsufficientBond() public { vm.prank(operator); vm.expectRevert(); registry.registerAgent("small", policy(), 1); }
    function test_RegisterIdentityRequired() public { vm.prank(outsider); vm.expectRevert("Identity required"); registry.registerAgent("anon", policy(), 100e6); }
    function test_InvalidPolicy() public { AgentRegistry.Policy memory p = policy(); p.maxTxValue = 0; vm.prank(operator); vm.expectRevert("Invalid policy"); registry.registerAgent("bad", p, 100e6); }
    function test_ManagerBindingFails() public { vm.prank(address(env)); vm.expectRevert("Invalid manager"); registry.setClaimsManager(address(manager)); }
    function test_ManagerBindingUnauthorized() public { vm.expectRevert(); registry.setClaimsManager(address(manager)); }
    function testFuzz_DepositWithdraw(uint96 raw) public {
        uint256 amount = bound(uint256(raw), 1, 10000e6);
        vm.startPrank(operator); token.approve(address(vault), amount); vault.deposit(amount); vault.withdraw(amount); vm.stopPrank();
        assertEq(token.balanceOf(address(vault)), 1000e6);
    }
    function test_ZeroDepositFails() public { vm.expectRevert("Zero deposit"); vault.deposit(0); }
    function test_DepositWithoutApprovalFails() public { vm.prank(outsider); vm.expectRevert(); vault.deposit(1e6); }
    function test_WithdrawUnauthorized() public { vm.expectRevert(); vault.withdraw(1); }
    function test_WithdrawOverBalance() public { vm.prank(operator); vm.expectRevert("Withdrawal locked"); vault.withdraw(1001e6); }
    function test_WithdrawLocked() public { file(100e6); vm.prank(operator); vm.expectRevert("Withdrawal locked"); vault.withdraw(1); }
    function test_PauseResume() public {
        vm.startPrank(operator); vault.setPaused(true); vm.expectRevert("Pausable: paused"); vault.withdraw(1); vault.setPaused(false); vault.withdraw(1); vm.stopPrank();
    }
    function test_PauseUnauthorized() public { vm.expectRevert(); vault.setPaused(true); }
    function test_LockUnauthorized() public { vm.expectRevert(); vault.lock(1); }
    function test_OperatorCannotGrantClaimsRole() public { bytes32 role = vault.CLAIMS_ROLE(); vm.prank(operator); vm.expectRevert(); vault.grantRole(role, operator); }
    function test_ResolveUnauthorized() public { vm.expectRevert(); vault.resolve(claimant, 1, true); }
    function test_PolicyTimelock() public {
        vm.startPrank(operator); registry.schedulePolicy(1, policy()); vm.expectRevert("Timelock active"); registry.applyPolicy(1);
        vm.warp(block.timestamp + 1 hours); registry.applyPolicy(1); vm.stopPrank(); assertEq(registry.policyReadyAt(1), 0);
    }
    function test_PolicyUnauthorized() public { vm.expectRevert("Not operator"); registry.schedulePolicy(1, policy()); vm.expectRevert("Not operator"); registry.applyPolicy(1); }
    function test_RecordLossUnauthorized() public { vm.expectRevert("Unauthorized loss"); registry.recordLoss(1, 1); }
    function testFuzz_Payout(uint96 raw) public {
        uint256 amount = bound(uint256(raw), 1e6, 1000e6); uint256 beforeBalance = token.balanceOf(claimant);
        bytes32 id = file(amount); vm.warp(block.timestamp + 46); manager.settle(id);
        assertEq(token.balanceOf(claimant), beforeBalance + amount); assertEq(token.balanceOf(address(vault)), 1000e6 - amount);
        assertEq(vault.openClaims(), 0); assertEq(vault.reserved(), 0); assertEq(registry.lossRatio(1), amount * 10000 / 1000e6);
        vm.expectRevert("Claim closed"); manager.settle(id);
    }
    function test_UpheldDispute() public { bytes32 id = file(100e6); adjudicate(id, true); assertEq(token.balanceOf(address(vault)), 900e6); assertEq(registry.lossRatio(1), 1000); }
    function testFuzz_RejectedDispute(uint96 raw) public {
        uint256 amount = bound(uint256(raw), 1e6, 1000e6); uint256 beforeBalance = token.balanceOf(claimant);
        bytes32 id = file(amount); uint256 bond = manager.claimBond(amount); adjudicate(id, false);
        assertEq(token.balanceOf(address(vault)), 1000e6); assertEq(token.balanceOf(claimant), beforeBalance - bond); assertEq(registry.lossRatio(1), 0); assertEq(vault.openClaims(), 0);
    }
    function test_SettleEarlyFails() public { bytes32 id = file(100e6); vm.expectRevert("Assertion not expired"); manager.settle(id); }
    function test_OverCoverageFails() public { vm.prank(claimant); vm.expectRevert("Insufficient coverage"); manager.fileClaim(1, "evidence", 1001e6); }
    function test_ConcurrentClaimsReserveCoverage() public { file(600e6); vm.prank(claimant); vm.expectRevert("Insufficient coverage"); manager.fileClaim(1, "second", 500e6); }
    function test_ClaimIdentityRequired() public { vm.prank(outsider); vm.expectRevert("Identity required"); manager.fileClaim(1, "e", 1); }
    function test_EmptyEvidenceFails() public { vm.prank(claimant); vm.expectRevert("Invalid evidence"); manager.fileClaim(1, "", 1); }
    function test_UnknownAgentFails() public { vm.prank(claimant); vm.expectRevert("Unknown agent"); manager.fileClaim(999, "e", 1); }
    function test_CallbackSpoofingFails() public { bytes32 id = file(1e6); vm.expectRevert("Invalid callback"); manager.assertionResolvedCallback(id, true); vm.expectRevert("Invalid callback"); manager.assertionDisputedCallback(id); }
    function test_Upkeep() public {
        (bool needed,) = manager.checkUpkeep(""); assertFalse(needed); bytes32 id = file(1e6);
        vm.expectRevert(); manager.performUpkeep(abi.encode(id)); vm.warp(block.timestamp + 46);
        bytes memory data; (needed, data) = manager.checkUpkeep(""); assertTrue(needed); manager.performUpkeep(data); assertEq(vault.openClaims(), 0);
    }
    function test_MockIdentityCannotRepeatOrRunOnPublicChain() public {
        WorldIDGate gate = env.identity();
        vm.prank(operator); vm.expectRevert("Mock identity unavailable"); gate.verifyMock();
        vm.chainId(1); vm.expectRevert("Mock identity unavailable"); gate.verifyMock();
    }
    function test_RealProofGate() public {
        ProofFixture router = new ProofFixture(); WorldIDGate gate = new WorldIDGate(router, 1, false); uint256[8] memory proof;
        vm.expectRevert("Bad proof"); gate.verify(0, 7, proof); gate.verify(1, 7, proof); assertTrue(gate.isVerified(address(this)));
        vm.expectRevert("Proof unavailable or reused"); gate.verify(1, 7, proof);
        vm.expectRevert("Mock identity unavailable"); gate.verifyMock();
    }
}
