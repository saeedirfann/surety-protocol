import { NextResponse } from "next/server";
import { deployment, hosted, indexed, previewData, publicClient, publicDeployment } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const external = hosted(request); const configured = publicDeployment();
    if (process.env.DEMO_SNAPSHOT_MODE === "true" || (external && !configured)) return NextResponse.json(previewData(), { headers: { "Cache-Control": "no-store" } });
    if (external && (!process.env.INDEXER_URL || !process.env.INDEXER_URL.startsWith("https://"))) throw new Error("Live deployment requires an HTTPS INDEXER_URL");
    const config = deployment(); const data = await indexed();
    if (external) {
      const chain = await publicClient().getChainId();
      if (chain !== config.chainId) throw new Error("RPC chain does not match the deployment");
      const addresses = { chainId: config.chainId, registry: config.registry, manager: config.manager, token: config.token, oracle: config.oracle, identity: config.identity, startBlock: config.startBlock };
      return NextResponse.json({ ...data, deployment: addresses, block: String(await publicClient().getBlockNumber()), mode: "public", integrations: { uma: "Configured on-chain oracle — confirm deployment verification", identity: "Configured on-chain identity gate — genuine proof required", ens: "Not connected", multibaas: "Not connected", intercepta: "Not connected", oneinch: "Not connected", automation: "Hosting must be configured separately" } });
    }
    return NextResponse.json({ ...data, deployment: config, block: String(await publicClient().getBlockNumber()), mode: "local", integrations: { uma: "Real OOv3 + upstream DVM mock", identity: "Local mock", ens: "Blocked — namespace unavailable", multibaas: "Mock — credentials unavailable", intercepta: "Mock — endpoint/key unavailable", oneinch: "Mock — API key unavailable", automation: "Local keeper running" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Run pnpm demo to start the local chain and indexer." }, { status: 503 }); }
}
