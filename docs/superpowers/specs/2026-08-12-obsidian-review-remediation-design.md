# Obsidian Review Remediation Design

## Objective

Resolve every Obsidian review finding in the current source, stylesheet, and
release process without changing the quiz authoring format or user-facing
behaviour.

## Constraints

- Keep the existing plugin/controller/renderer architecture.
- Preserve all four question types and the documented YAML contract.
- Preserve current interaction behaviour and theme-aware visuals.
- Add no runtime dependencies.
- Keep every stylesheet rule scoped under `.obquiz` or `.obquiz-error`.
- Publish only `main.js`, `manifest.json`, and `styles.css` as Obsidian release
  assets.
- Treat build checks, release-asset checks, and live Obsidian verification as
  separate evidence.

## Source Remediation

### Markdown lifecycle

`QuizController` currently passes the plugin instance to
`MarkdownRenderer.render()`. The plugin lives for the whole Obsidian session,
so Markdown children registered against it can outlive a rendered quiz.

`QuizRenderChild` will own Markdown rendering for its quiz. The controller will
receive a short-lived render component and pass that component to
`MarkdownRenderer.render()`. The existing `context.addChild()` relationship
continues to destroy the controller and renderer cleanup when the code block is
unloaded.

### Validated model values

The validation helpers will narrow array elements through explicit typed
predicates or typed transformations. This removes unsafe assignments from
`unknown[]` without weakening validation. The optional title will be narrowed
once and trimmed without a redundant assertion.

### Renderer compatibility and DOM helpers

Animation scheduling and cancellation will use the owning element's window so
quiz blocks work in Obsidian popout windows. HTML elements will use Obsidian's
`createEl` helpers; SVG namespace creation remains on the DOM API because the
Obsidian helpers do not create namespaced SVG nodes.

Ordering FLIP animation will stop assigning fixed style values directly. The
renderer will expose the calculated vertical offset through Obsidian's CSS
property helper, and stylesheet classes will own transition and transform
declarations. Cleanup will still cancel every scheduled frame.

## Stylesheet Remediation

The choice renderer will maintain explicit `is-selected`, `is-disabled`, and
focus-within classes on each option. CSS will consume those classes instead of
`:has()`, avoiding broad selector invalidation while retaining keyboard focus,
selection, and disabled states.

All `!important` declarations will be removed. Scoped selectors, existing
component classes, CSS custom properties, and native-control reset properties
will provide the required precedence. The established appearance remains:

- reset and navigation buttons are transparent;
- matching cards use the theme background and border-only interaction states;
- question type badges stay transparent and border-only;
- correct and incorrect states remain visually distinct;
- reduced-motion mode disables quiz animations.

Package contract tests will reject future `:has()` selectors and `!important`
declarations.

## Release Provenance

A tag-triggered GitHub Actions workflow will be the single build-and-publish
path for releases. For tags matching `*.*.*`, it will:

1. Check out the tagged source.
2. Install locked dependencies with `npm ci`.
3. Run the full test suite and production build.
4. Generate GitHub artifact attestations for `main.js` and `styles.css` using
   `actions/attest@v4` with `id-token: write` and `attestations: write`
   permissions.
5. Upload `main.js`, `manifest.json`, and `styles.css` to the GitHub release for
   the tag.

`manifest.json` remains an uploaded release asset but is not included in the
requested attestation remediation. The job also receives `contents: write`,
which is required to create the GitHub release and upload its assets. The
workflow will use immutable action major versions and will not add application
dependencies.

## Tests and Verification

Focused tests will cover the lifecycle component passed to Markdown rendering,
model narrowing behaviour, renderer window/DOM-helper usage, ordering animation
CSS ownership, forbidden CSS patterns, and the release workflow contract.

Before each implementation commit, run the affected focused tests and
`git diff --check`. Before completion, run:

- `npm test`
- `npm run build`
- `npm_config_cache=/tmp/obquiz-npm-cache npm pack --dry-run`
- `git diff --check`

GitHub-hosted attestation generation cannot be proven locally. The workflow can
be syntax- and contract-checked locally; actual provenance verification requires
a pushed tag and a successful GitHub Actions run. Live Obsidian reload, console,
and visual behaviour will be reported separately if not performed.

## Commit Boundaries

1. `docs: design Obsidian review remediation`
2. `fix(lifecycle): scope markdown rendering to quiz child`
3. `fix(renderers): satisfy Obsidian source lint`
4. `fix(styles): remove discouraged selectors and overrides`
5. `ci(release): attest Obquiz release assets`

Each implementation commit will contain its focused tests. Generated `main.js`
remains ignored and will be rebuilt by the release workflow.
