# Evidence-backed product reconstruction

This runbook defines how to turn photographs, manuals, measurements, and CAD into a traceable product model for a visual manual. It is intended for both human contributors and coding agents.

The goal is not to make an attractive approximation. The goal is to make every modeled claim inspectable: what the component is, where the information came from, how precise it is, and how it was verified.

## Relationship to product vision

`VISION.md` should explain why the product experience exists, who it serves, and what completion means. This runbook explains how product evidence becomes geometry and how fidelity claims are controlled.

Keep these responsibilities separate:

| Artifact | Responsibility |
| --- | --- |
| `VISION.md` | Product direction, user outcome, scope, and acceptance goals |
| `AGENTS.md` | Short mandatory working rules and links |
| This runbook | Evidence acquisition, reconstruction, validation, and handoff procedure |
| Evidence manifests | Machine-readable provenance and measurements |
| Semantic manifests | Canonical part identities and interactions |
| Model source | Geometry, materials, hierarchy, and animation implementation |
| Tests | Executable completeness, geometry, interaction, and rendering gates |

## Fidelity vocabulary

Use the narrowest accurate description.

### Source-faithful instructional reconstruction

Use this when component identity and visual placement are supported by manuals and photographs, but some physical dimensions are inferred. This is the correct description for the current OmniPro front-panel prototype.

### Dimensionally anchored reconstruction

Use this when the overall envelope is measured or comes from an authoritative specification, while smaller features are still inferred. Record the provenance of every anchor.

### Dimensionally faithful model

Use this only when all dimensions that matter to the intended use are measured or supplied by CAD and have explicit tolerances.

### Manufacturing-accurate model

Use this only with appropriate production CAD, drawings, materials, fasteners, interfaces, and tolerances. Photographs and consumer manuals cannot establish this standard.

A visually convincing render can still be dimensionally wrong. Never use visual polish as evidence of physical accuracy.

## Confidence is multidimensional

Do not store one broad `confidence: high` value. A component can have a certain identity and uncertain depth.

Record at least these fields independently:

| Field | Question |
| --- | --- |
| `identity_confidence` | Is this the correct named component? |
| `placement_confidence` | Is its position relative to the parent supported? |
| `geometry_confidence` | Are its dimensions and shape measured or inferred? |
| `appearance_confidence` | Are color, material, texture, and markings supported? |

Recommended values are `measured`, `corroborated`, `observed`, `inferred`, and `unresolved`. Use `measured` only with a measurement source and tolerance.

## Source authority matrix

Different evidence can support different claims.

| Source | Supports | Does not establish by itself |
| --- | --- | --- |
| Production CAD or engineering drawing | Shape, dimensions, interfaces, tolerances | Real-world wear, color variation, current production state |
| Caliper or tape measurement | The recorded property within its tolerance | Unmeasured geometry or hidden construction |
| Calibrated orthographic photograph | Silhouette and planar proportions within stated uncertainty | Hidden depth or perspective-free dimensions outside the calibration plane |
| Uncalibrated product photograph | Appearance, visible topology, approximate proportions | Exact size, depth, lens-independent spacing, hidden surfaces |
| Owner's manual diagram | Component identity, terminology, operational relationships | Scale, unless explicitly dimensioned and declared proportional |
| Product specification page | Published envelope, weight, ratings | Internal detail or component-level dimensions |
| Video frame | Additional visible state or angle | Exact dimensions without camera calibration |

If a manual says its diagrams are not proportional, never derive dimensions from those diagrams. They can still provide names, topology, and operational relationships.

## Recommended repository structure

Use the existing product slug when one exists. For this repository that slug is `omnipro`.

```text
VISION.md
AGENTS.md
docs/
  reconstruction/
    README.md
    validation-checklist.md
assets/
  omnipro/
    evidence/
      sources.json
      measurements.csv
      reference-views.json
    semantics/
      parts.json
    model/
      source/
      exports/
    validation/
      golden/
      reports/
tests/
  model/
    evidence.test.mjs
    semantics.test.mjs
    geometry.test.mjs
    interaction.test.mjs
scripts/
  check-model.mjs
```

Do not place durable procedure in a generic `research/` directory. Research is input. This runbook is an operating contract. Tests belong under `tests/` only when they execute a requirement.

## Data contracts

The schemas below are the target contract for new work. The session-local OmniPro prototype used an earlier, narrower schema. Do not treat that legacy shape as compliant merely because it can be parsed.

