# Development Guide

## Prerequisites

- Node.js 20 or later
- npm (comes with Node.js)
- Git

Optional (for future phases):
- Python 3.10+ (for Manim renderer)
- Ollama (for local AI integration)

## Setup

```bash
# Clone the repository
git clone <repo-url>
cd visualizer

# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

## Available Commands

| Command | Description |
|---|---|
| `npm run build` | Compile TypeScript to JavaScript (output in `dist/`) |
| `npm run dev` | Watch mode — recompile on file changes |
| `npm run typecheck` | Type-check without emitting files |
| `npm run lint` | Run ESLint on `src/` |
| `npm run test` | Run tests using Node.js built-in test runner |
| `npm run clean` | Remove `dist/` directory |

## Project Structure

```
visualizer/
├── src/                    # TypeScript source code
│   └── index.ts            # Entry point
├── docs/                   # Project documentation
│   ├── PRODUCT.md          # Product requirements
│   ├── ARCHITECTURE.md     # System design and principles
│   ├── ROADMAP.md          # Development phases
│   ├── DECISIONS.md        # Architecture decision records
│   └── DEVELOPMENT.md      # This file
├── tests/                  # Test files (future)
├── package.json
├── tsconfig.json
├── eslint.config.js
├── .editorconfig
├── .gitignore
└── README.md
```

## Conventions

### Code Style

- 2-space indentation
- Single quotes for strings
- Trailing commas in multi-line structures
- No semicolons (follow project convention — set in ESLint)
- Descriptive variable and function names
- No comments unless explaining non-obvious logic (prefer self-documenting code)

### File Organization

- One primary export per file
- Files named in `kebab-case.ts`
- Types use `PascalCase`
- Tests live in `tests/` mirroring `src/` structure
- Documentation lives in `docs/`

### TypeScript

- Strict mode enabled
- Use discriminated unions for variant types
- Prefer `interface` for object shapes, `type` for unions and intersections
- Export types that other modules need
- Use `readonly` for immutable data

### Git

- Meaningful commit messages
- One logical change per commit
- Do not commit `dist/`, `node_modules/`, or `.env`

## Writing Tests

Tests use Node.js built-in test runner (`node:test`). Example:

```typescript
import { describe, it } from "node:test";
import assert from "node:assert/strict";

describe("MyModule", () => {
  it("should do something", () => {
    assert.strictEqual(result, expected);
  });
});
```

Test files should be placed in `tests/` with the same structure as `src/`.

## Adding New Modules

When adding a new module (e.g., a renderer, a DSL component):

1. Create the directory under `src/`
2. Define types first, then implementation
3. Add tests in `tests/`
4. Export the public API from the module's `index.ts`
5. Update this document if the module changes the project structure

## Troubleshooting

**Build fails with module resolution errors:**
Ensure you are using Node.js 20+ and that `"type": "module"` is in `package.json`.

**ESLint reports errors:**
Run `npm run lint` to see all issues. Fix them before committing.

**Tests fail:**
Run `npm run build` first — tests run against compiled JavaScript in `dist/`.
