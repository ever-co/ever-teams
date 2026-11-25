# @ever-teams/tracking

## 0.1.0

### Minor Changes

- 3cc18d9: The CommonJS build is published as `dist/tracker.cjs`, so `require('@ever-teams/tracking')` loads it (as `dist/tracker.js` in a `"type": "module"` package, Node read it as ESM and failed), and an `exports` map gives `import` and `require`, each with its declarations (`dist/index.d.ts`, `dist/index.d.cts`). `./dist/*` and `./package.json` stay importable; other deep paths are closed, and `dist/tracker.js` is no longer published: import `@ever-teams/tracking` instead.

### Patch Changes

- 53802c1: Each package now ships the text of the MIT license its manifest declares, in a `LICENSE` file.

## 0.0.3

### Patch Changes

- Auto-generated patch version bump for SDK changes
- d2cc3e5: Without an `apiUrl`, the tracker uploads recordings to the kit's default API (`https://api.ever.team/api`) instead of the demo Gauzy API: the uploads carry the user's token. Set `apiUrl` to your own API, as before.
- d166bc2: READMEs: what each package is, and a pointer to the quick start of `@ever-teams/atoms`. `@ever-teams/tracking` says what it records and sends, and asks hosts to get consent and set `apiUrl`.

## 0.0.2

### Patch Changes

- Tracking Package First version and integration in other packages
