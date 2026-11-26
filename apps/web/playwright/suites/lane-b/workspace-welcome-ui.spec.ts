import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Page } from '@playwright/test';

import { expect, test, type Shield } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person lands on right after creating a workspace: **`/workspace/welcome`**
 * (`app/[locale]/(main)/workspace/welcome/page.tsx:1-6` → `withAuthentication(WorkspaceWelcomePage)`
 * → `core/components/pages/workspace/workspace-welcome-page.tsx:27-97`), on lane-b (app `http://localhost:3032`,
 * mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, `playwright/test-servers.ts:39`).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock answers every read the shell and this page make (`cypress/support/mock-gauzy-server.mjs`),
 * the NextAuth stub of the fixture person and the app's own shell are the lane's, exactly as in every lane-b file.
 * Tests 1, 2, 3 and 6 run with **no stub at all**.
 *
 * **Served by this file**, with `page.route` and never `route.fetch()`:
 * - `POST /api/auth/create-workspace` on the **app origin**, in tests 4 and 5. The browser sends that one to this app's
 *   own route rather than to the mock: `workspaceService.createWorkspace` posts through `getFallbackAPI()`
 *   (`core/services/client/api/auth/workspace.service.ts:87-93`), which `core/services/client/api-factory.ts:3-12`
 *   builds on `API_BASE_URL` = `/api` (`core/constants/config/constants.tsx:96`) — a *relative* base, so the page origin
 *   answers it (`app/api/auth/create-workspace/route.ts:23-81`). Same origin, so no preflight was ever sent (measured:
 *   the stub saw one `POST` and no `OPTIONS`, `s3-lane-b-welcome-p1.log`, `-p3.log`); the mock's CORS answer
 *   (`mock-gauzy-server.mjs:1087-1101`) is restated only where a cross-origin leg is stubbed. The witness that the stub
 *   answered is `mock.calls('create-workspace')` being empty in both tests: the mock has no handler for that path at all
 *   and was never asked.
 * - `GET /api/user/me` on the **mock origin**, in tests 7 and 8, restating those CORS headers and answering `OPTIONS`
 *   with 204 — the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:275-350`. The witness is the same: the mock
 *   logged every `/api/user/me` it received with 200, so the refusal on screen can only be this file's.
 *
 * ## Where every pinned value came from
 *
 * Throwaway probes on this lane, `D:\Coding\.tmp\probe-welcome\probe.spec.ts` / `probe2.spec.ts` / `probe4.spec.ts` /
 * `probe5.spec.ts` with `probe.config.mjs` (no `webServer`), logs `D:\Coding\.tmp\s3-lane-b-welcome-p1.log` (the create
 * submit's origin, body and resulting URL; the signed-out redirect), `-p2.log` (a syntax error, no measurements),
 * `-p3.log` (the whole query-param matrix, four served create answers, the refused user reads at 500 / 401 / 403),
 * `-p4.log` (the accessible names and hrefs from `ariaSnapshot`, the two `<output>` elements on the page, the reads and
 * writes of a plain load, the mock's own user answer, the signed-out cookie jar), `-p5.log` (where each card and the
 * call to action land). Every test below also prints what it pinned as a `[lane-b workspace-welcome] MEASURE …` line, so
 * a later run can be compared with these; this file's own runs are `s3-lane-b-welcome-<n>.log`, and the two consecutive
 * whole-file runs whose summary is `8 passed` are named in `D:\Coding\.tmp\lane-b-welcome-status.md`.
 *
 * ## Measured, with no `[MEASURED, NOT INTENDED]` tag
 *
 * Nothing this file found contradicts a comment, a type, a unit test or the product copy, so no finding is tagged.
 * What is worth knowing:
 *
 * - **The paragraph names the workspace with the fallback copy on this lane.** `workspace-welcome-page.tsx:31` takes
 *   `user?.tenant?.name` and only falls back to `workspaceCreation.UNNAMED_WORKSPACE` when there is none, and the lane's
 *   user answer has none: `baseUser` is built with a `tenantId` and no `tenant` (`mock-gauzy-server.mjs:100-116`) and
 *   `/api/user/me` answers exactly that (`:607`), even though the app asks for the relation
 *   (`core/services/client/api/users/user.service.ts:65` `relations = ['role', 'tenant']`) and its schema keeps whatever
 *   arrives (`core/types/schemas/common/base.schema.ts:42` `tenant: z.any()`). So the *named* variant the unit test pins
 *   (`core/components/pages/workspace/workspace-welcome-page.test.tsx:24-26`, `:36-38`, which mocks the user query with
 *   `tenant: { name: 'Lovelace Studio' }`) is **not reachable through this lane's UI** without driving the mock's own
 *   workspace creation, which `suites/mock/workspace.spec.ts:40-67` already does. Test 1 pins the fallback as printed.
 * - `invitesFailed` is read as exactly `'1'` (`workspace-welcome-page.tsx:33`), so a hand-typed `?invitesFailed=2`,
 *   `=true` or `=0` warns nothing; `workspaceWelcomePathOf` only ever writes `'1'`
 *   (`core/hooks/auth/use-create-workspace.ts:90-92`). Pinned as printed in test 2.
 * - A served answer without `invited` produces `?invited=undefined` (`String(invited)` at
 *   `core/hooks/auth/use-create-workspace.ts:89`) and the page then prints no invitation sentence at all
 *   (`Number('undefined')` is NaN, `workspace-welcome-page.tsx:32`, `:63`). Measured in `-p3.log`; not a test, because
 *   the route always answers both fields (`app/api/auth/create-workspace/route.ts:55-58`).
 * - The `POST` body carries two fields the route's schema does not declare: `api.service.ts:653-661` ("Automatically add
 *   tenantId / organizationId") puts them in, and `createWorkspaceBodySchema` (`core/lib/validation/workspace.ts:13-21`)
 *   is a plain zod object, which strips what it does not know. Test 4 pins the body as the browser really sends it.
 * - A plain load of this route reads the signed-in user more than once — three of them in `-p4.log`, four in this
 *   file's own `-1.log` — because React Strict Mode mounts it twice, the door verifies the session server-side
 *   (`proxy.ts:526-548`) and dozens of components share the query. Only "a `GET /api/user/me` was sent" is pinned,
 *   never a count. The same load also writes things this page does not own (the shell's own presence
 *   `PUT /api/employee/me/presence` and statistics `POST /api/timesheet/statistics/tasks`), so nothing in this file
 *   claims "the page wrote nothing" from the mock log.
 * - The shell renders an `<output>` too (the time-zone notice), so the page's warning is located by its own copy, never
 *   by counting `<output>` elements (`-p4.log`: 2 with `?invitesFailed=1`, 1 without).
 * - The tab title comes from `PageLayout`'s `title` prop only (`page-layout.tsx:78-87`), so the document has exactly one
 *   h1 and the tab reads "Your workspace is ready | …" (`-p3.log`, `-p4.log`).
 * - The three cards and the call to action move without loading a new document (`-p5.log`: zero further documents after
 *   all four clicks). Pinned as "the target page's own copy is on screen", not as a document count.
 *
 * ## What this file does not cover
 *
 * The create-workspace form itself (its fields, its refusals, its timer guard, its checkout link) belongs to
 * `suites/mock/workspace.spec.ts:39-160`, which fills that form in seven tests; this file reuses how it is opened
 * (`/workspace/new`, `#workspace-name`, the `Create workspace` button) and starts at the submit.
 * `suites/lane-b/session-routing.spec.ts:41-63` already pins `/workspace` for a signed-out visitor from the browser and
 * `suites/api/page-gate.spec.ts` server-side; test 6 adds only what is specific to *this* route: a query string on the
 * refused path, the 307 the door answered it, and that nothing of the path or the query survived in the cookie jar.
 * The mock's real creation flow (new tenant ids, the cookies of the new workspace) is that other file's, not this one's:
 * here the served answer deliberately changes no cookie, so the page is still the fixture person's workspace.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const WELCOME_PATH = '/workspace/welcome';
