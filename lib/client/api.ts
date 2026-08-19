import {
  entitySchema,
  evidenceRegionSchema,
  factSchema,
  sourceDocumentSchema,
  twinStateSchema,
  type TwinState,
} from "@/lib/shared/contracts";
import { z } from "zod";

const sessionResponseSchema = z.object({
  sessionId: z.string().min(1),
  twinState: twinStateSchema,
  expiresAfterIdleMinutes: z.number().positive(),
  restartBehavior: z.string(),
});

const evidenceResponseSchema = z.object({
  evidence: evidenceRegionSchema,
  source: sourceDocumentSchema.nullish(),
});

const entityResponseSchema = z.object({
  entity: entitySchema,
  facts: z.array(factSchema),
  evidence: z.array(evidenceRegionSchema),
});

const productSummarySchema = z.object({
  product: z.object({
    id: z.string(),
    name: z.string(),
    description: z.string(),
  }),
  packageVersion: z.string(),
  evidence: z.array(evidenceRegionSchema),
  entities: z.array(z.object({
    id: z.string(),
    name: z.string(),
    category: z.string(),
    description: z.string(),
    aliases: z.array(z.string()),
    evidenceIds: z.array(z.string()),
    sceneBindingId: z.string().optional(),
  })),
  procedures: z.array(z.object({
    id: z.string(),
    title: z.string(),
    summary: z.string(),
    process: z.string(),
    evidenceIds: z.array(z.string()),
    stepCount: z.number().int().positive(),
  })),
});

export type AppSession = z.infer<typeof sessionResponseSchema>;
export type EvidenceResponse = z.infer<typeof evidenceResponseSchema>;
export type EntityResponse = z.infer<typeof entityResponseSchema>;
export type ProductSummary = z.infer<typeof productSummarySchema>;

async function responseError(response: Response, fallback: string): Promise<Error> {
  try {
    const body = await response.json() as { error?: unknown };
    if (typeof body.error === "string") return new Error(body.error);
  } catch {
    // The response may intentionally have no JSON body.
  }
  return new Error(`${fallback} (${response.status})`);
}

export async function createAppSession(signal?: AbortSignal): Promise<AppSession> {
  const response = await fetch("/api/sessions", {
    method: "POST",
    cache: "no-store",
    signal,
  });
  if (!response.ok) throw await responseError(response, "Could not create a workspace session");
  return sessionResponseSchema.parse(await response.json());
}

export async function loadEvidence(evidenceId: string, signal?: AbortSignal): Promise<EvidenceResponse> {
  const response = await fetch(`/api/evidence/${encodeURIComponent(evidenceId)}`, {
    cache: "force-cache",
    signal,
  });
  if (!response.ok) throw await responseError(response, "Could not load source evidence");
  return evidenceResponseSchema.parse(await response.json());
}

export async function loadEntity(entityId: string, signal?: AbortSignal): Promise<EntityResponse> {
  const response = await fetch(`/api/entities/${encodeURIComponent(entityId)}`, {
    cache: "force-cache",
    signal,
  });
  if (!response.ok) throw await responseError(response, "Could not load the selected part");
  return entityResponseSchema.parse(await response.json());
}

export async function loadProductSummary(signal?: AbortSignal): Promise<ProductSummary> {
  const response = await fetch("/api/products/vulcan-omnipro-220", {
    cache: "force-cache",
    signal,
  });
  if (!response.ok) throw await responseError(response, "Could not load product context");
  return productSummarySchema.parse(await response.json());
}

export function mergeSelectedEntity(state: TwinState, selectedEntityId: string | null): TwinState {
  if (state.selectedEntityId === selectedEntityId) return state;
  return {
    ...state,
    revision: state.revision + 1,
    selectedEntityId,
  };
}
