import { productStore } from "@/lib/server/product/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ evidenceId: string }> }) {
  const { evidenceId } = await context.params;
  const evidence = productStore.getEvidence(evidenceId);
  if (!evidence) return Response.json({ error: "Evidence not found" }, { status: 404 });
  const source = productStore.productPackage.sources.find(({ id }) => id === evidence.sourceId);
  return Response.json({ evidence, source }, {
    headers: { "Cache-Control": "public, max-age=300, immutable" },
  });
}
