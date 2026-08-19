import { artifactRequestSchema } from "@/lib/shared/contracts";
import type { ArtifactRequest } from "./types";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as UnknownRecord
    : null;
}

function asText(props: UnknownRecord, ...keys: string[]) {
  for (const key of keys) {
    const value = props[key];
    if ((typeof value === "string" || typeof value === "number") && String(value).trim()) return String(value).trim();
  }
  return null;
}

function asNumber(props: UnknownRecord, keys: string[], minimum: number, maximum: number) {
  const text = asText(props, ...keys);
  if (text === null) return null;
  const value = Number(text);
  return Number.isFinite(value) && value >= minimum && value <= maximum ? value : null;
}

function rounded(value: number) {
  return Math.round(value * 1_000) / 1_000;
}

export function normalizeArtifactRequest(input: unknown): ArtifactRequest | null {
  const request = asRecord(input);
  const props = asRecord(request?.props);
  if (!request || !props || typeof request.artifactType !== "string") return null;

  let normalized: ArtifactRequest | null = null;
  if (request.artifactType === "duty-cycle") {
    const dutyCyclePercent = asNumber(props, ["dutyCyclePercent", "dutyCycle", "percent"], 0, 100);
    const amperage = asNumber(props, ["amperage", "outputAmps", "current"], 1, 1_000);
    if (dutyCyclePercent !== null && amperage !== null) {
      const derivedWeldMinutes = rounded(dutyCyclePercent / 10);
      const weldMinutes = asNumber(props, ["weldMinutes", "workMinutes"], 0, 10) ?? derivedWeldMinutes;
      const restMinutes = asNumber(props, ["restMinutes", "coolMinutes"], 0, 10) ?? rounded(10 - weldMinutes);
      normalized = {
        artifactType: "duty-cycle",
        props: { dutyCyclePercent, amperage, weldMinutes, restMinutes },
      };
    }
  }

  if (request.artifactType === "polarity") {
    const process = asText(props, "process");
    const wire = asText(props, "wire", "electrode");
    const torch = asText(props, "torch");
    const ground = asText(props, "ground", "workLead");
    if (process && (wire || torch) && ground) {
      normalized = {
        artifactType: "polarity",
        props: { process, ...(wire ? { wire } : { torch }), ground },
      };
    }
  }

  if (request.artifactType === "troubleshooting") {
    const pathId = asText(props, "pathId");
    const process = asText(props, "process");
    if (pathId) normalized = { artifactType: "troubleshooting", props: { pathId, ...(process ? { process } : {}) } };
  }

  if (request.artifactType === "source-comparison") {
    const evidenceId = asText(props, "evidenceId");
    if (evidenceId) normalized = { artifactType: "source-comparison", props: { evidenceId } };
  }

  const parsed = artifactRequestSchema.safeParse(normalized);
  return parsed.success ? parsed.data : null;
}
