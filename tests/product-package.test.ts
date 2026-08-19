import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import manifest from "@/products/omnipro-220/product-dist/v1/package-manifest.json";
import { omniproPackage } from "@/lib/server/product/package";
import { productStore } from "@/lib/server/product/store";

const sha256 = (value: Buffer | string) => createHash("sha256").update(value).digest("hex");

describe("compiled OmniPro product package", () => {
  it("contains source-backed runtime areas", () => {
    expect(omniproPackage.sources).toHaveLength(5);
    expect(omniproPackage.evidence.length).toBeGreaterThanOrEqual(10);
    expect(omniproPackage.entities.length).toBeGreaterThanOrEqual(13);
    expect(omniproPackage.procedures.map(({ id }) => id)).toEqual(expect.arrayContaining([
      "procedure-tig-setup",
      "procedure-mig-polarity",
      "procedure-flux-polarity",
    ]));
  });

  it("matches all immutable source hashes", async () => {
    for (const source of omniproPackage.sources) {
      const bytes = await readFile(join(process.cwd(), source.path));
      expect(sha256(bytes), source.id).toBe(source.sha256);
      expect(manifest.sourceHashes[source.id as keyof typeof manifest.sourceHashes]).toBe(source.sha256);
    }
  });

  it("matches every published evidence asset hash", async () => {
    for (const evidence of omniproPackage.evidence) {
      const bytes = await readFile(join(process.cwd(), "public", evidence.publicAsset.slice(1)));
      expect(sha256(bytes), evidence.id).toBe(evidence.assetSha256);
      expect(manifest.assetHashes[evidence.id as keyof typeof manifest.assetHashes]).toBe(evidence.assetSha256);
    }
  });

  it("resolves every entity evidence and scene binding", () => {
    for (const entity of omniproPackage.entities) {
      expect(productStore.getEvidenceMany(entity.evidenceIds)).toHaveLength(entity.evidenceIds.length);
      if (entity.sceneBindingId) {
        expect(omniproPackage.sceneBindings.some(({ id }) => id === entity.sceneBindingId)).toBe(true);
      }
    }
  });

  it("returns ranked local retrieval without model calls", () => {
    const results = productStore.searchKnowledge("TIG torch negative socket argon");
    expect(results.length).toBeGreaterThan(0);
    expect(results.flatMap(({ evidenceIds }) => evidenceIds)).toEqual(expect.arrayContaining([
      "ev-tig-connections-p24",
    ]));
  });
});

