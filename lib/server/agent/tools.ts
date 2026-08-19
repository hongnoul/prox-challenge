import { createSdkMcpServer, tool } from "@anthropic-ai/claude-agent-sdk";
import { z } from "zod";
import type { TwinState } from "@/lib/shared/contracts/twin-state";
import { sceneCommandSchema, twinPatchSchema } from "@/lib/shared/contracts/product";
import { validateConfiguration } from "@/lib/shared/domain";
import { productStore } from "@/lib/server/product/store";

const asText = (value: unknown) => ({
  content: [{ type: "text" as const, text: JSON.stringify(value) }],
});

const sceneEntityIds = new Set(productStore.productPackage.entities.map(({ id }) => id));
const sceneBoundEntityIds = new Set(productStore.productPackage.sceneBindings.map(({ entityId }) => entityId));

export function validateSceneCommands(commands: unknown) {
  const parsed = z.array(sceneCommandSchema).min(1).max(12).safeParse(commands);
  if (!parsed.success) return null;
  const allowed = parsed.data.every((command) => {
    if (command.type === "reset-scene") return true;
    if (command.type === "animate-connection") {
      return sceneEntityIds.has(command.fromEntityId) && sceneBoundEntityIds.has(command.toEntityId);
    }
    return sceneBoundEntityIds.has(command.entityId);
  });
  return allowed ? parsed.data : null;
}

export const productToolNames = [
  "mcp__omnipro__search_knowledge",
  "mcp__omnipro__get_entity",
  "mcp__omnipro__get_fact",
  "mcp__omnipro__get_procedure",
  "mcp__omnipro__get_troubleshooting_path",
  "mcp__omnipro__get_source_region",
  "mcp__omnipro__inspect_twin_state",
  "mcp__omnipro__validate_twin_patch",
  "mcp__omnipro__request_clarification",
  "mcp__omnipro__emit_scene_commands",
  "mcp__omnipro__open_artifact",
] as const;

export function createProductTools(twinState: TwinState) {
  return createSdkMcpServer({
    name: "omnipro",
    version: "1.0.0",
    instructions: "Read-only, source-grounded OmniPro 220 product tools. Treat returned source identifiers as authoritative citations.",
    alwaysLoad: true,
    tools: [
      tool("search_knowledge", "Search verified OmniPro entities, facts, procedures, and troubleshooting paths.", {
        query: z.string().min(1).max(500),
        limit: z.number().int().min(1).max(12).optional(),
      }, async ({ query, limit }) => asText(productStore.searchKnowledge(query, limit))),
      tool("get_entity", "Get one verified product entity and its evidence identifiers.", {
        entityId: z.string().min(1),
      }, async ({ entityId }) => asText(productStore.getEntity(entityId))),
      tool("get_fact", "Get one verified product fact and exact evidence identifiers.", {
        factId: z.string().min(1),
      }, async ({ factId }) => asText(productStore.getFact(factId))),
      tool("get_procedure", "Get a reviewed procedure with ordered steps, warnings, evidence, and scene commands.", {
        procedureId: z.string().min(1),
      }, async ({ procedureId }) => asText(productStore.getProcedure(procedureId))),
      tool("get_troubleshooting_path", "Get the reviewed troubleshooting graph for a symptom.", {
        symptom: z.string().min(1).max(200),
      }, async ({ symptom }) => asText(productStore.productPackage.troubleshootingPaths.find((path) =>
        path.symptom.toLowerCase().includes(symptom.toLowerCase())
        || symptom.toLowerCase().includes(path.symptom.toLowerCase()),
      ) ?? null)),
      tool("get_source_region", "Resolve an evidence identifier to its exact published source page or figure.", {
        evidenceId: z.string().min(1),
      }, async ({ evidenceId }) => asText(productStore.getEvidence(evidenceId))),
      tool("inspect_twin_state", "Inspect the current user-declared or simulated machine state.", {},
        async () => asText(productStore.inspectTwinContext(twinState))),
      tool("validate_twin_patch", "Check a proposed machine-state patch against verified process constraints. This never applies the patch.", {
        patch: twinPatchSchema,
      }, async ({ patch }) => {
        const candidate = structuredClone(twinState);
        for (const [key, value] of Object.entries(patch)) {
          if (key === "selectedEntityId") candidate.selectedEntityId = value as string | null;
          else if (key in candidate && typeof candidate[key as keyof TwinState] === "object") {
            (candidate as unknown as Record<string, unknown>)[key] = { value, source: "recommended" };
          }
        }
        return asText({ valid: validateConfiguration(candidate).length === 0, findings: validateConfiguration(candidate), proposedPatch: patch });
      }),
      tool("request_clarification", "Ask the user one focused question before making a context-sensitive recommendation.", {
        question: z.string().min(1).max(500),
        fields: z.array(z.enum([
          "process",
          "inputVoltage",
          "material",
          "wireOrElectrode",
          "shieldingGas",
          "torchConnection",
          "groundConnection",
        ])).min(1).max(7),
      }, async ({ question, fields }) => asText({ question, fields })),
      tool("emit_scene_commands", "Request allowlisted deterministic scene commands. The browser validates them again before execution.", {
        commands: z.array(sceneCommandSchema).min(1).max(12),
      }, async ({ commands }) => {
        const validated = validateSceneCommands(commands);
        return validated
          ? asText({ accepted: true, commands: validated })
          : { ...asText({ accepted: false, error: "Scene command references an unknown product entity" }), isError: true };
      }),
      tool("open_artifact", "Open an allowlisted deterministic artifact in the user interface.", {
        artifactType: z.enum(["duty-cycle", "polarity", "troubleshooting", "source-comparison"]),
        props: z.record(z.string(), z.unknown()),
      }, async ({ artifactType, props }) => asText({ artifactType, props })),
    ],
  });
}
