"use client";

import { useState } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { injected } from "wagmi/connectors";
import { foundry } from "wagmi/chains";

const config = createConfig({
  chains: [foundry],
  connectors: [injected()],
  transports: { [foundry.id]: http(process.env.NEXT_PUBLIC_RPC_URL ?? "http://127.0.0.1:8545") },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}>
    <RainbowKitProvider>{children}</RainbowKitProvider>
  </QueryClientProvider></WagmiProvider>;
}
