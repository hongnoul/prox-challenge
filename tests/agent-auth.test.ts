import { mkdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { getAgentRuntimeStatus } from "@/lib/server/agent/auth";

const testConfigDirectory = join(tmpdir(), `omnipro-agent-auth-${process.pid}`);

afterEach(() => {
  vi.unstubAllEnvs();
  rmSync(testConfigDirectory, { force: true, recursive: true });
});

describe("Agent SDK authentication selection", () => {
  it("uses a stored Claude subscription credential", () => {
    mkdirSync(testConfigDirectory, { recursive: true });
    writeFileSync(join(testConfigDirectory, ".credentials.json"), "{\"oauth\":true}", { mode: 0o600 });
    vi.stubEnv("CLAUDE_CONFIG_DIR", testConfigDirectory);
    vi.stubEnv("OMNIPRO_AGENT_MODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "");

    expect(getAgentRuntimeStatus()).toEqual({
      mode: "live",
      credentialSource: "stored-credential",
    });
  });

  it("honors an explicit deterministic override even when credentials exist", () => {
    vi.stubEnv("OMNIPRO_AGENT_MODE", "deterministic");
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "subscription-token");

    expect(getAgentRuntimeStatus()).toEqual({
      mode: "deterministic",
      credentialSource: "none",
    });
  });

  it("recognizes a long-lived Claude subscription OAuth token", () => {
    vi.stubEnv("CLAUDE_CONFIG_DIR", testConfigDirectory);
    vi.stubEnv("OMNIPRO_AGENT_MODE", "");
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "subscription-token");

    expect(getAgentRuntimeStatus()).toEqual({
      mode: "live",
      credentialSource: "oauth-token",
    });
  });

  it("keeps deterministic fallback when no supported credential exists", () => {
    vi.stubEnv("CLAUDE_CONFIG_DIR", testConfigDirectory);
    vi.stubEnv("OMNIPRO_AGENT_MODE", "");
    vi.stubEnv("ANTHROPIC_API_KEY", "");
    vi.stubEnv("ANTHROPIC_AUTH_TOKEN", "");
    vi.stubEnv("CLAUDE_CODE_OAUTH_TOKEN", "");
    vi.stubEnv("CLAUDE_CODE_USE_BEDROCK", "");
    vi.stubEnv("CLAUDE_CODE_USE_VERTEX", "");
    vi.stubEnv("CLAUDE_CODE_USE_FOUNDRY", "");
    vi.stubEnv("ANTHROPIC_PROFILE", "");

    expect(getAgentRuntimeStatus()).toEqual({
      mode: "deterministic",
      credentialSource: "none",
    });
  });
});
