import { z } from "zod";

export const normalizedBoundsSchema = z.object({
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  width: z.number().positive().max(1),
  height: z.number().positive().max(1),
}).refine(({ x, width }) => x + width <= 1.000001, "Evidence bounds exceed page width")
  .refine(({ y, height }) => y + height <= 1.000001, "Evidence bounds exceed page height");

export const sourceAuthoritySchema = z.enum([
  "source-exact",
  "verified-reconstruction",
  "explanatory",
]);

export const sourceDocumentSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  path: z.string().min(1),
  mediaType: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  pageCount: z.number().int().positive().optional(),
  authority: sourceAuthoritySchema,
});

export const evidenceRegionSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  parserPageIndex: z.number().int().nonnegative().optional(),
  pageLabel: z.string().min(1).optional(),
  title: z.string().min(1),
  excerpt: z.string().min(1).optional(),
  bounds: normalizedBoundsSchema.optional(),
  publicAsset: z.string().startsWith("/"),
  assetSha256: z.string().regex(/^[a-f0-9]{64}$/),
  authority: sourceAuthoritySchema,
  supports: z.array(z.string().min(1)).min(1),
});

export const sceneBindingSchema = z.object({
  id: z.string().min(1),
  entityId: z.string().min(1),
  meshNames: z.array(z.string().min(1)).min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
  authority: sourceAuthoritySchema,
});

export const entitySchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  category: z.enum(["control", "connection", "component", "consumable", "process"]),
  description: z.string().min(1),
  aliases: z.array(z.string().min(1)).default([]),
  evidenceIds: z.array(z.string().min(1)).min(1),
  sceneBindingId: z.string().min(1).optional(),
});

export const factValueSchema = z.union([
  z.string(),
  z.number(),
  z.boolean(),
  z.object({ value: z.number(), unit: z.string().min(1) }),
]);

export const factSchema = z.object({
  id: z.string().min(1),
  statement: z.string().min(1),
  value: factValueSchema.optional(),
  entityIds: z.array(z.string().min(1)).default([]),
  conditions: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).default({}),
  status: z.literal("verified"),
  evidenceIds: z.array(z.string().min(1)).min(1),
  tags: z.array(z.string().min(1)).default([]),
});

export const sceneCommandSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("focus-part"), entityId: z.string(), cameraId: z.string().optional() }),
  z.object({ type: z.literal("highlight-part"), entityId: z.string(), emphasis: z.enum(["normal", "warning"]).optional() }),
  z.object({ type: z.literal("set-part-visible"), entityId: z.string(), visible: z.boolean() }),
  z.object({ type: z.literal("open-panel"), entityId: z.string() }),
  z.object({ type: z.literal("animate-connection"), fromEntityId: z.string(), toEntityId: z.string() }),
  z.object({ type: z.literal("set-control"), entityId: z.string(), value: z.union([z.string(), z.number(), z.boolean()]) }),
  z.object({ type: z.literal("reset-scene") }),
]);

export const twinPatchSchema = z.object({
  process: z.enum(["mig", "flux-core", "tig", "stick"]).nullable().optional(),
  inputVoltage: z.union([z.literal(120), z.literal(240)]).nullable().optional(),
  material: z.string().nullable().optional(),
  wireOrElectrode: z.string().nullable().optional(),
  shieldingGas: z.string().nullable().optional(),
  torchConnection: z.enum(["positive", "negative"]).nullable().optional(),
  groundConnection: z.enum(["positive", "negative"]).nullable().optional(),
  selectedEntityId: z.string().nullable().optional(),
});

export const procedureStepSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  instruction: z.string().min(1),
  warning: z.string().min(1).optional(),
  evidenceIds: z.array(z.string().min(1)).min(1),
  sceneCommands: z.array(sceneCommandSchema).default([]),
  proposedTwinPatch: twinPatchSchema.optional(),
  requiresConfirmation: z.boolean().default(true),
});

export const procedureSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  summary: z.string().min(1),
  process: z.enum(["mig", "flux-core", "tig", "stick"]),
  prerequisites: z.array(z.string().min(1)).default([]),
  steps: z.array(procedureStepSchema).min(1),
  evidenceIds: z.array(z.string().min(1)).min(1),
});

export const troubleshootingNodeSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(["question", "check", "resolution"]),
  text: z.string().min(1),
  evidenceIds: z.array(z.string().min(1)).default([]),
  next: z.record(z.string(), z.string()).default({}),
});

export const troubleshootingPathSchema = z.object({
  id: z.string().min(1),
  symptom: z.string().min(1),
  summary: z.string().min(1),
  startNodeId: z.string().min(1),
  nodes: z.array(troubleshootingNodeSchema).min(1),
});

export const acceptanceCaseSchema = z.object({
  id: z.string().min(1),
  journey: z.string().min(1),
  prompt: z.string().min(1),
  expectedEvidenceIds: z.array(z.string().min(1)).default([]),
  expectedFactIds: z.array(z.string().min(1)).default([]),
  expectedProcedureId: z.string().min(1).optional(),
  expectedClarificationFields: z.array(z.string().min(1)).default([]),
  requiredPhrases: z.array(z.string().min(1)).default([]),
});

export const productPackageSchema = z.object({
  schemaVersion: z.literal(1),
  packageVersion: z.string().min(1),
  generatedAt: z.string().datetime(),
  compiler: z.object({
    name: z.literal("omnipro-product-compiler"),
    version: z.string().min(1),
  }),
  product: z.object({
    id: z.literal("vulcan-omnipro-220"),
    name: z.literal("Vulcan OmniPro 220"),
    description: z.string().min(1),
  }),
  sources: z.array(sourceDocumentSchema).min(1),
  evidence: z.array(evidenceRegionSchema).min(1),
  entities: z.array(entitySchema).min(1),
  facts: z.array(factSchema).min(1),
  procedures: z.array(procedureSchema).min(1),
  troubleshootingPaths: z.array(troubleshootingPathSchema).min(1),
  sceneBindings: z.array(sceneBindingSchema).min(1),
  acceptanceCases: z.array(acceptanceCaseSchema).min(1),
});

export type AcceptanceCase = z.infer<typeof acceptanceCaseSchema>;
export type Entity = z.infer<typeof entitySchema>;
export type EvidenceRegion = z.infer<typeof evidenceRegionSchema>;
export type Fact = z.infer<typeof factSchema>;
export type Procedure = z.infer<typeof procedureSchema>;
export type ProductPackage = z.infer<typeof productPackageSchema>;
export type SceneCommand = z.infer<typeof sceneCommandSchema>;
export type TwinPatch = z.infer<typeof twinPatchSchema>;
