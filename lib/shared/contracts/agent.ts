import { z } from "zod";
import { sceneCommandSchema } from "./product";
import { twinStateSchema } from "./twin-state";

export const agentRequestSchema = z.object({
  sessionId: z.string().min(1).max(128).optional(),
  message: z.string().trim().min(1).max(4_000),
  selectedEntityId: z.string().min(1).nullable().optional(),
  twinState: twinStateSchema,
});

export const agentEventTypeSchema = z.enum([
  "turn-start",
  "text-delta",
  "clarification-request",
  "tool-start",
  "tool-result",
  "citation",
  "scene-command",
  "artifact-request",
  "procedure-progress",
  "warning",
  "complete",
  "error",
]);

export const citationPayloadSchema = z.object({
  evidenceId: z.string(),
  label: z.string(),
});

export const artifactRequestSchema = z.object({
  artifactType: z.enum(["duty-cycle", "polarity", "troubleshooting", "source-comparison"]),
  props: z.record(z.string(), z.unknown()),
});

export const agentEventSchema = z.object({
  schemaVersion: z.literal(1),
  sessionId: z.string().min(1),
  turnId: z.string().min(1),
  sequence: z.number().int().positive(),
  type: agentEventTypeSchema,
  timestamp: z.string().datetime(),
  payload: z.unknown(),
}).superRefine((event, context) => {
  const payloadSchemas: Partial<Record<z.infer<typeof agentEventTypeSchema>, z.ZodType>> = {
    "turn-start": z.object({ mode: z.enum(["live", "deterministic"]), concurrency: z.number().int().positive() }),
    "text-delta": z.object({ text: z.string() }),
    "clarification-request": z.object({ question: z.string(), fields: z.array(z.string()) }),
    "tool-start": z.object({ toolName: z.string().min(1), toolUseId: z.string().min(1) }),
    "tool-result": z.object({ toolName: z.string().min(1), toolUseId: z.string().min(1), result: z.unknown() }),
    citation: citationPayloadSchema,
    "scene-command": z.object({ commands: z.array(sceneCommandSchema) }),
    "artifact-request": artifactRequestSchema,
    "procedure-progress": z.object({ procedureId: z.string().min(1), stepIndex: z.number().int().nonnegative() }),
    warning: z.object({ message: z.string() }),
    complete: z.object({ stopReason: z.string().optional(), costUsd: z.number().nonnegative().optional() }),
    error: z.object({ message: z.string(), code: z.string() }),
  };
  const schema = payloadSchemas[event.type];
  if (!schema) return;
  const result = schema.safeParse(event.payload);
  if (!result.success) {
    context.addIssue({ code: "custom", message: `Invalid payload for ${event.type}` });
  }
});

export type AgentEvent = z.infer<typeof agentEventSchema>;
export type AgentRequest = z.infer<typeof agentRequestSchema>;
export type AgentEventType = z.infer<typeof agentEventTypeSchema>;
