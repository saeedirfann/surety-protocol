# Partner integration reference

This release is a localhost prototype. Unavailable services are disclosed, not presented as completed integrations.

## UMA OOv3 — actual local contract
ClaimsManager calls assertTruth, implements official assertion callbacks and settles assertions. DemoEnvironment deploys upstream OptimisticOracleV3Test, Finder, Store, identifier/collateral whitelists and MockOracleAncillary from pinned @uma/core 2.62.2.
Verify with pnpm test:contracts, browser claim receipts and deployments/local.json. The oracle/bond mechanics are upstream code; dispute verdicts come from the upstream local DVM mock. No public oracle deployment or custom jury is claimed.

## World ID — router path, local mock
WorldIDGate calls its configured router's verifyProof, binds the caller signal and rejects repeated nullifiers. Registration and filing require a verified address. verifyMock is restricted to mock mode and chain 31337. Tests cover invalid proofs, repeat identity and public-chain mock rejection through a fixture verifier.
A Developer Portal app, IDKit configuration and genuine proof remain necessary. No live World SDK flow is claimed.

## ENS — not connected
No parent namespace, subname minting, resolution or ENSv2 role configuration is available. Agent names are metadata.

## Curvegrid MultiBaas — local preview only
web/src/app/api/demo/route.ts reads actual policy and previews allowed counterparties, spend caps and approval thresholds. It does not call MultiBaas or execute a transaction. A deployment and API key are required.

## Intercepta — simulated
The risk result is explicitly simulated. No credentials or verified endpoint configuration were supplied. It is not a counterparty security assessment.

## 1inch — not connected
No API key, quote, router transaction, swap execution or off-venue detection is present.

## OpenZeppelin and EAS
OpenZeppelin 4.9.6 supplies access control, reentrancy protection, safe ERC-20 movement, pause controls and arithmetic. EAS 1.9.0 is installed with an interface smoke test; no schema or attestation is created.

## Automation
ClaimsManager exposes checkUpkeep/performUpkeep. scripts/demo.mjs polls every three seconds and settles on Anvil. This is a local keeper, not registered hosted automation. The linear scan is a scalability limitation.
