import type { Entity, EvidenceRegion, Fact, Procedure, ProductPackage } from "@/lib/shared/contracts";
import type { TwinState } from "@/lib/shared/contracts/twin-state";
import { omniproPackage } from "./package";

export type SearchResult = {
  id: string;
  kind: "entity" | "fact" | "procedure" | "troubleshooting";
  title: string;
  summary: string;
  evidenceIds: string[];
  score: number;
};

const tokenize = (value: string) => value.toLowerCase().match(/[a-z0-9%+-]+/g) ?? [];

const scoreText = (queryTokens: string[], text: string) => {
  const normalized = text.toLowerCase();
  return queryTokens.reduce((score, token) => score + (normalized.includes(token) ? 1 : 0), 0);
};

export class ProductStore {
  constructor(readonly productPackage: ProductPackage = omniproPackage) {}

  getProduct() {
    return this.productPackage.product;
  }

  getEntity(entityId: string): Entity | null {
    return this.productPackage.entities.find(({ id }) => id === entityId) ?? null;
  }

  getFact(factId: string): Fact | null {
    return this.productPackage.facts.find(({ id }) => id === factId) ?? null;
  }

  getProcedure(procedureId: string): Procedure | null {
    return this.productPackage.procedures.find(({ id }) => id === procedureId) ?? null;
  }

  getEvidence(evidenceId: string): EvidenceRegion | null {
    return this.productPackage.evidence.find(({ id }) => id === evidenceId) ?? null;
  }

  getEvidenceMany(evidenceIds: string[]) {
    return evidenceIds.flatMap((id) => {
      const evidence = this.getEvidence(id);
      return evidence ? [evidence] : [];
    });
  }

  searchKnowledge(query: string, limit = 8): SearchResult[] {
    const queryTokens = tokenize(query);
    if (queryTokens.length === 0) return [];

    const entities: SearchResult[] = this.productPackage.entities.map((entity) => ({
      id: entity.id,
      kind: "entity",
      title: entity.name,
      summary: entity.description,
      evidenceIds: entity.evidenceIds,
      score: scoreText(queryTokens, `${entity.name} ${entity.aliases.join(" ")} ${entity.description}`),
    }));
    const facts: SearchResult[] = this.productPackage.facts.map((fact) => ({
      id: fact.id,
      kind: "fact",
      title: fact.statement,
      summary: fact.statement,
      evidenceIds: fact.evidenceIds,
      score: scoreText(queryTokens, `${fact.statement} ${fact.tags.join(" ")} ${JSON.stringify(fact.conditions)}`),
    }));
    const procedures: SearchResult[] = this.productPackage.procedures.map((procedure) => ({
      id: procedure.id,
      kind: "procedure",
      title: procedure.title,
      summary: procedure.summary,
      evidenceIds: procedure.evidenceIds,
      score: scoreText(queryTokens, `${procedure.title} ${procedure.summary} ${procedure.process}`),
    }));
    const troubleshooting: SearchResult[] = this.productPackage.troubleshootingPaths.map((path) => ({
      id: path.id,
      kind: "troubleshooting",
      title: path.symptom,
      summary: path.summary,
      evidenceIds: [...new Set(path.nodes.flatMap(({ evidenceIds }) => evidenceIds))],
      score: scoreText(queryTokens, `${path.symptom} ${path.summary} ${path.nodes.map(({ text }) => text).join(" ")}`),
    }));

    return [...entities, ...facts, ...procedures, ...troubleshooting]
      .filter(({ score }) => score > 0)
      .sort((left, right) => right.score - left.score || left.title.localeCompare(right.title))
      .slice(0, Math.max(1, Math.min(limit, 20)));
  }

  findFacts(filters: Record<string, string | number | boolean>) {
    return this.productPackage.facts.filter((fact) => Object.entries(filters).every(
      ([key, value]) => fact.conditions[key] === value,
    ));
  }

  inspectTwinContext(twinState: TwinState) {
    const selectedEntity = twinState.selectedEntityId ? this.getEntity(twinState.selectedEntityId) : null;
    const activeProcedure = twinState.activeProcedureId ? this.getProcedure(twinState.activeProcedureId) : null;
    return { twinState, selectedEntity, activeProcedure };
  }
}

export const productStore = new ProductStore();

