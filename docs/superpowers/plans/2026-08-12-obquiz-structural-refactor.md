# Obquiz Structural Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the monolithic quiz controller into cohesive state, controller, and interaction-renderer modules without changing user-visible behavior.

**Architecture:** Keep validation and answer rules in `model.ts`, move per-question lifecycle rules to a pure `quiz-state.ts`, and isolate choice, matching, and ordering DOM behavior in feature renderers. `main.ts` becomes the Obsidian entry point while `quiz-controller.ts` coordinates navigation and renderer callbacks.

**Tech Stack:** TypeScript, Obsidian API, DOM/SVG, Node test runner, esbuild

## Global Constraints

- Preserve all four question types, YAML schema, CSS selectors, copy, interactions, and accessibility.
- Add no dependencies or framework-style architecture layers.
- Keep Obsidian and DOM APIs out of pure state/model modules.
- Leave all plan and refactor changes uncommitted.

---

### Task 1: Extract pure question state

**Files:**
- Create: `src/quiz-state.ts`
- Create: `tests/quiz-state.test.cjs`
- Modify: `esbuild.test.mjs`

**Interfaces:**
- Produces: `QuestionState`, `createQuestionState(question, previous?, random?)`, `isQuestionReady(question, state)`, and `evaluateQuestion(question, state)`.
- Consumes: question types and answer-evaluation functions from `src/model.ts`.

- [ ] Add a second test-bundle entry and tests proving initial state shape, reset reshuffling, readiness for every question type, and evaluation for every question type.
- [ ] Run `npm test` and confirm failure because `.test-dist/quiz-state.cjs` or its exports do not exist.
- [ ] Implement the pure state module with injected randomness for deterministic tests.
- [ ] Run `npm test` and confirm the new state tests pass with the existing suite.

### Task 2: Extract interaction renderers

**Files:**
- Create: `src/renderers/contracts.ts`
- Create: `src/renderers/choice-renderer.ts`
- Create: `src/renderers/matching-renderer.ts`
- Create: `src/renderers/ordering-renderer.ts`
- Modify: `tests/package.test.cjs`

**Interfaces:**
- `RenderMarkdown(markdown: string, element: HTMLElement): void` renders trusted validated Markdown through Obsidian.
- Each renderer receives its narrowed question type, `QuestionState`, host element, Markdown callback, and rerender callback.
- `renderMatchingQuestion(...)` returns a cleanup callback that disconnects its `ResizeObserver`; other renderers return `void`.

- [ ] Replace source-layout assertions with contracts for the split module files and entry-point registration; keep metadata, CSS, and README behavior checks.
- [ ] Run `npm test` and confirm failure because the renderer modules do not exist yet.
- [ ] Move choice rendering unchanged into `choice-renderer.ts`.
- [ ] Move matching DOM/SVG rendering unchanged into `matching-renderer.ts`, returning observer cleanup.
- [ ] Move ordering interaction and animation unchanged into `ordering-renderer.ts`.
- [ ] Run `npm test` and `npm run build`; renderer modules must compile and package contracts must pass.

### Task 3: Extract controller and reduce entry point

**Files:**
- Create: `src/quiz-controller.ts`
- Modify: `src/main.ts`
- Modify: `tests/package.test.cjs`

**Interfaces:**
- `QuizController` owns quiz index, all question states, pager, completion, and active-renderer cleanup.
- `ObquizPlugin.onload()` parses/validates YAML and constructs `QuizController`.
- Renderer callbacks request controller rerendering but do not own navigation or whole-quiz state.

- [ ] Tighten the package test to require `main.ts` registration and the controller/renderer module layout.
- [ ] Run `npm test` and confirm failure while the controller remains in `main.ts`.
- [ ] Move coordination, navigation, shared question chrome, completion, and Markdown rendering to `quiz-controller.ts`.
- [ ] Reduce `main.ts` to plugin registration, parse/validation, controller construction, and the existing error boundary.
- [ ] Run `npm test` and `npm run build` and fix only extraction regressions.

### Task 4: Verify scope and runtime

**Files:**
- Review: all uncommitted changes
- Generated and ignored: `main.js`, `.test-dist/*`

**Interfaces:**
- Produces: unchanged release artifacts with a maintainable internal source layout.

- [ ] Run `git diff --check`, `npm test`, and `npm run build` fresh.
- [ ] Run GitNexus change detection and inspect affected processes and module cycles.
- [ ] If Obsidian is available, reload plugin `obquiz`, inspect developer and console errors, and verify the four interactions; otherwise report runtime verification as unavailable.
- [ ] Confirm `git status --short` contains no staged refactor changes and no refactor commit exists after `8cd93d2`.
