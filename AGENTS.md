# Repository agent instructions

## Evidence-backed product reconstruction

These instructions apply whenever work touches a product model, product viewer, visual manual, digital twin, or related source assets.

1. Read [`docs/reconstruction/README.md`](docs/reconstruction/README.md) before changing geometry, labels, semantic parts, or fidelity claims.
2. Treat evidence and semantic manifests as the source of truth. A Three.js file, Blender file, or exported GLB is an implementation artifact, not evidence.
3. Do not invent unsupported controls, ports, dimensions, labels, vents, fasteners, or rear/interior details.
4. Never call a model exact, dimensionally faithful, or manufacturing accurate unless the relevant dimensions come from CAD or recorded physical measurements with tolerances.
5. Record a source before using a fact from it. Record measurements separately from general source metadata.
6. Give every instructional or interactive component a stable semantic ID and a traceable evidence reference.
7. Separate confidence in identity, placement, geometry, and appearance. Do not use one broad confidence label to imply all four.
8. Update the evidence and semantic manifests before, or in the same commit as, geometry that depends on them.
9. Run the model gates and the headless browser review described in the reconstruction runbook before claiming completion.
10. State unresolved views and inferred dimensions clearly in the handoff.

## Current OmniPro terminology

The current front-panel milestone should be described as a **source-faithful instructional reconstruction**. Its component identity and approximate front layout are supported by the owner's manual and product photography. Most component depths, diameters, radii, spacing, and construction tolerances remain inferred.

If `VISION.md` exists, use it for product direction and acceptance goals. Use the reconstruction runbook for the evidence-to-model procedure. If they conflict, stop and surface the conflict rather than silently weakening the fidelity standard.
