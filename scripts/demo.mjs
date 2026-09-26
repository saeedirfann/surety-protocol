import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const require = createRequire(new URL("../agent-sim/package.json", import.meta.url));
const { createPublicClient, createWalletClient, http, maxUint256 } = require("viem");
const { foundry } = require("viem/chains");
const rpc = "http://127.0.0.1:8545";
const publicClient = createPublicClient({ chain: foundry, transport: http(rpc) });
const wallet = createWalletClient({ chain: foundry, transport: http(rpc) });
const children = [];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
function run(args, env = {}) {
  const child = spawn(process.execPath, args, { stdio: "inherit", env: { ...process.env, ...env } }); children.push(child); return child;
}
async function command(args) { const child = run(args); await new Promise((resolve, reject) => { child.on("error", reject); child.on("exit", code => code === 0 ? resolve() : reject(new Error(`Command failed: ${args.join(" ")}`))); }); }
const artifact = name => JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`, "utf8"));
const send = async (name, address, functionName, args = [], account) => {
  const hash = await wallet.writeContract({ address, abi: artifact(name).abi, functionName, args, account });
  const receipt = await publicClient.waitForTransactionReceipt({ hash }); if (receipt.status !== "success") throw new Error(`${functionName} reverted`); return receipt;
};
const cleanup = (code = 0) => { for (const child of children) child.kill("SIGTERM"); process.exit(code); };
process.on("SIGINT", () => cleanup()); process.on("SIGTERM", () => cleanup());
try {
  run(["scripts/foundry.mjs", "anvil", "--host", "127.0.0.1", "--hardfork", "paris", "--disable-code-size-limit", "--gas-limit", "100000000", "--block-time", "2", "--silent"]);
  for (let i = 0; i < 30; i++) { try { if (await publicClient.getChainId() !== 31337) throw new Error("Wrong chain"); break; } catch { if (i === 29) throw new Error("Anvil did not start; stop any existing chain first."); await sleep(1000); } }
  await command(["scripts/foundry.mjs", "forge", "build", "--root", "contracts"]);
  await command(["scripts/export-abis.mjs"]);
  const users = (await wallet.getAddresses()).slice(0, 3);
  const demo = artifact("DemoEnvironment");
  const deployHash = await wallet.deployContract({ abi: demo.abi, bytecode: demo.bytecode.object, args: [users], account: users[0], gas: 80000000n });
  const deployed = await publicClient.waitForTransactionReceipt({ hash: deployHash });
  if (!deployed.contractAddress || deployed.status !== "success") throw new Error("Fixture deployment failed");
  const config = { chainId: 31337, rpc, startBlock: Number(deployed.blockNumber), fixture: deployed.contractAddress, deploymentTx: deployHash, users, mocked: ["World ID", "UMA DVM", "ENS", "MultiBaas", "Intercepta", "1inch", "Automation hosting"] };
  for (const field of ["token", "oracle", "dvm", "identity", "registry", "manager"]) config[field] = await publicClient.readContract({ address: config.fixture, abi: demo.abi, functionName: field });
  for (const account of users) await send("WorldIDGate", config.identity, "verifyMock", [], account);
  await send("ExpandedERC20", config.token, "approve", [config.registry, maxUint256], users[0]);
  await send("ExpandedERC20", config.token, "approve", [config.manager, maxUint256], users[1]);
  await send("ExpandedERC20", config.token, "approve", [config.oracle, maxUint256], users[0]);
  for (const [name, category, bond] of [["Atlas", "Trading & execution", 5000], ["Sentinel", "Treasury operations", 2500], ["Scout", "Research & procurement", 1200]]) {
    await send("AgentRegistry", config.registry, "registerAgent", [JSON.stringify({ name, category, description: `${name} operates under a bonded, public transaction policy.` }), { maxTxValue: 50000000n, allowedContracts: [config.token], allowedTxSelectors: ["0xa9059cbb"], requiresApprovalAbove: 25000000n }, BigInt(bond) * 1000000n], users[0]);
  }
  mkdirSync("shared", { recursive: true }); mkdirSync("deployments", { recursive: true });
  writeFileSync("shared/deployment.json", JSON.stringify(config, null, 2) + "\n");
  writeFileSync("deployments/local.json", JSON.stringify(config, null, 2) + "\n");
  console.log("Local contracts deployed:", { registry: config.registry, claims: config.manager, oracle: config.oracle });
  const pnpm = process.env.npm_execpath; if (!pnpm) throw new Error("Run this command through pnpm demo");
  // Avoid dev hot-reload closing PGlite while indexing. Isolate each demo's application tables.
  run([pnpm, "--filter", "@surety/indexer", "start", "--schema", `surety_${Date.now()}`, "--hostname", "127.0.0.1"], { MOCK_MODE: "true", PONDER_TELEMETRY_DISABLED: "true" });
  run([pnpm, "--filter", "@surety/web", "dev"], { MOCK_MODE: "true" });
  let busy = false;
  setInterval(async () => {
    if (busy) return; busy = true;
    try {
      const [needed, data] = await publicClient.readContract({ address: config.manager, abi: artifact("ClaimsManager").abi, functionName: "checkUpkeep", args: ["0x"] });
      if (needed) await send("ClaimsManager", config.manager, "performUpkeep", [data], users[2]);
    } catch (error) { console.error("Keeper:", error.shortMessage ?? error.message); } finally { busy = false; }
  }, 3000);
  console.log("Surety demo: http://localhost:3000 | automatic settlement every 3 seconds | challenge window 45 seconds");
} catch (error) { console.error(error.shortMessage ?? error.message); cleanup(1); }