### `sources.json`

Record every source before depending on it.

```json
{
  "schema_version": 1,
  "product_id": "vulcan-omnipro-220",
  "sources": [
    {
      "id": "product-front-photo",
      "type": "product-image",
      "path": "product.webp",
      "sha256": "...",
      "captured_at": null,
      "source_url": null,
      "dimensions_px": { "width": 1200, "height": 1200 },
      "supports": ["front appearance", "visible component placement"],
      "limitations": ["uncalibrated perspective", "single view"]
    }
  ]
}
```

For web sources, record the canonical URL, access date, page title, publisher, and a local snapshot or content hash where permitted. A value copied from a web page without a recorded URL is an unresolved provenance gap.

### `measurements.csv`

Store atomic measurements, not prose or undocumented constants in model code.

```csv
part_id,property,value,unit,tolerance,method,source_id,confidence,notes
```

Add one row per atomic measurement. The header is intentionally shown without an example value so a synthetic number cannot be mistaken for product evidence.

Required columns:

- `part_id`
- `property`
- `value`
- `unit`
- `tolerance`
- `method`
- `source_id`
- `confidence`
- `notes`

Never convert an inferred pixel ratio into a measurement without recording the calibration, lens assumptions, and uncertainty.

### `reference-views.json`

Record the camera and landmarks used to compare the model with a source image.

```json
{
  "views": [
    {
      "id": "front-reference",
      "source_id": "front-orthographic-photo",
      "projection": "unresolved",
      "focal_length_equivalent_mm": null,
      "calibration": "unresolved",
      "landmarks": [],
      "holdout": false
    }
  ]
}
```

Reserve at least one useful view as a holdout. Do not tune geometry against every available image and then claim that those same images independently validate it.

### `parts.json`

Each instructional or interactive part needs a stable semantic record.

```json
{
  "id": "front-control-knob",
  "manual_name": "Control Knob",
  "parent_id": "front-upper-panel",
  "interaction_type": "rotary-encoder-with-push",
  "evidence_refs": ["owner-manual-page-8", "product-front-photo"],
  "expected_object_names": ["front_panel_control_knob"],
  "identity_confidence": "corroborated",
  "placement_confidence": "observed",
  "geometry_confidence": "inferred",
  "appearance_confidence": "observed",
  "unresolved": ["diameter", "projection depth", "detent count"]
}
```

Part IDs are API contracts. Do not rename them merely because the mesh topology changes.

## Reconstruction procedure

### 1. Define the intended use

Write down what the model must support before collecting geometry.

Examples:

- Identify a control in a visual manual.
- Demonstrate a cable connection.
- Animate opening the side door.
- Show service access to a wire-feed mechanism.
- Check whether a replacement part physically fits.

The intended use determines which dimensions are critical. An instructional hotspot can tolerate inferred screw depth. A fit check cannot.

### 2. Inventory and freeze source evidence

1. List every photograph, PDF, video, specification page, scan, and measurement session.
2. Preserve the original file where licensing permits.
3. Record file dimensions, page numbers, URLs, capture dates, and cryptographic hashes.
4. Record what each source supports and its limitations.
5. Detect contradictions before modeling.

Do not overwrite originals with cropped or color-corrected derivatives. Give derivatives their own IDs and link them to the original.

### 3. Extract semantics before geometry

Read the manual and create the canonical part inventory before opening the modeling code.

For every part:

1. Transcribe the authoritative name exactly.
2. Assign a stable ID.
3. Record the parent assembly.
4. Record its interaction or instructional purpose.
5. Link every supporting source.
6. Record unresolved questions.
7. Define the expected model object name.

This prevents a visually plausible model from omitting a functionally important control.

### 4. Extract dimensions and constraints

Classify each fact as one of:

- `measured`: CAD, drawing, caliper, ruler, or calibrated capture with tolerance.
- `published`: authoritative specification, with source and access date.
- `derived`: computed from measured facts, with the formula recorded.
- `inferred`: visually estimated from photographs or diagrams.
- `unresolved`: not supported enough to model confidently.

Choose one unit system for model source. Millimeters are preferred for physical reconstruction. Convert only at the data boundary and test the conversion.

Do not hide measurements inside Three.js literals, Blender modifiers, or shader code. Geometry code should consume named values from the measurement layer where practical.

### 5. Prepare reference views

For new physical capture:

