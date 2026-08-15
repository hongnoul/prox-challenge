# ADR 0001: Use Next.js for the production application

**Status:** Proposed pending runtime spike
**Date:** 2026-08-15

## Context

The original challenge repository contains only the challenge brief, one API-key template, three PDFs, and two product images. It does not prescribe an application framework.

A prototype was created separately and is preserved on branch `prototype/threejs-front` at commit `c635bbd`. It is not part of this documentation branch. It contains:

- Astro as a static application shell
- A hydrated React onboarding component
- A separate Vite entry point for a procedural Three.js model
- Manually authored evidence and semantic part manifests
- A model gate validating scene names and source references

The prototype proves useful product-model concepts, but its two frontend entry points are disconnected. The normal Astro build includes the onboarding page, while the Three.js viewer runs through a separate Vite command. It has no server runtime, Claude Agent SDK integration, ingestion system, or product store.

The intended product is an application-heavy workspace containing:

- A continuously interactive Three.js product twin
- Streaming agent responses and typed tool events
- Shared product and procedure state
- Image upload and optional voice interaction
- Interactive artifacts
- Evidence and source-region views
- Server-side Agent SDK and product-store access

Most of the primary interface therefore requires React state and browser hydration.

## Decision

Propose building the production application as a clean full-stack Next.js App Router project using TypeScript and the Node.js runtime.

Use:

- React client components for the interactive product workspace and Three.js lifecycle
- Next.js Route Handlers for agent streaming, product data, evidence, sessions, and uploads
- Server-only modules for the Claude Agent SDK, filesystem access, and product store
- A separate build-time ingestion CLI outside the web request path
- A versioned product-package contract shared by ingestion and runtime
- Bounded request-scoped agent turns for the first implementation, with application-owned session state

Port the validated Three.js model, semantic mesh identifiers, evidence manifest, and model gate from the prototype. Do not inherit the Astro shell, standalone Vite entry point, or dual-runtime structure.

Use the Node.js runtime explicitly for the agent route. Do not assume the Agent SDK is compatible with edge execution or every serverless deployment environment.

This decision becomes Accepted only after a spike proves all of the following with the exact SDK version and production build:

- `next build` and `next start` complete successfully.
- One agent turn streams through a Route Handler without response buffering.
- Client disconnect aborts the SDK execution and child process.
- Two concurrent sessions remain isolated and respect a configured concurrency limit.
- A process restart has documented behavior for session continuation or explicit session loss.
- The standalone production output contains all required SDK binaries, product files, and native database dependencies.

## Considered options

### Continue with Astro and React islands

Astro can support server output, API endpoints, and a large React island. This would avoid replacing the current shell.

It was not selected because the final product is primarily one stateful interactive application. Most major surfaces require hydration and coordinated React state, reducing the value of Astro's content-first island architecture. Adding a Node adapter and consolidating the separate Vite viewer would still require substantial restructuring.

### Use a React SPA with a separate Node API

A Vite React frontend and a Fastify or Hono server would provide explicit boundaries and a straightforward long-lived Node process.

It was not selected as the default because it introduces two application packages, two development servers, cross-origin configuration, and a more complex single-command evaluation setup. The browser and Node remain separate runtimes in every web architecture. This option remains the fallback if the Claude Agent SDK proves unreliable inside Next.js.

### Preserve the prototype as the production architecture

This would maximize immediate code reuse.

It was rejected because the prototype was built to explore visual form and semantic scene binding, not to define runtime, agent, ingestion, or product-package boundaries. Treating it as an architectural constraint would preserve accidental complexity.

## Consequences

### Positive

- One primary React component model for the highly interactive workspace
- One application package with one repository-level development and production command
- Built-in server boundary for the API key and product data
- Route Handlers suitable for streamed typed events
- Straightforward image upload and evidence endpoints
- Clear separation between server-only Agent SDK code and browser code
- Easier integration of the Three.js model into the actual product route
- A common TypeScript contract across frontend, server, scene commands, and product packages

### Negative

- Next.js introduces Server Component and Client Component boundaries that must be managed deliberately.
- The Three.js workspace will be client-heavy, so much of Next.js server-rendering capability will not apply to the core interface.
- The Agent SDK may require filesystem or subprocess behavior that limits serverless deployment choices.
- The existing Astro onboarding and standalone viewer shell will not be carried forward automatically.
- A clean port must preserve prototype visual behavior and semantic scene names through explicit tests.

## Implementation constraints

- Keep route handlers thin.
- Use `runtime = "nodejs"` for Agent SDK endpoints.
- Use Route Handlers rather than Server Actions for long-lived streamed agent responses.
- Keep `ANTHROPIC_API_KEY`, product-store access, and source filesystem paths in server-only modules.
- Run each turn in an isolated working directory with an explicit environment allowlist.
- Set `settingSources: []` so user or project Claude settings cannot alter runtime behavior.
- Allow only product-specific MCP tools. Deny Bash, Edit, Write, general filesystem Read, web access, and every tool not explicitly required.
- Enforce the allowlist through SDK configuration and a final `canUseTool` policy.
- Bound each turn with `maxTurns`, a wall-clock timeout, an abort signal, and a global concurrency limit.
- Treat manuals, uploads, and retrieved text as untrusted input that cannot override the system policy or tool allowlist.
- Keep the interactive workspace behind an explicit client boundary.
- Do not call the agent for high-frequency local scene interactions.
- Do not run PDF ingestion during application startup or web requests.
- Do not add React Three Fiber solely because the application uses React. Preserve the direct Three.js model unless a measured need justifies another abstraction.
- Validate deployment compatibility with the Claude Agent SDK before selecting a hosted serverless platform.

## Porting contract

The following prototype assets are considered inputs to the clean implementation:

```text
Procedural OmniPro model
Stable mesh names
Semantic front-part identifiers
Evidence references and source hashes
Model envelope and source-binding validation gate
```

The port is successful when:

- All expected semantic parts resolve to scene objects.
- Source references remain valid.
- The model preserves its reviewed appearance and nominal envelope.
- The new scene runtime can select and highlight each bound entity.
- The normal production build includes the model inside the primary workspace.
- No second standalone viewer command is required.

The prototype branch must be pushed before implementation begins so a fresh clone can inspect the source lineage. If it is not published, the model must be imported through a reviewed patch rather than referenced as repository-local prior art.

## Revisit conditions

Reconsider this decision if:

- The Claude Agent SDK cannot run reliably in a self-hosted Next.js Node process.
- Streaming or subprocess behavior requires a separate persistent agent service.
- Next.js bundling prevents the SDK or local product-store dependencies from operating correctly.
- A separate API produces materially simpler deployment without violating the two-minute setup requirement.

Until the validation spike passes, the fallback is a Vite React client plus a persistent Node agent server that preserves the same product-package, event, scene-command, and tool contracts.

If reconsidered, preserve the product-package, event, scene-command, and tool contracts. Those boundaries should survive a framework change.
