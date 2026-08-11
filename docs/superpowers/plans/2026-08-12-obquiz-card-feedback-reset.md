# Obquiz Card Feedback and Reset Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine all question cards and matching connectors, while making a per-question Reset control permanently available for every question type.

**Architecture:** Keep state and rendering in the existing `QuizController`. Reset recreates only the current `QuestionState`; CSS owns the border-only idle appearance and evaluated green/red fills, while SVG geometry continues to use measured port rectangles.

**Tech Stack:** TypeScript, Obsidian plugin API, CSS, SVG, Node test runner, esbuild

## Global Constraints

- Keep **Check Answer** for all four question types.
- Show **Reset** at the top right for every question type and reset only the current question.
- Keep matching ports centered directly over their card borders and colored with the card border state.
- Use smaller right-facing arrowheads.
- Default cards have no fill; evaluated correct and incorrect cards use light green and light red.
- Put choice result icons at the top right of the option.
- Do not add dependencies or refactor unrelated code.

---

### Task 1: Lock behavior and styling contracts

**Files:**
- Modify: `tests/package.test.cjs`

- [ ] Add assertions for permanent Reset, compact SVG markers, border-aligned ports, transparent idle cards, and top-right choice indicators.
- [ ] Run `npm test` and confirm the new assertions fail for the missing behavior.

### Task 2: Implement reset and connector geometry

**Files:**
- Modify: `src/main.ts`

- [ ] Render Reset in the question header for every state and route it to current-question state recreation.
- [ ] Keep Check Answer for every question until evaluation.
- [ ] Reduce marker dimensions and measure paths from port center to port center with a right-facing marker.
- [ ] Run `npm test` and confirm the behavior assertions pass.

### Task 3: Refine visual states

**Files:**
- Modify: `styles.css`
- Modify: `README.md`

- [ ] Make default choice, matching, and ordering cards transparent with a visible border.
- [ ] Center matching ports over the exact facing borders and inherit each card's border-state color.
- [ ] Position choice result icons at the top right.
- [ ] Apply subtle green/red evaluated fills across all card types.
- [ ] Document Reset and evaluation behavior.

### Task 4: Update preview and install

**Files:**
- Modify: `.superpowers/brainstorm/60102-1786451081/content/matching-connectors-v7.html`
- Copy build outputs to: `../.obsidian/plugins/obquiz/`

- [ ] Update the browser preview to mirror the final connector/card design.
- [ ] Run tests, build, syntax check, and package dry-run.
- [ ] Copy `main.js`, `manifest.json`, and `styles.css` into the local plugin directory and compare them byte-for-byte.
- [ ] Open the refreshed preview for visual verification.
