import * as THREE from 'three';

type VectorTuple = readonly [number, number, number];

type Palette = Record<keyof typeof DEFAULT_PALETTE, THREE.ColorRepresentation>;

export type OmniProFrontOptions = {
  castShadow?: boolean;
  receiveShadow?: boolean;
  palette?: Partial<Palette>;
};

export type OmniProFrontModel = THREE.Group & {
  userData: THREE.Group['userData'] & {
    sourceEvidence: readonly string[];
    reconstructionClaim: string;
    forwardAxis: '+Z';
    partNames: typeof OMNIPRO_FRONT_PART_NAMES;
    materials: THREE.Material[];
    textures: THREE.Texture[];
    dispose: () => void;
  };
};

/**
 * Stable semantic names for controls and ports documented on page 8 of the
 * OmniPro 220 owner manual. Consumers can use these with getObjectByName().
 */
export const OMNIPRO_FRONT_PART_NAMES = Object.freeze({
  homeButton: 'front_panel_home_button',
  backButton: 'front_panel_back_button',
  lcd: 'front_panel_lcd_display',
  leftKnob: 'front_panel_left_knob',
  mainKnob: 'front_panel_control_knob',
  rightKnob: 'front_panel_right_knob',
  powerSwitch: 'front_panel_power_switch',
  migSpoolGunSocket: 'front_panel_mig_spool_gun_cable_socket',
  spoolGunGasOutlet: 'front_panel_spool_gun_gas_outlet',
  negativeSocket: 'front_panel_negative_socket',
  positiveSocket: 'front_panel_positive_socket',
  wireFeedPowerCable: 'front_panel_wire_feed_power_cable',
  storageCompartment: 'front_panel_storage_compartment',
});

const DEFAULT_PALETTE = Object.freeze({
  orange: 0xe85b18,
  orangeDark: 0x9d3410,
  graphite: 0x202326,
  graphiteLight: 0x3b4044,
  black: 0x08090a,
  bezel: 0x111416,
  rubber: 0x151719,
  steel: 0xaeb4b6,
  steelDark: 0x555c60,
  screen: 0x8ec9cf,
  screenDark: 0x17383d,
  white: 0xf2f0e8,
});

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const r = Math.min(radius, halfWidth, halfHeight);
  const shape = new THREE.Shape();

  shape.moveTo(-halfWidth + r, -halfHeight);
  shape.lineTo(halfWidth - r, -halfHeight);
  shape.quadraticCurveTo(halfWidth, -halfHeight, halfWidth, -halfHeight + r);
  shape.lineTo(halfWidth, halfHeight - r);
  shape.quadraticCurveTo(halfWidth, halfHeight, halfWidth - r, halfHeight);
  shape.lineTo(-halfWidth + r, halfHeight);
  shape.quadraticCurveTo(-halfWidth, halfHeight, -halfWidth, halfHeight - r);
  shape.lineTo(-halfWidth, -halfHeight + r);
  shape.quadraticCurveTo(-halfWidth, -halfHeight, -halfWidth + r, -halfHeight);

  return shape;
}

function roundedBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
  bevel = 0.06,
): THREE.ExtrudeGeometry {
  const geometry = new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
    depth: Math.max(0.01, depth - bevel * 2),
    bevelEnabled: bevel > 0,
    bevelSegments: 3,
    steps: 1,
    bevelSize: bevel,
    bevelThickness: bevel,
    curveSegments: 8,
  });
  geometry.center();
  geometry.computeVertexNormals();
  return geometry;
}

