# Challenge Requirements and Evaluator Scope

**Role:** Time-bound delivery context
**Status:** Current challenge interpretation
**Last reviewed:** 2026-08-17

## Purpose

This document gathers the requirements, scope tiers, evaluator expectations, and submission logistics for the current Prox Engineering Challenge. It is intentionally contextual and may change as the challenge or implementation evolves.

The original challenge brief remains in the [README](../../README.md). The durable product promise lives in the [Product Vision](../../VISION.md), and durable system boundaries live in the [Architecture Constitution](../../ARCHITECTURE.md). Delivery state and sequencing live in the [implementation plan](../plans/implementation-plan.md).

If this document conflicts with the original challenge brief, the original brief governs submission logistics. Constitutional documents govern product integrity and trust boundaries.

## Required foundation

The challenge implementation must:

- Use the Anthropic Claude Agent SDK as the agent foundation.
- Run locally with one `ANTHROPIC_API_KEY` supplied through environment configuration.
- Be usable by an evaluator within two minutes of cloning.
- Provide a clean frontend.
- Answer technical questions that require cross-referencing text and visual evidence.
- Produce multimodal responses, including source imagery, diagrams, and interactive artifacts.
- Handle ambiguous questions through focused clarification.
- Explain how product knowledge is extracted, represented, and validated.
- Avoid mandatory external databases, vector services, or additional credentials.

The submitted runtime consumes a precompiled product package. Evaluators do not need to run document ingestion or compilation.

## Evaluator scope

Evaluation centers on one product, the Vulcan OmniPro 220, and the three supplied PDFs plus provided product images. Product-specific quality takes priority over premature multi-product generalization.

The evaluator should be able to inspect:

- Technical accuracy across text, tables, diagrams, charts, and photographs.
- Appropriate clarification when process, voltage, material, consumable, gas, or polarity context is missing.
- Multimodal responses that choose a useful form rather than defaulting to prose.
- Exact source evidence for numerical, procedural, configuration, and safety-sensitive claims.
- A respectful tone suitable for a capable owner who is not assumed to be a professional welder.
- The extraction, provenance, semantic-model, and validation strategy.
- Clear separation of source evidence, verified reconstruction, and generated explanation.

## Delivery scope tiers

These tiers guide prioritization. They are not permanent product boundaries.

### Minimum convincing submission

- Grounded Claude Agent SDK runtime
- Agent-controlled spatial walkthrough for at least one safety-sensitive setup
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

## Evaluated journeys

### TIG setup

- Clarify missing machine context.
- Demonstrate torch-to-negative and ground-to-positive connections.
- Explain the 100% argon requirement and optional foot pedal.
- Make the exact supporting regions from manual pages 24 and 25 available.

### MIG and self-shielded flux-core polarity

- Allow the user to switch process context.
- Present DCEP for MIG and DCEN for self-shielded flux-core.
- Detect incompatible connections.
- Cite manual pages 13 and 14.

### Duty-cycle planning

- Accept process, input voltage, and amperage context.
- Distinguish published ratings from estimates.
- Report a 25% duty cycle for MIG at 200 A on 240 V.
- Explain that as 2.5 minutes of welding and 7.5 minutes of cooling in a ten-minute period.
- Cite the relevant specification and duty-cycle sections.

### Porosity diagnosis

- Identify or confirm process and shielding context.
- Avoid applying gas-shielded MIG advice indiscriminately to self-shielded flux-core.
- Check polarity, contamination, travel consistency, and contact-tip-to-work distance as appropriate.
- Show the manual's visual diagnosis example and begin an ordered troubleshooting flow.

### Visual-only evidence retrieval

- Retrieve the image-only selection chart or relevant manual diagram when the answer depends on it.
- Use OCR or semantic annotation to locate the answer without replacing the original image.
- Present the relevant crop with an exact source reference.
- Identify which details are directly visible and which are inferred.

### Ambiguous settings request

For a request such as “What settings should I use for 1/8-inch steel?” the agent asks for the welding process, input voltage, wire or electrode, and shielding context needed to answer safely. It separates verified manual facts from general starting-point guidance.

### Click to explain

- Selecting a scene object resolves to a stable semantic part identifier.
- Basic product information appears without an agent round trip.
- Follow-up questions include the selected part and twin state as context.
- Related procedures, warnings, and exact source evidence remain discoverable.

## Challenge non-goals

- Fully automatic, dimensionally faithful 3D reconstruction from arbitrary documents
- Supporting many products before the OmniPro experience is convincing
- Treating embeddings as canonical knowledge
- Calling a language model for every scene interaction
- Requiring external databases, vector services, or additional API keys
- Presenting interpolated or inferred technical values as official ratings

## Evaluator acceptance checks

The current submission target is satisfied when:

- An evaluator can clone, configure, and run the application within two minutes.
- The supplied PDFs and product images have explicit provenance in the compiled package.
- Representative numerical, setup, and troubleshooting answers resolve to exact evidence.
- Ambiguous questions trigger focused clarification rather than confident guessing.
- At least one safety-sensitive procedure synchronizes agent explanation, source evidence, twin state, and deterministic spatial interaction.
- Visual-only knowledge is retrievable and useful.
- Source evidence, verified reconstructions, and generated explanations are visibly distinct.
- Ordinary scene interactions remain responsive without unnecessary agent calls.
- Documentation explains startup, architecture, extraction, validation, and limitations.

## Setup and presentation logistics

The evaluator-facing setup path should be no longer than:

```bash
git clone <your-fork>
cd <your-fork>
cp .env.example .env
# install command
# run command
```

A hosted demonstration is helpful but not required. A clear README is required. A video walkthrough is strongly encouraged because it can demonstrate hard questions, multimodal behavior, and architectural reasoning more effectively than screenshots alone.

Submission consists of a fork URL provided through the challenge form linked from the [README](../../README.md). Reviews occur on a rolling basis according to the original brief.

## Implementation references

- [Implementation plan](../plans/implementation-plan.md) for current status, prototype lineage, delivery sequencing, and unresolved work
- [ADR 0001](../adr/0001-use-nextjs.md) for the current application-framework decision and feasibility gate
- [Architecture Constitution](../../ARCHITECTURE.md) for security, evidence, product-package, event, scene, and testing invariants
