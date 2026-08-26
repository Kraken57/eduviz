# Visualization DSL Design

## What the DSL Is

The Visualization DSL is the authoring layer for creating IR documents. It consists of:

1. **Conventions** — documented patterns for expressing common visualization structures in the IR
2. **Builder API** — TypeScript functions that produce IR documents ergonomically
3. **Compilation** — the DSL compiles directly to the IR (Phase 1 `Scene` type)

The DSL does NOT introduce a new JSON format. The IR **is** the interchange format. The DSL is how humans and programs construct IR documents.

## What Problem It Solves

The raw IR is flexible but unconstrained. Without conventions:
- Different authors use different property names for the same concept
- Common patterns (grids, hierarchies, simulations) require repetitive boilerplate
- LLMs receive no guidance on structural patterns
- There is no documented "right way" to represent a cell, a force diagram, or a flowchart

The DSL solves this by establishing:
- **Property naming conventions** (e.g., always use `position`, not `loc` or `pos`)
- **Structural patterns** (e.g., hierarchies use `group` entities + `containment` relationships)
- **Builder functions** (e.g., `scene()`, `entity()`, `group()`, `animate()`)
- **Domain-agnostic idioms** (e.g., "physics particle" = `abstract` entity with `position`, `velocity`, `mass` properties)

## How It Relates to the IR

```
DSL (authoring)          IR (canonical)
──────────────          ──────────────
Builder API         →   Scene JSON
Conventions         →   Property naming, structural patterns
Compilation         →   1:1 mapping (DSL outputs are IR documents)
```

The DSL and IR share the same type system (`src/ir/types.ts`). The builder API imports IR types and produces IR documents. There is no translation step — the DSL is a convenience layer, not a separate representation.

**Chosen approach: DSL = ergonomic authoring layer over IR.**

**Justification:**
- The IR already has the right abstraction level (entity types, property bags, relationships, animations, interactions)
- A separate JSON format would duplicate the IR schema without clear benefit
- LLMs generate JSON — the IR JSON is already simple enough for Gemma to produce
- Builder functions add ergonomics for programmatic generation without changing the data model
- One format to validate, one format to render — less surface area for bugs

## Core Concepts

### Scene

A scene is the top-level container. Every visualization is a scene.

```
Scene
├── meta          — version, title, description, tags
├── variables     — named constants (gravity, pi, scale factors)
├── entities[]    — the things that exist
├── relationships[] — how entities connect
├── animations[]  — how properties change over time
├── timelines[]   — sequenced steps for step-through
└── viewport      — canvas size, background, camera
```

### Entity

An entity is a thing in the visualization. Every entity has:
- `id` — unique identifier (string, snake_case recommended)
- `type` — one of 7 types (see below)
- `name?` — human-readable label
- `properties` — flexible property bag

**The 7 entity types:**

| Type | Use For | Examples |
|---|---|---|
| `shape` | Visual geometric objects | circle, rectangle, line, path, arrow, polygon |
| `text` | Labels, equations, annotations | "r = 5", "F = ma", axis labels |
| `data` | Data representations | charts, scatter plots, tables, heatmaps |
| `graph` | Network/graph nodes | social network nodes, decision tree nodes |
| `connection` | Explicit connection objects | weighted edges, springs, wires |
| `abstract` | Non-visual conceptual entities | forces, fields, variables, states, concepts |
| `group` | Container for hierarchical nesting | cell, subsystem, module, category |

**Key rule:** No domain-specific entity types. A cell is a `group`. A particle is `abstract`. A force diagram uses `abstract` entities for forces and `shape` entities for arrows.

### Relationship

Relationships connect entities. Every relationship has:
- `type` — one of 4 types
- `from` — source entity ID
- `to` — target entity ID
- `label?` — human-readable description
- `properties?` — additional data

**The 4 relationship types:**

| Type | Meaning | Example |
|---|---|---|
| `containment` | Parent-child hierarchy | cell contains nucleus |
| `edge` | Directed connection | A → B, flow direction |
| `constraint` | Physical/logical constraint | particle subject to gravity |
| `reference` | Non-hierarchical reference | label refers to shape |

### Property

Properties are the data on entities. The IR uses a flexible `PropertyBag = Record<string, Prop | Value>`.

**Convention:** Use descriptive, consistent property names.

**Spatial properties:**
- `position` — `{ x, y }` or `{ x, y, z }`
- `width`, `height` — dimensions
- `radius` — for circles
- `rotation` — angle in degrees
- `scale` — uniform or `{ x, y }`
- `transform` — composite transform object

**Visual properties:**
- `fill` — color string or gradient
- `stroke` — border color
- `strokeWidth` — border thickness
- `opacity` — 0 to 1
- `fontSize` — text size
- `fontFamily` — text font

**Data properties:**
- `value` — current value
- `min`, `max` — range bounds
- `data` — array of values
- `label` — text content

**Physics properties:**
- `mass`, `velocity`, `acceleration`, `force`
- `stiffness`, `damping` (for springs)
- `charge`, `gravity` (for fields)

