# Development Roadmap

## Phase 0: Foundation ✅

**Goal:** Establish project structure, documentation, and development tooling.

- Initialize TypeScript project with Node.js
- Set up build, lint, typecheck, and test commands
- Create project documentation (this file, ARCHITECTURE, PRODUCT, etc.)
- Define directory structure and conventions

**Deliverable:** A buildable, lintable project with clear documentation.

---

## Phase 1: Core Visualization Data Model ✅

**Goal:** Define the TypeScript types that represent the visualization domain.

- Defined domain-agnostic entity types: shape, text, data, graph, connection, abstract, group
- Defined relationship types: edge, containment, constraint, reference
- Defined property system: value, animation, interaction layered together
- Defined animation types: keyframes, easing, timelines, step-through
- Defined interactivity types: click, hover, drag, input events with actions
- Defined reference system: entity references, expressions, variables
- Implemented runtime validation for IR documents
- Created 30 unit tests covering all required scenarios

**Depends on:** Phase 0
**Deliverable:** `src/ir/` module with types, validation, and tests.

---

## Phase 2: Visualization DSL ✅

**Goal:** Create the DSL specification format, builder helpers, and comprehensive validation.

- Design DSL as conventions + builder API over the IR (see docs/VISUALIZATION_DSL.md)
- Implement TypeScript builder functions for ergonomic IR construction
- Define property naming conventions and structural patterns
- Create domain-agnostic idioms for common visualization patterns
- Write tests for builder functions and DSL validation
- Document the DSL format with 6 domain examples

**Depends on:** Phase 1
**Deliverable:** `src/dsl/` module with builder API, conventions documentation, and tests.

---

## Phase 3: Core Visualization Engine

**Goal:** Build the engine that takes a DSL document and routes it to renderers.

- Implement renderer registry (register, lookup, route)
- Implement renderer interface contract
- Create DSL preprocessing pipeline (validation, optimization, defaulting)
- Implement event system for renderer lifecycle
- Write engine integration tests

**Depends on:** Phase 2
**Deliverable:** `src/engine/` module with registry, pipeline, and events.

---

## Phase 4: 2D Renderer

**Goal:** Build a renderer that produces interactive 2D visualizations.

- Implement Canvas 2D renderer (shapes, text, colors, transforms)
- Implement SVG renderer as alternative
- Support basic layout (grid, flow, positioned)
- Support basic animation (transitions, step-through)
- Support interactivity (parameter controls, hover, click)
- Create example visualizations: number line, coordinate plane, Venn diagrams, flowcharts

**Depends on:** Phase 3
**Deliverable:** `src/renderers/2d/` module.

---

## Phase 5: 3D Renderer

**Goal:** Build a renderer for interactive 3D visualizations.

- Integrate Three.js for WebGL rendering
- Map DSL entities to 3D primitives (meshes, lights, cameras)
- Support 3D-specific features: orbit controls, multiple views
- Support interactive parameter adjustment in 3D
- Create examples: geometric solids, coordinate systems, data surfaces

**Depends on:** Phase 3, Phase 4 (for shared abstractions)
**Deliverable:** `src/renderers/3d/` module.

---

## Phase 6: Manim Renderer

**Goal:** Build a renderer that generates Manim (Python) output.

- Implement Manim scene generation from DSL
- Map DSL entities to Manim mobjects and animations
- Support step-by-step mathematical explanations
- Implement as a subprocess/service boundary (Python isolated from TypeScript)
- Create examples: proof animations, function graphing, matrix operations

**Depends on:** Phase 3
**Deliverable:** `src/renderers/manim/` module (TypeScript side) + Python service.

---

## Phase 7: Tool Interface

**Goal:** Build the user-facing interface for interacting with the system.

- Implement CLI interface for quick testing and development
- Implement web-based UI for interactive use
- Support parameter input and visualization selection
- Support real-time parameter adjustment and re-rendering

**Depends on:** Phase 4 (at minimum)
**Deliverable:** `src/cli/` and `src/ui/` modules.

---

## Phase 8: Local Gemma/Ollama Integration

**Goal:** Connect to a local LLM for AI-powered visualization generation.

- Implement Ollama client (HTTP API integration)
- Implement prompt engineering for DSL generation
- Implement DSL extraction from LLM responses
- Support streaming and incremental output
- Handle errors, timeouts, and malformed responses

**Depends on:** Phase 2, Phase 7 (for UI)
**Deliverable:** `src/ai/` module.

---

## Phase 9: AI → DSL → Renderer Pipeline

**Goal:** Complete end-to-end flow from natural language to rendered visualization.

- Wire AI reasoning layer to DSL validation to renderer
- Implement visualization type inference from DSL
- Implement fallback strategies when renderers don't support features
- Add user confirmation/adjustment step before rendering
- Test with a suite of educational prompts

**Depends on:** Phase 8, Phase 3
**Deliverable:** End-to-end pipeline integration.

---

## Phase 10: Interactive Educational Application

**Goal:** Build a polished, usable application for students.

- Integrate all renderers into a unified interface
- Implement session management and visualization history
- Add guided prompts and educational scaffolding
- Support multi-step problem solving with sequential visualizations
- Create comprehensive example library demonstrating capabilities

**Depends on:** Phase 9
**Deliverable:** Usable interactive application.

---

## Phase 11: Validation and Self-Correction

**Goal:** Enable the AI to validate and improve its own output.

- Implement DSL validation feedback loop (AI → DSL → validate → re-prompt)
- Implement visual output quality assessment
- Add user feedback collection (was this visualization helpful?)
- Implement iterative refinement based on feedback
- Add explanation generation alongside visualizations

**Depends on:** Phase 9, Phase 10
**Deliverable:** Self-improving visualization pipeline.

---

## Phase 12: Performance and Productionization

**Goal:** Optimize for real-world usage.

- Performance profiling and optimization
- Renderer caching and incremental updates
- Resource management for complex visualizations
- Error recovery and graceful degradation
- Documentation for extending with new renderers and domains
- Packaging for distribution

**Depends on:** Phase 10
**Deliverable:** Production-ready system.

---

## Phase Dependency Order

```
Phase 0  (Foundation)
  └── Phase 1  (Data Model)
        └── Phase 2  (DSL)
              ├── Phase 3  (Engine)
              │     ├── Phase 4  (2D Renderer)
              │     │     └── Phase 7  (Tool Interface)
              │     ├── Phase 5  (3D Renderer)
              │     └── Phase 6  (Manim Renderer)
              └── Phase 8  (AI Integration)
                    └── Phase 9  (End-to-End Pipeline)
                          └── Phase 10 (Application)
                                ├── Phase 11 (Self-Correction)
                                └── Phase 12 (Productionization)
```

## Rationale for Phase Ordering

- **Phases 0-2 (Foundation → Data Model → DSL)** are strictly sequential because each builds on the previous type system.
- **Phase 3 (Engine)** depends on the DSL but can be developed in parallel with early renderer prototypes.
- **Phases 4-6 (Renderers)** can be developed in parallel once the engine exists, but Phase 4 (2D) is prioritized because it enables the tool interface.
- **Phase 7 (Tool Interface)** is placed after Phase 4 because having at least one working renderer makes the interface useful.
- **Phase 8 (AI Integration)** depends on the DSL (Phase 2) and a tool interface (Phase 7) for testing, but not on the renderers themselves.
- **Phase 9 (Pipeline)** wires everything together and requires at least one renderer and the AI layer.
- **Phases 10-12** are refinements and productionization of the complete system.
