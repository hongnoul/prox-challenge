import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentEventSchema, type AgentEvent } from "@/lib/shared/contracts";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";

vi.mock("@/lib/server/agent/deterministic-agent", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/server/agent/deterministic-agent")>();
  return {
    ...actual,
    answerDeterministically: vi.fn(actual.answerDeterministically),
  };
});

import { answerDeterministically } from "@/lib/server/agent/deterministic-agent";
import { createAgentEventStream } from "@/lib/server/agent/stream-turn";

async function collectEvents(stream: ReadableStream<Uint8Array>): Promise<AgentEvent[]> {
  const payload = await new Response(stream).text();
  return payload
    .split("\n\n")
    .filter(Boolean)
    .map((frame) => {
      expect(frame.startsWith("data: ")).toBe(true);
      return agentEventSchema.parse(JSON.parse(frame.slice("data: ".length)));
    });
}

function expectOrderedSingleTerminal(events: AgentEvent[], terminalType: "complete" | "error") {
  expect(events.map(({ sequence }) => sequence)).toEqual(
    Array.from({ length: events.length }, (_, index) => index + 1),
  );
  expect(new Set(events.map(({ sessionId }) => sessionId))).toHaveLength(1);
  expect(new Set(events.map(({ turnId }) => turnId))).toHaveLength(1);

  const terminalEvents = events.filter(({ type }) => type === "complete" || type === "error");
  expect(terminalEvents).toHaveLength(1);
  expect(terminalEvents[0].type).toBe(terminalType);
  expect(events.at(-1)?.type).toBe(terminalType);
}

describe("deterministic AgentEvent streams", () => {
  beforeEach(() => {
    vi.stubEnv("OMNIPRO_AGENT_MODE", "deterministic");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.mocked(answerDeterministically).mockClear();
  });

  it("emits schema-valid, contiguous events followed by one completion", async () => {
    const requestSignal = new AbortController().signal;
    const { sessionId, stream } = createAgentEventStream({
      message: "What is the duty cycle at 240 V and 200 A?",
      twinState: createInitialTwinState(),
    }, requestSignal);

    const events = await collectEvents(stream);

    expect(events[0]).toMatchObject({
      sessionId,
      sequence: 1,
      type: "turn-start",
      payload: { mode: "deterministic" },
    });
    expect(events.map(({ type }) => type)).toEqual(expect.arrayContaining([
      "text-delta",
      "citation",
      "artifact-request",
      "complete",
    ]));
    expectOrderedSingleTerminal(events, "complete");
  });

  it("turns deterministic engine failures into one final error event", async () => {
    vi.mocked(answerDeterministically).mockImplementationOnce(() => {
      throw new Error("deterministic engine failed");
    });

    const { stream } = createAgentEventStream({
      message: "trigger a deterministic failure",
      twinState: createInitialTwinState(),
    }, new AbortController().signal);
    const events = await collectEvents(stream);

    expect(events.at(-1)).toMatchObject({
      type: "error",
      payload: { code: "internal_error", message: "deterministic engine failed" },
    });
    expectOrderedSingleTerminal(events, "error");
  });
});
