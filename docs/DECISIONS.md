# Architectural Decisions

This document records significant architectural and technical decisions using an ADR (Architecture Decision Record) format.

---

## ADR-001: TypeScript as Primary Language

**Date:** 2026-08-26
**Status:** Accepted
**Context:** We need a language for the visualization engine, DSL definitions, AI integration, and (potentially) the UI layer.
**Decision:** TypeScript is the primary language for the system.
**Rationale:**
- Strong type system aligns with the DSL's structured nature
- Shared types between engine, renderers, and AI layer
- Excellent ecosystem for web-based rendering (Canvas, WebGL, SVG)
- Node.js runtime supports local-first deployment
- Large talent pool and library ecosystem
**Consequences:** Python (for Manim) is isolated as a separate service boundary. The TypeScript layer communicates with Manim via process invocation, not shared code.

---

## ADR-002: AI and Rendering Are Separate Concerns

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The temptation is to have the AI directly generate rendering code or have renderers include AI logic.
**Decision:** The AI layer produces structured JSON (the Visualization DSL). Renderers consume this JSON. Neither depends on the other.
**Rationale:**
- Separation of concerns makes each component independently testable and replaceable
- The AI can be swapped (Gemma → another model) without changing renderers
- Renderers can be improved without retraining or reconfiguring the AI
- Validation can happen between AI output and renderer input
**Consequences:** An extra layer of abstraction (the DSL) exists. This is intentional — it is the core coupling mechanism.

---

## ADR-003: Visualization DSL as Renderer-Independent JSON

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Multiple renderers (2D, 3D, Manim, math notation) need to consume the same visualization intent.
**Decision:** The DSL is a renderer-independent JSON structure. Renderers declare which DSL features they support.
**Rationale:**
- Allows the same AI output to drive multiple rendering backends
- Enables graceful degradation when a renderer doesn't support a feature
- Makes the system extensible — new renderers don't require DSL changes
- JSON is easy to validate, inspect, and debug
**Consequences:** DSL features must be designed to be renderer-agnostic. Renderer-specific features (e.g., WebGL shader parameters) should not leak into the DSL.

---

## ADR-004: Procedural Generation Over Manual Authoring

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The system needs to cover a wide range of educational topics. Manually creating visualizations for every topic is not scalable.
**Decision:** Visualizations are generated procedurally from reusable primitives, algorithms, and data.
**Rationale:**
- Covers an open-ended set of educational topics
- Primitives can be composed to create complex visualizations
- AI can generate novel combinations of primitives
- Reduces maintenance burden — fix a primitive, fix all visualizations using it
**Consequences:** Some visualizations may look less polished than hand-crafted ones. This is an acceptable trade-off for coverage and automation.

---

## ADR-005: Local-First Development

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The system should work without internet access and without cloud dependencies.
**Decision:** All core functionality runs locally. Local AI (Ollama), local rendering (browser/Node.js), no cloud APIs.
**Rationale:**
- Privacy: educational data stays on the user's machine
- Availability: works offline
- Performance: no network latency for rendering
- Cost: no cloud compute charges during development or use
- Simplicity: fewer external dependencies during development
**Consequences:** The local AI model (Gemma 4 E4B) is limited in capability compared to cloud models. This is accepted — the system is designed around the model's strengths.

---

## ADR-006: Node.js Built-in Test Runner

**Date:** 2026-08-26
**Status:** Accepted
**Context:** We need a test framework for unit and integration tests.
**Decision:** Use Node.js built-in test runner (`node:test`) instead of Jest, Vitest, or Mocha.
**Rationale:**
- Zero dependencies — aligns with "no premature infrastructure" principle
- Sufficient for unit tests and basic integration tests
- Can be replaced later if testing needs grow beyond its capabilities
**Consequences:** Fewer testing features (no built-in mocking, snapshots, etc.). Mocking can be added manually or with a lightweight library later.

---

## ADR-007: Manim Isolated as a Service

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Manim is a Python library. The rest of the system is TypeScript.
**Decision:** Manim runs as a separate Python process. The TypeScript system generates Manim Python scripts and invokes them as subprocesses. Python code is isolated in its own directory and does not mix with TypeScript code.
**Rationale:**
- Avoids complexity of TypeScript-Python interop (pyodide, napi-python, etc.)
- Manim has its own dependency management (pip, system libraries)
- Clear separation of concerns
- Manim can be optional — only installed when needed
**Consequences:** Extra step in the rendering pipeline (generate script → invoke Python → produce output). This latency is acceptable for cinematic animation use cases.

