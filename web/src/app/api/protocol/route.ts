import { NextResponse } from "next/server";
import { deployment, indexed, publicClient } from "@/lib/server";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const config = deployment(); const data = await indexed();
    return NextResponse.json({ ...data, deployment: config, block: String(await publicClient().getBlockNumber()), mode: "local", integrations: { uma: "Real OOv3 + upstream DVM mock", identity: "Local mock", ens: "Blocked — namespace unavailable", multibaas: "Mock — credentials unavailable", intercepta: "Mock — endpoint/key unavailable", oneinch: "Mock — API key unavailable", automation: "Local keeper running" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Run pnpm demo to start the local chain and indexer." }, { status: 503 }); }
}
