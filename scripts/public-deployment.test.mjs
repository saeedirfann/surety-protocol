import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePublicDeployment, publicHttpsUrl } from "../shared/public-deployment.mjs";
import { verifyPublicContracts } from "../shared/verify-public.mjs";
const address = "0x" + "1".repeat(40);
const fixture = { chainId: 11155111, startBlock: 9000000, registry: address, manager: address, token: address, oracle: address, identity: address, rpc: "https://rpc.example.com", users: [address], privateKey: "discard" };
const parse = overrides => parsePublicDeployment(JSON.stringify({ ...fixture, ...overrides }));
test("allowlists public deployment fields and accepts HTTPS RPC override", () => {
  const config = parse({});
  assert.equal(config.users, undefined);
  assert.equal(config.privateKey, undefined);
  assert.equal(parsePublicDeployment(JSON.stringify(fixture), "https://another.example.com").rpc, "https://another.example.com");
});
test("rejects malformed JSON, local chain, missing addresses and unsafe blocks", () => {
  assert.throws(() => parsePublicDeployment("broken"));
  for (const chainId of [31337, 1, undefined]) assert.throws(() => parse({ chainId }));
  for (const key of ["registry", "manager", "token", "oracle", "identity"]) {
    for (const value of [undefined, "0x" + "0".repeat(40), "invalid"]) assert.throws(() => parse({ [key]: value }));
  }
  for (const startBlock of [undefined, 0, -1, 0.5, "10", Number.MAX_SAFE_INTEGER + 1]) assert.throws(() => parse({ startBlock }));
});
test("rejects local/private/insecure URLs and embedded credentials", () => {
  for (const host of ["localhost", "foo.localhost", "127.0.0.1", "[::1]", "10.0.0.1", "192.168.1.1", "169.254.169.254", "172.16.0.1"]) {
    assert.throws(() => publicHttpsUrl("https://" + host, "RPC"));
  }
  for (const rpc of ["http://rpc.example.com", "https://user:password@rpc.example.com", "invalid"]) assert.throws(() => parse({ rpc }));
});

const addresses = Object.fromEntries(["registry", "manager", "token", "oracle", "identity"].map((key, index) => [key, "0x" + String(index + 1).repeat(40)]));
const config = { ...fixture, ...addresses };
function client(overrides = {}) {
  return {
    getChainId: async () => 11155111,
    getBytecode: async () => "0x1234",
    readContract: async ({ address, functionName }) => {
      if (functionName in overrides) return overrides[functionName];
      if (functionName === "token") return config.token;
      if (functionName === "identity") return config.identity;
      if (functionName === "claimsManager") return config.manager;
      if (functionName === "registry") return config.registry;
      if (functionName === "oracle") return config.oracle;
      if (functionName === "decimals") return 6;
      if (functionName === "mockMode") return false;
      if (functionName === "router") return address;
      return 7200n;
    },
  };
}
test("accepts consistent contract wiring without any signing methods", async () => {
  await verifyPublicContracts(client(), config, {});
});
test("fails closed on missing bytecode, chain mismatch, wrong wiring, mock identity and unsafe currency", async () => {
  for (const overrides of [{ token: address }, { claimsManager: address }, { oracle: address }, { decimals: 18 }, { mockMode: true }, { externalNullifier: 0n }, { liveness: 45n }]) {
    await assert.rejects(verifyPublicContracts(client(overrides), config, {}));
  }
  await assert.rejects(verifyPublicContracts({ ...client(), getBytecode: async () => "0x" }, config, {}));
  await assert.rejects(verifyPublicContracts({ ...client(), getChainId: async () => 31337 }, config, {}));
});