const CREATE_WORKSPACE_PATH = '/workspace/new';
const CREATE_WORKSPACE_ROUTE = '/api/auth/create-workspace';
const USER_ME_ROUTE = '/api/user/me';
/** The name this file types, the same one `suites/mock/workspace.spec.ts` types. */
const NEW_WORKSPACE_NAME = 'Lovelace Studio';

/** `locales/en.json`: `workspaceCreation` `:3842-3887`, `pages.error.PAGE_NOT_LOADED` `:2815`,
 * `pages.unauthorized.TRY_AGAIN` `:2798`, `pages.systemPages` `:2785-2798`, `toasts.REASONS` `:4323-4335`,
 * `settings.entries.members` `:4713-4716`, `pages.projects.list.EMPTY_TITLE` / `pages.projects.projectTitle.PLURAL`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	workspaceCreation: Record<string, string>;
	pages: {
		error: { PAGE_NOT_LOADED: string };
		unauthorized: { TRY_AGAIN: string };
		systemPages: Record<string, string>;
		projects: { list: { EMPTY_TITLE: string }; projectTitle: { PLURAL: string } };
	};
	toasts: { REASONS: Record<string, string> };
	settings: { entries: { members: { TITLE: string; DESCRIPTION: string } } };
};
const T = EN.workspaceCreation;

/** The three cards in the order `workspace-welcome-page.tsx:35-54` builds them, with the copy each one prints. */
const STEPS = [
	{ title: T.STEP_INVITE_TITLE, description: T.STEP_INVITE_DESCRIPTION, href: '/settings/team/members' },
	{ title: T.STEP_PROJECT_TITLE, description: T.STEP_PROJECT_DESCRIPTION, href: '/projects' },
	{ title: T.STEP_TASK_TITLE, description: T.STEP_TASK_DESCRIPTION, href: '/' }
];

