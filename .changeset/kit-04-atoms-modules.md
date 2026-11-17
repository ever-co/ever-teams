---
'@ever-teams/atoms': minor
---

Published as one file per module, in ESM (`dist`) and CommonJS (`dist/cjs`), with `exports` conditions for `types`, `import`, `require` and `default` (and `./styles.css`). Every client module keeps its `"use client"` directive and `TeamsProvider` gets one, so a Next.js App Router layout or page can import `TeamsProvider` and the timers without a wrapper file. `@ever-teams/api`, `@ever-teams/toolkit-ui` and `@ever-teams/toolkit-types` are no longer bundled and are required with real ranges, so a host that also installs `@ever-teams/api` has one copy and one `apiConfigManager`. The published declarations no longer contain the source's path aliases. `theme-ui`, `@emotion/react` and `next-themes` are peers only.
