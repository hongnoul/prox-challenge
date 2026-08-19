import * as THREE from "three";
import { createOmniProFront, OMNIPRO_FRONT_PART_NAMES } from "../lib/omnipro/create-omnipro-front";
import { omniProPartsManifest } from "../lib/omnipro/manifest";
import { omniproPackage } from "../lib/server/product/package";

function fail(message: string): never {
  throw new Error(message);
}

function assertWithin(actual: number, expected: number, tolerance: number, label: string) {
  if (Math.abs(actual - expected) > tolerance) {
    fail(`${label} is ${actual.toFixed(4)}, expected ${expected.toFixed(4)} ± ${tolerance}`);
  }
}

function finiteBox(box: THREE.Box3, label: string) {
  if (box.isEmpty()) fail(`${label} has an empty Box3`);
  for (const value of [...box.min.toArray(), ...box.max.toArray()]) {
    if (!Number.isFinite(value)) fail(`${label} has non-finite bounds`);
  }
}

function main() {
  const expectedNames = new Set(Object.values(OMNIPRO_FRONT_PART_NAMES));
  const boundNames = new Set(omniProPartsManifest.parts.flatMap(({ expected_object_names }) => expected_object_names));
  if (omniProPartsManifest.parts.length !== 13) fail(`Expected 13 front-panel parts, found ${omniProPartsManifest.parts.length}`);
  if (expectedNames.size !== 13 || boundNames.size !== 13) fail("Semantic object names must be unique and complete");
  for (const name of expectedNames) if (!boundNames.has(name)) fail(`Missing scene binding for ${name}`);

  const packageBindingIds = new Set(omniproPackage.sceneBindings.map(({ entityId }) => entityId));
  for (const part of omniProPartsManifest.parts) {
    if (!packageBindingIds.has(part.id)) fail(`Scene part ${part.id} is absent from the canonical package`);
    if (part.unresolved.length === 0) fail(`Scene part ${part.id} must declare unresolved geometry`);
  }

  const model = createOmniProFront({ castShadow: false, receiveShadow: false });
  try {
    model.updateMatrixWorld(true);
    let meshCount = 0;
    for (const objectName of expectedNames) {
      const matches: THREE.Object3D[] = [];
      model.traverse((object) => {
        if (object.name === objectName) matches.push(object);
        if (object instanceof THREE.Mesh) {
          meshCount += 1;
          const positions = object.geometry.getAttribute("position");
          if (!positions || positions.count === 0) fail(`Mesh ${object.name || "(unnamed)"} has no geometry`);
        }
      });
      if (matches.length !== 1) fail(`${objectName} must resolve exactly once; found ${matches.length}`);
      finiteBox(new THREE.Box3().setFromObject(matches[0]), objectName);
    }

    const bounds = new THREE.Box3().setFromObject(model);
    finiteBox(bounds, "OmniPro model");
    const { expected_min: expectedMin, expected_max: expectedMax, regression_tolerance: tolerance } = omniProPartsManifest.model_bounds;
    bounds.min.toArray().forEach((value, index) => assertWithin(value, expectedMin[index], tolerance, `Box3 min[${index}]`));
    bounds.max.toArray().forEach((value, index) => assertWithin(value, expectedMax[index], tolerance, `Box3 max[${index}]`));
    const size = bounds.getSize(new THREE.Vector3());
    console.log(`OmniPro model gate passed: 13 source-bound parts, ${meshCount / 13} traversal mesh count average, Box3 ${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)} model units.`);
  } finally {
    model.userData.dispose();
  }
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