/** `{workspace}` filled in, the way `workspace-welcome-page.tsx:62` passes it. */
const descriptionOf = (workspace: string) => T.WELCOME_DESCRIPTION.replaceAll('{workspace}', workspace);

/**
 * `WELCOME_INVITED` = `"{count, plural, one {# invitation was sent.} other {# invitations were sent.}}"`
 * (`locales/en.json:3877`). The branch is read out of that very template: `one` for a whole 1, `other` for everything
 * else — including a decimal, which is what `?invited=1.5` printed (`-p3.log`).
 */
const invitedSentenceOf = (count: number) => {
	const branch = count === 1 ? 'one' : 'other';
	const template = T.WELCOME_INVITED.match(new RegExp(`${branch} \\{([^}]*)\\}`));
	if (!template) {
		throw new Error(`workspaceCreation.WELCOME_INVITED has no "${branch}" branch: ${T.WELCOME_INVITED}`);
	}
	return template[1].replace('#', String(count));
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b workspace-welcome] MEASURE ${label} ${JSON.stringify(value)}`);

/** React's dev-mode store warning: seen on some runs and not others on the same code (`suites/lane-b/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `api.service.ts` `logError`, for the user read this file refused: a line counts only when it names both. */
const armedUserReadError = (status: number) => (line: string) =>
	line.includes('[HttpClient]') && line.includes('user/me') && line.includes(String(status));
/**
 * A 401 user read starts the session-renewal path, and this lane's `auth-refresh-token` is the literal
 * `synthetic-refresh-token` (`playwright/helpers.ts:176`), not a JWT — so `decodeJWT` logs this exact line
 * (`-p3.log`; a 401 never reached the `[HttpClient]` line at all). Named in full, excused by nothing else.
 */
const SYNTHETIC_TOKEN_DECODE_FAILURE =
	'[JWT] Failed to decode token: InvalidTokenError: Invalid token specified: missing part #2';

