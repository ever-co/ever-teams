import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Settings › Personal › API tokens**
 * (`/settings/personal/api-tokens`, `app/[locale]/(main)/settings/personal/api-tokens/page.tsx:1-5` →
 * `core/components/settings/pages/api-tokens/api-tokens-settings-page.tsx`), on lane-a (app `http://localhost:3031`,
 * mock `http://127.0.0.1:3992`, control `3994`, issuer `3995`, `playwright/test-servers.ts:38`).
 *
 * ## Where the numbers came from
 *
 * The first measurements came from the throwaway probe `E:\Coding\.tmp\probe-apitokens\probe.spec.ts`, run on this
 * lane on 2026-11-24 (log `probe-1.log`: 12 cases, 9 passed; its three create cases never typed a name, so the
 * client's own empty-name guard stopped them before any `POST`). Tests 7 and 8 (the create that succeeds, its secret,
 * and the dev-log proof) were then written from the components and their unit tests, and **confirmed by this file's
 * own lane runs** the same day: two consecutive runs, 11 passed each (`E:\Coding\.tmp\s2-lead-apitokens-4.log`,
 * `-5.log`). Those runs also corrected four expectations the probe had not reached, each now pinned as measured: the
 * expiry word is printed twice (an `aria-hidden` caption and the `sr-only` legend that names the fieldset); the
 * name note is judged on submit only, so a refusal stays on screen while a good name is typed; the open dialog hides
 * the page behind it, so only its own `Create token` is offered; and a stub that kept the created secret in its list
 * put that secret into the re-read the dev log records (the real API never lists it, `user-api-token.schema.ts:16`),
 * so this file's store keeps the token without it. `E2E_REUSE_SERVERS=1` was never needed by this file: it starts no
 * server.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's own mock answers exactly one route of this page — `GET /api/user-api-tokens/config` →
 * `{ enabled: true }` (`cypress/support/mock-gauzy-server.mjs:877`). Test 1 runs with no stub at all and pins that, plus
 * the mock's catch-all for the list read: `return pagination([])` (`:895`, `pagination` at `:9`) = `{ items: [], total: 0 }`,
 * which `userApiTokensService.list` (`core/services/client/api/users/user-api-tokens.service.ts:26-30`) validates
 * against `userApiTokenListSchema` (`core/types/schemas/user/user-api-token.schema.ts:26-29`) and hands the page as
 * "no tokens". The NextAuth stub of the fixture and the app's own shell are the lane's, as in every lane-a file.
 *
 * **Served by this file:** everything else, with `page.route` on the mock origin (the pattern of
 * `suites/mock/labels.spec.ts:39-92`): the switch when it is off or failing, every list, the create answer (only it
 * carries a secret) and every revoke answer. The mock cannot serve them: it has no list, create or revoke handler, so a
 * create there would be answered with the body it was sent (`:894`) — which has no `token` field and would fail
 * `createdUserApiTokenSchema` (`:32-34`) — and a revoke with `{ affected: 1, raw: [] }` (`:893`). Every served answer
 * restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`), because the page
 * sits on `localhost:3031` and the API on `127.0.0.1:3992`; without it the browser throws the answer away. `route.fetch()`
 * is never called, so `mock.calls('/user-api-tokens')` is empty in every stubbed test — which is the witness that the
 * page acted on this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's own route twins.** Measured in `probe-1.log` P1: the only
 * `user-api-tokens` calls the browser made were `GET http://127.0.0.1:3992/api/user-api-tokens/config` and
 * `GET http://127.0.0.1:3992/api/user-api-tokens`, the mock logged both 200, and the app-origin calls of that load were
 * `/api/auth/session`, `/api/health` and `POST /api/log` only. That is the lane's wiring, not an accident
 * (`playwright/test-servers.ts:104-110` + `core/constants/config/constants.tsx` `GAUZY_API_BASE_SERVER_URL` +
 * `core/services/client/axios.ts` base `<mock origin>/api`, spelled out in `suites/lane-a/README.md:63-72`), and it means
 * `app/api/user-api-tokens/route.ts`, `[id]/route.ts` and `config/route.ts` — proxy mode — are **not** in this file's
 * path; they are pinned by `suites/api` and by `suites/lane-a/gauzy-refusals.spec.ts:276-283`.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/settings/pages/api-tokens/api-tokens-settings-page.tsx`: the switch decides the whole body —
 *   skeleton `:149-152`, `AVAILABILITY_FAILED_TITLE` + `LIST_FAILED_TEXT` + `RETRY` when the question failed
 *   (`:153-166`), `UNAVAILABLE_TITLE` + `UNAVAILABLE_TEXT` when it says off (`:168-176`), and only on `enabled` the
 *   token section plus the usage section (`:177-183`). Inside the section: `COUNT` as the section description
 *   (`:87-92`), the create button `disabled` when the ten are reached (`:84`, `:102-105`), the skeleton while the list
 *   loads (`:108`), the list-failure `Notice` with `RETRY` (`:109-120`), the empty card (`EmptyTokens` `:44-68`), one
 *   `ApiTokenRow` per token in sorted order (`:122-128`) and the `LIMIT_REACHED` note (`:129-133`).
 * - `core/components/settings/pages/api-tokens/api-token-row.tsx` `:43-93`: never the secret (its own comment `:42`);
 *   the three facts `CREATED_ON · LAST_USED_ON/NEVER_USED · EXPIRES_ON/EXPIRED_ON/NEVER_EXPIRES` (`:48-52`, `:18-34`),
 *   the name as a `title` (`:59-61`), the `EXPIRED` chip only for an expired token (`:62-66`) and the revoke button
 *   whose accessible name is `Revoke` + the token name (`:81-90`).
 * - `core/components/settings/pages/api-tokens/create-api-token-dialog.tsx`: the form `:116-167` (name `Input` with
 *   `maxLength={USER_API_TOKEN_NAME_MAX_LENGTH}` `:124-135`, its note `:136-141`, the three expiry `ChoiceCards`
 *   `:143-154` built by `expiryOptionsOf` `:60-66` from `expiryDateOf` — `DEFAULT_EXPIRY = '90d'` `:33` —, the failure
 *   `Notice` `:155`, Cancel + submit `:157-165`); `CreatedTokenStep` `:176-194` (secret title, `SECRET_TEXT` with the
 *   name, `ApiTokenSecret`, `DONE` as the only way out); the dialog props `:224-230` (`keepOpenOnOutsideClick`,
 *   `dismissible={!isSecretShown && !isCreating}`) and `close()` `:214-221`, which forgets the answer.
 * - `core/components/settings/pages/api-tokens/api-token-secret.tsx` `:37-119`: read-only field `:95-104`, copy button
 *   named by `COPY_TOKEN` `:105-114`, outcome announced in an `<output>` outside the button `:116`.
 * - `core/components/settings/pages/api-tokens/revoke-api-token-dialog.tsx` `:18-66`: the question through
 *   `ConfirmDestructiveDialog` (`core/components/settings/kit/danger.tsx:67-190`, footer `:163-181`), a failure keeping
 *   the question open with `REVOKE_FAILED` under it (`:41`, `:49-52`), nothing closing it while the revoke runs
 *   (`:23-29`).
 * - `core/components/settings/pages/api-tokens/api-token-usage-section.tsx` `:8-34`: the curl block is
 *   `exchangeUrlOf(publicApiOriginOrPlaceholder())` (`core/lib/utils/user-api-tokens.ts:112-114`
 *   + `core/lib/utils/public-api-origin.ts:9-11`), which on this lane is the mock's own origin.
 * - `core/hooks/settings/use-user-api-tokens.ts`: availability `:47-66` (a 404 is `disabled`, anything else that failed
 *   is `error`), its retry rule `:69-76`, `createFailureOf` `:78-88` (404 → `DISABLED`, a 400 whose message matches
 *   `/tokens at once/i` → `LIMIT_REACHED`, else `FAILED`; the unit test `core/hooks/settings/use-user-api-tokens.test.ts:58-64`
 *   pins the same map), the list `:127-141`, the clock `:150-162`, create `:168-179` (`gcTime: 0`, `handlesOwnError`,
 *   the list invalidated when it settles) and revoke `:182-195` (the row leaves the cache at once, then the list is read
 *   again).
 * - `core/services/client/api/users/user-api-tokens.service.ts`: `readConfig` `:20-23`, `list` `:26-30`, `create`
 *   `:33-36` — `:34` posts with `{ secretResponse: true }` — and `revoke` `:39-41` (a `DELETE` of
 *   `/user-api-tokens/<id>`). `core/services/client/api.service.ts:400-417` is what that flag buys: the answer's entry is
 *   logged with `data: '[not logged]'` instead of the body (`:403`, `:408`).
 * - `core/lib/utils/user-api-tokens.ts`: `MAX_ACTIVE_USER_API_TOKENS = 10` `:9`, the working count `:35-37`, the create
 *   gate `:39-41`, the name problem `:61-69`, the expiry states `:72-80`, the last use `:82-87`, `formatUserApiTokenDate`
 *   `:89-95` (`Intl.DateTimeFormat(locale, { dateStyle: 'medium' })`), the order `:98-108` (working newest first, then
 *   the expired ones latest-first) and `expiryDateOf` `:119-127`.
 * - The settings sidebar's own read of the same switch: `core/hooks/settings/use-hidden-settings-entries.ts:18-21`,
 *   `:38-46` (`apiTokens` is hidden unless `enabled`), entry `core/components/settings/kit/settings-entries.ts:72`.
 *
 * ## What the probe measured, per case (probe-1.log; the assertions are pinned on these)
 *
 * - **The lane as it is** (P1): the mock logged `GET /api/user-api-tokens/config 200` and `GET /api/user-api-tokens 200`;
 *   the section read `Your tokens Create token No API tokens yet Create one token for each script, so that you can
 *   revoke one without touching the others. Create token` — **two** `Create token` buttons (the section's action and the
 *   empty card's), no `COUNT` line; the usage block's `<code>` was exactly the three curl lines naming
 *   `http://127.0.0.1:3992/api/auth/api-token/exchange`; the sidebar listed `API tokens` once; **1** config read and
 *   **1** list read for the load (the section and the sidebar share the query key), and the page's console was empty.
 * - **Switch off** (P2): with `{ enabled: false }` served, the page read `API tokens are not offered here / This server
 *   does not have personal API tokens on. Ask your administrator if you need one.`, there was **no** `#api-tokens` and no
 *   `#api-token-usage` element, **0** `Create token` buttons, **one** call in total (`GET …/config`) and no list read at
 *   all, the mock heard nothing, and the sidebar's `API tokens` link count was **0** — the entry goes away with the switch.
 * - **Switch failing** (P3, measured, pinned without counts): `{enabled:…}` replaced by a 500 → `Whether this server
 *   offers API tokens could not be read` with `Check your connection, then try again.` and a `Try again` button, no
 *   `#api-tokens`. The probe recorded 3 config reads (`use-user-api-tokens.ts:69-76` retries while `failureCount < 2`);
 *   like `suites/lane-a/security-two-factor-ui.spec.ts:210-220`, the count of a *failed* read is not stable across
 *   mounts, so this file pins the copy and the absence of a list read, never the count.
 * - **A list read failing** (P4): a 502 on the list → `Your API tokens could not be read / Check your connection, then
 *   try again.` with a `Try again` button, while the usage section stayed on screen (`api-tokens-settings-page.tsx:177-183`
 *   renders both once the switch said yes).
 * - **A served list of three** (P5): rows came back in the order `Probe newest` (created Nov 21 2026, last used
 *   Nov 23 2026, expires Jan 23 2027), `Probe older never-ending` (created Nov 4 2026, `Never used`, `Never expires`),
 *   `Probe expired` **with its `Expired` chip** (created Oct 15 2026, last used Nov 15 2026, `Expired Nov 19 2026`), the
 *   section description read `2 of 10 working tokens` (the expired one is not counted, `:35-37`), each row's button read
 *   `Revoke <name>`, and the dates matched `Intl.DateTimeFormat('en', { dateStyle: 'medium' })` of the served ISO
 *   strings to the character.
 * - **The create form and its validation** (P6, P11): the dialog is `Create an API token`, its name field is
 *   `maxlength="100"`, `autocomplete="off"`, `aria-describedby` set to the note's id and carries no `type` attribute; the
 *   expiry fieldset read `Expires In 90 days On Feb 22, 2027 In 1 year On Nov 24, 2027 Never Works until you revoke it.`
 *   with the radios `90d` checked and `1y`/`never` not; its footer buttons were `Cancel` and `Create token`. Submitting
 *   with an empty name put `Give the token a name.` in the note (`NAME_HINT` gone, `aria-invalid="true"`) and sent
 *   **no** `POST`. Filling 101 characters left exactly **100** in the field — the `maxLength` is what stops a too-long
 *   name, so `NAME_TOO_LONG` is unreachable through this field (see the note under Findings). After the refused empty
 *   name the note kept `Give the token a name.` and `aria-invalid="true"` while the 100 characters sat in the field:
 *   the dialog judges the name on submit only (`create-api-token-dialog.tsx:85-93`; its `onChange` only stores it,
 *   `:127`), measured in this file's own runs.
 *   `Cancel` closes the dialog and sent nothing but the page's own two reads. A create the API refused showed
 *   `The token could not be created. Try again.` inside the still-open form, added no row, and showed no secret screen.
 * - **Ten working tokens** (P11): the section read `10 of 10 working tokens`, the single `Create token` button was
 *   `disabled`, and 3 tokens put it back (`createDisabled: false`, `3 of 10 working tokens`).
 * - **Revoke** (P8): the question read `Revoke “Drop me”? Scripts can no longer trade this token for access; access they
 *   already hold ends within an hour. This cannot be undone.` with `Cancel` and `Revoke token`; `Cancel` closed it and
 *   sent **no** `DELETE` (the only calls were the load's two reads); confirming sent
 *   `DELETE http://127.0.0.1:3992/api/user-api-tokens/<id>` — the id the row was built from, no `/api` prefix
 *   rewriting, on the mock origin — and the list was read again (`… GET config, GET list, DELETE …/<id>, GET list`).
 * - **A revoke that fails** (P9): a 500 answer left the question open with `The token could not be revoked. Try again.`
 *   as its `role="alert"`, kept the row, and raised **no** app fallback toast (`toasts.MUTATION_FAILED` appeared 0 times)
 *   because the mutation says it handles its own error (`use-user-api-tokens.ts:189`,
 *   `core/components/common/mutation-error-toaster.tsx:22-30`) — only the dev-only `DEV Mutation failed … Copy details`
 *   toast of `core/components/common/dev-error-toaster.tsx:17` sat beside it.
 * - **One read pair per load**: in every probe load that reached the section the browser sent exactly 1 config read and
 *   1 list read (`P1`, `P5`, `P8`, `P9`, `P12`), the switch answer being shared with the sidebar (`staleTime` 5 min /
 *   15 s, `use-user-api-tokens.ts:117`, `:133`). Pinned below; a *failed* read is excluded from that rule (P3).
 *
 * ## Findings
 *
 * - **`NAME_TOO_LONG` is unreachable through the create field** (reachability note, not a defect): the copy
 *   `settings.apiTokens.NAME_TOO_LONG` (`locales/en.json:5812`) and the branch that renders it
 *   (`create-api-token-dialog.tsx:35-40` over `userApiTokenNameProblem` `core/lib/utils/user-api-tokens.ts:61-69`)
 *   exist, and the field carries `maxLength={USER_API_TOKEN_NAME_MAX_LENGTH}` (`:128`, the same 100 as
 *   `user-api-token.schema.ts:4`), so a browser cannot type a name long enough to earn that sentence — measured: 101
 *   characters typed, 100 kept, no problem shown. No comment, type, unit test or copy states a different intent (the
 *   dialog's unit test only pins `NAME_REQUIRED`, `create-api-token-dialog.test.tsx:114`), so this is written as what
 *   the field does, not as a bug; the branch is reachable only from a caller that does not cap the input.
 * - **A refused create or revoke is logged as a console error by the dev tools even though the page explains it**
 *   (dev-only, by design of those tools): `mutation-error-toaster.tsx:43-45` prints `Mutation failed: …` for *every*
 *   failed mutation before its `handlesOwnError` check at `:46`, and `core/services/client/api.service.ts` `logError`
 *   prints `[ERROR] [HttpClient] HTTP Error: <verb> <url> <status>` for any non-2xx it cannot be told to expect. Both
 *   lines are excluded from this file's console assertions by their exact text (`DEV_MUTATION_NOISE`, `armedHttpError`),
 *   printed in every `MEASURE` line, and every other console error still fails this file. Neither is a page defect: the
 *   person's copy is the dialog's own, and the app's fallback toast stayed silent, which is also asserted.
 * - `core/components/settings/pages/api-tokens/api-tokens-settings-page.tsx:70` says the tokens are "asked for only
 *   once the server offers them" — measured true (P2: no list read at all when the switch says off).
 *
 * ## What this file does not cover
 *
 * - Proxy mode: `app/api/user-api-tokens/**` (its 415 for a non-JSON POST, its 400 body
 *   "A name of 1 to 100 characters and an expiry of 90d, 1y or never are required", its `no-store` on a create answer
 *   and `refuseForeignOrigin`) is not in this lane's browser path — see "Which layer is real".
 * - The server's own rules: no real Gauzy here, so the eleventh-token refusal is *imitated* (a 400 whose message
 *   matches `/tokens at once/i`, `use-user-api-tokens.ts:37`) rather than measured, and `GET /api/auth/api-token/exchange`
 *   — the route the usage block tells a script to call — is never called by this page and is pinned by `suites/api`.
 * - The clock: `useUserApiTokensClock` (`:150-162`) is only observed at its start. A token ending while the page is
 *   open (Create coming back without a reload) would need a served `expiresAt` inside the test's own window; every
 *   served date here is days away, deliberately.
 * - The copy button's outcome (clipboard granted vs refused vs absent, `api-token-secret.tsx:60-74`): test 7 clicks Copy
 *   and **reports** the counts right after the click instead of pinning one (the runs printed `done: 0, failed: 0` with
 *   one `<output>` present); the unit tests of that component (`api-token-secret.test.tsx:31-79`) already pin all
 *   three outcomes against a faked clipboard.
 * - A token whose secret was already lost: reload cannot bring it back (`gcTime: 0`, `:174`) — asserted in test 7 as the
 *   secret being absent from the DOM after `Done`, not as a reload study. (Escape and an outside click while the secret
 *   is shown, `:224-230`, are pinned in test 7 and held in both runs.)
 * - The `<title>`-based row locators read the name span (`api-token-row.tsx:59-61`); a name that truncates in the
 *   layout is not measured.
 *
 * ## Secrets
 *
 * The secret this file serves is its own random value; it is never printed. Every place it is checked is compared for
 * equality or containment and reported as a boolean, a length or a count, and `grep -c` of that value in the run logs is
 * 0. The dev-log entries of a signed-in page carry that page's own `Authorization: Bearer …` (finding 8 of
 * `suites/lane-b/dev-log-route.spec.ts`); this file never reads or prints a header value, only `details.data`.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const API_TOKENS_PATH = '/settings/personal/api-tokens';
