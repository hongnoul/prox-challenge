# OmniPro Implementation Plan

**Role:** Contextual execution plan
**Status:** Challenge runtime and local feasibility gate complete; secondary scope remains
**Last reviewed:** 2026-08-19

## Purpose

This document records current implementation context that is expected to change: prototype lineage, target adapters, migration work, repository planning, delivery sequence, measurements, and unresolved questions.

It is subordinate to the [Product Vision](../../VISION.md) and [Architecture Constitution](../../ARCHITECTURE.md). Challenge scope and evaluator logistics live in [Challenge Requirements](../challenge/requirements.md). Framework rationale lives in [ADR 0001](../adr/0001-use-nextjs.md).

## Current status

- The versioned OmniPro package compiles five supplied source assets into ten exact evidence records, verified facts, executable procedures, constraints, scene bindings, and eight acceptance cases.
- The Next.js workspace implements Explore, Guide, and Diagnose modes; a lazy procedural Three.js twin; local click-to-explain; exact source dialogs; confirmed procedures; and allowlisted duty-cycle, polarity, source-comparison, and adaptive troubleshooting artifacts.
- The server implements sessions, deterministic product lookup, evidence and entity endpoints, ordered SSE, a bounded Claude Agent SDK adapter, in-process product MCP tools, and a transparent deterministic fallback when no supported Agent SDK credential is present.
- The standalone build traces the active platform's Claude Agent SDK binary and compiled product package. Sessions are intentionally in-memory with explicit loss on restart.
- `npm run validate` passes the source-hash gate, 13-part model gate, TypeScript, 57 tests, and production build from a clean `npm ci` checkout.
- Headless production verification covers startup, the 3D scene, duty-cycle evidence and artifact, TIG procedure state changes, click-to-explain, and the process-aware porosity path.
- ADR 0001's build, packaging, live streaming, cancellation, isolation, concurrency, and restart gates pass. A stored Claude.ai credential produced a source-grounded live duty-cycle turn through the standalone Route Handler.

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

The prototype source must be reachable from a fresh checkout before implementation relies on it. If the prototype reference is unavailable, import the relevant work through a reviewed patch and retain its provenance in the implementation history.

The model transition is complete when semantic parts resolve, source references remain valid, reviewed appearance and envelope checks pass, bound entities can be selected and highlighted, and the primary application no longer requires a second viewer command.

## Current target adapters

Subject to ADR 0001's feasibility gate, the current target is:

- Full-stack Next.js App Router application using TypeScript and the Node.js runtime
- React client boundary for the continuously interactive workspace and Three.js lifecycle
- Route Handlers for agent streaming, product data, evidence, entities, health, and sessions
- Server-only modules for the Claude Agent SDK, filesystem access, and product store
- Bounded request-scoped agent turns with application-owned session state
- Deterministic build-time product compiler outside the web request path
- Validated JSON package and local structured retrieval for the current three-document corpus
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

Current result: every gate above passes. A stored Claude.ai credential drove a real standalone Route Handler turn that emitted 14 contiguous typed SSE events, used product MCP lookup and exact evidence tools, cited `ev-duty-cycle-p19`, returned the published 25% at 200 A fact, normalized the 2.5-minute weld / 7.5-minute rest artifact, and completed for $0.05007075. Mocked SDK streams continue to verify failure paths, tool restrictions, and event translation without consuming model usage.

## Implemented runtime surface

The initial target endpoint set is:

```text
POST /api/agent
POST /api/sessions
GET  /api/products/[productId]
GET  /api/entities/[entityId]
GET  /api/evidence/[evidenceId]
GET  /api/health
```

The agent route uses validated streamed events, thin transport logic, cancellation, bounded output and cost, and a global concurrency limit. Current event and tool semantics are defined in the [Architecture Constitution](../../ARCHITECTURE.md). Uploads remain secondary scope and are not advertised by the interface.

## Implemented product-package materialization

The submitted runtime uses this compact materialization:

```text
products/omnipro-220/
├── product-src/
│   └── product-source.ts
├── product-dist/
│   └── v1/
│       ├── package-manifest.json
│       └── package.json
└── public assets are published under
    public/products/omnipro-220/v1/{pages,figures}/
```

