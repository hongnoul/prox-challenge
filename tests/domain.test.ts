import { describe, expect, it } from "vitest";
import { omniproPackage } from "@/lib/server/product/package";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";
import { applyTwinPatch, calculatePublishedDutyCycle, validateConfiguration } from "@/lib/shared/domain";

describe("deterministic product behavior", () => {
  it("calculates only an exact published duty-cycle rating", () => {
    const exact = calculatePublishedDutyCycle(omniproPackage.facts, { process: "mig", inputVoltage: 240, amperage: 200 });
    expect(exact).toMatchObject({ dutyCyclePercent: 25, weldMinutes: 2.5, restMinutes: 7.5, authority: "published" });
    expect(calculatePublishedDutyCycle(omniproPackage.facts, { process: "mig", inputVoltage: 240, amperage: 180 })).toBeNull();
  });

  it("rejects incompatible MIG polarity", () => {
    const state = createInitialTwinState();
    state.process = { value: "mig", source: "user-confirmed" };
    state.torchConnection = { value: "negative", source: "user-confirmed" };
    state.groundConnection = { value: "positive", source: "user-confirmed" };
    expect(validateConfiguration(state).map(({ id }) => id)).toContain("mig-requires-dcep");
  });

  it("requires confirmation and enforces optimistic revisions", () => {
    const state = createInitialTwinState();
    const unconfirmed = applyTwinPatch(state, {
      expectedRevision: 0,
      patch: { process: "tig" },
      source: "user-declared",
      confirmed: false,
    });
    expect(unconfirmed).toMatchObject({ applied: false, reason: "confirmation-required" });

    const applied = applyTwinPatch(state, {
      expectedRevision: 0,
      patch: { process: "tig", groundConnection: "positive" },
      source: "user-confirmed",
      confirmed: true,
    });
    expect(applied.applied).toBe(true);
    if (!applied.applied) throw new Error("Expected state update to apply");
    expect(applied.state.revision).toBe(1);

    expect(applyTwinPatch(applied.state, {
      expectedRevision: 0,
      patch: { torchConnection: "negative" },
      source: "user-confirmed",
      confirmed: true,
    })).toMatchObject({ applied: false, reason: "stale-revision" });
  });
});