const TOKENS_ROUTE = '/api/user-api-tokens';
const CONFIG_ROUTE = '/api/user-api-tokens/config';
const EXCHANGE_ROUTE = '/api/auth/api-token/exchange';

/** `locales/en.json` again: `settings.apiTokens` `:5785-5840`, `settings.entries.apiTokens` `:4699-4702`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	settings: { apiTokens: Record<string, string>; entries: { apiTokens: { TITLE: string } } };
};
const T = EN.settings.apiTokens;
const PAGE_TITLE = EN.settings.entries.apiTokens.TITLE; // API tokens
/** `COUNT` = "{count} of {max} working tokens", `LIMIT_REACHED` = "You hold {max} working tokens, …". */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a api-tokens] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** `TUserApiToken` (`user-api-token.schema.ts:17-23`) as this file serves it. */
type ServedToken = {
	id: string;
	name: string;
	createdAt: string;
	expiresAt: string | null;
	lastUsedAt: string | null;
};

type Refusal = { status: number; message: string };
type CreateAnswer = { token?: ServedToken & { token: string }; refusal?: Refusal };
type RevokeAnswer = { status: number; message?: string };

type ServedCall = { method: string; path: string; body: string | null; url: string; contentType: string };

type TokensHarness = {
	calls: ServedCall[];
	/** The tokens this file's fake server holds; a create adds, a revoke removes. */
	items: ServedToken[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	revokePathOf: (id: string) => string;
};

/**
 * This file's stand-in for the token API, on the mock origin, because the mock has no handler for any of it (see the
 * header). The list answer is always the current store, so a revoke can be followed by a re-read that no longer lists
 * the token — which is the only way "the row is gone" can be told apart from "the server still says it exists".
 */
type ServedScript = {
	enabled: boolean;
	items: ServedToken[];
	/** Set instead of `enabled: true` when this file wants the switch itself to fail. */
	configRefusal?: Refusal;
	create?: CreateAnswer;
	revoke?: RevokeAnswer;
};

async function serveApiTokens(page: Page, initial: ServedScript): Promise<TokensHarness> {
	const store = { enabled: initial.enabled, items: [...initial.items] };
	const calls: ServedCall[] = [];
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(TOKENS_ROUTE);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const pathname = new URL(request.url()).pathname;
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({
			method,
			path: pathname,
			body: request.postData(),
			url: request.url(),
			contentType: String(request.headers()['content-type'] ?? '')
		});
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});

		if (pathname === CONFIG_ROUTE) {
			if (initial.enabled === true) {
				return answer(200, { enabled: true });
			}
			const refusal = initial.configRefusal;
			if (refusal) {
				return answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
			}
			return answer(200, { enabled: false });
		}
		if (pathname === TOKENS_ROUTE && method === 'GET') {
			return answer(200, { items: store.items, total: store.items.length });
		}
		if (pathname === TOKENS_ROUTE && method === 'POST') {
			const created = initial.create?.token;
			if (!created) {
				const refusal = initial.create?.refusal ?? {
					status: 599,
					message: 'this file scripted no create answer'
				};
				return answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
			}
			// Gauzy answers the secret this once and never lists it (`user-api-token.schema.ts:16`), so the store keeps the
			// token without it; a store that kept it put the secret into the re-read the dev log records (measured once)
			const listed: ServedToken = {
				id: created.id,
				name: created.name,
				createdAt: created.createdAt,
				expiresAt: created.expiresAt,
				lastUsedAt: created.lastUsedAt
			};
			store.items = [...store.items, listed];
			return answer(201, created);
		}
		const revokedId = pathname.startsWith(`${TOKENS_ROUTE}/`) ? pathname.slice(TOKENS_ROUTE.length + 1) : '';
		if (revokedId) {
			const refusal = initial.revoke;
			if (refusal && refusal.status >= 400) {
				// a refused revocation removes nothing: the re-read must still list the token
				return answer(refusal.status, {
					statusCode: refusal.status,
					message: refusal.message ?? 'this file refused the revocation'
				});
			}
			store.items = store.items.filter((token) => token.id !== revokedId);
			return answer(204);
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${pathname}` });
	});

	return {
		calls,
		get items() {
			return store.items;
		},
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.body === null ? '' : ` ${call.body}`}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		revokePathOf: (id) => `${TOKENS_ROUTE}/${id}`
	};
}

/** Only records: what the browser really sent, split by origin. Nothing is answered here. */
function recordBrowserCalls(page: Page) {
	const mockCalls: ServedCall[] = [];
	const appCalls: ServedCall[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		const entry = {
			method: request.method(),
			path: url.pathname,
			body: request.postData(),
			url: request.url(),
			contentType: String(request.headers()['content-type'] ?? '')
		};
		if (url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(TOKENS_ROUTE)) mockCalls.push(entry);
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/')) appCalls.push(entry);
	});
	return { mockCalls, appCalls };
}

/**
 * The page's own dev-log traffic: every `POST /api/log` body the app sent (copied from
 * `suites/lane-b/dev-log-route.spec.ts:806-857`, which is where those entries are pinned). `🚀 Request:` and
 * `✅ Response:` are `api.service.ts:387-395` and `:400-417`; the posting is `core/services/logs/logger-client.ts:41`.
 */
type LogPost = { message?: string; context?: string; level?: string; details?: Record<string, unknown> };

function watchLog(page: Page) {
	const posts: LogPost[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (request.method() === 'POST' && url.origin === APP_ORIGIN && url.pathname === '/api/log') {
			try {
				posts.push(JSON.parse(String(request.postData())) as LogPost);
			} catch {
				posts.push({ message: `(unparseable body) ${String(request.postData()).slice(0, 120)}` });
			}
		}
	});
	const byPrefix = (prefix: string) => posts.filter((post) => String(post.message ?? '').startsWith(prefix));
	return {
		posts,
		requests: () => byPrefix('🚀 Request:'),
		responses: () => byPrefix('✅ Response:'),
		/** Consecutive quiet rounds, so a page that has not started yet is not mistaken for a settled one. */
		settle: async (quietRounds = 10, maxRounds = 48) => {
			let previous = -1;
			let quiet = 0;
			for (let attempt = 0; attempt < maxRounds && quiet < quietRounds; attempt += 1) {
				quiet = posts.length === previous ? quiet + 1 : 0;
				previous = posts.length;
				await page.waitForTimeout(250);
			}
		}
	};
}

const named = (fragment: string) => (post: LogPost) => String(post.message ?? '').includes(fragment);

/** React's dev-mode store warning, not this page's (see `security-two-factor-ui.spec.ts:226-233`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

const PAGE_DESCRIPTION = T.PAGE_DESCRIPTION;
const EXCHANGE_URL = `${MOCK_ORIGIN}${EXCHANGE_ROUTE}`; // publicApiOriginOrPlaceholder() on this lane
const CURL_BLOCK = [
	`curl -X POST ${EXCHANGE_URL} \\`,
	'  -H "Content-Type: application/json" \\',
	`  -d '{"token": "YOUR_TOKEN"}'`
].join('\n');

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A served date at local noon, so a rendered `dateStyle: 'medium'` value cannot straddle midnight. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};
const shownDate = (iso: string) => new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
/** `expiryDateOf` (`user-api-tokens.ts:119-127`), recomputed here the same way it is computed there. */
const expiryIso = (expiry: '90d' | '1y', from: Date) =>
	new Date(from.getTime() + (expiry === '90d' ? 90 : 365) * 86_400_000).toISOString();
const tokenOf = (id: string, name: string, overrides: Partial<ServedToken> = {}): ServedToken => ({
	id,
	name,
	createdAt: dayIso(-30),
	expiresAt: dayIso(60),
	lastUsedAt: null,
	...overrides
});
const secretOf = () => `at-${Math.random().toString(36).slice(2, 12)}-${Math.random().toString(36).slice(2, 14)}`;

const section = (page: Page, id: string) => page.locator(`#${id}`);
const text = (scope: Page | Locator, value: string) => scope.getByText(value, { exact: true });
const rowNames = async (page: Page) =>
	page.locator('#api-tokens [title]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title')));
