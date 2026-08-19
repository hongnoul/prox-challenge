"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { SceneCommand } from "@/lib/shared/contracts";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import productImage from "@/files/product.webp";
import {
  createOmniProFront,
  type OmniProFrontModel,
} from "@/lib/omnipro/create-omnipro-front";
import {
  omniProPartsManifest,
  type OmniProPart,
} from "@/lib/omnipro/manifest";

const evidenceLabels: Record<string, string> = {
  "ev-front-controls-p8": "Owner’s Manual p. 8",
  "ev-flux-dcen-p13": "Owner’s Manual p. 13",
  "ev-mig-dcep-p14": "Owner’s Manual p. 14",
  "ev-product-front": "supplied product photo",
};

const partsById = new Map(
  omniProPartsManifest.parts.map((part) => [part.id, part] as const),
);

type ViewerAction = "front" | "reset";
type ViewActions = Record<ViewerAction, () => void>;

type ModelAudit = {
  expectedPartCount: number;
  resolvedPartCount: number;
  resolvedPartIds: readonly string[];
  selectPart: (partId: string | null) => void;
};

declare global {
  interface Window {
    __OMNIPRO_MODEL_AUDIT__?: ModelAudit;
  }
}

function disposeMaterial(material: THREE.Material | THREE.Material[]): void {
  if (Array.isArray(material)) {
    material.forEach((item) => item.dispose());
    return;
  }
  material.dispose();
}

function evidenceSummary(part: OmniProPart): string {
  const sources = part.evidence_refs
    .map((reference) => evidenceLabels[reference] ?? reference)
    .join(" · ");
  return `${sources} · ${part.identity_confidence} identity · ${part.geometry_confidence} geometry`;
}

export type ProductTwinViewerProps = {
  selectedEntityId?: string | null;
  sceneCommands?: SceneCommand[];
  commandRevision?: number;
  onSelectEntity?: (entityId: string | null) => void;
};

