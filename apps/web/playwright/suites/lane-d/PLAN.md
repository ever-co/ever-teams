# lane-d — the protected-page gate, from the tree

Branch `test/playwright-e2e-suite`, lane `lane-d` (app 3034, mock 4006, statistics sink 4007, control 4008, fake
issuer 4009 — `LANE_PORTS` in `test-servers.ts:37-42`).

Status of this file: **written from the tree, not from a run.** Every path below is a path `find` printed on
2026-11-21 (commands beside each table). No lane-d run has happened yet — see "Machine state" at the bottom.

## 1. What the gate is, read from the code that answers it

| Fact | Where |
| --- | --- |
| The door is a Next middleware (`proxy.ts`), not a page check | `apps/web/proxy.ts:96-112` (`config.matcher`), `:135-146` (`proxy`), `:148-616` (`answerPageRequest`) |
| 16 protected patterns, each optional-locale-prefixed | `core/constants/config/constants.tsx:114` (`LOCALE_PREFIX`, 13 locales) and `:116-133` (`PROTECTED_APP_URL_PATHS`) |
| `team/…` is exempt before any token is looked at | `proxy.ts:158-165` |
| The anonymous refusal | `proxy.ts:519-522` → `deny_redirect(false)` (`:175-185`) → `NextResponse.redirect(url.origin + (defaultRoute \|\| pathname === DEFAULT_MAIN_PATH ? DEFAULT_APP_PATH : '/unauthorized'))`, clearing the session cookies |
| `DEFAULT_APP_PATH` | `constants.tsx:98-100`: `/auth/password` only when `NEXT_PUBLIC_DEMO=true`, else `/auth/passcode`; the test config leaves demo mode blank |
| `DEFAULT_MAIN_PATH` | `constants.tsx:102` = `/` |
| A signed-in visit to a protected path is checked server-side | `proxy.ts:523-546` (CASE 2: valid local token → `currentAuthenticatedUserRequest`) and `:583-602` (CASE 3: only a refresh token → refresh) |
| That server-side read | `core/services/server/requests/auth.ts:141-158` → `GET /user/me?relations=role&relations=tenant&includeEmployee=true`; `core/services/server/fetch.ts:112` sends it to `GAUZY_API_SERVER_URL`, which `test-servers.ts:108` sets to the lane's mock → the mock logs it as `GET /api/user/me` (`cypress/support/mock-gauzy-server.mjs:1041`) and records the bearer's sha256 (`:1054`) |
| A server-side call is not origin-blocked by the mock | `mock-gauzy-server.mjs:978-982` — the 403 fires only when an `Origin` header is present and untrusted; Node's server fetch sends none |
| The page gate never consults the origin guard | `proxy.ts` imports no `refuseForeignOrigin`/`refuseForeignWrite` (`core/services/server/same-origin-request.ts`); that file's read exemption is at `:44-47` |
| Locales | `apps/web/locales/` holds 13 JSON files; `constants.tsx:567-579` (`APPLICATION_LANGUAGES_CODE`, 13 codes); `constants.tsx:114` (`LOCALE_PREFIX`, 13); `proxy.ts:99` matcher `(en\|ar\|bg\|zh\|nl\|de\|he\|it\|pl\|pt\|ru\|es\|fr)` |

## 2. The 16 protected families, with the page files behind them

Counts I verified, with the commands:

```
$ find "apps/web/app/[locale]" -name page.tsx | wc -l
88
$ find apps/web/app/\[locale\] -name page.tsx | sed 's|app/\[locale\]/||' | awk -F'/' '{for(i=1;i<=NF;i++){if($i !~ /^\(/ && $i !~ /^\[/){print $i; break}}}' | sort | uniq -c | sort -rn
20 settings · 9 auth · 7 reports · 4 team · 4 invoices · 4 chat · 3 meet · 3 docs · 2 workspace · 2 views
2 projects · 2 delete-account · 2 dashboard · 2 clients · 1 (×20 more single-page families, incl. the root page.tsx)
```