const createButtons = (page: Page) => page.getByRole('button', { name: T.CREATE, exact: true });
const settingsNavEntry = (page: Page) =>
	page
		.getByRole('navigation', { name: 'Settings', exact: true })
		.getByRole('link', { name: PAGE_TITLE, exact: true });
const dialogOf = (page: Page) => page.getByRole('dialog');
/** The dev-only `DEV Query failed …` / `DEV Mutation failed …` toast of `dev-error-toaster.tsx:17-18`. */
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const sectionHeading = (page: Page) => page.getByRole('heading', { level: 2, name: T.SECTION_TOKENS, exact: true });

const openCreateDialog = async (page: Page) => {
	await createButtons(page).first().click();
	const dialog = dialogOf(page);
	await expect(dialog, 'the create dialog never opened').toBeVisible();
	return dialog;
};
const submitIn = (dialog: ReturnType<typeof dialogOf>) => dialog.getByRole('button', { name: T.CREATE, exact: true });

test.describe('lane-a · Settings › Personal › API tokens: what the page shows and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------- 1. the lane as it is: the mock's switch, the mock's empty page

	test('1 · the mock has the switch on and no token: the empty card, the script note, and who answered what', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, API_TOKENS_PATH);

		await expect(
			page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true }),
			'Settings › API tokens rendered no page title'
		).toBeVisible({ timeout: 25_000 });
		await expect(text(page, PAGE_DESCRIPTION)).toBeVisible();

		// pagination([]) (mock-gauzy-server.mjs:895) → userApiTokenListSchema → EmptyTokens (api-tokens-settings-page.tsx:44-68)
		await expect(text(page, T.EMPTY_TITLE)).toBeVisible();
		await expect(text(page, T.EMPTY_TEXT)).toBeVisible();
		await expect(section(page, 'api-tokens')).toBeVisible();
		await expect(sectionHeading(page)).toBeVisible();
		await expect(createButtons(page), 'the section action and the empty card both offer Create').toHaveCount(2);
		await expect(text(page, filled('COUNT', { count: 0, max: 10 })), 'an empty list drew a count line').toHaveCount(
			0
		);
		await expect(text(page, T.UNAVAILABLE_TITLE), 'the mock says the tokens are on').toHaveCount(0);

		// api-token-usage-section.tsx:8-34 over exchangeUrlOf (user-api-tokens.ts:112-114)
		await expect(section(page, 'api-token-usage')).toBeVisible();
		await expect(text(page, T.USAGE_TITLE)).toBeVisible();
		await expect(text(page, T.USAGE_EXCHANGE)).toBeVisible();
		await expect(text(page, T.USAGE_CALL)).toBeVisible();
		const curl = await section(page, 'api-token-usage').locator('code').innerText();
		expect(flat(curl), 'the curl block names the API this lane calls').toBe(flat(CURL_BLOCK));

		// one read pair per load, and both answered by the mock
		await expect
			.poll(async () => calls.mockCalls.map((call) => `${call.method} ${call.path}`).join(','), {
				timeout: 15_000
			})
			.toBe(`GET ${CONFIG_ROUTE},GET ${TOKENS_ROUTE}`);
		expect(
			calls.appCalls.filter((call) => call.path.startsWith(TOKENS_ROUTE)),
			'the browser went to a Next route'
		).toEqual([]);
		const logged = await mock.calls('/user-api-tokens');
		expect(
			logged.map((request) => [request.method, request.path, request.status]),
			'the mock answered the switch and an empty page'
		).toEqual([
			['GET', CONFIG_ROUTE, 200],
			['GET', TOKENS_ROUTE, 200]
		]);
		await expect(settingsNavEntry(page), 'the sidebar hides API tokens only when the switch says off').toHaveCount(
			1
		);

		report('mock-as-it-is', {
			browserMockCalls: calls.mockCalls.map((call) => `${call.method} ${call.path}`),
			appTokenCalls: calls.appCalls.filter((call) => call.path.startsWith(TOKENS_ROUTE)).length,
			mockLogged: logged.map((request) => `${request.method} ${request.path} ${request.status}`),
			emptyTitle: await text(page, T.EMPTY_TITLE).count(),
			createButtons: await createButtons(page).count(),
			usageUrlNamed: curl.includes(EXCHANGE_URL),
			navEntry: await settingsNavEntry(page).count(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 2. the switch off, and the switch failing

	test('2 · the switch says off: an unavailability notice, no token read at all, and no entry in the sidebar', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const served = await serveApiTokens(page, { enabled: false, items: [] });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);

		// availability 'disabled' → Notice(UNAVAILABLE_TITLE) (api-tokens-settings-page.tsx:168-176)
		await expect(text(page, T.UNAVAILABLE_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(text(page, T.UNAVAILABLE_TEXT)).toBeVisible();
		await expect(text(page, T.EMPTY_TITLE), 'a server that has no tokens was offered an empty card').toHaveCount(0);
		await expect(
			text(page, T.SECTION_TOKENS),
			'the token section was drawn against a switch that said off'
		).toHaveCount(0);
		await expect(
			section(page, 'api-token-usage'),
			'the usage note was drawn against a switch that said off'
		).toHaveCount(0);
		await expect(createButtons(page), 'Create was offered although the server has no tokens').toHaveCount(0);

		await expect.poll(() => served.shapes(), { timeout: 15_000 }).toEqual([`GET ${CONFIG_ROUTE}`]);
		expect(served.countOf('GET', TOKENS_ROUTE), 'a list was read even though the switch said off').toBe(0);
		expect((await mock.calls('/user-api-tokens')).length, 'the mock heard a call this file answered').toBe(0);
		await expect(settingsNavEntry(page), 'the sidebar still listed API tokens').toHaveCount(0);

		report('switch-off', {
			calls: served.shapes(),
			mockLogged: (await mock.calls('/user-api-tokens')).length,
			navEntry: await settingsNavEntry(page).count(),
			createButtons: await createButtons(page).count(),
			sections: {
				tokens: await section(page, 'api-tokens').count(),
				usage: await section(page, 'api-token-usage').count()
			},
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	test('3 · the switch could not be read: the availability notice with a retry, and still no token read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const refusal = { status: 500, message: 'this file refused the switch' };
		const served = await serveApiTokens(page, { enabled: false, items: [], configRefusal: refusal });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);

		// availability 'error' → Notice(AVAILABILITY_FAILED_TITLE + LIST_FAILED_TEXT + RETRY) (api-tokens-settings-page.tsx:153-166)
		await expect(text(page, T.AVAILABILITY_FAILED_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(text(page, T.LIST_FAILED_TEXT)).toBeVisible();
		await expect(
			page.getByRole('button', { name: T.RETRY, exact: true }),
			'the failed switch offered no retry'
		).toHaveCount(1);
		await expect(
			section(page, 'api-tokens'),
			'the token section was drawn against a switch that never answered'
		).toHaveCount(0);
		await expect(section(page, 'api-token-usage')).toHaveCount(0);

		await expect.poll(() => served.countOf('GET', TOKENS_ROUTE), { timeout: 10_000 }).toBe(0);
		expect((await mock.calls('/user-api-tokens')).length, 'the mock heard a call this file answered').toBe(0);

		report('switch-failed', {
			configReads: served.countOf('GET', CONFIG_ROUTE),
			listReads: served.countOf('GET', TOKENS_ROUTE),
			// not pinned: a failed read is retried while failureCount < 2 (use-user-api-tokens.ts:69-76)
			devToasts: (await devToasts(page).allInnerTexts()).length,
			consoleErrors: shield.consoleErrors()
		});
		// the client logs a status it was not told to expect (api.service.ts logError); only that line is excused
		expect(
			consoleFindings(shield, [armedHttpError('GET', '/user-api-tokens/config', 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------- 4. a served list: rows, order, facts, count

	test('4 · a served list of three: working newest first, the expired one marked and last, and what each row says', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const newestCreated = dayIso(-3);
		const newestUsed = dayIso(-1);
		const newestEnds = dayIso(60);
		const neverCreated = dayIso(-20);
		const expiredCreated = dayIso(-40);
		const expiredUsed = dayIso(-9);
		const expiredEnds = dayIso(-5);
		const newest = tokenOf('aaaa0000-0000-4000-8000-000000000001', 'Probe newest', {
			createdAt: newestCreated,
			lastUsedAt: newestUsed
		});
		const never = tokenOf('aaaa0000-0000-4000-8000-000000000002', 'Probe older never-ending', {
			createdAt: neverCreated,
			expiresAt: null,
			lastUsedAt: null
		});
		const expired = tokenOf('aaaa0000-0000-4000-8000-000000000003', 'Probe expired', {
			createdAt: expiredCreated,
			expiresAt: expiredEnds,
			lastUsedAt: expiredUsed
		});
		const served = await serveApiTokens(page, { enabled: true, items: [never, expired, newest] });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);

		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });
		// sortUserApiTokens (user-api-tokens.ts:98-108): working newest first, then the expired latest-first
		await expect
			.poll(() => rowNames(page), { timeout: 15_000 })
			.toEqual(['Probe newest', 'Probe older never-ending', 'Probe expired']);
		// COUNT counts only working tokens (api-tokens-settings-page.tsx:87-92 over user-api-tokens.ts:35-37)
		await expect(text(page, filled('COUNT', { count: 2, max: 10 }))).toBeVisible();

		const rows = page.locator('#api-tokens');
		// the row lines exactly as probe P5 printed them, dates recomputed the way formatUserApiTokenDate does
		const rowsText = flat(await section(page, 'api-tokens').innerText());
		expect(rowsText, 'the working rows and their facts are not what the probe measured').toContain(
			`Probe newest Created ${shownDate(newestCreated)} · Last used ${shownDate(newestUsed)} · Expires ${shownDate(newestEnds)} Revoke Probe newest`
		);
		expect(rowsText, 'the never-ending row lost its Never copies').toContain(
			`Probe older never-ending Created ${shownDate(neverCreated)} · Never used · Never expires Revoke Probe older never-ending`
		);
		expect(rowsText, 'the expired row is not marked and last as the probe measured it').toContain(
			`Probe expired Expired Created ${shownDate(expiredCreated)} · Last used ${shownDate(expiredUsed)} · Expired ${shownDate(expiredEnds)} Revoke Probe expired`
		);
		await expect(text(page, T.EXPIRED), 'the expired token carried no Expired chip').toHaveCount(1);
		await expect(rows.getByRole('button', { name: `${T.REVOKE} Probe newest` })).toHaveCount(1);
		await expect(rows.getByRole('button', { name: `${T.REVOKE} Probe older never-ending` })).toHaveCount(1);
		await expect(rows.getByRole('button', { name: `${T.REVOKE} Probe expired` })).toHaveCount(1);
		await expect(section(page, 'api-token-usage')).toBeVisible();
		await expect(text(page, T.EMPTY_TITLE), 'a list of three drew the empty card').toHaveCount(0);
		await expect(text(page, filled('LIMIT_REACHED', { max: 10 })), 'three tokens reached the limit').toHaveCount(0);

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${CONFIG_ROUTE}`, `GET ${TOKENS_ROUTE}`]);
		expect((await mock.calls('/user-api-tokens')).length, 'the mock heard a call this file answered').toBe(0);

		report('served-list', {
			order: await rowNames(page),
			rowCount: await rows.locator('[title]').count(),
			countCopy: await text(page, filled('COUNT', { count: 2, max: 10 })).count(),
			expiredChips: await text(page, T.EXPIRED).count(),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 5. the create form, its fields, its validation, its cancel

	test('5 · the create dialog: its name field, its three expiry cards, and the two ways it refuses before sending', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveApiTokens(page, { enabled: true, items: [] });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });

		const dialog = await openCreateDialog(page);
		await expect(dialog.getByRole('heading', { name: T.CREATE_TITLE, exact: true })).toBeVisible();
		await expect(text(dialog, T.NAME_LABEL)).toBeVisible();
		await expect(text(dialog, T.NAME_HINT)).toBeVisible();
		// the word is printed twice: an `aria-hidden` caption and the `sr-only` legend that names the fieldset
		await expect(dialog.getByRole('group', { name: T.EXPIRY_LEGEND, exact: true })).toBeVisible();
		await expect(text(dialog, T.EXPIRY_LEGEND)).toHaveCount(2);

		const nameField = dialog.locator('input').first();
		const field = await nameField.evaluate((node) => {
			const input = node as HTMLInputElement;
			return {
				maxLength: input.getAttribute('maxlength'),
				autocomplete: input.getAttribute('autocomplete'),
				hasDescribedBy: Boolean(input.getAttribute('aria-describedby')),
				typeAttribute: input.getAttribute('type'),
				valueLength: input.value.length
			};
		});
		expect(field, 'the name field is not the one create-api-token-dialog.tsx:124-135 builds').toEqual({
			maxLength: '100',
			autocomplete: 'off',
			hasDescribedBy: true,
			typeAttribute: null,
			valueLength: 0
		});

		// DEFAULT_EXPIRY '90d' (:33) and expiryOptionsOf (:60-66) over expiryDateOf (user-api-tokens.ts:119-127)
		const openedAt = new Date();
		const radios = await dialog.locator('input[type=radio]').evaluateAll((nodes) =>
			nodes.map((node) => {
				const radio = node as HTMLInputElement;
				return { value: radio.value, checked: radio.checked };
			})
		);
		expect(radios, 'the expiry cards are not the three the dialog builds').toEqual([
			{ value: '90d', checked: true },
			{ value: '1y', checked: false },
			{ value: 'never', checked: false }
		]);
		await expect(text(dialog, T.EXPIRY_90D)).toBeVisible();
		await expect(text(dialog, T.EXPIRY_1Y)).toBeVisible();
		await expect(text(dialog, T.EXPIRY_NEVER)).toBeVisible();
		await expect(text(dialog, T.EXPIRY_NEVER_DETAIL)).toBeVisible();
		await expect(
			text(dialog, filled('EXPIRY_ON_DATE', { date: shownDate(expiryIso('90d', openedAt)) }))
		).toBeVisible();
		await expect(
			text(dialog, filled('EXPIRY_ON_DATE', { date: shownDate(expiryIso('1y', openedAt)) }))
		).toBeVisible();
		await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(1);

		// an empty name: the note changes and nothing is sent (userApiTokenNameProblem, user-api-tokens.ts:61-69)
		await submitIn(dialog).click();
		await expect(text(dialog, T.NAME_REQUIRED)).toBeVisible();
		await expect(text(dialog, T.NAME_HINT), 'the hint stayed under a name the form refused').toHaveCount(0);
		await expect(nameField).toHaveAttribute('aria-invalid', 'true');
		expect(served.countOf('POST', TOKENS_ROUTE), 'a name the form refused still reached the API').toBe(0);

		// 101 typed characters: maxLength keeps 100, so the NAME_TOO_LONG sentence is never earned through this field
		const tooLong = 'x'.repeat(101);
		await nameField.fill(tooLong);
		expect(
			await nameField.evaluate((node) => (node as HTMLInputElement).value.length),
			'the field kept more than the 100 it allows'
		).toBe(100);
		await expect(
			text(dialog, filled('NAME_TOO_LONG', { max: 100 })),
			'a capped field still complained'
		).toHaveCount(0);
		// The note is judged on submit only (`submit`, create-api-token-dialog.tsx:85-93; onChange just stores the name,
		// :127), so typing a good name after a refused one leaves the refusal on screen until the next Create (measured).
		await expect(text(dialog, T.NAME_REQUIRED), 'the refusal note left before the next submit').toHaveCount(1);
		await expect(text(dialog, T.NAME_HINT)).toHaveCount(0);
		await expect(nameField).toHaveAttribute('aria-invalid', 'true');

		await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		expect(served.countOf('POST', TOKENS_ROUTE), 'cancel came with a write').toBe(0);

		report('create-form', {
			nameField: field,
			radios,
			expiryDates: { d90: shownDate(expiryIso('90d', openedAt)), d1y: shownDate(expiryIso('1y', openedAt)) },
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 6. a create the API refuses

	test('6 · a refused create: the dialog explains it, shows no secret and adds no row', async ({
		page,
		fixture,
		shield
	}) => {
		const cases: Array<{ label: string; refusal: Refusal; copyKey: string }> = [
			{
				label: '400 any other 400',
				refusal: {
					status: 400,
					message: 'A name of 1 to 100 characters and an expiry of 90d, 1y or never are required'
				},
				copyKey: 'CREATE_FAILED'
			},
			{
				label: '400 the eleventh token',
				refusal: { status: 400, message: 'You can hold 10 API tokens at once. Revoke one to create another.' },
				copyKey: 'CREATE_LIMIT'
			},
			{ label: '404 no such routes', refusal: { status: 404, message: 'Not Found' }, copyKey: 'CREATE_DISABLED' },
			{
				label: '500',
				refusal: { status: 500, message: 'this file refused the create' },
				copyKey: 'CREATE_FAILED'
			}
		];
		// one page and one console for every case, so each case excuses the HTTP error lines of the cases before it too
		const armedSoFar: string[] = [];
		for (const item of cases) {
			armedSoFar.push(armedHttpError('POST', '/user-api-tokens', item.refusal.status));
			const served = await serveApiTokens(page, { enabled: true, items: [], create: { refusal: item.refusal } });
			await signInAndVisit(page, fixture, API_TOKENS_PATH);
			await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });
			const dialog = await openCreateDialog(page);
			const name = `Refused ${item.label}`;
			await dialog.locator('input').first().fill(name);
			await submitIn(dialog).click();

			// createFailureOf (use-user-api-tokens.ts:78-88) → failureTextOf (create-api-token-dialog.tsx:42-50)
			const expectedCopy =
				item.copyKey === 'CREATE_LIMIT'
					? filled('CREATE_LIMIT', { max: 10 })
					: T[item.copyKey as 'CREATE_FAILED' | 'CREATE_DISABLED'];
			await expect(
				text(dialog, expectedCopy),
				`${item.label}: the dialog did not explain the refusal`
			).toBeVisible();
			await expect(
				text(dialog, T.SECRET_TITLE),
				`${item.label}: a secret screen appeared for a refused create`
			).toHaveCount(0);
			await expect(
				dialog.getByRole('heading', { name: T.CREATE_TITLE, exact: true }),
				`${item.label}: the form vanished`
			).toBeVisible();
			expect(await rowNames(page), `${item.label}: a row appeared anyway`).toEqual([]);
			// the modal hides the page behind it, so only the dialog's own Create is offered: the person can try again
			await expect(createButtons(page), `${item.label}: the dialog offers no second try`).toHaveCount(1);
			await expect(submitIn(dialog)).toBeEnabled();
			expect(served.countOf('POST', TOKENS_ROUTE), `${item.label}: the create was sent more than once`).toBe(1);
			expect(
				served.calls.filter((call) => call.method === 'POST').map((call) => call.contentType),
				`${item.label}: the POST was not sent as JSON`
			).toEqual(['application/json']);
			const fallbackToasts = await appToasts(page).count();
			expect(
				fallbackToasts,
				`${item.label}: the global fallback toast spoke beside the dialog's own sentence`
			).toBe(0);

			report('create-refused', {
				label: item.label,
				status: item.refusal.status,
				copyShown: expectedCopy,
				postBody: served.calls.find((call) => call.method === 'POST')?.body ?? null,
				listReadsAfter: served.countOf('GET', TOKENS_ROUTE),
				rows: await rowNames(page),
				fallbackToasts,
				devToasts: (await devToasts(page).allInnerTexts()).length,
				consoleErrors: shield.consoleErrors()
			});
			expect(
				consoleFindings(shield, armedSoFar),
				`${item.label}: besides its own HTTP error line the page logged a console error`
			).toEqual([]);

			await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
			await expect(dialogOf(page)).toHaveCount(0);
			await expect(createButtons(page), `${item.label}: the empty page lost a Create`).toHaveCount(2);
		}
	});

	// ---------------------------------- 7. a create that succeeds: what is sent, the secret once, then Done

	test('7 · a create: the body it posts, the secret shown once with its copy control, and Done leaving only the row', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const secret = secretOf();
		const created = {
			...tokenOf('aaaa0000-0000-4000-8000-000000000021', 'Friday report', { createdAt: dayIso(0) }),
			token: secret
		};
		const served = await serveApiTokens(page, { enabled: true, items: [], create: { token: created } });
		await page.context().grantPermissions(['clipboard-read', 'clipboard-write'], { origin: APP_ORIGIN });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });

		const dialog = await openCreateDialog(page);
		await dialog.locator('input').first().fill('Friday report');
		await dialog.getByText(T.EXPIRY_1Y, { exact: true }).click();
		await expect(
			dialog.locator('input[type=radio][value="1y"]'),
			'picking the 1-year card did not select it'
		).toBeChecked();
		await submitIn(dialog).click();

		await expect(text(dialog, T.SECRET_TITLE), 'the create answer never reached the screen').toBeVisible({
			timeout: 25_000
		});
		await expect(text(dialog, filled('SECRET_TEXT', { name: created.name }))).toBeVisible();
		expect(served.countOf('POST', TOKENS_ROUTE), 'the create was sent more than once').toBe(1);
		const post = served.calls.find((call) => call.method === 'POST');
		expect(post?.body, 'the create body is not the two keys the form holds').toBe(
			JSON.stringify({ name: 'Friday report', expiry: '1y' })
		);

		// ApiTokenSecret (api-token-secret.tsx:95-116): read only, equal to what this file served, never printed
		const secretField = await dialog.getByLabel(T.SECRET_LABEL, { exact: true }).evaluate((node, served) => {
			const field = node as HTMLInputElement;
			return { readOnly: field.readOnly, holdsServedSecret: field.value === served, length: field.value.length };
		}, secret);
		expect(secretField, 'the secret field is not the one the component builds').toEqual({
			readOnly: true,
			holdsServedSecret: true,
			length: secret.length
		});
		const copyButton = dialog.getByRole('button', { name: T.COPY_TOKEN, exact: true });
		await expect(copyButton).toHaveCount(1);
		await expect(text(dialog, T.COPY)).toBeVisible();
		await copyButton.click();
		// reported, not pinned: which of COPY_DONE / COPY_FAILED this Chrome grants (see the header, "not covered")
		const copyOutcome = {
			done: await text(dialog, T.COPY_DONE).count(),
			failed: await text(dialog, T.COPY_FAILED).count(),
			statusRegion: await dialog.locator('output').count()
		};

		// dismissible={!isSecretShown} (create-api-token-dialog.tsx:224-230): the secret survives a stray Escape or click
		await page.keyboard.press('Escape');
		await expect(dialog, 'Escape closed the dialog while the secret was on screen').toBeVisible();
		await expect(text(dialog, T.SECRET_TITLE)).toBeVisible();
		await page.mouse.click(4, 4);
		await expect(dialog, 'a click outside closed the dialog while the secret was on screen').toBeVisible();

		await dialog.getByRole('button', { name: T.DONE, exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect(text(page, filled('COUNT', { count: 1, max: 10 }))).toBeVisible();
		await expect.poll(() => rowNames(page), { timeout: 15_000 }).toEqual(['Friday report']);

		// the answer is dropped from the cache (use-user-api-tokens.ts:168-179): only the row, never the secret
		const secretInPage = await page.evaluate((value) => {
			const inputs = Array.from(document.querySelectorAll('input')).map(
				(node) => (node as HTMLInputElement).value
			);
			return {
				anyInputHoldsIt: inputs.some((value2) => value2 === value),
				bodyHtmlHoldsIt: document.body.innerHTML.includes(value)
			};
		}, secret);
		expect(secretInPage, 'the secret was still in the page after Done').toEqual({
			anyInputHoldsIt: false,
			bodyHtmlHoldsIt: false
		});
		expect(await text(page, T.SECRET_TITLE).count(), 'the secret screen stayed open').toBe(0);

		report('create-succeeded', {
			postBodyKeys: Object.keys(JSON.parse(String(post?.body)) as object).sort(),
			postContentType: post?.contentType ?? null,
			secretLength: secret.length,
			secretField,
			copyOutcome,
			listReads: served.countOf('GET', TOKENS_ROUTE),
			calls: served.shapes(),
			mockLogged: (await mock.calls('/user-api-tokens')).length,
			rowsAfterDone: await rowNames(page),
			secretInPageAfterDone: secretInPage,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------- 8. the secret stays out of the dev log

	test('8 · the create answer stays out of every POST /api/log body (secretResponse)', async ({
		page,
		fixture,
		shield
	}) => {
		const secret = secretOf();
		const created = {
			...tokenOf('aaaa0000-0000-4000-8000-000000000022', 'Log probe token', { createdAt: dayIso(0) }),
			token: secret
		};
		const served = await serveApiTokens(page, { enabled: true, items: [], create: { token: created } });
		const seen = watchLog(page);
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });
		await seen.settle();
		const beforeCreate = seen.posts.length;

		const dialog = await openCreateDialog(page);
		await dialog.locator('input').first().fill('Log probe token');
		await submitIn(dialog).click();
		await expect(text(dialog, T.SECRET_TITLE)).toBeVisible({ timeout: 25_000 });
		await seen.settle();

		const createResponses = seen.responses().filter(named('POST /user-api-tokens'));
		const createRequests = seen.requests().filter(named('POST /user-api-tokens'));
		const raw = JSON.stringify(seen.posts);

		expect(createResponses.length, 'the create answered no 🚀/✅ pair in the dev log').toBeGreaterThanOrEqual(1);
		// api.service.ts:403, :408 — the answer is logged as '[not logged]' because create passed secretResponse (user-api-tokens.service.ts:34)
		expect(
			createResponses.map((post) => post.details?.data),
			'a create answer was logged with its body'
		).toEqual(createResponses.map(() => '[not logged]'));
		expect(raw.includes(secret), 'the served secret appeared in a POST /api/log body').toBe(false);
		expect(served.countOf('POST', TOKENS_ROUTE), 'the create was not sent exactly once').toBe(1);

		report('secret-out-of-log', {
			postsBeforeCreate: beforeCreate,
			postsAfterCreate: seen.posts.length,
			calls: served.shapes(),
			createResponseEntries: createResponses.length,
			createRequestEntries: createRequests.length,
			createRequestDetailKeys: createRequests.map((post) => Object.keys(post.details ?? {}).sort()),
			createRequestDataKeys: createRequests.map((post) =>
				Object.keys((post.details?.data ?? {}) as object).sort()
			),
			// every side reported as a boolean or a length; the value itself is never printed
			secretLength: secret.length,
			secretInAnyLogBody: raw.includes(secret),
			consoleErrors: shield.consoleErrors()
		});
		expect(
			consoleFindings(shield),
			'the page logged a console error while a create was being made and read'
		).toEqual([]);
		await dialog.getByRole('button', { name: T.DONE, exact: true }).click();
	});

	// ---------------------------------- 9. the ten-token gate

	test('9 · ten working tokens: Create is disabled and the page says why; three tokens do not', async ({
		page,
		fixture,
		shield
	}) => {
		const ten = Array.from({ length: 10 }, (_unused, index) =>
			tokenOf(`aaaa0000-0000-4000-8000-0000000000${String(40 + index)}`, `Limit token ${index + 1}`)
		);
		const served = await serveApiTokens(page, { enabled: true, items: ten });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });

		await expect(text(page, filled('COUNT', { count: 10, max: 10 }))).toBeVisible();
		await expect(createButtons(page)).toHaveCount(1);
		await expect(createButtons(page).first()).toBeDisabled();
		await expect(text(page, filled('LIMIT_REACHED', { max: 10 }))).toBeVisible();
		expect(served.countOf('POST', TOKENS_ROUTE), 'the page wrote a token behind a disabled button').toBe(0);

		report('limit-reached', {
			count: 10,
			createButtons: await createButtons(page).count(),
			limitNote: await text(page, filled('LIMIT_REACHED', { max: 10 })).count(),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 10. revoke: the question, cancel, the DELETE

	test('10 · revoke: the question it asks, a cancel that sends nothing, and a confirm that revokes at the measured path', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const dropped = tokenOf('aaaa0000-0000-4000-8000-000000000031', 'Drop me');
		const kept = tokenOf('aaaa0000-0000-4000-8000-000000000032', 'Keep me');
		const served = await serveApiTokens(page, { enabled: true, items: [dropped, kept] });
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });

		await page.getByRole('button', { name: `${T.REVOKE} Drop me`, exact: true }).click();
		const dialog = dialogOf(page);
		await expect(dialog).toBeVisible();
		await expect(
			dialog.getByRole('heading', { name: filled('REVOKE_TITLE', { name: dropped.name }), exact: true })
		).toBeVisible();
		await expect(text(dialog, T.REVOKE_DESCRIPTION)).toBeVisible();
		await expect(dialog.getByRole('button', { name: T.REVOKE_CONFIRM, exact: true })).toHaveCount(1);
		await expect(dialog.getByRole('button', { name: 'Cancel', exact: true })).toHaveCount(1);

		await dialog.getByRole('button', { name: 'Cancel', exact: true }).click();
		await expect(dialogOf(page)).toHaveCount(0);
		await expect.poll(() => rowNames(page), { timeout: 10_000 }).toEqual(['Drop me', 'Keep me']);
		expect(
			served.countOf('DELETE', served.revokePathOf(dropped.id)),
			'a cancelled revoke still sent a DELETE'
		).toBe(0);

		await page.getByRole('button', { name: `${T.REVOKE} Drop me`, exact: true }).click();
		await dialog.getByRole('button', { name: T.REVOKE_CONFIRM, exact: true }).click();

		// user-api-tokens.service.ts:39-41 → user-api-tokens.ts:182-195 (the row leaves at once, then the list is read again)
		await expect.poll(() => rowNames(page), { timeout: 15_000 }).toEqual(['Keep me']);
		await expect(dialogOf(page), 'the question stayed open after the token was revoked').toHaveCount(0);
		await expect(text(page, filled('COUNT', { count: 1, max: 10 }))).toBeVisible();
		expect(served.shapes()).toEqual([
			`GET ${CONFIG_ROUTE}`,
			`GET ${TOKENS_ROUTE}`,
			`DELETE ${served.revokePathOf(dropped.id)}`,
			`GET ${TOKENS_ROUTE}`
		]);
		const del = served.calls.find((call) => call.method === 'DELETE');
		expect(del?.url, 'the DELETE went somewhere else than the mock').toBe(
			`${MOCK_API_ORIGIN}${served.revokePathOf(dropped.id)}`
		);
		expect((await mock.calls('/user-api-tokens')).length, 'the mock heard a call this file answered').toBe(0);

		report('revoke', {
			question: filled('REVOKE_TITLE', { name: dropped.name }),
			confirmLabel: T.REVOKE_CONFIRM,
			calls: served.shapes(),
			deleteUrlHost: del ? new URL(del.url).origin : null,
			rowsAfterConfirm: await rowNames(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------- 11. a revoke that fails

	test('11 · a revoke that fails: the question stays open, says so, and keeps the token', async ({
		page,
		fixture,
		shield
	}) => {
		const token = tokenOf('aaaa0000-0000-4000-8000-000000000033', 'Refused revoke');
		const served = await serveApiTokens(page, {
			enabled: true,
			items: [token],
			revoke: { status: 500, message: 'this file refused the revocation' }
		});
		await signInAndVisit(page, fixture, API_TOKENS_PATH);
		await expect(sectionHeading(page)).toBeVisible({ timeout: 25_000 });

		await page.getByRole('button', { name: `${T.REVOKE} Refused revoke`, exact: true }).click();
		const dialog = dialogOf(page);
		await dialog.getByRole('button', { name: T.REVOKE_CONFIRM, exact: true }).click();

		// onError (revoke-api-token-dialog.tsx:41) → error under the question (kit/danger.tsx:163-167)
		await expect(text(page, T.REVOKE_FAILED)).toBeVisible({ timeout: 25_000 });
		await expect(page.getByRole('alert')).toContainText(T.REVOKE_FAILED);
		await expect(dialog, 'the question closed although the revocation failed').toBeVisible();
		await expect(
			dialog.getByRole('heading', { name: filled('REVOKE_TITLE', { name: token.name }), exact: true })
		).toBeVisible();
		await expect.poll(() => rowNames(page), { timeout: 10_000 }).toEqual(['Refused revoke']);
		expect(served.countOf('DELETE', served.revokePathOf(token.id)), 'the revocation was sent twice').toBe(1);
		expect(await appToasts(page).count(), 'the global fallback toast spoke beside the dialog').toBe(0);

		report('revoke-refused', {
			errorCopy: T.REVOKE_FAILED,
			calls: served.shapes(),
			rows: await rowNames(page),
			fallbackToasts: await appToasts(page).count(),
			devToasts: (await devToasts(page).allInnerTexts()).length,
			consoleErrors: shield.consoleErrors()
		});
		expect(
			consoleFindings(shield, [armedHttpError('DELETE', `/user-api-tokens/${token.id}`, 500)]),
			'besides its own HTTP error line the page logged a console error'
		).toEqual([]);
	});
});