**Any property can be:**
- A static value: `{ "fill": "#4A90D9" }`
- An animated value: `{ "radius": { "value": 1, "anim": { ... } } }`
- A reference: `{ "acceleration": { "ref": "gravity", "property": "acceleration" } }`
- An expression: `{ "force": { "expr": "mass * acceleration" } }`

### Animation

Animations describe how properties change over time.

**Two levels:**

1. **Inline animation** — on a property directly:
```json
{
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
  }
}
```

2. **Top-level animation binding** — targets a property path:
```json
{
  "animations": [
    {
      "target": "circle1.radius",
      "keyframes": [
        { "offset": 0, "value": 1 },
        { "offset": 1, "value": 2 }
      ],
      "duration": 2000
    }
  ]
}
```

**Timeline** — sequenced steps for educational walkthroughs:
```json
{
  "timelines": [
    {
      "id": "proof_steps",
      "steps": [
        { "time": 0, "description": "Given: a = b" },
        { "time": 2000, "description": "Multiply both sides by a" },
        { "time": 4000, "description": "Subtract b² from both sides" }
      ],
      "auto": true
    }
  ]
}
```

### Interaction

Interactions let users manipulate the visualization.

**Convention:** Attach interactions to entity properties via the `interact` field:

```json
{
  "properties": {
    "fill": {
      "value": "#3498DB",
      "interact": {
        "on": [
          {
            "event": "click",
            "action": {
              "type": "toggle",
              "target": "target_box.fill"
            }
          }
        ],
        "cursor": "pointer",
        "tooltip": "Click to toggle"
      }
    }
  }
}
```

**Supported events:** click, hover, drag, input, keydown, focus, blur

**Supported actions:** set (change a property), toggle, tooltip, emit (custom event)

### Hierarchy

Hierarchies use `group` entities with `containment` relationships.

**Convention:**
1. Create a `group` entity for the parent
2. Create child entities (any type)
3. Add `containment` relationships: `{ type: "containment", from: "parent_id", to: "child_id" }`

**Nesting is arbitrary depth.** A group can contain groups, which contain groups, etc.

```json
{
  "entities": [
    { "id": "aircraft", "type": "group", "name": "Aircraft" },
    { "id": "engine", "type": "group", "name": "Engine" },
    { "id": "compressor", "type": "group", "name": "Compressor" },
    { "id": "blade1", "type": "shape", "name": "Blade Row 1", "properties": { "shape": "blade" } }
  ],
  "relationships": [
    { "type": "containment", "from": "aircraft", "to": "engine" },
    { "type": "containment", "from": "engine", "to": "compressor" },
    { "type": "containment", "from": "compressor", "to": "blade1" }
  ]
}
```

### References

Values can reference other entities:

```json
{ "ref": "entity_id" }
{ "ref": "entity_id", "property": "position" }
```

Expressions can use variables and references:

```json
{ "expr": "mass * gravity", "vars": { "mass": { "ref": "particle", "property": "mass" }, "gravity": 9.81 } }
```

### Procedural Generation

The DSL expresses procedural intent through **generator patterns** — standard IR structures that describe algorithmic content:

| Pattern | Description | IR Representation |
|---|---|---|
| Grid | N×M repeated elements | `data` entity with `generator: "grid"`, `rows`, `cols` properties |
| Series | N items along a curve | `data` entity with `generator: "series"`, `count`, `function` properties |
| Graph | Nodes + edges from data | `graph` entities + `edge` relationships from adjacency data |
| Scatter | Points from (x,y) data | `data` entity with `generator: "scatter"`, `dataPoints` property |
| Hierarchy | Tree from parent-child data | `group` entities + `containment` relationships from tree data |
| Particles | N particles with initial state | N `abstract` entities generated from initial conditions |
| Coordinate system | Axes + grid lines | `shape` entities for axes + `data` entity for grid |
| Parametric curve | Points from parametric eq | `shape` entity with `generator: "parametric"`, expression |

The procedural engine (Phase 3+) interprets these patterns and expands them into concrete entities. The DSL only describes the intent — it does not store every generated object.

**Example — generate 10 points along a sine wave:**
```json
{
  "id": "sine_curve",
  "type": "data",
  "properties": {
    "generator": "parametric",
    "xExpr": "t",
    "yExpr": "sin(t)",
    "tMin": 0,
    "tMax": 6.28,
    "samples": 100,
    "stroke": "#E74C3C",
    "strokeWidth": 2
  }
}
```

**Example — generate a 5×5 grid:**
```json
{
  "id": "grid",
  "type": "data",
  "properties": {
    "generator": "grid",
    "rows": 5,
    "cols": 5,
    "cellWidth": 40,
    "cellHeight": 40,
    "fill": "#ECF0F1",
    "stroke": "#BDC3C7"
  }
}
```

## DSL → IR Compilation

Since the DSL is the IR with conventions, "compilation" is mostly:

