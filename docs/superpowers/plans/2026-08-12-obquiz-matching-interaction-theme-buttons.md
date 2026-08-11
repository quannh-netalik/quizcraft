# Obquiz Matching Interaction and Theme Buttons Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make matching cards toggleable and reconnectable while removing theme-supplied grey button fills from matching cards, Reset, and Previous.

**Architecture:** Keep quiz data in the existing `QuestionState` and keep the current pending matching choice local to the rendered matching interaction. Update an existing rendered interaction in place when disconnecting a pair so the clicked card can become pending without losing local state. CSS explicitly neutralizes native Obsidian button surfaces while retaining border-only hover and selection feedback.

**Tech Stack:** TypeScript, Obsidian plugin API, CSS, Node test runner, esbuild

## Global Constraints

- Modify only `tests/package.test.cjs`, `src/main.ts`, and `styles.css`, plus generated release artifacts.
- Do not add dependencies or change quiz schemas.
- Preserve mouse, touch, and keyboard access.
- Copy only `main.js`, `manifest.json`, and `styles.css` into `.obsidian/plugins/obquiz/`.
- Do not commit.

---

### Task 1: Lock the regressions

**Files:**
- Modify: `tests/model.test.cjs`
- Modify: `tests/package.test.cjs`

**Interfaces:**
- Consumes: pure matching selection behavior in `src/model.ts` and scoped rules in `styles.css`.
- Produces: behavior tests for disconnect/select and pending deselection, plus style contracts for theme-neutral buttons.

- [ ] Add behavior tests requiring same-card pending toggles and connection deletion followed by pending selection; add style assertions for `appearance: none` and theme-background matching cards.
- [ ] Run `npm test` and confirm the package test fails on the missing contracts.

### Task 2: Fix matching selection behavior

**Files:**
- Modify: `src/model.ts`
- Modify: `src/main.ts`

**Interfaces:**
- Consumes: `QuestionState.connections`, local `pendingPrompt` / `pendingMatch`, `markPending()`, and `drawLines()`.
- Produces: a pure `updateMatchingSelection` transition and controller behavior where clicking a pending card deselects it, while clicking a connected card removes its connection and selects that card without rebuilding the question.

- [ ] Change `choosePrompt` and `chooseMatch` to toggle an already-pending card back to `null`.
- [ ] When clicking a connected card, delete the connection, set that side as pending, refresh card classes, and redraw without calling `showQuestion()`.
- [ ] Run `npm test` and confirm behavior contracts pass.

### Task 3: Neutralize theme button surfaces

**Files:**
- Modify: `styles.css`

**Interfaces:**
- Consumes: `.obquiz-match-card`, `.obquiz-question-reset`, and `.obquiz-previous`.
- Produces: matching cards use `var(--background-primary)` and border-only interaction feedback; Reset and Previous render as unfilled controls.

- [ ] Add `appearance: none`, clear native button background variables, and force the intended background color for all three controls.
- [ ] Keep matching hover, pending, connected, and unconnected feedback confined to borders, ports, and text.
- [ ] Run `npm test` and `npm run build`.

### Task 4: Install and verify

**Files:**
- Copy: `main.js`, `manifest.json`, `styles.css` to `../.obsidian/plugins/obquiz/`

**Interfaces:**
- Consumes: verified release artifacts.
- Produces: installed local plugin matching the source build byte-for-byte.

- [ ] Copy only the three release files and compare each byte-for-byte.
- [ ] Reload plugin `obquiz`, check developer errors and console errors.
- [ ] Inspect computed styles and manually verify matching deselection/reconnection plus Reset/Previous appearance in the rendered quiz.