---

## ADR-008: ES Modules and Node16 Module Resolution

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Node.js supports both CommonJS and ES Modules.
**Decision:** Use ES Modules (`"type": "module"` in package.json) with `"module": "Node16"` in tsconfig.
**Rationale:**
- ES Modules are the modern standard
- Better tree-shaking and static analysis
- Aligns with browser-based rendering (which uses ESM)
- Node.js 20+ has mature ESM support
**Consequences:** Must use `.js` extensions in imports (TypeScript resolves to `.ts`). This is a minor inconvenience but required for Node16 module resolution.

---

## ADR-009: Domain-Agnostic IR with Composable Primitives

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The IR must represent educational content across many domains (math, physics, biology, engineering, processes) without creating domain-specific types for each.
**Decision:** Use a small set of generic entity types (shape, text, data, graph, connection, abstract, group) with a flexible property bag, rather than creating `CellEntity`, `PhysicsEntity`, `ChemistryEntity`, etc.
**Rationale:**
- Adding a new domain requires zero IR changes — only new property combinations
- The AI (Gemma) generates the same IR structure regardless of domain
- Fewer types means easier validation and simpler renderer code
- Property bags are naturally JSON-serializable and easy for LLMs to generate
- Relationships (containment, edge, constraint, reference) capture structure that would otherwise require domain-specific types
**Consequences:** Renderers must interpret property bags generically rather than accessing typed fields. This is intentional — renderers are the place for domain-specific rendering logic.

---

## ADR-010: Property Bag Pattern for Entity Properties

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Entity properties need to support static values, animations, and user interactions in a uniform way.
**Decision:** Each entity has a `properties: Record<string, Prop | Value>` bag where `Prop` is `{ value, anim?, interact? }` and `Value` is a union of primitives, vectors, references, and expressions.
**Rationale:**
- Uniform structure simplifies renderer code — every property is accessed the same way
- Animation and interaction are layered on top of base values, not separate systems
- The AI generates a flat property object, which is natural for JSON output
- Expressions and references enable reactive relationships without hard-coded logic
**Consequences:** There is no compile-time enforcement of which properties an entity type should have. This is intentional — the property set is open-ended by design.

---

## ADR-011: Runtime Validation Over Schema Validation

**Date:** 2026-08-26
**Status:** Accepted
**Context:** IR documents must be validated before rendering, especially when generated by AI.
**Decision:** Implement validation as TypeScript functions rather than using a JSON Schema library (ajv, zod, etc.).
**Rationale:**
- Zero additional dependencies — aligns with "no premature infrastructure" principle
- TypeScript type system provides compile-time checking; runtime validation is for AI-generated JSON
- Validation functions are straightforward to write and test
- Can migrate to a schema library later if validation complexity grows
**Consequences:** Validation is structural (field existence, types, references) rather than semantic (domain rules). Semantic validation will be added incrementally as needed.

---

## ADR-012: DSL as Ergonomic Authoring Layer Over IR

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Phase 2 requires a DSL design. The key question is whether the DSL should be a separate JSON format that compiles to the IR, or conventions + builder API over the IR itself.
**Decision:** The DSL is conventions + builder API over the IR. No separate JSON format.
**Rationale:**
- The IR already has the right abstraction level (7 entity types, 4 relationship types, property bags, animations, interactions)
- A separate format would duplicate the IR schema, creating two representations to maintain
- The IR JSON is already simple enough for Gemma 4 E4B to generate reliably
- Builder functions add ergonomics without changing the data model
- One format to validate, one format to render — reduces surface area for bugs
- The "DSL" becomes the documented conventions for how to use the IR effectively
**Consequences:** The DSL and IR share the same type system. "Compilation" is mostly applying defaults, validating, and normalizing. The DSL design document (VISUALIZATION_DSL.md) establishes conventions that the AI layer will follow when generating IR.

---

## ADR-013: Engine Is Platform-Independent

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The engine must work across Node.js and browser environments, and must not couple to any rendering technology.
**Decision:** The engine module (`src/engine/`) contains zero browser APIs, zero Three.js, zero Canvas, zero WebGL. It is pure TypeScript.
**Rationale:**
- The engine's job is validation, preprocessing, selection, and orchestration — none of which require DOM or GPU
- Platform independence enables testing in Node.js without polyfills
- Renderers are the appropriate place for platform-specific code
- The engine can be unit-tested without a browser environment
**Consequences:** Any code that touches the DOM, Canvas, or WebGL must live in renderer modules, not in the engine.