`PROTECTED_APP_URL_PATHS` (`constants.tsx:116-133`) has **16** patterns. `suites/api/page-gate.spec.ts` (owned by
the api lane — read-only to me) probes **9** of them (`:56-66`: `/settings/personal`, `/settings/team/members`,
`/profile`, `/work-diary`, `/my-week`, `/views`, `/meet`, `/board`, `/task/<id>`) **plus** the site root at `:46`
— so 9 patterns answered, **7 families unpinned**: `goals`, `inbox`, `favorites`, `chat`, `docs`, `about`,
`workspace`. Its locale half probes 4 of the 13 locales (`:75-78`, `/settings/personal` only). AUDIT finding 11
states the same shape; the numbers above are my own re-read of both files and of `constants.tsx`.

| # | Pattern (constants.tsx:116-133) | Page files on disk (from `find app/[locale] -name page.tsx`) | Pinned by `suites/api/page-gate.spec.ts`? |
| --- | --- | --- | --- |
| 1 | `^/?$` (site root) | `app/[locale]/(main)/page.tsx` | yes (`:46`, expects 307 → `/auth/passcode`) |
| 2 | `/profile` | `app/[locale]/(main)/profile/[memberId]/page.tsx` | yes (`/profile` at `:59`) — but see finding D-3: no page file answers bare `/profile` |
| 3 | `/settings` | 20 files: `settings/page.tsx`, `settings/personal/{page,api-tokens,notifications,preferences,security,working-hours}`, `settings/team/{page,automations,import,integrations,issue-types,labels,members,priorities,sizes,statuses,versions}`, `settings/workspace/{page,embeds}` | yes (`/settings/personal`, `/settings/team/members`) |
| 4 | `/task` | `app/[locale]/(main)/task/[id]/page.tsx` | yes (`/task/<uuid>` at `:65`) |
| 5 | `/meet` | `meet/page.tsx`, `meet/jitsi/page.tsx`, `meet/livekit/page.tsx` | yes (bare `/meet`) |
| 6 | `/board` | `app/[locale]/(main)/board/page.tsx` | yes |
| 7 | `/views` | `views/page.tsx`, `views/[viewId]/page.tsx` | yes (bare `/views`) |
| 8 | `/work-diary` | `app/[locale]/(main)/work-diary/page.tsx` | yes |
| 9 | `/my-week` | `app/[locale]/(main)/my-week/page.tsx` | yes |
| 10 | `/goals` | `app/[locale]/(main)/goals/page.tsx` | **no** |
| 11 | `/inbox` | `app/[locale]/(main)/inbox/page.tsx` | **no** |
| 12 | `/favorites` | `app/[locale]/(main)/favorites/page.tsx` | **no** |
| 13 | `/chat` | `chat/page.tsx`, `chat/[conversationId]/page.tsx`, `chat/threads/page.tsx`, `chat/unreads/page.tsx` | **no** |
| 14 | `/docs` | `docs/page.tsx`, `docs/[pageId]/page.tsx`, `docs/trash/page.tsx` | **no** |
| 15 | `/about` | `app/[locale]/(main)/about/page.tsx` | **no** |
| 16 | `/workspace` | `workspace/new/page.tsx`, `workspace/welcome/page.tsx` | **no** |

43 of the 88 page files sit under one of these 15 first segments (per-family counts above; `grep -E
"/(settings|task|meet|board|views|work-diary|my-week|goals|inbox|favorites|chat|docs|about|workspace|profile)/"`
prints 44 because it also catches `app/[locale]/auth/workspace/page.tsx`, whose first segment is `auth` and which
**no protected pattern matches** — see finding D-4).

## 3. Page families the gate does NOT cover (all found on disk)

