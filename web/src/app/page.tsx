import { Dashboard } from "@/components/dashboard";
export default async function Home({ searchParams }: { searchParams: Promise<{ tab?: string }> }) { const { tab } = await searchParams; return <Dashboard initialTab={tab}/>; }
