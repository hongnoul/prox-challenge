import type { TwinPatchRequest, TwinState } from "@/lib/shared/contracts/twin-state";
import { twinPatchRequestSchema } from "@/lib/shared/contracts/twin-state";
import { validateConfiguration } from "./constraints";

const stateFields = [
  "process",
  "inputVoltage",
  "material",
  "wireOrElectrode",
  "shieldingGas",
  "torchConnection",
  "groundConnection",
] as const;

export type ApplyTwinPatchResult =
  | { applied: true; state: TwinState }
  | { applied: false; state: TwinState; reason: "stale-revision" | "confirmation-required" | "constraint-violation"; messages: string[] };

export function applyTwinPatch(current: TwinState, requestInput: TwinPatchRequest): ApplyTwinPatchResult {
  const request = twinPatchRequestSchema.parse(requestInput);
  if (request.expectedRevision !== current.revision) {
    return { applied: false, state: current, reason: "stale-revision", messages: ["Twin state changed before this update could be applied."] };
  }
  if (request.source !== "simulated" && !request.confirmed) {
    return { applied: false, state: current, reason: "confirmation-required", messages: ["User confirmation is required before applying this state change."] };
  }

  const candidate = structuredClone(current);
  for (const field of stateFields) {
    const value = request.patch[field];
    if (value !== undefined) candidate[field] = { value, source: request.source } as never;
  }
  if (request.patch.selectedEntityId !== undefined) candidate.selectedEntityId = request.patch.selectedEntityId;
  candidate.revision += 1;

  const findings = validateConfiguration(candidate).filter(({ severity }) => severity === "error");
  if (findings.length > 0) {
    return { applied: false, state: current, reason: "constraint-violation", messages: findings.map(({ message }) => message) };
  }
  return { applied: true, state: candidate };
}

