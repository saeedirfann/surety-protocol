import { createPublicClient, http } from "viem";
import { foundry } from "viem/chains";

const client = createPublicClient({
  chain: foundry,
  transport: http(process.env.RPC_URL ?? "http://127.0.0.1:8545"),
});

const chainId = await client.getChainId();
if (chainId !== foundry.id) throw new Error(`Expected Anvil (31337), received ${chainId}`);
console.log(`Surety scaffold connected to Anvil at block ${await client.getBlockNumber()}.`);
console.log("Agent transaction execution will be added in a later phase.");