Original challenge sources remain under `files/`. Generated browser-safe figures, source crops, and scene assets are published from the package manifest to a versioned public path. Server-only databases and source material never go under the public asset root.

## Implemented repository materialization

The implementation now follows the intended ownership boundaries:

```text
prox-challenge/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   └── api/
│       ├── agent/route.ts
│       ├── sessions/route.ts
│       ├── products/[productId]/route.ts
│       ├── entities/[entityId]/route.ts
│       ├── evidence/[evidenceId]/route.ts
│       └── health/route.ts
├── components/
│   ├── product-twin/
│   ├── chat/
│   ├── workspace/
│   ├── evidence/
│   └── artifacts/
├── lib/
│   ├── client/
│   │   ├── agent-stream.ts
│   │   └── api.ts
│   ├── server/
│   │   ├── agent/
│   │   └── product/
│   └── shared/
│       ├── contracts/
│       └── domain/
├── products/omnipro-220/
├── scripts/
│   ├── compile-product.ts
│   └── check-omnipro-model.ts
├── files/
├── public/products/omnipro-220/v1/
├── VISION.md
├── ARCHITECTURE.md
└── package.json
```

The intended dependency rule is more important than these paths: the workspace is client-side, agent and product-store code is server-only, shared contracts contain no runtime adapter, and ingestion is a build tool rather than a web route.

## Migration sequence

1. [x] Establish product, evidence, event, command, and state schemas in TypeScript.
2. [x] Move the procedural model behind a deterministic scene-runtime interface.
3. [x] Reproduce the prototype model gate against the new scene boundary.
4. [x] Embed the model in the primary client workspace.
5. [x] Add semantic part-selection events and local entity resolution.
6. [x] Add server-side product access and evidence endpoints.
7. [x] Add the Claude Agent SDK route and end-to-end grounded journeys.
8. [x] Add deterministic product compilation, procedures, constraints, and artifacts for the evaluated scope.

## Delivery milestones

### Milestone 0: runtime feasibility — complete

- Minimal Node route invoking the pinned Claude Agent SDK
- Production build and start
- Response streaming without buffering
- Disconnect and timeout cancellation
- Two-session isolation and concurrency cap
- Restart and session-continuation contract
- Standalone tracing for SDK, SQLite, and product files
- ADR 0001 accepted or fallback selected

### Milestone 1: foundation — complete

- Primary application shell
- Shared schemas
- Procedural model and validation gate
- Semantic part selection
- Product manifest and exact source registry

### Milestone 2: grounded agent — complete

- Claude Agent SDK integration
- Product-store tools
- Streaming text and citations
- Exact source-evidence drawer
- Duty-cycle golden case

### Milestone 3: executable twin — complete

- Typed scene commands
- Twin state and constraints
- TIG and polarity walkthroughs
- Procedure state machine

### Milestone 4: multimodal diagnosis — challenge scope complete

- Troubleshooting graph
- Porosity visual comparison
- Interactive artifacts

Image upload and voice control remain strong secondary scope.

### Milestone 5: submission quality — partially complete

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

The target local development path for an evaluator-supplied Console API key is:

```bash
cp .env.example .env
# Add ANTHROPIC_API_KEY
npm ci
npm run dev
```

For local development, the runtime also detects a prior `claude auth login --claudeai` credential or a `CLAUDE_CODE_OAUTH_TOKEN`. Without any supported credential it enters the explicit deterministic fallback.

Production supports `npm run build` and `npm start` without rerunning compilation. Runtime dependencies and the lockfile are pinned, while Node.js 22 or newer is required.

Standalone output tracing includes the compiled product, public evidence assets, and only the active platform's native Claude Agent SDK package. The local persistent Node process is the validated deployment baseline; hosted compatibility is not yet claimed.

## Unresolved work

- Which hosted Claude Agent SDK environments reliably support the validated local runtime behavior?
- Will the final 3D representation remain procedural or move to a reviewed GLB asset?
- Is semantic retrieval worth its package and startup cost for a three-document corpus beyond the current structured search?
- Which voice transcription path preserves the single-key setup requirement?
- How should uploaded images be retained or deleted in hosted deployments?

Resolve these through focused spikes and record durable choices in narrowly scoped ADRs. Do not turn unanswered execution questions into constitutional statements.