1. **Apply defaults** — fill in missing optional fields (viewport, meta.version)
2. **Validate** — run `validateScene()` to check structure
3. **Resolve references** — verify all `{ ref: "..." }` targets exist
4. **Normalize** — ensure consistent property naming and structure

Builder functions handle steps 1-3 automatically. Raw JSON DSL documents require explicit validation.

## Examples

### Example 1: Mathematics — Animated Circle

A circle with an animated radius and a label.

```json
{
  "meta": { "version": "1.0", "title": "Circle with Animated Radius" },
  "entities": [
    {
      "id": "circle",
      "type": "shape",
      "name": "Unit Circle",
      "properties": {
        "shape": "circle",
        "position": { "x": 200, "y": 200 },
        "radius": {
          "value": 50,
          "anim": {
            "keyframes": [
              { "offset": 0, "value": 50 },
              { "offset": 0.5, "value": 100 },
              { "offset": 1, "value": 50 }
            ],
            "duration": 3000,
            "easing": "easeInOut",
            "loop": true
          }
        },
        "fill": "#4A90D9",
        "stroke": "#2C5F8A",
        "strokeWidth": 2
      }
    },
    {
      "id": "label",
      "type": "text",
      "properties": {
        "text": "r = 50",
        "position": { "x": 200, "y": 320 },
        "fontSize": 16,
        "fill": "#333333",
        "textAlign": "center"
      }
    }
  ],
  "relationships": [
    { "type": "reference", "from": "label", "to": "circle", "label": "describes radius" }
  ],
  "viewport": { "width": 400, "height": 400, "background": "#FFFFFF" }
}
```

**DSL conventions used:**
- `shape` entity with `shape: "circle"` property
- Position as `{ x, y }`
- Animation via inline `anim` on the `radius` property
- `text` entity for the label
- `reference` relationship linking label to circle

### Example 2: Physics — Projectile Motion

A particle with position, velocity, acceleration (from gravity), trajectory trace, and a timeline.

```json
{
  "meta": { "version": "1.0", "title": "Projectile Motion" },
  "variables": { "gravity": 9.81, "dt": 0.016 },
  "entities": [
    {
      "id": "particle",
      "type": "abstract",
      "name": "Projectile",
      "properties": {
        "mass": 1.0,
        "position": { "x": 0, "y": 0 },
        "velocity": { "x": 15, "y": 25 },
        "acceleration": { "ref": "gravity_field", "property": "acceleration" }
      }
    },
    {
      "id": "gravity_field",
      "type": "abstract",
      "name": "Gravity",
      "properties": {
        "acceleration": { "x": 0, "y": -9.81 }
      }
    },
    {
      "id": "ground",
      "type": "shape",
      "name": "Ground",
      "properties": {
        "shape": "line",
        "x1": -50, "y1": 0, "x2": 300, "y2": 0,
        "stroke": "#8B4513",
        "strokeWidth": 3
      }
    },
    {
      "id": "trajectory",
      "type": "data",
      "name": "Trajectory",
      "properties": {
        "chartType": "scatter",
        "dataPoints": [[0, 0], [15, 24.5], [30, 44.2], [45, 59.1], [60, 69.2]],
        "stroke": "#3498DB",
        "strokeWidth": 2,
        "pointRadius": 3
      }
    },
    {
      "id": "velocity_arrow",
      "type": "shape",
      "name": "Velocity Vector",
      "properties": {
        "shape": "arrow",
        "startX": { "ref": "particle", "property": "position.x" },
        "startY": { "ref": "particle", "property": "position.y" },
        "endX": { "expr": "position.x + velocity.x * 2" },
        "endY": { "expr": "position.y + velocity.y * 2" },
        "stroke": "#E74C3C",
        "strokeWidth": 2
      }
    }
  ],
  "relationships": [
    { "type": "constraint", "from": "particle", "to": "gravity_field", "label": "subject to" },
    { "type": "reference", "from": "trajectory", "to": "particle", "label": "path of" },
    { "type": "reference", "from": "velocity_arrow", "to": "particle", "label": "velocity of" }
  ],
  "animations": [
    {
      "target": "particle.position",
      "keyframes": [
        { "offset": 0, "value": { "x": 0, "y": 0 } },
        { "offset": 0.5, "value": { "x": 37.5, "y": 56.25 } },
        { "offset": 1, "value": { "x": 75, "y": 0 } }
      ],
      "duration": 5100,
      "easing": "linear"
    }
  ],
  "viewport": { "width": 500, "height": 300 }
}
```

**DSL conventions used:**
- `abstract` entity for the particle (non-visual conceptual object)
- `abstract` entity for gravity field (another non-visual concept)
- `shape` entity for the ground line
- `data` entity for the pre-computed trajectory points
- `constraint` relationship for "subject to gravity"
- `reference` relationships linking visual elements to the particle
- Expressions with `{ ref: ... }` and `{ expr: ... }` for dynamic values
- Top-level `animations` for the particle movement

### Example 3: Biology — Cell with Hierarchical Components

