---
'@ever-teams/api': patch
'@ever-teams/toolkit-types': patch
---

A CommonJS build beside the ESM one, with `exports` conditions for `types`, `import`, `require` and `default`. `@ever-teams/api` no longer bundles `@ever-teams/toolkit-types` (required with `^0.1.10`) and no longer imports `tslib`, which it did not declare.
