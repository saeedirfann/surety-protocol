import { createConfig } from "ponder";
import { AgentRegistryAbi, ClaimsManagerAbi } from "../shared/contracts";
import { deployment, isPublic, rpc } from "./deployment";

export default createConfig({
  database: isPublic
    ? { kind: "postgres", connectionString: process.env.DATABASE_URL }
    : { kind: "pglite", directory: process.env.PONDER_DATABASE_DIR ?? ".ponder/pglite" },
  chains: {
    anvil: {
      id: isPublic ? deployment.chainId : 31337,
      rpc,
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
