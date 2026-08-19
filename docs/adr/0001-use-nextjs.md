# ADR 0001: Use Next.js for the production application

**Status:** Accepted
**Date:** 2026-08-15
**Last reviewed:** 2026-08-19

## Context

The application must combine a continuously interactive product twin, streaming agent responses, shared procedure state, evidence views, and interactive artifacts with a server-side agent and product store. Most of the primary interface therefore requires React state and browser hydration.

An earlier prototype used an Astro shell plus a separate Vite entry point for its procedural Three.js viewer. It proved useful visual and semantic-binding concepts, but the two entry points did not form one application and did not establish the required server, ingestion, or product-store boundaries. Its exact lineage and transition work are recorded in the [implementation plan](../plans/implementation-plan.md).

This ADR decides the application framework. It does not define the durable product, package, event, scene-command, evidence, or trust contracts. Those remain in the [Architecture Constitution](../../ARCHITECTURE.md).

## Decision

Adopt the production application as a full-stack Next.js App Router project using TypeScript and the Node.js runtime.

Use:

- React client components for the interactive workspace and Three.js lifecycle
- Next.js Route Handlers for agent streaming, product data, evidence, entities, health, and sessions
- Server-only modules for the Claude Agent SDK, filesystem access, and product store
- A separate deterministic product compiler outside the web request path
- A versioned product-package contract shared by ingestion and runtime
- Bounded request-scoped agent turns with application-owned session state

Use the Node.js runtime explicitly for agent endpoints. Do not assume that the Agent SDK supports edge execution or every serverless environment.

This decision is Accepted because the pinned runtime and SDK versions pass the feasibility gate below.

## Decision drivers

- One primary React component model for a stateful interactive workspace
- One application package and evaluator-facing development command
- A built-in server boundary for credentials and canonical product data
- Support for streamed typed events and exact source imagery
- Shared TypeScript contracts across UI, server, scene, and product package
- Clear separation of server-only agent code from browser code

Challenge-specific setup constraints are recorded in [Challenge Requirements](../challenge/requirements.md).

## Considered options

### Continue with Astro and React islands

Astro can support server output, API endpoints, and a large React island.

It was not selected because the final product is primarily one stateful interactive application. Most major surfaces require hydration and coordinated React state, reducing the benefit of a content-first island architecture. Adding a Node adapter and consolidating a separate viewer would still require substantial restructuring.

### Use a React SPA with a separate Node API

A Vite React frontend and a Fastify or Hono server provide explicit boundaries and a straightforward long-lived Node process.

This was not selected as the default because it introduces two application packages, two development servers, cross-origin configuration, and more evaluator setup. It remains the fallback if the Agent SDK is unreliable inside the Next.js Node runtime.

### Adopt the prototype structure as production architecture

This would maximize immediate code reuse.

It was rejected because the prototype explored visual form and semantic scene binding rather than runtime, agent, ingestion, or product-package boundaries. Treating its entry-point structure as authoritative would preserve accidental complexity.

## Consequences

### Positive

- One primary React component model for the interactive workspace
- One application package with repository-level development and production commands
- Built-in server boundary for credentials and product data
- Route Handlers suitable for streamed typed events
- Straightforward product, entity, evidence, health, and session endpoints
- Clear separation between server-only agent code and browser code
- Common TypeScript contracts across application boundaries

### Negative

- Server and Client Component boundaries require deliberate management.
- The workspace is client-heavy, so server rendering provides limited value in the core experience.
- Agent SDK filesystem or subprocess behavior may restrict hosting choices.
- Visual behavior and semantic scene bindings need explicit parity tests as they move into the primary workspace.
- Next.js bundling and standalone packaging add feasibility risks for native and server-only dependencies.

## Implementation constraints

- Keep Route Handlers thin.
- Use the Node.js runtime for Agent SDK endpoints.
- Use Route Handlers rather than Server Actions for long-lived streamed responses.
- Keep credentials, product-store access, and source paths in server-only modules.
- Run each turn with isolated work state and an explicit environment allowlist.
- Ignore user and project agent settings.
- Allow only product-specific tools and enforce the policy at the final tool-use boundary.
- Bound each turn by turn count, wall-clock timeout, abort signal, output size, and global concurrency.
- Treat manuals, uploads, and retrieved text as untrusted input.
- Keep the interactive workspace behind an explicit client boundary.
- Do not invoke the agent for high-frequency local scene interactions.
- Do not run source ingestion during startup or web requests.
- Do not add an additional scene abstraction without a measured need.
- Validate deployment compatibility before selecting a hosted platform.

## Feasibility gate

Acceptance requires evidence that:

- `next build` and `next start` complete successfully.
- One agent turn streams through a Route Handler without response buffering.
- Client disconnect aborts SDK and child-process work.
- Two concurrent sessions remain isolated and respect a configured concurrency limit.
- Restart behavior is documented as continuation or explicit session loss.
- Standalone production output contains required SDK binaries and product files.

The [implementation plan](../plans/implementation-plan.md) owns the executable spike and its status.

Current evidence: pinned Next.js 16.3.1 and Claude Agent SDK 0.3.235 builds pass from a clean Node.js 22 checkout; production SSE is unbuffered; abort, timeout, session isolation, event ordering, output, and concurrency behavior are tested; restart is explicit session loss; and standalone tracing contains the active native SDK binary and compiled package. Mocked SDK messages validate tool restrictions and failure-path event translation. A stored Claude.ai credential also drove a real standalone Route Handler turn that emitted 14 contiguous events, used only product MCP tools, cited exact evidence `ev-duty-cycle-p19`, returned the published 25% at 200 A fact, normalized its 2.5-minute weld / 7.5-minute rest artifact, and completed within the configured turn budget.

## Revisit conditions

Reconsider the decision if:

- The Agent SDK cannot run reliably in a self-hosted Next.js Node process.
- Streaming or subprocess behavior requires a separate persistent agent service.
- Bundling prevents SDK or local product-store dependencies from operating correctly.
- A separate API materially simplifies deployment without violating current evaluator constraints.

The fallback is a Vite React client plus a persistent Node agent server. Any reconsideration must preserve the product-package, event, scene-command, tool, evidence, and trust contracts defined by the Architecture Constitution.