A cell containing a nucleus (which contains a nucleolus), mitochondria, and a membrane. The student can isolate the nucleus to explore its children.

```json
{
  "meta": { "version": "1.0", "title": "Animal Cell" },
  "entities": [
    {
      "id": "cell",
      "type": "group",
      "name": "Animal Cell",
      "properties": {
        "shape": "ellipse",
        "width": 250,
        "height": 180,
        "fill": "#F0F8FF",
        "stroke": "#2C3E50",
        "strokeWidth": 3
      }
    },
    {
      "id": "nucleus",
      "type": "group",
      "name": "Nucleus",
      "properties": {
        "shape": "circle",
        "radius": 45,
        "fill": "#9B59B6",
        "stroke": "#6C3483",
        "position": { "x": 0, "y": 0 },
        "selectable": true
      }
    },
    {
      "id": "nucleolus",
      "type": "shape",
      "name": "Nucleolus",
      "properties": {
        "shape": "circle",
        "radius": 14,
        "fill": "#7D3C98",
        "position": { "x": 5, "y": -3 }
      }
    },
    {
      "id": "chromatin",
      "type": "shape",
      "name": "Chromatin",
      "properties": {
        "shape": "path",
        "d": "M-10,10 Q5,-5 15,8 Q25,20 10,15",
        "stroke": "#4A235A",
        "strokeWidth": 2,
        "fill": "none",
        "position": { "x": -5, "y": 5 }
      }
    },
    {
      "id": "mito1",
      "type": "shape",
      "name": "Mitochondrion 1",
      "properties": {
        "shape": "ellipse",
        "width": 35,
        "height": 16,
        "fill": "#E74C3C",
        "stroke": "#C0392B",
        "position": { "x": 70, "y": 35 },
        "rotation": 30
      }
    },
    {
      "id": "mito2",
      "type": "shape",
      "name": "Mitochondrion 2",
      "properties": {
        "shape": "ellipse",
        "width": 32,
        "height": 15,
        "fill": "#E74C3C",
        "stroke": "#C0392B",
        "position": { "x": -60, "y": -30 },
        "rotation": -20
      }
    },
    {
      "id": "er",
      "type": "shape",
      "name": "Endoplasmic Reticulum",
      "properties": {
        "shape": "path",
        "d": "M30,-20 Q50,-10 40,10 Q30,30 50,20",
        "stroke": "#3498DB",
        "strokeWidth": 2,
        "fill": "none"
      }
    },
    {
      "id": "membrane",
      "type": "shape",
      "name": "Cell Membrane",
      "properties": {
        "shape": "ellipse",
        "width": 250,
        "height": 180,
        "fill": "none",
        "stroke": "#2C3E50",
        "strokeWidth": 3
      }
    }
  ],
  "relationships": [
    { "type": "containment", "from": "cell", "to": "nucleus", "label": "contains" },
    { "type": "containment", "from": "nucleus", "to": "nucleolus", "label": "contains" },
    { "type": "containment", "from": "nucleus", "to": "chromatin", "label": "contains" },
    { "type": "containment", "from": "cell", "to": "mito1", "label": "contains" },
    { "type": "containment", "from": "cell", "to": "mito2", "label": "contains" },
    { "type": "containment", "from": "cell", "to": "er", "label": "contains" },
    { "type": "containment", "from": "cell", "to": "membrane", "label": "bounded by" }
  ],
  "viewport": { "width": 400, "height": 300 }
}
```

**DSL conventions used:**
- `group` entity for containers (cell, nucleus) — has `selectable: true` for drill-down
- `shape` entity for visual organelles
- `containment` relationships for hierarchy (3 levels deep: cell → nucleus → nucleolus)
- Positions relative to parent center (0,0 = center of parent group)
- No domain-specific types — cell is a `group`, mitochondria are `shape` entities

**Isolation pattern:** When a student selects the nucleus, the renderer:
1. Hides all entities not in the nucleus subtree
2. Shows only nucleus, nucleolus, chromatin, and their relationships
3. Resizes viewport to focus on the nucleus

This is handled by the renderer, not the IR. The IR just describes the structure.

### Example 4: Engineering — Aircraft Subsystem Hierarchy

An aircraft with engine, compressor, and turbine. The user can select "Engine" and explore only that subsystem.