const consoleFindings = (shield: Shield, expected: ((line: string) => boolean)[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((isExpected) => isExpected(line)));

/** The warning `Notice` (`core/components/common/notice.tsx:40` renders an `<output>`), found by its copy: the shell
 * renders an `<output>` of its own (`-p4.log`). */
const invitesFailedNotice = (page: Page) => page.locator('output').filter({ hasText: T.WELCOME_INVITES_FAILED });
/** The page's one paragraph (`workspace-welcome-page.tsx:61-64`); measured as the only `header p` on this route. */
const welcomeParagraph = (page: Page) => page.locator('header p');
const ctaLink = (page: Page) => page.getByRole('link', { name: T.OPEN_WORKSPACE, exact: true });

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every answer this file writes on the
 * mock origin; the allowed origin is the one that asked, as the mock echoes only an allowlisted one (`:1094-1095`). */
const MOCK_CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

type ServedCall = { method: string; url: string; body: string | null; contentType: string };

/** `POST /api/auth/create-workspace` answered by this file, with the invitations this case wants reported. */
async function serveCreateWorkspace(page: Page, answer: { invited?: number; invitesFailed?: boolean }) {
	const calls: ServedCall[] = [];
	await page.route(
		(url) => url.origin === APP_ORIGIN && url.pathname === CREATE_WORKSPACE_ROUTE,
		async (route) => {
			const request = route.request();
			calls.push({
				method: request.method(),
				url: request.url(),
				body: request.postData(),
				contentType: String(request.headers()['content-type'] ?? '')
			});
			if (request.method() === 'OPTIONS') {
				return route.fulfill({ status: 204 });
			}
			return route.fulfill({
				status: 201,
				contentType: 'application/json',
				headers: { 'cache-control': 'no-store' },
				body: JSON.stringify(answer)
			});
		}
	);
	return { calls };
}

/**
 * 1 · the route opened directly, signed in: everything the page prints, and the one read it is built on.
 * `workspace-welcome-page.tsx:57-93`; the mock's own copy of every string, never a typed one.
 */
test('opening the route directly prints its heading, its paragraph, its three step cards and its call to action', async ({
	app,
	mock,
	shield
}) => {
	const page = await app(WELCOME_PATH);

	await expect(page).toHaveURL(`${APP_ORIGIN}${WELCOME_PATH}`);
	// `PageLayout` puts the title on the tab only (`page-layout.tsx:78-87`): one h1 in the document.
	await expect(page).toHaveTitle(new RegExp(`^${T.WELCOME_TITLE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| `));
	await expect(page.getByRole('heading', { level: 1, name: T.WELCOME_TITLE })).toHaveCount(1);
	await expect(page.getByRole('heading', { level: 1 })).toHaveCount(1);

	const paragraph = descriptionOf(T.UNNAMED_WORKSPACE);
	await expect(welcomeParagraph(page), 'the paragraph is not the description as printed').toHaveText(paragraph);
	await expect(page.getByRole('list', { name: T.STEPS })).toHaveCount(1);

	const cards = page.getByRole('list', { name: T.STEPS }).locator('a');
	await expect(cards, 'the steps list does not hold three links').toHaveCount(3);
	for (const step of STEPS) {
		const card = page.getByRole('link', { name: step.title });
		await expect(card, `no card is named ${step.title}`).toHaveCount(1);
		// the card's accessible name is its two lines joined (`-p4.log` ariaSnapshot)
		await expect(card).toHaveAccessibleName(`${step.title} ${step.description}`);
		await expect(card).toHaveAttribute('href', step.href);
	}

	await expect(ctaLink(page), 'the call to action is not a link with exactly its copy').toHaveCount(1);
	await expect(ctaLink(page)).toHaveAttribute('href', '/');
	await expect(
		page.getByRole('button', { name: T.OPEN_WORKSPACE, exact: true }),
		'it is a link, not a button'
	).toHaveCount(0);

	// The read this page is built on (`core/hooks/queries/user-user.query.ts:14-28` → `/api/user/me`).
	await expect
		.poll(async () => (await mock.calls(USER_ME_ROUTE)).filter((call) => call.method === 'GET').length, {
			timeout: 20_000
		})
		.toBeGreaterThan(0);
	const userReads = await mock.calls(USER_ME_ROUTE);
	expect(
		userReads.map((call) => `${call.method} ${call.path}`).filter((shape) => shape !== `GET ${USER_ME_ROUTE}`),
		'the signed-in user read was not a GET on /api/user/me'
	).toEqual([]);

	report('direct-visit', {
		url: page.url(),
		title: await page.title(),
		paragraph: flat(await welcomeParagraph(page).innerText()),
		paragraphKey: 'workspaceCreation.WELCOME_DESCRIPTION + UNNAMED_WORKSPACE',
		cards: await cards.evaluateAll((nodes) =>
			nodes.map((node) => ({
				href: node.getAttribute('href'),
				text: (node.textContent || '').replace(/\s+/g, ' ').trim()
			}))
		),
		userReadCount: userReads.length,
		mockReads: (await mock.requests()).map((call) => `${call.method} ${call.path}`).sort(),
		mockWrites: (await mock.requests())
			.filter((call) => call.method !== 'GET')
			.map((call) => `${call.method} ${call.path}`),
		documents: shield.documents(),
		consoleErrors: shield.consoleErrors(),
		pageErrors: shield.pageErrors()
	});
	expect(consoleFindings(shield), 'the clean route logged a console error').toEqual([]);
	expect(shield.pageErrors(), 'the clean route threw a page error').toEqual([]);
});

/**
 * 2 · what the page says about invitations follows the two query params and nothing else
 * (`workspace-welcome-page.tsx:32-33` reads them, `:63` gates the count on `invited > 0`, `:67` gates the warning on
 * `invitesFailed === '1'`); the unit test `workspace-welcome-page.test.tsx:44-52` pins the same two gates.
 */
test('the invitation count sentence and the failed-invitations warning follow the query params, value by value', async ({
	app
}) => {
	const page = await app(WELCOME_PATH);
	const plain = descriptionOf(T.UNNAMED_WORKSPACE);

	const cases: Array<{ query: string; sentence: string | null; warning: boolean }> = [
		{ query: '', sentence: null, warning: false },
		{ query: '?invited=0', sentence: null, warning: false },
		{ query: '?invited=1', sentence: invitedSentenceOf(1), warning: false },
		{ query: '?invited=2', sentence: invitedSentenceOf(2), warning: false },
		{ query: '?invited=3', sentence: invitedSentenceOf(3), warning: false },
		{ query: '?invited=1.5', sentence: invitedSentenceOf(1.5), warning: false },
		{ query: '?invited=abc', sentence: null, warning: false },
		{ query: '?invited=', sentence: null, warning: false },
		{ query: '?invited=-1', sentence: null, warning: false },
		{ query: '?invitesFailed=1', sentence: null, warning: true },
		{ query: '?invitesFailed=0', sentence: null, warning: false },
		{ query: '?invitesFailed=2', sentence: null, warning: false },
		{ query: '?invitesFailed=true', sentence: null, warning: false },
		{ query: '?invited=0&invitesFailed=1', sentence: null, warning: true },
		{ query: '?invited=2&invitesFailed=1', sentence: invitedSentenceOf(2), warning: true }
	];

	const seen: Record<string, { paragraph: string; warning: number; noticeText: string }> = {};
	for (const { query, sentence, warning } of cases) {
		const label = query || '<no query>';
		await page.goto(`${APP_ORIGIN}${WELCOME_PATH}${query}`, { waitUntil: 'domcontentloaded' });
		// the whole page body renders in one pass (`workspace-welcome-page.tsx:58-93`), so the CTA proves the
		// paragraph next to it was painted
		await expect(ctaLink(page), `${label}: the page did not render`).toBeVisible({ timeout: 30_000 });
		await expect(welcomeParagraph(page), `${label}: the paragraph is not what the page printed`).toHaveText(
			sentence ? `${plain} ${sentence}` : plain
		);
		const notice = invitesFailedNotice(page);
		await expect(
			notice,
			`${label}: the warning does not follow invitesFailed=${new URLSearchParams(query).get('invitesFailed')}`
		).toHaveCount(warning ? 1 : 0);
		seen[label] = {
			paragraph: flat(await welcomeParagraph(page).innerText()),
			warning: await notice.count(),
			noticeText: warning ? flat(await notice.innerText()) : ''
		};
	}
	report('notice-matrix', seen);
});

/**
 * 3 · each card and the call to action is a link to the page it names (`workspace-welcome-page.tsx:70-84`, `:90-92`),
 * and clicking one leaves the person on that page — measured landing points in `-p5.log`.
 */
test('each step card and the call to action take the person to the page they name', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(`${WELCOME_PATH}?invited=2`);
	const cards = page.getByRole('list', { name: T.STEPS }).locator('a');
	await expect(cards).toHaveCount(3);

	const landed: Record<string, { url: string; h1: string }> = {};
	const proofs = [
		// Settings › Team › Members: its own title and description (`members-settings-page.tsx:66-68`)
		{ copy: EN.settings.entries.members.TITLE, description: EN.settings.entries.members.DESCRIPTION },
		// /projects, empty for this fixture person: `page-component.tsx:167` and `pages.projects.list.EMPTY_TITLE`
		{ copy: EN.pages.projects.projectTitle.PLURAL, description: EN.pages.projects.list.EMPTY_TITLE },
		// the workspace root: its h1 is the fixture team's name
		{ copy: fixture.names.teamA, description: '' }
	];

	for (let index = 0; index < STEPS.length; index += 1) {
		const card = cards.nth(index);
		const href = STEPS[index].href;
		await expect(card).toHaveAttribute('href', href);
		await card.click({ timeout: 15_000 });
		await expect(page, `card ${index} did not open ${href}`).toHaveURL(new URL(href, APP_ORIGIN).href, {
			timeout: 30_000
		});
		const proof = proofs[index];
		await expect(
			page.getByRole('heading', { level: 1, name: proof.copy }),
			`card ${index}: ${href} drew no heading of its own`
		).toBeVisible({ timeout: 30_000 });
		if (proof.description) {
			await expect(
				page.getByText(proof.description, { exact: true }),
				`card ${index}: ${href} did not describe itself`
			).toBeVisible();
		}
		landed[`${index} → ${href}`] = { url: page.url(), h1: proof.copy };
		await page.goBack({ waitUntil: 'load' });
		await expect(
			page.getByRole('list', { name: T.STEPS }),
			`card ${index}: Back did not return to the welcome page`
		).toBeVisible({
			timeout: 30_000
		});
	}

	await ctaLink(page).click({ timeout: 15_000 });
	await expect(page, 'the call to action did not open the workspace').toHaveURL(`${APP_ORIGIN}/`, {
		timeout: 30_000
	});
	await expect(page.getByRole('heading', { level: 1, name: fixture.names.teamA })).toBeVisible({ timeout: 30_000 });
	landed['call to action → /'] = { url: page.url(), h1: fixture.names.teamA };

	report('step-clicks', {
		landed,
		// every move was client-side: no further document was requested (`-p5.log`)
		documents: shield.documents().length,
		consoleErrors: shield.consoleErrors(),
		pageErrors: shield.pageErrors()
	});
	expect(shield.pageErrors(), 'a step card threw a page error').toEqual([]);
});

