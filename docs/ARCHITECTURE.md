# Architecture

## Design Principles

1. **AI and rendering are separate concerns.** The AI produces structured data. The renderer consumes it. Neither depends on the other.

2. **AI outputs structured data, not rendering code.** The AI should never generate arbitrary rendering code. It outputs a Visualization DSL — a declarative, validated specification of what to visualize.

3. **Visualization DSL is renderer-independent.** The same DSL document can be consumed by a 2D canvas renderer, a 3D WebGL renderer, or a Manim-based animation renderer.

4. **Multiple renderers share the same representation.** The system routes a DSL document to the appropriate renderer based on the visualization type or user preference.

5. **Interactive and non-interactive outputs.** Some visualizations are static diagrams or step-through animations. Others accept real-time user input (dragging, parameter adjustment). Both modes are first-class.

6. **Procedural generation over manual authoring.** Visualizations are built from reusable primitives and algorithms, not from a library of pre-built assets.

7. **Extensible visualization domains.** Adding a new domain (e.g., chemistry molecular models, musical theory) requires defining new primitives and renderer bindings, not rewriting the core engine.

8. **Modular and testable.** Each layer — DSL types, validation, rendering, AI integration — is independently testable.

9. **No premature infrastructure.** Start with the simplest possible setup. Add complexity only when it is needed.

10. **Local-first.** The initial version runs entirely on the user's machine with no network dependencies.

## System Layers

```
┌─────────────────────────────────┐
│         User Interface          │  (future: web app, CLI)
├─────────────────────────────────┤
│       AI Reasoning Layer        │  (future: Gemma 4 E4B via Ollama)
│  Input → DSL specification      │
├─────────────────────────────────┤
│     Visualization DSL (JSON)    │  ← core of the system
│  Renderer-independent spec      │
├─────────────────────────────────┤
│       Renderer Registry         │
│  Routes DSL to correct renderer │
├──────┬──────┬──────┬───────────┤
│ 2D   │ 3D   │Math  │  Manim    │  (each is a separate module)
│Canvas│WebGL │Notation│ Renderer │
└──────┴──────┴──────┴───────────┘
```

## Key Components

### Visualization IR (Intermediate Representation)

The IR is the core contract in the system. It is a renderer-independent, JSON-serializable data structure that describes what to visualize — not how to render it.

**Why an IR exists:**
- The AI (Gemma) must produce structured output that renderers can consume
- Multiple renderers (2D, 3D, Manim) need the same input format
- The IR is the boundary between AI reasoning and rendering execution
- It can be validated, inspected, versioned, and debugged independently

**IR Structure:**

```
Scene
├── meta          — version, title, description, tags
├── variables     — named constants for expressions
├── entities[]    — the things that exist
│   ├── id        — unique identifier
│   ├── type      — shape | text | data | graph | connection | abstract | group
│   ├── name      — optional human-readable name
│   └── properties — flexible property bag
│       ├── value     — base value (primitives, vectors, refs, expressions)
│       ├── anim      — optional animation (keyframes, easing, duration)
│       └── interact  — optional user interaction handlers
├── relationships[] — connections between entities
│   ├── type      — edge | containment | constraint | reference
│   ├── from/to   — entity references
│   └── label     — optional description
├── animations[]  — top-level animation bindings (target → keyframes)
├── timelines[]   — sequenced steps for step-through animations
└── viewport      — canvas dimensions, background, camera
```

**Key design decisions:**

1. **Domain-agnostic.** No `CellEntity`, `PhysicsEntity`, or `ChemistryEntity`. The same `Entity` type with a flexible property bag represents any domain. A cell is a `group` entity with `shape: "ellipse"` and containment relationships. A particle is an `abstract` entity with `position`, `velocity`, and `mass` properties.

2. **Composable.** Entities are composed through properties and relationships, not inheritance. A graph node is a `graph` entity positioned via properties. A flowchart is a collection of `shape` entities connected by `edge` relationships.

3. **Property bag pattern.** Each entity has a `Record<string, Prop | Value>` properties bag. Properties can be static values, animated (with keyframes), or interactive (with event handlers). This makes the same structure work for both static and dynamic visualizations.

4. **Reference system.** Values can reference other entities (`{ ref: "entityId", property: "x" }`) or use expressions (`{ expr: "a + b", vars: {...} }`). This enables relationships like "particle position follows force field acceleration" without hard-coding domain logic.

