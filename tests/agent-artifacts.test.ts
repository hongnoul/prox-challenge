import { describe, expect, it } from "vitest";
import { normalizeArtifactRequest } from "@/lib/server/agent/artifacts";

describe("live artifact normalization", () => {
  it("derives the ten-minute weld and rest split from a valid duty cycle", () => {
    expect(normalizeArtifactRequest({
      artifactType: "duty-cycle",
      props: { dutyCyclePercent: 25, amperage: 200 },
    })).toEqual({
      artifactType: "duty-cycle",
      props: { dutyCyclePercent: 25, amperage: 200, weldMinutes: 2.5, restMinutes: 7.5 },
    });
  });

  it("accepts common live-model aliases while returning canonical props", () => {
    expect(normalizeArtifactRequest({
      artifactType: "polarity",
      props: { process: "mig", electrode: "positive", workLead: "negative" },
    })).toEqual({
      artifactType: "polarity",
      props: { process: "mig", wire: "positive", ground: "negative" },
    });
  });

  it("rejects incomplete artifacts instead of rendering misleading blanks", () => {
    expect(normalizeArtifactRequest({
      artifactType: "duty-cycle",
      props: { dutyCyclePercent: 25 },
    })).toBeNull();
    expect(normalizeArtifactRequest({
      artifactType: "source-comparison",
      props: {},
    })).toBeNull();
  });
});
