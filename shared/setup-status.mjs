import { parsePublicDeployment, publicHttpsUrl } from "./public-deployment.mjs";

/** Public-safe status only. Never return environment values or SDK error objects. */
export function setupStatus(env) {
  const checks = [];
  let manifest = false;
  try { parsePublicDeployment(env.PROTOCOL_DEPLOYMENT_JSON, env.PROTOCOL_RPC_URL); manifest = true; } catch {}
  let indexer = false;
  try { publicHttpsUrl(env.INDEXER_URL, "INDEXER_URL"); indexer = true; } catch {}
  checks.push({ name: "Public contract manifest", configured: manifest });
  checks.push({ name: "Hosted HTTPS indexer", configured: indexer });
  checks.push({ name: "Recorded preview override disabled", configured: env.DEMO_SNAPSHOT_MODE !== "true" });
  checks.push({ name: "Server mock signing disabled", configured: env.MOCK_MODE === "false" });
  return { checks, configurationComplete: checks.every(check => check.configured), endToEndVerified: false };
}