/**
 * 4 · from the submit on: the answer this file serves is what the hook is handed, and `workspaceWelcomePathOf`
 * (`core/hooks/auth/use-create-workspace.ts:88-94`) turns it into the URL; `onSuccess` is a full page load
 * (`:119-121`), not a client-side push.
 */
test('a served create-workspace answer posts only what the form holds and opens the welcome page with its counts', async ({
	app,
	mock,
	fixture
}) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const served = await serveCreateWorkspace(page, { invited: 2 });

	await page.locator('#workspace-name').fill(NEW_WORKSPACE_NAME);
	await page.locator('#workspace-invites').fill('grace@example.test, ada@example.test');
	await page.getByRole('button', { name: T.CREATE }).click({ timeout: 15_000 });

	await expect(page, 'the browser never moved to the welcome page').toHaveURL(
		`${APP_ORIGIN}${WELCOME_PATH}?invited=2`,
		{
			timeout: 40_000
		}
	);

	const posts = served.calls.filter((call) => call.method === 'POST');
	expect(
		posts.map((call) => call.url),
		"the creation was not posted to this app's own route"
	).toEqual([`${APP_ORIGIN}${CREATE_WORKSPACE_ROUTE}`]);
	expect(posts[0]?.contentType, 'the creation was not posted as JSON').toBe('application/json');
	expect(
		served.calls.filter((call) => call.method === 'OPTIONS'),
		'a same-origin POST was preflighted'
	).toEqual([]);
	expect(
		posts[0] ? JSON.parse(String(posts[0].body)) : null,
		'the body is not the three fields the form holds plus the two the API client adds'
	).toEqual({
		name: NEW_WORKSPACE_NAME,
		teamName: NEW_WORKSPACE_NAME,
		invites: ['grace@example.test', 'ada@example.test'],
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA
	});
	expect(await mock.calls('create-workspace'), 'the mock was asked to create a workspace').toEqual([]);

	await expect(
		welcomeParagraph(page),
		'the paragraph did not count the invitations the served answer reported'
	).toHaveText(`${descriptionOf(T.UNNAMED_WORKSPACE)} ${invitedSentenceOf(2)}`);

	report('served-answer-invited-2', {
		url: page.url(),
		served: served.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
		bodyKeys: posts[0] ? Object.keys(JSON.parse(String(posts[0].body))).sort() : [],
		paragraph: flat(await welcomeParagraph(page).innerText())
	});
});