- Photograph front, rear, both sides, top, and bottom.
- Capture the closed product and every instructional open state.
- Use a 50 to 70 mm full-frame equivalent lens when possible.
- Keep focus, exposure, white balance, and zoom fixed for a view set.
- Place a ruler, scale bar, or calibration target in the relevant plane.
- Capture close-ups of controls, ports, seams, labels, hinges, vents, and fasteners.
- Record caliper measurements for critical interfaces.
- Use a color target for material work.

If physical access is unavailable, mark reconstruction dimensions as inferred. More uncalibrated images improve corroboration but do not become exact measurements merely through quantity.

### 6. Establish coordinates and scale

Define and record:

- Up axis
- Forward axis
- Origin
- Units
- Nominal envelope
- Door hinge axes
- Control rotation axes
- Connector insertion axes

For Three.js, a practical convention is `Y` up and `+Z` front. Keep source modeling and exported files consistent or document the conversion.

Create the envelope and primary datum planes first. Then place parts relative to datums instead of tuning every coordinate independently.

### 7. Build geometry from large to small

Recommended order:

1. Overall enclosure and silhouette
2. Structural frames, guards, handles, and feet
3. Major panel recesses and openings
4. Controls and connectors
5. Hinges, seams, louvers, and fasteners
6. Labels, materials, and small surface detail
7. Internal assemblies and hidden states

For industrial products, use parametric hard-surface construction where possible:

- Rounded extrusions for sheet-metal and molded panels
- Curves or tubes for guards and cables
- Profile extrusions for knobs and connector collars
- Reusable generators for repeated controls
- Separate objects for parts that move, highlight, or receive instructions

Use photogrammetry as a curvature and scale reference when physical access permits. Do not ship a noisy raw scan as production geometry. Smooth black plastic, reflective screens, thin cables, and occluded interiors usually require manual reconstruction.

### 8. Bind semantics to geometry

Every name in a manifest's `expected_object_names` array must resolve to one model object or group.

Attach runtime metadata such as:

- Part ID
- Manual name
- Evidence references
- Confidence fields
- Interaction type
- Motion limits
- Source-supported states

Do not attach one semantic name to a whole facade if the user must select individual controls.

### 9. Implement interactions only after identity is stable

Examples include:

- Control selection and evidence display
- Knob rotation
- Button depression
- Cable insertion
- Door opening
- Exploded or service state

Interaction limits must come from evidence or be marked illustrative. Never imply that an arbitrary animation range is the real product's operating limit.

### 10. Validate in layers

Run the checks in [`validation-checklist.md`](validation-checklist.md).

At minimum:

1. Validate evidence references and source hashes.
2. Validate semantic completeness and unique IDs.
3. Validate that every expected object exists.
4. Validate finite geometry and plausible bounds.
5. Validate critical measured dimensions against tolerance.
6. Render canonical views and compare against references.
7. Test selection and instructional interactions.
8. Review desktop and mobile behavior in a headless browser.
9. Review at least one holdout view.
10. Report unresolved geometry and unsupported views.

A build passing is not a fidelity test. A visual screenshot passing is not a dimensional test. Both are required, and neither replaces evidence review.

### 11. Handoff with a coverage report

Every milestone handoff should state:

- Scope completed
- Parts represented
- Evidence used
- Measured dimensions
- Inferred dimensions
- Unsupported surfaces or states
- Automated tests run
- Canonical and holdout views reviewed
- Known discrepancies
- Next capture or modeling work

## OmniPro 220 front-panel case study

The investigation audited the following supplied evidence:

- `product.webp`, a 1200 by 1200 exterior product photograph
- `product-inside.webp`, a 1200 by 1200 open-compartment photograph
- Owner's Manual page 8 for front-panel terminology and layout
- Owner's Manual page 9 for interior terminology
- Owner's Manual page 14 for polarity and wire-feed cable relationships
- Owner's Manual page 16 for power-switch operation

The front geometry itself was based on `product.webp` and Owner's Manual page 8. Pages 14 and 16 only corroborated semantic relationships for the sockets, cable, and switch. `product-inside.webp` and page 9 were audited for a future interior milestone but were not used to construct the front geometry.

The manual diagrams supported semantics and relationships. They did not establish component dimensions. The exterior photograph supported visible shape, color, topology, and approximate proportions. It was not a calibrated orthographic image.

The prototype front milestone represented these 13 manual components:

