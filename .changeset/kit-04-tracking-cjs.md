---
'@ever-teams/tracking': minor
---

The CommonJS build is published as `dist/tracker.cjs`, so `require('@ever-teams/tracking')` loads it (as `dist/tracker.js` in a `"type": "module"` package, Node read it as ESM and failed), and an `exports` map gives `import` and `require`, each with its declarations (`dist/index.d.ts`, `dist/index.d.cts`). `./dist/*` and `./package.json` stay importable; other deep paths are closed, and `dist/tracker.js` is no longer published: import `@ever-teams/tracking` instead.
