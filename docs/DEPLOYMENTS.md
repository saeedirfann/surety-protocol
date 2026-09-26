# Deployments

## Anvil local — chain 31337
RPC: http://127.0.0.1:8545. Run pnpm demo to recreate the stack. Public explorers cannot verify local addresses.

| Component | Address |
| --- | --- |
| Demo environment | `0x5fbdb2315678afecb367f032d93f642f64180aa3` |
| Registry | `0x275039fc0fd2eeFac30835af6aeFf24e8c52bA6B` |
| Claims manager | `0x07e7876A32feEc2cE734aae93d9aB7623EaEF4a3` |
| UMA OOv3 | `0x9CfA6D15c80Eb753C815079F2b32ddEFd562C3e4` |
| Upstream mock DVM | `0x86337dDaF2661A069D0DcB5D160585acC2d15E9a` |
| Identity gate, mock mode | `0x427f7c59ED72bCf26DfFc634FEF3034e00922DD8` |
| Demo USD | `0xa16E02E87b7454126E5E10d957A927A7F5B5d2be` |

Recorded fixture transaction: `0x77551b668c408e2fd9d8294fa80c734cdd1236ba3908f6e238b3d535f20aad1a`.

The authoritative generated record is [deployments/local.json](../deployments/local.json). Each launch regenerates it and shared/deployment.json. Block numbers and hashes may change. Per-agent vaults are available through AgentRegistry.agents(id) and indexed agent data.

For local verification, read bytecode and contract state through RPC using shared/contracts.ts, or open the claim filing receipt in the dashboard. Chain resets invalidate old receipts and assertion IDs.

## Public networks
No Sepolia/mainnet deployment or explorer verification exists. No ENS namespace, EAS attestation, real World proof or hosted keeper has been configured. Do not present local addresses as public-chain deployments.
