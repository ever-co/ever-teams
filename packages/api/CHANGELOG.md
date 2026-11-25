# @ever-teams/api

## 0.3.0

### Minor Changes

- 477ee1e: `getOrganisationTeams` takes `embedded`: a read with a token from the host's `getToken` asks only for the member's teams, by organization and member, as the API's embed guard allows. With `getToken`, the timer's team picker reads its teams that way. The team members widget no longer breaks on teams read without their members.
- acbcbb7: `getEmbedProjects(token, tenantId)` reads `GET /embed/projects` with the tenant in the `Tenant-Id` header: the projects a token from the host's `getToken` may track time on (ever-co/ever-gauzy#12080). An API without that route answers an error that keeps its 404 or 403 status; a read with no answer, or an answer that is not a list, comes back as a message with no status. `Select` takes `emptyMessage`, what its list says when it has no item ("No item found" without it). With `getToken`, the timer's project picker lists those projects, and its list says while they are read, when there is none (also on an API without the route) and when they could not be read (any refusal but an older API's 404 or 403 `EMBED_SCOPE`, such as 403 `EMBED_TOKEN_REQUIRED`), in English and French. A failed read is made again with the next token; a list read stays through token renewals, and is no longer shown once the host signs the person out. A project remembered from an earlier entry that the list does not hold (an empty list too) is let go, and picking another project lets the remembered task and client go: the task and client pickers list nothing to change them, and the API refuses a start with a task of another project. `useEmployeeOrganization`, `useMyTasks` and `useOrganizationProjects` no longer send a read the token cannot make: they answer an empty list, so the client and task pickers stay empty with no red notice. Without `getToken` nothing changes.
- 393b479: `createClient({ apiUrl, token | getToken, tenantId?, organizationId?, fetch?, headers? })` gives a typed client of its own, for Node 20 or later and the browser: `timer.status()`, `timer.start()`, `timer.stop()`, `timeEntries.list({ from, to })`, `projects.list()`, `tasks.list()`, `members.list()`, `totals.today()` and `totals.week()`. Two clients never share an address or a token; a client stands for one person, and with an `organizationId` other than its member's, `projects.list()`, `tasks.list()` and the totals throw `NO_EMPLOYEE` rather than send another organization's member. A personal API token is exchanged for a short-lived access token, and a 401 asks for a new token once. Failures are thrown as `EverTeamsError` and one subclass per kind (auth, forbidden with the API's code, not found, validation, conflict, rate limit with `retryAfter`, server, network), each with a `nextStep`. The package declares `sideEffects: false`, and its declarations no longer import `react-day-picker`, which it does not depend on. Every function exported before works as it did.
- 935bdb2: A server entry, `@ever-teams/api/server`: `exchangeEmbedToken({ apiUrl, credential, email | employeeId, origin, firstName?, lastName? })` exchanges an embed credential for a short-lived token for one person (`POST /embed/token`) and answers `{ token, expiresAt }`; `getClientReport({ apiUrl, credential })` answers the time spent for the client a credential is limited to (`POST /embed/client-report`) as an `IClientTimeReport`. Both check their options before any request, throw the SDK's typed errors (the same classes as `@ever-teams/api`) with a next step for each embed code (`EMBED_MEMBER_NOT_ALLOWED`, `EMBED_ORIGIN_NOT_ALLOWED`, `EMBED_EXCHANGE_LIMITED`, `EMBED_CLIENT_REQUIRED`, `EMBED_CLIENT_GONE`), and never put the credential in an error. The entry runs on a server only: its `browser` export condition is `null`, so a page bundle refuses it, and it throws `SERVER_ONLY` when a page loads it. The main entry is unchanged. The README shows the exchange in a Next.js route handler, in Express and in a Fetch API handler, and as one HTTP request with snippets for PHP, Python, Ruby, Go, Java and .NET.
- 7f01171: The client's methods answer types of their own, exported from the package and checked against answers recorded from the API: `timer.status()` answers `EverTeamsTimerStatus`, `timer.start()` and `timer.stop()` an `EverTeamsTimeLog` (its `projectId`, `taskId` and `organizationTeamId` are `null` when the timer started without them, `logType` and `source` are their text values), `timeEntries.list()` `EverTeamsTimeEntry[]`, `projects.list()` `EverTeamsProject[]`, `tasks.list()` `EverTeamsTask[]` and `members.list()` `EverTeamsMember[]`. `timerChangeOf` takes what `timer.status()` answers as well as the kit's `ITimerStatus` (its parameter is `TimerStatusRead`). The request functions and `@ever-teams/toolkit-types` are unchanged.
- 7f64ba8: `timer.watch(listener, { every?, onError? })` on a client of `createClient` tells the listener the timer at a first read, then each start or stop a later read shows, once, wherever it was made. It reads every minute by default (every 15 seconds at the most often), one read at a time, in a page only while it is visible and once more when the page becomes visible or the network comes back, passes a failed read and what the listener throws to `onError` and goes on (without `onError`, a listener's error is thrown again on a fresh task, never as an unhandled rejection), and answers the function that stops it. `timerChangeOf(status, previous)` holds the same rule for a host that reads the status itself. The server entry gets `verifyWebhook({ body, signature, secret, tolerance?, now? })`: it checks the `X-Signature` of a webhook delivery of the API over the raw body (HMAC-SHA256, computed with the Web Crypto API and compared in constant time by the package on every runtime, so it also runs in a worker or an edge route), refuses a signature more than `tolerance` seconds (300) from now, and answers the event; `isTimeEntryEvent` types the five time entry events (`time_log.started`, `time_log.stopped`, `time_log.created`, `time_log.updated`, `time_log.deleted`). Its refusals are `EverTeamsError` with the codes `WEBHOOK_SIGNATURE`, `WEBHOOK_EXPIRED`, `WEBHOOK_BODY` and `CLIENT_OPTIONS`, each with a next step. Every function exported before works as it did.
- a25c4de: `timeEntries.create({ startedAt, stoppedAt, projectId?, taskId?, organizationTeamId?, description?, reason?, isBillable? })` adds a past entry of the token's member (`POST /timesheet/time-log`, with only the fields the API declares) and answers its time log. A range with no time of day, or that does not end after it starts, is refused before any request (`INVALID_DATE`); an organization that does not allow manual time answers an `EverTeamsForbiddenError` that says so, and a range over a running timer or a break an `EverTeamsConflictError` with the API's code (`RUNNING_TIMER_OVERLAP`, `BREAK_OVERLAP`). `timeEntries.list({ from, to, mine: true })` lists only the entries of the token's own member, whatever `employeeIds` names. Without the new method and option, nothing changes.
- a51ba41: `renewEmbedSiteSession({ apiUrl, renewalToken })` and `revokeEmbedSiteSession({ apiUrl, renewalToken })`, in the main entry: a site whose people sign in with Ever Teams renews its timer token with the renewal token the web app handed it (`POST /embed/renew`, answering `{ token, expiresAt, renewalToken, renewalExpiresAt }`) and ends the sign-in (`POST /embed/revoke`). Both send no `Authorization` header. Each refusal is the SDK's typed error with the API's code and a next step: `EMBED_GRANT_ENDED` (sign in again), `EMBED_ORIGIN`, and `EMBED_ORIGIN_NOT_ALLOWED`, `EMBED_SITE_SIGN_IN_OFF` and `EMBED_MEMBER_NOT_ALLOWED` (keep the renewal token); `EmbedSiteSessionErrorCode` types them. Nothing else changes.
- dcb4773: `isEmbedToken` tells an embed token from another one. With an embed token (from the host's `getToken` or a sign-in with Ever Teams), the report widgets read nothing and say "Open Ever Teams to see this." instead of showing zeros and "Failed to fetch".
- 64c1d6a: The kit's password sign-in lists the workspaces an email and password open, as the web app does: with one, it signs in at once as before; with several, the person picks the one to sign in to, instead of landing in the account updated last. `authSignInWorkspace({ email, token })` signs in to one workspace of `authWithEmailPassword`'s list.
- ae39d65: The kit's password sign-in asks an account with two-factor sign-in on for the code of its authenticator app, or a recovery code, instead of saying the person may not track time. `authVerifyTwoFactor({ challenge, code })` (or `recoveryCode`) completes a sign-in the API answered with `TWO_FACTOR_REQUIRED`.

### Patch Changes

- 39b3d59: A CommonJS build beside the ESM one (`dist/index.cjs`), with `exports` conditions `import` and `require`, each with its own declarations: CommonJS callers get `dist/cjs/*.d.ts`, and the ESM declarations name their files with `.js`, so TypeScript also resolves both on `"moduleResolution": "node16"` and `"nodenext"`. `@ever-teams/api` no longer bundles `@ever-teams/toolkit-types` (required with `^0.2.0`) and no longer imports `tslib`, which it did not declare. Its ESM and CommonJS builds share one configuration: `apiConfigManager.setConfig()` through either reaches the requests of both, when a page loads both builds.
- 53802c1: Each package now ships the text of the MIT license its manifest declares, in a `LICENSE` file.
- 7678d4b: An error answer keeps its HTTP status (`statusCode`) when its body is empty or not JSON (a gateway's HTML 503 page, a 401 with no body), and a JSON error body without one gets it (with the status text as `message` and `error` when it has neither), so a caller can tell an answer from a request that got none. Such an answer used to make the request fail while its body was read, and the request functions returned it with no status.
- db7b67d: Every request function, `ApiCall`, `ApiCallUpload` and `TrackingApiClient.getFilteredSessions` take `{ apiUrl }` as an optional last argument (`IApiRequestConfig`): a page that talks to two APIs gives each call its own address. Called without it, they send to the address set with `apiConfigManager.setConfig()`, as before. The TEAMS fallback of an API that refuses the EMBED timer source is kept for the address a write went to. `apiConfigManager.subscribe(listener)` calls `listener` after each `setConfig()` that changes the configuration.
- 5ae4385: A timer start (`timer.start`, and the kit's `startTimer` that its timers use) and a past entry (`timeEntries.create`) without `isBillable` ask the API to bill the time as its project is set (`billableFromProject`: the project named, else its task's), as the web app does; `timer.start` takes `isBillable` for an explicit choice, and an explicit choice still wins. Time without a project, and an API that does not know the field yet, record what they did before: a start is billable, a past entry is not. `ever-teams log` follows the entry's project the same way and takes `--billable` or `--not-billable` to choose; both together is a usage error, refused before any request.
- 7ea42f5: With an embed token, the methods the token cannot reach (time entries, totals, members, projects, tasks) throw `EverTeamsForbiddenError` with the code `EMBED_SCOPE` without sending a request, so a browser gets the documented error instead of a network error that pointed at CORS. The timer and the user are sent as before, and any other token is sent as before.
- 20a949e: `timeEntries.list()` names each entry's client: its own, else its project's, as the web app does, with only `id`, `name` and `imageUrl`. Before, `organizationContact` was always `null`, since time entries record no client of their own.
- 6024c81: A date the SDK refuses names its value in quotes, so an empty one shows. `timeEntries.create` says a start or end in words is not a date, and every refusal of `create` gives the next step it takes: a Date or an ISO date-time.
- c0f16bf: `getTimeLogs` sends the time zone's name ("Europe/Berlin") when a profile stores it with its offset, as the web app does, so the kit's timesheet no longer answers "Bad Request" to those people.
- 464d3b0: `getActivitiesStats` reads the employee it is given before the signed-in person's own, as the kit's other report reads do; with `'all'`, it reads the person's own as before.
- 1565902: `getClientReport`'s next step for `EMBED_CLIENT_GONE` names an archived client as well as a deleted one, and says to restore it from the web app's client list.
- e72a8ac: `@ever-teams/api`, `@ever-teams/toolkit-ui` and `@ever-teams/atoms` require `@ever-teams/toolkit-types` `^0.2.0`, and `@ever-teams/atoms` requires `@ever-teams/toolkit-ui` `^0.3.0`. The `^0.1.10` range let a 0.1 `@ever-teams/toolkit-types` in, which has no `TimerSource.EMBED`: the timer then started and stopped without its source.
- Updated dependencies [39b3d59]
- Updated dependencies [53802c1]
- Updated dependencies [ab417cb]
- Updated dependencies [7f64ba8]
- Updated dependencies [608d55d]
    - @ever-teams/toolkit-types@0.3.0

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
