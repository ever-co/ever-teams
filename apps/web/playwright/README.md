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

Every run wants port 3030 (and the mock suites 3988–3991), so run them one at a time.

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
