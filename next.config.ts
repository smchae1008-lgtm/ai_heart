import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["pdf-parse"],
  experimental: { serverActions: { bodySizeLimit: "4.25mb" } },
};

export default config;
