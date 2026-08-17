import partsJson from "@/assets/omnipro/semantics/parts.json";

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

export type ModelBoundsContract = {
  units: "procedural-model-units";
  expected_min: [number, number, number];
  expected_max: [number, number, number];
  regression_tolerance: number;
  nominal_product_envelope_inches: [number, number, number];
  evidence_ref: string;
  limitations: string[];
};

export type OmniProPartsManifest = {
  schema_version: number;
  product_id: string;
  scope: string;
  primary_evidence_ref: string;
  fidelity_classification: string;
  model_bounds: ModelBoundsContract;
  parts: OmniProPart[];
};

export const omniProPartsManifest = partsJson as OmniProPartsManifest;
