import { readFileSync } from "node:fs";
import path from "node:path";

export function GET() {
  const root = path.resolve(process.cwd(), process.cwd().endsWith("web") ? ".." : ".");
  return new Response(new Uint8Array(readFileSync(path.join(root, "RepoAssets/Logo.png"))), {
    headers: { "Content-Type": "image/png", "Cache-Control": "public, max-age=86400" },
  });
}
