# Security and credentials

This is an unaudited prototype, not a guarantee of safety. Do not use mainnet assets until independent review and the public launch gate are complete.

## Bring your own credentials

Visitors use their own wallets and approve transactions themselves. They must never provide private keys, seed phrases or sponsor API keys to the shared website. Workspace owners deploy their own copy and configure service credentials in their hosting provider's environment-variable/secret settings. `/setup` displays only allowlisted boolean configuration status, never credential values. It does not accept secret submissions or store keys in browser storage.

For local development, copy `web/.env.example` to `web/.env.local` and `indexer/.env.example` to `indexer/.env.local`. Use separate limited-scope development keys. Next.js/Ponder load their workspace environment files; root `.env` values are not automatically loaded by standalone scripts such as `verify:public`. Load those into the terminal environment using your approved secret manager before running the script.

`NEXT_PUBLIC_*` variables are compiled into browser-visible code. Only public app identifiers and browser-safe RPC endpoints belong there. Keep private RPC credentials in `PROTOCOL_RPC_URL`, database credentials in `DATABASE_URL` on the indexer host, and sponsor secrets on the server that actually calls those services. Never put deployment/keeper private keys in the Vercel web deployment. Keys alone do not enable unimplemented sponsor adapters.

## Deployment boundaries

- Public financial writes are signed by visitor wallets, with exact token approvals and contract simulation before submission.
- The local signing endpoint is refused on Vercel/public hosts and when public contracts are configured. Mock World verification is restricted to chain 31337 by the contract itself.
- Public reads validate network, bytecode, contract wiring, six-decimal collateral, non-mock World gate, challenge window and indexer readiness. Failures do not silently switch to simulated live results.
- Public errors are sanitized to avoid leaking RPC credential URLs. Read-only verification scripts do not print SDK error objects. Never attach raw provider logs or environment files to bug reports.
- Baseline headers deny framing, disable MIME sniffing, suppress outgoing referrers and restrict object/base embedding. This is not a full script-nonce CSP or a complete security audit.
- Configure platform rate limits/firewall rules, RPC spending caps and alerts, secret rotation, database backups, least-privilege access, HTTPS ingress and uptime monitoring separately. Keep Postgres private.

## Testing

`pnpm test:deployment` checks rejected public configurations, contract wiring and secret-redaction canaries. `pnpm test:contracts` checks contract behavior including money fuzzing. `pnpm test:hosted` checks wallet connector handling, setup/mobile layout, security headers and refusal of local writes; its test wallet never signs transactions. `pnpm test:e2e` exercises local financial transactions against Anvil. `pnpm verify:public` is a read-only public infrastructure check, not a security audit or evidence of genuine World proofs and working public dispute arbitration.

Real public release still needs independent wallet lifecycle tests, actual identity onboarding, supported arbitration, funded automation and verified public contract addresses. See [PUBLIC_LAUNCH.md](PUBLIC_LAUNCH.md).

## If a secret is exposed

Revoke/rotate it at the provider immediately, inspect usage and access logs, replace deployment settings, and redeploy. Removing a value from the newest commit does not remove it from Git history. Report vulnerabilities privately to the repository owner; never publish secrets or exploit a live deployment.
