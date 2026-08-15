import { readFile } from 'node:fs/promises';
import { createOmniProFront } from '../src/model/createOmniProFront.js';

const sources = JSON.parse(
  await readFile(new URL('../assets/omnipro/evidence/sources.json', import.meta.url), 'utf8'),
);
const manifest = JSON.parse(
  await readFile(new URL('../assets/omnipro/semantics/front-parts.json', import.meta.url), 'utf8'),
);

const sourceIds = new Set(sources.sources.map((source) => source.id));
const partIds = new Set();
const meshNames = new Set();

if (manifest.parts.length !== 13) {
  throw new Error(`Expected 13 documented front components, found ${manifest.parts.length}`);
}

for (const part of manifest.parts) {
  if (partIds.has(part.id)) throw new Error(`Duplicate part id: ${part.id}`);
  partIds.add(part.id);

  for (const evidenceRef of part.evidence_refs) {
    if (!sourceIds.has(evidenceRef)) {
      throw new Error(`${part.id} references missing evidence: ${evidenceRef}`);
    }
  }

  for (const meshName of part.expected_mesh_names) {
    if (meshNames.has(meshName)) throw new Error(`Duplicate expected mesh name: ${meshName}`);
    meshNames.add(meshName);
  }
}

const model = createOmniProFront({ castShadow: false, receiveShadow: false });
const missingMeshes = [...meshNames].filter((meshName) => !model.getObjectByName(meshName));

if (missingMeshes.length > 0) {
  throw new Error(`Model is missing documented components: ${missingMeshes.join(', ')}`);
}

if (model.userData.nominalEnvelopeInches?.width !== 12
  || model.userData.nominalEnvelopeInches?.height !== 17
  || model.userData.nominalEnvelopeInches?.depth !== 21) {
  throw new Error('Model envelope must remain anchored to 12 W × 17 H × 21 D inches');
}

model.userData.dispose?.();
console.log(`Front model gate passed: ${manifest.parts.length} sourced components, ${sourceIds.size} evidence sources.`);
