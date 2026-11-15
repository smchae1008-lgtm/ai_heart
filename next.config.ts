import type { NextConfig } from "next";

const config: NextConfig = {
  serverExternalPackages: ["pdf-parse", "@napi-rs/canvas"],
  outputFileTracingIncludes: { "/account": ["./node_modules/@napi-rs/canvas*/**/*", "./node_modules/pdfjs-dist/legacy/build/pdf.worker.mjs"] },
  experimental: { serverActions: { bodySizeLimit: "4.25mb" } },
};

export default config;