```json
{
  "meta": { "version": "1.0", "title": "Aircraft Subsystems" },
  "entities": [
    {
      "id": "aircraft",
      "type": "group",
      "name": "Aircraft",
      "properties": {
        "shape": "aircraft_outline",
        "width": 400,
        "height": 120,
        "fill": "#BDC3C7",
        "stroke": "#7F8C8D",
        "strokeWidth": 2,
        "selectable": true
      }
    },
    {
      "id": "engine",
      "type": "group",
      "name": "Engine",
      "properties": {
        "shape": "engine_outline",
        "width": 120,
        "height": 50,
        "fill": "#95A5A6",
        "stroke": "#7F8C8D",
        "position": { "x": -80, "y": 0 },
        "selectable": true
      }
    },
    {
      "id": "compressor",
      "type": "group",
      "name": "Compressor",
      "properties": {
        "shape": "rect",
        "width": 35,
        "height": 40,
        "fill": "#3498DB",
        "stroke": "#2980B9",
        "position": { "x": -40, "y": 0 }
      }
    },
    {
      "id": "combustion",
      "type": "group",
      "name": "Combustion Chamber",
      "properties": {
        "shape": "rect",
        "width": 30,
        "height": 40,
        "fill": "#E74C3C",
        "stroke": "#C0392B",
        "position": { "x": 0, "y": 0 }
      }
    },
    {
      "id": "turbine",
      "type": "group",
      "name": "Turbine",
      "properties": {
        "shape": "rect",
        "width": 35,
        "height": 40,
        "fill": "#F39C12",
        "stroke": "#E67E22",
        "position": { "x": 40, "y": 0 }
      }
    },
    {
      "id": "nozzle",
      "type": "shape",
      "name": "Exhaust Nozzle",
      "properties": {
        "shape": "trapezoid",
        "width": 20,
        "height": 30,
        "fill": "#95A5A6",
        "stroke": "#7F8C8D",
        "position": { "x": 70, "y": 0 }
      }
    },
    {
      "id": "air_intake",
      "type": "shape",
      "name": "Air Intake",
      "properties": {
        "shape": "rect",
        "width": 15,
        "height": 35,
        "fill": "#ECF0F1",
        "stroke": "#BDC3C7",
        "position": { "x": -70, "y": 0 }
      }
    }
  ],
  "relationships": [
    { "type": "containment", "from": "aircraft", "to": "engine", "label": "propulsion" },
    { "type": "containment", "from": "engine", "to": "compressor", "label": "stage 1" },
    { "type": "containment", "from": "engine", "to": "combustion", "label": "stage 2" },
    { "type": "containment", "from": "engine", "to": "turbine", "label": "stage 3" },
    { "type": "containment", "from": "engine", "to": "nozzle", "label": "exhaust" },
    { "type": "containment", "from": "engine", "to": "air_intake", "label": "intake" },
    { "type": "edge", "from": "air_intake", "to": "compressor", "label": "air flow" },
    { "type": "edge", "from": "compressor", "to": "combustion", "label": "compressed air" },
    { "type": "edge", "from": "combustion", "to": "turbine", "label": "hot gas" },
    { "type": "edge", "from": "turbine", "to": "nozzle", "label": "exhaust gas" }
  ],
  "viewport": { "width": 500, "height": 200 }
}
```

**DSL conventions used:**
- `group` entities with `selectable: true` for drill-down navigation
- `containment` relationships for the subsystem hierarchy
- `edge` relationships for the flow between stages (with labels describing what flows)
- No aircraft-specific DSL functions — everything is `group`, `shape`, and relationships
- Positions are relative to parent group center

**Drill-down pattern:** When user selects "Engine", the renderer:
1. Shows only engine, compressor, combustion, turbine, nozzle, air_intake
2. Hides aircraft
3. Shows the edge relationships between engine components

### Example 5: Process — Photosynthesis

A biological process with inputs, transformations, intermediate states, outputs, and animated flow.

