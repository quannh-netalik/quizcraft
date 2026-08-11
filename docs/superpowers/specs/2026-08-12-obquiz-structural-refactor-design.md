# Obquiz Structural Refactor Design

## Objective

Split the oversized quiz controller into cohesive modules without changing the
plugin's YAML schema, rendered behavior, CSS contract, accessibility, or release
artifacts.

## Constraints

- Preserve `single`, `multiple`, `matching`, and `ordering` questions.
- Keep validation and answer rules pure and independent of Obsidian and the DOM.
- Keep Obsidian lifecycle and Markdown integration at the outer boundary.
- Add no dependencies and avoid framework-like clean-architecture ceremony.
- Keep styles scoped under `.obquiz` or `.obquiz-error`.
- Leave the complete refactor uncommitted.

## Architecture

Use feature-oriented code splitting around stable responsibilities:

- `main.ts` remains the plugin entry point and registers the Markdown processor.
- A quiz controller owns navigation, question lifecycle, shared state, completion,
  and coordination between renderers.
- Choice, matching, and ordering renderers each own their interaction-specific DOM
  and event handling.
- Shared rendering helpers own Markdown rendering and small DOM/SVG utilities only
  when reuse justifies extraction.
- Pure state creation, transitions, readiness, and evaluation remain outside DOM
  modules and are covered with focused unit tests.

Renderers receive narrow dependencies and callbacks instead of the entire plugin
controller. They may mutate the current question state when that state is their
explicit input, but navigation and whole-quiz state remain controller-owned.

## Data Flow

1. The plugin parses YAML and validates it into the existing `Quiz` model.
2. The controller creates per-question state and selects the active question.
3. The controller delegates interaction rendering to the renderer matching the
   question discriminant.
4. A renderer updates only its question state and requests a rerender through a
   supplied callback.
5. The controller evaluates answers, controls navigation, and renders completion.

## Error Handling

Keep the current processor-level error boundary. YAML parsing and validation
failures render the existing `.obquiz-error` element. Renderer extraction must not
swallow programming errors or introduce additional user-visible error formats.

## Testing

- Preserve the current model and package-contract tests.
- Add focused unit tests for newly extracted pure state and evaluation behavior.
- Update structural package assertions so they verify public contracts rather than
  requiring every renderer to remain in `main.ts`.
- Run `npm test`, `npm run build`, and `git diff --check`.
- If Obsidian is running, reload `obquiz`, inspect developer errors and console
  errors, and verify the rendered interactions. Report runtime verification
  separately if the application is unavailable.

## Non-goals

- No domain/application/infrastructure directory hierarchy.
- No dependency injection container, repositories, services, or new runtime APIs.
- No schema, styling, copy, or interaction redesign.
- No unrelated cleanup.
