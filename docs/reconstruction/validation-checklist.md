# Reconstruction validation checklist

Use this checklist for every product-model milestone. Link the completed report from the pull request or handoff.

For every item, record one of three outcomes:

- `[x]` complete, with evidence or command output linked where appropriate
- `N/A: <reason>` when the requirement genuinely does not apply
- `BLOCKED: <missing evidence or owner>` when it applies but cannot yet pass

Never mark a blocked or unsupported view as complete. A milestone can still be useful with blocked items if its fidelity claim and intended use explicitly exclude them.

## 1. Evidence integrity

- [ ] Every depended-on source has a stable source ID.
- [ ] Local source files have cryptographic hashes.
- [ ] Web sources have canonical URLs, publishers, access dates, and snapshots or hashes.
- [ ] PDF references include both file page and printed page when they differ.
- [ ] Every source lists what it supports and what it cannot establish.
- [ ] Manual proportionality disclaimers have been checked.
- [ ] Contradictory sources are recorded instead of silently reconciled.
- [ ] Original source assets remain unchanged.

## 2. Measurement integrity

- [ ] Every numeric physical claim has a source.
- [ ] Units are explicit and consistently converted.
- [ ] Measured values include tolerances and methods.
- [ ] Derived values record their formula or dependency.
- [ ] Inferred values are not labeled measured.
- [ ] Critical dimensions for the intended use are measured or explicitly blocked.
- [ ] Geometry code does not contain unexplained physical constants.

## 3. Semantic completeness

- [ ] The authoritative manual or parts source has been fully inventoried for this scope.
- [ ] Every instructional or interactive component has a stable ID.
- [ ] Every component has an exact authoritative display name where available.
- [ ] Every component links to evidence.
- [ ] Every component records identity, placement, geometry, and appearance confidence separately.
- [ ] Every component lists unresolved properties.
- [ ] IDs and expected object names are unique.
- [ ] Every expected object resolves in the model.
- [ ] No unsupported component has been presented as real.

## 4. Geometry and hierarchy

- [ ] Coordinate system, origin, units, and forward axis are documented.
- [ ] The model envelope matches sourced values within tolerance.
- [ ] All positions, normals, and bounds are finite.
- [ ] No geometry has a zero or implausible scale.
- [ ] Critical dimensions pass numeric tolerance checks.
- [ ] Movable and selectable parts are separate objects or groups.
- [ ] Repeated components share generators without incorrectly assuming symmetry.
- [ ] Hidden or unsupported surfaces are omitted or clearly marked inferred.
- [ ] Exported geometry retains semantic names.
- [ ] Model resources can be disposed without leaking geometry, textures, or materials.

## 5. Appearance

- [ ] Color and material decisions cite suitable visual sources.
- [ ] Labels use verified wording and placement.
- [ ] Small text that cannot be read from evidence is not fabricated.
- [ ] Screen content is labeled representative unless a specific state is sourced.
- [ ] Lighting helps inspection without hiding silhouette or surface errors.
- [ ] Reference images are not stretched or cropped in a way that invalidates comparison.

## 6. Visual comparison

Capture canonical renders at fixed camera settings:

- [ ] Front
- [ ] Front three-quarter left
- [ ] Front three-quarter right
- [ ] Left side
- [ ] Right side
- [ ] Rear
- [ ] Top
- [ ] Required open or service states

For every supported canonical view:

- [ ] Overlay or side-by-side comparison was reviewed.
- [ ] Major silhouette landmarks align.
- [ ] Component centers and extents align within the declared visual tolerance.
- [ ] A discrepancy list was saved.
- [ ] The comparison names the source view.

For validation independence:

- [ ] At least one holdout view was not used to tune the model.
- [ ] The holdout result was reviewed and reported.

If a required view lacks evidence, mark it `BLOCKED: missing supporting view`. If the view is outside the declared milestone scope, mark it `N/A: outside declared scope`. Never pass it as verified.

## 7. Interaction and instructional behavior

- [ ] Selecting a visible component resolves the correct semantic part.
- [ ] The UI displays the authoritative name and evidence.
- [ ] Pointer movement is distinguished from orbit dragging.
- [ ] Buttons, knobs, doors, and cables move only on documented axes.
- [ ] Motion limits are sourced or labeled illustrative.
- [ ] Connection sequences enforce documented socket identity and polarity.
- [ ] Keyboard and touch access work for required instructional actions.
- [ ] Reduced-motion behavior is acceptable.

## 8. Browser verification

Use Hwatu in headless mode for this repository.

First run the minimum non-interactive project commands:

```bash
npm run check:model
npm run build
```

If those scripts do not exist yet, record the section as blocked rather than substituting an unrelated build command.

- [ ] Production build passes.
- [ ] Model-specific automated gates pass.
- [ ] Desktop viewport renders without clipping or overlap.
- [ ] Mobile viewport renders without clipping or unreachable controls.
- [ ] Device pixel ratio does not cause excessive GPU allocation.
- [ ] Front view, reset, reference display, and selection work.
- [ ] Browser console has no errors.
- [ ] Runtime semantic audit reports the expected component count.
- [ ] Screenshots are saved as review evidence.

Recommended minimum viewports:

| Purpose | Width | Height |
| --- | ---: | ---: |
| Desktop | 1920 | 1080 |
| Narrow desktop or tablet | 1024 | 768 |
| Mobile | 390 | 844 |

## 9. Performance and delivery

- [ ] Geometry count and texture memory are recorded.
- [ ] Large textures have appropriate formats and mipmaps.
- [ ] The intended device class meets the frame-time budget.
- [ ] Loading and failure states exist if the model is fetched asynchronously.
- [ ] Export files are reproducible from source.
- [ ] Generated artifacts are ignored or intentionally versioned.

## 10. Fidelity claim review

Complete these statements in the milestone report:

```text
Model scope:
Intended instructional use:
Fidelity classification:
Measured properties:
Published properties:
Inferred properties:
Unresolved properties:
Unsupported views or states:
Canonical views reviewed:
Holdout views reviewed:
Automated gates:
Known discrepancies:
Next required evidence:
```

Before approval:

- [ ] The stated fidelity classification matches the evidence.
- [ ] “Exact” is not used for an inferred model.
- [ ] Passing software tests is not presented as proof of dimensional accuracy.
- [ ] Passing visual review is not presented as proof of engineering fit.
- [ ] The next agent can identify both the source of every claim and the remaining uncertainty.
