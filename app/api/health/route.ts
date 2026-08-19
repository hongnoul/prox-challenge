import { productStore } from "@/lib/server/product/store";
import { getAgentRuntimeStatus } from "@/lib/server/agent/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const runtimeStatus = getAgentRuntimeStatus();

  return Response.json({
    status: "ok",
    productId: productStore.productPackage.product.id,
    packageVersion: productStore.productPackage.packageVersion,
    evidenceRecords: productStore.productPackage.evidence.length,
    sceneBindings: productStore.productPackage.sceneBindings.length,
    agentMode: runtimeStatus.mode,
    agentCredentialSource: runtimeStatus.credentialSource,
    credentialConfigured: runtimeStatus.credentialSource !== "none" && runtimeStatus.credentialSource !== "forced-live",
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
