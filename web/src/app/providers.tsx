"use client";

import { useState } from "react";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { injectedWallet } from "@rainbow-me/rainbowkit/wallets";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createConfig, http, WagmiProvider } from "wagmi";
import { foundry, sepolia } from "wagmi/chains";

const browserWallet = injectedWallet();
const browserConnector = browserWallet.createConnector({ rkDetails: { ...browserWallet, index: 0, groupIndex: 0, groupName: "Browser wallets", isRainbowKitConnector: true } });
const config = createConfig({
  chains: [sepolia, foundry],
  connectors: [browserConnector],
  transports: { [sepolia.id]: http(process.env.NEXT_PUBLIC_RPC_URL), [foundry.id]: http("http://127.0.0.1:8545") },
  ssr: true,
});

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  return <WagmiProvider config={config}><QueryClientProvider client={queryClient}>
    <RainbowKitProvider>{children}</RainbowKitProvider>
  </QueryClientProvider></WagmiProvider>;
}
