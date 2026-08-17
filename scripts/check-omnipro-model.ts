import { createHash } from "node:crypto";
import { access, readFile } from "node:fs/promises";
import path from "node:path";
import * as THREE from "three";
import {
  createOmniProFront,
  OMNIPRO_FRONT_PART_NAMES,
} from "../lib/omnipro/create-omnipro-front";

const rootDirectory = process.cwd();
const requiredSchemaVersion = 2;
const confidenceValues = new Set([
  "measured",
  "corroborated",
  "observed",
  "inferred",
  "unresolved",
]);
const confidenceFields = [
  "identity_confidence",
  "placement_confidence",
  "geometry_confidence",
  "appearance_confidence",
] as const;

function fail(message: string): never {
  throw new Error(message);
}

function record(value: unknown, label: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    fail(`${label} must be an object`);
  }
  return value as Record<string, unknown>;
}

function array(value: unknown, label: string): unknown[] {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function string(value: unknown, label: string): string {
  if (typeof value !== "string" || value.trim() === "") {
    fail(`${label} must be a non-empty string`);
  }
  return value;
}

function number(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    fail(`${label} must be a finite number`);
  }
  return value;
}

function stringArray(value: unknown, label: string): string[] {
  return array(value, label).map((item, index) => string(item, `${label}[${index}]`));
}

function vector3(value: unknown, label: string): [number, number, number] {
  const values = array(value, label);
  if (values.length !== 3) fail(`${label} must contain exactly three numbers`);
  return values.map((item, index) => number(item, `${label}[${index}]`)) as [
    number,
    number,
    number,
  ];
}

function addUnique(set: Set<string>, value: string, label: string): void {
  if (set.has(value)) fail(`Duplicate ${label}: ${value}`);
  set.add(value);
}

async function parseJson(relativePath: string): Promise<Record<string, unknown>> {
  const source = await readFile(path.join(rootDirectory, relativePath), "utf8");
  return record(JSON.parse(source) as unknown, relativePath);
}

async function sha256(filePath: string): Promise<string> {
  return createHash("sha256").update(await readFile(filePath)).digest("hex");
}

function resolveEvidencePath(relativePath: string): string {
  if (path.isAbsolute(relativePath)) fail(`Evidence path must be relative: ${relativePath}`);
  const resolved = path.resolve(rootDirectory, relativePath);
  const relative = path.relative(rootDirectory, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    fail(`Evidence path escapes the repository: ${relativePath}`);
  }
  return resolved;
}

function finiteBox(box: THREE.Box3, label: string): void {
  if (box.isEmpty()) fail(`${label} has an empty Box3`);
  for (const [axis, value] of [
    ["min.x", box.min.x],
    ["min.y", box.min.y],
    ["min.z", box.min.z],
    ["max.x", box.max.x],
    ["max.y", box.max.y],
    ["max.z", box.max.z],
  ] as const) {
    if (!Number.isFinite(value)) fail(`${label} has non-finite ${axis}`);
  }
}

function assertWithin(
  actual: number,
  expected: number,
  tolerance: number,
  label: string,
): void {
  if (Math.abs(actual - expected) > tolerance) {
    fail(
      `${label} is ${actual.toFixed(4)}, expected ${expected.toFixed(4)} ± ${tolerance}`,
    );
  }
}

