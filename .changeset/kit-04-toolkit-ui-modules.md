---
'@ever-teams/toolkit-ui': minor
---

Published as one file per module, in ESM (`dist`) and CommonJS (`dist/cjs`), with `exports` conditions `import` and `require`, each with its own declarations (`dist/cjs/*.d.ts` for CommonJS callers; TypeScript also resolves them on `"moduleResolution": "node16"` and `"nodenext"`): a host's bundler keeps only the components it uses, `require('@ever-teams/toolkit-ui')` works, and every client module keeps its `"use client"` directive, so Next.js App Router server components can import the components directly. `@ever-teams/toolkit-types` is no longer bundled and is required with a real range (`^0.1.10`). `theme-ui` and `@emotion/react` are peers only (no longer optional dependencies as well).
