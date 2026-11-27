import type { APIResponse } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { test as apiTest, type ApiCall } from '../../api-fixtures';
import { expect, test as uiTest, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import { RESET_PASSWORD_VALUE, UNDECODABLE_RESET_TOKEN } from './lane-auth-helpers';

/**
 * The development-only local log system: **`POST /api/log`** (`app/api/log/route.ts`) — what it answers, which body it
 * refuses, which file it writes — and what a signed-in browser page actually sends to it. The lanes run `next dev`, so
 * this route is live here; in a production build it answers 501 without looking at the body (`route.ts:7`, `:43`).
 * Pinned on lane-b (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, control `http://127.0.0.1:3998`,
 * `playwright/test-servers.ts` `LANE_PORTS`) on 2026-11-24, in this file's own runs `E:\Coding\.tmp\s2-lane-b-devlog-1.log`
 * through `-4.log` (1 and 2 each failed on one case — the shell wait on a focus route with no shell, then a `settle`
 * that returned before the page had posted anything; 3 and 4 green back to back, 20 tests each). Every status, body,
 * media type, header, file name, file content, entry count and header-key list below
 * was measured first against the live lane with throwaway probes and only then written down:
 *
 * - `probe1.mjs` → `probe1-1.txt` and `probe1b.mjs` → `probe1b-1.txt` (the write and its file; the eight hostile
 *   `customLogFile` names, twice — the first pass looked for `x.txt` and so "found" nothing, because `logToFile`
 *   appends `.log` when the name lacks it; the well-formed entry's exact file content; the malformed bodies; the verbs);
 * - `probe2.mjs` → `probe2-1.txt` (a signed-in `/` and `/settings/personal/security`, the `🚀 Request:` entries with
 *   their `details` shapes, and the reset-password submit);
 * - `probe3.mjs` → `probe3-1.txt` and `probe6.mjs` → `probe6-1.txt` (the same flows in a real Chrome: the Security-page
 *   pairing, the reset submit, the verify-email token body, the `secretAddress` shared-report read, a foreign page's
 *   fetch and form);
 * - `probe4.mjs` → `probe4-1.txt` (a foreign loopback page: five `fetch` variants and two form encodings, with the file
 *   system as the witness of what reached the route);
 * - `probe5.mjs` → `probe5-1.txt` (every API case through the Playwright request context the `api` fixture is, the
 *   answer-vs-write timing, four Security-page rounds, and whether the session bearer really lands in the shared date
 *   file), and `probe8.mjs` → `probe8-1.txt` (the last body cases, and where an accepted non-object body landed);
 * - `probe7.mjs` → `probe7-1.txt` and `probe9.mjs` → `probe9-1.txt` (the browser invariants exactly as this file reads
 *   them — a correct entry-target parser, both pairing directions, the details/header key sets, the bearer compared with
 *   the `auth-token` cookie read from the jar — and the three `customLogFile` shapes `probe8` mis-spread).
 *
 * All probe files live in `E:\Coding\.tmp\probe-devlog\`; nothing of them is in the repo.
 *
 * ## Where the files are, and what this file is allowed to read
 *
 * `LOG_DIR = 'logs'` (`logger-server.ts:15`) is relative to the app's own working directory, and the lane starts the
 * app with `cwd: '..'` (`playwright/test-servers.ts`), so every lane — 3031, 3032, 3033, 3034 — writes into the **one**
 * folder `apps/web/logs/`. That folder also holds the date file every client-side entry of every lane lands in
 * (`logger.service.ts:195`, `:205-216`). So this spec asserts only on files its own test named (`pw-lane-b-<kind>-<random>.log`)
 * and reads each of them within ~4 s of the POST that created it; it never asserts on `2026-11-24.log`, on
 * `error-2026-11-24.log` or on `NaN-NaN-NaN.log`, and it never deletes or edits a log file.
 *
 * ## The findings, stated up front (a row that answers something other than what the code means to carry is tagged
 * *MEASURED, NOT INTENDED*)
 *
 * 1. **A `customLogFile` the writer refuses still gets `201 {"success":true}`, and nothing is written anywhere.**
 *    Measured for eight names (`probe1b-1.txt`, `probe7-1.txt`): `../escape.log`, `..\escape.log`, `/abs.log`,
 *    `a/b.log`, `.hidden.log`, a 200-character name, a 129-character name and `..%2Fescape.log` — each answered 201
 *    with `{"success":true}`, and each leaving no file at any plausible path: no `apps/web/escape.log`, no
 *    `apps/web/abs.log`, no `apps/web/a/b.log`, no `apps/web/a` directory, no `escape.log` or `abs.log` in the repo root
 *    or on the drive root, and no new name in `apps/web/logs` at all. The refusal is intended and works: `LOG_FILE_NAME`
 *    (`logger-server.ts:18`, one path segment ending in `.log`) is tested before anything is written and the throw at
 *    `:31-33` is what stops it, with `basename(filename)` at `:43` as a second belt. What is *not* intended is that the
 *    caller cannot tell: `route.ts:36` calls `logger.logToFile(...)` without awaiting it, `logToFile` returns `void` and
 *    hands the write to `appendToLogFile` (`logger.service.ts:198-202`, `:170-185`), whose own `catch` swallows the
 *    failure into the dev server's console (`console.error('[Logger] Failed to log to file:', error)`, `:179-184`); the
 *    answer at `route.ts:38` is the same `{"success":true}` whatever the writer decided. Pinned on the hostile-name rows
 *    and on the non-string-name rows below. The timing was measured too (`probe5-1.txt`: 201 at 30 ms, the file already
 *    on disk), so this file claims only that the outcome of the write cannot change the answer — not that the answer
 *    arrives first.
 * 2. **The allow-list, measured at its own edges.** `.log` is appended when the name lacks it (`logger.service.ts:199`),
 *    so `x.txt` becomes `logs/x.txt.log` (and the bare `logs/x.txt` is never created); the cap is the regex's 127
 *    characters after the first one plus `.log`, so a 128-character body (132 characters in all) is written and a
 *    129-character body (133) is not (`logger-server.ts:18`); Windows-reserved names pass the regex and NTFS accepts
 *    them with the `.log` tail, so `CON.log`, `con.log`, `AUX.log` and `nul.log` were all really written
 *    (`probe1-1.txt`, `probe1b-1.txt`).
 * 3. **A `customLogFile` that is not a string is accepted and writes nothing at all.** `4242`, `['a.log']` and
 *    `{nested:'x.log'}` each answered 201 and created no file (`probe8-1.txt`, `probe9-1.txt`): `logToFile`'s
 *    `customFilename.endsWith('.log')` (`logger.service.ts:199`) throws on a value with no `endsWith`, and `logToFile`'s
 *    own `catch` (`:226-228`) eats it — so it does not fall back to the date file either. Tagged: the route claims
 *    success for a write that never happened, as in finding 1.
 * 4. **A body that parses to `null` is a 500, not the route's own 400.** `JSON.parse('null')` succeeds
 *    (`route.ts:21-26`), `route.ts:30` hands the result to `simpleLogToConsole` (`logger.service.ts:121-122`), whose
 *    `formatLogEntry` destructures its argument (`:116-119`) and throws on `null`, so the route's `catch` at `:39-41` answers 500
 *    `{"success":false,"error":"Failed to process log request","details":{}}`. The route's two answers to "this is not a
 *    log entry" are therefore a 400 with a reason for a body that does not parse and a 500 for one that parses to
 *    nothing. Same transport, same shape, measured through the `api` fixture (`probe5-1.txt`, `probe8-1.txt`).
 * 5. **A body that is valid JSON but not an object is accepted with 201** — `[1,2]`, `[{…}]`, `42`, `true`, `{}`, and a
 *    quoted JSON string. `body.details?.customLogFile` (`route.ts:33`) is simply undefined for all of them, so each was
 *    appended to `logs/NaN-NaN-NaN.log`: `logToFile` builds the date from `new Date(undefined)`
 *    (`logger.service.ts:195`, `:205-216`), which is `NaN-NaN-NaN`. That file is shared by every lane (and is wiped with the
 *    whole folder past `LOG_FOLDER_MAX_SIZE`), so the destination is probe-only evidence here (`probe8-1.txt`: 200 bytes
 *    holding the array, number, `true` and `{}` bodies) and this file pins only the answer.
 * 6. **This route has no origin or site check at all.** `route.ts` never imports `refuseForeignWrite` /
 *    `refuseForeignOrigin` (`core/services/server/same-origin-request.ts:16-46`), which is what the write routes of the
 *    proxy family use (`forward-to-gauzy.ts:89-90`, and the list `playwright/suites/api/foreign-origin.generated.ts`
 *    builds off `collect-foreign-origin-routes.mjs` — `POST /api/log` is not in it, because it guards nothing).
 *    Measured: `Origin: https://evil.example` + `Sec-Fetch-Site: cross-site` + `Content-Type: text/plain` is answered 201
 *    **and written**, and so are cross-site-only, no headers at all, cross-site with `application/json`, and an
 *    anonymous JSON caller (`probe1b-1.txt`, `probe5-1.txt`). No `Access-Control-Allow-*` header appears on any answer.
 *    That is not tagged as a mismatch, because the rule those helpers state is about a write that rides the caller's
 *    session cookies into the platform (`same-origin-request.ts:3-12`) and this route never touches the platform; the
 *    honest reading of its reach is dev-only and narrow: `NODE_ENV !== 'production' && ACTIVE_LOCAL_LOG_SYSTEM.value`
 *    (`route.ts:7`, `apps/web/.env:14-15`, `constants.tsx:275-278`), one `.log` name in one directory (finding 1), and
 *    `createLogDir` emptying that folder past `LOG_FOLDER_MAX_SIZE` = 10 MB (`logger-server.ts:60`, `apps/web/.env:12`).
 *    What it does mean in plain terms: anything that can open the dev port can append lines to the developer's log
 *    files, including a forged `message` and a forged `context`.
 * 7. **And a foreign web page cannot do it from this lane's Chrome.** Measured in a real browser with the page served
 *    from `http://127.0.0.1:4131` (`probe4-1.txt`, `probe6-1.txt`): every `fetch` variant — cors and `no-cors`,
 *    `text/plain` and `application/json`, with and without `credentials: 'include'` — is refused by the browser itself
 *    (`Access to fetch at 'http://localhost:3032/api/log' from origin 'http://127.0.0.1:4131' has been blocked by CORS
 *    policy: Permission was denied for this request to access the \`loopback\` address space.` + `net::ERR_FAILED`) and
 *    nothing is written. A cross-site **form navigation**, which CORS does not gate, does reach the route — but Chrome
 *    sends `enctype="text/plain"` as `{"timestamp":…,"customLogFile":…}=\r\n` and downgrades
 *    `enctype="application/json"` to `application/x-www-form-urlencoded`, and both are refused 400 `Invalid JSON
 *    format` with nothing written. So finding 6's reach is "a client that can reach the dev port", not "any page a
 *    developer visits". Both halves are pinned below.
 * 8. **The bearer of every API call a signed-in page makes is sent to `/api/log` and written into the shared date
 *    file.** Measured over four page loads (`probe7-1.txt`: 23, 25, 19 and 26 `🚀 Request:` entries; `probe5-1.txt`,
 *    `probe6-1.txt`, `probe2-1.txt` over six more): every one of them has `details.headers` with exactly `Accept`,
 *    `Authorization` and `tenant-id`, every `Authorization` equals `Bearer <this session's auth-token cookie value>`,
 *    every `tenant-id` equals the fixture tenant, and no entry has any `Cookie` key. The path: `api.service.ts:157`
 *    turns logging on in development, `:297` runs `authorizeRequest` (which writes the header at `:96-100`) and `:304`
 *    logs the config whole through `logRequest` (`:387-395`, `headers: config.headers`), `logger.service.ts:95-111` →
 *    `:170-185` sends it client-side in development (`logger-client.ts:13-41`, `POST /api/log`), and `route.ts:36` →
 *    `logger-server.ts:35,43` appends the entry unmodified to `logs/<date>.log`. The one function in this repo that
 *    redacts `Authorization`, `Cookie` and `Set-Cookie` is `sanitizeHeaders` (`logger-adapter.service.ts:15,254`), and it
 *    is not on this path. That the bearer really lands in the date file is probe-only evidence (`probe5-1.txt`: this
 *    run's own bearer was found in `apps/web/logs/2026-11-24.log`, 27 `Bearer ` occurrences in that file in total),
 *    because no test may assert on a file every lane writes. Tagged.
 * 9. **`token` is not in the hidden-field list, so an e-mail verification token is logged in clear text.** The hidden
 *    list is `hash, password, confirmPassword, code, recoveryCode, challenge, refresh_token`
 *    (`core/services/client/request-log-body.ts:6-14`, applied by `requestBodyForLog` at `:89-94` and used only on the
 *    request half, `api.service.ts:392`). Measured on `/verify-email?email=…&token=<unique>`: two `🚀 Request: POST
 *    /auth/email/verify` entries and two `✅ Response:` entries, each with `details.data` carrying `email`,
 *    `organizationId`, `tenantId` and a `token` equal to the page's own token (`probe3-1.txt`, `probe6-1.txt`). The same
 *    finding is already published for the account-link flow in `suites/lane-c/account-link-pages-ui.spec.ts` (its
 *    finding 1, `:23-33` there); pinned here for this flow on this lane. Tagged.
 * 10. **A password is hidden on the way out; the answer's entry is not filtered, and this lane's mock echoes it
 *    back.** The request entry of the reset submit carries
 *    `details.data = {confirmPassword:'[hidden]', password:'[hidden]', token:<the page token>}`
 *    (measured, `probe2-1.txt`, `probe3-1.txt`), and `details.headers` of that same entry is `Accept` alone — signed out,
 *    there is no bearer to leak. The `✅ Response:` entry of the same call carries `details.data` with both passwords
 *    equal to the value the form posted (`api.service.ts:400-412` logs `response.data` with no body filtering at all; the
 *    only switches are `secretResponse` for the answer and `secretAddress` for the whole call, `:418-420`, and neither
 *    is set here — `core/services/client/api/auth/auth.service.ts` `resetPassword`), and this lane's mock answers a write
 *    with the body it was given (`cypress/support/mock-gauzy-server.mjs`). Nothing here prints either value: each side is
 *    compared with this file's own `RESET_PASSWORD_VALUE` constant (`lane-auth-helpers.ts:43-44`) and reported as
 *    `hidden` / `clear text, equal to the posted value`. Not tagged: the passwords in the answer are there because
 *    the lane's mock echoes the body it was given; whether the real Gauzy `/auth/reset-password` answer carries them is
 *    not measured here, and an unfiltered answer entry with a per-call `secretResponse` opt-out is the design
 *    (`api.service.ts:400-404`). What is pinned is the app's side: the request half hides, the answer half logs as-is.
 * 11. **`secretAddress` keeps a shared-report read out of `/api/log` entirely** (intended, and the contrast with
 *    findings 8-10): `core/services/client/api/timesheets/saved-report.service.ts:131-136` marks the read
 *    `secretAddress: true`, `api.service.ts:418-420`
 *    skips both the request and the response entry for such a call. Measured on `/shared-report#token=<unique>` with
 *    the read stubbed: the browser really sent `GET <mock>/api/public/saved-reports/<token>`, the page rendered the
 *    report, and not one `POST /api/log` body named `saved-reports` or the token (`probe3-1.txt`, `probe6-1.txt`).
 * 12. **There is no self-logging loop.** 0 `🚀 Request:` entries named `/api/log` in every measured load: the logger
 *    posts through its own axios instance (`logger-client.ts:5-11,41`), not through `ApiService`, so its own calls are
 *    never logged by `logRequest`.
 * 13. **`GET`, `PUT`, `DELETE`, `PATCH` and `HEAD` never reach this handler**: Next answers 405 with an empty body, no
 *    media type and no `Allow` (`route.ts` exports `POST` only); `OPTIONS` is Next's own 204 with `allow: OPTIONS, POST`.
 *    The generated manifest agrees (`playwright/suites/api/routes.generated.ts:987-988`: `verbs: ['POST']`).
 *
 * ## Lane limits — branches this lane cannot answer, stated instead of faked
 *
 * - The 501 at `route.ts:43` and `logServerToFile`'s production early return (`logger-server.ts:28-30`) are
 *   unreachable here: a lane runs `next dev` (`playwright/test-servers.ts`, `node ../../node_modules/next/dist/bin/next
 *   dev -p 3032`) and `apps/web/.env:14-15` sets `ACTIVE_LOCAL_LOG_SYSTEM=true` + `NEXT_PUBLIC_ACTIVE_LOCAL_LOG_SYSTEM=true`.
 *   Pinned as unreachable rows, not asserted.
 * - `logs/` is shared by all four lanes and `createLogDir` fires `cleanIfTooBig` on **every** `POST /api/log` without
 *   awaiting it (`logger-server.ts:50-65`), emptying the whole folder past `LOG_FOLDER_MAX_SIZE` MB. This was measured
 *   the hard way while probing: files probe1 and probe1b had written (`AUX.log`, `CON.log`, `NaN-NaN-NaN.log`, the
 *   200-character name) were gone by probe5's run, and `logs/` then held only the two date files. That is why every file
 *   assertion here names its own file and polls for it within seconds, and why no test reads a file another test wrote.
 * - The per-page `🚀 Request:` count is not stable run to run (probes measured 15, 16, 19, 21, 23, 24, 25 and 26 on the
 *   same two routes, `probe3-1.txt`, `probe5-1.txt`, `probe6-1.txt`, `probe7-1.txt`; this file's own two green runs
 *   measured 29 and 30 on `/` and 37 and 27 on the Security page) — TanStack Query under React Strict Mode
 *   mounts each component twice and aborts some first fetches (`playwright/helpers.ts:37-43`), and a page's own reads
 *   depend on what its sections mount. So the browser tests pin invariants and the pairing, never a count. What *is*
 *   stable, in all eight measured loads: the `details` key sets (`headers`, `headers,params`, `data,headers`), the header
 *   key set (`Accept`, `Authorization`, `tenant-id`), the bearer equality, the `tenant-id` equality, the absence of any
 *   cookie key, the absence of a `/api/log` entry, and both pairing directions.
 * - The loopback guard of finding 7 is Chrome's, not this app's, and was measured with the lane's browser
 *   (`E2E_BROWSER_CHANNEL=chrome`, `playwright/playwright.lane.config.ts`). A different engine or a Chrome without the
 *   local-network guard would answer differently; the file-system witness would not.
 * - `'use server'` exposure of `createLogDir` / `clearFolder` / `logServerToFile` (`logger-server.ts:1-12`) is not
 *   measured here: this file pins the file-name gate through the route, not the server actions called straight from a
 *   page. `clearFolder`'s `rm(fullPath, {recursive:true, force:true})` (`:107-116`) is deliberately not exercised — it is
 *   the one function in this path that deletes.
 * - `logger.service.ts:219-222` writes an `ERROR`/`FATAL` entry to `error-<date>.log` as well as the date file, but only
 *   when no custom name was given (`:198-202` returns first); measured with a custom name, the marker was in the custom
 *   file and not in `error-<date>.log` (`probe9-1.txt`).
 *
 * ## Secrets in this file
 *
 * Nothing here prints a token, a cookie value, an `Authorization` value or a password. Every one of them is compared
 * for equality with the value the test itself put in the page or in the request, and reported as `present`/`absent`,
 * the scheme (`Bearer`) and a length.
 *
 * - The reset row's page logs `[JWT] Failed to decode token: … InvalidTokenError: missing part #2` in the console,
 *   because the lane's reset token is deliberately undecodable (`lane-auth-helpers.ts:30-38`) and
 *   `app/[locale]/auth/reset-password/page.tsx` decodes it on the server. That line is a property of the token this
 *   file chose, not of the log system, so the reset row prints the page's console errors in its `MEASURE` line and
 *   asserts nothing about console silence. The verify-email row, which was measured with exactly two failure lines,
 *   does assert them.
 * - The shared-report read is answered by a `page.route` stub, so the mock's own request log never sees it: the
 *   witness that the browser really sent it is the browser-side call list (`mock.calls(...)` answers empty for a stubbed
 *   path, which is what this expects).
 *
 * ## Cost
 *
 * 46 API cases: 1 well-formed write, 1 suffix, 2 name-choice rows, 1 ERROR-level name, 8 refused names, 6 accepted
 * names, 3 non-string names, 6 empty/unparseable bodies, 1 `null`, 6 non-object bodies, 6 verbs, 5 cross-site variants;
 * 13 browser cases: 3 signed-in loads (the pairing, the bearer and header shapes, the Security page's two extra
 * entries), 3 secret-body flows, 5 foreign `fetch` variants, 2 foreign form encodings. **59 measured cases in 20
 * tests.**
 */

// ==========================================================================================
// paths and shapes
// ==========================================================================================

/** `apps/web` — the lane app's own working directory (`test-servers.ts` starts it with `cwd: '..'`). */
const WEB_DIR = join(__dirname, '../../..');
const REPO_DIR = join(WEB_DIR, '..');
/** `LOG_DIR = 'logs'` (`logger-server.ts:15`), read relative to that working directory. */
const LOGS_DIR = join(WEB_DIR, 'logs');

const NOT_INTENDED = ' [MEASURED, NOT INTENDED]';

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b devlog] MEASURE ${label} ${JSON.stringify(value)}`);

/** One lower-case suffix per case, so no test ever reads a file another test wrote. */
const unique = (kind: string) => `pw-lane-b-${kind}-${Math.random().toString(36).slice(2, 8)}`;

const CONTEXT = 'pw-lane-b-devlog';
const entryBody = (message: string, extra: Record<string, unknown> = {}) => ({
	timestamp: new Date().toISOString(),
	level: 'INFO',
	message,
	context: CONTEXT,
	...extra
});

/** Every answer body of `route.ts`, spelled the way the route spells it. */
const CREATED = JSON.stringify({ success: true });
const EMPTY_LENGTH = JSON.stringify({
	success: false,
	error: 'Empty request body',
	details: 'Content-Length is 0'
});
const EMPTY_RAW = JSON.stringify({ success: false, error: 'Empty request body', details: 'Body is empty' });
const BAD_JSON = JSON.stringify({ success: false, error: 'Invalid JSON format', details: {} });
const HANDLER_CRASH = JSON.stringify({ success: false, error: 'Failed to process log request', details: {} });

const OWN_MEDIA_TYPE = 'application/json';

type Answer = {
	status: number;
	text: string;
	contentType: string | null;
	cacheControl: string | null;
	allow: string | null;
};

const readAnswer = async (response: APIResponse): Promise<Answer> => {
	const headers = response.headers();
	return {
		status: response.status(),
		text: await response.text(),
		contentType: headers['content-type'] ?? null,
		cacheControl: headers['cache-control'] ?? null,
		allow: headers['allow'] ?? null
	};
};

const postLog = async (api: ApiCall, body: unknown, headers: Record<string, string> = {}) => {
	const response = await api('/api/log', {
		method: 'POST',
		...(body === undefined ? {} : { body }),
		...(Object.keys(headers).length === 0 ? {} : { headers })
	});
	return readAnswer(response);
};

const answerLine = (answer: Answer) =>
	`${answer.status} media=${answer.contentType ?? '(none)'} cache=${answer.cacheControl ?? '(none)'} allow=${answer.allow ?? '(none)'} body=${JSON.stringify(answer.text.slice(0, 200))}`;

const logFileNames = () => readdirSync(LOGS_DIR);
const logFileText = (name: string) => readFileSync(join(LOGS_DIR, name), 'utf8');
const logFileExists = (name: string) => existsSync(join(LOGS_DIR, name));

/**
 * The route does not await the write (`route.ts:36`), so a file is polled, never assumed. 40 × 100 ms is far more
 * than the measured 30 ms (`probe5-1.txt`) and far less than the 10 MB wipe could cost this file.
 */
const waitForLogFile = async (name: string, tries = 40, intervalMs = 100): Promise<string | null> => {
	for (let attempt = 0; attempt < tries; attempt += 1) {
		if (logFileExists(name)) return logFileText(name);
		await new Promise((done) => setTimeout(done, intervalMs));
	}
	return null;
};

/** `apps/web` and the repo root, as name sets: what a refused write did NOT create is provable this way. */
const topNames = (dir: string) => new Set(readdirSync(dir));

const describeNewNames = (before: Set<string>, dir: string) =>
	readdirSync(dir)
		.filter((name) => !before.has(name))
		.join(', ') || '(nothing new)';

// ==========================================================================================
// 1. the write, and the file it writes
// ==========================================================================================

apiTest.describe('lane-b · POST /api/log: the entry, the file it lands in, and the name rules', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	apiTest(
		'a well-formed entry with a customLogFile answers 201 {"success":true} in application/json, with no Cache-Control, and is appended verbatim to its own file',
		async ({ api }) => {
			const name = `${unique('entry')}.log`;
			const body = entryBody('lane-b devlog well-formed entry', {
				details: { customLogFile: name, alpha: 1, nested: { beta: 'two' }, list: [1, 2] }
			});

			const answer = await postLog(api, body);
			const written = await waitForLogFile(name);

			report('well-formed', {
				name,
				answer: answerLine(answer),
				writtenBytes: written === null ? 0 : written.length
			});

			expect(answer.status, `a well-formed entry was not accepted: ${answerLine(answer)}`).toBe(201);
			expect(answer.text, `the success answer is not the route's own: ${answerLine(answer)}`).toBe(CREATED);
			expect(answer.contentType, `the success answer's media type: ${answerLine(answer)}`).toBe(OWN_MEDIA_TYPE);
			expect(answer.cacheControl, `this answer carries a Cache-Control: ${answerLine(answer)}`).toBeNull();
			expect(written, `nothing was written to apps/web/logs/${name}`).not.toBeNull();
			// `JSON.stringify(logEntry, null, 2) + '\n'` (`logger-server.ts:35`): the entry, key order and all.
			expect(written, `the file is not the entry as it was sent: ${JSON.stringify(written?.slice(0, 240))}`).toBe(
				`${JSON.stringify(body, null, 2)}\n`
			);
			const parsed = JSON.parse(String(written)) as Record<string, unknown>;
			expect(Object.keys(parsed), 'the entry is not the five keys that were sent').toEqual([
				'timestamp',
				'level',
				'message',
				'context',
				'details'
			]);
			expect(
				Object.keys(parsed.details as Record<string, unknown>),
				'the file lost the customLogFile key it was named by'
			).toEqual(['customLogFile', 'alpha', 'nested', 'list']);
			expect(written, 'the file is not indented with two spaces').toMatch(/^\{\n {2}"timestamp"/);
			expect(written?.endsWith('\n'), 'the file has no trailing newline').toBe(true);
		}
	);

	apiTest(
		'a customLogFile with no .log suffix gets one appended, the bare name is never created',
		async ({ api }) => {
			// The suffix comes from `logger.service.ts:199`, not from the writer's allow-list: the name that reaches
			// `LOG_FILE_NAME` is `x.txt.log`, so the write is accepted and the file is `x.txt.log`.
			const base = unique('suffixless');
			const answer = await postLog(
				api,
				entryBody(`lane-b devlog suffix ${base}`, { details: { customLogFile: base } })
			);
			const written = await waitForLogFile(`${base}.log`);

			report('suffix', {
				base,
				answer: answerLine(answer),
				withSuffix: written !== null,
				bareExists: logFileExists(base)
			});

			expect(answer.status, `a name without a suffix was not accepted: ${answerLine(answer)}`).toBe(201);
			expect(written, `apps/web/logs/${base}.log was not written`).not.toBeNull();
			expect(written).toContain(base);
			expect(logFileExists(base), `the bare name apps/web/logs/${base} was created as well`).toBe(false);
		}
	);

	apiTest(
		'the custom name wins over the date file, even when the timestamp is not a date and the entry is missing every field but details',
		async ({ api }) => {
			const badStamp = `${unique('badts')}.log`;
			const badStampMarker = `lane-b devlog bad timestamp ${badStamp}`;
			const badStampAnswer = await postLog(api, {
				timestamp: 'not-a-date',
				level: 'INFO',
				message: badStampMarker,
				context: CONTEXT,
				details: { customLogFile: badStamp }
			});
			const badStampText = await waitForLogFile(badStamp);

			const bareName = `${unique('onlydetails')}.log`;
			const bareMarker = `lane-b devlog only details ${bareName}`;
			const bareAnswer = await postLog(api, { message: bareMarker, details: { customLogFile: bareName } });
			const bareText = await waitForLogFile(bareName);

			report('name wins', {
				badStamp: { answer: answerLine(badStampAnswer), written: badStampText !== null },
				onlyDetails: { answer: answerLine(bareAnswer), written: bareText !== null }
			});

			expect(
				badStampAnswer.status,
				`an entry with an unusable timestamp was refused: ${answerLine(badStampAnswer)}`
			).toBe(201);
			expect(badStampText, `${badStamp} was not written, although the name was asked for`).not.toBeNull();
			expect(badStampText).toContain(badStampMarker);
			expect(badStampText).toContain('"timestamp": "not-a-date"');

			expect(
				bareAnswer.status,
				`an entry with only a message and details was refused: ${answerLine(bareAnswer)}`
			).toBe(201);
			expect(bareText, `${bareName} was not written, although the name was asked for`).not.toBeNull();
			expect(bareText).toContain(bareMarker);
		}
	);

	apiTest(
		'an ERROR entry with a custom name goes to that file only, not also to error-<date>.log',
		async ({ api }) => {
			const name = `${unique('errlevel')}.log`;
			const marker = `lane-b devlog error level ${name}`;
			const answer = await postLog(api, {
				timestamp: new Date().toISOString(),
				level: 'ERROR',
				message: marker,
				context: CONTEXT,
				details: { customLogFile: name }
			});
			const written = await waitForLogFile(name);

			report('error level', { name, answer: answerLine(answer), written: written !== null });

			expect(answer.status, `an ERROR entry was refused: ${answerLine(answer)}`).toBe(201);
			expect(written, `${name} was not written`).not.toBeNull();
			expect(written).toContain(marker);
		}
	);

	apiTest(
		'a hostile customLogFile is refused by the writer while the route still answers 201 {"success":true}, and nothing is created outside apps/web/logs' +
			NOT_INTENDED,
		async ({ api }) => {
			const REFUSED = [
				{ label: '../escape.log', name: '../escape.log' },
				{ label: '..\\escape.log (a literal backslash)', name: '..\\escape.log' },
				{ label: '/abs.log', name: '/abs.log' },
				{ label: 'a/b.log (two segments)', name: 'a/b.log' },
				{ label: '.hidden.log (does not start with a letter or a digit)', name: '.hidden.log' },
				{ label: 'a 200-character name', name: `${'a'.repeat(200)}.log` },
				{ label: 'a 129-character name (133 in all, past the regex)', name: `${'c'.repeat(129)}.log` },
				{ label: '..%2Fescape.log (a folded name written literally)', name: '..%2Fescape.log' }
			];

			const logsBefore = new Set(logFileNames());
			const webBefore = topNames(WEB_DIR);
			const repoBefore = topNames(REPO_DIR);
			const answers: Record<string, string> = {};

			for (const item of REFUSED) {
				const marker = `lane-b devlog hostile ${item.label} ${item.name.slice(0, 12)}`;
				const answer = await postLog(api, entryBody(marker, { details: { customLogFile: item.name } }));
				answers[item.label] = answerLine(answer);
				expect(answer.status, `${item.label} was not answered as measured: ${answerLine(answer)}`).toBe(201);
				expect(answer.text, `${item.label} was answered with something else: ${answerLine(answer)}`).toBe(
					CREATED
				);
			}

			// Give a refused write every chance to have landed somewhere.
			await new Promise((done) => setTimeout(done, 800));

			const candidates = {
				'logs/../escape.log': join(LOGS_DIR, '../escape.log'),
				'logs/escape.log': join(LOGS_DIR, 'escape.log'),
				'logs//abs.log': join(LOGS_DIR, '/abs.log'),
				'logs/abs.log': join(LOGS_DIR, 'abs.log'),
				'logs/a/b.log': join(LOGS_DIR, 'a/b.log'),
				'logs/b.log': join(LOGS_DIR, 'b.log'),
				'logs/.hidden.log': join(LOGS_DIR, '.hidden.log'),
				'logs/hidden.log': join(LOGS_DIR, 'hidden.log'),
				'logs/…129…log': join(LOGS_DIR, `${'c'.repeat(129)}.log`),
				'logs/..%2Fescape.log': join(LOGS_DIR, '..%2Fescape.log'),
				'apps/web/escape.log': join(WEB_DIR, 'escape.log'),
				'apps/web/abs.log': join(WEB_DIR, 'abs.log'),
				'apps/web/a/b.log': join(WEB_DIR, 'a/b.log'),
				'apps/web/a (a directory)': join(WEB_DIR, 'a'),
				'repo root/escape.log': join(REPO_DIR, 'escape.log'),
				'repo root/abs.log': join(REPO_DIR, 'abs.log')
			};
			const found = Object.entries(candidates)
				.filter(([, path]) => existsSync(path))
				.map(([key]) => key);

			const newInLogs = logFileNames().filter((name) => !logsBefore.has(name));
			const newInWeb = readdirSync(WEB_DIR).filter((name) => !webBefore.has(name));
			const newInRepo = readdirSync(REPO_DIR).filter((name) => !repoBefore.has(name));

			report('hostile refused', {
				count: REFUSED.length,
				answers,
				filesFoundAtAnyPlausiblePath: found,
				newNamesInLogs: newInLogs,
				newNamesInAppsWeb: newInWeb,
				newNamesInRepoRoot: newInRepo
			});

			expect(found, `a refused name still created a file at: ${found.join(', ')}`).toEqual([]);
			expect(
				newInLogs,
				`the eight refused names created files in apps/web/logs after all: ${describeNewNames(logsBefore, LOGS_DIR)}`
			).toEqual([]);
			expect(
				newInWeb,
				`a refused name created something in apps/web: ${describeNewNames(webBefore, WEB_DIR)}`
			).toEqual([]);
			expect(
				newInRepo,
				`a refused name created something in the repo root: ${describeNewNames(repoBefore, REPO_DIR)}`
			).toEqual([]);
		}
	);

	apiTest(
		'the allow-list at its edges: 128 characters of name pass and 129 do not, a Windows-reserved name is accepted and really written',
		async ({ api }) => {
			const ACCEPTED = ['x.txt', 'CON.log', 'con.log', 'AUX.log', 'nul.log', `${'b'.repeat(128)}.log`];
			const seen: Record<string, { status: number; written: boolean; as: string }> = {};

			for (const name of ACCEPTED) {
				const marker = `lane-b devlog edge ${name.slice(0, 8)} ${name.length}`;
				const answer = await postLog(api, entryBody(marker, { details: { customLogFile: name } }));
				const file = name.endsWith('.log') ? name : `${name}.log`;
				const text = await waitForLogFile(file);
				seen[name] = { status: answer.status, written: text !== null && text.includes(marker), as: file };
				if (name === 'x.txt')
					expect(logFileExists('x.txt'), 'the bare x.txt appeared next to x.txt.log').toBe(false);
			}

			report('accepted edges', { seen });

			for (const name of ACCEPTED) {
				const row = seen[name];
				expect(row.status, `${name} was not answered 201`).toBe(201);
				expect(row.written, `${name} was answered 201 but nothing was written to logs/${row.as}`).toBe(true);
			}
			expect(logFileNames(), 'a 129-character name was written after all').not.toContain(
				`${'c'.repeat(129)}.log`
			);
		}
	);

	apiTest(
		'a customLogFile that is not a string answers 201 and writes nothing at all, not even into the date file' +
			NOT_INTENDED,
		async ({ api }) => {
			const NON_STRINGS: Array<{ label: string; value: unknown }> = [
				{ label: 'a number', value: 4242 },
				{ label: 'an array', value: ['pw-lane-b-array.log'] },
				{ label: 'an object', value: { nested: 'pw-lane-b-object.log' } }
			];

			const logsBefore = new Set(logFileNames());
			const rows: Record<string, { status: number; body: string }> = {};

			for (const item of NON_STRINGS) {
				const answer = await postLog(
					api,
					entryBody(`lane-b devlog non-string name ${item.label}`, { details: { customLogFile: item.value } })
				);
				rows[item.label] = { status: answer.status, body: answer.text.slice(0, 80) };
			}
			await new Promise((done) => setTimeout(done, 800));

			const newNames = logFileNames().filter((name) => !logsBefore.has(name));
			report('non-string names', { rows, newNamesInLogs: newNames, numberFile: logFileExists('4242.log') });

			for (const item of NON_STRINGS) {
				expect(
					rows[item.label].status,
					`${item.label} customLogFile was not answered 201: ${JSON.stringify(rows[item.label])}`
				).toBe(201);
			}
			expect(logFileExists('4242.log'), 'logs/4242.log was created by a numeric customLogFile').toBe(false);
			expect(newNames, `a non-string customLogFile wrote a file after all: ${newNames.join(', ')}`).toEqual([]);
		}
	);
});

