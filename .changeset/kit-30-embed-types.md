---
'@ever-teams/embed': patch
---

The package ships its TypeScript declaration next to the element (`dist/ever-teams-embed.d.ts`): an app with `strict`, such as a new Angular app, imports `@ever-teams/embed` without a declaration of its own, `document.createElement('ever-teams-timer')` and an Angular template reference get the element's type, and `EverTeamsTimerAttributes` (with `EverTeamsTimerProps`, the same names in camelCase) types the element's attributes in Vue and Svelte templates.
