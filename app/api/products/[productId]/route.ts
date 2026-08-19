import { productStore } from "@/lib/server/product/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  if (productId !== productStore.productPackage.product.id) {
    return Response.json({ error: "Product not found" }, { status: 404 });
  }
  const { product, packageVersion, evidence, entities, procedures, troubleshootingPaths } = productStore.productPackage;
  return Response.json({
    product,
    packageVersion,
    evidence,
    entities,
    procedures,
    troubleshootingPaths,
  }, { headers: { "Cache-Control": "public, max-age=300, immutable" } });
}