/**
 * 5 · the same submit on an answer whose invitations failed: `invitesFailed=1` is added and only that
 * (`use-create-workspace.ts:90-92`, pinned by `use-create-workspace.test.tsx:95-100`), and the page warns in its own
 * words (`workspace-welcome-page.tsx:67`).
 */
test('a served answer with failed invites builds invited=0&invitesFailed=1 and the page says the invitations failed', async ({
	app,
	mock
}) => {
	const page = await app(CREATE_WORKSPACE_PATH);
	const served = await serveCreateWorkspace(page, { invited: 0, invitesFailed: true });

	await page.locator('#workspace-name').fill(NEW_WORKSPACE_NAME);
	await page.getByRole('button', { name: T.CREATE }).click({ timeout: 15_000 });

	await expect(page, 'the failed answer never reached the welcome page').toHaveURL(
		`${APP_ORIGIN}${WELCOME_PATH}?invited=0&invitesFailed=1`,
		{ timeout: 40_000 }
	);
	expect(
		served.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
		'the submit did not reach this file'
	).toEqual([`POST ${CREATE_WORKSPACE_ROUTE}`]);
	expect(await mock.calls('create-workspace'), 'the mock was asked to create a workspace').toEqual([]);

	await expect(welcomeParagraph(page), 'a failed invitation was counted anyway').toHaveText(
		descriptionOf(T.UNNAMED_WORKSPACE)
	);
	const notice = invitesFailedNotice(page);
	await expect(notice, 'the served failure drew no warning notice').toHaveCount(1);
	await expect(notice).toHaveText(T.WELCOME_INVITES_FAILED);

	report('served-answer-invites-failed', {
		url: page.url(),
		served: served.calls.map((call) => `${call.method} ${new URL(call.url).pathname}`),
		paragraph: flat(await welcomeParagraph(page).innerText()),
		notice: flat(await notice.innerText())
	});
});

