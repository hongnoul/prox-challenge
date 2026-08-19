import { describe, expect, it } from "vitest";
import { POST as postAgent } from "@/app/api/agent/route";
import { GET as getEntity } from "@/app/api/entities/[entityId]/route";
import { GET as getEvidence } from "@/app/api/evidence/[evidenceId]/route";
import { GET as getProduct } from "@/app/api/products/[productId]/route";
import { productStore } from "@/lib/server/product/store";
import { createInitialTwinState } from "@/lib/shared/contracts/twin-state";

const request = (path: string) => new Request(`http://localhost${path}`);
const immutableCache = "public, max-age=300, immutable";

describe("agent request validation", () => {
  it("rejects invalid JSON without starting an agent turn", async () => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: "{not-json",
      headers: { "Content-Type": "application/json" },
    }));

    expect(response.status).toBe(400);
    await expect(response.json()).resolves.toEqual({ error: "Request body must be valid JSON" });
  });

  it.each([
    ["a missing twin state", { message: "hello" }],
    ["an empty message", { message: "   ", twinState: createInitialTwinState() }],
    ["an oversized session id", {
      sessionId: "x".repeat(129),
      message: "hello",
      twinState: createInitialTwinState(),
    }],
  ])("rejects %s with structured schema issues", async (_label, body) => {
    const response = await postAgent(new Request("http://localhost/api/agent", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }));
    const payload = await response.json() as { error: string; issues: unknown[] };

    expect(response.status).toBe(400);
    expect(payload.error).toBe("Invalid agent request");
    expect(payload.issues.length).toBeGreaterThan(0);
  });
});

describe("public product routes", () => {
  it("returns the published product package projection", async () => {
    const productPackage = productStore.productPackage;
    const response = await getProduct(
      request(`/api/products/${productPackage.product.id}`),
      { params: Promise.resolve({ productId: productPackage.product.id }) },
    );
    const payload = await response.json() as {
      product: { id: string };
      packageVersion: string;
      evidence: Array<{ id: string }>;
      entities: Array<{ id: string }>;
      procedures: Array<{ id: string; stepCount: number; steps?: unknown }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(immutableCache);
    expect(payload.product.id).toBe(productPackage.product.id);
    expect(payload.packageVersion).toBe(productPackage.packageVersion);
    expect(payload.evidence).toHaveLength(productPackage.evidence.length);
    expect(payload.entities).toHaveLength(productPackage.entities.length);
    expect(payload.procedures).toEqual(productPackage.procedures.map((procedure) => expect.objectContaining({
      id: procedure.id,
      stepCount: procedure.steps.length,
    })));
    expect(payload.procedures.every((procedure) => procedure.steps === undefined)).toBe(true);
  });

  it("returns 404 for an unknown product", async () => {
    const response = await getProduct(
      request("/api/products/not-a-product"),
      { params: Promise.resolve({ productId: "not-a-product" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Product not found" });
  });

  it("returns evidence together with its source document", async () => {
    const expected = productStore.productPackage.evidence[0];
    const response = await getEvidence(
      request(`/api/evidence/${expected.id}`),
      { params: Promise.resolve({ evidenceId: expected.id }) },
    );
    const payload = await response.json() as {
      evidence: { id: string; sourceId: string };
      source: { id: string };
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(immutableCache);
    expect(payload.evidence).toEqual(expected);
    expect(payload.source.id).toBe(expected.sourceId);
  });

  it("returns 404 for unknown evidence", async () => {
    const response = await getEvidence(
      request("/api/evidence/not-evidence"),
      { params: Promise.resolve({ evidenceId: "not-evidence" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Evidence not found" });
  });

  it("returns an entity with only its linked facts and evidence", async () => {
    const { entities, facts } = productStore.productPackage;
    const expected = entities.find((entity) => facts.some((fact) => fact.entityIds.includes(entity.id)))
      ?? entities[0];
    const expectedFacts = facts.filter((fact) => fact.entityIds.includes(expected.id));
    const response = await getEntity(
      request(`/api/entities/${expected.id}`),
      { params: Promise.resolve({ entityId: expected.id }) },
    );
    const payload = await response.json() as {
      entity: { id: string; evidenceIds: string[] };
      facts: Array<{ entityIds: string[] }>;
      evidence: Array<{ id: string }>;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe(immutableCache);
    expect(payload.entity).toEqual(expected);
    expect(payload.facts).toEqual(expectedFacts);
    expect(payload.facts.length).toBeGreaterThan(0);
    expect(payload.evidence.map(({ id }) => id)).toEqual(expected.evidenceIds);
  });

  it("returns 404 for an unknown entity", async () => {
    const response = await getEntity(
      request("/api/entities/not-an-entity"),
      { params: Promise.resolve({ entityId: "not-an-entity" }) },
    );

    expect(response.status).toBe(404);
    await expect(response.json()).resolves.toEqual({ error: "Entity not found" });
  });
});