// ==========================================================================================
// 2. the body cases, the verbs, and the cross-site reach
// ==========================================================================================

apiTest.describe('lane-b · POST /api/log: what a body must be, which verbs arrive, and who may ask', () => {
	apiTest.afterEach(async () => {
		await mockReset();
	});

	apiTest('an empty or unparseable body is refused with a 400 that names the reason', async ({ api }) => {
		const CASES: Array<{
			label: string;
			body: unknown;
			headers?: Record<string, string>;
			text: string;
			details: string;
		}> = [
			{ label: 'no body at all', body: undefined, text: EMPTY_LENGTH, details: 'Content-Length is 0' },
			{
				label: 'content-length: 0 spelled out',
				body: undefined,
				headers: { 'content-length': '0' },
				text: EMPTY_LENGTH,
				details: 'Content-Length is 0'
			},
			{ label: 'an empty string body', body: '', text: EMPTY_LENGTH, details: 'Content-Length is 0' },
			{ label: 'a body of spaces', body: '   ', text: EMPTY_RAW, details: 'Body is empty' },
			{ label: 'bytes that are not JSON', body: 'not json at all {', text: BAD_JSON, details: '{}' },
			{
				label: 'a form-encoded body',
				body: 'timestamp=2026-11-24T00%3A00%3A00.000Z&level=INFO&message=lane-b+urlencoded',
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				text: BAD_JSON,
				details: '{}'
			}
		];

		const rows: Record<string, string> = {};
		for (const item of CASES) {
			const answer = await postLog(api, item.body, item.headers ?? {});
			rows[item.label] = answerLine(answer);
			report('body refusal', { label: item.label, answer: answerLine(answer) });
			expect(answer.status, `${item.label} was not refused with 400: ${answerLine(answer)}`).toBe(400);
			expect(answer.text, `${item.label} was refused for another reason: ${answerLine(answer)}`).toBe(item.text);
			expect(answer.contentType, `${item.label}: the refusal's media type: ${answerLine(answer)}`).toBe(
				OWN_MEDIA_TYPE
			);
			expect(
				answer.cacheControl,
				`${item.label}: the refusal carries a Cache-Control: ${answerLine(answer)}`
			).toBeNull();
		}
		report('body refusal summary', rows);
	});

	apiTest("a body that parses to null is the route's own 500, not its 400" + NOT_INTENDED, async ({ api }) => {
		const answer = await postLog(api, 'null');
		report('null body', { answer: answerLine(answer) });

		expect(answer.status, `null was not the crash answer: ${answerLine(answer)}`).toBe(500);
		expect(answer.text, `null was refused for another reason: ${answerLine(answer)}`).toBe(HANDLER_CRASH);
		expect(answer.contentType, `the 500's media type: ${answerLine(answer)}`).toBe(OWN_MEDIA_TYPE);
	});

	apiTest('a body that is valid JSON but not an object is accepted with 201', async ({ api }) => {
		const BODIES = [
			{ label: 'an array', body: [1, 2] },
			{ label: 'an array of objects', body: [{ message: 'lane-b devlog array object' }] },
			{ label: 'a JSON string', body: '"lane-b devlog string body"' },
			{ label: 'a number', body: 42 },
			{ label: 'true', body: true },
			{ label: 'an empty object', body: {} }
		];

		const rows: Record<string, string> = {};
		for (const item of BODIES) {
			const answer = await postLog(api, item.body);
			rows[item.label] = answerLine(answer);
			report('non-object body', { label: item.label, answer: answerLine(answer) });
			expect(answer.status, `${item.label} was refused: ${answerLine(answer)}`).toBe(201);
			expect(answer.text, `${item.label} was answered with something else: ${answerLine(answer)}`).toBe(CREATED);
		}
	});

	apiTest(
		'every verb except POST and OPTIONS never reaches the handler, and OPTIONS names what it allows',
		async ({ api }) => {
			const VERBS = ['GET', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'];
			const rows: Record<string, string> = {};

			for (const method of VERBS) {
				const response = await api('/api/log', { method });
				const answer = await readAnswer(response);
				rows[method] = answerLine(answer);
				report('verb', { method, answer: answerLine(answer) });

				if (method === 'OPTIONS') {
					expect(answer.status, `OPTIONS was not Next's own answer: ${answerLine(answer)}`).toBe(204);
					expect(answer.allow, `OPTIONS did not say what it allows: ${answerLine(answer)}`).toBe(
						'OPTIONS, POST'
					);
					expect(answer.text, `OPTIONS answered a body: ${answerLine(answer)}`).toBe('');
					continue;
				}

				expect(answer.status, `${method} reached something other than Next's 405: ${answerLine(answer)}`).toBe(
					405
				);
				expect(answer.text, `${method} answered a body: ${answerLine(answer)}`).toBe('');
				expect(answer.contentType, `${method} answered a media type: ${answerLine(answer)}`).toBeNull();
				expect(answer.allow, `${method} answered an Allow header: ${answerLine(answer)}`).toBeNull();
			}
			report('verb summary', rows);
		}
	);

	apiTest(
		'no site check here: the cross-site trio is answered 201 and written into apps/web/logs, as is a caller with no headers at all',
		async ({ api }) => {
			const VARIANTS: Array<{ label: string; headers: Record<string, string>; anonymous?: boolean }> = [
				{
					label: 'Origin evil.example + Sec-Fetch-Site cross-site + text/plain',
					headers: {
						origin: 'https://evil.example',
						'sec-fetch-site': 'cross-site',
						'content-type': 'text/plain'
					}
				},
				{
					label: 'Sec-Fetch-Site cross-site alone',
					headers: { 'sec-fetch-site': 'cross-site', 'content-type': 'text/plain' }
				},
				{
					label: 'Origin evil.example alone',
					headers: { origin: 'https://evil.example', 'content-type': 'text/plain' }
				},
				{ label: 'no headers of its own, a session cookie only', headers: {} },
				{
					label: 'cross-site + application/json + no session cookie at all',
					headers: {
						origin: 'https://evil.example',
						'sec-fetch-site': 'cross-site',
						'content-type': 'application/json'
					},
					anonymous: true
				}
			];

			const rows: Record<string, { status: number; wroteTo: string | null; acao: string | null }> = {};
			for (const variant of VARIANTS) {
				const name = `${unique('crosssite')}.log`;
				const marker = `lane-b devlog cross-site ${variant.label}`;
				const payload = entryBody(marker, { details: { customLogFile: name } });
				const response = await api('/api/log', {
					method: 'POST',
					anonymous: variant.anonymous === true,
					// A `text/plain` request carries the JSON as text, the way a browser's fetch does; an
					// `application/json` one is handed over as an object and serialized by the transport itself.
					body: variant.headers['content-type'] === 'text/plain' ? JSON.stringify(payload) : payload,
					headers: variant.headers
				});
				const answer = await readAnswer(response);
				const text = await waitForLogFile(name);
				rows[variant.label] = {
					status: answer.status,
					wroteTo: text !== null && text.includes(marker) ? name : null,
					acao: response.headers()['access-control-allow-origin'] ?? null
				};
				report('cross-site', {
					label: variant.label,
					answer: answerLine(answer),
					wrote: rows[variant.label].wroteTo
				});

				expect(
					answer.status,
					`${variant.label} was refused, which this route does not do: ${answerLine(answer)}`
				).toBe(201);
				expect(
					rows[variant.label].wroteTo,
					`${variant.label} was answered 201 and nothing was written`
				).not.toBeNull();
				expect(
					rows[variant.label].acao,
					`${variant.label} got a CORS grant, which nothing here issues`
				).toBeNull();
			}
			report('cross-site summary', rows);
		}
	);
});

// ==========================================================================================
// 3. what a signed-in browser page sends to /api/log
// ==========================================================================================

type LogPost = { level?: string; message?: string; context?: string; details?: Record<string, unknown> };

const REQUEST_PREFIX = '🚀 Request: ';
const RESPONSE_PREFIX = '✅ Response: ';

/** A page's own `POST /api/log` bodies and the calls its API client really made, in the order they happened. */
const watchLog = (page: Page) => {
	const posts: LogPost[] = [];
	const mockCalls: string[] = [];
	const appCalls: string[] = [];

	page.on('request', (request) => {
		const url = new URL(request.url());
		if (request.method() === 'POST' && url.origin === APP_ORIGIN && url.pathname === '/api/log') {
			try {
				posts.push(JSON.parse(String(request.postData())) as LogPost);
			} catch {
				posts.push({ message: `(unparseable body) ${String(request.postData()).slice(0, 120)}` });
			}
			return;
		}
		if (url.origin === MOCK_ORIGIN) mockCalls.push(`${request.method()} ${url.pathname}`);
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/'))
			appCalls.push(`${request.method()} ${url.pathname}`);
	});

	const byPrefix = (prefix: string) => posts.filter((post) => String(post.message ?? '').startsWith(prefix));

	return {
		posts,
		mockCalls,
		appCalls,
		requests: () => byPrefix(REQUEST_PREFIX),
		responses: () => byPrefix(RESPONSE_PREFIX),
		others: () =>
			posts.filter(
				(post) => !byPrefix(REQUEST_PREFIX).includes(post) && !byPrefix(RESPONSE_PREFIX).includes(post)
			),
		/**
		 * The entries stop arriving when the page's reads have settled. `settle` waits for `quietRounds` rounds in a
		 * row where nothing new arrived, up to `maxRounds` rounds — counting *consecutive* quiet rounds matters: a
		 * page that has not sent anything yet is "unchanged" from the very first round, and a loop that stops at the
		 * first unchanged round returns before the page did anything (that is how this file's verify-email case first
		 * failed, with 0 entries).
		 */
		settle: async (pageForTiming: Page, options: { quietRounds?: number; maxRounds?: number } = {}) => {
			const quietRounds = options.quietRounds ?? 10;
			const maxRounds = options.maxRounds ?? 48;
			let previous = -1;
			let quiet = 0;
			for (let attempt = 0; attempt < maxRounds && quiet < quietRounds; attempt += 1) {
				quiet = posts.length === previous ? quiet + 1 : 0;
				previous = posts.length;
				await pageForTiming.waitForTimeout(250);
			}
		}
	};
};

/** `🚀 Request: GET /user/me?x=1` → `GET /api/user/me`, the shape the browser call list is written in. */
const targetOf = (post: LogPost): string => {
	const rest = String(post.message).slice(REQUEST_PREFIX.length);
	const [method, urlPart] = rest.split(' ');
	return `${method} /api${new URL(urlPart, APP_ORIGIN).pathname}`;
};

/**
 * Waits until `count` of the page's watched entries match `predicate`, or the budget runs out. It removes only the
 * race of a page whose call happens after `domcontentloaded` (`hardVisit` returns there, `helpers.ts:423-431`); every
 * count assertion below still fails on the number this file measured.
 */
const waitForPosts = async (
	seen: ReturnType<typeof watchLog>,
	page: Page,
	predicate: (post: LogPost) => boolean,
	count: number,
	budgetMs = 30_000
) => {
	const deadline = Date.now() + budgetMs;
	while (Date.now() < deadline && seen.posts.filter(predicate).length < count) {
		await page.waitForTimeout(250);
	}
};

const headersOf = (post: LogPost): Record<string, unknown> => (post.details?.headers ?? {}) as Record<string, unknown>;
const dataOf = (post: LogPost): Record<string, unknown> | undefined =>
	post.details?.data as Record<string, unknown> | undefined;
const keysOf = (value: unknown) => (value && typeof value === 'object' ? Object.keys(value as object).sort() : []);

/** A bearer compared for equality and reported as presence, scheme and length — never as a value. */
const describeSecret = (value: unknown) => {
	if (typeof value !== 'string' || value.length === 0) return 'absent';
	const [scheme] = value.split(' ');
	return `present scheme=${scheme} length=${value.length}`;
};

const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const EMAIL_VERIFY_FAILURE = '[EmailVerificationService] Email verification validation failed:';
/** What the silence assertions are allowed to be empty about: everything the app logged except the store noise. */
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));

