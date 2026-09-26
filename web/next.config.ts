import type { NextConfig } from "next";
import path from "node:path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.resolve(__dirname, ".."),
  outputFileTracingIncludes: {
    "/api/brand": ["../RepoAssets/Logo.png"],
    "/api/protocol": ["../shared/demo-snapshot.json", "../shared/deployment.json"],
  },
  experimental: {
    cpus: 1,
    webpackMemoryOptimizations: true,
  },
};

export default nextConfig;
