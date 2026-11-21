# The Playwright suites

Four runs, one app, and one rule: **a test states what the app did to the server, not only what it
painted.** Where the mock can witness a write (`workspaceCreation`, `mutationProof`, the stored
notification row, the appointments list, the statistics sink) the assertion reads that witness. Where
it cannot, the assertion names the request the browser made, and says so in its message.

| Run                 | Command (from the repository root)                  | What it drives                                                                                                                             |
| ------------------- | --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Mock browser suite  | `yarn workspace @ever-teams/web pw`                 | the app against the synthetic Gauzy API (deterministic, no network)                                                                        |
| Server-route suites | `yarn workspace @ever-teams/web pw:api`             | every Next.js route handler under `apps/web/app/api`, no browser                                                                           |
| Ever ID suite       | `yarn workspace @ever-teams/web pw:ever-id`         | the Ever ID sign-in routes against a fake OpenID Connect issuer on the loopback                                                            |
| Live suite          | `E2E_LIVE=1 yarn workspace @ever-teams/web pw:live` | the app against the demo API (`apidev.ever.team`); opt-in, because it asks the shared demo API to send a sign-in code and a password reset |

Install the browser once with `yarn workspace @ever-teams/web playwright install chromium`
(`E2E_BROWSER_CHANNEL=chrome` uses an installed Google Chrome instead).