function scallopedGeometry(
  radius: number,
  depth: number,
  scallops = 10,
  recess = 0.12,
): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();
  const pointCount = scallops * 2;

  for (let index = 0; index < pointCount; index += 1) {
    const angle = Math.PI / 2 + (index / pointCount) * Math.PI * 2;
    const pointRadius = radius * (index % 2 === 0 ? 1 : 1 - recess);
    const x = Math.cos(angle) * pointRadius;
    const y = Math.sin(angle) * pointRadius;
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  }
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelSegments: 2,
    bevelSize: 0.035,
    bevelThickness: 0.035,
    curveSegments: 2,
  });
  geometry.translate(0, 0, -depth / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function triangleGeometry(width: number, height: number): THREE.ShapeGeometry {
  const shape = new THREE.Shape();
  shape.moveTo(0, height / 2);
  shape.lineTo(-width / 2, -height / 2);
  shape.lineTo(width / 2, -height / 2);
  shape.closePath();
  return new THREE.ShapeGeometry(shape);
}

function createCanvasLabel(
  text: string,
  foreground: string,
  background: string | null,
  fontWeight = 700,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.clearRect(0, 0, canvas.width, canvas.height);
  if (background) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  context.fillStyle = foreground;
  context.font = `${fontWeight} 72px Arial, sans-serif`;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2 + 3);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

/**
 * Creates a source-backed OmniPro 220 front/exterior model.
 *
 * Evidence used for this milestone:
 * - files/product.webp: orange/graphite enclosure, rounded protective fascia,
 *   tubular guards, carry handle, and front-depth proportions.
 * - owner-manual.pdf page 8: documented control names, shapes, and placement.
 *
 * Coordinate system follows Three.js convention: Y is up and +Z is front.
 * Model units are approximately inch-scaled for the viewer, but the supplied
 * image and manual page do not establish physical dimensions or tolerances.
 * Unsupported rear detail is intentionally omitted.
 *
 * This is a source-faithful instructional reconstruction, not an exact twin.
 * Find controls with getObjectByName(), and call root.userData.dispose() when
 * permanently removing it.
 */
export function createOmniProFront(options: OmniProFrontOptions = {}): OmniProFrontModel {
  const {
    castShadow = true,
    receiveShadow = true,
    palette: paletteOverrides = {},
  } = options;
  const palette: Palette = { ...DEFAULT_PALETTE, ...paletteOverrides };
  const materials: THREE.Material[] = [];
  const textures: THREE.Texture[] = [];

  const material = (
    color: THREE.ColorRepresentation,
    roughness = 0.68,
    metalness = 0.08,
    extra: THREE.MeshStandardMaterialParameters = {},
  ): THREE.MeshStandardMaterial => {
    const nextMaterial = new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness,
      ...extra,
    });
    materials.push(nextMaterial);
    return nextMaterial;
  };

  const orange = material(palette.orange, 0.48, 0.14);
  const orangeDark = material(palette.orangeDark, 0.56, 0.14);
  const graphite = material(palette.graphite, 0.6, 0.22);
  const graphiteLight = material(palette.graphiteLight, 0.48, 0.3);
  const black = material(palette.black, 0.72, 0.1);
  const bezel = material(palette.bezel, 0.55, 0.16);
  const rubber = material(palette.rubber, 0.92, 0.01);
  const steel = material(palette.steel, 0.28, 0.82);
  const steelDark = material(palette.steelDark, 0.36, 0.68);
  const screen = material(palette.screen, 0.17, 0.08, {
    emissive: palette.screenDark,
    emissiveIntensity: 0.35,
  });
  const screenDark = material(palette.screenDark, 0.3, 0.12);
  const white = material(palette.white, 0.62, 0.03);

  const root = new THREE.Group() as OmniProFrontModel;
  root.name = 'OmniPro 220 front exterior';
  root.userData.sourceEvidence = Object.freeze([
    'files/product.webp',
    'files/owner-manual.pdf#page=8',
  ]);
  root.userData.reconstructionClaim = 'Source-faithful instructional reconstruction, not an exact digital twin.';
  root.userData.forwardAxis = '+Z';

  const addMesh = (
    name: string,
    geometry: THREE.BufferGeometry,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    position: VectorTuple = [0, 0, 0],
    rotation: VectorTuple = [0, 0, 0],
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(geometry, meshMaterial);
    mesh.name = name;
    mesh.position.set(...position);
    mesh.rotation.set(...rotation);
    mesh.castShadow = castShadow;
    mesh.receiveShadow = receiveShadow;
    parent.add(mesh);
    return mesh;
  };

  const addBox = (
    name: string,
    size: VectorTuple,
    position: VectorTuple,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    rotation: VectorTuple = [0, 0, 0],
  ): THREE.Mesh => addMesh(
    name,
    new THREE.BoxGeometry(...size),
    meshMaterial,
    parent,
    position,
    rotation,
  );

  const addRoundedBox = (
    name: string,
    size: VectorTuple,
    radius: number,
    position: VectorTuple,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    bevel = 0.06,
  ): THREE.Mesh => addMesh(
    name,
    roundedBoxGeometry(size[0], size[1], size[2], radius, bevel),
    meshMaterial,
    parent,
    position,
  );

  const addCylinder = (
    name: string,
    radius: number,
    depth: number,
    position: VectorTuple,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    segments = 32,
    rotation: VectorTuple = [Math.PI / 2, 0, 0],
  ): THREE.Mesh => addMesh(
    name,
    new THREE.CylinderGeometry(radius, radius, depth, segments),
    meshMaterial,
    parent,
    position,
    rotation,
  );

  const addTube = (
    name: string,
    points: VectorTuple[],
    radius: number,
    meshMaterial: THREE.Material,
    parent: THREE.Object3D,
    closed = false,
  ): THREE.Mesh => {
    const curve = new THREE.CatmullRomCurve3(points.map((point) => new THREE.Vector3(...point)));
    const mesh = addMesh(
      name,
      new THREE.TubeGeometry(curve, Math.max(16, points.length * 10), radius, 10, closed),
      meshMaterial,
      parent,
    );
    return mesh;
  };

  const addLabel = (
    name: string,
    text: string,
    size: readonly [number, number],
    position: VectorTuple,
    parent: THREE.Object3D,
    labelOptions: {
      foreground?: string;
      background?: string | null;
      fontWeight?: number;
    } = {},
  ): THREE.Mesh => {
    const {
      foreground = '#f2f0e8',
      background = null,
      fontWeight = 700,
    } = labelOptions;
    const texture = createCanvasLabel(text, foreground, background, fontWeight);
    let labelMaterial: THREE.Material;
    if (texture) {
      textures.push(texture);
      labelMaterial = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: background === null,
        alphaTest: background === null ? 0.08 : 0,
        depthWrite: false,
        toneMapped: false,
        side: THREE.DoubleSide,
      });
      materials.push(labelMaterial);
    } else {
      labelMaterial = white;
    }
    const label = addMesh(name, new THREE.PlaneGeometry(size[0], size[1]), labelMaterial, parent, position);
    label.castShadow = false;
    label.receiveShadow = false;
    label.renderOrder = 2;
    label.userData.text = text;
    return label;
  };

  const createSemanticGroup = (
    name: string,
    parent: THREE.Object3D,
    position: VectorTuple,
  ): THREE.Group => {
    const group = new THREE.Group();
    group.name = name;
    group.position.set(...position);
    group.userData.documentedOn = 'owner-manual page 8';
    parent.add(group);
    return group;
  };

  // Orange enclosure and shallow side detail establish the product silhouette.
  // The rear remains a plain shell because the supplied page documents the front only.
  const enclosure = new THREE.Group();
  enclosure.name = 'Exterior enclosure';
  root.add(enclosure);
  addRoundedBox('Orange main shell', [11.72, 13.6, 20.15], 0.72, [0, 7.7, 0], orange, enclosure, 0.1);
  addRoundedBox('Graphite lower chassis', [11.82, 2.15, 20.45], 0.42, [0, 1.35, 0], graphite, enclosure, 0.08);
  addBox('Left side break line', [0.08, 9.7, 14.8], [-5.9, 8, -0.8], orangeDark, enclosure);
  addBox('Right side break line', [0.08, 9.7, 14.8], [5.9, 8, -0.8], orangeDark, enclosure);

  for (const side of [-1, 1]) {
    const sidePanel = new THREE.Group();
    sidePanel.name = side < 0 ? 'Left side panel detail' : 'Right side panel detail';
    enclosure.add(sidePanel);
    for (let index = 0; index < 5; index += 1) {
      addRoundedBox(
        'Side cooling slot',
        [0.09, 0.26, 4.8],
        0.08,
        [side * 5.91, 5.45 + index * 0.62, -2.1],
        black,
        sidePanel,
        0.02,
      );
    }
  }

  // Top carry handle and its two molded uprights, visible in both references.
  const handle = new THREE.Group();
  handle.name = 'Carry handle';
  root.add(handle);
  addRoundedBox('Handle left mount', [1.22, 3.15, 2.55], 0.42, [-4.35, 14.4, -2.2], graphite, handle, 0.08);
  addRoundedBox('Handle right mount', [1.22, 3.15, 2.55], 0.42, [4.35, 14.4, -2.2], graphite, handle, 0.08);
  addRoundedBox('Handle grip', [9.25, 1.18, 2.35], 0.43, [0, 16.12, -2.2], graphite, handle, 0.08);
  addRoundedBox('Handle grip inset', [6.9, 0.24, 0.15], 0.08, [0, 16.24, -1.0], graphiteLight, handle, 0.025);

  // Front fascia is stepped forward from the orange shell and protected by tubes.
  const front = new THREE.Group();
  front.name = 'Front assembly';
  root.add(front);
  addRoundedBox('Front orange surround', [11.35, 12.15, 0.72], 0.74, [0, 8.15, 10.19], orange, front, 0.08);
  addRoundedBox('Upper fascia rim', [10.45, 6.62, 0.42], 0.5, [0, 11.42, 10.62], graphiteLight, front, 0.045);
  addRoundedBox('Upper black fascia', [10.08, 6.27, 0.34], 0.42, [0, 11.42, 10.86], black, front, 0.035);
  addRoundedBox('Lower equipment bay rim', [10.56, 3.75, 0.46], 0.52, [0, 6.55, 10.64], graphite, front, 0.055);
  addRoundedBox('Lower equipment bay face', [10.18, 3.4, 0.35], 0.42, [0, 6.55, 10.9], black, front, 0.035);
  addRoundedBox('Bottom connector fascia', [10.28, 2.05, 0.42], 0.72, [0, 3.35, 10.72], black, front, 0.045);

  // Molded outer guards follow the manual drawing instead of a rectangular cage.
  const guards = new THREE.Group();
  guards.name = 'Tubular front guards';
  front.add(guards);
  addTube('Left tubular guard', [
    [-5.45, 2.1, 10.96],
    [-5.78, 2.35, 10.96],
    [-5.83, 4.8, 10.96],
    [-5.78, 9.4, 10.96],
    [-5.72, 14.95, 10.96],
    [-5.25, 15.55, 10.94],
    [-4.55, 15.72, 10.9],
  ], 0.24, graphite, guards);
  addTube('Right tubular guard', [
    [5.45, 2.1, 10.96],
    [5.78, 2.35, 10.96],
    [5.83, 4.8, 10.96],
    [5.78, 9.4, 10.96],
    [5.72, 14.95, 10.96],
    [5.25, 15.55, 10.94],
    [4.55, 15.72, 10.9],
  ], 0.24, graphite, guards);
  addTube('Upper tubular bridge', [
    [-4.6, 15.72, 10.9],
    [-2.4, 15.82, 10.91],
    [0, 15.84, 10.92],
    [2.4, 15.82, 10.91],
    [4.6, 15.72, 10.9],
  ], 0.24, graphite, guards);
  addTube('Lower tubular bridge', [
    [-5.42, 2.1, 10.96],
    [-3.2, 1.76, 11.0],
    [0, 1.68, 11.02],
    [3.2, 1.76, 11.0],
    [5.42, 2.1, 10.96],
  ], 0.24, graphite, guards);
  for (const side of [-1, 1]) {
    addRoundedBox(
      side < 0 ? 'Left lower bumper block' : 'Right lower bumper block',
      [1.15, 0.92, 1.15],
      0.24,
      [side * 5.32, 2.48, 10.65],
      graphite,
      guards,
      0.055,
    );
  }

  // Browser-rendered labels use canvas textures; headless consumers retain the
  // same planes and text metadata without requiring a DOM.
  const branding = new THREE.Group();
  branding.name = 'Branding and front labels';
  front.add(branding);
  addLabel('VULCAN branding', 'VULCAN', [2.35, 0.5], [-3.72, 14.02, 11.07], branding, { fontWeight: 900 });
  addLabel('OMNIPRO 220 model badge', 'OMNIPRO 220', [2.05, 0.48], [3.62, 14.02, 11.07], branding, { fontWeight: 800 });
  addLabel('Lower VULCAN branding', 'VULCAN', [4.15, 0.72], [0, 8.16, 11.17], branding, { fontWeight: 900 });

  // LCD and square Home/Back push buttons.
  const lcd = createSemanticGroup(OMNIPRO_FRONT_PART_NAMES.lcd, front, [0, 12.55, 11.08]);
  addRoundedBox('LCD outer bezel', [5.08, 2.55, 0.22], 0.08, [0, 0, 0], steelDark, lcd, 0.025);
  addRoundedBox('LCD inner bezel', [4.78, 2.27, 0.16], 0.045, [0, 0, 0.16], bezel, lcd, 0.018);
  addRoundedBox('LCD glass', [4.53, 2.03, 0.11], 0.025, [0, 0, 0.27], screen, lcd, 0.01);
  addBox('LCD lower reflection', [4.25, 0.1, 0.025], [0, -0.76, 0.34], screenDark, lcd);

  const createPushButton = (semanticName: string, x: number, labelText: string): THREE.Group => {
    const button = createSemanticGroup(semanticName, front, [x, 12.58, 11.12]);
    addRoundedBox('Square button surround', [0.82, 0.82, 0.18], 0.08, [0, 0, 0], bezel, button, 0.025);
    addRoundedBox('Square push button cap', [0.59, 0.59, 0.2], 0.045, [0, 0, 0.14], graphiteLight, button, 0.02);
    addLabel(`${labelText} button label`, labelText.toUpperCase(), [0.92, 0.22], [0, -0.65, 0.19], button, { fontWeight: 700 });
    button.userData.controlType = 'momentary square push button';
    return button;
  };
  createPushButton(OMNIPRO_FRONT_PART_NAMES.homeButton, -3.88, 'Home');
  createPushButton(OMNIPRO_FRONT_PART_NAMES.backButton, 3.88, 'Back');

  const createKnob = (
    semanticName: string,
    x: number,
    y: number,
    radius: number,
    pointerAngle = 0,
  ): THREE.Group => {
    const knob = createSemanticGroup(semanticName, front, [x, y, 11.16]);
    knob.userData.controlType = 'rotary encoder';
    knob.userData.pointerAngleRadians = pointerAngle;
    addCylinder('Knob mounting ring', radius * 1.12, 0.12, [0, 0, -0.03], graphiteLight, knob, 40);
    const grip = addMesh(
      'Scalloped knob grip',
      scallopedGeometry(radius, 0.34, radius > 0.6 ? 12 : 10, 0.14),
      rubber,
      knob,
      [0, 0, 0.17],
      [0, 0, pointerAngle],
    );
    grip.userData.shape = 'scalloped';
    addCylinder('Knob face', radius * 0.66, 0.08, [0, 0, 0.39], graphite, knob, 40);
    const pointer = addMesh(
      'Orange triangular pointer',
      triangleGeometry(radius * 0.72, radius * 0.75),
      orange,
      knob,
      [0, -radius * 0.05, 0.45],
      [0, 0, pointerAngle],
    );
    pointer.userData.shape = 'triangular pointer';
    return knob;
  };
  createKnob(OMNIPRO_FRONT_PART_NAMES.leftKnob, -3.18, 9.56, 0.5, 0.06);
  createKnob(OMNIPRO_FRONT_PART_NAMES.mainKnob, 0, 9.48, 0.78, -0.05);
  createKnob(OMNIPRO_FRONT_PART_NAMES.rightKnob, 3.18, 9.56, 0.5, -0.08);
  addLabel('Left knob amp label', 'A', [0.34, 0.22], [-4.16, 9.57, 11.18], branding);
  addLabel('Right knob volt label', 'V', [0.34, 0.22], [4.16, 9.57, 11.18], branding);

  // Recessed MIG/Spool Gun socket cavity at the lower left.
  const migSocket = createSemanticGroup(
    OMNIPRO_FRONT_PART_NAMES.migSpoolGunSocket,
    front,
    [-3.55, 6.55, 11.15],
  );
  migSocket.userData.connectorType = 'MIG / Spool Gun cable socket';
  addRoundedBox('MIG socket recessed cavity', [2.55, 2.75, 0.24], 0.43, [0, 0, -0.13], bezel, migSocket, 0.035);
  addRoundedBox('MIG socket cavity lip', [2.2, 2.42, 0.12], 0.34, [0, 0, 0.05], graphiteLight, migSocket, 0.025);
  addRoundedBox('MIG socket cavity shadow', [1.84, 2.08, 0.12], 0.26, [0, 0, 0.14], black, migSocket, 0.02);
  addCylinder('MIG connector metal collar', 0.64, 0.42, [0, 0.03, 0.38], steel, migSocket, 40);
  addCylinder('MIG connector black face', 0.47, 0.1, [0, 0.03, 0.67], rubber, migSocket, 40);
  addCylinder('MIG connector center', 0.17, 0.12, [0, 0.03, 0.78], steelDark, migSocket, 24);
  for (let index = 0; index < 4; index += 1) {
    const angle = (index / 4) * Math.PI * 2 + Math.PI / 4;
    addCylinder(
      'MIG connector pin',
      0.055,
      0.04,
      [Math.cos(angle) * 0.29, Math.sin(angle) * 0.29 + 0.03, 0.77],
      steel,
      migSocket,
      12,
    );
  }

  // Center rocker switch with inset I/O markings.
  const powerSwitch = createSemanticGroup(OMNIPRO_FRONT_PART_NAMES.powerSwitch, front, [0, 6.55, 11.18]);
  powerSwitch.userData.controlType = 'rocker switch';
  addRoundedBox('Power switch mounting frame', [1.32, 1.84, 0.22], 0.12, [0, 0, 0], black, powerSwitch, 0.03);
  const rocker = addRoundedBox('Power rocker', [0.92, 1.42, 0.24], 0.09, [0, 0, 0.19], graphiteLight, powerSwitch, 0.025);
  rocker.rotation.x = -0.08;
  addBox('Power I mark', [0.08, 0.24, 0.035], [0, 0.43, 0.37], white, powerSwitch);
  addMesh('Power O mark', new THREE.TorusGeometry(0.095, 0.025, 8, 20), white, powerSwitch, [0, -0.43, 0.38]);

  // The right lower cavity is explicitly the storage compartment on page 8.
  const storage = createSemanticGroup(
    OMNIPRO_FRONT_PART_NAMES.storageCompartment,
    front,
    [3.47, 6.55, 11.15],
  );
  storage.userData.access = 'open front louvered cavity';
  addRoundedBox('Storage cavity recess', [3.25, 2.76, 0.24], 0.34, [0, 0, -0.13], bezel, storage, 0.03);
  addRoundedBox('Storage cavity shadow', [2.94, 2.44, 0.11], 0.23, [0, 0, 0.05], black, storage, 0.02);
  for (let index = 0; index < 6; index += 1) {
    addRoundedBox(
      'Storage compartment louver',
      [2.85, 0.18, 0.22],
      0.06,
      [0, 0.86 - index * 0.34, 0.25],
      graphiteLight,
      storage,
      0.018,
    );
  }
  addBox('Storage cavity inner floor', [2.7, 0.45, 0.35], [0, -1.02, 0.12], graphite, storage, [-0.23, 0, 0]);

  // Bottom connector row: gas outlet, two DINSE sockets, and wire-feed lead.
  const gasOutlet = createSemanticGroup(
    OMNIPRO_FRONT_PART_NAMES.spoolGunGasOutlet,
    front,
    [-4.02, 3.34, 11.19],
  );
  gasOutlet.userData.connectorType = 'Spool Gun gas quick-connect';
  addCylinder('Gas outlet scalloped collar', 0.66, 0.25, [0, 0, 0], graphiteLight, gasOutlet, 36);
  addMesh('Gas outlet grip ring', scallopedGeometry(0.61, 0.22, 10, 0.14), steel, gasOutlet, [0, 0, 0.18]);
  addCylinder('Gas outlet inner ring', 0.34, 0.24, [0, 0, 0.42], black, gasOutlet, 32);
  addCylinder('Gas outlet bore', 0.17, 0.06, [0, 0, 0.58], steelDark, gasOutlet, 24);

  const createDinseSocket = (
    semanticName: string,
    x: number,
    polarity: 'negative' | 'positive',
  ): THREE.Group => {
    const socket = createSemanticGroup(semanticName, front, [x, 3.34, 11.18]);
    socket.userData.connectorType = 'DINSE welding socket';
    socket.userData.polarity = polarity;
    addCylinder('DINSE mounting boss', 0.69, 0.18, [0, 0, -0.03], graphiteLight, socket, 40);
    addMesh('DINSE hex collar', new THREE.CylinderGeometry(0.55, 0.55, 0.23, 6), steel, socket, [0, 0, 0.17], [Math.PI / 2, 0, 0]);
    addCylinder('DINSE insulating ring', 0.4, 0.22, [0, 0, 0.38], rubber, socket, 36);
    addCylinder('DINSE socket bore', 0.23, 0.08, [0, 0, 0.54], black, socket, 28);
    addCylinder('DINSE key slot', 0.07, 0.045, [0.26, 0.13, 0.58], black, socket, 12);
    return socket;
  };
  createDinseSocket(OMNIPRO_FRONT_PART_NAMES.negativeSocket, -1.25, 'negative');
  createDinseSocket(OMNIPRO_FRONT_PART_NAMES.positiveSocket, 3.8, 'positive');
  addBox('Negative polarity bar', [0.46, 0.08, 0.04], [-1.25, 4.24, 11.33], white, branding);
  addBox('Positive polarity horizontal', [0.48, 0.08, 0.04], [3.8, 4.24, 11.33], white, branding);
  addBox('Positive polarity vertical', [0.08, 0.48, 0.04], [3.8, 4.24, 11.33], white, branding);

  const wireFeedCable = createSemanticGroup(
    OMNIPRO_FRONT_PART_NAMES.wireFeedPowerCable,
    front,
    [1.35, 3.25, 11.18],
  );
  wireFeedCable.userData.connectorType = 'fixed wire-feed power lead';
  addCylinder('Wire-feed cable gland', 0.48, 0.26, [0, 0, 0], graphiteLight, wireFeedCable, 36);
  addMesh('Wire-feed gland nut', new THREE.CylinderGeometry(0.38, 0.38, 0.24, 8), steelDark, wireFeedCable, [0, 0, 0.22], [Math.PI / 2, 0, 0]);
  addCylinder('Wire-feed cable entry', 0.23, 0.18, [0, 0, 0.43], rubber, wireFeedCable, 28);
  addTube('Wire-feed power cable lead', [
    [0, 0, 0.52],
    [0.1, -0.22, 0.82],
    [0.25, -0.55, 1.06],
    [0.28, -1.08, 1.2],
    [0.08, -1.55, 1.12],
  ], 0.19, rubber, wireFeedCable);

  // Visible fasteners and feet support scale without inventing rear controls.
  const fasteners = new THREE.Group();
  fasteners.name = 'Front fascia fasteners';
  front.add(fasteners);
  for (const x of [-4.72, 4.72]) {
    for (const y of [8.72, 14.12]) {
      addCylinder('Fascia screw', 0.14, 0.05, [x, y, 11.12], steelDark, fasteners, 20);
      addBox('Fascia screw slot', [0.17, 0.035, 0.025], [x, y, 11.17], black, fasteners, [0, 0, x * y > 0 ? 0.45 : -0.45]);
    }
  }
  const feet = new THREE.Group();
  feet.name = 'Rubber feet';
  root.add(feet);
  for (const x of [-4.75, 4.75]) {
    for (const z of [-7.65, 7.8]) {
      addRoundedBox('Rubber foot', [1.25, 0.72, 1.5], 0.18, [x, 0.36, z], rubber, feet, 0.04);
    }
  }

  root.userData.partNames = OMNIPRO_FRONT_PART_NAMES;
  root.userData.materials = materials;
  root.userData.textures = textures;
  root.userData.dispose = () => {
    const disposedGeometries = new Set<THREE.BufferGeometry>();
    root.traverse((object) => {
      if (object instanceof THREE.Mesh && !disposedGeometries.has(object.geometry)) {
        object.geometry.dispose();
        disposedGeometries.add(object.geometry);
      }
    });
    for (const texture of textures) texture.dispose();
    for (const meshMaterial of materials) meshMaterial.dispose();
  };

  return root;
}

export default createOmniProFront;
