import { beforeEach, describe, expect, it, vi } from "vitest";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";

let sessionStore: typeof import("@/lib/server/agent/session-store");

describe("in-memory agent sessions", () => {
  beforeEach(async () => {
    vi.resetModules();
    sessionStore = await import("@/lib/server/agent/session-store");
  });

  it("keeps state changes isolated to their owning session", () => {
    const first = sessionStore.createSession();
    const second = sessionStore.createSession();
    const firstState = createInitialTwinState();
    firstState.revision = 1;
    firstState.process = { value: "tig", source: "user-confirmed" };

    sessionStore.updateSession(first.id, { twinState: firstState, sdkSessionId: "sdk-first" });

    expect(sessionStore.getOrCreateSession(first.id)).toMatchObject({
      id: first.id,
      sdkSessionId: "sdk-first",
      twinState: {
        revision: 1,
        process: { value: "tig", source: "user-confirmed" },
      },
    });
    expect(sessionStore.getOrCreateSession(second.id)).toMatchObject({
      id: second.id,
      twinState: {
        revision: 0,
        process: { value: null, source: null },
      },
    });
  });

  it("returns snapshots that cannot mutate stored state", () => {
    const created = sessionStore.createSession();
    created.twinState.revision = 99;
    created.twinState.completedStepIds.push("external-mutation");

    const firstRead = sessionStore.getOrCreateSession(created.id);
    expect(firstRead.twinState).toMatchObject({ revision: 0, completedStepIds: [] });

    firstRead.twinState.revision = 42;
    expect(sessionStore.getOrCreateSession(created.id).twinState.revision).toBe(0);
  });

  it("does not adopt an unknown caller-provided session id", () => {
    const created = sessionStore.getOrCreateSession("attacker-selected-id");

    expect(created.id).not.toBe("attacker-selected-id");
    expect(sessionStore.sessionCount()).toBe(1);
  });
});
