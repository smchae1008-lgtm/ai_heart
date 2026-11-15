import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: { "/account": ["./node_modules/@napi-rs/canvas*/**/*"] },
  experimental: { serverActions: { bodySizeLimit: "4.25mb" } },
};

export default config;