```json
{
  "meta": { "version": "1.0", "title": "Photosynthesis" },
  "variables": { "lightEnergy": 680 },
  "entities": [
    {
      "id": "sunlight",
      "type": "shape",
      "name": "Sunlight",
      "properties": {
        "shape": "sun",
        "radius": 25,
        "fill": "#F1C40F",
        "stroke": "#F39C12",
        "position": { "x": 50, "y": 30 }
      }
    },
    {
      "id": "co2",
      "type": "text",
      "name": "CO₂ Input",
      "properties": {
        "text": "CO₂",
        "fontSize": 20,
        "fill": "#333333",
        "position": { "x": 50, "y": 150 }
      }
    },
    {
      "id": "water",
      "type": "text",
      "name": "H₂O Input",
      "properties": {
        "text": "H₂O",
        "fontSize": 20,
        "fill": "#3498DB",
        "position": { "x": 50, "y": 200 }
      }
    },
    {
      "id": "chloroplast",
      "type": "group",
      "name": "Chloroplast",
      "properties": {
        "shape": "ellipse",
        "width": 150,
        "height": 100,
        "fill": "#27AE60",
        "stroke": "#1E8449",
        "position": { "x": 250, "y": 120 },
        "strokeWidth": 2
      }
    },
    {
      "id": "light_reaction",
      "type": "abstract",
      "name": "Light Reactions",
      "properties": {
        "stage": "light",
        "description": "ATP + NADPH produced",
        "position": { "x": -30, "y": -15 }
      }
    },
    {
      "id": "calvin_cycle",
      "type": "abstract",
      "name": "Calvin Cycle",
      "properties": {
        "stage": "calvin",
        "description": "Glucose synthesized from CO₂",
        "position": { "x": 30, "y": 15 }
      }
    },
    {
      "id": "glucose",
      "type": "text",
      "name": "Glucose Output",
      "properties": {
        "text": "C₆H₁₂O₆",
        "fontSize": 20,
        "fill": "#E67E22",
        "position": { "x": 450, "y": 100 }
      }
    },
    {
      "id": "oxygen",
      "type": "text",
      "name": "O₂ Output",
      "properties": {
        "text": "O₂",
        "fontSize": 20,
        "fill": "#3498DB",
        "position": { "x": 450, "y": 160 }
      }
    },
    {
      "id": "arrow_sunlight",
      "type": "shape",
      "properties": {
        "shape": "arrow",
        "startX": 75, "startY": 55,
        "endX": 175, "endY": 100,
        "stroke": "#F1C40F",
        "strokeWidth": 2
      }
    },
    {
      "id": "arrow_co2",
      "type": "shape",
      "properties": {
        "shape": "arrow",
        "startX": 80, "startY": 150,
        "endX": 175, "endY": 130,
        "stroke": "#333333",
        "strokeWidth": 2
      }
    },
    {
      "id": "arrow_water",
      "type": "shape",
      "properties": {
        "shape": "arrow",
        "startX": 80, "startY": 200,
        "endX": 175, "endY": 150,
        "stroke": "#3498DB",
        "strokeWidth": 2
      }
    },
    {
      "id": "arrow_glucose",
      "type": "shape",
      "properties": {
        "shape": "arrow",
        "startX": 325, "startY": 110,
        "endX": 425, "endY": 100,
        "stroke": "#E67E22",
        "strokeWidth": 2
      }
    },
    {
      "id": "arrow_oxygen",
      "type": "shape",
      "properties": {
        "shape": "arrow",
        "startX": 325, "startY": 130,
        "endX": 425, "endY": 160,
        "stroke": "#3498DB",
        "strokeWidth": 2
      }
    }
  ],
  "relationships": [
    { "type": "containment", "from": "chloroplast", "to": "light_reaction" },
    { "type": "containment", "from": "chloroplast", "to": "calvin_cycle" },
    { "type": "edge", "from": "light_reaction", "to": "calvin_cycle", "label": "ATP + NADPH" },
    { "type": "edge", "from": "sunlight", "to": "light_reaction", "label": "energy" },
    { "type": "edge", "from": "co2", "to": "calvin_cycle", "label": "carbon input" },
    { "type": "edge", "from": "water", "to": "light_reaction", "label": "electron donor" },
    { "type": "edge", "from": "calvin_cycle", "to": "glucose", "label": "produces" },
    { "type": "edge", "from": "light_reaction", "to": "oxygen", "label": "byproduct" }
  ],
  "animations": [
    {
      "target": "arrow_sunlight.opacity",
      "keyframes": [
        { "offset": 0, "value": 0.3 },
        { "offset": 0.5, "value": 1 },
        { "offset": 1, "value": 0.3 }
      ],
      "duration": 2000,
      "loop": true,
      "easing": "easeInOut"
    }
  ],
  "viewport": { "width": 550, "height": 250 }
}
```

**DSL conventions used:**
- `group` for the chloroplast (container for internal processes)
- `abstract` for internal process stages (light reactions, Calvin cycle)
- `text` for chemical formulas (CO₂, H₂O, C₆H₁₂O₆, O₂)
- `shape` entities for arrows (connecting inputs to processes, processes to outputs)
- `edge` relationships with labels describing what flows between stages
- Animation on arrow opacity to show active energy flow
- No photosynthesis-specific DSL functions — everything is generic

### Example 6: Computer Science — LLM Architecture

An LLM pipeline with hierarchy, connections, labels, and animated information flow.

