import type { Metadata } from "next";
import { Providers } from "./providers";
import "@rainbow-me/rainbowkit/styles.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "Surety | Agent accountability",
  description: "An on-chain accountability and recourse protocol for autonomous agents.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body><Providers>{children}</Providers></body></html>;
}
