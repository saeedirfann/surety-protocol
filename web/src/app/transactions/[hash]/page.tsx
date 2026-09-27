import Link from "next/link";
import { previewData, publicClient, publicDeployment } from "@/lib/server";
export const dynamic = "force-dynamic";
export default async function TransactionPage({ params }: { params: Promise<{ hash: string }> }) {
  const { hash } = await params;
  if (!/^0x[0-9a-f]{64}$/i.test(hash)) return <main className="content"><h1>Invalid transaction hash</h1><Link href="/">Back to workspace</Link></main>;
  const configured = publicDeployment();
  if (process.env.DEMO_SNAPSHOT_MODE === "true" || (process.env.VERCEL === "1" && !configured)) {
    const record = previewData().claims.items.find(claim => claim.txHash.toLowerCase() === hash.toLowerCase());
    return <main className="content"><Link href="/">← Surety workspace</Link><h1>Recorded transaction</h1><p>This is captured local claim metadata, not a live Sepolia receipt.</p>{record ? <pre className="receipt">{JSON.stringify(record, null, 2)}</pre> : <p>No recorded claim uses this transaction hash.</p>}</main>;
  }
  const receipt = await publicClient().getTransactionReceipt({ hash: hash as `0x${string}` }).catch(() => undefined);
  if (!receipt) return <main className="content"><h1>Transaction unavailable</h1><p>The local chain may have reset.</p><Link href="/">Return to workspace</Link></main>;
  return <main className="content"><Link href="/">← Surety workspace</Link><h1>{configured ? "Sepolia transaction" : "Local transaction"}</h1><p>{configured ? "Actual public-chain receipt." : "Actual Anvil receipt. This is not a public block explorer."}</p>{configured && <a href={`https://sepolia.etherscan.io/tx/${hash}`} target="_blank" rel="noopener noreferrer">View on Etherscan</a>}<pre className="receipt">{JSON.stringify(receipt, (_, value) => typeof value === "bigint" ? value.toString() : value, 2)}</pre></main>;
}
