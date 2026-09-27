# Public launch gate

The hosted frontend is currently a recorded preview. A website deployment does not deploy Ethereum contracts or run the indexer. Do not remove preview labels until the release checks below have passed.

The application's `/setup` page provides bring-your-own-credentials instructions and boolean configuration status. Enter secrets only in the appropriate hosting dashboard or local ignored environment files, never in the public website. See [SECURITY.md](SECURITY.md).

## Architecture

Vercel serves the interface and read-only API. Users sign writes with their own wallets; no unlocked accounts or operator private keys belong in Vercel. A separately hosted Ponder process follows the public chain and persists its data in Postgres. UMA resolves assertions; World verifies personhood. Automation must be registered and funded separately.

## Network decision required

The present wallet adapter targets Ethereum Sepolia. UMA's [network information](https://docs.uma.xyz/resources/network-addresses) currently lists Sepolia with **no DVM support**. Do not promise automatic real arbitration for disputed Sepolia assertions. A complete recourse launch requires choosing a DVM-supported network, adapting the wallet/configuration, verifying World router availability there, and testing both oracle outcomes. Mainnet assets must not be enabled before security review.

## Owner-provided prerequisites

- A funded wallet on the chosen network for deployment and gas. Use a local encrypted keystore or hardware wallet; never send private keys through chat or commit them.
- A genuine World developer application and action, compatible verification SDK/router, and completed proof flow. The current on-chain gate alone is not frontend onboarding.
- A UMA-supported collateral token. The current frontend assumes six decimals. Confirm approved collateral and its minimum bond against the deployed oracle.
- Hosting for one persistent Ponder instance and Postgres, in the same region/private network. Configure HTTPS ingress, database backups, restart policy and monitoring.
- Chainlink/Gelato registration and funding, or a separately approved funded keeper deployment. The local timer is not public automation.
- Real partner accounts, permissions and keys for ENS, MultiBaas, Intercepta and 1inch if those integrations are included. Current placeholders are not prize-eligible integrations.

## Configure the indexer

Install with `pnpm install --frozen-lockfile`. On the persistent host, set:

```dotenv
MOCK_MODE=false
PROTOCOL_DEPLOYMENT_JSON={"chainId":11155111,"startBlock":DEPLOYMENT_BLOCK,"registry":"REGISTRY_ADDRESS","manager":"MANAGER_ADDRESS","token":"TOKEN_ADDRESS","oracle":"ORACLE_ADDRESS","identity":"WORLD_GATE_ADDRESS","rpc":"https://YOUR_RPC"}
PROTOCOL_RPC_URL=https://YOUR_PRIVATE_RPC
DATABASE_URL=postgres://USER:PASSWORD@DATABASE_HOST:5432/DATABASE
DATABASE_SCHEMA=surety_RELEASE_ID
PONDER_TELEMETRY_DISABLED=true
```

The example JSON contains placeholders and is not valid until replaced. Set these as secrets in the host's environment, not in committed files. Use a different schema for each new release; reuse the same schema only when restarting the same release.

Run from the repository root:

```sh
pnpm --filter @surety/indexer start --hostname 0.0.0.0 --port 42069
```

Expose the port through the host's HTTPS ingress. `/health` indicates that the process has started; `/ready` only returns 200 after indexing has reached realtime. Use `/ready` as the deployment readiness gate. Never run this long-lived process inside a Vercel function. See [Ponder self-hosting](https://ponder.sh/docs/production/self-hosting).

## Configure Vercel

Keep the existing `web` root directory, Node 22 and frozen-lockfile install configuration described in [VERCEL.md](VERCEL.md). Set `MOCK_MODE=false`, the same `PROTOCOL_DEPLOYMENT_JSON`, server-only `PROTOCOL_RPC_URL`, and `INDEXER_URL=https://YOUR_INDEXER`. Leave `DEMO_SNAPSHOT_MODE` unset or false. `NEXT_PUBLIC_RPC_URL`, if used, must be a browser-safe public RPC endpoint, not the private server credential.

The app validates bytecode, chain ID, registry/manager/token/identity wiring, six-decimal collateral, non-mock World verification and a challenge window of at least one hour. It refuses live reads while the indexer is not ready. Invalid live configuration returns an unavailable response, never a silently substituted demo.

## Verification and release

```sh
pnpm test:deployment
pnpm test:contracts
pnpm typecheck
pnpm --filter @surety/web lint
pnpm build
# With real public configuration loaded into the terminal environment:
pnpm verify:public
```

`verify:public` is read-only. It verifies infrastructure and indexer schema, not sponsor credentials, keeper funding, collateral approval, oracle dispute support or actual user flows. It never signs transactions and does not print credential-bearing SDK errors.

Before merging to main, verify with two independently controlled wallets: connect/switch network, obtain genuine World proofs, approve collateral, register an agent, top up, queue/apply policy after its delay, file a claim, reject withdrawal while reserved, dispute an assertion, observe both UMA payout/rejection outcomes, settle automatically, withdraw remaining funds and inspect explorer receipts. Repeat after restarting the indexer and verify mobile layout and error recovery. Record actual contract addresses and verified explorer links in DEPLOYMENTS.md.

Do not push this branch or switch the public site to live until those checks pass. External account setup, deployments and the network decision remain outstanding.
