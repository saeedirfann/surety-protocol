import { readFileSync } from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, isAddress, type Address, type Abi } from "viem";
import { foundry, sepolia } from "viem/chains";
import * as abis from "../../../shared/contracts";
import localDeployment from "../../../shared/deployment.json";
import recordedDemo from "../../../shared/demo-snapshot.json";

type Deployment = { chainId: number; rpc: string; startBlock: number; users: Address[]; registry: Address; manager: Address; token: Address; oracle: Address; dvm: Address; identity: Address; deploymentTx: string; fixture: Address };

export function hosted(request: Request) {
  return process.env.VERCEL === "1" || !["localhost", "127.0.0.1", "[::1]"].includes(new URL(request.url).hostname);
}
export function publicDeployment() {
  if (!process.env.PROTOCOL_DEPLOYMENT_JSON) return undefined;
  const config = JSON.parse(process.env.PROTOCOL_DEPLOYMENT_JSON) as Deployment;
  if (config.chainId !== sepolia.id) throw new Error("Public deployment must use Sepolia (11155111)");
  for (const key of ["registry", "manager", "token", "oracle", "identity"] as const) {
    if (!isAddress(config[key]) || /^0x0{40}$/i.test(config[key])) throw new Error("Invalid public " + key + " address");
  }
  const rpc = new URL(process.env.PROTOCOL_RPC_URL ?? config.rpc);
  if (rpc.protocol !== "https:" || ["localhost", "127.0.0.1"].includes(rpc.hostname)) throw new Error("Public deployment requires a hosted HTTPS RPC");
  return { ...config, rpc: rpc.toString() };
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
  const response = await fetch(`${process.env.INDEXER_URL ?? "http://127.0.0.1:42069"}/graphql`, {
    method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store", signal: AbortSignal.timeout(6000),
    body: JSON.stringify({ query: "{ agents(limit: 100, orderBy: \"id\") { items { id operator vault metadata bond reserved maxTxValue approvalAbove allowedContracts allowedSelectors paidClaims totalPaid } } claims(limit: 100, orderBy: \"filedAt\", orderDirection: \"desc\") { items { id agentId claimant damages bond deadline status evidence filedAt txHash } } }" }),
  });
  const body = await response.json(); if (!response.ok || body.errors) throw new Error("Indexer is synchronizing. Please retry shortly."); return body.data;
}
export { abis };