async function main(): Promise<void> {
const evidence = await parseJson("assets/omnipro/evidence/sources.json");
const manifest = await parseJson("assets/omnipro/semantics/parts.json");

if (number(evidence.schema_version, "evidence.schema_version") !== requiredSchemaVersion) {
  fail(`Evidence schema_version must be ${requiredSchemaVersion}`);
}
if (number(manifest.schema_version, "manifest.schema_version") !== requiredSchemaVersion) {
  fail(`Semantic manifest schema_version must be ${requiredSchemaVersion}`);
}

const evidencePolicy = record(evidence.evidence_policy, "evidence_policy");
const officialProductUrl = string(
  evidencePolicy.official_product_url,
  "evidence_policy.official_product_url",
);
if (!officialProductUrl.startsWith("https://")) {
  fail("The official product URL must use HTTPS");
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(string(evidencePolicy.accessed_on, "evidence_policy.accessed_on"))) {
  fail("The official product access date must use YYYY-MM-DD");
}
if (stringArray(evidencePolicy.limitations, "evidence_policy.limitations").length === 0) {
  fail("Evidence policy must record limitations");
}

const sourceIds = new Set<string>();
const sources = array(evidence.sources, "sources");
for (const [index, sourceValue] of sources.entries()) {
  const source = record(sourceValue, `sources[${index}]`);
  const id = string(source.id, `sources[${index}].id`);
  addUnique(sourceIds, id, "evidence source id");
  if (stringArray(source.supports, `${id}.supports`).length === 0) {
    fail(`${id} must declare what it supports`);
  }
  if (stringArray(source.limitations, `${id}.limitations`).length === 0) {
    fail(`${id} must declare limitations`);
  }

  if (source.path !== undefined) {
    const relativePath = string(source.path, `${id}.path`);
    const absolutePath = resolveEvidencePath(relativePath);
    await access(absolutePath);
    const expectedHash = string(source.sha256, `${id}.sha256`);
    if (!/^[a-f0-9]{64}$/i.test(expectedHash)) {
      fail(`${id}.sha256 must be a 64-character hexadecimal SHA-256 digest`);
    }
    const actualHash = await sha256(absolutePath);
    if (actualHash !== expectedHash.toLowerCase()) {
      fail(`${id} hash mismatch: expected ${expectedHash}, received ${actualHash}`);
    }
  }

  if (source.type === "web-page") {
    string(source.source_url, `${id}.source_url`);
    string(source.page_title, `${id}.page_title`);
    string(source.publisher, `${id}.publisher`);
    string(source.accessed_on, `${id}.accessed_on`);
  }
}

const productId = string(evidence.product_id, "evidence.product_id");
if (string(manifest.product_id, "manifest.product_id") !== productId) {
  fail("Evidence and semantics product_id values must match");
}
const primaryEvidence = string(manifest.primary_evidence_ref, "primary_evidence_ref");
if (!sourceIds.has(primaryEvidence)) fail(`Missing primary evidence: ${primaryEvidence}`);

const boundsContract = record(manifest.model_bounds, "model_bounds");
const expectedMin = vector3(boundsContract.expected_min, "model_bounds.expected_min");
const expectedMax = vector3(boundsContract.expected_max, "model_bounds.expected_max");
const boundsTolerance = number(
  boundsContract.regression_tolerance,
  "model_bounds.regression_tolerance",
);
if (boundsTolerance <= 0) fail("model_bounds.regression_tolerance must be positive");
const boundsEvidenceRef = string(boundsContract.evidence_ref, "model_bounds.evidence_ref");
if (!sourceIds.has(boundsEvidenceRef)) {
  fail(`Model bounds reference missing evidence: ${boundsEvidenceRef}`);
}
if (stringArray(boundsContract.limitations, "model_bounds.limitations").length === 0) {
  fail("Model bounds must explain their limitations");
}

const partIds = new Set<string>();
const manualNames = new Set<string>();
const expectedObjectNames = new Set<string>();
const parts = array(manifest.parts, "parts");
if (parts.length === 0) fail("The semantic manifest must contain parts");

for (const [index, partValue] of parts.entries()) {
  const part = record(partValue, `parts[${index}]`);
  const id = string(part.id, `parts[${index}].id`);
  const manualName = string(part.manual_name, `${id}.manual_name`);
  addUnique(partIds, id, "part id");
  addUnique(manualNames, manualName, "manual part name");

  if (part.confidence !== undefined) fail(`${id} uses the obsolete broad confidence field`);
  if (part.expected_mesh_names !== undefined) {
    fail(`${id} uses expected_mesh_names instead of expected_object_names`);
  }

  for (const field of confidenceFields) {
    const value = string(part[field], `${id}.${field}`);
    if (!confidenceValues.has(value)) fail(`${id}.${field} has unsupported value: ${value}`);
  }
  if (stringArray(part.unresolved, `${id}.unresolved`).length === 0) {
    fail(`${id} must retain explicit unresolved properties`);
  }

  for (const evidenceRef of stringArray(part.evidence_refs, `${id}.evidence_refs`)) {
    if (!sourceIds.has(evidenceRef)) fail(`${id} references missing evidence: ${evidenceRef}`);
  }
  const objectNames = stringArray(part.expected_object_names, `${id}.expected_object_names`);
  if (objectNames.length === 0) fail(`${id} must bind at least one model object`);
  for (const objectName of objectNames) {
    addUnique(expectedObjectNames, objectName, "expected object name");
  }
}

const exportedObjectNames: string[] = Object.values(OMNIPRO_FRONT_PART_NAMES);
if (new Set(exportedObjectNames).size !== exportedObjectNames.length) {
  fail("OMNIPRO_FRONT_PART_NAMES contains duplicate names");
}
for (const name of exportedObjectNames) {
  if (!expectedObjectNames.has(name)) fail(`Exported semantic object is missing from manifest: ${name}`);
}
for (const name of expectedObjectNames) {
  if (!exportedObjectNames.includes(name)) fail(`Manifest references an unexported semantic object: ${name}`);
}

const model = createOmniProFront({ castShadow: false, receiveShadow: false });
try {
  model.updateMatrixWorld(true);
  const objectsByName = new Map<string, THREE.Object3D[]>();
  let meshCount = 0;

  model.traverse((object) => {
    if (!object.matrixWorld.elements.every(Number.isFinite)) {
      fail(`Object has a non-finite transform: ${object.name || "(unnamed)"}`);
    }
    if (object.name) {
      const matches = objectsByName.get(object.name) ?? [];
      matches.push(object);
      objectsByName.set(object.name, matches);
    }
    if (!(object instanceof THREE.Mesh)) return;
    meshCount += 1;
    const position = object.geometry.getAttribute("position");
    if (!position || position.count === 0) {
      fail(`Mesh has no position data: ${object.name || "(unnamed)"}`);
    }
    const values = position.array;
    for (let index = 0; index < values.length; index += 1) {
      if (!Number.isFinite(values[index])) {
        fail(`Mesh has non-finite geometry: ${object.name || "(unnamed)"}`);
      }
    }
  });

  for (const objectName of expectedObjectNames) {
    const matches = objectsByName.get(objectName) ?? [];
    if (matches.length !== 1) {
      fail(`${objectName} must resolve exactly once, resolved ${matches.length} times`);
    }
    finiteBox(new THREE.Box3().setFromObject(matches[0]), objectName);
  }

  const computedBounds = new THREE.Box3().setFromObject(model);
  finiteBox(computedBounds, "OmniPro model");
  const actualMin = computedBounds.min.toArray();
  const actualMax = computedBounds.max.toArray();
  for (let axis = 0; axis < 3; axis += 1) {
    assertWithin(actualMin[axis], expectedMin[axis], boundsTolerance, `Box3 min[${axis}]`);
    assertWithin(actualMax[axis], expectedMax[axis], boundsTolerance, `Box3 max[${axis}]`);
  }

  const size = computedBounds.getSize(new THREE.Vector3());
  console.log(
    `OmniPro model gate passed: ${parts.length} sourced parts, ${sources.length} evidence sources, ${meshCount} meshes, Box3 ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} model units.`,
  );
} finally {
  model.userData.dispose();
}
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
