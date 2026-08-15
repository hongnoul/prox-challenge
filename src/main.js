import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import frontPartsManifest from '../assets/omnipro/semantics/front-parts.json';
import { createOmniProFront } from './model/createOmniProFront.js';
import './style.css';

const sceneElement = document.querySelector('#scene');
const resetButton = document.querySelector('#reset-view');
const frontViewButton = document.querySelector('#front-view');
const referenceInput = document.querySelector('#reference');
const referenceView = document.querySelector('.reference-view');
const partNameElement = document.querySelector('#part-name');
const partSourceElement = document.querySelector('#part-source');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7d5ce');
scene.fog = new THREE.Fog('#d7d5ce', 50, 105);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
const initialCameraPosition = window.matchMedia('(max-width: 680px)').matches
  ? new THREE.Vector3(0, 16, 62)
  : new THREE.Vector3(-39, 28, 48);
camera.position.copy(initialCameraPosition);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
sceneElement.append(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.minDistance = 25;
controls.maxDistance = 75;
controls.minAzimuthAngle = -Math.PI * 0.42;
controls.maxAzimuthAngle = Math.PI * 0.42;
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 8, 0);

const welder = createOmniProFront();
const interactiveParts = [];

for (const part of frontPartsManifest.parts) {
  for (const meshName of part.expected_mesh_names) {
    const object = welder.getObjectByName(meshName);
    if (!object) continue;
    object.userData.partId = part.id;
    object.userData.manualName = part.manual_name;
    object.userData.evidenceRefs = part.evidence_refs;
    object.userData.confidence = part.confidence;
    interactiveParts.push(object);
  }
}

scene.add(welder);

const floorMaterial = new THREE.MeshStandardMaterial({ color: '#c7c4bc', roughness: 1 });
const floor = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), floorMaterial);
floor.rotation.x = -Math.PI / 2;
floor.receiveShadow = true;
scene.add(floor);

const grid = new THREE.GridHelper(80, 40, '#96938c', '#bab7b0');
grid.position.y = 0.015;
grid.material.transparent = true;
grid.material.opacity = 0.45;
scene.add(grid);

scene.add(new THREE.HemisphereLight('#f7f5ec', '#3a4043', 1.8));

const keyLight = new THREE.DirectionalLight('#fff4de', 4.2);
keyLight.position.set(18, 32, 24);
keyLight.castShadow = true;
keyLight.shadow.mapSize.set(2048, 2048);
keyLight.shadow.camera.left = -28;
keyLight.shadow.camera.right = 28;
keyLight.shadow.camera.top = 28;
keyLight.shadow.camera.bottom = -28;
scene.add(keyLight);

const rimLight = new THREE.DirectionalLight('#9bc8d8', 1.8);
rimLight.position.set(-22, 14, -18);
scene.add(rimLight);

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let pointerStart = null;
let selectedPartHelper = null;

function evidenceLabel(part) {
  const labels = [];
  if (part.evidence_refs.includes('owner-manual-page-8')) labels.push('Owner’s Manual p. 8');
  if (part.evidence_refs.includes('product-front-photo')) labels.push('official product photo');
  return `${labels.join(' · ')} · ${part.confidence} confidence`;
}

function selectPart(part) {
  const meshName = part?.expected_mesh_names[0];
  const object = meshName ? welder.getObjectByName(meshName) : null;

  if (selectedPartHelper) {
    scene.remove(selectedPartHelper);
    selectedPartHelper.geometry.dispose();
    selectedPartHelper.material.dispose();
    selectedPartHelper = null;
  }

  if (!part || !object) {
    partNameElement.textContent = 'Select a control';
    partSourceElement.textContent = 'Owner’s Manual page 8';
    renderer.render(scene, camera);
    return;
  }

  selectedPartHelper = new THREE.Box3Helper(new THREE.Box3().setFromObject(object), '#e85b18');
  selectedPartHelper.name = `Selection: ${part.manual_name}`;
  scene.add(selectedPartHelper);
  partNameElement.textContent = part.manual_name;
  partSourceElement.textContent = evidenceLabel(part);
  renderer.render(scene, camera);
}

function partFromObject(object) {
  let current = object;
  while (current && current !== welder) {
    if (current.userData.partId) {
      return frontPartsManifest.parts.find((part) => part.id === current.userData.partId) ?? null;
    }
    current = current.parent;
  }
  return null;
}

renderer.domElement.addEventListener('pointerdown', (event) => {
  pointerStart = { x: event.clientX, y: event.clientY };
});

renderer.domElement.addEventListener('pointerup', (event) => {
  if (!pointerStart || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5) {
    pointerStart = null;
    return;
  }

  pointerStart = null;
  const bounds = renderer.domElement.getBoundingClientRect();
  pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
  pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(interactiveParts, true)[0];
  selectPart(hit ? partFromObject(hit.object) : null);
});

const resolvedPartIds = frontPartsManifest.parts
  .filter((part) => part.expected_mesh_names.every((meshName) => welder.getObjectByName(meshName)))
  .map((part) => part.id);

window.__OMNIPRO_MODEL_AUDIT__ = Object.freeze({
  expectedPartCount: frontPartsManifest.parts.length,
  resolvedPartCount: resolvedPartIds.length,
  resolvedPartIds: Object.freeze(resolvedPartIds),
  selectPart: (partId) => selectPart(
    frontPartsManifest.parts.find((part) => part.id === partId) ?? null,
  ),
});

function resize() {
  const { clientWidth, clientHeight } = sceneElement;
  camera.aspect = clientWidth / clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(clientWidth, clientHeight, false);
  renderer.render(scene, camera);
}

resetButton.addEventListener('click', () => {
  camera.position.copy(initialCameraPosition);
  controls.target.set(0, 8, 0);
  controls.update();
  renderer.render(scene, camera);
});

frontViewButton.addEventListener('click', () => {
  camera.position.set(0, 8.2, 43);
  controls.target.set(0, 8, 0);
  controls.update();
  renderer.render(scene, camera);
});

referenceInput.addEventListener('change', () => {
  referenceView.hidden = !referenceInput.checked;
});

controls.addEventListener('change', () => renderer.render(scene, camera));

const resizeObserver = new ResizeObserver(resize);
resizeObserver.observe(sceneElement);
window.addEventListener('resize', resize);

// Paint synchronously so the model is visible before the first animation frame.
resize();
controls.update();
renderer.render(scene, camera);

renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
