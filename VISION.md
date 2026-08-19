# Product Vision: OmniPro Product Twin

**Role:** Product constitution
**Status:** Durable product intent

## Constitutional role

This document defines the enduring purpose, promises, user outcomes, experience principles, trust model, scope boundaries, and non-negotiable qualities of the OmniPro Product Twin. It is the product constitution: implementation choices, delivery status, evaluator instructions, and schedules may change without changing this intent.

Examples involving the Vulcan OmniPro 220 clarify the principles. They do not narrow the product to one implementation or turn this document into a delivery checklist.

Context that changes on a different lifecycle lives elsewhere:

- [Architecture constitution](ARCHITECTURE.md) defines stable system boundaries, contracts, and invariants.
- [Challenge requirements](docs/challenge/requirements.md) records the current challenge scope and evaluator expectations.
- [Implementation plan](docs/plans/implementation-plan.md) records lineage, current status, sequencing, and unresolved work.
- [Architecture decisions](docs/adr/0001-use-nextjs.md) record contextual choices and their rationale.

## Vision

Compile static product documentation and visual assets into a validated, executable product twin, then provide an agent that can explain, demonstrate, configure, and troubleshoot the product through the interface best suited to each task.

The OmniPro 220 is the first product represented by this vision. It should become unusually understandable while the product model, trust boundaries, and interaction contracts remain reusable for future products.

## The problem

Complex physical products are documented as disconnected pages, tables, diagrams, warnings, and troubleshooting matrices. A new owner must translate those materials into actions while standing next to the machine. Conventional search and chat interfaces still leave the user to imagine cable placement, identify unfamiliar parts, reconcile settings, and decide which instructions apply to the current setup.

The OmniPro 220 illustrates the problem clearly:

- Its behavior changes by welding process, input voltage, material, consumable, gas, and polarity.
- Safety-critical instructions are distributed across multiple manual sections.
- Important knowledge exists in tables, diagrams, photographs, and visual-only documents.
- A technically correct paragraph can still be difficult to apply to the physical machine.

The product must bridge documentation and physical action.

## Product promise

A user should be able to approach the welder with a goal or problem and receive support that is:

- **Grounded:** Numerical, procedural, and safety-sensitive claims resolve to exact source evidence.
- **Physical:** The product can point to, isolate, and demonstrate interactions with real components.
- **Contextual:** Guidance accounts for the user's process, voltage, material, consumable, gas, and declared machine state.
- **Multimodal:** The response may be text, source imagery, a spatial walkthrough, a calculator, a checklist, a flowchart, or voice guidance.
- **Executable:** Procedures and constraints can drive interface state instead of remaining prose.
- **Honest:** Unsupported values, inferred geometry, and generated explanations are clearly distinguished from source-backed facts.

## Product thesis

A spatial product twin is a flagship interaction, not the entire product. It earns that role only where spatial interaction makes a physical task easier to understand. An exact source image, simple diagram, checklist, or calculator takes priority whenever it communicates the answer more clearly or faithfully.

The durable product foundation is a canonical product twin composed of:

1. Immutable source evidence
2. Semantic product entities and relationships
3. Verified facts and constraints
4. Executable procedures and troubleshooting paths
5. Bindings between semantic entities and visual representations
6. Current session and user-declared machine state

The runtime twin state represents what the user has selected, reported, or confirmed. It is not live telemetry from the physical welder. The interface must not imply that a simulated connection or setting has been observed on the real machine.

Chat, voice, spatial views, calculators, and evidence views are projections of the same product twin. They must not maintain competing copies of product knowledge.

## Users and setting

The primary user has recently purchased the OmniPro 220 and is working in a garage or small shop. They are capable and willing to learn, but they are not assumed to be a professional welder. Their hands may be occupied, their environment may be noisy, and an incorrect connection or unsupported setting may be unsafe.

The product communicates directly and respectfully. It explains unfamiliar terminology when useful without treating the user as careless or unintelligent.

## Product structure

The product has two complementary sides.

### Product Studio

The authoring system:

- Ingests PDFs, product photographs, video, and available 3D assets
- Preserves exact source evidence and provenance
- Extracts text, layout, figures, tables, entities, procedures, and constraints
- Proposes semantic annotations with model assistance
- Binds verified semantic entities to scene objects
- Makes safety-critical interpretations reviewable
- Publishes a versioned product package

The Studio automates high-confidence extraction and exposes uncertain or safety-critical work for review. It never silently converts model inference into authoritative product knowledge.

### Product Copilot

The runtime user experience:

- Understands the user's goal and current machine context
- Retrieves verified facts and source regions
- Selects and explains procedures
- Controls the product twin through declarative scene commands
- Opens purpose-built artifacts when prose is insufficient
- Tracks procedure progress
- Diagnoses problems through adaptive questions and visual evidence
- Presents uncertainty and source authority clearly

## Experience model

The interface organizes around three user intentions.

### Explore

Learn the machine through direct manipulation.

- Rotate and inspect the product twin.
- Select a control, socket, cable, or internal component.
- See its manual name, purpose, related procedures, and source evidence.
- Ask a question with the selected component already in context.
- Compare a verified representation with the original source image.

### Guide

Configure the machine or perform a procedure.

- State the job, process, material, and available consumables.
- Receive targeted clarification when critical context is missing.
- Follow a synchronized checklist, spatial walkthrough, source view, and voice explanation.
- Validate connections and settings against product constraints.
- Pause, repeat, ask why, move backward, or resume later.

