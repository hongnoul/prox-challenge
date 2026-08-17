# OmniPro Implementation Plan

**Role:** Contextual execution plan
**Status:** Next.js foundation and evidence-backed front-panel twin implemented; agent runtime and product compiler in progress
**Last reviewed:** 2026-08-17

## Purpose

This document records current implementation context that is expected to change: prototype lineage, target adapters, migration work, repository planning, delivery sequence, measurements, and unresolved questions.

It is subordinate to the [Product Vision](../../VISION.md) and [Architecture Constitution](../../ARCHITECTURE.md). Challenge scope and evaluator logistics live in [Challenge Requirements](../challenge/requirements.md). Framework rationale lives in [ADR 0001](../adr/0001-use-nextjs.md).

## Current status

- The repository contains the challenge scaffold, source PDFs, product images, lifecycle-separated design documentation, and a canonical Next.js App Router foundation.
- The onboarding interaction, evidence-backed front-panel twin, standalone production packaging, typecheck, model gate, build, and CI are implemented.
- The product twin exposes 13 source-bound front-panel parts with explicit multidimensional confidence and unresolved geometry; the ingestion compiler and agent runtime remain unimplemented.
- Repository-level `npm ci`, `npm run typecheck`, `npm run check:model`, `npm run build`, and `npm start` commands define the implemented application path.
- ADR 0001 remains Proposed until its Agent SDK runtime feasibility gate passes.
- The remaining target stack and file layout below are execution plans, not constitutional boundaries.

Update this section whenever implementation evidence changes. Do not copy status claims into the constitutional documents.

## Prototype lineage

A separate visual prototype is preserved on branch `prototype/threejs-front` at commit `c635bbd`. It explored visual form and semantic scene binding using:

- An Astro static shell
- A hydrated React onboarding component
- A separate Vite entry point for a procedural Three.js model
- Manually authored evidence and semantic-part manifests
- A model gate validating scene names and source references

The normal Astro build and standalone viewer are disconnected. The prototype has no server runtime, Claude Agent SDK integration, ingestion system, or canonical product store. It is an implementation input, not an architectural authority.

### Assets to carry forward

- Procedural OmniPro front model
- Stable semantic mesh names
- Front-part semantic identifiers
- Evidence references and source hashes
- Model envelope and source-binding validation gate
- Useful reviewed geometry and material techniques

### Structures to replace or redesign

- Standalone Vite entry point
- Disconnected Astro onboarding entry point
- DOM-coupled scene orchestration
- Prototype-only styling and copy
- Static-only runtime assumptions
- Dual application entry points

### Lineage handling

The prototype source is preserved as implementation lineage through commit `c635bbd`; the integration history records that superseded line before the branch is retired. The canonical application does not depend on the old branch remaining available.

The model transition is complete when semantic parts resolve, source references remain valid, reviewed appearance and envelope checks pass, bound entities can be selected and highlighted, and the primary application no longer requires a second viewer command.

## Current target adapters

Subject to ADR 0001's feasibility gate, the current target is:

- Full-stack Next.js App Router application using TypeScript and the Node.js runtime
- React client boundary for the continuously interactive workspace and Three.js lifecycle
- Route Handlers for agent streaming, product data, evidence, sessions, and uploads
- Server-only modules for the Claude Agent SDK, filesystem access, and product store
- Bounded request-scoped agent turns with application-owned session state
- Build-time ingestion CLI outside the web request path
- Read-only SQLite metadata and FTS5 retrieval for the current three-document corpus
- Optional, local or precomputed semantic retrieval as a regenerable index
- Procedural Three.js model until a reviewed GLB replacement proves validation parity

These choices implement the stable boundaries in the Architecture Constitution. They may be replaced without changing product-package, event, scene-command, tool, or evidence contracts.

## Runtime feasibility gate

ADR 0001 can move from Proposed to Accepted only after a spike with pinned runtime and SDK versions proves:

- `next build` and `next start` complete successfully.
- One agent turn streams through a Route Handler without response buffering.
- Client disconnect aborts SDK and child-process work.
- Two concurrent sessions remain isolated and respect a configured concurrency limit.
- Process restart behavior is documented as continuation or explicit session loss.
- Standalone production output contains required SDK binaries, product files, and native database dependencies.

If the gate fails, use a Vite React client plus a persistent Node agent server while preserving the constitutional contracts.

## Planned runtime surface

The initial target endpoint set is:

```text
POST /api/agent
POST /api/sessions
GET  /api/products/[productId]
GET  /api/entities/[entityId]
GET  /api/evidence/[evidenceId]
POST /api/uploads
```

The first vertical slice needs only agent streaming, product metadata, and evidence retrieval. Add the remaining endpoints when an evaluated journey requires them.

The agent route uses streamed server events, thin transport logic, cancellation, backpressure, and bounded execution. Current event and tool semantics are defined in the [Architecture Constitution](../../ARCHITECTURE.md).

## Planned product-package materialization

The current file materialization is illustrative and may change while retaining the logical package contract:

