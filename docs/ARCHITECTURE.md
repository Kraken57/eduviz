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
│SVG ✅│WebGL │Notation│ Renderer │
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
initialize() → Promise<void>
canRender(scene, requirements?) → boolean
render(context) → Promise<RenderResult>
dispose() → Promise<void>
```

Renderers may support subsets of the DSL. Unsupported features are either degraded gracefully or rejected with clear errors.

### Core Visualization Engine

The engine orchestrates the rendering pipeline. It sits between the IR/DSL layer and the renderer implementations:

```
Scene (IR) → Engine → Preprocessed Scene → Renderer Selection → Renderer → RenderResult
```

**Engine components:**

1. **Preprocessing Pipeline** — Validates the scene, builds entity lookup indices (by ID, by containment, by relationship), resolves value references, normalizes properties, and extracts scene requirements (which entity types, relationship types, and features are needed).

2. **Renderer Registry** — Stores registered renderers with priority. Provides lookup by ID, entity type, relationship type, and capability matching.

3. **Renderer Selection** — Matches scene requirements against renderer capabilities. Uses specificity scoring: the renderer that best matches the required entity types, relationship types, and features is selected. Supports explicit target override.

4. **Event System** — Renderer-independent event/action model. Events (user interactions, animation ticks, system triggers) produce actions (set property, animate, add/remove entity). Renderers emit events; the engine processes them and applies actions.

**Rendering flow:**

1. Validate the incoming scene (IR validation)
2. Preprocess: build entity index, resolve references, extract requirements
3. Select a renderer (explicit target or best-match)
4. Execute the renderer's `render()` method
5. Return the `RenderResult` (success/failure, output, errors, metadata)

**Key design decisions:**

- **Engine is platform-independent.** No browser APIs, no Three.js, no Canvas. Pure TypeScript.
- **Engine does not render.** It validates, preprocesses, selects, and delegates. Actual rendering happens in renderer modules.
- **Capability-based selection.** Renderers declare what they can handle. The engine picks the best fit.
- **Deterministic preprocessing.** Entity sorting and normalization are deterministic for reproducible results.

### SVG 2D Renderer

The SVG 2D renderer is a plugin that implements the `Renderer` interface. It produces interactive 2D visualizations as SVG documents.

**Architecture:**

```
src/renderers/svg/
├── types.ts          — SVG-internal types (SvgRenderContext, SvgSceneOutput, SvgAnimationMeta)
├── builders.ts       — Low-level SVG element string builders (circle, rect, text, etc.)
├── properties.ts     — IR property → SVG attribute extraction
├── shapes.ts         — Shape entity → SVG element mapping
├── text.ts           — Text entity rendering with multi-line tspan support
├── connections.ts    — Edge/relationship rendering with arrowheads and labels
├── groups.ts         — Group/hierarchy SVG `<g>` nesting
├── animations.ts     — SVG `<animate>` for supported properties; metadata for others
├── interactions.ts   — data-entity-id, data-interactive, data-cursor, data-tooltip attributes
├── fallback.ts       — Labeled dashed rect for unsupported entity types
├── output.ts         — SVG document assembly, viewport wrapping, serialization
├── adapter.ts        — DOM mounting (guarded behind typeof document)
├── renderer.ts       — SvgRenderer class implementing Renderer interface
└── index.ts          — Public API barrel
```

**Key design decisions:**

1. **String-based SVG generation.** SVG elements are constructed as strings, not DOM nodes. This makes the renderer work in Node.js (no browser dependency), testable without a DOM environment, and serializable to files. The DOM adapter is isolated and guarded.

2. **Minimal animation strategy.** Only animatable SVG properties (opacity, fill, stroke, stroke-width, font-size) use SVG `<animate>` elements. Non-CSS-animatable properties (radius, position, dimensions) are preserved as structured `SvgAnimationMeta` in the output — not discarded. This avoids the complexity of a runtime animation engine while preserving animation data for future use.

3. **Fallback for unsupported types.** Any entity type not yet implemented renders as a labeled dashed rectangle. This ensures every scene produces visual output even if the renderer doesn't support a specific entity type.

4. **Interaction as data attributes.** Interactions are rendered as `data-*` attributes on SVG elements. A consuming application (future UI layer) can attach event listeners based on these attributes. The renderer does not attach event listeners itself.

5. **Plugin isolation.** The SVG renderer lives entirely in `src/renderers/svg/`. It imports IR types from `src/ir/` but never modifies them. The core engine and DSL are untouched.

### Browser Playground

The browser playground is a React + Vite development interface for visually testing the visualization pipeline. It exercises the full rendering pipeline: DSL examples → `VisualizationEngine` → `SvgRenderer` → SVG DOM mounting.

**Architecture:**

```
src/playground/
├── vite.config.ts       — Vite config with @src alias for source imports
├── tsconfig.json        — Extends root tsconfig, adds JSX + bundler resolution
├── index.html           — HTML entry point
├── main.tsx             — React root mount
├── App.tsx              — Main component: engine setup, state, rendering
├── styles/global.css    — Layout and component styles
├── components/
│   ├── ExampleSelector.tsx   — Sidebar list of example scenes
│   ├── VisualizationPanel.tsx — SVG output container + toolbar
│   └── SceneInfo.tsx         — Metadata panel (entity count, status, warnings)
└── examples/
    └── index.ts         — 6 example scene definitions + Example interface
```

**Key design decisions:**

1. **Full pipeline, not direct SVG.** The playground instantiates a `VisualizationEngine`, registers the `SvgRenderer`, and calls `engine.render()` for each example. This tests the exact same path that production code will use.

2. **Isolated from core.** `src/playground/` is excluded from the root tsconfig build (`tsc`). React JSX files are compiled only by Vite. The core library (`src/ir/`, `src/dsl/`, `src/engine/`, `src/renderers/`) remains pure TypeScript with no React dependency.

3. **Scene definitions are pure TypeScript.** Example scenes use only DSL builder functions and IR types. They can be tested by both the Node.js test runner (via `src/playground.test.ts`) and rendered by the Vite dev server.

4. **DOM adapter integration.** The playground uses `mountSvg()` from the SVG adapter to inject rendered SVG into a React ref container. The adapter is guarded behind `typeof document` checks, so it works in both browser and Node.js test environments.

5. **Examples cover multiple domains.** The 6 examples exercise different entity types, relationships, animations, and viewport configurations — providing visual regression coverage for the SVG renderer.

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
