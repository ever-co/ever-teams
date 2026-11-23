# @ever-teams/api

## 0.2.1

### Patch Changes

- Auto-generated patch version bump for SDK changes
- bb7c0e5: `TrackingApiClient` created without a base URL now reads sessions from the API the SDK is configured with (`apiConfigManager`, `https://api.ever.team/api` by default) instead of the demo Gauzy API, so the user's token is never sent to another server. A base URL given to the constructor or to `updateConfig` still wins.
- d166bc2: READMEs: what each package is, and a pointer to the quick start of `@ever-teams/atoms`. `@ever-teams/tracking` says what it records and sends, and asks hosts to get consent and set `apiUrl`.
- e885587: The kit's timers now start and stop with `source: 'EMBED'`, so managers can tell embedded time from the web app's in reports. Against an API that does not know that source yet (a 400 naming `source`), the kit sends the request again with `TEAMS`, as before, and keeps `TEAMS` for that API for the rest of the page: nothing changes for hosts on an older API. `currentTimerSource()` tells which one is in use.
- Updated dependencies
- Updated dependencies [d166bc2]
- Updated dependencies [1221223]
    - @ever-teams/toolkit-types@0.2.0

## 0.2.0

### Minor Changes

- a878d88: Export `finishAccountSetup(loginResult, tenantName)`: finishes the Teams setup of a signed-in account whose setup stopped before its tenant (tenant, default organization + team, employee, refreshed token) and answers an account with a tenant as is. `createCompleteAccount` now runs it after the sign-up, unchanged in behaviour.

## 0.1.9

### Patch Changes

- 410458f: Refactored SDK request structure

## 0.1.8

### Patch Changes

- Tracking Package First version and integration in other packages
- Updated dependencies
    - @ever-teams/types@0.1.10

## 0.1.7

### Patch Changes

- Introduced team management
- Updated dependencies
    - @ever-teams/types@0.1.9

## 0.1.6

### Patch Changes

- Refac Teams Sign Components, Add language support with i18n.
- Updated dependencies
    - @ever-teams/types@0.1.8