const SECURITY_PATH = '/settings/personal/security';

/** The `auth-token` the browser was really given, read from the jar so the comparison is against the session itself. */
const jarSessionToken = async (page: Page) => {
	const cookies = await page.context().cookies();
	const cookie = cookies.find((item) => item.name === 'auth-token');
	return cookie?.value ?? '';
};

const MEASURED_DETAILS_SETS = ['data,headers', 'headers', 'headers,params'];
const MEASURED_HEADER_SET = 'Accept,Authorization,tenant-id';

uiTest.describe('lane-b · what a signed-in page hands to POST /api/log', () => {
	uiTest.afterEach(async () => {
		await mockReset();
	});

	uiTest(
		'every 🚀 Request entry pairs with a call the browser really sent, and no entry names /api/log itself',
		async ({ page, fixture, shield }) => {
			const seen = watchLog(page);
			await signInAndVisit(page, fixture, '/');
			await seen.settle(page);

			const entryTargets = seen.requests().map(targetOf);
			const distinctEntries = [...new Set(entryTargets)].sort();
			const distinctCalls = [...new Set(seen.mockCalls)].sort();

			report('pairing', {
				url: new URL(page.url()).pathname,
				requestEntries: seen.requests().length,
				responseEntries: seen.responses().length,
				otherEntries: seen.others().map((post) => `${post.level} ${String(post.message).slice(0, 70)}`),
				distinctEntryTargets: distinctEntries,
				distinctMockCalls: distinctCalls,
				appOriginApiCalls: [...new Set(seen.appCalls)].sort(),
				entriesWithoutCall: distinctEntries.filter((target) => !distinctCalls.includes(target)),
				callsWithoutEntry: distinctCalls.filter((target) => !entryTargets.includes(target)),
				namesApiLog: entryTargets.filter((target) => target.includes('/api/log')).length,
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			});

			expect(
				seen.requests().length,
				'the page sent no 🚀 Request entry at all, so the pairing would prove nothing'
			).toBeGreaterThan(0);
			expect(
				distinctEntries.filter((target) => !distinctCalls.includes(target)),
				`a log entry names a call the browser never sent: ${JSON.stringify(seen.requests().map(targetOf))} against ${JSON.stringify(distinctCalls)}`
			).toEqual([]);
			expect(
				distinctCalls.filter((target) => !entryTargets.includes(target)),
				`the browser made an API call that was never logged: ${JSON.stringify(distinctCalls)} against ${JSON.stringify(distinctEntries)}`
			).toEqual([]);
			expect(
				entryTargets.filter((target) => target.includes('/api/log')),
				'the logger logged its own route, which would loop'
			).toEqual([]);
			expect(consoleFindings(shield), 'the page logged a console error on a load this file is measuring').toEqual(
				[]
			);
			expect(shield.pageErrors(), 'the page threw an uncaught exception').toEqual([]);
		}
	);

	uiTest(
		'every 🚀 Request entry carries the session bearer, the tenant header and nothing that looks like a cookie' +
			NOT_INTENDED,
		async ({ page, fixture }) => {
			const seen = watchLog(page);
			await signInAndVisit(page, fixture, '/');
			await seen.settle(page);

			const sessionToken = await jarSessionToken(page);
			const requests = seen.requests();
			const bearerMismatch = requests.filter(
				(post) => headersOf(post).Authorization !== `Bearer ${sessionToken}`
			);
			const headerSets = [...new Set(requests.map((post) => keysOf(headersOf(post)).join(',')))].sort();
			const detailsSets = [...new Set(requests.map((post) => keysOf(post.details).join(',')))].sort();
			const cookieKeys = [
				...new Set(
					requests.flatMap((post) =>
						keysOf(headersOf(post)).filter((key) => key.toLowerCase().includes('cookie'))
					)
				)
			];
			const tenantMismatch = requests.filter((post) => headersOf(post)['tenant-id'] !== fixture.ids.tenantA);

			report('bearer', {
				requestEntries: requests.length,
				sessionCookieLength: sessionToken.length,
				bearer: describeSecret(requests[0] ? headersOf(requests[0]).Authorization : undefined),
				bearerMismatchCount: bearerMismatch.length,
				bearerMismatchMessages: bearerMismatch.map((post) => String(post.message).slice(0, 80)),
				headerSets,
				detailsSets,
				cookieKeys,
				tenantIdHeader: describeSecret(requests[0] ? headersOf(requests[0])['tenant-id'] : undefined),
				tenantMismatchCount: tenantMismatch.length,
				acceptValues: [...new Set(requests.map((post) => String(headersOf(post).Accept)))]
			});

			expect(
				requests.length,
				'the page sent no 🚀 Request entry, so the bearer claim would prove nothing'
			).toBeGreaterThan(0);
			expect(
				bearerMismatch.map((post) => String(post.message).slice(0, 80)),
				'a 🚀 Request entry did not carry exactly the session bearer it was given (values are never printed here)'
			).toEqual([]);
			expect(
				headerSets,
				`the logged request headers were not the measured ${MEASURED_HEADER_SET} everywhere`
			).toEqual([MEASURED_HEADER_SET]);
			expect(detailsSets, `the logged details keys were not the measured shapes`).toEqual(MEASURED_DETAILS_SETS);
			expect(cookieKeys, `a cookie was logged into the developer's log files: ${cookieKeys.join(', ')}`).toEqual(
				[]
			);
			expect(
				tenantMismatch.map((post) => String(post.message).slice(0, 80)),
				'a 🚀 Request entry did not carry the session tenant-id'
			).toEqual([]);
		}
	);

	uiTest(
		'the Security page logs the same shape, and nothing for the grants 404 this mock causes',
		async ({ page, fixture, shield }) => {
			const seen = watchLog(page);
			await signInAndVisit(page, fixture, SECURITY_PATH);
			await seen.settle(page);

			const sessionToken = await jarSessionToken(page);
			const requests = seen.requests();
			const others = seen.others();
			const grantsEntries = others.filter((post) => String(post.message).includes('GET /embed/grants 404'));
			const entryTargets = requests.map(targetOf);

			report('security page', {
				requestEntries: requests.length,
				responseEntries: seen.responses().length,
				otherEntries: others.map(
					(post) =>
						`${post.level} ${String(post.message).slice(0, 70)} context=${String(post.context).slice(0, 24)} detailsType=${typeof post.details}`
				),
				distinctEntryTargets: [...new Set(entryTargets)].sort(),
				bearerMismatchCount: requests.filter(
					(post) => headersOf(post).Authorization !== `Bearer ${sessionToken}`
				).length,
				bearer: describeSecret(requests[0] ? headersOf(requests[0]).Authorization : undefined),
				headerSets: [...new Set(requests.map((post) => keysOf(headersOf(post)).join(',')))].sort(),
				cookieKeys: [
					...new Set(
						requests.flatMap((post) =>
							keysOf(headersOf(post)).filter((key) => key.toLowerCase().includes('cookie'))
						)
					)
				],
				namesApiLog: entryTargets.filter((target) => target.includes('/api/log')).length,
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			});

			expect(requests.length, 'the Security page sent no 🚀 Request entry at all').toBeGreaterThan(0);
			expect(
				requests.filter((post) => headersOf(post).Authorization !== `Bearer ${sessionToken}`).length,
				'a Security-page entry did not carry the session bearer'
			).toBe(0);
			expect(
				[...new Set(requests.map((post) => keysOf(headersOf(post)).join(',')))].sort(),
				'the Security-page entries logged a different header set'
			).toEqual([MEASURED_HEADER_SET]);
			expect(
				[...new Set(requests.map((post) => keysOf(post.details).join(',')))].sort(),
				'the Security-page entries logged a different details shape'
			).toEqual(MEASURED_DETAILS_SETS);
			expect(
				entryTargets.filter((target) => target.includes('/api/log')),
				'the logger logged its own route'
			).toEqual([]);

			// The grants read answers 404 on this mock (siteGrants off, `mock-gauzy-server.mjs`), as a Gauzy without the
			// route does: the read takes that 404 as its answer (`embeds.service.ts` listSiteGrants, `quietStatuses`), so
			// the client logs no ERROR entry for it (`api.service.ts` logError).
			expect(
				grantsEntries.map((post) => `${post.level} ${String(post.context)}`),
				'the Security page logged the grants 404 a Gauzy without the route answers'
			).toEqual([]);
			expect(consoleFindings(shield), 'the Security page logged a console error beyond the store noise').toEqual(
				[]
			);
		}
	);
});

