import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parsePublicDeployment } from "../shared/public-deployment.mjs";

export const isPublic = Boolean(process.env.PROTOCOL_DEPLOYMENT_JSON);
if (process.env.MOCK_MODE === "false" && !isPublic) throw new Error("Public indexer requires PROTOCOL_DEPLOYMENT_JSON; refusing Anvil fallback");
if (isPublic && !process.env.DATABASE_URL) throw new Error("Public indexer requires persistent Postgres DATABASE_URL");
if (isPublic && !process.env.DATABASE_SCHEMA) throw new Error("Public indexer requires an explicit DATABASE_SCHEMA per deployment");
const file = resolve("../shared/deployment.json");
export const deployment = isPublic
  ? parsePublicDeployment(process.env.PROTOCOL_DEPLOYMENT_JSON!, process.env.PROTOCOL_RPC_URL)
  : existsSync(file) ? JSON.parse(readFileSync(file, "utf8")) : undefined;
export const rpc = isPublic ? deployment.rpc : process.env.PONDER_RPC_URL_31337 ?? "http://127.0.0.1:8545";
