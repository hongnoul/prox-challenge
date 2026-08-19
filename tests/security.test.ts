import { describe, expect, it } from "vitest";
import { POST as postAgent } from "@/app/api/agent/route";
import { GET as getHealth } from "@/app/api/health/route";
import { validateSceneCommands } from "@/lib/server/agent/tools";
import { createInitialTwinState } from "@/lib/shared/contracts";

const validBody = JSON.stringify({
  message: "Show the negative socket",
  twinState: createInitialTwinState(),
});

describe("agent transport boundary", () => {
  it("rejects cross-origin browser requests", async () => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        Host: "localhost",
        Origin: "https://malicious.example",
      },
    }));

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: "Cross-origin agent requests are not allowed",
    });
  });

  it("rejects a declared oversized request before parsing", async () => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: validBody,
      headers: {
        "Content-Type": "application/json",
        "Content-Length": "20000",
      },
    }));

    expect(response.status).toBe(413);
  });

  it("reports package and agent readiness without exposing secrets", async () => {
    const response = getHealth();
    const payload = await response.json() as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      status: "ok",
      productId: "vulcan-omnipro-220",
      packageVersion: "1.0.0",
    });
    expect(JSON.stringify(payload)).not.toContain("ANTHROPIC_API_KEY");
  });
});

describe("scene command trust boundary", () => {
  it("accepts commands targeting verified scene bindings", () => {
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "front-negative-socket" },
      {
        type: "animate-connection",
        fromEntityId: "tig-torch",
        toEntityId: "front-negative-socket",
      },
    ])).not.toBeNull();
  });

  it("rejects unknown or non-rendered scene targets", () => {
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "invented-component" },
    ])).toBeNull();
    expect(validateSceneCommands([
      { type: "focus-part", entityId: "argon-cylinder" },
    ])).toBeNull();
  });
});
