import { NextResponse } from "next/server";
import { isAddress, parseUnits, type Hex } from "viem";
import { abis, deployment, publicClient, write } from "@/lib/server";
export const dynamic = "force-dynamic";
let locked = false;
export async function POST(request: Request) {
  const url = new URL(request.url); const origin = request.headers.get("origin");
  if (process.env.MOCK_MODE !== "true" || !["localhost", "127.0.0.1"].includes(url.hostname) || (origin && origin !== url.origin)) return NextResponse.json({ error: "Local demo actions are disabled" }, { status: 403 });
  if (locked) return NextResponse.json({ error: "A transaction is in progress. Retry shortly." }, { status: 409 });
  locked = true;
  try {
    const input = await request.json(); const d = deployment(); const p = publicClient(); let tx: string | undefined;
    const id = BigInt(input.agentId ?? 1);
    if (input.action === "claim") {
      const amount = parseUnits(String(input.amount), 6);
      tx = await write(abis.ClaimsManagerAbi, d.manager, "fileClaim", [id, String(input.evidence ?? ""), amount], d.users[1]);
    } else if (input.action === "dispute" || input.action === "resolve") {
      if (!/^0x[0-9a-f]{64}$/i.test(input.claimId)) throw new Error("Invalid assertion ID");
      const claimId = input.claimId as Hex;
      if (input.action === "dispute") tx = await write(abis.OptimisticOracleV3TestAbi, d.oracle, "disputeAssertion", [claimId, d.users[0]], d.users[0]);
      else {
        const assertion = await p.readContract({ abi: abis.OptimisticOracleV3TestAbi, address: d.oracle, functionName: "getAssertion", args: [claimId] });
        if (assertion.settled || assertion.disputer === "0x0000000000000000000000000000000000000000") throw new Error("Only disputed open claims accept a mock DVM verdict");
        const stamped = await p.readContract({ abi: abis.OptimisticOracleV3TestAbi, address: d.oracle, functionName: "stampAssertion", args: [claimId] });
        await write(abis.MockOracleAncillaryAbi, d.dvm, "pushPrice", [assertion.identifier, BigInt(assertion.assertionTime), stamped, input.uphold === true ? 1000000000000000000n : 0n], d.users[2]);
        tx = await write(abis.ClaimsManagerAbi, d.manager, "settle", [claimId], d.users[2]);
      }
    } else if (["topup", "withdraw", "policy"].includes(input.action)) {
      const agent = await p.readContract({ abi: abis.AgentRegistryAbi, address: d.registry, functionName: "agents", args: [id] });
      if (input.action === "policy") {
        const policy = await p.readContract({ abi: abis.AgentRegistryAbi, address: d.registry, functionName: "getPolicy", args: [id] });
        tx = await write(abis.AgentRegistryAbi, d.registry, "schedulePolicy", [id, { ...policy, maxTxValue: parseUnits(String(input.amount), 6) }], d.users[0]);
      } else {
        const amount = parseUnits(String(input.amount), 6);
        if (input.action === "topup") await write(abis.ExpandedERC20Abi, d.token, "approve", [agent[1], amount], d.users[0]);
        tx = await write(abis.BondVaultAbi, agent[1], input.action === "topup" ? "deposit" : "withdraw", [amount], d.users[0]);
      }
    } else if (input.action === "register") {
      const name = String(input.name ?? "").trim(); if (!name || name.length > 40) throw new Error("Name must be 1–40 characters");
      tx = await write(abis.AgentRegistryAbi, d.registry, "registerAgent", [JSON.stringify({ name, category: "Custom agent", description: String(input.description ?? "") }), { maxTxValue: 50000000n, allowedContracts: [d.token], allowedTxSelectors: ["0xa9059cbb"], requiresApprovalAbove: 25000000n }, parseUnits(String(input.amount), 6)], d.users[0]);
    } else if (input.action === "screen") {
      if (!isAddress(input.target)) throw new Error("Enter a valid counterparty address");
      const policy = await p.readContract({ abi: abis.AgentRegistryAbi, address: d.registry, functionName: "getPolicy", args: [id] });
      const amount = parseUnits(String(input.amount), 6);
      const allowed = policy.allowedContracts.some(a => a.toLowerCase() === input.target.toLowerCase());
      const outcome = !allowed ? "Blocked: counterparty is outside the allowlist" : amount > policy.maxTxValue ? "Blocked: transaction exceeds the spend cap" : amount > policy.requiresApprovalAbove ? "Human approval required" : "Policy passed — simulated risk screen passed";
      return NextResponse.json({ outcome, mocked: true });
    } else throw new Error("Unknown action");
    return NextResponse.json({ tx });
  } catch (error) { return NextResponse.json({ error: (error as { shortMessage?: string }).shortMessage ?? (error instanceof Error ? error.message : "Transaction failed") }, { status: 400 }); }
  finally { locked = false; }
}
