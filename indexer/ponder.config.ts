import { createConfig } from "ponder";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { AgentRegistryAbi, ClaimsManagerAbi } from "../shared/contracts";
const file = resolve("../shared/deployment.json");
const deployment = existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;

export default createConfig({
  database: { kind: "pglite", directory: process.env.PONDER_DATABASE_DIR ?? ".ponder/pglite" },
  chains: {
    anvil: {
      id: 31337,
      rpc: process.env.PONDER_RPC_URL_31337 ?? "http://127.0.0.1:8545",
    },
  },
  blocks: {
    LocalBlock: {
      chain: "anvil",
      interval: 2,
      startBlock: deployment?.startBlock ?? 0,
    },
  },
  contracts: {
    Registry: { chain: "anvil", abi: AgentRegistryAbi, address: (deployment?.registry ?? "0x0000000000000000000000000000000000000000") as `0x${string}`, startBlock: deployment?.startBlock ?? 0 },
    Claims: { chain: "anvil", abi: ClaimsManagerAbi, address: (deployment?.manager ?? "0x0000000000000000000000000000000000000000") as `0x${string}`, startBlock: deployment?.startBlock ?? 0 },
  },
});
