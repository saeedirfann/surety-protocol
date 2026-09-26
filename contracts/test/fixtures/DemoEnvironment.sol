// SPDX-License-Identifier: MIT
pragma solidity 0.8.16;
import {Finder} from "@uma/core/contracts/data-verification-mechanism/implementation/Finder.sol";
import {IdentifierWhitelist} from "@uma/core/contracts/data-verification-mechanism/implementation/IdentifierWhitelist.sol";
import {AddressWhitelist} from "@uma/core/contracts/common/implementation/AddressWhitelist.sol";
import {ExpandedERC20} from "@uma/core/contracts/common/implementation/ExpandedERC20.sol";
import {Store, FixedPoint} from "@uma/core/contracts/data-verification-mechanism/implementation/Store.sol";
import {MockOracleAncillary} from "@uma/core/contracts/data-verification-mechanism/test/MockOracleAncillary.sol";
import {OptimisticOracleV3Test} from "@uma/core/contracts/optimistic-oracle-v3/implementation/test/OptimisticOracleV3Test.sol";
import {WorldIDGate, IWorldID} from "../../src/WorldIDGate.sol";
import {AgentRegistry, IIdentityVerifier, IERC20} from "../../src/AgentRegistry.sol";
import {ClaimsManager, OptimisticOracleV3Interface} from "../../src/ClaimsManager.sol";

/// @notice Local-only fixture composing UMA's actual contracts and upstream DVM mock, never a production deployment.
contract DemoEnvironment {
    ExpandedERC20 public token;
    MockOracleAncillary public dvm;
    OptimisticOracleV3Test public oracle;
    WorldIDGate public identity;
    AgentRegistry public registry;
    ClaimsManager public manager;
    /// @notice Build isolated infrastructure; demo addresses receive test collateral. @param users Seed accounts.
    constructor(address[] memory users) {
        require(block.chainid == 31337, "Local only");
        token = new ExpandedERC20("Demo USD", "dUSD", 6);
        token.addMember(1, address(this));
        for (uint256 i; i < users.length; ++i) token.mint(users[i], 100000e6);
        Finder finder = new Finder();
        AddressWhitelist whitelist = new AddressWhitelist(); whitelist.addToWhitelist(address(token));
        IdentifierWhitelist identifiers = new IdentifierWhitelist(); identifiers.addSupportedIdentifier(bytes32("ASSERT_TRUTH"));
        Store store = new Store(FixedPoint.Unsigned(0), FixedPoint.Unsigned(0), address(0));
        store.setFinalFee(address(token), FixedPoint.Unsigned(1e6));
        dvm = new MockOracleAncillary(address(finder), address(0));
        finder.changeImplementationAddress(bytes32("Oracle"), address(dvm));
        finder.changeImplementationAddress(bytes32("CollateralWhitelist"), address(whitelist));
        finder.changeImplementationAddress(bytes32("IdentifierWhitelist"), address(identifiers));
        finder.changeImplementationAddress(bytes32("Store"), address(store));
        oracle = new OptimisticOracleV3Test(finder, IERC20(address(token)), 45, address(0));
        identity = new WorldIDGate(IWorldID(address(0)), 0, true);
        registry = new AgentRegistry(IERC20(address(token)), IIdentityVerifier(address(identity)), 100e6);
        manager = new ClaimsManager(registry, OptimisticOracleV3Interface(address(oracle)), 45);
        registry.setClaimsManager(address(manager));
    }
}
