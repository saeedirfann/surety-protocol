import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
const names = ["AgentRegistry", "ClaimsManager", "BondVault", "WorldIDGate", "ExpandedERC20", "OptimisticOracleV3Test", "MockOracleAncillary", "DemoEnvironment"];
mkdirSync("shared", { recursive: true });
const exports = names.map(name => `export const ${name}Abi = ${JSON.stringify(JSON.parse(readFileSync(`contracts/out/${name}.sol/${name}.json`, "utf8")).abi)} as const;`);
writeFileSync("shared/contracts.ts", "// Generated from Foundry artifacts. Run pnpm abi after contract changes.\n" + exports.join("\n") + "\n");