---

## ADR-014: Capability-Based Renderer Selection

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Multiple renderers may be registered. The engine needs a strategy to pick the right one for a given scene.
**Decision:** Renderers declare capabilities (entity types, relationship types, features). The engine extracts scene requirements from the IR and matches them against renderer capabilities using a specificity score.
**Rationale:**
- Explicit capability declarations make renderer limitations visible
- Specificity scoring favors the most precise renderer (e.g., a 2D-only renderer is preferred over a generic one for 2D scenes)
- The system degrades gracefully — if no renderer matches, a clear error is returned
- Renderers can be prioritized for tie-breaking
**Consequences:** Renderers must accurately declare their capabilities. Under-declaring causes missed renders; over-declaring causes incorrect routing.

---

## ADR-015: Renderer-Independent Event System

**Date:** 2026-08-26
**Status:** Accepted
**Context:** Interactive visualizations need an event model that works across different rendering backends (Canvas, WebGL, Manim).
**Decision:** The engine defines a renderer-independent event/action model. Events (user interactions, animation ticks, system triggers) produce typed actions (set property, animate, add/remove entity). Renderers emit events; the engine processes them.
**Rationale:**
- Renderers should not contain orchestration logic — they detect and emit events
- The engine owns state transitions (property changes, entity additions/removals)
- A single event model works for all renderer types
- Actions are composable and queueable for batch processing
**Consequences:** Renderers must adapt to the engine's event model rather than using their own. This adds a small integration cost but ensures consistency.

---

## ADR-016: String-Based SVG Generation

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The SVG renderer needs to generate SVG elements. The question is whether to use DOM manipulation APIs or string construction.
**Decision:** Build SVG elements as strings using template literals, not DOM APIs.
**Rationale:**
- Works in Node.js without any DOM polyfill or jsdom dependency
- Fully testable without a browser environment
- Output is serializable — SVG strings can be written to files, sent over network, or inspected in tests
- DOM adapter is isolated behind `typeof document` guard for browser mounting
- SVG is text-based by nature — string construction is natural
**Consequences:** Must manually escape XML special characters (`<`, `>`, `&`, `"`, `'`). The `escapeXml()` utility handles this. The DOM adapter (`adapter.ts`) provides browser integration but is not required for the renderer to function.

---

## ADR-017: Minimal Animation Strategy

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The IR supports rich animation (keyframes, easing, loops, timelines). The SVG renderer must handle animation without building a full runtime animation engine.
**Decision:** Animate only CSS-animatable SVG properties via `<animate>` elements. Non-CSS-animatable properties are preserved as structured metadata.
**Rationale:**
- SVG `<animate>` handles opacity, fill, stroke, stroke-width, font-size reliably
- Position, radius, and dimensions require attribute animation which SVG `<animate>` supports with `attributeName` but has limited easing support
- Building a runtime animation engine in the renderer violates the "keep animation minimal" principle
- Preserving animation metadata (not discarding it) allows a future UI layer or animation engine to consume it
- The renderer documents which properties it can animate vs. which are metadata-only
**Consequences:** Some animations will not play in the SVG output. The structured metadata in `SvgAnimationMeta[]` preserves the intent for future consumption. This is an acceptable trade-off for implementation simplicity.

---

## ADR-018: Interaction as Data Attributes

**Date:** 2026-08-26
**Status:** Accepted
**Context:** The IR supports interactions (click, hover, drag, input). The SVG renderer must represent interactions without coupling to a specific event handling system.
**Decision:** Render interactions as `data-*` attributes on SVG elements (`data-entity-id`, `data-entity-type`, `data-interactive`, `data-cursor`, `data-tooltip`).
**Rationale:**
- SVG elements support arbitrary `data-*` attributes
- A consuming application can attach event listeners by querying these attributes
- The renderer stays pure — no `addEventListener` calls, no DOM event coupling
- Works in both string mode (attributes are in the SVG markup) and DOM mode
- Standard HTML5 data attributes are well-understood and widely supported
**Consequences:** The SVG output alone does not create interactive behavior. A UI layer must interpret the data attributes and attach event listeners. This is intentional — the renderer produces data, not behavior.
