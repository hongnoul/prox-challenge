import { afterEach, describe, expect, it, vi } from "vitest";
import { streamAgentTurn } from "@/lib/client/agent-stream";
import { createInitialTwinState, type AgentEvent, type AgentEventType } from "@/lib/shared/contracts";

const request = {
  message: "test",
  twinState: createInitialTwinState(),
};

function event(sequence: number, type: AgentEventType, overrides: Partial<AgentEvent> = {}): AgentEvent {
  return {
    schemaVersion: 1,
    sessionId: "session-1",
    turnId: "turn-1",
    sequence,
    type,
    timestamp: "2026-08-19T00:00:00.000Z",
    payload: type === "complete" ? { stopReason: "test" } : { text: "hello" },
    ...overrides,
  };
}

const frames = (...events: AgentEvent[]) => events
  .map((value) => `data: ${JSON.stringify(value)}\n\n`)
  .join("");

function mockResponse(body: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "X-OmniPro-Session": "session-1",
    },
  })));
}

afterEach(() => vi.unstubAllGlobals());

describe("agent SSE client invariants", () => {
  it("accepts one ordered turn and ignores duplicate sequences", async () => {
    mockResponse(frames(
      event(1, "text-delta"),
      event(1, "text-delta"),
      event(2, "complete"),
    ));
    const received: AgentEvent[] = [];

    const result = await streamAgentTurn({ request, onEvent: (value) => received.push(value) });

    expect(received.map(({ sequence }) => sequence)).toEqual([1, 2]);
    expect(result.sessionId).toBe("session-1");
  });

  it("rejects sequence gaps", async () => {
    mockResponse(frames(event(2, "complete")));

    await expect(streamAgentTurn({ request, onEvent: () => undefined }))
      .rejects.toMatchObject({ code: "sequence_gap" });
  });

  it("rejects mixed turns", async () => {
    mockResponse(frames(
      event(1, "text-delta"),
      event(2, "complete", { turnId: "different-turn" }),
    ));

    await expect(streamAgentTurn({ request, onEvent: () => undefined }))
      .rejects.toMatchObject({ code: "mixed_turn" });
  });

  it("rejects streams without exactly one terminal event", async () => {
    mockResponse(frames(event(1, "text-delta")));

    await expect(streamAgentTurn({ request, onEvent: () => undefined }))
      .rejects.toMatchObject({ code: "missing_terminal" });
  });
});
