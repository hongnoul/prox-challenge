import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

const sceneElement = document.querySelector('#scene');
const resetButton = document.querySelector('#reset-view');
const wireframeInput = document.querySelector('#wireframe');

const scene = new THREE.Scene();
scene.background = new THREE.Color('#d7d5ce');
scene.fog = new THREE.Fog('#d7d5ce', 50, 105);

const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
const initialCameraPosition = new THREE.Vector3(31, 24, 36);
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
controls.maxPolarAngle = Math.PI * 0.49;
controls.target.set(0, 8, 0);

const colors = {
  orange: '#e85b18',
  orangeDark: '#a83810',
  graphite: '#1c2022',
  black: '#080a0b',
  steel: '#a7adb0',
  screen: '#7dc7d8',
};

const modelMaterials = [];

function material(color, roughness = 0.7, metalness = 0.05) {
  const nextMaterial = new THREE.MeshStandardMaterial({ color, roughness, metalness });
  modelMaterials.push(nextMaterial);
  return nextMaterial;
}

function box(name, size, position, meshMaterial, parent, rotation = [0, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(...size), meshMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function cylinder(name, radius, depth, position, meshMaterial, parent, rotation = [Math.PI / 2, 0, 0]) {
  const mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius, depth, 24), meshMaterial);
  mesh.name = name;
  mesh.position.set(...position);
  mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createWelder() {
  const welder = new THREE.Group();
  welder.name = 'OmniPro 220 abstract model';

  const orange = material(colors.orange, 0.55, 0.12);
  const orangeDark = material(colors.orangeDark, 0.65, 0.08);
  const graphite = material(colors.graphite, 0.72, 0.16);
  const black = material(colors.black, 0.68, 0.15);
  const steel = material(colors.steel, 0.3, 0.72);
  const screen = material(colors.screen, 0.18, 0.1);

  // Overall reference envelope: 12 W × 17 H × 21 L inches.
  box('Main enclosure', [12, 12.25, 20.25], [0, 7, 0], orange, welder);
  box('Lower rail', [11.5, 1.15, 20.65], [0, 1.3, 0], graphite, welder);
  box('Front control panel', [10.7, 10.75, 0.65], [0, 7.25, 10.25], graphite, welder);
  box('Front upper inset', [9.3, 4.7, 0.22], [0, 9.6, 10.62], black, welder);
  box('LCD', [5.1, 2.65, 0.18], [0, 10.05, 10.78], screen, welder);

  cylinder('Main dial', 0.78, 0.45, [0, 7.15, 10.85], steel, welder);
  cylinder('Left dial', 0.45, 0.42, [-3.2, 7.15, 10.83], black, welder);
  cylinder('Right dial', 0.45, 0.42, [3.2, 7.15, 10.83], black, welder);

  cylinder('Negative port', 0.62, 0.5, [-2.9, 4.15, 10.86], black, welder);
  cylinder('Positive port', 0.62, 0.5, [0, 4.15, 10.86], orangeDark, welder);
  cylinder('Torch port', 0.72, 0.55, [3.1, 4.15, 10.88], steel, welder);

  box('Handle left mount', [1.05, 3.35, 2.2], [-4.4, 14.25, -2.5], graphite, welder);
  box('Handle right mount', [1.05, 3.35, 2.2], [4.4, 14.25, -2.5], graphite, welder);
  box('Carry handle', [9.85, 1.25, 2.25], [0, 16.35, -2.5], graphite, welder);

  for (const x of [-4.7, 4.7]) {
    for (const z of [-7.6, 7.4]) {
      box('Rubber foot', [1.25, 0.75, 1.5], [x, 0.38, z], black, welder);
    }
  }

  // Side-door seam and vents establish the product silhouette without claiming exact placement.
  box('Side door inset', [0.22, 9.8, 14.8], [-6.11, 7.15, -0.1], orangeDark, welder);
  for (let index = 0; index < 6; index += 1) {
    box(
      'Side vent',
      [0.24, 0.42, 5.4],
      [-6.25, 4.7 + index * 0.75, -2.1],
      black,
      welder,
      [0, 0, -0.06],
    );
  }

  return welder;
}

const welder = createWelder();
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

wireframeInput.addEventListener('change', () => {
  for (const meshMaterial of modelMaterials) {
    meshMaterial.wireframe = wireframeInput.checked;
  }
  renderer.render(scene, camera);
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
