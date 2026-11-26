# @ever-teams/toolkit-types

## 0.3.0

### Minor Changes

- ab417cb: `TeamsClientTimeReport` shows a client the time spent on its projects (today, this week, and this week by project) from what the host's backend returns through `getReport`, in the `IClientTimeReport` shape (new in `@ever-teams/toolkit-types`). A backend that reads it from the Ever Teams API calls `POST /api/embed/client-report` with an embed credential limited to that client, so no token reaches the client's browser; a backend may also return its own figures. Nothing changes for the existing components.
- 7f64ba8: `TimerChange`: the person's timer as a read of its status shows it (`running`, `startedAt`, `projectId`, `taskId`, and `initial` for the first read), which `onTimerChange` of `@ever-teams/atoms` and `timer.watch` of `@ever-teams/api` hand to the host.

### Patch Changes

- 39b3d59: A CommonJS build beside the ESM one (`dist/index.cjs`), with `exports` conditions `import` and `require`, each with its own declarations: CommonJS callers get `dist/cjs/*.d.ts`, and the ESM declarations name their files with `.js`, so TypeScript also resolves both on `"moduleResolution": "node16"` and `"nodenext"`. `@ever-teams/api` no longer bundles `@ever-teams/toolkit-types` (required with `^0.2.0`) and no longer imports `tslib`, which it did not declare. Its ESM and CommonJS builds share one configuration: `apiConfigManager.setConfig()` through either reaches the requests of both, when a page loads both builds.
- 53802c1: Each package now ships the text of the MIT license its manifest declares, in a `LICENSE` file.
- 608d55d: The declarations npm packs and publishes keep the `.js` the build writes on each relative path: the package's `prepare` script, which npm runs after the build, wrote them again without it, so an ES module under `"moduleResolution": "node16"` or `"nodenext"` got none of the package's types, directly or through `@ever-teams/api`.

## 0.2.0

### Minor Changes

- 1221223: `TimerSource.EMBED`: the source of time tracked through a timer embedded in another product with this kit.

### Patch Changes

- Auto-generated patch version bump for SDK changes
- d166bc2: READMEs: what each package is, and a pointer to the quick start of `@ever-teams/atoms`. `@ever-teams/tracking` says what it records and sends, and asks hosts to get consent and set `apiUrl`.

## 0.1.10

### Patch Changes

- Tracking Package First version and integration in other packages

## 0.1.9

### Patch Changes

- Introduced team management

## 0.1.8

### Patch Changes

- Refac Ever Teams Sign Components, Add language support with i18n.
