import { readFileSync } from "node:fs";
import path from "node:path";
import { createPublicClient, createWalletClient, http, type Address, type Abi } from "viem";
import { foundry } from "viem/chains";
import * as abis from "../../../shared/contracts";

export function deployment() {
  const root = path.resolve(process.cwd(), process.cwd().endsWith("web") ? ".." : ".");
  return JSON.parse(readFileSync(path.join(root, "shared/deployment.json"), "utf8")) as {
    chainId: number; rpc: string; startBlock: number; users: Address[]; registry: Address; manager: Address; token: Address; oracle: Address; dvm: Address; identity: Address; deploymentTx: string; fixture: Address;
  };
}
export const publicClient = () => createPublicClient({ chain: foundry, transport: http("http://127.0.0.1:8545") });
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
