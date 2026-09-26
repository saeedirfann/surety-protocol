import { NextResponse } from "next/server";
import { deployment, indexed, publicClient } from "@/lib/server";
import { readFileSync } from "node:fs";
import path from "node:path";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    if (process.env.DEMO_SNAPSHOT_MODE === "true") {
      const root = path.resolve(process.cwd(), process.cwd().endsWith("web") ? ".." : ".");
      const snapshot = JSON.parse(readFileSync(path.join(root, "shared/demo-snapshot.json"), "utf8"));
      return NextResponse.json({ ...snapshot, mode: "snapshot", integrations: { ...snapshot.integrations, automation: "Recorded local keeper run — not live" } });
    }
    const config = deployment(); const data = await indexed();
    return NextResponse.json({ ...data, deployment: config, block: String(await publicClient().getBlockNumber()), mode: "local", integrations: { uma: "Real OOv3 + upstream DVM mock", identity: "Local mock", ens: "Blocked — namespace unavailable", multibaas: "Mock — credentials unavailable", intercepta: "Mock — endpoint/key unavailable", oneinch: "Mock — API key unavailable", automation: "Local keeper running" } });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Run pnpm demo to start the local chain and indexer." }, { status: 503 }); }
}
