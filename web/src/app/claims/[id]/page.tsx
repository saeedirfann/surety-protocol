import { Dashboard } from "@/components/dashboard";
export default async function ClaimPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Dashboard claimId={id}/>; }
