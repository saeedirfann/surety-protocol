// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
/// @notice World ID verifier contract ABI.
interface IWorldID {
    function verifyProof(uint256 root, uint256 groupId, uint256 signalHash, uint256 nullifierHash, uint256 externalNullifierHash, uint256[8] calldata proof) external view;
}
/// @notice Proof gate with explicit, local-chain-only mock mode.
contract WorldIDGate {
    IWorldID public immutable router;
    uint256 public immutable externalNullifier;
    bool public immutable mockMode;
    mapping(address => bool) public isVerified;
    mapping(uint256 => bool) public usedNullifiers;
    event IdentityVerified(address indexed user, bool mocked);
    /// @param verifier World ID router. @param actionNullifier App/action field value. @param mock Enable Anvil-only test identity.
    constructor(IWorldID verifier, uint256 actionNullifier, bool mock) {
        require(mock ? block.chainid == 31337 : address(verifier).code.length > 0, "Invalid identity config");
        router = verifier; externalNullifier = actionNullifier; mockMode = mock;
    }
    /// @notice Validate a World proof bound to the caller; rejects reused nullifiers. @param root Merkle root. @param nullifier World nullifier. @param proof Groth16 proof.
    function verify(uint256 root, uint256 nullifier, uint256[8] calldata proof) external {
        require(!mockMode && !usedNullifiers[nullifier], "Proof unavailable or reused");
        router.verifyProof(root, 1, uint256(keccak256(abi.encodePacked(msg.sender))) >> 8, nullifier, externalNullifier, proof);
        usedNullifiers[nullifier] = true; isVerified[msg.sender] = true; emit IdentityVerified(msg.sender, false);
    }
    /// @notice Simulate identity only on local Anvil; never permitted on public networks.
    function verifyMock() external {
        require(mockMode && block.chainid == 31337 && !isVerified[msg.sender], "Mock identity unavailable");
        isVerified[msg.sender] = true; emit IdentityVerified(msg.sender, true);
    }
}
