import type { Fact } from "@/lib/shared/contracts";

export type DutyCycleResult = {
  process: string;
  inputVoltage: number;
  amperage: number;
  dutyCyclePercent: number;
  weldMinutes: number;
  restMinutes: number;
  evidenceIds: string[];
  authority: "published";
};

export function calculatePublishedDutyCycle(
  facts: Fact[],
  input: { process: string; inputVoltage: number; amperage: number },
): DutyCycleResult | null {
  const exact = facts.find((fact) => fact.tags.includes("duty-cycle")
    && fact.conditions.process === input.process
    && fact.conditions.inputVoltage === input.inputVoltage
    && fact.conditions.amperage === input.amperage
    && typeof fact.value === "object"
    && fact.value !== null
    && "unit" in fact.value
    && fact.value.unit === "percent");

  if (!exact || typeof exact.value !== "object" || exact.value === null || !("value" in exact.value)) return null;
  const dutyCyclePercent = exact.value.value;
  const weldMinutes = dutyCyclePercent / 10;
  return {
    ...input,
    dutyCyclePercent,
    weldMinutes,
    restMinutes: 10 - weldMinutes,
    evidenceIds: exact.evidenceIds,
    authority: "published",
  };
}

