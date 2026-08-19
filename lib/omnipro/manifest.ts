import compiledPackage from "@/products/omnipro-220/product-dist/v1/package.json";

export type EvidenceConfidence =
  | "measured"
  | "corroborated"
  | "observed"
  | "inferred"
  | "unresolved";

export type OmniProPart = {
  id: string;
  manual_name: string;
  evidence_refs: string[];
  interaction_type: string;
  expected_object_names: string[];
  identity_confidence: EvidenceConfidence;
  placement_confidence: EvidenceConfidence;
  geometry_confidence: EvidenceConfidence;
  appearance_confidence: EvidenceConfidence;
  unresolved: string[];
};

export type OmniProPartsManifest = {
  schema_version: 1;
  product_id: string;
  scope: string;
  primary_evidence_ref: string;
  fidelity_classification: string;
  model_bounds: {
    units: "procedural-model-units";
    expected_min: [number, number, number];
    expected_max: [number, number, number];
    regression_tolerance: number;
    limitations: string[];
  };
  parts: OmniProPart[];
};

const bindings = new Map(compiledPackage.sceneBindings.map((binding) => [binding.entityId, binding]));

const parts = compiledPackage.entities.flatMap((entity): OmniProPart[] => {
  const binding = bindings.get(entity.id);
  if (!binding) return [];
  return [{
    id: entity.id,
    manual_name: entity.name,
    evidence_refs: binding.evidenceIds,
    interaction_type: entity.category,
    expected_object_names: binding.meshNames,
    identity_confidence: "corroborated",
    placement_confidence: "observed",
    geometry_confidence: "inferred",
    appearance_confidence: "observed",
    unresolved: [
      "manufacturing dimensions and tolerances",
      "hidden geometry",
      "material specification",
    ],
  }];
});

export const omniProPartsManifest: OmniProPartsManifest = {
  schema_version: 1,
  product_id: compiledPackage.product.id,
  scope: "front-panel-and-visible-exterior",
  primary_evidence_ref: "ev-front-controls-p8",
  fidelity_classification: "source-faithful instructional reconstruction",
  model_bounds: {
    units: "procedural-model-units",
    expected_min: [-6.1083, -0.04, -10.225],
    expected_max: [6.1083, 16.79, 12.5687],
    regression_tolerance: 0.05,
    limitations: [
      "The Box3 values are a code-regression baseline, not product measurements.",
      "The procedural scale must not be used for fabrication, repair clearance, or safety measurements.",
    ],
  },
  parts,
};
