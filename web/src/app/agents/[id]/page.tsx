import { Dashboard } from "@/components/dashboard";
export default async function AgentPage({ params }: { params: Promise<{ id: string }> }) { const { id } = await params; return <Dashboard agentId={id}/>; }