1. Home Button
2. Back Button
3. Control Knob
4. Left Knob
5. LCD Display
6. Right Knob
7. Power Switch
8. Storage Compartment
9. MIG Gun / Spool Gun Cable Socket
10. Positive Socket
11. Spool Gun Gas Outlet
12. Negative Socket
13. Wire Feed Power Cable

The implementation used rounded extrusions for the enclosure and fascia, tube curves for guards and cable, scalloped extrusions for knobs, layered cylinders for ports, and canvas textures for large labels. Every documented component was a separate semantic Three.js group.

The nominal 12 inch wide by 17 inch high by 21 inch long envelope was recovered from the [official product listing linked by the repository](../../README.md#the-product) during the prototype investigation. The initial evidence manifest did not record that listing URL. Treat this as a provenance defect until the URL, access date, and snapshot are backfilled. Do not elevate the envelope to `measured` merely because the model gate checks it.

### Known prototype data-contract gaps

Future integration work should correct these rather than copying them forward:

- The initial semantic manifest used a single broad `confidence: high` field. Migrate it to separate identity, placement, geometry, and appearance confidence fields.
- The initial model gate checked the nominal envelope metadata, not the computed `Box3` bounds of the geometry. A one-off check reported approximately 12.22 by 16.83 by 22.79 model units. Decide whether guards, feet, and cable protrusions belong inside the published envelope, then enforce the resulting bounds with tolerances.
- The official specification URL and capture date are absent from the source manifest.
- The visual comparison was reviewed manually in the browser. No repeatable camera-calibrated overlay or image-difference gate exists yet.
- No independent holdout view was available for the front milestone.

### Integration targets

The prototype commits were session-local and are not reachable from a fresh clone of the public repository. Preserve or recreate these artifacts during integration rather than relying on commit hashes in this document:

```text
assets/omnipro/evidence/sources.json
assets/omnipro/semantics/front-parts.json
src/model/createOmniProFront.js
scripts/check-front-model.mjs
```

The legacy `front-parts.json` used a single confidence field. It must be migrated to the multidimensional confidence contract above before being treated as compliant with this runbook.

### Session-local prototype observations

The following were observed during the original development session, but the screenshots and browser report were not committed as release evidence. Rerun and save them after the model is integrated:

- All 13 front components had stable semantic objects.
- Manual names and product-photo evidence were attached to selectable parts.
- The model included the front silhouette, guard structure, display, controls, sockets, storage opening, and cable.
- A session-local headless browser run exercised desktop and mobile rendering plus selection, front-view, reset, and reference controls.

### What it did not establish

- Component diameters, depths, radii, and center spacing
- Handle cross-section and exact mount geometry
- Sheet-metal thickness and corner radii
- Exact vent count or dimensions
- Full rear geometry
- Bottom geometry
- Manufacturing materials and tolerances
- A calibrated camera match
- Engineering fit or service-clearance accuracy

The correct claim is therefore **source-faithful instructional front reconstruction**, not exact replica.

## Required future evidence

For a physically faithful OmniPro model, acquire:

1. Square-on calibrated front and rear photographs
2. Square-on left and right side photographs
3. Top and underside photographs
4. Closed and fully open door states
5. Close-ups of every control, connector, label, hinge, latch, vent, seam, and foot
6. Overall enclosure measurements
7. LCD opening and bezel dimensions
8. Knob and socket diameters, depths, and center spacing
9. Guard and handle tube cross-sections
10. Door thickness, hinge axis, and opening limit
11. Interior spool and feed-mechanism datums
12. A color target and scale bar in each calibrated view

Until these exist, retain unresolved fields rather than filling gaps with plausible detail.

## Minimum command contract

After the model is integrated, the project should expose these non-interactive commands:

```bash
npm run check:model
npm run build
```

`check:model` must validate source references, semantic completeness, unique IDs and object names, finite geometry, and computed bounds against sourced tolerances. It must not pass merely because nominal dimension metadata has the expected values.

Browser verification remains a separate headless Hwatu step. Save the canonical screenshots and console result under the product validation directory or attach them to the pull request. Until the model implementation lands, these commands are a required integration target rather than commands available on this documentation-only branch.

## Updating this runbook

Update the procedure when a reconstruction exposes a repeatable failure mode or a better verification technique. Keep product-specific facts in the product evidence directory. Keep generally reusable rules here.

When changing public documentation, use a documentation branch and pull request. Do not merge the documentation PR without human review.