// ==========================================================================================
// 4. a secret in a body: hidden, clear, or never logged
// ==========================================================================================

/** The copy the reset page renders, read from the locale file it is rendered from (`locales/en.json` `auth.reset`). */
const LOCALE = JSON.parse(readFileSync(join(WEB_DIR, 'locales/en.json'), 'utf8')) as {
	auth: { reset: { SUBMIT: string; DONE_TITLE: string } };
};

uiTest.describe('lane-b · a secret in a request body, as it arrives at POST /api/log', () => {
	uiTest.afterEach(async () => {
		await mockReset();
	});

	uiTest(
		'a password is [hidden] on the way out of the reset form; the answer entry logs what the answer carries (here the mock echoes it)',
		async ({ anon, page, shield }) => {
			const seen = watchLog(page);
			const view = await anon(`/auth/reset-password?token=${UNDECODABLE_RESET_TOKEN}`);

			await view.locator('#reset-password').fill(RESET_PASSWORD_VALUE);
			await view.locator('#reset-confirm').fill(RESET_PASSWORD_VALUE);
			await view.getByRole('button', { name: LOCALE.auth.reset.SUBMIT }).click();
			await expect(
				view.getByText(LOCALE.auth.reset.DONE_TITLE, { exact: true }),
				'the reset did not complete, so the entries below would prove nothing about a completed call'
			).toBeVisible({ timeout: 25_000 });
			await seen.settle(view);

			const requestEntries = seen
				.requests()
				.filter((post) => String(post.message).endsWith('POST /auth/reset-password'));
			const responseEntries = seen
				.responses()
				.filter((post) => String(post.message).endsWith('POST /auth/reset-password'));
			// No console-silence assertion on this row: this lane's reset token is deliberately undecodable
			// (`lane-auth-helpers.ts:30-38`), and the page decodes it on the server, so the page logs a
			// `[JWT] Failed to decode token` line that belongs to the token and not to the log system. It is printed.
			const requestRow = requestEntries[0];
			const responseRow = responseEntries[0];
			const requestData = dataOf(requestRow ?? {});
			const responseData = dataOf(responseRow ?? {});

			report('reset body', {
				requestEntries: requestEntries.length,
				responseEntries: responseEntries.length,
				requestDetailsKeys: keysOf(requestRow?.details),
				requestHeaderKeys: keysOf(headersOf(requestRow ?? {})),
				requestAuthorization: describeSecret(headersOf(requestRow ?? {}).Authorization),
				requestDataKeys: keysOf(requestData),
				passwordInRequest: JSON.stringify(requestData?.password),
				confirmInRequest: JSON.stringify(requestData?.confirmPassword),
				tokenInRequest:
					requestData?.token === UNDECODABLE_RESET_TOKEN ? 'equal to the page token' : 'not the page token',
				responseDetailsKeys: keysOf(responseRow?.details),
				responseDataKeys: keysOf(responseData),
				passwordInResponse:
					responseData?.password === RESET_PASSWORD_VALUE
						? 'clear text, equal to the posted value'
						: JSON.stringify(responseData?.password),
				confirmInResponse:
					responseData?.confirmPassword === RESET_PASSWORD_VALUE
						? 'clear text, equal to the posted value'
						: JSON.stringify(responseData?.confirmPassword),
				consoleErrors: shield.consoleErrors(),
				pageErrors: shield.pageErrors()
			});

			expect(requestEntries.length, 'the reset submit did not log exactly one 🚀 Request entry').toBe(1);
			expect(responseEntries.length, 'the reset submit did not log exactly one ✅ Response entry').toBe(1);

			expect(keysOf(requestData), 'the request body was logged with a different key list').toEqual([
				'confirmPassword',
				'password',
				'token'
			]);
			expect(requestData?.password, 'the password was logged as something other than [hidden]').toBe('[hidden]');
			expect(requestData?.confirmPassword, 'the confirmation was logged as something other than [hidden]').toBe(
				'[hidden]'
			);
			expect(requestData?.token, 'the reset token in the logged body is not the page token').toBe(
				UNDECODABLE_RESET_TOKEN
			);
			// Signed out: `authorizeRequest` had no token to write, so this entry carries no bearer at all.
			expect(
				keysOf(headersOf(requestRow ?? {})),
				'the signed-out reset entry logged more headers than Accept'
			).toEqual(['Accept']);

			expect(keysOf(responseData), 'the answer was logged with a different key list').toEqual([
				'confirmPassword',
				'password',
				'token'
			]);
			expect(
				responseData?.password,
				'the answer entry no longer carried the password the form posted — the mock echo witness this case reads is gone'
			).toBe(RESET_PASSWORD_VALUE);
			expect(
				responseData?.confirmPassword,
				'the answer entry no longer carried the confirmation the form posted'
			).toBe(RESET_PASSWORD_VALUE);
		}
	);

	uiTest(
		'the verify-email confirm logs its token in clear text, because the hidden-field list has no token key' +
			NOT_INTENDED,
		async ({ page, fixture, shield }) => {
			const verifyToken = `pw-lane-b-verify-${Math.random().toString(36).slice(2, 8)}`;
			const seen = watchLog(page);
			// `/verify-email` is a focus route (`app/[locale]/(focus)/verify-email/page.tsx`): there is no shell mark
			// to wait for, and waiting for one only hides what the page did.
			await signInAndVisit(
				page,
				fixture,
				`/verify-email?email=${encodeURIComponent('manager@example.test')}&token=${verifyToken}`,
				{
					requireShell: false
				}
			);
			// The confirm this page posts happens after hydration and `hardVisit` already returned at
			// `domcontentloaded` (`helpers.ts:423-431`), so wait for the calls themselves before declaring the entries
			// settled; the count assertions below still fail on the number this file measured.
			await waitForPosts(
				seen,
				page,
				(post) =>
					String(post.message).startsWith(REQUEST_PREFIX) &&
					String(post.message).endsWith('POST /auth/email/verify'),
				2
			);
			await seen.settle(page);

			const requestEntries = seen
				.requests()
				.filter((post) => String(post.message).endsWith('POST /auth/email/verify'));
			const responseEntries = seen
				.responses()
				.filter((post) => String(post.message).endsWith('POST /auth/email/verify'));
			const rows = [...requestEntries, ...responseEntries].map((post) => ({
				message: post.message,
				detailsKeys: keysOf(post.details),
				dataKeys: keysOf(dataOf(post)),
				token:
					dataOf(post)?.token === verifyToken
						? 'equal to the page token'
						: JSON.stringify(dataOf(post)?.token),
				authorization: describeSecret(headersOf(post).Authorization)
			}));
			const findings = consoleFindings(shield);

			report('verify token', {
				verifyTokenLength: verifyToken.length,
				requestEntries: requestEntries.length,
				responseEntries: responseEntries.length,
				rows,
				consoleFindings: findings.map((line) => line.slice(0, 140)),
				pageErrors: shield.pageErrors()
			});

			expect(
				requestEntries.length,
				'the verify-email confirm did not log the two attempts this lane measures'
			).toBe(2);
			expect(
				responseEntries.length,
				'the verify-email confirm did not log the two answers this lane measures'
			).toBe(2);

			for (const post of [...requestEntries, ...responseEntries]) {
				expect(keysOf(dataOf(post)), 'the logged body was not the four keys this flow sends').toEqual([
					'email',
					'organizationId',
					'tenantId',
					'token'
				]);
				expect(
					dataOf(post)?.token,
					`the token in the logged body is no longer the page's own token in clear text: ${JSON.stringify(rows.map((row) => row.token))}`
				).toBe(verifyToken);
			}
			expect(
				requestEntries.filter((post) => headersOf(post).Authorization === undefined).length,
				'a signed-in request entry lost its bearer, which is the other half of this finding'
			).toBe(0);
			expect(
				responseEntries.filter((post) => headersOf(post).Authorization !== undefined).length,
				'an answer entry now carries a bearer, which is not what was measured'
			).toBe(0);
			// The app's own refusal of the fake token: `use-email-verify-token` retries once, so two failures.
			expect(
				findings.length,
				'the verify-email page logged a different number of console errors than measured'
			).toBe(2);
			expect(
				findings.filter((line) => !line.includes(EMAIL_VERIFY_FAILURE)).map((line) => line.slice(0, 140)),
				'the verify-email page logged a console error that is not the validation failure this flow logs'
			).toEqual([]);
		}
	);

	uiTest('a read marked secretAddress never appears in /api/log at all', async ({ page, fixture, mock }) => {
		const sharedToken = `pw-lane-b-sr-${Math.random().toString(36).slice(2, 8)}`;
		const readPath = `/api/public/saved-reports/${sharedToken}`;
		const seen = watchLog(page);

		// The stub has to be on the page before the read; the first visit only warms the route, so the fragment
		// navigation that follows is the one under test (a fragment-only goto is a same-document navigation).
		await page.route(`${MOCK_ORIGIN}${readPath}`, (route) =>
			route.fulfill({
				status: 200,
				contentType: 'application/json',
				headers: { 'cache-control': 'no-store' },
				body: JSON.stringify({
					name: 'Lane-b devlog report',
					kind: 'TIME_AND_ACTIVITY',
					grouping: 'project',
					includeAmounts: false,
					period: { rule: 'lastMonth', startDate: '2026-10-01', endDate: '2026-10-31', timeZone: 'UTC' },
					generatedAt: '2026-11-14T10:00:00.000Z',
					days: [],
					totals: { duration: 0 }
				})
			})
		);

		await signInAndVisit(page, fixture, '/shared-report', { requireShell: false });
		seen.posts.length = 0;
		seen.mockCalls.length = 0;
		await page.goto(`${APP_ORIGIN}/shared-report#token=${sharedToken}`, { waitUntil: 'domcontentloaded' });
		await expect(page.getByRole('heading', { level: 1, name: 'Lane-b devlog report' })).toBeVisible({
			timeout: 25_000
		});
		await seen.settle(page);

		const carrying = seen.posts.filter(
			(post) => JSON.stringify(post).includes('saved-reports') || JSON.stringify(post).includes(sharedToken)
		);
		// Empty by construction: the read was answered by the stub above, so it never reached the mock's own log. The
		// witness that the browser sent it is `seen.mockCalls`, read off the page.
		const asked = await mock.calls('/api/public/saved-reports/');

		report('secretAddress', {
			sharedTokenLength: sharedToken.length,
			logPosts: seen.posts.length,
			requestEntries: seen.requests().length,
			requestTargets: seen.requests().map(targetOf),
			browserMockCalls: seen.mockCalls,
			entriesNamingTheReadOrTheToken: carrying.map((post) => String(post.message).slice(0, 90)),
			mockAsked: asked.map((request) => `${request.method} ${request.path}`)
		});

		expect(
			seen.mockCalls.filter((call) => call === `GET ${readPath}`),
			'the shared read was not sent by the browser, so "never logged" would prove nothing'
		).toHaveLength(1);
		expect(
			carrying.map((post) => String(post.message).slice(0, 90)),
			'a secretAddress read was logged into /api/log after all'
		).toEqual([]);
	});
});

