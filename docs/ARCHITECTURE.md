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

### Visualization DSL

A JSON-based structured representation of a visualization. Contains:

- **Scene**: Top-level container with metadata, parameters, and steps
- **Entities**: Visual objects (shapes, text, graphs, data series, etc.)
- **Relationships**: Connections between entities (arrows, constraints, equations)
- **Layout**: Spatial arrangement rules
- **Animation**: Temporal sequences and transitions
- **Interactivity**: User-controllable parameters and callbacks

The DSL is defined as TypeScript types. Validation ensures specifications are well-formed before rendering.

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