/**
 * 6 · a signed-out visitor is turned away by the door, not by the page: `/workspace/…` is protected
 * (`core/constants/config/constants.tsx:132`), `proxy.ts:522-525` answers `deny_redirect(false)`, and
 * `proxy.ts:178-188` redirects to `/unauthorized` while clearing every cookie of `cookiesKeys()`. The page never runs,
 * and nothing of the requested path or its query is kept. `session-routing.spec.ts:41-63` pins `/workspace` itself;
 * what is added here is the query string this route arrives with.
 */
test('a signed-out visitor of the welcome page is redirected by the door, and the jar keeps nothing of the path or query', async ({
	anon,
	shield
}) => {
	const askedFor = `${WELCOME_PATH}?invited=2&invitesFailed=1`;
	const page = await anon(askedFor);

	await expect(page, 'a visitor without a session was not sent to the sign-in page').toHaveURL(/\/unauthorized$/, {
		timeout: 20_000
	});
	const asked = shield.documents().find((document) => document.url.includes(WELCOME_PATH));
	expect(
		asked?.status,
		`the door answered ${askedFor} with ${asked?.status} instead of a redirect the browser follows`
	).toBe(307);

	await expect(page.getByText(EN.pages.systemPages.UNAUTHORIZED_TITLE, { exact: true })).toBeVisible();
	await expect(page.getByRole('link', { name: EN.pages.systemPages.SIGN_IN, exact: true })).toHaveAttribute(
		'href',
		'/auth/passcode'
	);

	const cookies = await page.context().cookies();
	const authCookies = cookies.filter((cookie) => cookie.name.startsWith('auth-'));
	expect(
		authCookies.filter((cookie) => cookie.value !== '').map((cookie) => cookie.name),
		`the door left a session cookie with a value: ${authCookies.map((cookie) => cookie.name).join(', ')}`
	).toEqual([]);
	expect(
		cookies
			.filter((cookie) => cookie.value.includes('workspace') || cookie.value.includes('invited'))
			.map((cookie) => cookie.name),
		'part of the requested path or query survived in the jar'
	).toEqual([]);

	report('signed-out', {
		askedFor,
		url: page.url(),
		documents: shield.documents(),
		authCookieNames: authCookies.map((cookie) => cookie.name).sort(),
		otherCookieNames: cookies
			.filter((cookie) => !cookie.name.startsWith('auth-'))
			.map((cookie) => cookie.name)
			.sort(),
		body: flat(await page.locator('body').innerText()).slice(0, 200)
	});
});

