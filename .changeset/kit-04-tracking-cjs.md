---
'@ever-teams/tracking': patch
---

The CommonJS build is published as `dist/tracker.cjs`, so `require('@ever-teams/tracking')` loads it (as `dist/tracker.js` in a `"type": "module"` package, Node read it as ESM and failed), and an `exports` map gives `types`, `import`, `require` and `default`; `./dist/*` stays importable.
