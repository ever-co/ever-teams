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
| `DEFAULT_MAIN_PATH` | `constants.tsx:104` = `/` |
| A signed-in visit to a protected path is checked server-side | `proxy.ts:523-546` (CASE 2: valid local token → `currentAuthenticatedUserRequest`) and `:583-602` (CASE 3: only a refresh token → refresh) |
| That server-side read | `core/services/server/requests/auth.ts:141-158` → `GET /user/me?relations=role&relations=tenant&includeEmployee=true`; `core/services/server/fetch.ts:112` sends it to `GAUZY_API_SERVER_URL`, which `test-servers.ts:108` sets to the lane's mock → the mock logs it as `GET /api/user/me` (`cypress/support/mock-gauzy-server.mjs:1041`) and records the bearer's sha256 (`:1054`) |
| A server-side call is not origin-blocked by the mock | `mock-gauzy-server.mjs:978-982` — the 403 fires only when an `Origin` header is present and untrusted; Node's server fetch sends none |
| The page gate never consults the origin guard | `proxy.ts` imports no `refuseForeignOrigin`/`refuseForeignWrite` (`core/services/server/same-origin-request.ts`); that file's read exemption is at `:44-47` |
| Locales | `apps/web/locales/` holds 13 JSON files; `constants.tsx:567-580` (`APPLICATION_LANGUAGES_CODE`, 13 codes); `constants.tsx:114` (`LOCALE_PREFIX`, 13); `proxy.ts:99` matcher `(en\|ar\|bg\|zh\|nl\|de\|he\|it\|pl\|pt\|ru\|es\|fr)` |

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
`(teams)/team/tasks`, `(teams)/team/tasks/trash`, `(focus)/team/join` — the last three are the `team/` exemption
`proxy.ts:158-165`; `/team/join` is *not* exempt: the early return requires the segment `team` **first**, and
`join` is not `team`), `verify-email`, `embed/authorize`, `maintenance`, `unauthorized`, `auth/*` (9),
`shared-invoice`, `shared-report`.

`/kanban` is in the middleware matcher (`proxy.ts:107`) but in no protected pattern — matched, then let through.

## 4. Findings this lane pins (tree-derived first, run-confirmed second)

- **D-1 — 7 protected families have no gate test at all** (table above). `page-gate-lane.spec.ts` pins all 16.
- **D-2 — 9 of 13 locales have no gate test.** `page-gate-lane.spec.ts` probes all 13 on one protected path, and
  the 7 unpinned families under a 5th non-English locale (`pt`) besides `fr/de/ar/zh`.
- **D-3 — the gate matches `/profile`, which no page owns.** Only `profile/[memberId]/page.tsx` exists, so bare
  `/profile` is refused *as a protected path* before Next could 404 it. Pinned, not approved.
- **D-4 — `/auth/workspace` is public while `/workspace/new` is gated.** `auth/workspace/page.tsx` exists; no
  pattern matches `/auth/…`. A name collision, worth somebody's decision.
- **D-5 — `deny_redirect` compares the *raw* pathname to `DEFAULT_MAIN_PATH`** (`proxy.ts:176`, `url.pathname`
  before `withoutLocalePrefix` at `:142` is used): `/` → `/auth/passcode`, but `/fr/` (or `/ar/`) → `/unauthorized`
  — the locale-prefixed root is refused to a different page than the root, and the `Location` (`url.origin +
  '/unauthorized'`, `:178`) **drops the locale prefix entirely**. Pinned in the locale group.
- **D-6 — no RTL support in the page shell.** `app/[locale]/layout-component.tsx:107-113` renders `<html lang={
  locale} className data-scroll-behavior suppressHydrationWarning {…runtimeEnvHtmlProps}>` — no `dir` — and
  `grep -rn "<html" app core` prints only that one plus `app/not-found.tsx:18` (`lang="en"`) and
  `app/global-error.tsx:22`; `grep -rniE "rtl" app core styles` finds nothing. So `ar` and `he` (the two RTL
  locales among the 13) are served LTR. Pinned as a finding in the browser file.
- **D-7 — a signed-out visitor is served a document for 40+ page families** (section 3) and every route is
  client-only (`layout-component.tsx:41-43` `ClientOnly`, `ssr: false`), so the served HTML carries **no login
  form and no page content**; only the browser run can say what such a visitor actually sees. The lane's browser
  file pins that, and the mock log there shows whether an anonymous page drove the API without a token (the mock
  is authentication-blind — AUDIT finding 13 — so a `200` from it is not a real API's answer).
- **D-8 — no read at the door is origin-guarded** (AUDIT finding 5). `proxy.ts` never calls `refuseForeignOrigin`,
  so `Sec-Fetch-Site` cannot change a page answer; `same-origin-request.ts:44-47` exempts GET/HEAD by design. The
  Sec-Fetch group pins status/`Location` equality across `same-origin`, `same-site`, `cross-site` and no header, and
  proves from the mock log that **no write** reached it in any variant.

## 5. Files and shape

- `page-gate-lane.spec.ts` — browser-free (`api-fixtures`), because a `request` fetch is far cheaper on this PC
  than a page, and the gate decision is a server-side answer: status + `Location` + the mock's request log.
  Groups: every protected family anonymous; every protected family signed in (the mirror AUDIT 11 says the api
  suite cannot see); all 13 locales; the 7 unpinned families under `pt`; the unprotected families; the
  Sec-Fetch-Site matrix.
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

## 7. Machine state when this plan was written (no run yet)

```
$ powershell -NoProfile -ExecutionPolicy Bypass -File /e/Coding/.tmp/top-procs.ps1 | head -6
Free KB: 3503240 / Total KB: 33473768        (3.34 GB free; strata 9784 MB, node 1493 MB)
$ node apps/web/playwright/scripts/lane-servers.mjs check lane-d
lane lane-d: MISWIRED — no runtime env on http://localhost:3034 — that lane's app is not answering (start it with `up lane-d`)
```

3.34 GB free is under this effort's 3.5 GB bar for starting a run, and lane-d's app is not up, so a run would mean
a cold `next dev` compile (README: 5.5 min cold for a 4-test run) while three other lanes compete. Both spec files
were therefore type-checked and discovered, **not run**: the run summary lines for them are still owed, and every
"pinned" value inside them is derived from the files named above rather than measured.
