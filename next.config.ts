import type { NextConfig } from "next";

function agentSdkNativePackage(): string {
  const architecture = process.arch === "arm64" ? "arm64" : "x64";

  if (process.platform === "linux") {
    const report = process.report?.getReport() as
      | { header?: { glibcVersionRuntime?: string } }
      | undefined;
    const libc = report?.header?.glibcVersionRuntime ? "" : "-musl";
    return `claude-agent-sdk-linux-${architecture}${libc}`;
  }

  if (process.platform === "darwin") {
    return `claude-agent-sdk-darwin-${architecture}`;
  }

  return `claude-agent-sdk-win32-${architecture}`;
}

const sdkNativePackage = agentSdkNativePackage();
const isVercelBuild = process.env.VERCEL === "1";

const nextConfig: NextConfig = {
  // Vercel packages Next.js functions itself. Forcing Next's standalone
  // server there removes files that Vercel's builder still needs.
  ...(!isVercelBuild && { output: "standalone" as const }),
  serverExternalPackages: ["@anthropic-ai/claude-agent-sdk"],
  outputFileTracingIncludes: {
    "/api/agent": [
      "./node_modules/@anthropic-ai/claude-agent-sdk/**/*",
      `./node_modules/@anthropic-ai/${sdkNativePackage}/**/*`,
      "./products/omnipro-220/product-dist/v1/**/*",
    ],
  },
};

export default nextConfig;
