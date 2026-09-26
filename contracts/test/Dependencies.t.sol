// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import {Test} from "forge-std/Test.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {OptimisticOracleV3Interface} from "@uma/core/contracts/optimistic-oracle-v3/interfaces/OptimisticOracleV3Interface.sol";
import {IEAS} from "@ethereum-attestation-service/eas-contracts/contracts/IEAS.sol";

/// @notice Verifies the scaffold can compile its real upstream contract dependencies.
contract DependenciesTest is Test {
    /// @notice The oracle assertion entry point is available from UMA's package.
    function test_OracleInterfaceAvailable() public pure {
        assertTrue(OptimisticOracleV3Interface.assertTruth.selector != bytes4(0));
    }

    /// @notice EAS's attestation entry point is available from its package.
    function test_AttestationInterfaceAvailable() public pure {
        assertTrue(IEAS.attest.selector != bytes4(0));
    }
}
