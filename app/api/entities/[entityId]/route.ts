import { productStore } from "@/lib/server/product/store";

export const runtime = "nodejs";

export async function GET(_request: Request, context: { params: Promise<{ entityId: string }> }) {
  const { entityId } = await context.params;
  const entity = productStore.getEntity(entityId);
  if (!entity) return Response.json({ error: "Entity not found" }, { status: 404 });
  const facts = productStore.productPackage.facts.filter((fact) => fact.entityIds.includes(entityId));
  const referencesEntity = (command: (typeof productStore.productPackage.procedures)[number]["steps"][number]["sceneCommands"][number]) =>
    command.type === "animate-connection"
      ? command.fromEntityId === entityId || command.toEntityId === entityId
      : "entityId" in command && command.entityId === entityId;
  const relatedProcedures = productStore.productPackage.procedures
    .filter((procedure) => procedure.steps.some((step) => step.sceneCommands.some(referencesEntity)))
    .map(({ id, title, summary, process, evidenceIds }) => ({ id, title, summary, process, evidenceIds }));
  const warnings = [...new Set(productStore.productPackage.procedures.flatMap((procedure) =>
    procedure.steps.flatMap((step) => step.warning && step.sceneCommands.some(referencesEntity) ? [step.warning] : []),
  ))];
  return Response.json({
    entity,
    facts,
    evidence: productStore.getEvidenceMany(entity.evidenceIds),
    relatedProcedures,
    warnings,
  }, {
    headers: { "Cache-Control": "public, max-age=300, immutable" },
  });
}
