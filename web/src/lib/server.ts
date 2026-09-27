import { readFileSync } from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, type Address, type Abi } from "viem";
import { parsePublicDeployment, publicHttpsUrl } from "../../../shared/public-deployment.mjs";
import { verifyPublicContracts } from "../../../shared/verify-public.mjs";
import { foundry, sepolia } from "viem/chains";
import * as abis from "../../../shared/contracts";
import localDeployment from "../../../shared/deployment.json";
import recordedDemo from "../../../shared/demo-snapshot.json";

type Deployment = { chainId: number; rpc: string; startBlock: number; users: Address[]; registry: Address; manager: Address; token: Address; oracle: Address; dvm: Address; identity: Address; deploymentTx: string; fixture: Address };
let checkedDeployment: { key: string; expires: number; promise: Promise<void> } | undefined;
export async function validatePublicInfrastructure() {
  const config = publicDeployment();
  if (!config) throw new Error("Public deployment is not configured");
  const key = JSON.stringify(config);
  if (!checkedDeployment || checkedDeployment.key !== key || checkedDeployment.expires < Date.now()) {
    const promise = verifyPublicContracts(publicClient(), config, abis);
    checkedDeployment = { key, expires: Date.now() + 60000, promise };
    promise.catch(() => { if (checkedDeployment?.promise === promise) checkedDeployment = undefined; });
  }
  await checkedDeployment.promise;
}

export function hosted(request: Request) {
  return process.env.VERCEL === "1" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname);
}
export function publicDeployment() {
  if (!process.env.PROTOCOL_DEPLOYMENT_JSON) return undefined;
  return parsePublicDeployment(process.env.PROTOCOL_DEPLOYMENT_JSON, process.env.PROTOCOL_RPC_URL);
}
export function previewData() {
  return { ...structuredClone(recordedDemo), mode: "snapshot", capturedAt: recordedDemo.capturedAt,
    integrations: { ...recordedDemo.integrations, automation: "Recorded local keeper run — not live" } };
}

export function deployment() {
  const configured = publicDeployment();
  if (configured) return configured;
  if (process.env.VERCEL === "1") return localDeployment as Deployment;
  const root = path.resolve(process.cwd(), process.cwd().endsWith("web") ? ".." : ".");
  return JSON.parse(readFileSync(path.join(root, "shared/deployment.json"), "utf8")) as {
    chainId: number; rpc: string; startBlock: number; users: Address[]; registry: Address; manager: Address; token: Address; oracle: Address; dvm: Address; identity: Address; deploymentTx: string; fixture: Address;
  };
}
export function localDemoDeployment(): Deployment {
  if (publicDeployment() || process.env.VERCEL === "1" || process.env.MOCK_MODE !== "true") throw new Error("Local demo deployment is disabled");
  return deployment() as Deployment;
}
export const publicClient = () => {
  const config = publicDeployment();
  return createPublicClient({ chain: config ? sepolia : foundry, transport: http(config?.rpc ?? "http://127.0.0.1:8545", { timeout: 8000, retryCount: 1 }) });
};
export async function write(abi: Abi, address: Address, functionName: string, args: unknown[], account: Address) {
  const client = publicClient();
  if (await client.getChainId() !== 31337) throw new Error("Demo writes require Anvil");
  const wallet = createWalletClient({ chain: foundry, transport: http("http://127.0.0.1:8545") });
  const { request } = await client.simulateContract({ abi, address, functionName, args, account });
  const hash = await wallet.writeContract(request);
  const receipt = await client.waitForTransactionReceipt({ hash });
  if (receipt.status !== "success") throw new Error("Transaction reverted");
  return hash;
}
export async function indexed() {
  const live = Boolean(publicDeployment());
  const base = live ? publicHttpsUrl(process.env.INDEXER_URL!, "INDEXER_URL") : process.env.INDEXER_URL ?? "http://127.0.0.1:42069";
  if (live) {
    const ready = await fetch(`${base}/ready`, { cache: "no-store", signal: AbortSignal.timeout(6000) });
    if (!ready.ok) throw new Error("Indexer is synchronizing. Please retry shortly.");
  }
  const response = await fetch(`${base}/graphql`, {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000),
    body: JSON.stringify({ query: "{ agents(limit: 100, orderBy: \"id\") { items { id operator vault metadata bond reserved maxTxValue approvalAbove allowedContracts allowedSelectors paidClaims totalPaid } } claims(limit: 100, orderBy: \"filedAt\", orderDirection: \"desc\") { items { id agentId claimant damages bond deadline status evidence filedAt txHash } } }" }),
  });
  const body = await response.json(); if (!response.ok || body.errors) throw new Error("Indexer is synchronizing. Please retry shortly."); return body.data;
}
export { abis };
