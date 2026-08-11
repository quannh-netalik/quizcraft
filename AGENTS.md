# Obquiz agent guide

## Purpose

Obquiz is a publishable Obsidian community plugin. It renders one paginated,
interactive quiz from each `obquiz` YAML code block.

## Boundaries

- Keep the plugin ID `obquiz`, display name `Obsidian Quiz`, and fence language
  `obquiz` synchronized across package metadata, manifest, source, and README.
- Preserve the four question types: `single`, `multiple`, `matching`, and
  `ordering`.
- Keep schema and answer logic pure in `src/model.ts`.
- Keep plugin registration in `src/main.ts`, quiz coordination in
  `src/quiz-controller.ts`, and interaction-specific DOM code in
  `src/renderers/`.
- Keep shared plugin identity and display labels in `src/config.ts`; leave
  renderer-specific constants with their owning renderer.
- Add no runtime dependency without a concrete requirement.
- Scope every style under `.obquiz` or `.obquiz-error`.
- Maintain mouse, touch, and keyboard access.

## Required checks

Run these from this folder after every behavior change:

```sh
npm test
npm run build
```

Release artifacts are `main.js`, `manifest.json`, and `styles.css`. Source code,
tests, README, and package metadata remain in the repository but are not copied
into an installed vault plugin folder.
