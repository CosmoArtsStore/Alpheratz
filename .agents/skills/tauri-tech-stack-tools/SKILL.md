---
name: tauri-tech-stack-tools
description: Guidance for using the Alpheratz Tauri + React + TypeScript tool stack. Use this skill whenever the task involves frontend architecture, Tauri invoke contracts, validation, linting, dead-code cleanup, test setup, commit hooks, package-manager choice, or any proposal to add routing in Alpheratz. Use it even if the user does not explicitly name Zod, OxLint, knip, Vitest, Lefthook, Bun, or TanStack Router.
---

# Tauri Tech Stack Tools

This skill defines how to use the installed support tools in `Alpheratz`.

## Primary intent

Use these tools to keep Tauri + React + TypeScript work predictable:

- Use `zod` to validate `invoke()` payloads that cross the Rust/TypeScript boundary.
- Use `oxlint` for fast structural lint checks and import cycle detection.
- Use `knip` to find unused files, exports, and dependencies after refactors.
- Use `vitest` for pure logic and utility tests.
- Use `lefthook` to prevent broken commits from landing locally.
- Use `bun` when the user explicitly wants Bun-based install speed or migration work.
- Use `@tanstack/react-router` only when the app is being split into multiple routed screens.

## Current repo policy

- The repo remains `npm`-managed by default.
- `bun` is installed on the machine, but do not migrate the repo from `npm` to `bun` unless the user explicitly asks.
- `@tanstack/react-router` and `@tanstack/router-plugin` are installed, but routing is not enabled yet.
  Activating them requires an intentional route-tree introduction, not an incidental config tweak.

## Tool-by-tool rules

### Zod

Use `zod` whenever:

- a new `invoke()` call is added
- a Rust command response shape changes
- a JSON payload from storage, config, or external input needs runtime validation

Preferred pattern:

1. Define a schema close to the boundary.
2. Parse raw data immediately.
3. Use inferred types downstream.

Example:

```ts
import { z } from "zod";

const ExampleSchema = z.object({
  id: z.number(),
  name: z.string(),
});

const raw = await invoke("example_cmd");
const example = ExampleSchema.parse(raw);
```

### OxLint

Use `npm run lint` for the fast default lint path.

- `oxlint --import-plugin src/` runs first
- `eslint .` runs after it

Use this especially after:

- moving files
- changing imports
- splitting modules
- introducing new hooks or components

### knip

Run `npm run knip` after refactors that:

- remove features
- rename modules
- move shared helpers
- replace dependencies

Treat `knip` as cleanup detection, not a blocker for unrelated tasks.

### Vitest

Use `vitest` for:

- pure transformation logic
- grouping or selection helpers
- parsers and formatters
- future pHash or filtering helpers after extraction

Do not force UI-heavy component testing just because Vitest is available.

### Lefthook

`lefthook.yml` is configured so pre-commit runs:

- `npm run lint`
- `npm run typecheck`

If a task changes local setup or hooks are missing, run:

```bash
npx lefthook install
```

### Bun

Use Bun only when the user explicitly wants one of these:

- faster install workflows
- Bun lockfile generation
- migration away from npm

If the user did not ask for migration, keep `package-lock.json` authoritative.

### TanStack Router

Use TanStack Router only when:

- the app is being split into multiple URL-addressable screens
- navigation state should become route state
- the user explicitly asks for a router

Do not activate the router plugin for the current single-screen app just because the dependency exists.

## Installed commands and files

- `npm run lint`
- `npm run lint:eslint`
- `npm run typecheck`
- `npm run knip`
- `npm run test`
- `npm run test:watch`
- `lefthook.yml`
- `oxlintrc.json`
- `knip.json`
- `vitest.config.ts`

## Decision guide

- Boundary safety problem: use `zod`
- Fast code-quality pass: use `npm run lint`
- Refactor leftovers suspicion: use `npm run knip`
- Pure logic regression risk: add `vitest`
- Broken commits slipping through: ensure `lefthook` is installed
- Install speed complaint only: consider `bun`
- Navigation redesign: consider `TanStack Router`
