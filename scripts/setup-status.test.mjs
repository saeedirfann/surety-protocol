import { test } from "node:test";
import assert from "node:assert/strict";
import { setupStatus } from "../shared/setup-status.mjs";
const address = "0x" + "1".repeat(40);
const deployment = { chainId: 11155111, startBlock: 100, registry: address, manager: address, oracle: address, token: address, identity: address, rpc: "https://rpc.example.com/secret-canary" };
const env = { MOCK_MODE: "false", INDEXER_URL: "https://indexer.example.com", PROTOCOL_DEPLOYMENT_JSON: JSON.stringify(deployment), WORLD_API_KEY: "secret-world-canary", DATABASE_URL: "postgres://secret-db-canary", DEPLOYER_PRIVATE_KEY: "secret-private-key-canary" };
test("status reports configuration, never claims end-to-end verification", () => {
  assert.equal(setupStatus(env).configurationComplete, true);
  assert.equal(setupStatus(env).endToEndVerified, false);
  assert.equal(setupStatus({}).configurationComplete, false);
});
test("status never serializes secrets, addresses or raw configuration errors", () => {
  for (const config of [env, { ...env, PROTOCOL_DEPLOYMENT_JSON: "secret-malformed-json-canary" }]) {
    const text = JSON.stringify(setupStatus(config));
    assert.equal(text.includes("secret"), false);
    assert.equal(text.includes(address), false);
    assert.equal(text.includes("example.com"), false);
  }
});
test("unsafe indexer, malformed manifest, mock mode and preview override fail readiness", () => {
  for (const overrides of [{ INDEXER_URL: "http://localhost:42069" }, { PROTOCOL_DEPLOYMENT_JSON: "broken" }, { MOCK_MODE: "true" }, { DEMO_SNAPSHOT_MODE: "true" }]) {
    assert.equal(setupStatus({ ...env, ...overrides }).configurationComplete, false);
  }
});