Every run wants port 3030 (and the mock suites 3988–3991), so run them one at a time — or run beside them as
a [lane](#a-lane-a-run-beside-the-four-above), which is what an agent writing new tests should use.

After adding, removing or changing a route handler under `apps/web/app/api`, regenerate the manifests the
server-route suites run over — `suites/api/manifests.spec.ts` fails until you do:

```bash
node apps/web/playwright/scripts/collect-api-routes.mjs
node apps/web/playwright/scripts/collect-foreign-origin-routes.mjs
```

Let the config start its own servers. A run refuses to start while something else holds its ports: a dev
server hand-started in another terminal has whatever env that one happened to have (`apps/web/.env` points at
the real API), which is how a run can look healthy while it is testing the wrong server. `E2E_REUSE_SERVERS=1`
reuses servers you started yourself with `test-servers.ts`'s environment.

## A lane: a run beside the four above

When suites are being *written* — one agent on time tracking, one on sign-in, one on route handlers — they
cannot queue for 3030. Two runs sharing one mock also invalidate each other's central proof: "this refusal
never asked the API anything" is only worth something when the request log is yours. A lane is a run with its
own app process, mock, statistics sink, control API, fake issuer, build directory, artifacts folder and report.

```bash
export E2E_LANE=lane-a                     # lane-a 3031/3992–3995 · lane-b 3032/3996–3999 · lane-c 3033/4002–4005
export E2E_BROWSER_CHANNEL=chrome
npx playwright test --config apps/web/playwright/playwright.lane.config.ts --grep "<your describe block>"
```

`E2E_LANE` is the whole switch, and it has to be an environment variable rather than an argument:
`helpers.ts`, `fixtures.ts` and the config all import `APP_ORIGIN` / `MOCK_ORIGIN` / `CONTROL_ORIGIN` from
`test-servers.ts`, each in its own process (Playwright forks a worker per file), and the only thing that reaches
all of them is the environment the run started with. A spec never names a port. `laneServers()` throws when the
variable is missing or unknown, instead of quietly falling back to 3030. `E2E_EVER_ID=1` mounts the Ever ID
routes in that lane's app; off by default, because `suites/api/ever-id-off.spec.ts` pins them as absent.

Two facts about this repository shaped it, both measured rather than assumed:

- `yarn turbo dev --filter=@ever-teams/web` is `yarn node env.js && yarn next dev -p 3030`
  (`apps/web/package.json`): the port is hardcoded in the script, so a lane asking for 3031 got
  `EADDRINUSE :::3030`. A lane therefore calls `node ../../node_modules/next/dist/bin/next dev -p <port>` from
  `apps/web`. Not `node_modules/.bin/next` either — Playwright starts a `webServer` command through the platform
  shell, and on Windows that POSIX script answers "'node_modules' is not recognized". `env.js` is dotenv plus
  console lines; Next loads `.env.local`/`.env` itself and never overrides a variable the process already has.
- Next 16 allows **one dev server per project directory**: its lock is
  `<distDir>/dev/logs/next-development.log`, and a second `next dev` in `apps/web` exits with "Another next dev
  server is already running" and points at the first. Each lane gets `.next-lane-<port>` through
  `PLAYWRIGHT_LANE_DIST_DIR` (`next.config.js` → `distDir`, git-ignored). Unset, `yarn dev` keeps Next's own
  `.next`. A lane pays a cold compile cache for the freedom.

`suites/lane-a/smoke.spec.ts` is the plumbing proof — the shell loads, the lane's own mock logged the browser's
call (which is also the proof the mock accepted the lane's origin: `mock-gauzy-server.mjs` trusts only the origins
its launcher named, via `E2E_TRUSTED_APP_ORIGINS`), the control API answers, an app route answers the lane's
baseURL. Run it before building anything on a lane.

Keep a lane's servers warm between runs, or the night is spent compiling: Playwright stops a config's
`webServer` after every run, and a cold Turbopack compile of this app is minutes (measured: 5.5 minutes for a
4-test run, 1.6 minutes once the build directory was warm). Start them once with
`node apps/web/playwright/scripts/lane-servers.mjs up <lane>` — it imports `laneServers` from `test-servers.ts`,
so the ports and environment a lane starts by hand are the same source Playwright uses — and stop them with
`... down <lane>` when the lane is done. `reuseExistingServer: true` is on in the lane config for exactly this,
and it is safe only because a lane owns its ports exclusively.

## The pieces

- **`test-servers.ts`** — the only place that decides which API origin the app under test may use. It
  overrides `apps/web/.env` (which carries the production API URL and third-party keys) and refuses to
  configure a run against `api.ever.team` or `api.gauzy.co` at all. If a run must reach something new,
  it is added here or not at all.
- **`backend.mjs`** — the test backend: the mock Gauzy API on `127.0.0.1:3988` (the same
  `cypress/support/mock-gauzy-server.mjs` the Cypress suite uses), the Ever Platform statistics sink on
  `:3989`, and a control API on `:3990` (`/health`, `/fixture`, `/reset`, `/scenario`, `/state`,
  `/requests`, `/stats`). The control API exists because Cypress could call the mock in-process with
  `cy.task` and Playwright workers cannot.
- **`fixtures.ts`** (mock suite) — `shield` (automatic: blocks and records anything leaving the
  machine, collects console and page errors, and fails a test whose browser left the machine), `mock`
  (scenario switches, request log, state, statistics sink; reset before every test), `fixture` (the ids
  and names the mock is actually answering with, served by the backend so a spec cannot assert on stale
  ones), `app` (signed in with the fixture's cookies, shell ready) and `anon` (signed out, no session
  stub).
- **`live-fixtures.ts`** — the same idea with the demo API allowed and a production host refused even if
  `E2E_DEMO_API_URL` were pointed at one.
- **`helpers.ts`** — `hardVisit`, `waitForShellReady` (the app's own `ever-teams:shell-ready`
  performance mark), `signInAndVisit` (routes first, cookies second, navigation last), `mockStateWhen`
  and `mockRequestsWhen` (the mock mutates its own state as the app calls it, so proof arrives a moment
  after the action), `devOverlayErrors`.
- **`api-fixtures.ts`** — the browser-free fixtures the route-handler suites use.

## Rules these suites keep

- **Provenance.** A selector or a piece of copy in a spec is copied from somewhere it already works —
  an `apps/web/cypress/e2e/*.cy.ts` spec on the same mock, or the component that renders it. The spec
  says which, in its header. A selector invented by guessing is a test that fails for the wrong reason.
- **Hermetic, enforced.** The shield aborts every non-local request and fails the test even if every
  `expect()` in the body passed. Server-side egress is avoided the same way: the route sweep's dynamic
  segments are filled with local values (`/api/favicons/127.0.0.1:3030`), so no handler fetches from the
  internet either.
- **A refusal is documented, never skipped.** Where a handler answers 5xx today, the sweep pins the
  exact status (`DOCUMENTED_SERVER_BLOCKERS`, and `suites/api/empty-body-blockers.generated.ts`, which
  `scripts/collect-empty-body-blockers.mjs` regenerates from the last run's JSON report). A pinned
  blocker that stops happening fails the suite, which is the point.
- **One mock, one worker.** `playwright.config.ts` runs with `workers: 1` because the scenario switches
  and the request log belong to whoever wrote last. Raise it only when `backend.mjs` hands each worker
  its own mock instance.

## Known blockers, with the evidence

- **The app origin has to be `http://localhost:3030`, not `http://127.0.0.1:3030`.** Served to the
  `127.0.0.1` origin the dev server answers 200 with the whole document — and the browser then ends on a
  page with no visible content, no console error, no page error and an empty dev overlay, because the page's
  client-only boundaries (every route is client-only behind `ClientOnly` in `app/[locale]/layout-component.tsx`)
  never resolve: their `/_next/hmr` socket is refused `ERR_INVALID_HTTP_RESPONSE`. Proved by polling the same
  URL both ways: over `127.0.0.1`, 120 s and no React mount (`reactFiber` never appears on any element, no
  `/api/` request is ever made); over `localhost`, 23 visible elements and the sign-in copy. Every browser
  case in the suite failed on an empty body until this was changed, and none of it was an app bug.
- **Playwright starts a `webServer` command in the config folder**, not the repository root (its plugin does
  `resolve(configDir, cwd)`), so every command here is repo-root relative and every entry names
  `cwd: '../../..'`. Without that, `node apps/web/playwright/backend.mjs` resolves to a doubled path and the
  test backend dies at startup — a run only looks healthy if a hand-started backend is already listening.
- **`Next` mounts a `nextjs-portal` on every dev page**, error or not. Asserting it is absent fails
  every page. `devOverlayErrors()` looks for the error markup inside its shadow trees and quotes what it
  finds.
- **The live suite covers the signed-out half only.** `scripts/provision-demo-tenant.mjs` registers a
  throwaway account on the demo API (refusing production APIs in code, credentials written to
  `E2E_DEMO_CREDENTIALS_FILE`, by default `~/.ever-teams/`, never to the repository), but both password routes then answer 401: the
  demo API will not sign in an address whose e-mail is not confirmed. A confirmed demo account unlocks
  the signed-in live cases; until then they are covered by the mock suite with synthetic sessions.
- **Statistics timing** needs `EVER_STATS_SEND_INTERVAL_S=5` on the dev server (set in
  `test-servers.ts`); a server started before that change must be restarted or the statistics tests
  wait a production interval for one report.

## Adding a suite

Name it `suites/<name>/*.spec.ts`, make sure the config's `testMatch` covers it, and start from a flow
the Cypress suite already proves — `cypress/e2e/` is the source of selectors, `cypress/support/
mock-gauzy-server.mjs` is the source of what the mock really answers.
