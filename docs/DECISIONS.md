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
