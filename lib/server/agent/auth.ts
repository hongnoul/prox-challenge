import { existsSync, statSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

export type AgentCredentialSource =
  | "api-key"
  | "oauth-token"
  | "stored-credential"
  | "anthropic-profile"
  | "bedrock"
  | "vertex"
  | "foundry"
  | "forced-live"
  | "none";

export type AgentRuntimeStatus = {
  mode: "live" | "deterministic";
  credentialSource: AgentCredentialSource;
};

function hasValue(name: string) {
  return Boolean(process.env[name]?.trim());
}

function hasStoredClaudeCredential() {
  const configDirectory = process.env.CLAUDE_CONFIG_DIR?.trim() || join(homedir(), ".claude");
  const credentialsPath = join(configDirectory, ".credentials.json");

  try {
    return existsSync(credentialsPath) && statSync(credentialsPath).size > 0;
  } catch {
    return false;
  }
}

function detectedCredentialSource(): AgentCredentialSource {
  if (hasValue("ANTHROPIC_API_KEY")) return "api-key";
  if (hasValue("ANTHROPIC_AUTH_TOKEN") || hasValue("CLAUDE_CODE_OAUTH_TOKEN")) return "oauth-token";
  if (hasValue("CLAUDE_CODE_USE_BEDROCK")) return "bedrock";
  if (hasValue("CLAUDE_CODE_USE_VERTEX")) return "vertex";
  if (hasValue("CLAUDE_CODE_USE_FOUNDRY")) return "foundry";
  if (hasValue("ANTHROPIC_PROFILE")) return "anthropic-profile";
  if (hasStoredClaudeCredential()) return "stored-credential";
  return "none";
}

export function getAgentRuntimeStatus(): AgentRuntimeStatus {
  if (process.env.OMNIPRO_AGENT_MODE === "deterministic") {
    return { mode: "deterministic", credentialSource: "none" };
  }

  const credentialSource = detectedCredentialSource();
  if (credentialSource !== "none") return { mode: "live", credentialSource };
  if (process.env.OMNIPRO_AGENT_MODE === "live") return { mode: "live", credentialSource: "forced-live" };
  return { mode: "deterministic", credentialSource: "none" };
}
