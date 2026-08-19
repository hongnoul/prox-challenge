import { query, type SDKMessage } from "@anthropic-ai/claude-agent-sdk";
import type { AgentEvent, AgentEventType, AgentRequest } from "@/lib/shared/contracts";
import { agentEventSchema } from "@/lib/shared/contracts";
import { normalizeArtifactRequest } from "./artifacts";
import { createProductTools, productToolNames, validateSceneCommands } from "./tools";

const SYSTEM_PROMPT = `You are the OmniPro 220 Product Copilot for a capable owner working in a garage or small shop.

Use only the provided OmniPro product tools for factual claims. Never use shell, filesystem, web, or general system tools. Numerical, configuration, procedural, and safety-sensitive claims require exact evidence returned by the tools. Call request_clarification with one focused question when process, voltage, consumable, gas, or polarity context is necessary. Do not invent settings, interpolate ratings, or imply live telemetry. Distinguish source facts, verified reconstruction, and explanatory guidance.

Prefer concise next actions. Use get_source_region for every authoritative answer. Use emit_scene_commands only with verified entity identifiers. Use open_artifact when a calculator, polarity diagram, troubleshooting path, or source comparison is clearer than prose.`;

type EventWriter = (event: AgentEvent) => void;
const MAX_STREAMED_TEXT_CHARACTERS = 12_000;

function textDeltaFromMessage(message: SDKMessage) {
  if (message.type !== "stream_event" || message.event.type !== "content_block_delta") return null;
  const delta = message.event.delta;
  return delta.type === "text_delta" ? delta.text : null;
}

function toolUseFromMessage(message: SDKMessage) {
  if (message.type !== "assistant") return [];
  return message.message.content.filter((block) => block.type === "tool_use");
}

export async function runLiveAgentTurn(options: {
  request: AgentRequest;
  appSessionId: string;
  sdkSessionId?: string;
  turnId: string;
  abortController: AbortController;
  write: EventWriter;
  nextEvent: (type: AgentEventType, payload: unknown) => AgentEvent;
  onSdkSession: (sessionId: string) => void;
}) {
  const { request, sdkSessionId, abortController, write, nextEvent, onSdkSession } = options;
  const productTools = createProductTools(request.twinState);
  const allowedTools = [...productToolNames];
  let streamedTextCharacters = 0;
  let resultReceived = false;

  const stream = query({
    prompt: request.message,
    options: {
      abortController,
      ...(sdkSessionId ? { resume: sdkSessionId } : {}),
      allowedTools,
      tools: [],
      disallowedTools: ["Bash", "Read", "Write", "Edit", "WebFetch", "WebSearch", "Task", "Skill"],
      mcpServers: { omnipro: productTools },
      strictMcpConfig: true,
      settingSources: [],
      skills: [],
      plugins: [],
      permissionMode: "dontAsk",
      includePartialMessages: true,
      maxTurns: 6,
      maxBudgetUsd: 0.2,
      effort: "medium",
      systemPrompt: SYSTEM_PROMPT,
      env: {
        ...process.env,
        CLAUDE_AGENT_SDK_CLIENT_APP: "omnipro-product-twin/0.1.0",
      },
    },
  });

  for await (const message of stream) {
    if ("session_id" in message && message.session_id) onSdkSession(message.session_id);

    const text = textDeltaFromMessage(message);
    if (text) {
      streamedTextCharacters += text.length;
      if (streamedTextCharacters > MAX_STREAMED_TEXT_CHARACTERS) {
        const error = new Error("Agent output exceeded the 12,000-character turn limit");
        abortController.abort(error);
        throw error;
      }
      write(nextEvent("text-delta", { text }));
    }

    for (const block of toolUseFromMessage(message)) {
      write(nextEvent("tool-start", { toolName: block.name, toolUseId: block.id }));
      const input = block.input as Record<string, unknown>;
      if (block.name === "mcp__omnipro__get_source_region" && typeof input.evidenceId === "string") {
        write(nextEvent("citation", { evidenceId: input.evidenceId, label: input.evidenceId }));
      }
      if (block.name === "mcp__omnipro__request_clarification") {
        write(nextEvent("clarification-request", input));
      }
      if (block.name === "mcp__omnipro__emit_scene_commands") {
        const commands = validateSceneCommands(input.commands);
        if (commands) write(nextEvent("scene-command", { commands }));
        else write(nextEvent("warning", { message: "The agent requested an unknown product scene entity. The command was ignored." }));
      }
      if (block.name === "mcp__omnipro__open_artifact") {
        const artifact = normalizeArtifactRequest(input);
        if (artifact) write(nextEvent("artifact-request", artifact));
        else write(nextEvent("warning", { message: "The agent requested an incomplete artifact. The request was ignored." }));
      }
    }

    if (message.type === "result") {
      resultReceived = true;
      if (message.subtype === "success") {
        write(nextEvent("complete", { stopReason: message.stop_reason ?? "end_turn", costUsd: message.total_cost_usd }));
      } else {
        write(nextEvent("error", { code: message.subtype, message: message.errors.join(" ") || "Agent execution failed" }));
      }
    }
  }
  if (!resultReceived) throw new Error("Claude Agent SDK stream ended without a result message");
}

export function validateEvent(event: AgentEvent) {
  return agentEventSchema.parse(event);
}