```json
{
  "meta": { "version": "1.0", "title": "LLM Architecture" },
  "entities": [
    {
      "id": "input",
      "type": "text",
      "name": "Input Text",
      "properties": {
        "text": "Hello, world!",
        "fontSize": 16,
        "fill": "#333333",
        "position": { "x": 50, "y": 100 }
      }
    },
    {
      "id": "tokenizer",
      "type": "shape",
      "name": "Tokenizer",
      "properties": {
        "shape": "roundedRect",
        "width": 100,
        "height": 50,
        "fill": "#3498DB",
        "stroke": "#2980B9",
        "position": { "x": 180, "y": 100 }
      }
    },
    {
      "id": "tokens",
      "type": "data",
      "name": "Token IDs",
      "properties": {
        "chartType": "table",
        "data": ["[15496]", "[995]", "[11]", "[9953]", "[3374]"],
        "position": { "x": 180, "y": 180 }
      }
    },
    {
      "id": "embedding_layer",
      "type": "group",
      "name": "Embedding Layer",
      "properties": {
        "shape": "roundedRect",
        "width": 120,
        "height": 60,
        "fill": "#2ECC71",
        "stroke": "#27AE60",
        "position": { "x": 320, "y": 100 }
      }
    },
    {
      "id": "embedding_lookup",
      "type": "abstract",
      "name": "Embedding Lookup",
      "properties": {
        "description": "Token IDs → dense vectors",
        "dimensions": 768
      }
    },
    {
      "id": "position_encoding",
      "type": "abstract",
      "name": "Positional Encoding",
      "properties": {
        "description": "Adds position information"
      }
    },
    {
      "id": "transformer_stack",
      "type": "group",
      "name": "Transformer Stack",
      "properties": {
        "shape": "roundedRect",
        "width": 140,
        "height": 200,
        "fill": "#9B59B6",
        "stroke": "#8E44AD",
        "position": { "x": 470, "y": 100 },
        "layers": 12
      }
    },
    {
      "id": "attention",
      "type": "group",
      "name": "Multi-Head Attention",
      "properties": {
        "shape": "roundedRect",
        "width": 110,
        "height": 50,
        "fill": "#E74C3C",
        "stroke": "#C0392B",
        "position": { "x": 0, "y": -40 }
      }
    },
    {
      "id": "ffn",
      "type": "group",
      "name": "Feed-Forward Network",
      "properties": {
        "shape": "roundedRect",
        "width": 110,
        "height": 50,
        "fill": "#F39C12",
        "stroke": "#E67E22",
        "position": { "x": 0, "y": 40 }
      }
    },
    {
      "id": "layernorm1",
      "type": "shape",
      "name": "Layer Norm 1",
      "properties": {
        "shape": "rect",
        "width": 110,
        "height": 20,
        "fill": "#ECF0F1",
        "stroke": "#BDC3C7",
        "position": { "x": 0, "y": -10 }
      }
    },
    {
      "id": "layernorm2",
      "type": "shape",
      "name": "Layer Norm 2",
      "properties": {
        "shape": "rect",
        "width": 110,
        "height": 20,
        "fill": "#ECF0F1",
        "stroke": "#BDC3C7",
        "position": { "x": 0, "y": 70 }
      }
    },
    {
      "id": "output_projection",
      "type": "shape",
      "name": "Output Projection",
      "properties": {
        "shape": "roundedRect",
        "width": 120,
        "height": 50,
        "fill": "#1ABC9C",
        "stroke": "#16A085",
        "position": { "x": 640, "y": 100 }
      }
    },
    {
      "id": "softmax",
      "type": "shape",
      "name": "Softmax",
      "properties": {
        "shape": "roundedRect",
        "width": 100,
        "height": 50,
        "fill": "#34495E",
        "stroke": "#2C3E50",
        "position": { "x": 780, "y": 100 }
      }
    },
    {
      "id": "output_text",
      "type": "text",
      "name": "Output Token",
      "properties": {
        "text": "predicted_next_token",
        "fontSize": 14,
        "fill": "#333333",
        "position": { "x": 780, "y": 180 }
      }
    }
  ],
  "relationships": [
    { "type": "containment", "from": "embedding_layer", "to": "embedding_lookup" },
    { "type": "containment", "from": "embedding_layer", "to": "position_encoding" },
    { "type": "containment", "from": "transformer_stack", "to": "attention" },
    { "type": "containment", "from": "transformer_stack", "to": "ffn" },
    { "type": "containment", "from": "transformer_stack", "to": "layernorm1" },
    { "type": "containment", "from": "transformer_stack", "to": "layernorm2" },
    { "type": "edge", "from": "input", "to": "tokenizer", "label": "raw text" },
    { "type": "edge", "from": "tokenizer", "to": "tokens", "label": "tokenize" },
    { "type": "edge", "from": "tokens", "to": "embedding_layer", "label": "token IDs" },
    { "type": "edge", "from": "embedding_layer", "to": "transformer_stack", "label": "embeddings" },
    { "type": "edge", "from": "attention", "to": "ffn", "label": "contextualized" },
    { "type": "edge", "from": "transformer_stack", "to": "output_projection", "label": "final hidden state" },
    { "type": "edge", "from": "output_projection", "to": "softmax", "label": "logits" },
    { "type": "edge", "from": "softmax", "to": "output_text", "label": "predicted token" }
  ],
  "animations": [
    {
      "target": "tokenizer.fill",
      "keyframes": [
        { "offset": 0, "value": "#3498DB" },
        { "offset": 0.1, "value": "#2ECC71" },
        { "offset": 0.2, "value": "#3498DB" }
      ],
      "duration": 2000,
      "loop": true
    },
    {
      "target": "embedding_layer.fill",
      "keyframes": [
        { "offset": 0, "value": "#2ECC71" },
        { "offset": 0.15, "value": "#F39C12" },
        { "offset": 0.3, "value": "#2ECC71" }
      ],
      "duration": 2000,
      "delay": 400,
      "loop": true
    },
    {
      "target": "transformer_stack.fill",
      "keyframes": [
        { "offset": 0, "value": "#9B59B6" },
        { "offset": 0.1, "value": "#E74C3C" },
        { "offset": 0.3, "value": "#9B59B6" }
      ],
      "duration": 2000,
      "delay": 800,
      "loop": true
    }
  ],
  "viewport": { "width": 900, "height": 250 }
}
```

