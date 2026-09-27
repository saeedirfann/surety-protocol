import { ponder } from "ponder:registry";
import { agent, claim, localBlock } from "ponder:schema";
import { AgentRegistryAbi, BondVaultAbi, ExpandedERC20Abi } from "../../shared/contracts";
import { createPublicClient, http } from "viem";
import { deployment, rpc } from "../deployment";
const head = createPublicClient({ transport: http(rpc) });

ponder.on("LocalBlock:block", async ({ event, context }) => {
  await context.db.insert(localBlock).values({
    number: event.block.number,
    hash: event.block.hash,
    timestamp: event.block.timestamp,
  });
  if (!deployment) return;
  // Claims retain full event history; avoid replaying unchanged balance snapshots through every historical block.
  if (event.block.number + 4n < await head.getBlockNumber({ cacheTime: 1000 })) return;
  const count = await context.client.readContract({ abi: AgentRegistryAbi, address: deployment.registry, functionName: "agentCount" });
  await Promise.all(Array.from({ length: Number(count) }, async (_, index) => {
    const id = BigInt(index + 1);
    const a = await context.client.readContract({ abi: AgentRegistryAbi, address: deployment.registry, functionName: "agents", args: [id] });
    const [p, balance, reserved] = await Promise.all([
      context.client.readContract({ abi: AgentRegistryAbi, address: deployment.registry, functionName: "getPolicy", args: [id] }),
      context.client.readContract({ abi: ExpandedERC20Abi, address: deployment.token, functionName: "balanceOf", args: [a[1]] }),
      context.client.readContract({ abi: BondVaultAbi, address: a[1], functionName: "reserved" }),
    ]);
    await context.db.insert(agent).values({ id, operator: a[0], vault: a[1], metadata: a[2], bond: balance, reserved, maxTxValue: p.maxTxValue, approvalAbove: p.requiresApprovalAbove, allowedContracts: JSON.stringify(p.allowedContracts), allowedSelectors: JSON.stringify(p.allowedTxSelectors), paidClaims: a[3], totalPaid: a[4] }).onConflictDoUpdate({ operator: a[0], vault: a[1], metadata: a[2], bond: balance, reserved, maxTxValue: p.maxTxValue, approvalAbove: p.requiresApprovalAbove, allowedContracts: JSON.stringify(p.allowedContracts), allowedSelectors: JSON.stringify(p.allowedTxSelectors), paidClaims: a[3], totalPaid: a[4] });
  }));
});

ponder.on("Claims:ClaimFiled", async ({ event, context }) => {
  const a = event.args;
  await context.db.insert(claim).values({ id: a.assertionId, agentId: a.agentId, claimant: a.claimant, damages: a.damages, bond: a.bond, deadline: BigInt(a.deadline), status: "Pending", evidence: a.evidenceURI, filedAt: event.block.timestamp, txHash: event.transaction.hash });
});
ponder.on("Claims:ClaimDisputed", async ({ event, context }) => { await context.db.update(claim, { id: event.args.assertionId }).set({ status: "Disputed" }); });
ponder.on("Claims:ClaimResolved", async ({ event, context }) => { await context.db.update(claim, { id: event.args.assertionId }).set({ status: event.args.paid ? "Paid" : "Rejected" }); });