`assistant`, `all-teams`, `calendar`, `clients` (+`[id]`), `dashboard/app-url/[teamId]`,
`dashboard/team-dashboard/[teamId]`, `delete-account` (+`/confirm`), `integration/github`, `invoices`
(`page`, `new`, `[id]`, `[id]/edit`), `kanban`, `permissions`, `projects` (+`[id]`), `reports/*` (7:
`actual-and-expected-hours`, `manual-time-edits`, `payments-due`, `project-budget`, `time-and-activity`,
`timesheet/[memberId]`, `weekly-limit`), `team/*` (4: `(teams)/team/[teamId]/[profileLink]`,
`(teams)/team/tasks`, `(teams)/team/tasks/trash`, `(focus)/team/join` — `tasks` and `tasks/trash` reach their 200
through the `team/` exemption `proxy.ts:160-165`; **`/team/join` does not**, because that early return refuses itself
for any path carrying a `join` segment (`!paths.includes('join')`, `proxy.ts:161`) and goes on through the whole door
— it is public anyway for the simpler reason that no pattern in `PROTECTED_APP_URL_PATHS` names `team`. An earlier
draft of this file blamed the exemption; the correction is in the spec's own comment), `verify-email`, `embed/authorize`, `maintenance`, `unauthorized`, `auth/*` (9),
`shared-invoice`, `shared-report`.

`/kanban` is in the middleware matcher (`proxy.ts:107`) but in no protected pattern — matched, then let through.

## 4. Findings this lane pins (tree-derived first, run-confirmed second)

- **D-1 — 7 protected families have no gate test at all** (table above). `page-gate-lane.spec.ts` pins all 16.
- **D-2 — 9 of 13 locales have no gate test.** `page-gate-lane.spec.ts` probes all 13 on one protected path, and
  the 7 unpinned families under a 5th non-English locale (`pt`) besides `fr/de/ar/zh`.
- **D-3 — the gate matches `/profile`, which no page owns.** Only `profile/[memberId]/page.tsx` exists, so bare
  `/profile` is refused *as a protected path* before Next could 404 it. Pinned, not approved.
- **D-4 — `/auth/workspace` is public while `/workspace/new` is gated, and a session is bounced off it to a
  locale-less root.** `auth/workspace/page.tsx` exists; no pattern matches `/auth/…`, so an anonymous visitor gets
  the document. What the first draft missed is the other half: `sendsSignedInVisitToApp`
  (`core/lib/auth/signed-in-auth-paths.ts:9-15`) returns true for **every** `/auth/…` path except password recovery,
  so a visitor holding a token is redirected at `proxy.ts:455-469` — from the local expiry check alone (`:462`), with
  no API call — and `new URL(DEFAULT_MAIN_PATH, request.url)` (`:469`) drops the locale prefix the visitor asked for:
  `/pt/auth/workspace` and `/ar/auth/workspace` point at `http://localhost:3034/`. Same shape as D-5's `Location`, one
  branch over. Pinned as a new case in `page-gate-lane.spec.ts` (the mock log is the witness that nothing was asked).
  A name collision plus a locale loss, worth somebody's decision.
- **D-5 — `deny_redirect` compares the *raw* pathname to `DEFAULT_MAIN_PATH`** (`proxy.ts:176`, `url.pathname`
  before `withoutLocalePrefix` at `:142` is used): `/` → `/auth/passcode`, but `/fr/` (or `/ar/`) → `/unauthorized`
  — the locale-prefixed root is refused to a different page than the root, and the `Location` (`url.origin +
  '/unauthorized'`, `:178`) **drops the locale prefix entirely**. Pinned in the locale group.
- **D-6 — the page shell never carries a `dir`, even though this app does have RTL-aware code.** The part that is
  true, re-checked against the source: `<html>` is rendered in three places only — `app/[locale]/layout-component.tsx:107-113`,
  `app/not-found.tsx:18` (`lang="en"`) and `app/global-error.tsx:22` — and none of them sets `dir`, so `ar` and `he`
  (the two RTL locales among the 13) get a document whose direction is the default LTR.
  **The wording this finding first had here was wrong, and by how much matters:** "no RTL at all, `grep -rniE "rtl"
  app core styles` finds nothing" is false twice over — that grep's hits are substring noise (`TimerStartLogType`,
  `SharedReportLayout`), and real RTL code exists: `core/components/pages/chat/message-item.tsx:82`
  (`const RTL_LANGUAGES = new Set(['ar', 'he'])`) sets `dir` on the message body at `:118`, several chat components use
  Tailwind's `rtl:` utilities (`chat-page.tsx:254`, `chat-task-card.tsx:164` and `:265`, `chat-views.tsx:37`), and
  `limit-heatmap.tsx:949` reads `getComputedStyle(grid).direction === 'rtl'`. So the open question is narrower and
  testable rather than a headline: Tailwind's `rtl:` variants apply only under an ancestor with `dir="rtl"`, and nothing
  sets one above the chat message body — which suggests the chat's own back arrow and spacing rules never flip in
  `ar`/`he`. **That is a browser question and has not been measured.** What this lane pins is only the verified half:
  `getAttribute('dir')` on `<html>` is `null` (deliberately not `toHaveAttribute`, which fails on an absent attribute),
  plus one `ar` render.
- **D-7 — a signed-out visitor is served a document for 40+ page families** (section 3) and every route is
  client-only (`layout-component.tsx:40-42` `ClientOnly`, `ssr: false`), so the served HTML carries **no login
  form and no page content**; only the browser run can say what such a visitor actually sees. The lane's browser
  file pins that, and the mock log there shows whether an anonymous page drove the API without a token (the mock
  is authentication-blind — AUDIT finding 13 — so a `200` from it is not a real API's answer).
- **D-8 — no read at the door is origin-guarded** (AUDIT finding 5). `proxy.ts` never calls `refuseForeignOrigin`,
  so `Sec-Fetch-Site` cannot change a page answer; `same-origin-request.ts:43-46` exempts GET/HEAD by design (`:44`),
  and `refuseForeignOrigin` (`:16-34`) refuses `cross-site` **and** `same-site` at `:18` — worth knowing because this
  lane's matrix sends both of those to a page. The Sec-Fetch group pins status/`Location` equality across
  `same-origin`, `same-site`, `cross-site` and no header, and proves from the mock log that **no write** reached it in
  any variant.
- **D-9 — `/team/join` is public, but not through the door's `team/` exemption** (a correction of this file's own
  first draft). `proxy.ts:160-165` returns the i18n response untouched for `paths[0] === 'team'` (or `paths[1]` under
  a locale) **only when no segment of the path is `join`** — `!paths.includes('join')` at `:161` — so the join page
  (`app/[locale]/(focus)/team/join/page.tsx`) runs the full door. It still answers 200 to an anonymous visitor, for
  the simpler reason that `PROTECTED_APP_URL_PATHS` names no `team` pattern at all and SECTION 3 (`proxy.ts:603-615`)
  lets public paths through. The status is the same as `/team/tasks`' and the reason is not: one is exempted before
  any token is read, the other is simply unlisted. A gate added to the constants list would move the join page and
  leave the exemption untouched, which is exactly the difference a spec comment has to keep straight.

## 5. Files and shape

- `page-gate-lane.spec.ts` — browser-free (`api-fixtures`), because a `request` fetch is far cheaper on this PC
  than a page, and the gate decision is a server-side answer: status + `Location` + the mock's request log.
  Groups: every protected family anonymous; every protected family signed in (the mirror AUDIT 11 says the api
  suite cannot see); all 13 locales; the 7 unpinned families under `pt`; the unprotected families (with the D-9
  `/team/join` case and the D-4 `/auth/workspace` session bounce); the Sec-Fetch-Site matrix. 81 tests.
- `page-gate-browser.spec.ts` — only what needs a browser: where a signed-out visitor actually lands and what is
  rendered (the sign-in link `core/components/pages/unauthorized/index.tsx:21` → `<Link href={DEFAULT_APP_PATH}>`),
  the `ar` render and its `dir`, and one signed-in family proving the door did not bounce a present session.

Session shape: the signed-in cases mint their own `auth-token` (a distinct `jti`) instead of reusing the helper's,
so no case inherits another's answer — `session-check-memo.ts` reuses one check per token for 5 s and `mockReset()`
does not clear it (`suites/lane-c/session-check.spec.ts` header).

## 6. Deliberately left out

- Sign-in POSTs at route level (AUDIT finding 12) — lane-b's territory.
- `Sec-Fetch-Site` on the **API** manifest (AUDIT findings 5/6) — lane-c/api own 286 route entries; I keep the
  page half only.
- Any real sign-in flow (passcode/password) — `suites/lane-b/` owns those files.
- A signed-in **browser** visit per family (16 shell renders): expensive on this PC and the shell's readiness
  depends on `criticalReady` (`core/components/layouts/app/init-state.tsx:251-258`), which is a different question
  from the gate. One mirror case is taken; the rest are fetch-only.
- Live/demo sessions, and anything touching `api.ever.team` / `app.ever.team` / `api.gauzy.co` / `app.gauzy.co`.

## 7. Read-only verification pass, 2026-11-21 — still no run

The runner assigned to this lane got through the cheap half and was gated on the expensive one. Everything below is
output it read; nothing here is a run summary.

```
$ powershell -NoProfile -ExecutionPolicy Bypass -File /e/Coding/.tmp/top-procs.ps1 | head -2
Free KB: 4493524   (start)  →  3679148  →  3011828  →  2849048   (Total KB: 33473768; strata 11.1–11.5 GB held)
$ node apps/web/playwright/scripts/lane-servers.mjs check lane-d
lane lane-d: MISWIRED — no runtime env on http://localhost:3034 — that lane's app is not answering (start it with `up lane-d`)
$ find "apps/web/app/[locale]" -name page.tsx | wc -l
88
$ ls apps/web/locales/*.json | wc -l
13
$ node ../../node_modules/typescript/lib/tsc.js -p playwright/tsconfig.json --noEmit      # 36 error lines, exit 2
36 lines, all in playwright/suites/api/forwarded-host.spec.ts  ·  0 in suites/lane-d/
```

**Gate:** this lane starts servers only at ≥ 5 GB free. Free memory fell from 4.49 GB to 2.85 GB across the first
checks while lanes b and c ran browsers (3032 and 3033 both listening), so no `up lane-d` was issued in that window.
After the coordinator took lane-b down (`down lane-b`, PIDs 39880 + 30160, only its own 3032/3996-3999) free RAM
returned to 4.43–4.60 GB and the run was authorised below the bar, with the number at the moment of `up lane-d`
stamped in the run's log.

Two things this file first got wrong about the machine, both corrected by measurement elsewhere on it:
- `--list` needs no lane server. `playwright.lane.config.ts`'s `webServer` does not fire for a `--list`; what a
  `--list` does change is `playwright/artifacts/playwright-lane-d.json`, which becomes an all-skipped report. That
  json is not committed and is not where this lane's verdict lives — the run logs are.
- `E2E_REUSE_SERVERS=1` is an `api`-config thing (`test-servers.ts:103`), not a lane thing: the lane config reuses
  its own servers unconditionally. A lane run does not set it.

**What the source pass settled:**

| Finding | Source verdict |
| --- | --- |
| D-1 | **confirmed as written.** `suites/api/page-gate.spec.ts` probes 9 protected paths (`:56-66`) plus the root (`:46`); the 16 patterns are `constants.tsx:117-132`; the 7 unpinned families are exactly `goals, inbox, favorites, chat, docs, about, workspace`. All 7 have a page file on disk. |
| D-2 | **confirmed as written.** `suites/api/page-gate.spec.ts:75` probes `fr, de, ar, zh` on `/settings/personal` only → 9 of the 13 locales unpinned. `LOCALE_PREFIX` (`:114`), `APPLICATION_LANGUAGES_CODE` (`:567-579`), the matcher (`proxy.ts:99`) and `locales/*.json` all hold the same 13 codes. |
| D-3 | **confirmed as written.** `find app/[locale] -path "*profile*" -name page.tsx` → only `(main)/profile/[memberId]/page.tsx` (plus the unrelated `(teams)/team/[teamId]/[profileLink]`). |
| D-4 | **confirmed, and widened** — see the rewritten bullet: the signed-in half of `/auth/workspace` bounces to a locale-less root (`proxy.ts:455-469`). |
| D-5 | **confirmed in the source.** `proxy.ts:176` compares `url.pathname` (raw, before `withoutLocalePrefix`) with `DEFAULT_MAIN_PATH` (`constants.tsx:102` = `/`), and `:178` builds `url.origin + '/unauthorized'`. So `/` → `/auth/passcode` and `/fr/`, `/ar/` → `/unauthorized` with no locale carried. |
| D-6 | **the corrected wording holds.** `grep -rn "<html" app/` prints exactly three renders — `app/[locale]/layout-component.tsx:107`, `app/not-found.tsx:18`, `app/global-error.tsx:22` — and `grep -n "dir=" ` over those three files prints nothing. The chat's own `dir` (`core/components/pages/chat/message-item.tsx`) is untouched by that check; the browser half is still unmeasured. |
| D-7 | **confirmed as a source statement only.** `ClientOnly` is at `layout-component.tsx:40-42` (`ssr: false` at `:41`), wrapping the route at `:146-150`. What a signed-out visitor is shown is a browser question and was not answered. |
| D-8 | **confirmed as written.** `proxy.ts` imports neither guard (its import block is `:1-28`; `refuseForeignOrigin`/`refuseForeignWrite` appear nowhere in the file). |

**What the source pass contradicted** (both fixed in the specs, with the source quoted beside them):

- `/team/join` — see §3: the `team/` exemption explicitly excludes any `join` segment (`proxy.ts:161`), so the join
  page is public because no protected pattern names `team`, not because it was exempted. Same 200 expected, different
  mechanism, and the mechanism is what a future change would move.
- Line-number drift corrected while reading: `DEFAULT_MAIN_PATH` `constants.tsx:104 → 102`;
  `APPLICATION_LANGUAGES_CODE` `:567-580 → 567-579`; `ClientOnly` `layout-component.tsx:41-43 → 40-42`;
  `refuseForeignWrite` GET/HEAD exemption `same-origin-request.ts:44-47 → 43-46` (and `refuseForeignOrigin` is
  `:16-34`, refusing `cross-site` **and** `same-site` at `:18`).

**Totals after this pass:** 81 tests in `page-gate-lane.spec.ts` (80 + the new `/auth/workspace` session case) and 7
in `page-gate-browser.spec.ts` — 88 total. `E:\Coding\.tmp\lane-d-list.log`'s `Total: 87 tests in 2 files` is the
pre-correction count; a fresh `--list` is owed too, for the same reason as the run.

**Still owed by a run:** the `/ar` chat-render half of D-6 (does the chat's own `dir` flip without a `dir="rtl"`
ancestor) and the raised-budget version of the `/invoices` case — see §8.

## 8. The first run, 2026-11-21→22 — every number below is from a log this lane wrote

Free RAM at the instant `up lane-d` ran: **5 744 708 KB of 33 473 768** (stamped in the `up` task's own first lines,
above the 5 GB bar); `up` printed `port 4008 answers` and `port 3034 answers`, and `check lane-d` went
`OK — the app on 3034 names its own mock 4006 and stats sink 4007`. By the end of the browser half free RAM had
fallen to **1 748 376 KB**, and that is what stopped the lane, not the specs.

Logs, all in `E:\Coding\.tmp\`: `lane-d-run0.log`, `lane-d-run1.log`, `lane-d-run2.log`, `lane-d-browser1.log`,
`lane-d-browser2.log`, `lane-d-browser3.log`, `lane-d-browser4.log`, `lane-d-browser5.log`, `lane-d-root-probe.log`,
`lane-d-tsc.log`, `lane-d-tsc2.log`. The lane's json report
(`playwright/artifacts/playwright-lane-d.json`) is not evidence — it is whatever run wrote last.

| run | what it selected | the log's own summary |
| --- | --- | --- |
| `lane-d-run0.log` | `--grep "the site root goes to the default sign-in page"` (1) | `1 passed (1.7s)` |
| `lane-d-run1.log` | `page-gate-lane` (81, cold) | `4 failed` + `77 passed (10.7m)` |
| `lane-d-run2.log` | `--grep` alternation over the four corrected cases (22, warm) | `22 passed (24.1s)` |
| `lane-d-browser1.log` | `page-gate-browser` (7, cold) | `1 failed` + `6 passed (3.8m)` |
| `lane-d-browser2.log` | `--grep "an ungated family leaves a signed-out browser"` (1) | `1 failed` — test line `17.6 s`, heading missing inside the 15 s `expect` default |
| `lane-d-browser3.log` | the same case with a 60 s window | `1 failed` — test line `1.1m`, json `duration: 248997 ms`; the failure snapshot at 66 s already shows the shell |
| `lane-d-browser4.log` | `page-gate-browser` while `browser5` was also running | `1 failed / 6 passed (2.6m)` — **not trustworthy**: two Playwright processes shared `artifacts/test-results-lane-d/`, and the failure carries `ENOENT … traces/…recording3.trace` |
| `lane-d-browser5.log` | `page-gate-browser`, alone, real exit code captured | `1 failed / 6 passed (5.6m)`, `playwright exit code: 1` |

**Method note the next runner needs:** `… | tee file` reports *tee's* exit status, so a killed or failing Playwright
still looks like `exit 0`. `browser5` redirected instead and printed `playwright exit code: 1`. Judge a run by its
summary line, never by the shell's status. And never run two lane runs at once: they share one mock request log and
one `outputDir`, and the `/invoices` case reads that log.

### What the run confirmed

| Finding | Measured answer |
| --- | --- |
| D-1 | all 16 protected families answered `307 → http://localhost:3034/unauthorized` except the root (`→ /auth/passcode`), each with an **empty** mock log. The 7 the api lane never probes (`/goals /inbox /favorites /chat /chat/threads /docs /about /workspace/new`) are now pinned from both sides. |
| D-2 | all 13 `/<locale>/settings/personal` → `307 → /unauthorized`; all 10 unpinned families under `/pt` likewise. 24 tests, no exceptions. |
| D-3 | **completed, and it is worse than the source read said.** Anonymous `/profile` → `307 → /unauthorized`; `/profile` **with a session → 404, no `Location`**, body `<!DOCTYPE html><html lang="en" data-scroll-behavior="smooth" …>` — the door counts it protected, lets the session through, and Next has no page for it. `/profile/placeholder-member` → `200`. Still pinned with the door's `/api/user/me` read required, and it passed: the door reads the API *before* routing, even for a path that 404s. |
| D-4 | confirmed and split into **D-4b**. With a session: `/auth/workspace → 307 → http://localhost:3034/` (locale dropped, mock log empty — decided from the local token check); `/pt/auth/workspace` and `/ar/auth/workspace` → **`200`, no `Location`** — because `proxy.ts:443` feeds `sendsSignedInVisitToApp` the RAW pathname, so a locale-prefixed sign-in page is not recognised and its session stays on the page. |
| D-5 | **confirmed for the bare prefixed root, corrected for the trailing slash (new D-5b).** `/` → `307 /auth/passcode`; `/en`, `/fr`, `/ar` → `307 /unauthorized`; `/en/`, `/fr/`, `/ar/` → **`308` → `/en`, `/fr`, `/ar`** — Next's own trailing-slash canonicalisation answers first, so `deny_redirect`'s `url.pathname == DEFAULT_MAIN_PATH` comparison can never see a trailing-slash root. Following the 308 lands on the same `/unauthorized`, one hop later, locale still dropped. Probe: `lane-d-root-probe.log`. |
| D-6 | **the `<html>` half is now measured in a browser:** `/ar/auth/passcode → http://localhost:3034/ar/auth/passcode lang="ar" dir=null`, computed `direction: ltr`; and `/ar/settings/personal → http://localhost:3034/unauthorized`, the same landing as `/settings/personal`. The chat's own `dir` behaviour is still unmeasured. |
| D-7 | **answered by two failure snapshots, and the reads never happen.** A signed-out visitor to `/invoices` stays at `http://localhost:3034/invoices`, is shown the app shell with `Current workspace: No workspace`, the full sidebar, `heading level=1: Invoices` and `main → status → "Loading"` — no form, no sign-in link, no data — and the lane's mock log holds **nothing**, checked over 10 s (run 1) and again over 40 × 500 ms after `networkidle` (runs 4/5, which got as far as the log before the mount assertion). So the page does not send token-less reads; it never asks at all. |
| D-8 | confirmed: anonymous `/settings/personal` and `/chat` answered `307 → /unauthorized` identically under no `Sec-Fetch-Site`, `same-origin`, `same-site` and `cross-site`; signed-in, all four variants `200`. |
| new (in the POST case) | `POST /settings/personal` with a session → **200** for all four variants, mock log = exactly **4 × `GET /api/user/me` 200** carrying this case's token, **no write**. The door's session read is gated on path + token (`proxy.ts:523-546`), never on the method; the no-write invariant survives, the "mock untouched" claim did not. |
| D-9 | `/team/join → 200 (no Location)`, `/team/tasks → 200`, `/ar/team/join → 200` — same status, different route through the file, as §3 now says. |

### What is still open, and what it will take

- The `/invoices` case as it now stands (`test.setTimeout(420_000)`, heading window `300_000`, the `Loading`
  assertion, the empty-log assertion) **has not been run**: the mount needed >120 s in `browser4`/`browser5` while free
  RAM fell from 4.1 GB to 1.75 GB, and starting another Chrome under that pressure is the failure mode this PC does
  not survive. The case is left red-by-environment, not red-by-app: `browser1` (12.9 s) and `browser3` (≤66 s) prove
  the shell does mount on a less loaded machine, and both snapshots are the D-7 evidence above.
- `lane-d`'s servers were brought **down** at the end of this pass to hand the ~1.4 GB back; the warm Turbopack build
  directory is kept, but the next `up lane-d` still re-reads it from disk.
- D-6's remaining half (does the chat flip without a `dir="rtl"` ancestor) needs a signed-in browser on `/ar/chat`.
