import { describe, expect, it } from "vitest";
import { answerDeterministically } from "@/lib/server/agent/deterministic-agent";
import { omniproPackage } from "@/lib/server/product/package";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";

describe("challenge acceptance journeys", () => {
  for (const testCase of omniproPackage.acceptanceCases) {
    it(testCase.journey, () => {
      const response = answerDeterministically(testCase.prompt, createInitialTwinState());
      expect(response.evidenceIds).toEqual(expect.arrayContaining(testCase.expectedEvidenceIds));
      expect(response.factIds).toEqual(expect.arrayContaining(testCase.expectedFactIds));
      if (testCase.expectedProcedureId) expect(response.procedureId).toBe(testCase.expectedProcedureId);
      if (testCase.expectedClarificationFields.length > 0) {
        expect(response.clarification?.fields).toEqual(expect.arrayContaining(testCase.expectedClarificationFields));
      }
      for (const phrase of testCase.requiredPhrases) {
        expect(response.text.toLowerCase()).toContain(phrase.toLowerCase());
      }
    });
  }
});
