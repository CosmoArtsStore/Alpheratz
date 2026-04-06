# STELLAProject: AGENTS.md

Basically, the source code is designed in UTF-8. Get-Content should be read in UTF-8.

--

## 1. Agent Behavior Principles

**Do not make changes, reorganizations, or refactorings beyond the instructed scope based on your own judgment.**

- If instructed to "check and report," only report. Execution requires separate explicit instructions.

- If inconsistencies with the conventions are found, the conventions take precedence.

- Complete all instructions in each session. Do not submit incomplete completion reports; if completion is not possible, clearly state the reason.

--

## 2. Top-Level Principles

**Readability Priority** Prioritize ensuring future readers are not confused over your own ease of writing.

**Convention Priority** When in doubt, follow existing conventions, structures, and naming conventions rather than making your own judgment.

**Accountability** Maintain a state where you can explain not only the reasons for adoption of implementations and proposals, but also the reasons for not adopting major rejected proposals. **Delegation to Machines** Matters that can be determined by machines through formatting, static analysis, and type checking should not be left to human discretion. Enforce these decisions via configuration files.

--

## 3. Architectural Principles

### 3.1 Division of Responsibilities

- TypeScript/React is responsible only for UI state management, animation, and user input.

- Data manipulation, DB, file I/O, external communication, and business logic are all handled on the Rust side.

- Commands are the entry points for UI input; business logic should not be concentrated within the Command itself.

### 3.2 Boundary Synchronization

Types crossing the boundary between Rust and TypeScript must have synchronized names and meanings. Abbreviations and shortened names should not be used on only one side.

### 3.3 Protection of Existing Responsibilities

Changes that disrupt existing responsibility separation, layer structure, state management, and error boundaries are prohibited in principle. Even when proposing new changes, consistency with the existing structure should be prioritized.

---

## 4. Naming Conventions

### 4.1 Verb Selection

| Verb     | Usage                                                 |
| -------- | ----------------------------------------------------- |
| `get`    | Returns an already held value                         |
| `load`   | Retrieves data from an external/persistent area       |
| `find`   | Finds a single item that matches a condition          |
| `search` | Finds a list/group of candidates based on a condition |
| `create` | Generates a new value/record                          |
| `build`  | Assembles from multiple elements                      |

### 6.2 Other Rules

- **Collections** are expressed in the plural form (`photo_list` ❌ → `photos` ✅).

- **UI event handlers** are `on〇〇`, and **the main processing unit** is `handle〇〇`.

- **Command names** should be in the format `<verb>_<target>` (e.g., `execute` ❌ → `scan_photos` ✅).

--

## 7. Error Handling

- Failures where subsequent processing cannot be completed should be marked as `error`.
- Subsequent processing is possible, but unexpected conditions (e.g., a folder that should have been created does not exist, but subsequent creation is possible) should be marked as `warn`.
- Error messages should include the target name and operation name.
- Internal paths, SQL, and Rust type names should not be directly exposed in the UI.

--

## 8. HTML/CSS Design

### 8.1 Compliance Specifications

The use and meaning of HTML elements follow the **HTML Living Standard (WHATWG)**.

- Overall Specification (for Developers): https://html.spec.whatwg.org/dev/
- Reference for Each Element: https://html.spec.whatwg.org/dev/indices.html#element-content-categories

Do not adopt your own interpretations or conventional usages. If you are unsure, refer to the specification above and provide justification.

--

### 8.2 HTML Semantics

`<div>` / `<span>` should only be used when they have **no meaning** in terms of layout.

Use the following semantic elements for meaningful structures.

| Purpose                              | Tags to Use              | HTMLLS Reference |
| ------------------------------------ | ------------------------ | ---------------- |
| Page-wide Navigation                 | `<nav>`                  |
| Main Content                         | `<main>`                 |
| Independent Content (Cards/Articles) | `<article>`              |
| Related Content Groups               | `<section>`              |
| Header/Footer                        | `<header>` / `<footer>`  |
| Button Operation                     | `<button>`               |
| List                                 | `<ul>` / `<ol>` / `<li>` |

The distinction between `<nav>` / `<section>`, etc., requires contextual judgment and cannot be detected by tools. Follow the table above and HTMLLS.

--

### 8.3 CSS Design

#### Basic Policy

- **New components require CSS Modules + CSS Nesting. **
- Adding to global CSS is prohibited in principle.
- Existing global CSS will be sequentially split into CSS Modules as the relevant sections are modified.

#### File Placement

CSS Modules files should be placed in the **same directory** as the corresponding component and named `ComponentName.module.css`.

``
components/
PhotoCard/
PhotoCard.tsx
PhotoCard.module.css ✅

````

#### Naming Conventions

**BEM naming (`__` / `--`) is not used within CSS Modules.**

Scope is not necessary as it is guaranteed by the module file.

```css
/* ❌ BEM (Forbidden) */
.photo-card__title--active { }

/* ✅ Flat Class Name */
.title { }
.titleActive { }
````

## 9. Pre-Completion Check

Before completing the implementation, modifications, and proposals, perform all of the following and ensure there are no errors or warnings.

``bash

# Rust

cargo fmt --check
cargo clippy --all-targets --all-features -- -D warnings

# TypeScript / CSS

npx prettier --check .
npx eslint .
npx stylelint "\*_/_.css"

```

If warnings remain, report the reason and proposed solution, and await further instructions. Do not skip checks on your own.

When a user requests `build`, `dev`, `startup`, or `verification`, necessary development commands may be executed automatically without requiring confirmation each time.

Build, development server, and verification commands such as `npm run build`, `npm run tauri build`, `npm run dev`, `cargo build`, `cargo check`, `cargo test`, and `cargo run` may proceed automatically, including privilege escalation if necessary.

Long-running dev/build/bundle commands may be automatically extended to a sufficient waiting time and restarted without confirmation if they stop due to a short timeout.

--

## 10. Prohibited Actions

The following are prohibited regardless of the reason.

- Changes, reorganizations, and refactoring based on independent judgment beyond the scope of instructions
- Unauthorized changes to references to other applications, database structures, and integration interfaces
- Centralization of business logic to Commands
- Direct execution of data operations from the UI
- Fixation of inexplicable shortened names and abbreviations
- Skipping pre-completion checks
```