5. **Separation of concerns.** The IR describes WHAT exists and HOW it behaves temporally/spatially. It does NOT describe HOW a renderer should draw it. A renderer decides whether to draw a `shape` entity as a Canvas arc, a Three.js sphere, or a Manim circle.

**Example — mathematical circle:**

```json
{
  "meta": { "version": "1.0", "title": "Circle" },
  "entities": [
    {
      "id": "circle1",
      "type": "shape",
      "properties": {
        "shape": "circle",
        "radius": {
          "value": 1,
          "anim": {
            "keyframes": [
              { "offset": 0, "value": 1 },
              { "offset": 1, "value": 2 }
            ],
            "duration": 2000,
            "easing": "easeInOut"
          }
        },
        "fill": "#4A90D9"
      }
    }
  ]
}
```

**Example — physics particle:**

```json
{
  "meta": { "version": "1.0", "title": "Projectile" },
  "entities": [
    {
      "id": "particle",
      "type": "abstract",
      "properties": {
        "mass": 1.0,
        "position": { "x": 0, "y": 0 },
        "velocity": { "x": 10, "y": 20 },
        "acceleration": { "ref": "gravity", "property": "acceleration" }
      }
    },
    {
      "id": "gravity",
      "type": "abstract",
      "properties": {
        "acceleration": { "x": 0, "y": -9.81 }
      }
    }
  ]
}
```

**Validation:**

The `validateScene()` function performs structural validation of IR documents:
- Required fields exist and have correct types
- Entity IDs are valid non-empty strings
- Entity types are from the allowed set
- Relationship types are valid
- Animation keyframes have required fields
- References point to existing entities
- Variables and timelines have correct structure

Invalid documents are rejected before reaching any renderer.

### Visualization DSL

The DSL is the authoring layer for creating IR documents. It consists of:

1. **Conventions** — documented patterns for expressing common visualization structures
2. **Builder API** — TypeScript functions that produce IR documents ergonomically
3. **Compilation** — the DSL compiles directly to the IR (`Scene` type)

The DSL does NOT introduce a new JSON format. The IR is the interchange format. The DSL is how humans and programs construct IR documents.

**Key design decision:** DSL = ergonomic authoring layer over IR (not a separate format).

**Why not a separate format?**
- The IR already has the right abstraction level (entity types, property bags, relationships, animations)
- A separate JSON format would duplicate the IR schema without clear benefit
- LLMs generate JSON — the IR JSON is already simple enough for Gemma to produce
- One format to validate, one format to render — less surface area for bugs

See [docs/VISUALIZATION_DSL.md](VISUALIZATION_DSL.md) for the full DSL design, conventions, and examples.

### Renderer Registry

A mapping from DSL visualization types to renderer implementations. When a DSL document specifies `"type": "2d-canvas"`, the registry routes it to the 2D Canvas renderer. Renderers declare which DSL features they support.

### Renderer Interface

Every renderer implements a common interface:

```
initialize(container) → void
render(dslDocument) → void
update(parameters) → void
dispose() → void
```

Renderers may support subsets of the DSL. Unsupported features are either degraded gracefully or rejected with clear errors.

### AI Reasoning Layer (future)

Converts natural language into DSL documents. The AI:

- Receives a user question or educational prompt
- Reasons about what type of visualization would be helpful
- Produces a DSL JSON document
- Optionally includes annotations explaining its reasoning

The AI is a planner. It does not render. It does not generate code.

## Technology Stack

| Layer | Technology | Rationale |
|---|---|---|
| Language | TypeScript | Type safety, ecosystem, shared types across layers |
| Runtime | Node.js 20+ | Local-first, good TypeScript support |
| 2D Rendering | Canvas API / SVG | Browser-native, no dependencies for Phase 4 |
| 3D Rendering | Three.js | Mature WebGL abstraction, large ecosystem |
| Math Notation | KaTeX | Fast, LaTeX-compatible math rendering |
| Animation (cinematic) | Manim (Python) | Best-in-class mathematical animation, isolated as a service |
| Local AI | Ollama + Gemma 4 E4B | Local inference, good educational reasoning |
| Testing | Node.js test runner | Zero-dependency, built into Node 20+ |
| Linting | ESLint | Standard, extensible |
