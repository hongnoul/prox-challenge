import { describe, expect, it, vi } from "vitest";
import type { AgentEvent, AgentEventType, AgentRequest } from "@/lib/shared/contracts";
import { createInitialTwinState } from "@/lib/shared/contracts";

const sdk = vi.hoisted(() => ({
  query: vi.fn(),
  createSdkMcpServer: vi.fn((config: unknown) => config),
  tool: vi.fn((name: string, description: string, schema: unknown, handler: unknown) => ({
    name,
    description,
    schema,
    handler,
  })),
}));

vi.mock("@anthropic-ai/claude-agent-sdk", () => sdk);

import { runLiveAgentTurn } from "@/lib/server/agent/live-agent";

const request: AgentRequest = {
  message: "Show exact TIG connection evidence",
  twinState: createInitialTwinState(),
};

function event(type: AgentEventType, payload: unknown): AgentEvent {
  return {
    schemaVersion: 1,
    sessionId: "app-session",
    turnId: "turn-1",
    sequence: 1,
    type,
    timestamp: "2026-08-19T00:00:00.000Z",
    payload,
  };
}

describe("bounded Claude Agent SDK adapter", () => {
  it("streams text, citations, scene commands, and completion from an allowlisted turn", async () => {
    async function* messages() {
      yield { type: "system", subtype: "init", session_id: "sdk-session" };
      yield {
        type: "stream_event",
        session_id: "sdk-session",
        event: { type: "content_block_delta", delta: { type: "text_delta", text: "Torch negative." } },
      };
      yield {
        type: "assistant",
        session_id: "sdk-session",
        message: {
          content: [
            {
              type: "tool_use",
              id: "tool-1",
              name: "mcp__omnipro__get_source_region",
              input: { evidenceId: "ev-tig-connections-p24" },
            },
            {
              type: "tool_use",
              id: "tool-2",
              name: "mcp__omnipro__emit_scene_commands",
              input: { commands: [{ type: "focus-part", entityId: "front-negative-socket" }] },
            },
          ],
        },
      };
      yield {
        type: "result",
        subtype: "success",
        session_id: "sdk-session",
        stop_reason: "end_turn",
        total_cost_usd: 0.01,
      };
    }
    sdk.query.mockReturnValueOnce(messages());
    const written: AgentEvent[] = [];
    const sessions: string[] = [];

    await runLiveAgentTurn({
      request,
      appSessionId: "app-session",
      turnId: "turn-1",
      abortController: new AbortController(),
      write: (value) => written.push(value),
      nextEvent: event,
      onSdkSession: (sessionId) => sessions.push(sessionId),
    });

    expect(sessions).toContain("sdk-session");
    expect(written.map(({ type }) => type)).toEqual([
      "text-delta",
      "tool-start",
      "citation",
      "tool-start",
      "scene-command",
      "complete",
    ]);
    expect(written.find(({ type }) => type === "citation")?.payload).toEqual({
      evidenceId: "ev-tig-connections-p24",
      label: "ev-tig-connections-p24",
    });

    const options = sdk.query.mock.calls[0]?.[0]?.options;
    expect(options).toMatchObject({
      tools: [],
      settingSources: [],
      strictMcpConfig: true,
      permissionMode: "dontAsk",
      includePartialMessages: true,
      maxTurns: 6,
      maxBudgetUsd: 0.2,
    });
    expect(options.disallowedTools).toEqual(expect.arrayContaining(["Bash", "Read", "Write", "WebFetch"]));
    expect(options.allowedTools).toEqual(expect.arrayContaining([
      "mcp__omnipro__get_source_region",
      "mcp__omnipro__request_clarification",
      "mcp__omnipro__emit_scene_commands",
    ]));
  });

  it("drops scene commands that do not resolve to rendered product bindings", async () => {
    async function* messages() {
      yield {
        type: "assistant",
        session_id: "sdk-session",
        message: {
          content: [{
            type: "tool_use",
            id: "tool-unsafe",
            name: "mcp__omnipro__emit_scene_commands",
            input: { commands: [{ type: "focus-part", entityId: "invented-part" }] },
          }],
        },
      };
      yield { type: "result", subtype: "success", session_id: "sdk-session", stop_reason: "end_turn", total_cost_usd: 0 };
    }
    sdk.query.mockReturnValueOnce(messages());
    const written: AgentEvent[] = [];

    await runLiveAgentTurn({
      request,
      appSessionId: "app-session",
      turnId: "turn-1",
      abortController: new AbortController(),
      write: (value) => written.push(value),
      nextEvent: event,
      onSdkSession: () => undefined,
    });

    expect(written.some(({ type }) => type === "scene-command")).toBe(false);
    expect(written.some(({ type }) => type === "warning")).toBe(true);
  });
});
