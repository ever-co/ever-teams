# audit-evidence.md — the raw subtraction behind `AUDIT.md`

Everything here is a number I obtained from a command output or a file I read, or a line I read verbatim. No test
was run by this audit: I started no server, no browser, and ran no Playwright command.

## 0. Provenance, and a warning about the moving tree

- Counts and greps were taken against `apps/web` at commit `b19990f6e` (`fix(playwright): laneServers had a
  parameter that referenced itself`, 2026-11-21 07:40) — `git rev-parse --short HEAD` at the moment I measured.
  By the time this file was written HEAD had moved twice more (`19bad3b9e` "a lane's app was pointed at the
  canonical mock, not its own", then `0068ffcb9` "lane-a's task-edit and timer journeys as the lane left them —
  written, not run", 09:34), and `git status --short apps/web/playwright` then showed two further new lane-b
  specs (`password-recovery.spec.ts`, `signup-forms.spec.ts`). Nothing I quote from `app/**`, `core/**`, the
  manifests or the mock moved in those commits; the lane residuals may have.
  The §K.1 re-reading was taken later, at HEAD `913d1abd8` ("test(playwright): lane-b ran — 45 passed / 30
  failed in 4963 s, with the report and the log both quoted").
- **This audit lane filed no claim row and holds no live target.** It ran no server, no test, no browser and no
  cluster command, so nothing it did needs a §3 ACTIVE row under the workstation rules (read-only work needs
  none). A peer lane searched the board for a `test_lane_c_20261121` row and for six lane commits and found
  neither: those belong to whichever lane ran live probes against `apidev`, not to this one, and that lane owes
  the board a row.
- **One repo, one machine, one worktree — and commits that are not in it.** `git worktree list` here returns only
  `E:/Coding/ever-teams 65e928e3e [test/playwright-e2e-suite]`, and `ls -d /e/Coding/ever-teams*` returns one
  checkout. A peer check asked whether five commits (`49181d521 f001c823e 5119f1e11 791f8d644 1361e2160`) exist:
  `git cat-file -e <sha>^{commit}` answers **unknown revision** for all five, on this branch and in `--all`, while
  `913d1abd8` and `65e928e3e` (the lane runs on this PC) are present, as are the lane logs in
  `E:/Coding/.tmp/` (`lane-a-run6..10`, `lane-b-verify.log`, `lane-c-full.log`, `lane-d-list.log`,
  `lane-c-unguarded.mjs`). Files named in that peer check — `gate*`, `wf31.txt`, `lane-b-73.txt` — do not exist in
  that folder. `git log --oneline -- playwright/AUDIT.md playwright/audit-evidence.md` here gives one commit,
  `72d8a0a64`, so the audit is in this branch history; the corrections made after it are uncommitted working-tree
  edits, because this lane is not allowed to run git write commands.
- **The tree moved under me three times while I read it** (`git status --short` at three moments showed different
  lane files: `lane-c/malformed-json.spec.ts`, `lane-c/permission-guard.spec.ts`, `lane-c/PLAN.md`,
  `lane-b/passcode-journey.spec.ts`, `lane-b/password-journey.spec.ts`, `lane-b/lane-auth-helpers.ts`,
  `lane-a/task-work.spec.ts`, `lane-a/timer-journey.spec.ts`, `lane-servers.mjs`, `test-servers.ts`; and
  `lane-b/zz-probe.spec.ts` shown as ` D` — deleted in the working tree, still tracked in HEAD per
  `git ls-tree -r HEAD --name-only playwright/suites/lane-b`).
- What that changes: the residuals **against lane specs** (sections G and H) move every time a lane commits.
  `415` route handlers, the manifests, the mock and `core/**` did **not** move (`git status --short` showed no
  change under `apps/web/app/**` or `apps/web/core/**` at any of the three checks). Re-run section M before
  quoting a residual number.

My analysis scripts live outside the repo, in
`C:\Users\Evereq\AppData\Local\Temp\everteams-audit\` (`scan-routes.cjs`, `final.cjs`, `subtract2.cjs`,
`guardfree.cjs`, `reads-and-late.cjs`, `tally.cjs`, `mine2.cjs`). They only read files.

## A. Handlers that exist

From `node .../scan-routes.cjs apps/web/app/api summary` (a walk of every `route.ts`, verbs from
`export (async) function VERB`, `export const VERB`, `export { … VERB …`):

```
route.ts files: 415
verb entries (handler × verb): 532
handlers with no recognizable verb: []
handlers with at least one guard call: 368
handlers with no guard call at all: 47
```

Verb distribution (my `subtract2.cjs` section (e), same walk):

```
GET 202, POST 177, PUT 74, DELETE 64, PATCH 10, OPTIONS 4, HEAD 1
```

`apps/web/playwright/suites/api/routes.generated.ts` (the sweep manifest) agrees: **415 handlers, 532 verb
entries**, parsed with a regex over `{ path: '…', verbs: [ … ] }`.

## B. Which guard families the handlers call

Same scan, counting a family when `\b<name>\s*\(` appears in the route file:

| guard called in a `route.ts` | handlers |
| --- | --- |
| `forwardToGauzy` | 215 |
| `authenticatedGuard` | 138 |
| `refuseForeignOrigin` | 111 |
| `refuseUnlessPermitted` | 14 |
| `refuseWithoutPermission` | 6 |
| `routeSession` | 4 |
| `forwardDownloadToGauzy` | 2 |
| `refuseForeignWrite` | **0** |

`refuseForeignWrite` is called from exactly two helpers and one unit test, never from a route:
`core/services/server/forward-to-gauzy.ts:89`, `core/services/server/refuse-without-permission.ts:38`, and
`core/services/server/same-origin-request.test.ts:53,57,62,64`.

`no guard, but talks upstream: []` — every guard-free handler in this app goes through a request helper rather
than calling `fetch()` on its own.

**That table is a vocabulary, not a fact about the code.** It counts a handler as guarded only for the nine
names the scan knows. A tenth exists: `core/lib/board/board-app.ts:81-87` `isTrustedBoardOrigin(origin)` — used
at `app/api/board/notify/route.ts:38-41`, and **stricter** than `refuseForeignOrigin`: it refuses a caller that
sends no `Origin` at all (`origin === trusted` fails for null), where `same-origin-request.ts:21` allows a
missing `Origin`. With that name added, 1 more write entry becomes guarded (287 instead of 286).

And the scan is **per file**: a route file that re-exports another route's handler inherits that handler's
guard without naming it. Three write entries are guarded this way (`scan-corrected.cjs`):

```
POST /api/timer/toogle              -> apps/web/app/api/timer/toggle/route.ts            guards: refuseForeignOrigin, authenticatedGuard
POST /api/daily-plan/[id]/task      -> apps/web/app/api/daily-plan/plan/[planId]/route.ts  guards: refuseForeignOrigin, authenticatedGuard
PUT  /api/daily-plan/[id]/task      -> same file, same guards
```

`app/api/timer/toogle/route.ts:1-9` is literally `import { POST as togglePOST } from '../toggle/route'` and
`return togglePOST(req)`; `app/api/daily-plan/[id]/task/route.ts:1-14` imports `POST`/`PUT` from
`daily-plan/plan/[planId]/route` and forwards them. Neither file names a guard, so `collect-foreign-origin-routes.mjs`
cannot see one — and its `GUARDED_ENTRY` test at `:114` then never considers the file at all.

## C. The foreign-origin manifest, and the write-verb arithmetic

`apps/web/playwright/suites/api/foreign-origin.generated.ts`, parsed entry-by-entry
(`{ path, verb, guard, file }`):

```
entries: 286          distinct paths: 245          distinct route files: 245
by guard: route 134, proxy-helper 152
by verb: POST 143, DELETE 63, PUT 72, PATCH 9
```

The arithmetic (my `final.cjs`, whose verb list is `POST/PUT/PATCH/DELETE`):

First measurement (`final.cjs`, per **file**, at `b19990f6e`):

```
write verb entries across the 415 handlers:                       325
write verb entries of a handler whose FILE calls a guard:         288
write verb entries of a handler whose FILE calls NO guard:         37
   across 33 route files
write verbs of a GUARDED handler NOT in the manifest:               2
      ["POST /api/board/notify", "POST /api/organization-team-join"]
```

`286 + 37 + 2 = 325` held, but the 37/33 half was counted per file and is superseded (see §E.1). Re-measured
per **handler**, with the imported-guard vocabulary and alias resolution, at HEAD `65e928e3e`
(`scan-corrected.cjs`):

```
route.ts files:                                                   415
write verb entries:                                               325
own handler body calls a guard (extended vocabulary):             287
   of which only through isTrustedBoardOrigin:                      1
guard reached through an alias re-export:                           3
no guard, own or inherited:                                        35
   across 32 route files
```

The lane that ran the same subtraction on this branch reported 324 write entries / 286 guarded / 38 unguarded
in 35 files (`65e928e3e`, `/e/Coding/.tmp/lane-c-unguarded.mjs`), and independently removed the same three
alias-guarded routes plus `isTrustedBoardOrigin` to reach 32 files.
`git diff --name-only 913d1abd8 65e928e3e -- apps/web/app/api apps/web/core` shows no handler changed between
those commits, so the 324-vs-325 difference is a scanning rule, not the tree; the lists, not the counts, are
what a lane should diff.

## D. Reads

`collect-foreign-origin-routes.mjs:30` — `const VERBS = ['POST', 'PUT', 'PATCH', 'DELETE'];` — the manifest can
only ever contain writes.

I then re-used the collector's own handler-splitting (`handlerBody` at
`collect-foreign-origin-routes.mjs:75-89`, `untilNextTopLevel` at `:60-67`) and asked the same question about
reads (`reads-and-late.cjs`):

```
read handlers (GET/HEAD/OPTIONS) whose OWN body calls a foreign-origin guard: 0
```

Verified by hand on three of the files that a per-file scan flags:
`app/api/comment/route.ts` (guard at `:40` inside `POST` at `:39`; `GET` at `:21` calls no guard),
`app/api/tasks/team/route.ts` (guard at `:8` in `POST` at `:7`; `GET` at `:66`),
`app/api/organization-team/route.ts` (guard at `:14` in `POST` at `:13`; `GET` at `:50`).

A per-**file** count, for completeness: 35 GET verbs sit in files that call `refuseForeignOrigin` somewhere
(`subtract2.cjs` section (a) — `/api/ai/transcribe`, `/api/ai/voice-fill`, `/api/comment`, `/api/daily-plan`,
`/api/daily-plan/[id]`, `/api/editor-assist`, `/api/employee-appointment`, `/api/employee-notification-setting`,
`/api/ever-connect/[...path]`, `/api/invite/[id]`, `/api/invoice-payments/connection`, `/api/invoice-schedules`,
`/api/issue-types`, `/api/organization-projects`, `/api/organization-projects/[id]`, `/api/organization-team`,
`/api/organization-team/[id]`, `/api/plugins/docs/imports`, `/api/plugins/docs/links`,
`/api/role-permissions/[id]`, `/api/roles/options`, `/api/roles`, `/api/saved-reports`, `/api/tags`,
`/api/task-priorities`, `/api/task-related-issue-types`, `/api/task-sizes`, `/api/task-statuses`,
`/api/task-versions`, `/api/tasks/employee/[employeeId]`, `/api/tasks/team`, `/api/tasks/[id]`,
`/api/timer/slot`, `/api/user/[id]`, `/api/user-api-tokens`). In every one of them the guard call is in a
write handler, not the read handler — which is why the per-handler count above is 0.

## E. The 47 handlers no guard runs through

33 of them have a write verb (verb list first, from `final.cjs`):

```
POST /api/account-deletion/confirm
POST /api/account-deletion/me
POST /api/account-deletion/request
POST /api/account-deletion/verify
POST /api/auth/ever-id/backchannel-logout
POST /api/auth/ever-id/confirm
POST /api/auth/ever-id/finish-setup
POST /api/auth/ever-id/signup-handoff
POST/PUT/PATCH/DELETE /api/auth/ever-id/start
POST /api/auth/finish-setup
POST /api/auth/login
POST /api/auth/refresh
POST /api/auth/register
POST /api/auth/request-password
POST /api/auth/reset-password
POST /api/auth/send-code
POST /api/auth/signin-email
POST /api/auth/signin-email-confirm
POST /api/auth/signin-email-password
POST /api/auth/signin-email-social-login
POST /api/auth/signin-workspace
POST /api/auth/two-factor/verify
POST /api/auth/verify/token
POST /api/auth/[...nextauth]
POST /api/auth/_signin-workspace
POST/PUT /api/daily-plan/[id]/task
POST /api/invite/accept
POST /api/invite/validate-by-code
POST /api/log
POST /api/organization-team-join/resend-code
POST /api/organization-team-join/validate
POST /api/public/invoice-payments/invoice/[id]/[token]/checkout
POST /api/timer/toogle
```

The other 14 are reads:

```
GET /api/auth/ever-id/verify-email
GET /api/auth/two-factor
GET /api/changelog
GET /api/desktop-server
GET /api/employee-placeholder/[id]/merge-preview
GET /api/health
GET /api/placeholder/[size]/[background]
GET /api/public/invoice/[id]/[token]/download
GET /api/public/invoice/[id]/[token]
GET /api/public/invoice-payments/invoice/[id]/[token]
GET /api/public/saved-reports/[token]
GET /api/public/team/[profileLink]/[teamId]
GET /api/public-assets/[...path]
GET /api/
```

Reachability of the unguarded auth/deletion family from the browser (not assumed — greps under `core`):
`core/hooks/auth/use-authentication-passcode.ts:182` ("Attempt 2 — the Next.js /api/auth/login route, which
understands INVITE codes typed into this…"), `core/lib/auth/account-deletion.ts:4` and
`core/services/client/api/auth/account-deletion.service.ts:46` ("proxy mode calls this app's
`/api/account-deletion/*` routes"), `core/lib/board/board-notify.ts:7` (`/api/board/notify`),
`core/services/server/requests/account-deletion-me.ts:56-58`.

### E.1 Corrected list — 35 unguarded write verbs in 32 route files (per handler, at HEAD `65e928e3e`)

The list above (§E) was counted per **file** and is superseded by this one. Re-derived with `scan-corrected.cjs`
(per-handler bodies, the guard vocabulary widened with `isTrustedBoardOrigin`, and alias re-exports resolved to
the file that holds the handler):

```
DELETE /api/auth/ever-id/start
PATCH  /api/auth/ever-id/start
PUT    /api/auth/ever-id/start
POST   /api/auth/ever-id/start
POST   /api/auth/[...nextauth]
POST   /api/auth/_signin-workspace
POST   /api/auth/ever-id/backchannel-logout
POST   /api/auth/ever-id/confirm
POST   /api/auth/ever-id/finish-setup
POST   /api/auth/ever-id/signup-handoff
POST   /api/auth/finish-setup
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/register
POST   /api/auth/request-password
POST   /api/auth/reset-password
POST   /api/auth/send-code
POST   /api/auth/signin-email
POST   /api/auth/signin-email-confirm
POST   /api/auth/signin-email-password
POST   /api/auth/signin-email-social-login
POST   /api/auth/signin-workspace
POST   /api/auth/two-factor/verify
POST   /api/auth/verify/token
POST   /api/account-deletion/confirm
POST   /api/account-deletion/me
POST   /api/account-deletion/request
POST   /api/account-deletion/verify
POST   /api/invite/accept
POST   /api/invite/validate-by-code
POST   /api/log
POST   /api/organization-team-join
POST   /api/organization-team-join/resend-code
POST   /api/organization-team-join/validate
POST   /api/public/invoice-payments/invoice/[id]/[token]/checkout
```

Three entries the first list carried are **removed** because they are guarded and my first scan could not
see the guard: `POST /api/board/notify` (`isTrustedBoardOrigin`, `route.ts:38-41`), `POST /api/timer/toogle
(alias of `timer/toggle/route.ts`, whose POST starts with `refuseForeignOrigin` at `:7`), and `POST`+`PUT
/api/daily-plan/[id]/task` (aliases of `daily-plan/plan/[planId]/route.ts:8` and `:33`). One entry the first
list missed is **added**: plain `POST /api/organization-team-join` — the file's GET runs `authenticatedGuard
(route.ts:8)`, its POST (`:19-22`) runs nothing, and per-file counting hid that.
`/api/auth/ever-id/start` contributes four verbs (POST/PUT/PATCH/DELETE), which the per-file list folded into
one line.

Who found it: the lane-c lane on this branch re-ran the subtraction at `65e928e3e` and named the same three
import-guarded files plus `isTrustedBoardOrigin` (`/e/Coding/.tmp/lane-c-unguarded.mjs`). Re-derived independently
here, the same scan yields 38 unguarded entries across 34 files **before** alias resolution and **35 across 32**
after it, so both scans land on 32 route files. Their 324 write entries / 286 guarded / 38 unguarded in 35 files
and my 325 / 287 / 35 in 32 are the same family measured with slightly different verb and file rules — the list
above is what a lane should diff, not the counts.

## F. Is the collector sound in what it does cover?

`collect-foreign-origin-routes.mjs` credits a verb only when the guard token appears in **that handler's own
body** and before any upstream call (`:91-112`, `:107`). I re-ran that ordering test over all 415 handlers:

```
write handlers whose body calls an upstream helper BEFORE the guard: 0
```

So nothing is silently dropped for ordering reasons today. What the collector cannot see is a guard it does not
know: `GUARD = /\brefuseForeign(Write|Origin)\s*\(/` (`:31`) and
`GUARDED_HELPERS = ['forwardToGauzy','refuseUnlessPermitted','refuseWithoutPermission']` (`:37`) are a
hand-kept vocabulary, and `GUARDED_ENTRY` (`:114`) decides which files are considered at all. `app/api/board/notify`
uses `isTrustedBoardOrigin` (`app/api/board/notify/route.ts:39`, from `core/lib/board/board-app.ts`) — not in
either list — so its POST is absent from the manifest. `app/api/organization-team-join/route.ts` has
`authenticatedGuard` at `:8` (GET) and a POST at `:19-22` with no guard before `requestToJoinRequest`, which
itself sends no credential (`core/services/server/requests/request-to-join-team.ts:14-19` → `serverFetch` with
no `bearer_token`; `core/services/server/fetch.ts:91-92` adds `authorization` only when a token is passed).

`--check` semantics, `scripts/api-routes-lib.mjs:23-31`: the checked-in manifest must equal what the generator
would write **from today's source**, else it exits 1 with "…is out of date. Regenerate it: …". `suites/api/manifests.spec.ts:14-29`
runs both collectors in `--check` mode, and they are the only two tests there.

## G. `authenticatedGuard` residual

`subtract2.cjs` section (c): for each of the 138 handlers that call `authenticatedGuard`, does its path (with
`[param]` segments stripped) appear in any file under `playwright/suites/**/*.spec.ts`?

```
named by at least one spec: 50
named by no spec:           88
```

```
GET /api/activity-log
POST /api/auth/create-workspace
POST /api/auth/verify/resend-link
GET/OPTIONS /api/board/members
POST/OPTIONS /api/board/notify
GET/OPTIONS /api/board/session
PUT/DELETE /api/comment/[id]
GET /api/daily-plan/employee/[employeeId]
POST/PUT /api/daily-plan/plan/[planId]
GET /api/daily-plan/task/[taskId]
PUT /api/daily-plan/[id]/remove
GET/POST /api/editor-assist
GET /api/employee/inactive
PUT /api/employee/me/presence
POST /api/employee/rate-change-request
GET /api/employee/[id]/pay-rate
PUT /api/employee/[id]/profile
GET /api/employee-appointment/invited
PUT/DELETE /api/employee-appointment/[id]
PUT /api/employee-notification/mark-all-read
PUT /api/employee-notification/[id]
GET /api/favorite/type
POST /api/integration/github/install
GET /api/integration/github/metadata
POST /api/integration/github/oauth
GET /api/integration/github/repositories
POST /api/integration/github/repository/sync
GET /api/integration
GET /api/integration/types
GET /api/integration-tenant/remember/state
DELETE /api/integration-tenant/[id]
POST /api/invite/emails
POST /api/invite/resend
PUT/DELETE /api/issue-types/[id]
GET /api/languages
PUT /api/organization-projects/setting/[id]
PUT /api/organization-projects/[id]/members/[employeeId]/rate
PUT /api/organization-projects/[id]/rate
GET /api/organization-projects/[id]/rates
GET/PUT/DELETE /api/organization-projects/[id]
PUT/DELETE /api/organization-team/employee/[id]
GET /api/organization-team/organizations
DELETE /api/organization-team/teams/[id]
GET/PUT/DELETE /api/organization-team/[id]
PUT /api/organization-team-employee/[id]/active-task
PUT/DELETE /api/organization-team-employee/[id]
GET/POST /api/organization-team-join
PUT /api/organization-team-join/[id]/[action]
POST /api/plugins/docs/documents/upload
GET /api/plugins/docs/documents/[id]/download
GET/POST /api/plugins/docs/imports
GET/POST /api/plugins/docs/links
DELETE /api/plugins/docs/links/[id]
GET/POST /api/roles/options
GET /api/roles/team-assignable
PUT/DELETE /api/roles/[id]
POST /api/subscribe
GET /api/tags/level
PUT/DELETE /api/task-priorities/[id]
PUT/DELETE /api/task-related-issue-types/[id]
PUT/DELETE /api/task-sizes/[id]
PUT/DELETE /api/task-versions/[id]
GET/DELETE /api/tasks/employee/[employeeId]
POST/PUT /api/tasks/task-linked-issue
DELETE /api/tasks/task-linked-issue/[id]
GET /api/timer/daily
POST /api/timer/discard
GET/DELETE /api/timer/slot
GET /api/timer/slot/window
GET /api/timer/status
GET /api/timer/status/worked
POST /api/timer/sync
GET /api/timer/timesheet/all-statistics-tasks
GET /api/timer/timesheet/daily
GET /api/timer/timesheet/statistics-tasks
PUT /api/timer/timesheet/status
POST /api/timer/timesheet/time-log
PUT /api/timer/timesheet/time-log/[id]
POST /api/timer/toggle
GET /api/timesheet/activity/report
GET /api/timesheet/statistics/counts
GET /api/timesheet/time-log/report/daily
GET /api/timesheet/time-log/report/daily-chart
GET /api/timesheet/time-log/report/weekly
DELETE /api/user/reset
PUT /api/user/[id]/role
GET /api/user-api-tokens/config
DELETE /api/user-api-tokens/[id]
```

(`POST /api/organization-team-join` appears here **and** in section E: the file calls `authenticatedGuard` for
its GET, its POST calls nothing.)

## H. Permission-guard residual

20 handlers call `refuseUnlessPermitted` (14) or `refuseWithoutPermission` (6). `subtract2.cjs` section (b)
collects the upstream endpoints named in `suites/lane-c/permission-guard.spec.ts` (`path: (ids) => \`/api/…\``)
and subtracts:

```
guarded verb+path whose endpoint the spec does not name: 1
  "PUT /api/invoices/email/[email]"
endpoints the spec names (20 shapes): /api/export, /api/organization/*/counts, /api/organization/*/soft,
/api/invoices/pagination, /api/invoices/highest, /api/invoices/*, /api/invoices/download/*, /api/invoices,
/api/invoices/*/action, /api/invoices/*/with-items, /api/invoices/email/manager@example.test,
/api/invoice-item/bulk/*, /api/invoice-schedules, /api/invoice-schedules/*/runs, /api/invoice-schedules/*,
/api/organization-contact, /api/organization-contact/*, /api/organization-contact/*/recover,
/api/organization-contact/*/soft, /api/timer/started-at
```

The only reason `PUT /api/invoices/email/[email]` looks covered is that the spec hardcodes the fixture address
where the route shape is `[email]`.

## I. Smaller families

```
routeSession:            GET/POST/PUT/DELETE /api/ever-connect/[...path], PUT /api/ever-stats/enabled,
                         GET /api/ever-stats/last, GET /api/ever-stats/status        (4)
forwardDownloadToGauzy:  GET /api/export, GET /api/plugins/docs/documents/[id]/export.pdf  (2)
```

## J. What the shared mock can and cannot answer

`apps/web/cypress/support/mock-gauzy-server.mjs` (1149 lines, shared with Cypress):

- **Answers every path** (`:792-794`): `if (method === 'DELETE') return { affected: 1, raw: [] };` /
  `if (method !== 'GET') return body ?? { success: true };` / `return pagination([]);`.
- Statuses it can produce from its own fixture switches (`grep -o "\[HTTP_STATUS\]: [0-9]\{3\}"`):
  `403, 403, 500, 401, 401, 500, 429, 403, 500` — three 500s, each behind a switch.
- `NOT_FOUND` / `UNAUTHORIZED` returns appear 6 times in the whole file
  (`NOT_FOUND, UNAUTHORIZED, NOT_FOUND, NOT_FOUND, UNAUTHORIZED, NOT_FOUND`), all inside the
  ever-stats / ever-connect branches.
- `/api/user/me` answered with the fixture user, no session check (`:532`).
- The **only** tenant-enforcing branch is `switch-organization` (`:542-553`).
- Scope of answered rows follows the `tenant-id` header or a `tenantId` / `where[tenantId]` query or
  `scenario.scope` (`:27-33`) — never an id in a path.
- Five fixed permissions (`:38-50`): `TIME_TRACKER, ORG_TASK_ADD, ORG_TASK_EDIT, ORG_INVITE_EDIT,
  ORG_EMPLOYEES_EDIT`.
- ever-platform `signedIn` is "any Bearer arrived" (`:911`).
- Request log: method/path/query/startMs/endMs/status only — no headers, no body (`:1038-1048`);
  `state.receivedTokens` = sha256 per path of every Bearer received (`:1052-1058`).
- Browser origins it trusts: `http://localhost:3030` plus `E2E_TRUSTED_APP_ORIGINS`, validated as loopback
  (`:17-23`); an untrusted `Origin` is refused 403 (`:979-983`); every answer carries `cache-control: no-store`
  (`:991`).

## K. What has actually been run (today, while this audit was being written)

Read from `apps/web/playwright/artifacts/*.json` with `node .../tally.cjs`. **These files are git-ignored**
(`.gitignore:132-133`, "Generated by the test tooling (CI uploads them as build artifacts)"), so each run
overwrites the previous one:

| artifact | started (UTC) | expected | skipped | unexpected | duration |
| --- | --- | --- | --- | --- | --- |
| `playwright-api.json` | 2026-11-21T05:32:25 | 1152 | 0 | 0 | 523 s |
| `playwright-mock.json` | 2026-11-21T05:09:55 | 5 | 0 | 0 | 157 s |
| `playwright-ever-id.json` | 2026-11-21T05:22:09 | 23 | 0 | 0 | 79 s |
| `playwright-lane-a.json` | 2026-11-21T05:39:05 | 0 | 0 | 4 | 941 s |
| `playwright-lane-b.json` | 2026-11-21T05:41:48 | 0 | 1 | 0 | 0.14 s |
| `playwright-lane-c.json` | (moving — see below) | — | — | — | — |

Per file, from the same artifact (`playwright-api.json`, all `passed`):

```
api/auth-refresh.spec.ts        n=5      api/manifests.spec.ts             n=2
api/empty-body.spec.ts          n=261    api/page-gate.spec.ts             n=19
api/ever-connect-proxy.spec.ts  n=15     api/sweep.spec.ts                 n=534
api/ever-id-off.spec.ts         n=6      api/tenant-boundary.spec.ts       n=11
api/foreign-origin.spec.ts      n=292    api/token-cookie-chunks.spec.ts   n=7
```

`playwright-mock.json` covered **4 files / 5 tests** (`mock/notifications 1`, `mock/routes 2`, `mock/shell 1`,
`mock/workspace 1`) while `playwright/README.md:148-156` describes a mock run of 145 tests — the artifact
records `config` (projects, workers, configFile) but not the filter that produced 5 tests, so "the mock suite
is green" cannot be read from it.

`playwright-lane-a.json`: 4 failures, all `lane-a/timer-journey.spec.ts`, all the same error —
`TimeoutError: page.waitForFunction: Timeout 45000ms exceeded.` at `helpers.ts:341`
(`waitForShellReady`), each followed by `Test timeout of 180000ms exceeded.`

`playwright-lane-b.json`: 1 test (`lane-b/zz-probe.spec.ts`, "probe: the passcode form on the wire"), status
**skipped**, 0 executed.

`lane-c`, three readings of the same file within ~50 minutes, because lane-c kept re-running it:

- 2026-11-21T07:28:58 — `expected 1, unexpected 25` (read at ~07:45; the file has since been overwritten)
- 2026-11-21T08:08:36 — `skipped 208` (a list-shaped run: 208 is the lane's whole test count)
- 2026-11-21T08:17 / 08:21 — `expected 2` then `expected 8`, only `lane-c/foreign-id-scope.spec.ts` present

`apps/web/playwright/artifacts/test-results-lane-c/` was populated with ~20 `permission-guard` failure
directories during that window and is **now empty** (0 entries) — the evidence of the 25-failure run is gone.

Older evidence that no longer exists on disk (read earlier in this audit from the 2026-11-19 artifacts, since
overwritten): 1029 expected / 83 unexpected in the api suite — 14 of them `page-gate` (a protected path answered
200 with the whole document), 2 `foreign-origin` failures whose "Received" lines showed calls another test had
made (`PUT /api/employee/me/presence`; `GET /api/organization-team/…`, `GET /api/tasks/team`,
`GET /api/timesheet/timer/status`), 1 `ever-connect-proxy` `TypeError: answer.headers is not a function`.
The last of those is fixed in the current source: `suites/api/ever-connect-proxy.spec.ts:84-98` now reads
`answer.headers['cache-control']`. The log-contamination failures are **not reproducing today** (the 05:32 api
run is 1152/0) — UNVERIFIED whether they were fixed or are timing-dependent.

### K.1 Second reading, 2026-11-21 18:2x — the same six files, four different sets of numbers

Re-read with the same script (`node C:\Users\Evereq\AppData\Local\Temp\everteams-audit\tally.cjs`), now mapping
the reporter's per-result statuses (`passed` / `failed` / `timedOut`), against HEAD `913d1abd8`:

| artifact | started (UTC) | expected | skipped | unexpected | duration |
| --- | --- | --- | --- | --- | --- |
| `playwright-api.json` | 2026-11-21T15:43:26 | 1159 | 0 | **3** | 531 s |
| `playwright-mock.json` | 2026-11-21T05:09:55 | 5 | 0 | 0 | 157 s (unchanged file) |
| `playwright-ever-id.json` | 2026-11-21T05:22:09 | 23 | 0 | 0 | 79 s (unchanged file) |
| `playwright-lane-a.json` | 2026-11-21T15:14:34 | 12 | 0 | 0 | 121 s |
| `playwright-lane-b.json` | 2026-11-21T15:36:56 | 45 | 0 | **30** | 4963 s |
| `playwright-lane-c.json` | 2026-11-21T14:35:51 | 29 | 0 | 0 | 14 s |
| `playwright-lane-d.json` | 2026-11-21T16:39:20 | 0 | **87** | 0 | 0.13 s (list run) |

Per file, with failures named (my tally script prints the first eight per file):

```
api/auth-refresh 5/0     api/foreign-origin 296/0      api/sweep 537/0
api/empty-body 261/0     api/ever-connect-proxy 15/0   api/tenant-boundary 11/0
api/ever-id-off 6/0      api/manifests 2/2             api/token-cookie-chunks 7/0
api/page-gate 19/0       api/upstream-outage 0/3   ← new file in the api suite
lane-a/smoke 3/0  lane-a/task-work 5/0  lane-a/timer-journey 4/0
lane-c/cache-directive 10/0   lane-c/public-link-shape 19/0     (8 lane-c files still unrun)
lane-b/cookie-jar 4/1     lane-b/locale-rendering 4/2   lane-b/passcode-journey 2/5
lane-b/password-journey 2/4  lane-b/password-recovery 7/4  lane-b/route-refusals 10/7
lane-b/session-routing 12/3  lane-b/signup-forms 4/4
```

The three api failures are all `api/upstream-outage.spec.ts`, all with the same message — "the test backend was
never asked for what the test expected (after 30 reads)", pointing at `playwright/helpers.ts:215`. The file's own
scenarios delay `/api/user/me` (`:137`) and `/api/ever-connect/health` (`:199`) by 16 s.

The lane-b run, checked independently of the lane that ran it: 75 results in the artifact (45 passed, 30
failed/timedOut), matching that lane's own log `E:\Coding\.tmp\lane-b-verify.log` (115 KB, "Running 75 tests
using 1 worker"). Slowest results, from `r.duration` in the artifact (`slow.cjs`):

```
180.2 s  timedOut  lane-b/signup-forms.spec.ts     "a real name with an address that is not an address…"
180.2 s  timedOut  lane-b/password-recovery.spec.ts "two different passwords are refused on the confirmation…"
 64.3 s  passed    lane-b/cookie-jar.spec.ts        "a signed-in browser holds the app's own cookie family…"
 27.6 s  failed    lane-b/locale-rendering.spec.ts  "the language list this deployment offers is empty…"
```

so the two 3-minute cases are the two `timedOut` ones, and the rest of the spread runs 1.4 s–64 s (not 1.4–27.6 s:
the 64.3 s cookie-jar case **passed**).

**One failure in that run is `AUDIT.md` finding 1, confirmed by a log.** `lane-b/route-refusals.spec.ts`'s case
"POST /api/organization-team-join relays an anonymous, foreign body to the platform API with no session and no
origin check" failed with the mock's catch-all answer `{"items":[],"total":0}` in its Received line — the relay
happened, and the body came back echoed. That is `app/api/organization-team-join/route.ts:19-22` +
`request-to-join-team.ts:14-19` + `fetch.ts:91-92` behaving exactly as §E and finding 1 describe.

Files that exist in the suites now and did not when §K was first written:
`suites/api/upstream-outage.spec.ts`, `suites/lane-c/unguarded-writes.spec.ts` (its header quotes `AUDIT.md`
finding 1 and re-derives the unguarded set against the newer tree as 38 uncredited write verbs in 35 route
files — my 37/33 was measured at `b19990f6e`), and `suites/lane-d/`.

## L. Lane-side counts, and who says them

- `suites/lane-c/PLAN.md:5` — "**No test in this lane has been executed yet.**" and its run queue at `:45-76`.
  Its `--list` total (208 tests in 8 files) is *their* measurement, taken before the lane's specs grew.
  `suites/lane-c/PLAN.md:249-262` records what the lane deliberately did not take, including
  "`app/api/auth/**` sign-in routes (login/register/verify) beyond the malformed-body probe".
- `suites/lane-b/README.md:30-32` — "Nothing in `suites/lane-b/` has been run against a live app yet (no run
  log yet in `playwright/README.md`), so what each case pins is a claim until it passes."
  `suites/lane-b/PLAN.md:43-44` — "**No lane-b test has been run against a live app yet.**" (written after the
  skipped zz-probe run at 05:41, which is consistent: nothing executed).
- lane-a has **no** README: `git ls-tree -r HEAD --name-only playwright/suites/lane-a` returns the three specs
  and nothing else, and the folder holds no README.
- `suites/api/sweep.spec.ts:74-120` — `DOCUMENTED_SERVER_BLOCKERS`, **9** hand-kept entries: 2×503 `app`
  (`POST /api/ai/transcribe`, `POST /api/ai/voice-fill`), 1×502 `mock gap` (`POST /api/invite/accept`), 6×500
  `app` (`POST /api/auth/login`, `/api/auth/register`, `/api/auth/signin-email-confirm`,
  `/api/auth/verify/code`, `/api/image-assets/upload/[folder]`, `DELETE /api/timer/timesheet/bulk-delete`).
- `suites/api/empty-body-blockers.generated.ts` — **66 pinned blockers: 64 at status 500, 2 at 503**
  (`grep -n "status: " | sort | uniq -c`), generated by
  `scripts/collect-empty-body-blockers.mjs` from a run's observed statuses, asserted exactly by
  `suites/api/empty-body.spec.ts`.
- `suites/api/page-gate.spec.ts:56-66` — 9 protected app paths probed (loop at `:68-71`); `:74-78` — 4 locales
  (`fr, de, ar, zh`), each only `/settings/personal`; `:81-91` — the 5 auth pages answered 200; `:99-107` — `/team/*` exemption pinned as
  "documented, not approved". `core/constants/config/constants.tsx:116-133` — **16** protected patterns:
  root, profile, settings, task, meet, board, views, work-diary, my-week, goals, inbox, favorites, chat, docs,
  about, workspace. Unprobed families: **goals, inbox, favorites, chat, docs, about, workspace** (7).
- `suites/api/foreign-origin.spec.ts:81-96` — the `Sec-Fetch-Site` describe covers
  `FORM_ROUTES = ['/api/daily-plan', '/api/comment', '/api/employee-appointment']` (`:83`) × {cross-site,
  same-site} — 3 of the 286 manifest entries carry a `same-site` case.
- `suites/lane-c/session-guard.spec.ts:206` — `expect(APP_ORIGIN, '…').toBe('http://localhost:3033')`;
  `:125-135` — "a cross-site GET of the session's own data is answered, not refused", pinned on
  `/api/auth/sessions` only.

## M. Commands that re-derive every number above

Read-only; none of them starts a server, and `--check` writes nothing.

```bash
cd /e/Coding/ever-teams

# A, B — handlers, verbs, guard families
# §E.1 — the corrected unguarded-write subtraction (per handler, with alias resolution):
node C:/Users/Evereq/AppData/Local/Temp/everteams-audit/scan-corrected.cjs
   # 415 files / 325 write entries / 287 own-guarded / 3 via alias / 35 unguarded in 32 files at 65e928e3e

find apps/web/app/api -name route.ts | wc -l                                    # 415
grep -rlo "authenticatedGuard(" apps/web/app/api --include=route.ts | wc -l    # 138
grep -rl "refuseForeignOrigin(" apps/web/app/api --include=route.ts | wc -l    # 111
grep -rl "refuseForeignWrite(" apps/web/app/api --include=route.ts | wc -l     # 0
grep -rn "refuseForeignWrite(" apps/web/core | head                            # 2 helpers + its unit test

# C — manifest split and the write-verb arithmetic
node -e "const s=require('fs').readFileSync('apps/web/playwright/suites/api/foreign-origin.generated.ts','utf8');
const m=[...s.matchAll(/\{\s*path: '([^']+)',\s*verb: '([A-Z]+)',\s*guard: '([^']+)',\s*file: '([^']+)'\s*\}/g)];
const g={};for(const x of m)g[x[3]]=(g[x[3]]||0)+1;console.log(m.length,new Set(m.map(x=>x[1])).size,JSON.stringify(g));"
# → 286 245 {"route":134,"proxy-helper":152}

# F — is the manifest still what the source produces? (writes nothing)
node apps/web/playwright/scripts/collect-foreign-origin-routes.mjs --check
node apps/web/playwright/scripts/collect-api-routes.mjs --check

# G — the authenticatedGuard residual (path-without-params vs every spec file)
grep -rl "authenticatedGuard(" apps/web/app/api --include=route.ts | while read f; do
  p=$(dirname "$f" | sed 's|apps/web/app/api|/api|'); n=${p//\[[!]*\]/};
  grep -rq "$n" apps/web/playwright/suites --include=*.spec.ts || echo "$p"; done | wc -l

# H — permission residual: compare the endpoints named in the spec against the guarded handlers
grep -n "path: " apps/web/playwright/suites/lane-c/permission-guard.spec.ts

# I, J — mock facts
grep -n "\[HTTP_STATUS\]: [0-9]\{3\}" apps/web/cypress/support/mock-gauzy-server.mjs
grep -n "return NOT_FOUND\|return UNAUTHORIZED" apps/web/cypress/support/mock-gauzy-server.mjs
sed -n '792,794p;532p;542,553p;911p;1038,1058p' apps/web/cypress/support/mock-gauzy-server.mjs

# K — what a run actually did
node -e "const j=JSON.parse(require('fs').readFileSync('apps/web/playwright/artifacts/playwright-api.json','utf8'));
console.log(j.stats);"
```

The exact scripts (with the handler-body splitting that section D and F depend on) are in
`C:\Users\Evereq\AppData\Local\Temp\everteams-audit\reads-and-late.cjs` and `subtract2.cjs`.
