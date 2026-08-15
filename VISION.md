# Product Vision: OmniPro Product Twin

**Status:** Draft
**Date:** 2026-08-15

## Vision

Compile static product documentation and visual assets into a validated, executable product twin, then deploy an agent that can explain, demonstrate, configure, and troubleshoot the product through the interface best suited to each task.

For this challenge, the product twin represents the Vulcan OmniPro 220. The implementation should make this specific machine unusually understandable while establishing reusable boundaries for future products.

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
- **Contextual:** Guidance accounts for the user's process, voltage, material, consumable, gas, and current machine state.
- **Multimodal:** The response may be text, source imagery, a 3D walkthrough, a calculator, a checklist, a flowchart, or voice guidance.
- **Executable:** Procedures and constraints can drive interface state instead of remaining prose.
- **Honest:** Unsupported values, inferred geometry, and generated explanations are clearly distinguished from source-backed facts.

## Product thesis

The 3D model is the chosen flagship interaction for this implementation, not a requirement inferred from the challenge and not the entire product. It earns that role only where spatial interaction makes a physical task easier to understand. An exact source image, simple diagram, checklist, or calculator should take priority whenever it communicates the answer more clearly or faithfully.

The durable product foundation is a canonical product twin composed of:

1. Immutable source evidence
2. Semantic product entities and relationships
3. Verified facts and constraints
4. Executable procedures and troubleshooting paths
5. Bindings between semantic entities and visual representations
6. Current session and user-declared machine state

The runtime twin state represents what the user has selected, reported, or confirmed. It is not live telemetry from the physical welder. The interface must not imply that a simulated connection or setting has been observed on the real machine.

Chat, voice, 3D, calculators, and evidence views are projections of that same product twin. They must not maintain competing copies of product knowledge.

## Users and setting

The primary user has recently purchased the OmniPro 220 and is working in a garage or small shop. They are capable and willing to learn, but they are not assumed to be a professional welder. Their hands may be occupied, their environment may be noisy, and an incorrect connection or unsupported setting may be unsafe.

The product should communicate directly and respectfully. It should explain unfamiliar terminology when useful without treating the user as careless or unintelligent.

## Product structure

The product has two complementary sides.

### Product Studio

The build-time authoring system. It is part of the platform architecture, but a polished Studio UI is not required for the challenge submission:

- Ingests PDFs, product photographs, video, and available 3D assets
- Preserves exact source evidence and provenance
- Extracts text, layout, figures, tables, entities, procedures, and constraints
- Proposes semantic annotations with model assistance
- Binds verified semantic entities to scene objects
- Validates safety-critical interpretations
- Publishes a versioned product package

The Studio should automate high-confidence extraction and make uncertain or safety-critical work reviewable. It should not silently convert model inference into authoritative product knowledge.

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

The interface should organize around three user intentions.

### Explore

Learn the machine through direct manipulation.

- Rotate and inspect the product twin
- Select a control, socket, cable, or internal component
- See its manual name, purpose, related procedures, and source evidence
- Ask a question with the selected component already in context
- Compare the verified model representation with the original source image

### Guide

Configure the machine or perform a procedure.

- State the job, process, material, and available consumables
- Receive targeted clarification when critical context is missing
- Follow a synchronized checklist, 3D walkthrough, source view, and voice explanation
- Validate connections and settings against product constraints
- Pause, repeat, ask why, move backward, or resume later

### Diagnose

Investigate a machine or weld problem.

- Describe a symptom or upload a photograph
- Separate direct observations from inferred causes
- Follow an adaptive troubleshooting path
- Highlight the next component to inspect
- Compare a weld with manual diagnosis examples
- Produce a support snapshot containing configuration, symptoms, evidence, and completed checks

## Hero experience: agent-controlled 3D product twin

The Three.js experience should prove that product knowledge is executable.

For example, when asked how to configure TIG, the system should be able to:

1. Confirm relevant machine context
2. Move the camera to the front panel
3. Highlight the positive and negative sockets
4. Demonstrate the verified torch and ground-clamp connections
5. Show shielding-gas and optional foot-pedal guidance
6. Speak or display the current instruction
7. Open the exact supporting manual region
8. Update the current twin state when the step is confirmed
9. Reject or warn about an incompatible connection

The agent decides what verified action is relevant. A deterministic scene runtime decides how that action is rendered. The agent must not generate arbitrary Three.js code during a safety-sensitive procedure.

A faithful 3D representation requires CAD, scanning, photogrammetry, or reviewed manual modeling. PDF parsing can preserve diagrams and recover topology, labels, procedures, and constraints, but it cannot guarantee complete 3D geometry. The interface must expose whether a representation is source-exact, verified, or explanatory.

## Required journeys

### TIG setup

- The agent clarifies missing context.
- The product twin demonstrates torch-to-negative and ground-to-positive connections.
- The product explains the 100% argon requirement and optional foot pedal.
- Manual pages 24 and 25 are available as evidence.

### MIG and self-shielded flux-core polarity

- The user can switch process context.
- MIG presents DCEP configuration.
- Self-shielded flux-core presents DCEN configuration.
- The constraint engine detects incompatible connections.
- Manual pages 13 and 14 are cited.

### Duty-cycle planning

- The user selects process, input voltage, and amperage.
- Published ratings are distinguished from estimates.
- MIG at 200 A on 240 V reports a 25% duty cycle.
- The interface shows 2.5 minutes of welding and 7.5 minutes of cooling in a ten-minute period.
- The relevant specification and duty-cycle sections are cited.

