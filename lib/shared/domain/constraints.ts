import type { TwinState } from "@/lib/shared/contracts/twin-state";

export type ConstraintFinding = {
  id: string;
  severity: "error" | "warning";
  message: string;
  evidenceIds: string[];
};

const valueOf = <T>(field: { value: T | null }) => field.value;

export function validateConfiguration(state: TwinState): ConstraintFinding[] {
  const findings: ConstraintFinding[] = [];
  const process = valueOf(state.process);
  const torch = valueOf(state.torchConnection);
  const ground = valueOf(state.groundConnection);
  const gas = valueOf(state.shieldingGas)?.toLowerCase() ?? null;

  if (process === "mig" && (torch && torch !== "positive" || ground && ground !== "negative")) {
    findings.push({
      id: "mig-requires-dcep",
      severity: "error",
      message: "Gas-shielded solid-core MIG requires wire feed power positive and ground negative (DCEP).",
      evidenceIds: ["ev-mig-dcep-p14"],
    });
  }
  if (process === "flux-core" && (torch && torch !== "negative" || ground && ground !== "positive")) {
    findings.push({
      id: "flux-requires-dcen",
      severity: "error",
      message: "Self-shielded flux-core requires wire feed power negative and ground positive (DCEN).",
      evidenceIds: ["ev-flux-dcen-p13"],
    });
  }
  if (process === "tig" && (torch && torch !== "negative" || ground && ground !== "positive")) {
    findings.push({
      id: "tig-connection-polarity",
      severity: "error",
      message: "The documented TIG setup requires the torch negative and ground positive.",
      evidenceIds: ["ev-tig-connections-p24"],
    });
  }
  if (process === "tig" && gas && !gas.includes("100%") && !gas.includes("pure argon")) {
    findings.push({
      id: "tig-requires-argon",
      severity: "error",
      message: "The documented TIG setup requires 100% argon shielding gas.",
      evidenceIds: ["ev-tig-argon-p25"],
    });
  }
  return findings;
}