### Diagnose

Investigate a machine or weld problem.

- Describe a symptom or provide a photograph.
- Separate direct observations from inferred causes.
- Follow an adaptive troubleshooting path.
- Highlight the next component to inspect.
- Compare a weld with manual diagnosis examples.
- Produce a support snapshot containing configuration, symptoms, evidence, and completed checks.

## Spatial guidance

The spatial experience proves that product knowledge is executable. For example, when asked how to configure TIG, the system can:

1. Confirm relevant machine context.
2. Focus the front panel.
3. Highlight the positive and negative sockets.
4. Demonstrate verified torch and ground-clamp connections.
5. Show shielding-gas and optional foot-pedal guidance.
6. Speak or display the current instruction.
7. Open the exact supporting manual region.
8. Update twin state when the user confirms a step.
9. Reject or warn about an incompatible connection.

The agent decides what verified action is relevant. A deterministic scene runtime decides how that action is rendered. The agent never generates arbitrary scene code during a safety-sensitive procedure.

A faithful 3D representation requires CAD, scanning, photogrammetry, or reviewed manual modeling. Document parsing can preserve diagrams and recover topology, labels, procedures, and constraints, but it cannot guarantee complete 3D geometry. The interface exposes whether a representation is source-exact, verified, or explanatory.

## Response modalities

The product chooses among:

- Concise grounded text
- Exact source-region imagery
- Verified spatial scene commands
- Labeled explanatory diagrams
- Procedure checklists
- Troubleshooting flowcharts
- Duty-cycle calculators
- Settings configurators
- Control-panel simulations
- Voice walkthroughs

Multimodal means selecting the right output form, not merely accepting images as input.

## Trust and source authority

Source evidence and derived representations carry different provenance:

1. **Source exact:** Original document region, embedded image, or preserved source vector identified by document hash and coordinates
2. **Source rendered:** Deterministic rendering of an exact source region with recorded renderer metadata
3. **Verified reconstruction:** Human-reviewed illustration, procedure, scene binding, or 3D representation linked to source-evidence records
4. **Generated explanation:** Agent-created illustration or summary linked to its inputs but never presented as authoritative geometry

An unverified inference remains a candidate annotation or claim. It is not evidence and must not enter safety-critical runtime knowledge.

Source identity consists of the original file hash, page number, source coordinates, and extraction metadata. Derived search indexes and embeddings are replaceable. They are not sources of truth.

Safety-critical procedures use verified facts, constraints, and procedure steps. The agent may select, clarify, and explain those procedures, but it may not invent a new electrical connection sequence.

## Product principles

### Preserve before interpreting

Keep original documents and exact visual evidence. Semantic analysis augments those assets rather than replacing them.

### Deterministic core, agent at the edges

Use deterministic code for calculations, source resolution, procedure transitions, constraint checks, and scene execution. Use the agent for intent recognition, ambiguity resolution, evidence synthesis, and explanation.

### Fast interactions do not require model calls

Hovering, selecting a part, changing a camera view, and displaying basic sourced metadata are local and immediate. Invoke the agent when reasoning or natural-language guidance adds value.

### One product state

Chat, voice, procedures, artifacts, and spatial interactions share one typed, revisioned twin state. Every value records whether it was declared, user-confirmed, observed, or recommended. Agent output may propose state changes, but a deterministic reducer applies them only after precondition checks and required user confirmation.

### Product-specific excellence, reusable boundaries

Reusable schemas, tools, and runtimes support the OmniPro experience, but generic infrastructure must not displace product-specific quality.

### Progressive disclosure

Lead with the next useful action. Keep detailed reasoning, terminology, and source evidence available without forcing every user through it.

## Durable scope boundaries

The product is responsible for:

- Grounding product support in preserved source evidence.
- Connecting semantic knowledge to physical components and visual representations.
- Guiding user-declared configuration, procedures, and diagnosis.
- Distinguishing observation, recommendation, simulation, and confirmation.
- Selecting the clearest response modality for the task.

The product is not responsible for:

- Claiming live telemetry or control of the physical machine without an explicit verified integration.
- Treating inferred geometry, interpolated settings, or generated explanations as manufacturer facts.
- Replacing professional judgment where the source material requires qualified service.
- Scaling to many products at the expense of a trustworthy experience for the current product.
- Calling a language model for deterministic local interactions.

Delivery-specific scope is maintained in [Challenge requirements](docs/challenge/requirements.md).

## Non-negotiable success qualities

The product succeeds only when:

- Representative numerical, setup, and troubleshooting answers resolve to exact source evidence.
- Ambiguous questions trigger focused clarification rather than confident guessing.
- Safety-sensitive procedures synchronize explanation, evidence, product state, and deterministic interaction.
- Visual-only knowledge remains retrievable and useful rather than being reduced to ungrounded text.
- The interface distinguishes source evidence, verified reconstructions, and generated explanations.
- Ordinary scene interactions stay responsive without unnecessary agent calls.
- Product behavior remains explainable through shared contracts and documented trust boundaries.
- Accessible alternatives exist for spatial, motion-heavy, visual, and audio interactions.

## Positioning

The product is not a document chatbot with a 3D decoration. It is an evidence-grounded product twin whose knowledge can be searched, explained, simulated, validated, and demonstrated.