```text
products/omnipro-220/
├── product-src/
│   ├── manifest.json
│   ├── authoring/
│   │   ├── entity-corrections.json
│   │   ├── procedure-approvals.json
│   │   └── scene-binding-approvals.json
│   └── scene/
│       ├── create-omnipro-model.ts
│       ├── bindings.json
│       ├── cameras.json
│       └── animations.json
├── product-dist/
│   └── v1/
│       ├── package-manifest.json
│       ├── knowledge.sqlite
│       ├── documents.json
│       ├── procedures.json
│       ├── constraints.json
│       ├── scene-manifest.json
│       ├── pages/
│       └── figures/
└── tests/
    └── acceptance-cases.json
```

Original challenge sources remain under `files/`. Generated browser-safe figures, source crops, and scene assets are published from the package manifest to a versioned public path. Server-only databases and source material never go under the public asset root.

## Planned repository materialization

This tree preserves the earlier file-by-file proposal as execution context. It is not the stable ownership model and should change when implementation evidence favors a better organization.

```text
prox-challenge/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── workspace/page.tsx
│   └── api/
│       ├── agent/route.ts
│       ├── sessions/route.ts
│       ├── products/[productId]/route.ts
│       ├── entities/[entityId]/route.ts
│       ├── evidence/[evidenceId]/route.ts
│       └── uploads/route.ts
├── components/
│   ├── product-twin/
│   ├── chat/
│   ├── voice/
│   ├── procedures/
│   ├── evidence/
│   └── artifacts/
├── lib/
│   ├── client/
│   │   ├── agent-stream.ts
│   │   ├── twin-store.ts
│   │   └── scene-controller.ts
│   ├── server/
│   │   ├── agent/
│   │   └── product/
│   └── shared/
│       ├── contracts/
│       └── schemas/
├── products/omnipro-220/
├── scripts/
│   ├── ingest/
│   └── validate/
├── files/
├── public/products/omnipro-220/v1/
├── VISION.md
├── ARCHITECTURE.md
└── package.json
```

The intended dependency rule is more important than these paths: the workspace is client-side, agent and product-store code is server-only, shared contracts contain no runtime adapter, and ingestion is a build tool rather than a web route.

## Migration sequence

1. Establish product, evidence, event, command, and state schemas in TypeScript.
2. Move the procedural model behind a deterministic scene-runtime interface.
3. Reproduce the prototype model gate against the new scene boundary.
4. Embed the model in the primary client workspace.
5. Add semantic part-selection events and local entity resolution.
6. Add server-side product access and evidence endpoints.
7. Add the Claude Agent SDK route and one end-to-end grounded journey.
8. Expand ingestion, procedures, constraints, and artifacts incrementally.

## Delivery milestones

### Milestone 0: runtime feasibility

- Minimal Node route invoking the pinned Claude Agent SDK
- Production build and start
- Response streaming without buffering
- Disconnect and timeout cancellation
- Two-session isolation and concurrency cap
- Restart and session-continuation contract
- Standalone tracing for SDK, SQLite, and product files
- ADR 0001 accepted or fallback selected

### Milestone 1: foundation

- Primary application shell
- Shared schemas
- Procedural model and validation gate
- Semantic part selection
- Product manifest and exact source registry

### Milestone 2: grounded agent

- Claude Agent SDK integration
- Product-store tools
- Streaming text and citations
- Exact source-evidence drawer
- Duty-cycle golden case

### Milestone 3: executable twin

- Typed scene commands
- Twin state and constraints
- TIG and polarity walkthroughs
- Procedure state machine

### Milestone 4: multimodal diagnosis

- Troubleshooting graph
- Porosity visual comparison
- Image upload
- Interactive artifacts
- Optional voice procedure control

### Milestone 5: submission quality

- Full challenge acceptance suite
- Startup and implementation documentation
- Hosted deployment if compatible
- Video walkthrough
- Performance and accessibility pass

## Provisional measurements

Targets remain provisional until measured. Every published result records hardware, browser, runtime version, package version, corpus version, sample count, and percentile.

- Local structured and full-text retrieval targets p95 below 150 ms on the documented evaluator-class laptop after warm-up.
- Spatial interaction targets p95 frame rate at or above 55 FPS on the documented desktop profile, with a 30 FPS reduced-quality fallback.
- The application shell should become usable before the spatial model finishes loading.
- Agent responses should expose progress immediately and stream text and typed events.

## Packaging and deployment work

Local execution is the baseline. The current plan uses a self-hosted Node process or container until hosted compatibility is demonstrated.

The target local development path is:

```bash
cp .env.example .env
npm install
npm run dev
```

Production should support `npm run build` and `npm start` without rerunning ingestion. Once implementation begins, pin runtime and package-manager versions, commit the lockfile, and use deterministic installation instructions.

For the current Next.js target, investigate standalone output tracing for product files and native dependencies. Validate filesystem, transcript, binary, subprocess, streaming, cancellation, and persistence behavior before selecting any serverless host.

## Unresolved work

- Which Claude Agent SDK deployment environments reliably support required runtime behavior?
- Will the final 3D representation remain procedural or move to a reviewed GLB asset?
- Which ingestion stages require human review for this delivery?
- Is semantic retrieval worth its package and startup cost for a three-document corpus?
- Which voice transcription path preserves the single-key setup requirement?
- How should uploaded images be retained or deleted in hosted deployments?

Resolve these through focused spikes and record durable choices in narrowly scoped ADRs. Do not turn unanswered execution questions into constitutional statements.
