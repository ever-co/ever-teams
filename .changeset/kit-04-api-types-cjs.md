---
'@ever-teams/api': patch
'@ever-teams/toolkit-types': patch
---

A CommonJS build beside the ESM one (`dist/index.cjs`), with `exports` conditions `import` and `require`, each with its own declarations: CommonJS callers get `dist/cjs/*.d.ts`, and the ESM declarations name their files with `.js`, so TypeScript also resolves both on `"moduleResolution": "node16"` and `"nodenext"`. `@ever-teams/api` no longer bundles `@ever-teams/toolkit-types` (required with `^0.1.10`) and no longer imports `tslib`, which it did not declare. Its ESM and CommonJS builds share one configuration: `apiConfigManager.setConfig()` through either reaches the requests of both, when a page loads both builds.