**DSL conventions used:**
- `group` entities for composite components (embedding layer, transformer stack, attention, FFN)
- `shape` entities for individual processing steps
- `data` entity for the token table
- `text` entities for input/output
- `edge` relationships with labels describing data flow between stages
- `containment` for hierarchy (transformer stack contains attention + FFN + layer norms)
- Staggered animations to show sequential information flow through the pipeline
- No LLM-specific DSL functions — everything is generic `group`, `shape`, `edge`

## Scalability Assessment

| # | Question | Answer | Notes |
|---|---|---|---|
| 1 | Can the same DSL represent math, physics, biology, engineering, CS? | **Yes** | All 6 examples use the same 7 entity types and 4 relationship types. Domain meaning comes from property values and names, not entity types. |
| 2 | Can arbitrary nesting depth be represented? | **Yes** | `group` entities + `containment` relationships support any depth. Example 3 has 3 levels (cell → nucleus → nucleolus). Example 4 has 2 levels (aircraft → engine → compressor). |
| 3 | Can new domains be added without changing the DSL API? | **Yes** | Adding chemistry means defining new property combinations (e.g., "bonds", "elements"), not new entity types. The 7 entity types are sufficient for any domain. |
| 4 | Can Gemma generate it reliably as structured JSON? | **Yes** | The IR JSON is flat (entities as an array, properties as a bag). No deeply nested closures, no ambiguous syntax. Each entity has 4 fields: id, type, name, properties. |
| 5 | Can it be validated deterministically? | **Yes** | `validateScene()` already validates structure, references, types. Conventions add naming validation but are not required for correctness. |
| 6 | Can different renderers consume it? | **Yes** | The IR is renderer-independent. A 2D renderer draws shapes on Canvas. A 3D renderer maps shapes to Three.js meshes. A Manim renderer generates Python scripts. All consume the same IR. |
| 7 | Can interactive and animated visualizations use the same representation? | **Yes** | Animation is in `anim` fields or top-level `animations`. Interaction is in `interact` fields. Static visualizations simply omit these. Same entity/property structure. |
| 8 | Can procedural objects be described without storing every asset? | **Yes** | `data` entities with `generator` properties express procedural intent (grid, series, parametric curve). The procedural engine expands them at render time. |
| 9 | Can external assets be referenced without making assets part of the core DSL? | **Yes** | Values can use `{ ref: "entity_id" }` to reference other entities. Future: external file references via `{ ref: "file:path/to/asset" }`. |
| 10 | Can the DSL evolve without breaking old scenes? | **Yes** | New entity types, relationship types, and property names can be added. Old scenes use only the types they define. Renderers gracefully handle unknown properties. |

**All 10 answers are yes.** The DSL design is sound.

## Design Principles

1. **Domain-agnostic.** The DSL has no domain-specific types. A cell, a particle, and an LLM all use the same primitives.

2. **Compositional.** Complex visualizations are built by composing simple entities and relationships. No monolithic structures.

3. **Declarative.** The DSL describes WHAT exists and HOW it behaves. It does not describe HOW to render it. Renderers decide the rendering strategy.

4. **LLM-friendly.** Structures are predictable. Identifiers are explicit. Nesting is limited. JSON is the native format.

5. **Validatable.** Every DSL document can be checked for structural correctness before reaching a renderer.

6. **Renderer-independent.** No Three.js, Canvas, Manim, or WebGL concepts in the DSL. Renderers are consumers, not producers.

7. **Evolvable.** New entity types, properties, and patterns can be added without breaking existing documents.

## Builder API (Phase 2 Implementation)

The Phase 2 implementation will provide TypeScript builder functions:

```typescript
// Scene builder
const scene = buildScene({
  title: 'Projectile Motion',
  entities: [
    buildEntity('particle', 'abstract', {
      mass: 1.0,
      position: vec2(0, 0),
      velocity: vec2(15, 25),
    }),
    buildEntity('gravity', 'abstract', {
      acceleration: vec2(0, -9.81),
    }),
  ],
  relationships: [
    buildRelationship('constraint', 'particle', 'gravity'),
  ],
  viewport: { width: 500, height: 300 },
})

// Returns a valid IR Scene document
const ir = compile(scene)
```

Builder functions provide:
- Auto-generated IDs (when omitted)
- Default values for optional fields
- Type-safe property construction
- Shorthand for common patterns (vec2, arrow, text)
- Compilation to validated IR

## Future Evolution

The DSL can evolve by:
- Adding new entity types (e.g., `particle` for physics-specific rendering hints)
- Adding new relationship types (e.g., `flow` for animated data flow)
- Adding new property conventions (e.g., `mass`, `charge` for physics)
- Adding new procedural generators (e.g., `voronoi`, `mesh`, `terrain`)
- Adding external asset references (e.g., `{ ref: "file:data.csv" }`)

None of these changes break existing scenes. Old documents continue to work with old and new renderers.