// ==========================================================================================
// 5. a foreign page trying to write into the developer's log files
// ==========================================================================================

const FOREIGN_ORIGIN = 'http://127.0.0.1:4131';

uiTest.describe('lane-b · a page on another origin trying to write into apps/web/logs', () => {
	uiTest.afterEach(async () => {
		await mockReset();
	});

	/**
	 * `fetch` half: every variant is refused by the browser before it reaches the route, and the file system is the
	 * witness — each attempt asks for its own `customLogFile`, so "nothing was written" is provable per attempt.
	 */
	uiTest(
		'no fetch from a foreign page reaches the route: the browser blocks it, and none of the log files it asked for exists',
		async ({ context }) => {
			const names = {
				corsPlain: `${unique('fcorsplain')}.log`,
				noCorsPlain: `${unique('fnocorsplain')}.log`,
				noCorsNoType: `${unique('fnocorstype')}.log`,
				corsJson: `${unique('fcorsjson')}.log`,
				noCorsCredentials: `${unique('fcredplain')}.log`
			};
			const foreignPage = await context.newPage();
			const events: string[] = [];
			foreignPage.on('requestfailed', (request) => {
				if (request.url().startsWith(APP_ORIGIN)) {
					events.push(
						`failed ${request.method()} ${new URL(request.url()).pathname} ${request.failure()?.errorText}`
					);
				}
			});
			foreignPage.on('console', (message) => {
				if (message.type() === 'error') events.push(`console: ${message.text().slice(0, 200)}`);
			});

			const bodyFor = (name: string) =>
				JSON.stringify({
					timestamp: new Date().toISOString(),
					level: 'INFO',
					message: `lane-b devlog foreign ${name}`,
					context: 'foreign-page',
					details: { customLogFile: name }
				});

			await foreignPage.route(`${FOREIGN_ORIGIN}/devlog.html`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'text/html; charset=utf-8',
					body: `<!doctype html><html><body><script>
window.__r = [];
async function go(label, options) {
	try { const r = await fetch('${APP_ORIGIN}/api/log', options); window.__r.push({ label, status: r.status, text: (await r.text()).slice(0, 60) }); }
	catch (e) { window.__r.push({ label, error: String(e).slice(0, 120) }); }
}
window.__run = async () => {
	await go('cors text/plain', { method: 'POST', body: ${JSON.stringify(bodyFor(names.corsPlain))}, headers: { 'content-type': 'text/plain' } });
	await go('no-cors text/plain', { method: 'POST', mode: 'no-cors', body: ${JSON.stringify(bodyFor(names.noCorsPlain))}, headers: { 'content-type': 'text/plain' } });
	await go('no-cors no content-type', { method: 'POST', mode: 'no-cors', body: ${JSON.stringify(bodyFor(names.noCorsNoType))} });
	await go('cors application/json', { method: 'POST', body: ${JSON.stringify(bodyFor(names.corsJson))}, headers: { 'content-type': 'application/json' } });
	await go('no-cors text/plain with credentials', { method: 'POST', mode: 'no-cors', credentials: 'include', body: ${JSON.stringify(bodyFor(names.noCorsCredentials))}, headers: { 'content-type': 'text/plain' } });
	return window.__r;
};</script></body></html>`
				})
			);

			await foreignPage.goto(`${FOREIGN_ORIGIN}/devlog.html`, { waitUntil: 'domcontentloaded' });
			const results = (await foreignPage.evaluate(() =>
				(window as unknown as { __run: () => Promise<unknown[]> }).__run()
			)) as Array<Record<string, unknown>>;
			await new Promise((done) => setTimeout(done, 1_000));

			const written = Object.entries(names)
				.filter(([, name]) => logFileExists(name))
				.map(([label]) => label);
			report('foreign fetch', {
				origin: FOREIGN_ORIGIN,
				results,
				networkEvents: events,
				logFilesWritten: written
			});

			expect(results.length, 'the foreign page reported fewer attempts than it was asked to make').toBe(5);
			expect(
				results.filter((row) => typeof row.status === 'number'),
				`a foreign fetch reached the route and got an answer: ${JSON.stringify(results)}`
			).toEqual([]);
			expect(
				results.filter((row) => typeof row.error === 'string').length,
				`a foreign attempt did not fail in the page: ${JSON.stringify(results)}`
			).toBe(5);
			expect(written, `a blocked foreign fetch still created log files: ${written.join(', ')}`).toEqual([]);
			expect(
				events.filter((line) => line.includes('loopback')).length,
				'the browser did not say why it blocked these requests: no loopback line in the events'
			).toBeGreaterThan(0);
			await foreignPage.close();
		}
	);

	/**
	 * Form half: a navigation is not CORS-gated, so it does reach the route — but the body a form can carry is not
	 * JSON, and the route refuses it. Two encodings, each asking for its own log file.
	 */
	uiTest(
		'a foreign form navigation does reach the route, and is refused 400 because a form body is not JSON',
		async ({ context }) => {
			const names = { textPlain: `${unique('ftextform')}.log`, jsonForm: `${unique('fjsonform')}.log` };
			const foreignPage = await context.newPage();
			const events: string[] = [];
			foreignPage.on('response', (response) => {
				if (response.url().startsWith(APP_ORIGIN)) {
					events.push(
						`answered ${response.status()} ${new URL(response.url()).pathname} acao=${response.headers()['access-control-allow-origin'] ?? '(none)'}`
					);
				}
			});

			await foreignPage.route(`${FOREIGN_ORIGIN}/devlog-form.html`, (route) =>
				route.fulfill({
					status: 200,
					contentType: 'text/html; charset=utf-8',
					body: `<!doctype html><html><body>
<form id="textform" method="POST" action="${APP_ORIGIN}/api/log" enctype="text/plain">
	<input name='${JSON.stringify({
		timestamp: new Date().toISOString(),
		level: 'INFO',
		message: 'lane-b devlog foreign text/plain form',
		context: 'foreign-form',
		details: { customLogFile: names.textPlain }
	})}' value="">
</form>
<form id="jsonform" method="POST" action="${APP_ORIGIN}/api/log" enctype="application/json">
	<input name="timestamp" value="${new Date().toISOString()}">
	<input name="level" value="INFO">
	<input name="message" value="lane-b devlog foreign application/json enctype form">
	<input name="context" value="foreign-form">
	<input name="details.customLogFile" value="${names.jsonForm}">
</form>
</body></html>`
				})
			);

			const rows: Record<string, { answer: string; pageBody: string; wrote: boolean }> = {};
			for (const id of ['textform', 'jsonform'] as const) {
				const name = id === 'textform' ? names.textPlain : names.jsonForm;
				await foreignPage.goto(`${FOREIGN_ORIGIN}/devlog-form.html`, { waitUntil: 'domcontentloaded' });
				await foreignPage.evaluate((formId) => {
					const form = document.getElementById(formId) as HTMLFormElement | null;
					form?.submit();
				}, id);
				await foreignPage.waitForLoadState('domcontentloaded').catch(() => undefined);
				const pageBody = (
					await foreignPage
						.locator('body')
						.innerText()
						.catch(() => '')
				)
					.replace(/\s+/g, ' ')
					.trim()
					.slice(0, 200);
				const answer = events.at(-1) ?? '(no answer recorded)';
				rows[id] = { answer, pageBody, wrote: logFileExists(name) };
				report('foreign form', { form: id, name, answer, pageBody, wrote: rows[id].wrote });
			}

			expect(
				rows.textform.pageBody,
				`the text/plain form was not refused as measured: ${JSON.stringify(rows.textform)}`
			).toContain('"error":"Invalid JSON format"');
			expect(
				rows.jsonform.pageBody,
				`the application/json form was not refused as measured: ${JSON.stringify(rows.jsonform)}`
			).toContain('"error":"Invalid JSON format"');
			expect(
				Object.entries(rows)
					.filter(([, row]) => row.wrote)
					.map(([form]) => form),
				'a refused foreign form wrote a log file after all'
			).toEqual([]);
			expect(
				events.filter((line) => line.includes('answered 201')).length,
				`a foreign form was accepted by the route: ${events.join(', ')}`
			).toBe(0);
			await foreignPage.close();
		}
	);
});