/**
 * 7 and 8 · the signed-in user read refused behind `withAuthentication`: `authenticator.tsx:89-92` replaces the page
 * with `UserReadFailedState` (`user-read-failed-state.tsx:28-46`), whose reason is the app's own error feedback
 * (`user-read-retry.ts:56-64` → `error-feedback.ts:153-178`) and whose retry rule is `user-read-retry.ts:33-47`
 * (a 500 is asked again, a 401 is not).
 */
for (const status of [500, 401]) {
	test(`a ${status} signed-in user read stands in place of the welcome page, with its reason and a Try again`, async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await page.route(
			(url) => url.origin === MOCK_API_ORIGIN && url.pathname === USER_ME_ROUTE,
			async (route) => {
				const request = route.request();
				if (request.method() === 'OPTIONS') {
					return route.fulfill({
						status: 204,
						headers: { ...MOCK_CORS_HEADERS, 'access-control-allow-origin': APP_ORIGIN }
					});
				}
				const refused = status;
				return route.fulfill({
					status: refused,
					headers: {
						...MOCK_CORS_HEADERS,
						'access-control-allow-origin': APP_ORIGIN,
						'content-type': 'application/json'
					},
					body: JSON.stringify({ statusCode: refused, message: 'this file refused the signed-in user read' })
				});
			}
		);

		// The refused read is the one the shell waits for, so the shell's ready mark is not what this load waits on.
		await signInAndVisit(page, fixture, `${WELCOME_PATH}?invited=2`, { requireShell: false });

		const reason = status === 500 ? EN.toasts.REASONS.SERVER : EN.toasts.REASONS.SESSION;
		await expect(
			page.getByText(EN.pages.error.PAGE_NOT_LOADED, { exact: true }),
			`a ${status} user read drew no page-not-loaded title`
		).toBeVisible({ timeout: 30_000 });
		await expect
			.poll(() => page.locator('body').innerText(), {
				message: `a ${status} user read did not say why`,
				timeout: 30_000
			})
			.toContain(reason);
		await expect(
			page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true }),
			`a ${status} user read offered no Try again`
		).toHaveCount(1);
		// the welcome page is not drawn at all against a refused user (`authenticator.tsx:90-92`)
		await expect(
			page.getByText(T.WELCOME_TITLE, { exact: true }),
			'the welcome page survived the refused read'
		).toHaveCount(0);

		// every refusal on screen came from this file: the mock answered the same read with 200
		const logged = await mock.calls(USER_ME_ROUTE);
		expect(
			logged.filter((request) => request.status >= 400).length,
			`a ${status}: the mock itself refused the signed-in user read`
		).toBe(0);

		const excused =
			status === 500
				? [armedUserReadError(status)]
				: [(line: string) => line.includes(SYNTHETIC_TOKEN_DECODE_FAILURE)];
		report('refused-user-read', {
			status,
			reason,
			url: page.url(),
			title: await page.title(),
			mockUserReads: logged.map((request) => `${request.method} ${request.path} ${request.status}`),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(
			consoleFindings(shield, excused),
			`a ${status}: besides the line this file armed, the page logged a console error`
		).toEqual([]);
		expect(shield.pageErrors(), `a ${status}: the page threw`).toEqual([]);
	});
}
