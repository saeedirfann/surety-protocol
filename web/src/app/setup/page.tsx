import Link from "next/link";
import { setupStatus } from "../../../../shared/setup-status.mjs";

export const dynamic = "force-dynamic";
export const metadata = { title: "Secure setup | Surety" };

const variables = [
  ["PROTOCOL_DEPLOYMENT_JSON", "Server + indexer", "Your deployed contract addresses, deployment block and network manifest."],
  ["PROTOCOL_RPC_URL", "Server + indexer", "Your private HTTPS RPC endpoint. Never prefix a secret with NEXT_PUBLIC_."],
  ["INDEXER_URL", "Server", "Your persistent Ponder service's HTTPS URL."],
  ["DATABASE_URL / DATABASE_SCHEMA", "Indexer only", "Your Postgres connection secret and unique release schema."],
  ["MOCK_MODE=false", "Server + indexer", "Disable local mock signing. Leave DEMO_SNAPSHOT_MODE unset or false for live configuration."],
  ["NEXT_PUBLIC_RPC_URL", "Browser (optional)", "Only a browser-safe public RPC endpoint; any value here is visible to visitors."],
];

export default function Setup() {
  const status = setupStatus(process.env);
  return <main className="setup-page">
    <Link href="/" className="text-btn">← Back to Surety</Link>
    <div className="page-heading"><div><div className="eyebrow">YOUR WORKSPACE. YOUR CREDENTIALS.</div><h1>Secure setup<span className="heading-dot">.</span></h1><p>Bring your own infrastructure. Keep your keys out of the browser.</p></div></div>
    <section className="panel setup-section"><h2>For visitors</h2><p>Connect your own wallet to use a configured public deployment. Review every approval and transaction in your wallet. You never need to submit a private key, seed phrase or sponsor API key to this website.</p><p>When the dashboard says recorded preview, financial actions are disabled. Connecting a wallet does not activate missing contracts or services.</p></section>
    <section className="panel setup-section"><h2>For workspace owners</h2><p>Deploy your own copy and supply your own provider credentials through the hosting dashboard&apos;s environment-variable settings. This page deliberately has no secret-entry form and never stores credentials in cookies or local storage. Your .env files must remain gitignored.</p><div className="setup-warning">Configuration is not proof of deployment. Public contracts, genuine World identity onboarding, funded automation and real multi-wallet lifecycle tests are still required. Sepolia currently has no UMA DVM dispute support; do not use real funds or claim complete arbitration.</div>
      <h3>This host&apos;s configuration</h3><ul className="setup-checks">{status.checks.map(check => <li key={check.name}><span>{check.name}</span><span className={check.configured ? "subtle-tag" : "setup-missing"}>{check.configured ? "Configured" : "Needs setup"}</span></li>)}</ul><p className="muted">{status.configurationComplete ? "Configuration fields are present. Run the infrastructure checks and actual wallet flows before release." : "This host is not configured for public operation. Owners must add the required environment variables and redeploy."} No credential values are displayed here.</p>
    </section>
    <section className="panel setup-section"><h2>Environment variables</h2><div className="table-wrap"><table><thead><tr><th>Variable</th><th>Location</th><th>Purpose</th></tr></thead><tbody>{variables.map(([name, location, purpose]) => <tr key={name}><td><code>{name}</code></td><td>{location}</td><td>{purpose}</td></tr>)}</tbody></table></div><p>World, ENS, Curvegrid, Intercepta and 1inch require their own accounts, supported networks and implemented adapters. Adding a key alone does not enable an unfinished integration. Never reuse another person&apos;s credentials.</p></section>
    <section className="panel setup-section"><h2>Test before releasing</h2><ol><li>Explore the recorded preview without credentials, or run <code>pnpm demo</code> for the full local transaction lifecycle.</li><li>Run <code>pnpm test:deployment</code>, <code>pnpm test:contracts</code>, <code>pnpm typecheck</code>, frontend lint and <code>pnpm build</code>.</li><li>With your server configuration loaded, run <code>pnpm verify:public</code>. This is read-only and does not sign transactions.</li><li>Use independent funded test wallets to verify identity, registration, approvals, claims, disputes, payout/rejection, withdrawal locks, policy delay and automation. Verify explorer receipts and indexer restart recovery.</li></ol><div className="setup-links"><a className="btn primary" href="https://github.com/saeedirfann/surety-protocol/blob/main/docs/PUBLIC_LAUNCH.md" target="_blank" rel="noopener noreferrer">Public launch guide ↗</a><a className="btn secondary" href="https://github.com/saeedirfann/surety-protocol/blob/main/docs/VERCEL.md" target="_blank" rel="noopener noreferrer">Vercel instructions ↗</a></div></section>
  </main>;
}
