import Link from "next/link";
import { publicClient } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) return <main className="content"><h1>Invalid transaction hash</h1><Link href="/">Back to workspace</Link></main>;
  const receipt = await publicClient().getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => undefined);
  if (!receipt) return <main className="content"><h1>Transaction unavailable</h1><p>The local chain may have reset.</p><Link href="/">Return to workspace</Link></main>;
  return <main className="content"><Link href="/">← Surety workspace</Link><h1>Local transaction</h1><p>Actual Anvil receipt. This is not a public block explorer.</p><pre className="receipt">{JSON.stringify(receipt, (_, value) => typeof value === "bigint" ? value.toString() : value, 2)}</pre></main>;
}
