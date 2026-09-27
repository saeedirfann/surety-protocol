/** Read-only deployment checks; never signs, sends transactions or changes chain state. */
export async function verifyPublicContracts(client, config, abis) {
  if (await client.getChainId() !== config.chainId) throw new Error("RPC chain does not match the deployment");
  for (const key of ["registry", "manager", "token", "oracle", "identity"]) {
    const code = await client.getBytecode({ address: config[key] });
    if (!code || code === "0x") throw new Error("No deployed bytecode for " + key);
  }
  const read = (key, abi, functionName, args = []) => client.readContract({ address: config[key], abi, functionName, args });
  const [registryToken, registryIdentity, manager, managerRegistry, managerToken, oracle, decimals, mockMode, router, nullifier, liveness] = await Promise.all([
    read("registry", abis.AgentRegistryAbi, "token"),
    read("registry", abis.AgentRegistryAbi, "identity"),
    read("registry", abis.AgentRegistryAbi, "claimsManager"),
    read("manager", abis.ClaimsManagerAbi, "registry"),
    read("manager", abis.ClaimsManagerAbi, "token"),
    read("manager", abis.ClaimsManagerAbi, "oracle"),
    read("token", abis.ExpandedERC20Abi, "decimals"),
    read("identity", abis.WorldIDGateAbi, "mockMode"),
    read("identity", abis.WorldIDGateAbi, "router"),
    read("identity", abis.WorldIDGateAbi, "externalNullifier"),
    read("manager", abis.ClaimsManagerAbi, "liveness"),
  ]);
  const same = (actual, expected) => typeof actual === "string" && actual.toLowerCase() === expected.toLowerCase();
  for (const [actual, expected] of [[registryToken, config.token], [registryIdentity, config.identity], [manager, config.manager], [managerRegistry, config.registry], [managerToken, config.token], [oracle, config.oracle]]) {
    if (!same(actual, expected)) throw new Error("Public contract wiring does not match deployment");
  }
  if (Number(decimals) !== 6) throw new Error("The current application requires a six-decimal collateral token");
  if (mockMode !== false || BigInt(nullifier) === 0n) throw new Error("Public World ID gate must use genuine verification with a configured action");
  const routerCode = await client.getBytecode({ address: router });
  if (!routerCode || routerCode === "0x") throw new Error("World ID router is not deployed");
  if (BigInt(liveness) < 3600n) throw new Error("Public challenge window must be at least one hour");
  // This is an infrastructure check, not proof of network DVM availability or partner onboarding.
  await read("oracle", abis.OptimisticOracleV3TestAbi, "getMinimumBond", [config.token]);
}
