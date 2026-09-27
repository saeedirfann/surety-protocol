import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import { parsePublicDeployment, publicHttpsUrl } from "../shared/public-deployment.mjs";
import { verifyPublicContracts } from "../shared/verify-public.mjs";
const require = createRequire(new URL("../indexer/package.json", import.meta.url));
const { createPublicClient, http } = require("viem");
try {
  if (!process.env.PROTOCOL_DEPLOYMENT_JSON) throw new Error("PROTOCOL_DEPLOYMENT_JSON is required");
  const config = parsePublicDeployment(process.env.PROTOCOL_DEPLOYMENT_JSON, process.env.PROTOCOL_RPC_URL);
  const abis = {};
  for (const name of ["AgentRegistry", "ClaimsManager", "ExpandedERC20", "WorldIDGate", "OptimisticOracleV3Test"]) {
    abis[name + "Abi"] = JSON.parse(readFileSync(new URL(`../contracts/out/${name}.sol/${name}.json`, import.meta.url), "utf8")).abi;
  }
  await verifyPublicContracts(createPublicClient({ transport: http(config.rpc, { timeout: 10000, retryCount: 1 }) }), config, abis);
  const indexer = publicHttpsUrl(process.env.INDEXER_URL, "INDEXER_URL");
  const ready = await fetch(indexer + "/ready", { signal: AbortSignal.timeout(10000) });
  if (!ready.ok) throw new Error("Indexer has not reached realtime");
  const response = await fetch(indexer + "/graphql", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: "{ agents(limit: 1) { items { id } } claims(limit: 1) { items { id } } }" }), signal: AbortSignal.timeout(10000) });
  const body = await response.json();
  if (!response.ok || body.errors || !body.data?.agents || !body.data?.claims) throw new Error("Indexer schema does not match the application");
  console.log("Public infrastructure checks passed. Identity onboarding, funded wallet actions, dispute arbitration and automation still require end-to-end verification before release.");
} catch {
  // Never print SDK error objects: they can contain credential-bearing RPC URLs.
  console.error("Public verification failed. Check manifest, contract wiring, six-decimal collateral, genuine World router, challenge window, RPC access and indexer readiness. No transactions were sent.");
  process.exitCode = 1;
}
