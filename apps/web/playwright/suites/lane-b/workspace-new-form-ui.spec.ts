import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, waitForShellReady } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The create-workspace **form itself**, `/workspace/new`
 * (`app/[locale]/(main)/workspace/new/page.tsx:6` → `withAuthentication(CreateWorkspacePage)` →
 * `core/components/pages/workspace/create-workspace-page.tsx:66-301`), on lane-b (app `http://localhost:3032`,
 * mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, `playwright/test-servers.ts:39`).
 *
 * What is new here is the client half: the form's own refusals (test 3), the address-unconfirmed notice (test 5),
 * Cancel (test 7), the busy state (test 6), the team name that stops following (test 2), and the `FAILED_*` copy
 * (test 8). `suites/mock/workspace.spec.ts:39-160` drives the same page's *answers* (REGISTRATION_CLOSED,
 * TIMER_RUNNING, CREATED_NOT_OPENED, SUBSCRIPTION_REQUIRED, OUTCOME_UNKNOWN, a full creation) and
 * `suites/lane-b/workspace-welcome-ui.spec.ts:417-500` covers the submit body and the welcome query — by stubbing
 * `POST /api/auth/create-workspace` on the **app origin**. **This file never does**: every submit here runs the real
 * route (`app/api/auth/create-workspace/route.ts:23-81`) against the mock's own scenarios.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock (`cypress/support/mock-gauzy-server.mjs`) answers every read the shell makes and every
 * step of the creation chain (`GET/POST /api/auth/workspaces`, `POST /api/tenant`, `/api/organization`,
 * `/api/employee`, `/api/organization-team`, `/api/invite/emails`, `:438-560`), recorded into
 * `state().workspaceCreation`. The browser's one submit is the app's own route on the **app origin**:
 * `core/services/client/api/auth/workspace.service.ts:87-93` posts `/auth/create-workspace` through `getFallbackAPI()`,
 * which `core/services/client/api-factory.ts:3-12` builds on `API_BASE_URL` = `/api`
 * (`core/constants/config/constants.tsx:96`) — a relative base, so this app answers it, same origin, no preflight.
 * Served *answers* are armed only with the mock's own switches: `scenario.delays` (test 6) and `scenario.fails`
 * (test 8).
 *
 * **Served by this file**, with `page.route` on the **mock origin only**, never `route.fetch()`: `GET /api/user/me`
 * in test 5, restating the mock's CORS answer (`mock-gauzy-server.mjs:1087-1096`) and answering `OPTIONS` with 204.
 * Its body is the mock's own answer, read from that route's own `200` response body on the load before
 * (`mock-gauzy-server.mjs:607` returns `data.baseUser`), with only `isEmailVerified` changed — the mock has no
 * `addressUnconfirmed` scenario and its `baseUser` is verified (`:100-116`), the gap
 * `suites/lane-b/unnamed-writes-contract.spec.ts:191` names. The witness that this file's answer was used is the
 * page's own `ADDRESS_UNCONFIRMED_*` notice, which nothing else on this lane can print.
 *
 * A `scenario.fails` on `/api/auth/workspaces` is armed **after** the page loaded: the shell itself reads
 * `GET /api/auth/workspaces` (`s3-lane-b-workspacenew-p1.log` `P9 chain`), and arming it before the load left the
 * shell never ready (`-p2.log`, failure 1).
 *
 * ## Where every pinned value came from
 *
 * Throwaway probes on this lane — `D:\Coding\.tmp\probe-workspacenew\probe.spec.ts`, `probe2.spec.ts`,
 * `probe3.spec.ts` with `probe.config.mjs` (no `webServer`) — logs `D:\Coding\.tmp\s3-lane-b-workspacenew-p1.log`,
 * `-p2.log` (`4 passed / 2 failed`) and `-p3.log` (`5 passed`). Every test below also prints what it pinned as a
 * `[lane-b workspace-new] MEASURE …` line; this file's own whole-file runs are `s3-lane-b-workspacenew-<n>.log`,
 * named in `D:\Coding\.tmp\lane-b-workspacenew-status.md`. Two code constants are cited rather than measured:
 * `MAX_WORKSPACE_NAME_LENGTH = 60` (`core/lib/validation/workspace.ts:5`) and `MAX_EMAILS_PER_INVITE = 50`
 * (`core/lib/validation/invite.ts:4`); the probes confirm both on screen (`-p2.log` `Q3 typed 65`, `Q2 51 addresses`).
 *
 * ## Measured, with no `[MEASURED, NOT INTENDED]` tag
 *
 * Nothing here contradicts a comment, a type, a unit test or the product copy. What is worth knowing:
 *
 * - **`NAME_TOO_LONG` is unreachable on this page.** Both name fields carry `maxLength={60}`
 *   (`create-workspace-page.tsx:213`, `:233`); typing 65 characters *and* a programmatic 70-character fill both leave
 *   exactly 60 in the field with no error (`-p2.log` `Q3 typed 65 {"valueLength":60}`, `Q3 filled 70
 *   {"valueLength":60}`), so the `{max}` message at `:38` can only be reached by a value the field cannot produce.
 *   Test 4 pins what the field keeps instead, as `suites/lane-a/team-general-settings-ui.spec.ts:126-128` did for its
 *   80-character name.
 * - **`TEAM_REQUIRED` is reachable with a valid workspace name.** The follow (`:86-90`) writes `teamName` only while
 *   the team field is not dirty and never marks it dirty itself, so a team the person emptied stays empty
 *   (`-p2.log` `Q2 team emptied {"name":"Aurora Studio","team":""}`) and refuses on its own while the name is valid.
 * - **`INVITES_INVALID` names every bad token** the way `inviteAddressesOf` splits them, on `[\s,;]+`
 *   (`core/lib/validation/workspace.ts:35-51`): `ada@example.com, not an address` is read as three bad addresses
 *   (`-p2.log` `Q2 bad address`).
 * - **The limit is inclusive:** 51 addresses are refused, 50 are taken and the creation runs (`-p2.log`
 *   `Q2 51 addresses`, `Q2 50 addresses {"errors":[],"asks":["POST /api/auth/create-workspace"]}`).
 * - **While the creation runs the fields are disabled through the `<fieldset>`, not by their own attribute**
 *   (`:204`): reading the DOM property leaves `#workspace-name` with `disabled === false` while the fieldset reports
 *   `disabled === true` (`-p2.log` `Q3 while held`), while Playwright's own actionability view — which counts the
 *   fieldset — reports the field disabled (`s3-lane-b-workspacenew-2.log` `held creation
 *   {"nameDisabledByPlaywright":true}`).
 * - **Playwright reads a disabled `<fieldset>` as enabled**: `expect(locator).toBeDisabled()` failed on
 *   `<fieldset disabled class="flex flex-col gap-5">` with `Received: enabled` (`s3-lane-b-workspacenew-1.log`
 *   failures 1 and 2), so the state `create-workspace-page.tsx:204` sets is asserted here as the presence of the
 *   attribute (`fieldset[disabled]`).
 * - **An unconfirmed address closes the form but not the way out of it:** the submit is disabled
 *   (`disabled={isBusy || isClosed || isTimerRunning}`, `:292`), the fieldset is disabled (`:204`), and Cancel stays
 *   enabled (`disabled={isBusy}`, `:284`) — `-p3.log` `R3 fieldset disabled true`, `-p2.log` `Q4 buttons`.
 * - **A 502 `FAILED` leaves the retry armed** (`isClosed` covers only `CREATED_NOT_OPENED`, `OUTCOME_UNKNOWN` and the
 *   unconfirmed address, `:120-122`): the submit stays enabled under the `FAILED_*` notice (`-p3.log` `R2 submit
 *   enabled false` — that is `isDisabled()` returning false).
 * - **`form button[type="submit"]` is not this form's button**: the shell's newsletter card is another `<form>` with
 *   its own submit (`aria-label="Subscribe"`), and `button[aria-busy]` matches 4 buttons on this route, so every
 *   locator here is scoped to the form that holds `#workspace-name` (`-p1.log` failure 2, `-p2.log` `Q1 role counts`).
 * - **The accessible names carry the marks**: `textbox "Workspace name*"`, `textbox "First team*"`,
 *   `textbox "Invite members(optional)"` (`-p3.log` `R1 form aria`) — the words from `locales/en.json`, the `*` and
 *   the `(…)` from `core/components/common/dialog-field-label.tsx:17-18`.
 * - **A failed submit parks a dev-only toast over the submit button.** `DevErrorToaster`
 *   (`app/[locale]/layout-component.tsx:149` mounts it only `IS_DEV_MODE`) toasts `Mutation failed … Copy details`
 *   (`-p3.log` `R2 sonner`), and a second click on the button was retried 328× against it ("subtree intercepts
 *   pointer events", `-p2.log` failure 1) — so this file asserts the refused state and never clicks under a toast.
 * - `MutationErrorToaster` logs `Mutation failed:` in dev for **every** failed mutation, `handlesOwnError` included
 *   (`core/components/common/mutation-error-toaster.tsx:47-48`, while `:106-107` of `use-create-workspace.ts` keeps
 *   the product's generic toast away — `-p3.log` `R2 generic toast copy count 0`).
 * - The client logs its refusal with the **relative** path it posted:
 *   `[ERROR] [HttpClient] HTTP Error: POST /auth/create-workspace 502 {…}` (`-p3.log` `R2 logMatching HttpClient`).
 * - The shell renders one `<output>` of its own on every page (the time-zone notice), so a notice is found by its
 *   copy, never by counting `<output>` elements (`-p2.log` `Q1 notices`).
 * - `hardVisit` puts `/` in the browser history before the page it opens (`playwright/helpers.ts:424-430`), so
 *   `router.back()` from a page opened that way lands on `/` (`-p2.log` failure 2, `Received:
 *   "http://localhost:3032/"`). Test 7 reaches the form with a plain `page.goto` so the page it came from is really
 *   the previous entry — Cancel then returns there (`-p3.log` `R4 after cancel url`).
 * - React Strict Mode mounts the page twice in dev, so a plain load reads `GET /api/user/me` several times
 *   (`-p1.log` `P9 chain`: five). Only "a read was sent" is ever pinned, never a count.
 *
 * ## What this file does not cover
 *
 * The answers `suites/mock/workspace.spec.ts:69-160` already drives (`REGISTRATION_CLOSED_*`, `TIMER_RUNNING_*` with
 * its disabled button, `CREATED_NOT_OPENED_*`, `SUBSCRIPTION_REQUIRED_*` with its checkout link, `OUTCOME_UNKNOWN_*`
 * through an aborted request), the server-side chain contract (`suites/lane-b/unnamed-writes-contract.spec.ts:2365`
 * onwards) and everything past the landing (`suites/lane-b/workspace-welcome-ui.spec.ts`). Not reachable on this
 * lane at all: the `pendingTimerStart()` await path (`create-workspace-page.tsx:100-111`) — it needs a timer start
 * already in flight, which no mock switch arms (`playwright/helpers.ts:69-122` has none) — the
 * `workspaceOpeningState` double-submit lock (`:75`, `:95`), the server's own 403 `ADDRESS_UNCONFIRMED`
 * (`app/api/auth/create-workspace/route.ts:35-37`) and its 400 `INVALID` (`:30-33`): the lane's session user is
 * verified (`mock-gauzy-server.mjs:100-116`) with no scenario to change it, and no input the form accepts fails
 * `createWorkspaceBodySchema` (`core/lib/validation/workspace.ts:13-21`), whose limits are the form's own. Test 5
 * drives the *page's* notice, which comes from the browser's user read instead.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const CREATE_WORKSPACE_PATH = '/workspace/new';
const WELCOME_PATH = '/workspace/welcome';
/** The submit's own path, as the client posts it and logs it (`workspace.service.ts:89`). */
const CREATE_WORKSPACE_ROUTE = '/api/auth/create-workspace';
/** The path the client posts (`workspace.service.ts:89`), which is what its error line names. */
const CLIENT_CREATE_PATH = '/auth/create-workspace';
const USER_ME_ROUTE = '/api/user/me';
/** The first step of the server's chain, which the mock can delay or refuse (`mock-gauzy-server.mjs:521-539`). */
const OPENING_ROUTE = '/api/auth/workspaces';
/** `create-workspace-page.tsx:29` `PROFILE_SETTINGS_PATH`. */
const PROFILE_SETTINGS_PATH = '/settings/personal';

/** `MAX_WORKSPACE_NAME_LENGTH` (`core/lib/validation/workspace.ts:5`), `MAX_EMAILS_PER_INVITE` (`invite.ts:4`). */
const NAME_MAX_LENGTH = 60;
const MAX_INVITE_ADDRESSES = 50;

/** `locales/en.json`: `workspaceCreation` `:3842-3887`, `common.CANCEL` `:308`, `switchers.CONFIRM_ADDRESS`, `toasts.MUTATION_FAILED`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	workspaceCreation: Record<string, string>;
	common: { CANCEL: string };
	switchers: { CONFIRM_ADDRESS: string };
	toasts: { MUTATION_FAILED: string };
};
const T = EN.workspaceCreation;

/** `{max}` / `{addresses}` filled the way `formSchemaOf` fills them (`create-workspace-page.tsx:38,47,52`). */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b workspace-new] MEASURE ${label} ${JSON.stringify(value)}`);

/** React's dev-mode store warning: seen on some runs and not others on the same code (`suites/lane-b/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** Known lane flake: the shell's own `GET /api/health` — the 30 s axios timeout of `core/services/client/api/default.ts:42`. */
const HEALTH_CHECK_TIMEOUT = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';
/**
 * `mutation-error-toaster.tsx:47-48` prints this in dev for **every** failed mutation, `handlesOwnError` included: the
 * exact line test 8's 502 leaves (`ApiErrorService` names a 502 whose body has no message this way, `-p3.log` R2),
 * excused only in the test that arms that refusal, never as the bare `Mutation failed:` prefix.
 */
const ARMED_502_MUTATION_LINE =
	'Mutation failed: ApiError: Error (Invalid Response) – The server returned an invalid response. (HTTP 502)';
/** `api.service.ts` `logError`, for the 502 test 8 armed; the path is the relative one the client posted. */
const armedHttpError = (verb: string, path: string, status: number) =>
	`[HttpClient] HTTP Error: ${verb} ${path} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_TIMEOUT))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for the one answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * The submit goes to the **app's own origin**, so the mock's request log can never show it
 * (`suites/lane-b/workspace-welcome-ui.spec.ts:29-31`): this is the witness this file uses instead.
 */
type CreateTraffic = { asks: string[]; answers: number[] };

function watchCreateRequests(page: Page): CreateTraffic {
	const traffic: CreateTraffic = { asks: [], answers: [] };
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === APP_ORIGIN && url.pathname === CREATE_WORKSPACE_ROUTE) {
			traffic.asks.push(`${request.method()} ${url.pathname}`);
		}
	});
	page.on('response', (response) => {
		const url = new URL(response.url());
		if (url.origin === APP_ORIGIN && url.pathname === CREATE_WORKSPACE_ROUTE) {
			traffic.answers.push(response.status());
		}
	});
	return traffic;
}

/** `p[id$="-error"]` inside the create form, read as Node text. */
async function errorTexts(page: Page): Promise<Array<{ id: string; text: string }>> {
	const rows = await page
		.locator('form p[id$="-error"]')
		.evaluateAll((nodes) => nodes.map((node) => ({ id: node.id, text: node.textContent ?? '' })));
	return rows.map((row) => ({ id: row.id, text: row.text.replace(/\s+/g, ' ').trim() }));
}

/** The create form only: the shell's newsletter card is another `<form>` with its own submit (`-p1.log` failure 2). */
const createForm = (page: Page) => page.locator('form').filter({ has: page.locator('#workspace-name') });
const createButton = (page: Page) => createForm(page).locator('button[type="submit"]');
const cancelButton = (page: Page) => page.getByRole('button', { name: EN.common.CANCEL, exact: true });
const fieldset = (page: Page) => createForm(page).locator('fieldset');
/**
 * The disabled state is read from the attribute, not from `toBeDisabled()`: Playwright reports a
 * `<fieldset disabled class="flex flex-col gap-5">` as `enabled` (`s3-lane-b-workspacenew-1.log`, failures 1 and 2),
 * so the presence of `disabled` on the fieldset is what this file asserts.
 */
const disabledFieldset = (page: Page) => createForm(page).locator('fieldset[disabled]');
const nameField = (page: Page) => page.locator('#workspace-name');
const teamField = (page: Page) => page.locator('#workspace-team');
const invitesField = (page: Page) => page.locator('#workspace-invites');
const errorLines = (page: Page) => page.locator('form p[id$="-error"]');
/** A `Notice` renders an `<output>` (`core/components/common/notice.tsx:40`); the shell renders one too, so it is found by its copy. */
const notice = (page: Page, title: string) => page.locator('output').filter({ hasText: title });
/** The workspace switcher's own label, typed by `core/components/common/workspace-switcher.tsx:368`. */
const switcherLabel = (workspace: string) => `Current workspace: ${workspace}. Click to change the workspace`;

const addressesOf = (count: number) => Array.from({ length: count }, (_, index) => `member${index + 1}@example.test`);

test('the form prints its three fields, their labels and hints, keeps the name focused, and the team follows the name', async ({
	app,
	shield
}) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);

	await expect(page.getByRole('heading', { name: T.TITLE, exact: true })).toBeVisible();
	await expect(page.locator('header p')).toHaveText(T.DESCRIPTION);

	// the labels the page prints: the words from `locales/en.json`, the `*` and `(…)` from `dialog-field-label.tsx:17-18`
	await expect(page.locator('label[for="workspace-name"]')).toContainText(T.NAME_LABEL);
	await expect(page.locator('label[for="workspace-team"]')).toContainText(T.TEAM_LABEL);
	await expect(page.locator('label[for="workspace-invites"]')).toContainText(T.INVITES_LABEL);
	await expect(page.locator('label[for="workspace-invites"]')).toContainText(T.OPTIONAL);
	await expect(page.getByRole('textbox', { name: `${T.NAME_LABEL}*`, exact: true })).toBeVisible();
	await expect(page.getByRole('textbox', { name: `${T.TEAM_LABEL}*`, exact: true })).toBeVisible();
	await expect(page.getByRole('textbox', { name: `${T.INVITES_LABEL}(${T.OPTIONAL})`, exact: true })).toBeVisible();

	await expect(nameField(page)).toBeFocused();
	await expect(nameField(page)).toHaveAttribute('maxlength', String(NAME_MAX_LENGTH));
	await expect(teamField(page)).toHaveAttribute('maxlength', String(NAME_MAX_LENGTH));
	await expect(nameField(page)).toHaveAttribute('placeholder', T.NAME_PLACEHOLDER);
	// the invitations placeholder is typed by the page itself (`create-workspace-page.tsx:260`)
	await expect(invitesField(page)).toHaveAttribute('placeholder', 'ada@example.com, grace@example.com');
	await expect(page.locator('#workspace-team-hint')).toHaveText(T.TEAM_HINT);
	await expect(page.locator('#workspace-invites-hint')).toHaveText(T.INVITES_HINT);
	await expect(nameField(page)).toHaveAttribute('aria-invalid', 'false');
	// the name field has no hint under it (`create-workspace-page.tsx:216` leaves the attribute off)
	await expect(nameField(page), 'no description sits under the name').not.toHaveAttribute('aria-describedby');
	await expect(teamField(page)).toHaveAttribute('aria-describedby', 'workspace-team-hint');
	await expect(invitesField(page)).toHaveAttribute('aria-describedby', 'workspace-invites-hint');

	await expect(createButton(page)).toHaveText(T.CREATE);
	await expect(createButton(page)).toHaveAttribute('aria-busy', 'false');
	await expect(cancelButton(page)).toBeEnabled();
	await expect(errorLines(page)).toHaveCount(0);

	await nameField(page).pressSequentially('Aurora', { timeout: 15_000 });
	await expect(teamField(page)).toHaveValue('Aurora', { timeout: 10_000 });

	report('form printed', {
		nameMaxLength: await nameField(page).getAttribute('maxlength'),
		teamMaxLength: await teamField(page).getAttribute('maxlength'),
		focused: await page.evaluate(() => document.activeElement?.id ?? null),
		accessibleNames: await createForm(page)
			.locator('input, textarea')
			.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label') ?? node.id)),
		teamFollowsName: await teamField(page).inputValue()
	});

	await page.waitForTimeout(2_000); // quiet window: typing alone sends no create-workspace request
	expect(traffic.asks, 'the form sent nothing').toEqual([]);
	expect(consoleFindings(shield), 'the form page logged nothing').toEqual([]);
});

test('the first team takes the workspace name until the person names it, then keeps its own', async ({
	app,
	shield
}) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);

	await nameField(page).fill('Aurora Studio');
	await expect(teamField(page)).toHaveValue('Aurora Studio', { timeout: 10_000 });

	await teamField(page).fill('Design');
	await expect(teamField(page)).toHaveValue('Design');
	await nameField(page).fill('Aurora Studios Ltd');
	await expect(nameField(page)).toHaveValue('Aurora Studios Ltd');
	await page.waitForTimeout(2_000); // quiet window: renaming the workspace no longer renames the team
	report('team after renaming the workspace', {
		name: await nameField(page).inputValue(),
		team: await teamField(page).inputValue()
	});
	expect(await teamField(page).inputValue(), 'the team keeps the name it was given').toBe('Design');

	// and the other way round: an emptied name does not clear a team that has its own name
	await nameField(page).fill('');
	await page.waitForTimeout(2_000); // quiet window: a named team is not emptied with the name
	expect(await teamField(page).inputValue(), 'the team keeps its name').toBe('Design');
	expect(await nameField(page).inputValue(), 'the workspace name was emptied').toBe('');

	await page.waitForTimeout(1_000); // quiet window: none of this sent a request
	expect(traffic.asks, 'no request was sent').toEqual([]);
	expect(consoleFindings(shield), 'the page logged nothing').toEqual([]);
});

test('every refusal the form makes itself names its field and sends no request', async ({ app, mock, shield }) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);

	// nothing typed: the name and the team refuse, the invitations do not
	await createButton(page).click();
	await expect(page.locator('#workspace-name-error')).toHaveText(T.NAME_REQUIRED);
	await expect(page.locator('#workspace-team-error')).toHaveText(T.TEAM_REQUIRED);
	await expect(nameField(page)).toHaveAttribute('aria-invalid', 'true');
	await expect(nameField(page)).toHaveAttribute('aria-describedby', 'workspace-name-error');
	await expect(teamField(page)).toHaveAttribute('aria-invalid', 'true');
	await expect(teamField(page)).toHaveAttribute('aria-describedby', 'workspace-team-error');
	await expect(invitesField(page)).toHaveAttribute('aria-invalid', 'false');
	await expect(invitesField(page)).toHaveAttribute('aria-describedby', 'workspace-invites-hint');
	await expect(errorLines(page)).toHaveCount(2);
	await page.waitForTimeout(2_000); // quiet window: a client refusal sent no create-workspace request
	report('empty name and team', { errors: await errorTexts(page), asks: traffic.asks });
	expect(traffic.asks, 'a refused form sent nothing').toEqual([]);

	// a valid name with the team emptied: the follow does not refill it, and only the team refuses
	await nameField(page).fill('Aurora Studio');
	await teamField(page).fill('');
	await expect(teamField(page)).toHaveValue('');
	await createButton(page).click();
	await expect(page.locator('#workspace-team-error')).toHaveText(T.TEAM_REQUIRED);
	await expect(errorLines(page)).toHaveCount(1);
	await expect(nameField(page)).toHaveAttribute('aria-invalid', 'false');
	await page.waitForTimeout(2_000); // quiet window: the team refusal sent nothing
	report('emptied team with a valid name', { errors: await errorTexts(page), asks: traffic.asks });
	expect(traffic.asks, 'a refused form sent nothing').toEqual([]);

	// one address that is not an address, named token by token as `inviteAddressesOf` splits them
	await teamField(page).fill('Design');
	await invitesField(page).fill('ada@example.com, not an address');
	await createButton(page).click();
	await expect(page.locator('#workspace-invites-error')).toHaveText(
		filled('INVITES_INVALID', { addresses: 'not, an, address' })
	);
	await expect(invitesField(page)).toHaveAttribute('aria-invalid', 'true');
	await expect(invitesField(page)).toHaveAttribute('aria-describedby', 'workspace-invites-error');
	await page.waitForTimeout(2_000); // quiet window: the bad address sent nothing
	report('one bad address', { errors: await errorTexts(page), asks: traffic.asks });
	expect(traffic.asks, 'a refused form sent nothing').toEqual([]);

	// one address too many, and the refusal names the limit the code holds
	await invitesField(page).fill(addressesOf(MAX_INVITE_ADDRESSES + 1).join(', '));
	await createButton(page).click();
	await expect(page.locator('#workspace-invites-error')).toHaveText(
		filled('INVITES_TOO_MANY', { max: MAX_INVITE_ADDRESSES })
	);
	await page.waitForTimeout(2_000); // quiet window: the over-long list sent nothing
	report('one address too many', { errors: await errorTexts(page), asks: traffic.asks });
	expect(traffic.asks, 'a refused form sent nothing').toEqual([]);

	// the limit itself is taken: no refusal stands, and the creation runs
	await invitesField(page).fill(addressesOf(MAX_INVITE_ADDRESSES).join(', '));
	await createButton(page).click();
	await expect.poll(async () => traffic.asks.length, { timeout: 30_000 }).toBeGreaterThan(0);
	await expect(page.locator('#workspace-invites-error')).toHaveCount(0);
	await expect(page).toHaveURL(/\/workspace\/welcome/, { timeout: 60_000 });
	const created = (await mock.state()).workspaceCreation as {
		tenant: string | null;
		invites: { emails: string[] } | null;
	};
	report('at the limit', {
		asks: traffic.asks,
		answers: traffic.answers,
		serverTenant: created.tenant,
		invitesHeldByServer: created.invites?.emails.length ?? 0
	});
	expect(created.invites?.emails.length, 'the server was told all 50 addresses').toBe(MAX_INVITE_ADDRESSES);
	expect(consoleFindings(shield), 'the refused form logged nothing').toEqual([]);
});

test('the name field keeps exactly its 60 characters when more is typed', async ({ app, shield }) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);

	await expect(nameField(page)).toHaveAttribute('maxlength', String(NAME_MAX_LENGTH));
	await nameField(page).pressSequentially('A'.repeat(NAME_MAX_LENGTH + 1), { timeout: 25_000 });
	await expect(nameField(page)).toHaveValue('A'.repeat(NAME_MAX_LENGTH), { timeout: 10_000 });
	await expect(errorLines(page)).toHaveCount(0);
	report('typed past the limit', {
		maxlength: await nameField(page).getAttribute('maxlength'),
		kept: (await nameField(page).inputValue()).length,
		errors: await errorTexts(page)
	});

	await page.waitForTimeout(2_000); // quiet window: the truncated name raised nothing and sent nothing
	expect(traffic.asks, 'nothing was sent').toEqual([]);
	expect(consoleFindings(shield), 'the page logged nothing').toEqual([]);
});

test('an unconfirmed address prints its own notice, points at the settings that confirm it, and sends nothing', async ({
	app,
	fixture,
	mock,
	page,
	shield
}) => {
	// the mock's own user answer, taken from the answer rather than typed here
	const served: Record<string, unknown>[] = [];
	page.on('response', (response) => {
		const url = new URL(response.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname === USER_ME_ROUTE && response.status() === 200) {
			response
				.json()
				.then((body: Record<string, unknown>) => served.push(body))
				.catch(() => undefined);
		}
	});
	await app(CREATE_WORKSPACE_PATH);
	await expect.poll(async () => served.length, { timeout: 20_000 }).toBeGreaterThan(0);
	const servedUser = served[0];
	report('the mock answers the user read as', {
		isEmailVerified: servedUser.isEmailVerified,
		keys: Object.keys(servedUser).sort()
	});

	const traffic = watchCreateRequests(page);
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_ME_ROUTE,
		(route) => {
			if (route.request().method() === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify({ ...servedUser, isEmailVerified: false })
			});
		}
	);
	await signInAndVisit(page, fixture, CREATE_WORKSPACE_PATH);

	await expect(notice(page, T.ADDRESS_UNCONFIRMED_TITLE)).toBeVisible();
	await expect(page.getByText(T.ADDRESS_UNCONFIRMED_DESCRIPTION, { exact: true })).toBeVisible();
	const confirmLink = page.getByRole('link', { name: EN.switchers.CONFIRM_ADDRESS, exact: true });
	await expect(confirmLink).toHaveAttribute('href', PROFILE_SETTINGS_PATH);
	await expect(createButton(page)).toHaveText(T.CREATE);
	await expect(createButton(page)).toBeDisabled();
	await expect(cancelButton(page)).toBeEnabled();
	await expect(disabledFieldset(page)).toHaveCount(1);
	report('unconfirmed address', {
		notice: await notice(page, T.ADDRESS_UNCONFIRMED_TITLE).innerText(),
		href: await confirmLink.getAttribute('href'),
		submitDisabled: await createButton(page).isDisabled(),
		cancelDisabled: await cancelButton(page).isDisabled(),
		fieldsetDisabled: (await fieldset(page).getAttribute('disabled')) !== null
	});

	await page.waitForTimeout(2_500); // quiet window: the closed form sent no create-workspace request
	const creation = (await mock.state()).workspaceCreation as { openings: number; tenant: string | null };
	report('nothing was asked', {
		asks: traffic.asks,
		answers: traffic.answers,
		openings: creation.openings,
		tenant: creation.tenant
	});
	expect(traffic.asks, 'the closed form sent nothing').toEqual([]);
	expect(creation.tenant, 'the mock created nothing').toBeNull();
	expect(consoleFindings(shield), 'the served user read logged nothing').toEqual([]);
});

test('the button says the workspace is being created, and the form holds still while it is', async ({
	app,
	shield
}) => {
	// the mock holds the first step of the chain, so the real route is still running meanwhile
	// 12 s of hold: long enough for every assertion below to land while the chain is still running
	const page = await app(CREATE_WORKSPACE_PATH, { scenario: { delays: { [OPENING_ROUTE]: 12_000 } } });
	const traffic = watchCreateRequests(page);

	await nameField(page).fill('Aurora Studio');
	await expect(teamField(page)).toHaveValue('Aurora Studio');
	await createButton(page).click();

	await expect(createButton(page)).toHaveText(T.CREATING);
	await expect(createButton(page)).toHaveAttribute('aria-busy', 'true');
	await expect(createButton(page)).toBeDisabled();
	await expect(cancelButton(page)).toBeDisabled();
	await expect(disabledFieldset(page)).toHaveCount(1);
	await expect.poll(async () => traffic.asks.length, { timeout: 20_000 }).toBeGreaterThan(0);
	report('held creation', {
		submitText: await createButton(page).innerText(),
		ariaBusy: await createButton(page).getAttribute('aria-busy'),
		submitDisabled: await createButton(page).isDisabled(),
		cancelDisabled: await cancelButton(page).isDisabled(),
		fieldsetDisabled: (await fieldset(page).getAttribute('disabled')) !== null,
		nameDisabledByPlaywright: await nameField(page).isDisabled(),
		asks: traffic.asks,
		answersSoFar: traffic.answers
	});
	expect(traffic.answers, 'the submit was still unanswered while the button said CREATING').toEqual([]);

	// the 12 s hold, then the rest of the server's chain (tenant, organization, employee, team): 90 s, because on a
	// loaded lane the answer came later than 30 s after the hold (`lead-b-workspacenew-2.log`)
	await expect.poll(async () => traffic.answers.length, { timeout: 90_000 }).toBeGreaterThan(0);
	await expect(page).toHaveURL(/\/workspace\/welcome\?invited=0/, { timeout: 60_000 });
	report('the held creation finished', { answers: traffic.answers, url: page.url() });
	expect(consoleFindings(shield), 'the busy form logged nothing').toEqual([]);
});

test('Cancel returns to the page the person came from and sends nothing', async ({ app, shield }) => {
	const page = await app(WELCOME_PATH);
	const from = page.url();
	const traffic = watchCreateRequests(page);

	// a plain navigation, so the page it came from really is the previous history entry (`helpers.ts:424-430`)
	await page.goto(`${APP_ORIGIN}${CREATE_WORKSPACE_PATH}`, { waitUntil: 'domcontentloaded' });
	await waitForShellReady(page);
	await expect(createButton(page)).toHaveText(T.CREATE);
	await expect(cancelButton(page)).toBeEnabled();

	await cancelButton(page).click();
	await expect(page).toHaveURL(from, { timeout: 25_000 });
	// the page it returned to is really there before anything is said to be absent
	await expect(page.getByRole('heading', { name: T.WELCOME_TITLE, exact: true })).toBeVisible();
	await page.waitForTimeout(2_000); // quiet window: Cancel sent no create-workspace request
	report('cancel', { from, at: page.url(), asks: traffic.asks, answers: traffic.answers });
	expect(traffic.asks, 'Cancel sent nothing').toEqual([]);
	expect(consoleFindings(shield), 'Cancel logged nothing').toEqual([]);
});

test('a creation the server refuses prints its own reason and keeps the retry armed', async ({ app, mock, shield }) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);

	await nameField(page).fill('Aurora Studio');
	await expect(teamField(page)).toHaveValue('Aurora Studio');
	// armed after the load: the shell reads GET /api/auth/workspaces itself (`-p1.log` `P9 chain`)
	await mock.scenario({ fails: { [OPENING_ROUTE]: 500 } });
	await createButton(page).click();

	await expect(notice(page, T.FAILED_TITLE)).toBeVisible({ timeout: 30_000 });
	await expect(page.getByText(T.FAILED_DESCRIPTION, { exact: true })).toBeVisible();
	await expect(createButton(page)).toHaveText(T.CREATE);
	await expect(createButton(page)).toBeEnabled();
	// the page gave its own reason; the product's generic failure toast on top of it is a bug (`suites/mock/workspace.spec.ts:83-84`)
	await expect(page.getByText(EN.toasts.MUTATION_FAILED, { exact: true })).toHaveCount(0);
	await expect.poll(async () => traffic.answers.length, { timeout: 30_000 }).toBeGreaterThan(0);
	const refused = (await mock.calls(OPENING_ROUTE)).filter((call) => call.method === 'POST' && call.status === 500);
	const creation = (await mock.state()).workspaceCreation as { openings: number; tenant: string | null };
	report('refused creation', {
		answers: traffic.answers,
		mockRefusals: refused.map((call) => `${call.method} ${call.path} ${call.status}`),
		openings: creation.openings,
		tenant: creation.tenant,
		submitDisabled: await createButton(page).isDisabled()
	});
	expect(
		traffic.answers.some((status) => status === 502),
		'the route answered 502'
	).toBe(true);
	expect(refused.length, 'the mock was asked to open the workspace and refused it').toBeGreaterThanOrEqual(1);
	expect(creation.tenant, 'nothing was created').toBeNull();
	expect(
		consoleFindings(shield, [armedHttpError('POST', CLIENT_CREATE_PATH, 502), ARMED_502_MUTATION_LINE]),
		'only the armed refusal and the dev mutation log were left'
	).toEqual([]);
});

test('a creation the mock completes runs the whole chain and lands on the welcome page with its counts', async ({
	app,
	fixture,
	mock,
	shield
}) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const traffic = watchCreateRequests(page);
	const workspaceName = 'Lovelace Studio';
	const teamName = 'Design';
	const invited = ['grace@example.test', 'ada@example.test'];

	const cookieOf = async (name: string) =>
		(await page.context().cookies()).find((cookie) => cookie.name === name)?.value;
	const tenantBefore = await cookieOf('auth-tenant-id');
	await expect(page.getByRole('button', { name: switcherLabel(fixture.names.workspaceA) })).toBeVisible({
		timeout: 30_000
	});

	await nameField(page).fill(workspaceName);
	await expect(teamField(page)).toHaveValue(workspaceName);
	await teamField(page).fill(teamName);
	await expect(teamField(page)).toHaveValue(teamName);
	await invitesField(page).fill(invited.join(', '));
	await createButton(page).click();

	await expect(page).toHaveURL(/\/workspace\/welcome\?invited=2/, { timeout: 60_000 });
	const created = (await mock.state()).workspaceCreation as {
		openings: number;
		tenant: string | null;
		organization: string | null;
		team: { name: string | null } | null;
		invites: { emails: string[]; teamIds: string[] } | null;
	};
	const tenantAfter = await cookieOf('auth-tenant-id');
	const teamAfter = await cookieOf('auth-active-team');
	report('created through the real route', {
		answers: traffic.answers,
		serverTenant: created.tenant,
		serverOrganization: created.organization,
		serverTeam: created.team?.name ?? null,
		serverInvites: created.invites?.emails ?? null,
		teamCookieIsTheCreatedTeam: teamAfter === created.invites?.teamIds[0],
		tenantCookieChanged: tenantBefore !== undefined && tenantBefore !== tenantAfter,
		welcomeUrl: page.url()
	});
	expect(traffic.answers, 'the route answered the submit once').toEqual([201]);
	expect(created.openings, 'the mock opened the workspace once').toBe(1);
	expect(created.tenant).toBe(workspaceName);
	expect(created.organization).toBe(workspaceName);
	expect(created.team?.name, 'the team name typed is the team created').toBe(teamName);
	expect([...(created.invites?.emails ?? [])].sort(), 'the invitations are exactly the addresses typed').toEqual(
		[...invited].sort()
	);
	expect(teamAfter, 'the browser holds the team the mock created for the new workspace').toBe(
		created.invites?.teamIds[0]
	);
	expect(tenantAfter, 'the browser moved to a new workspace').not.toBe(tenantBefore);
	// the shell of the new workspace names it, read from the mock's own answer
	await expect(page.getByRole('button', { name: switcherLabel(workspaceName) }).first()).toBeVisible({
		timeout: 30_000
	});
	expect(consoleFindings(shield), 'the creation logged nothing').toEqual([]);
});