export function ProductTwinViewer({
  selectedEntityId = null,
  sceneCommands = [],
  commandRevision = 0,
  onSelectEntity,
}: ProductTwinViewerProps) {
  const sceneHostRef = useRef<HTMLDivElement>(null);
  const onSelectEntityRef = useRef(onSelectEntity);
  const selectPartRef = useRef<(partId: string | null) => void>(() => undefined);
  const viewActionsRef = useRef<ViewActions>({
    front: () => undefined,
    reset: () => undefined,
  });
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [showReference, setShowReference] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    onSelectEntityRef.current = onSelectEntity;
  }, [onSelectEntity]);

  useEffect(() => {
    const host = sceneHostRef.current;
    if (!host) return;

    setLoadError(null);
    const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#121613");
    scene.fog = new THREE.Fog("#121613", 52, 105);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 200);
    const initialCameraPosition = host.clientWidth <= 680
      ? new THREE.Vector3(0, 14, 58)
      : new THREE.Vector3(-39, 28, 48);
    camera.position.copy(initialCameraPosition);

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: "high-performance",
      });
    } catch {
      setLoadError("The interactive model needs WebGL. The documented parts remain available below.");
      return;
    }

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    renderer.domElement.className = "product-twin-canvas";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "img");
    renderer.domElement.setAttribute(
      "aria-label",
      "Interactive front view of an instructional OmniPro 220 reconstruction",
    );
    renderer.domElement.setAttribute(
      "aria-describedby",
      "product-twin-instructions product-twin-selection",
    );
    host.append(renderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y";
    controls.enableDamping = !reducedMotionQuery.matches;
    controls.dampingFactor = 0.07;
    controls.minDistance = 25;
    controls.maxDistance = 75;
    controls.minAzimuthAngle = -Math.PI * 0.42;
    controls.maxAzimuthAngle = Math.PI * 0.42;
    controls.maxPolarAngle = Math.PI * 0.49;
    controls.target.set(0, 8, 0);

    const welder: OmniProFrontModel = createOmniProFront();
    const interactiveParts: THREE.Object3D[] = [];
    const resolvedPartIds: string[] = [];

    for (const part of omniProPartsManifest.parts) {
      let resolved = true;
      for (const objectName of part.expected_object_names) {
        const object = welder.getObjectByName(objectName);
        if (!object) {
          resolved = false;
          continue;
        }
        object.userData.partId = part.id;
        interactiveParts.push(object);
      }
      if (resolved) resolvedPartIds.push(part.id);
    }
    scene.add(welder);

    const floorMaterial = new THREE.MeshStandardMaterial({
      color: "#242a25",
      roughness: 1,
    });
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    const grid = new THREE.GridHelper(80, 40, "#4a534c", "#303831");
    grid.position.y = 0.015;
    const gridMaterial = grid.material as THREE.Material;
    gridMaterial.transparent = true;
    gridMaterial.opacity = 0.36;
    scene.add(grid);

    scene.add(new THREE.HemisphereLight("#f7f5ec", "#26302a", 1.8));

    const keyLight = new THREE.DirectionalLight("#fff4de", 4.2);
    keyLight.position.set(18, 32, 24);
    keyLight.castShadow = true;
    keyLight.shadow.mapSize.set(2048, 2048);
    keyLight.shadow.camera.left = -28;
    keyLight.shadow.camera.right = 28;
    keyLight.shadow.camera.top = 28;
    keyLight.shadow.camera.bottom = -28;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight("#9bc8d8", 1.8);
    rimLight.position.set(-22, 14, -18);
    scene.add(rimLight);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerStart: { x: number; y: number } | null = null;
    let selectedPartHelper: THREE.Box3Helper | null = null;
    let animationFrame = 0;
    let framesRemaining = 0;
    let disposed = false;

    const renderFrame = () => {
      animationFrame = 0;
      if (disposed) return;
      controls.update();
      renderer.render(scene, camera);
      framesRemaining -= 1;
      if (framesRemaining > 0) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    const requestRender = (frames = 1) => {
      framesRemaining = Math.max(framesRemaining, frames);
      if (animationFrame === 0) {
        animationFrame = window.requestAnimationFrame(renderFrame);
      }
    };

    const clearSelectionHelper = () => {
      if (!selectedPartHelper) return;
      scene.remove(selectedPartHelper);
      selectedPartHelper.geometry.dispose();
      disposeMaterial(selectedPartHelper.material);
      selectedPartHelper = null;
    };

    const selectPart = (partId: string | null) => {
      clearSelectionHelper();
      const part = partId ? partsById.get(partId) ?? null : null;
      const objectName = part?.expected_object_names[0];
      const object = objectName ? welder.getObjectByName(objectName) : null;

      if (part && object) {
        selectedPartHelper = new THREE.Box3Helper(
          new THREE.Box3().setFromObject(object),
          new THREE.Color("#f05a28"),
        );
        selectedPartHelper.name = `Selection: ${part.manual_name}`;
        scene.add(selectedPartHelper);
        setSelectedPartId(part.id);
        onSelectEntityRef.current?.(part.id);
      } else {
        setSelectedPartId(null);
        onSelectEntityRef.current?.(null);
      }
      requestRender(1);
    };
    selectPartRef.current = selectPart;

    const partFromObject = (object: THREE.Object3D): OmniProPart | null => {
      let current: THREE.Object3D | null = object;
      while (current && current !== welder) {
        const partId = current.userData.partId;
        if (typeof partId === "string") return partsById.get(partId) ?? null;
        current = current.parent;
      }
      return null;
    };

    const resetView = () => {
      camera.position.copy(initialCameraPosition);
      controls.target.set(0, 8, 0);
      controls.update();
      requestRender(reducedMotionQuery.matches ? 1 : 18);
    };

    const frontView = () => {
      camera.position.set(0, 8.2, 43);
      controls.target.set(0, 8, 0);
      controls.update();
      requestRender(reducedMotionQuery.matches ? 1 : 18);
    };

    viewActionsRef.current = { front: frontView, reset: resetView };

    const rotateCamera = (thetaDelta: number, phiDelta: number, scale = 1) => {
      const offset = camera.position.clone().sub(controls.target);
      const spherical = new THREE.Spherical().setFromVector3(offset);
      spherical.theta = THREE.MathUtils.clamp(
        spherical.theta + thetaDelta,
        controls.minAzimuthAngle,
        controls.maxAzimuthAngle,
      );
      spherical.phi = THREE.MathUtils.clamp(
        spherical.phi + phiDelta,
        0.12,
        controls.maxPolarAngle,
      );
      spherical.radius = THREE.MathUtils.clamp(
        spherical.radius * scale,
        controls.minDistance,
        controls.maxDistance,
      );
      camera.position.copy(controls.target).add(offset.setFromSpherical(spherical));
      camera.lookAt(controls.target);
      controls.update();
      requestRender(reducedMotionQuery.matches ? 1 : 18);
    };

    const handlePointerDown = (event: PointerEvent) => {
      pointerStart = { x: event.clientX, y: event.clientY };
    };

    const handlePointerUp = (event: PointerEvent) => {
      if (
        !pointerStart
        || Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y) > 5
      ) {
        pointerStart = null;
        return;
      }
      pointerStart = null;
      const bounds = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -((event.clientY - bounds.top) / bounds.height) * 2 + 1;
      raycaster.setFromCamera(pointer, camera);
      const hit = raycaster.intersectObjects(interactiveParts, true)[0];
      selectPart(hit ? partFromObject(hit.object)?.id ?? null : null);
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      const handledKeys = new Set([
        "ArrowLeft",
        "ArrowRight",
        "ArrowUp",
        "ArrowDown",
        "+",
        "=",
        "-",
        "_",
        "Home",
        "f",
        "F",
      ]);
      if (!handledKeys.has(event.key)) return;
      event.preventDefault();

      switch (event.key) {
        case "ArrowLeft":
          rotateCamera(-0.12, 0);
          break;
        case "ArrowRight":
          rotateCamera(0.12, 0);
          break;
        case "ArrowUp":
          rotateCamera(0, -0.08);
          break;
        case "ArrowDown":
          rotateCamera(0, 0.08);
          break;
        case "+":
        case "=":
          rotateCamera(0, 0, 0.9);
          break;
        case "-":
        case "_":
          rotateCamera(0, 0, 1.1);
          break;
        case "f":
        case "F":
          frontView();
          break;
        case "Home":
          resetView();
          break;
      }
    };

    const resize = () => {
      const width = Math.max(host.clientWidth, 1);
      const height = Math.max(host.clientHeight, 1);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setSize(width, height, false);
      requestRender(1);
    };

    const handleControlsChange = () => {
      requestRender(reducedMotionQuery.matches ? 1 : 18);
    };

    const handleReducedMotionChange = (event: MediaQueryListEvent) => {
      controls.enableDamping = !event.matches;
      controls.update();
      requestRender(event.matches ? 1 : 18);
    };

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("keydown", handleKeyDown);
    controls.addEventListener("change", handleControlsChange);
    reducedMotionQuery.addEventListener("change", handleReducedMotionChange);

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);
    resize();
    controls.update();
    requestRender(reducedMotionQuery.matches ? 1 : 18);
    setIsReady(true);

    const audit: ModelAudit = Object.freeze({
      expectedPartCount: omniProPartsManifest.parts.length,
      resolvedPartCount: resolvedPartIds.length,
      resolvedPartIds: Object.freeze([...resolvedPartIds]),
      selectPart,
    });
    window.__OMNIPRO_MODEL_AUDIT__ = audit;

    return () => {
      disposed = true;
      resizeObserver.disconnect();
      reducedMotionQuery.removeEventListener("change", handleReducedMotionChange);
      controls.removeEventListener("change", handleControlsChange);
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("keydown", handleKeyDown);
      if (animationFrame !== 0) window.cancelAnimationFrame(animationFrame);
      clearSelectionHelper();
      controls.dispose();
      scene.remove(welder, floor, grid);
      welder.userData.dispose();
      floor.geometry.dispose();
      floorMaterial.dispose();
      grid.geometry.dispose();
      disposeMaterial(grid.material);
      renderer.renderLists.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
      selectPartRef.current = () => undefined;
      viewActionsRef.current = {
        front: () => undefined,
        reset: () => undefined,
      };
      if (window.__OMNIPRO_MODEL_AUDIT__ === audit) {
        delete window.__OMNIPRO_MODEL_AUDIT__;
      }
    };
  }, []);

  useEffect(() => {
    selectPartRef.current(selectedEntityId);
  }, [selectedEntityId]);

  useEffect(() => {
    if (sceneCommands.length === 0) return;
    for (const command of sceneCommands) {
      if (command.type === "reset-scene") {
        viewActionsRef.current.reset();
      } else if (command.type === "animate-connection") {
        selectPartRef.current(command.toEntityId);
        viewActionsRef.current.front();
      } else if ("entityId" in command) {
        selectPartRef.current(command.entityId);
        if (command.type === "focus-part") viewActionsRef.current.front();
      }
    }
  }, [commandRevision, sceneCommands]);

  const selectedPart = selectedPartId ? partsById.get(selectedPartId) ?? null : null;

  return (
    <div className="product-twin-viewer" data-ready={isReady || undefined}>
      <div ref={sceneHostRef} className="product-twin-scene">
        {loadError ? <p className="product-twin-error">{loadError}</p> : null}
      </div>

      <div className="product-twin-controls" aria-label="3D view controls">
        <button type="button" onClick={() => viewActionsRef.current.front()}>
          Front view
        </button>
        <button type="button" onClick={() => viewActionsRef.current.reset()}>
          Reset view
        </button>
        <label>
          <input
            type="checkbox"
            checked={showReference}
            onChange={(event) => setShowReference(event.target.checked)}
          />
          Source photo
        </label>
      </div>

      <div className="product-twin-part-panel">
        <label htmlFor="product-twin-part-select">Inspect a documented part</label>
        <select
          id="product-twin-part-select"
          value={selectedPartId ?? ""}
          onChange={(event) => selectPartRef.current(event.target.value || null)}
        >
          <option value="">Select a front-panel part</option>
          {omniProPartsManifest.parts.map((part) => (
            <option key={part.id} value={part.id}>
              {part.manual_name}
            </option>
          ))}
        </select>

        <strong id="product-twin-selection">
          {selectedPart?.manual_name ?? "Thirteen source-bound controls and connections"}
        </strong>
        <span className="product-twin-evidence">
          {selectedPart
            ? evidenceSummary(selectedPart)
            : "Select in the model or use this menu. Names come from the owner’s manual."}
        </span>
        {selectedPart ? (
          <dl className="product-twin-confidence">
            <div>
              <dt>Identity</dt>
              <dd>{selectedPart.identity_confidence}</dd>
            </div>
            <div>
              <dt>Placement</dt>
              <dd>{selectedPart.placement_confidence}</dd>
            </div>
            <div>
              <dt>Geometry</dt>
              <dd>{selectedPart.geometry_confidence}</dd>
            </div>
            <div>
              <dt>Appearance</dt>
              <dd>{selectedPart.appearance_confidence}</dd>
            </div>
          </dl>
        ) : null}
        {selectedPart ? (
          <p className="product-twin-unresolved">
            <span>Still unresolved:</span> {selectedPart.unresolved.join(", ")}.
          </p>
        ) : null}
      </div>

      {showReference ? (
        <figure className="product-twin-reference">
          <Image
            src={productImage}
            alt="Supplied reference photograph of the Vulcan OmniPro 220"
            loading="eager"
            sizes="(max-width: 700px) 42vw, 17rem"
          />
          <figcaption>Supplied product photo · perspective reference, not a scale drawing</figcaption>
        </figure>
      ) : null}

      <p id="product-twin-instructions" className="product-twin-instructions">
        Drag to orbit · scroll or pinch to zoom · click a part to inspect · keyboard: arrows,
        plus/minus, F, Home
      </p>
    </div>
  );
}
