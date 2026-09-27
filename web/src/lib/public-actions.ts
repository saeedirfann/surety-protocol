import { createPublicClient, http, isAddress, parseEventLogs, parseUnits, type Abi, type Address, type Hex, type WalletClient } from "viem";
import { sepolia } from "viem/chains";
import * as abis from "../../../shared/contracts";

/** Real wallet-signed transactions only; never unlocked server accounts or simulated public receipts. */
export async function executePublicAction(input: Record<string, unknown>, deployment: Record<string, string>, wallet: WalletClient) {
  if (!wallet.account) throw new Error("Connect your wallet first");
  if (wallet.chain?.id !== sepolia.id) throw new Error("Switch your wallet to Sepolia before submitting");
  if (Number(deployment.chainId) !== sepolia.id) throw new Error("A verified public deployment is required");
  const reader = createPublicClient({ chain: sepolia, transport: http(process.env.NEXT_PUBLIC_RPC_URL) });
  const account = wallet.account;
  const address = (key: string) => { const value = deployment[key]; if (!isAddress(value)) throw new Error("Missing contract: " + key); return value as Address; };
  const amount = () => { const value = parseUnits(String(input.amount), 6); if (value <= 0n) throw new Error("Amount must be positive"); return value; };
  const send = async (abi: Abi, target: Address, functionName: string, args: unknown[]) => {
    const code = await reader.getCode({ address: target });
    if (!code || code === "0x") throw new Error("No deployed contract at " + target);
    const { request } = await reader.simulateContract({ abi, address: target, functionName, args, account, chain: sepolia });
    const hash = await wallet.writeContract(request);
    const receipt = await reader.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error("Transaction reverted");
    return { hash, receipt };
  };
  const approve = async (spender: Address, value: bigint) => {
    const token = address("token");
    const balance = await reader.readContract({ address: token, abi: abis.ExpandedERC20Abi, functionName: "balanceOf", args: [account.address] });
    if (balance < value) throw new Error("Insufficient collateral token balance");
    const allowance = await reader.readContract({ address: token, abi: abis.ExpandedERC20Abi, functionName: "allowance", args: [account.address, spender] });
    if (allowance < value) await send(abis.ExpandedERC20Abi, token, "approve", [spender, value]);
  };
  const identity = async () => {
    if (!(await reader.readContract({ address: address("identity"), abi: abis.WorldIDGateAbi, functionName: "isVerified", args: [account.address] }))) throw new Error("This wallet needs a genuine identity proof on the configured verifier. Local mock verification is never allowed online.");
  };
  const id = BigInt(String(input.agentId ?? 1));
  let result: { hash: Hex; receipt: Awaited<ReturnType<typeof reader.waitForTransactionReceipt>> };
  if (input.action === "register") {
    const name = String(input.name ?? "").trim(); if (!name || name.length > 40) throw new Error("Agent name must be 1–40 characters");
    await identity(); const value = amount(); await approve(address("registry"), value);
    result = await send(abis.AgentRegistryAbi, address("registry"), "registerAgent", [JSON.stringify({ name, category: "Wallet-operated agent", description: String(input.description ?? "") }), { maxTxValue: 50000000n, allowedContracts: [address("token")], allowedTxSelectors: ["0xa9059cbb"], requiresApprovalAbove: 25000000n }, value]);
  } else if (input.action === "claim") {
    const evidence = String(input.evidence ?? "").trim(); if (!evidence || evidence.length > 2048) throw new Error("Evidence is required (maximum 2048 characters)");
    await identity(); const value = amount();
    const bond = await reader.readContract({ address: address("manager"), abi: abis.ClaimsManagerAbi, functionName: "claimBond", args: [value] });
    await approve(address("manager"), bond);
    result = await send(abis.ClaimsManagerAbi, address("manager"), "fileClaim", [id, evidence, value]);
    return { tx: result.hash, assertionId: parseEventLogs({ abi: abis.ClaimsManagerAbi, eventName: "ClaimFiled", logs: result.receipt.logs })[0]?.args.assertionId };
  } else if (input.action === "dispute" || input.action === "settle") {
    if (!/^0x[0-9a-f]{64}$/i.test(String(input.claimId))) throw new Error("Invalid assertion ID");
    const claimId = input.claimId as Hex;
    if (input.action === "dispute") {
      const assertion = await reader.readContract({ address: address("oracle"), abi: abis.OptimisticOracleV3TestAbi, functionName: "getAssertion", args: [claimId] });
      await approve(address("oracle"), assertion.bond);
      result = await send(abis.OptimisticOracleV3TestAbi, address("oracle"), "disputeAssertion", [claimId, account.address]);
    } else result = await send(abis.ClaimsManagerAbi, address("manager"), "settle", [claimId]);
  } else if (input.action === "resolve") throw new Error("Public disputes are resolved by UMA. Mock verdict controls are local-only.");
  else {
    const agent = await reader.readContract({ address: address("registry"), abi: abis.AgentRegistryAbi, functionName: "agents", args: [id] });
    if (!isAddress(agent[1]) || /^0x0{40}$/i.test(agent[1])) throw new Error("Agent not found");
    if (input.action === "screen") {
      if (!isAddress(String(input.target))) throw new Error("Enter a valid counterparty address");
      const policy = await reader.readContract({ address: address("registry"), abi: abis.AgentRegistryAbi, functionName: "getPolicy", args: [id] });
      const value = amount();
      return { outcome: !policy.allowedContracts.some(a => a.toLowerCase() === String(input.target).toLowerCase()) ? "Blocked: counterparty outside allowlist" : value > policy.maxTxValue ? "Blocked: spend cap exceeded" : value > policy.requiresApprovalAbove ? "Human approval required" : "On-chain policy preview passed. External risk screening is not connected." };
    }
    if (agent[0].toLowerCase() !== account.address.toLowerCase()) throw new Error("Only the registered operator can manage this agent");
    if (input.action === "topup") { const value = amount(); await approve(agent[1], value); result = await send(abis.BondVaultAbi, agent[1], "deposit", [value]); }
    else if (input.action === "withdraw") result = await send(abis.BondVaultAbi, agent[1], "withdraw", [amount()]);
    else if (input.action === "policy") {
      const policy = await reader.readContract({ address: address("registry"), abi: abis.AgentRegistryAbi, functionName: "getPolicy", args: [id] });
      result = await send(abis.AgentRegistryAbi, address("registry"), "schedulePolicy", [id, { ...policy, maxTxValue: amount() }]);
    } else if (input.action === "applyPolicy") result = await send(abis.AgentRegistryAbi, address("registry"), "applyPolicy", [id]);
    else throw new Error("Unsupported public action");
  }
  return { tx: result.hash };
}