### Porosity diagnosis

- The agent identifies or confirms the welding process and shielding context.
- It does not apply gas-shielded MIG advice indiscriminately to self-shielded flux-core.
- It checks polarity, contamination, travel consistency, and contact-tip-to-work distance as appropriate.
- It shows the manual's visual diagnosis example and starts an ordered troubleshooting flow.

### Visual-only evidence retrieval

- A question whose answer depends on the image-only selection chart or a manual diagram retrieves that visual asset.
- OCR or semantic annotations help locate the answer without replacing the original image.
- The interface presents the relevant crop with an exact source reference.
- The answer identifies which details are directly visible and which were inferred.

### Ambiguous settings request

- A request such as "What settings should I use for 1/8-inch steel?" does not immediately produce a precise value.
- The agent asks for the welding process, input voltage, wire or electrode, and shielding context needed to answer safely.
- Verified manual facts are separated from general starting-point guidance.

### Click to explain

- Selecting a scene object resolves to a stable semantic part identifier.
- Basic product information appears without an agent round trip.
- Follow-up questions receive the selected part and current twin state as context.
- Related procedures, warnings, and exact source evidence are discoverable.

## Response modalities

The agent should choose among:

- Concise grounded text
- Exact source-region imagery
- Verified 3D scene commands
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

1. **Source exact:** Original PDF region, embedded image, or preserved source vector identified by document hash and coordinates
2. **Source rendered:** Deterministic rendering of an exact source region with recorded renderer metadata
3. **Verified reconstruction:** Human-reviewed SVG, procedure, scene binding, or 3D representation linked to one or more source-evidence records
4. **Generated explanation:** Agent-created illustration or summary linked to its inputs but never presented as authoritative geometry

An unverified inference remains a candidate annotation or claim. It is not evidence and must not enter safety-critical runtime knowledge.

Source identity consists of the original file hash, page number, source coordinates, and extraction metadata. Derived search indexes and embeddings are replaceable. They are not sources of truth.

Safety-critical procedures must use verified facts, constraints, and procedure steps. The agent may select, clarify, and explain those procedures, but it may not invent a new electrical connection sequence.

## Design principles

### Preserve before interpreting

Keep original documents and exact visual evidence. Semantic analysis augments those assets rather than replacing them.

### Deterministic core, agent at the edges

Use deterministic code for calculations, source resolution, procedure transitions, constraint checks, and scene execution. Use the agent for intent recognition, ambiguity resolution, evidence synthesis, and explanation.

### Fast interactions do not require model calls

Hovering, selecting a part, changing a camera view, and displaying basic sourced metadata should be local and immediate. Invoke the agent when reasoning or natural-language guidance adds value.

### One product state

Chat, voice, procedures, artifacts, and 3D interactions share one typed, revisioned twin state. Every value records whether it was declared, user-confirmed, vision-observed, or recommended. Agent output may propose state changes, but a deterministic reducer applies them only after precondition checks and required user confirmation.

### Product-specific excellence, reusable boundaries

The challenge evaluates one OmniPro experience. Reusable schemas, tools, and runtimes should support it, but generic infrastructure must not displace product-specific quality.

### Progressive disclosure

Lead with the next useful action. Keep detailed reasoning, terminology, and source evidence available without forcing every user through it.

## Scope

### Minimum convincing submission

- Grounded Claude Agent SDK runtime
- Agent-controlled Three.js walkthrough for at least one safety-sensitive setup
- Semantic part selection and click-to-explain
- Exact source-evidence viewer, including at least one visual-only source
- Duty-cycle calculator
- One adaptive troubleshooting journey
- Focused ambiguity handling for configuration questions
- Clean local startup using only `ANTHROPIC_API_KEY`
- Clear architecture and ingestion documentation

### Full challenge target

- MIG, self-shielded flux-core, and TIG setup walkthroughs
- Validation of user-declared and simulated product configuration
- Broader source-backed technical chat
- Additional troubleshooting flows and interactive artifacts

### Strong secondary scope

- Image-assisted weld diagnosis
- Hands-free voice procedure control
- Control-panel simulator
- Maintenance and parts assistance
- Shareable support snapshots
- Product Studio review interface

### Non-goals for the challenge

- Fully automatic, dimensionally faithful 3D reconstruction from arbitrary PDFs
- Supporting many products before the OmniPro experience is convincing
- Treating embeddings as canonical knowledge
- Calling the language model for every scene interaction
- Requiring external databases, vector services, or additional API keys
- Presenting interpolated or inferred technical values as official ratings

## Success criteria

The product succeeds when:

- An evaluator can clone, configure, and run it within two minutes.
- The three supplied PDFs and provided product images have explicit provenance in the compiled product package.
- Representative numerical, setup, and troubleshooting answers resolve to exact source evidence.
- Ambiguous questions trigger focused clarification rather than confident guessing.
- At least one safety-sensitive setup procedure synchronizes agent explanation, source evidence, product state, and deterministic 3D interaction.
- Visual-only knowledge is retrievable and useful, not reduced to ungrounded text.
- The interface distinguishes source evidence, verified reconstructions, and generated explanations.
- The model remains responsive while ordinary scene interactions avoid unnecessary agent calls.
- The README explains startup, architecture, knowledge extraction, validation, and limitations.

## Positioning

The product is not a PDF chatbot with a 3D decoration. It is an evidence-grounded product twin whose knowledge can be searched, explained, simulated, validated, and demonstrated.

The Three.js experience is the flagship proof chosen for this implementation. The canonical product package and agent runtime are the platform.
