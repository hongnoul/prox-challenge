import { productStore } from "@/lib/server/product/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export function GET() {
  const agentMode = process.env.ANTHROPIC_API_KEY
    && process.env.OMNIPRO_AGENT_MODE !== "deterministic"
    ? "live"
    : "deterministic";

  return Response.json({
    status: "ok",
    productId: productStore.productPackage.product.id,
    packageVersion: productStore.productPackage.packageVersion,
    evidenceRecords: productStore.productPackage.evidence.length,
    sceneBindings: productStore.productPackage.sceneBindings.length,
    agentMode,
    apiKeyConfigured: Boolean(process.env.ANTHROPIC_API_KEY),
  }, {
    headers: { "Cache-Control": "no-store" },
  });
}
