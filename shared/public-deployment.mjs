/** Fail closed: public services must never inherit the Anvil fixture. */
export function parsePublicDeployment(serialized, rpcOverride) {
  let config;
  try { config = JSON.parse(serialized); } catch { throw new Error("Invalid PROTOCOL_DEPLOYMENT_JSON"); }
  if (!config || config.chainId !== 11155111) throw new Error("Public deployment must use Sepolia (11155111)");
  for (const key of ["registry", "manager", "token", "oracle", "identity"]) {
    if (typeof config[key] !== "string" || !/^0x[\da-f]{40}$/i.test(config[key]) || /^0x0{40}$/i.test(config[key])) {
      throw new Error("Invalid public " + key + " address");
    }
  }
  if (!Number.isSafeInteger(config.startBlock) || config.startBlock < 1) throw new Error("Public startBlock must be a positive safe integer");
  const rpc = publicHttpsUrl(rpcOverride ?? config.rpc, "RPC");
  // Explicit allowlist: discard fixture accounts, private keys and arbitrary JSON fields.
  return Object.fromEntries(["chainId", "startBlock", "registry", "manager", "token", "oracle", "identity"].map(key => [key, config[key]]) .concat([["rpc", rpc]]));
}

export function publicHttpsUrl(value, name) {
  let url;
  try { url = new URL(value); } catch { throw new Error("Public " + name + " requires an HTTPS URL"); }
  const host = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || host === "localhost" || host.endsWith(".localhost") || host === "[::1]" || /^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host) || /^172\.(1[6-9]|2\d|3[01])\./.test(host)) {
    throw new Error("Public " + name + " requires a hosted HTTPS URL without embedded credentials");
  }
  return url.toString().replace(/\/$/, "");
}
