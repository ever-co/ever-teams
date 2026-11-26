import { expect, test, type Page, type Shield } from '../../fixtures';
import type { APIRequestContext, Locator } from '@playwright/test';

import { APP_ORIGIN, mockReset, signInAndVisit, type BootstrapFixture, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees on the Docs home (`/docs`) and in the Docs trash (`/docs/trash`): whether Docs is
 * offered at all, the page tree, starting a page, and the trash with its Restore — pinned in a real Chrome on lane-c
 * (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `http://127.0.0.1:4004`,
 * `playwright/test-servers.ts:40`) on 2026-11-23 in this file's two consecutive green runs
 * `E:\Coding\.tmp\s2-lane-c-docshome-12.log` and `s2-lane-c-docshome-13.log`; the numbers that vary between runs (the
 * count asks of cases D and E, case C's tree read, the warm-up asks) are named with every value this file measured,
 * run by run, in `-1` through `-11` — the red ones (`-1`, `-2`, `-5`) are named too, with what each one was really
 * measuring. Every number, string and attribute below is one a run printed on its
 * `MEASURE` line, and each of those lines was read off first by the measurement probe
 * `E:\Coding\.tmp\probe-docs-home\probe.mjs` (`p-avail-{number,mock,404,500,drop}.log`, `p-avail-404-trash.log`,
 * `p-tree.log`, `p-page-open.log`, `p-create.log`, `p-create403.log`, `p-create-echo.log`, `p-tree-500.log`,
 * `p-trash.log`, `p-restore.log`, `p-trash-empty.log`), which is what the request lists and the DOM facts were taken
 * from before a single assertion was written.
 *
 * ## The gate, and the switch that opens it
 *
 * Docs ships behind `NEXT_PUBLIC_DOCS_ENABLED` (`core/lib/utils/docs-enabled.ts:7-9`), read from the public runtime
 * env the server writes on `<html data-ever-teams-runtime-env>`. Off, `core/components/pages/docs/docs-page.tsx:87`
 * `const enabled = isDocsEnabled()` plus `:121` `if (!enabled) router.replace('/')` send every `/docs…` route to the
 * app home. A lane gets the flag from `E2E_DOCS=1` (`playwright/test-servers.ts:154`); this file reads it back off
 * the served document and skips itself without it, exactly as `docs-page-write-access-ui.spec.ts` does. Every run
 * therefore carries `E2E_LANE=lane-c E2E_REUSE_SERVERS=1 E2E_EVER_ID=1 E2E_DOCS=1 E2E_BROWSER_CHANNEL=chrome`, and
 * the lane was checked (never started) with `node apps/web/playwright/scripts/lane-servers.mjs check lane-c`.
 *
 * ## What a bare `/docs` visit asks for, measured before any stub was written
 *
 * The browser calls the mock **directly** (`NEXT_PUBLIC_GAUZY_API_SERVER_URL` is the mock origin,
 * `core/constants/config/constants.tsx:229-232`, and `core/services/client/api.service.ts:516` appends `/api`), so
 * these are the paths the stubs answer. In order (`p-avail-mock.log`, nothing stubbed):
 *
 * 1. `GET /api/plugins/docs/documents/count?kind[0]=PAGE&archived=exclude&where[organizationId]=…&where[tenantId]=…`
 *    — the availability probe (`core/hooks/docs/use-docs-availability.ts:31`, `docsService.count`).
 * 2. `GET /api/plugins/docs/documents?kind[0]=FOLDER&kind[1]=PAGE&archived=exclude&sort=name&sortOrder=ASC&take=100
 *    &skip=1&…` — the tree (`core/hooks/docs/use-docs-tree.ts:41`, `listAll` → one page of 100).
 * 3. `GET /api/plugins/docs/documents/spaces?organizationId=…&tenantId=…` — Docs collaboration's spaces
 *    (`core/hooks/docs/use-docs-collaboration.ts`, `docsService.spaces`). Left to the mock, whose answer
 *    `{items:[],total:0}` is not an array, so `spaces()` returns `[]` and no team-space section is mounted.
 *
 * `/docs/trash` asks the same count, the same list with `archived=only&sort=updatedAt&sortOrder=DESC`
 * (`use-docs-tree.ts:74`) **and** the tree list, because the tree pane is mounted beside the trash
 * (`docs-page.tsx:399-424`) — measured in `p-trash.log`.
 *
 * ## The availability probe, and what each of its five answers does to the page
 *
 * `probeDocsAvailability` (`use-docs-availability.ts:28-40`) asks `docsService.count` once per page load and shares
 * the answer; a decided answer is memoized, an undecided one releases the memo (`:35 probe = null`) so a consumer
 * that mounts later asks again. `ApiErrorService.isEndpointUnavailable()` (`core/services/client/api-error.service.ts
 * :253-255`) counts **404, 405 and 501** only. Measured, on `/docs`:
 *
 * | the count answer | what `/docs` shows | count asks in one visit |
 * | --- | --- | --- |
 * | 200 `3` | the Docs home, tree and welcome; the sidebar's Docs entry | **1** (case A) |
 * | 200 `{items:[],total:0}` (the mock's own fallback) | the Docs home, empty tree | **1** (case B) |
 * | 404 | an empty state: `docs.UNAVAILABLE_TITLE` + `docs.UNAVAILABLE_TEXT`, **no** tree, **no** Retry, and the sidebar's Docs entry gone | **1** (case C) |
 * | 500 | the Docs home **as if Docs were available**: tree, rows, no `docs.LOAD_ERROR`, no Retry | **1 or 2** — 2 in runs 1, 2, 7, 8, 9, 10 and 11 of case D, 1 in runs 3 and 4 |
 * | a dropped connection (`scenario.drops`) | the same as the 500 | **1 or 2** — 2 in runs 1, 3, 7, 9 and 11 of case E, 1 in runs 2, 4, 8 and 10 |
 *
 * A decided answer (a number, or a 404) is memoized, so it is asked exactly once — pinned as `1` in cases A, B and C,
 * and measured 1 in every run of them. An undecided one releases the memo (`use-docs-availability.ts:35`), so the
 * number is a race between the refusal and the tree pane mounting: mount first and both consumers share the one
 * in-flight promise (**1** ask), refusal first and the tree mount asks again (**2**). Cases D and E print their number
 * on the `MEASURE` line and pin `>= 1`, because pinning a fixed one here would be pinning the race. Case E's mock log
 * lists **more** connections than this page asked (4 for 2 asked in run 7, 2 for 1 in run 8, 5 for 2 in run 9, 2 for
 * 1 in run 10, 2 for 2 in run 11): the mock logs per connection, not
 * per page load (`cypress/support/mock-gauzy-server.mjs:1064-1090`), so it also logs the warm-up page's cut and
 * Chrome's own retries of a GET that dies on a connection error.
 *
 * A 500 or a cut connection leaves the availability `unknown`, which is not `unavailable`, so nothing on the page
 * says anything about it: the Docs entry stays (`app-sidebar.tsx:245`) and the home renders as usual. That is the
 * honest answer to "does it show an error or a retry?" — **no**, and the retry UI belongs to a failed *tree* read
 * instead, which is case F: `docs.LOAD_ERROR` in two `role="alert"` blocks with two `Retry` buttons
 * (`docs-tree-pane.tsx:158-169`, `docs-home.tsx:187-196`).
 *
 * Case C carries a race worth naming rather than hiding: whether the tree read gets out **before** the 404 closes the
 * query is pure timing. This file measured a read in runs 1, 4, 7, 8, 9 and 11 and **no** read in runs 2, 3 and 10 —
 * the tree
 * mounts with the availability still `unknown`, and a mock that answers in tens of milliseconds can close the query
 * first. Case C pins the ceiling (never more than one) and the empty screen, not a number that flips between runs.
 *
 * Case B is the mock's own count body: `Number({items:[],total:0})` is `NaN` (`docs.service.ts:81`), which is not an
 * error, so the probe resolves `available` and Docs is offered. It is not written as "measured, not intended"
 * because nothing downstream reads the number — `docsService.count` has exactly one caller (this probe) and the home's
 * own page count comes from the tree list, not from the count (`docs-home.tsx:68,114`): with the mock's answer the
 * welcome line carries **no** `docs.PAGE_COUNT` span, and with the stubbed `3` it reads `· 3 pages`.
 *
 * ## The stubs
 *
 * The lane mock has **no docs handler**: every docs GET answers 200 `{"items":[],"total":0}`, a write echoes its body
 * and a DELETE answers `{affected:1,raw:[]}`. For a list that is a harmless empty tree; for a single-page read it
 * describes **no page**, and for a create it answers a body with **no `id`** — measured in `p-create-echo.log`, where
 * the person lands on `/docs/undefined` and the page view throws `TypeError: Cannot read properties of null (reading
 * 'position')`. So every read and write this file relies on is answered here, with the mock's own CORS set restated
 * (without it the browser discards the answer and the read becomes an outage), and the stub tracks what it restored
 * so the trash and the tree agree with each other the way a platform's would.
 *
 * Opening a page is **two** reads: `GET …/documents/<id>` and `GET …/documents/<id>/path` (`docs.service.ts:87,92`,
 * asked by `use-docs-page.ts:29-44`), and both have to be answered. `use-docs-page.ts:44` (`query.data ?? []`) guards
 * only a *missing* answer, so the mock's `{items:[],total:0}` reaches `path.filter` as an object
 * (`docs-page-view.tsx:804`) and the whole page view dies: measured in this file's first run, `/docs/<child>` and
 * `/docs/<created>` both rendered the app's own crash screen (`error.HEADING_TITLE`, `locales/en.json:2813`) carrying
 * `TypeError: path.filter is not a function`. Cases G and H therefore assert that screen **away** — a throw the error
 * boundary swallows never reaches `shield.pageErrors()`, so the screen is the only trace it leaves.
 *
 * Three cases let a call reach the mock so that its log carries it: case B (the count, unstubbed), case E (the count
 * under a `drops` arm) and cases F and I (the list path armed with `scenario.fails`; every list read of those cases
 * is either answered by the stub or is the very call being refused). The mock's switches are keyed by pathname with
 * **no verb**, which is why case I answers the tree list itself: the create POST shares that pathname with it.
 *
 * Four reads are deliberately left to the mock, because nothing a case here pins depends on their answer; case G's
 * `mockDocsCalls` line lists them for an opened page: `documents/spaces` and `…/<id>/follow`
 * (`core/hooks/docs/use-docs-collaboration.ts:35,60`), `exports/pdf` (`core/hooks/docs/use-docs-import.ts:51`,
 * `core/services/client/api/docs/docs-import.service.ts:48`) and `…/<id>/comment-anchors`
 * (`core/hooks/docs/use-docs-comments.ts`). The mock's `{items:[],total:0}` answer leaves each of those features
 * switched off rather than breaking the page — unlike the `/path` read above, which is consumed as an array.
 *
 * ## Scoping, and the typing hazard
 *
 * The Docs page mounts three `<main>` elements (`p-avail-number.log`): the shell's, `PageLayout`'s
 * (`core/components/layouts/default-layout/page-layout.tsx:146`) and `docs-page.tsx:425`'s own; only the last holds
 * the home or the trash, and only it holds exactly one `New page` button (page-wide there are three, plus two named
 * `New private page`: the pane header, the Workspace and Private section actions, and the home's own pair). Tree rows
 * are addressed by the `data-docs-row` the component itself writes (`docs-tree.tsx:269`) because the same page title
 * also appears as a link in the home's "Recently updated" list (`docs-home.tsx:210`).
 *
 * Counting asks needs a cut between page loads, and getting it wrong invented a failure. `hardVisit` warms the
 * browser with a `goto` of the app home (`playwright/helpers.ts:424`), and that home page keeps running — its sidebar
 * mounts `useDocsAvailability` and asks the count — until the target document is answered; in a cold lane answering
 * took **31 052 ms** (run 5's trace: `GET http://localhost:3033/docs` started at 17:25:47.109), so the warm-up page's
 * own `GET …/documents/count` landed 1.7 s **after** the target's document request and a counter armed on that
 * request read it as this page's second ask, which is what turned case A red. `docsRequestsSeen` now arms on the
 * target document's **response** — the moment the old document is replaced — and collects whatever the warm-up page
 * asked in a list of its own, which case A prints as `warmUpAsks` (`[]` in every warm-lane run measured).
 *
 * Raw counts are not evidence here. `page.getByRole('alert').count()` prints 1 in case D and 3 in case F, and in both
 * runs exactly one of those carries **no text at all** (`alertTexts [""]`) and belongs to the shell, not to Docs — so
 * every alert assertion in this file is filtered by the docs copy (`loadErrorAlerts`), and the raw count plus its
 * `alertTexts` are printed for the reader rather than asserted. The same goes for page titles: the same name appears
 * as a tree row, a "Recently updated" link and a breadcrumb crumb, so the assertions that matter are scoped to one
 * of those containers.
 *
 * Nothing here types. That matters on a page with nothing editable: a keystroke there is not text but one of the
 * app's shortcut keys — `h` opens the "Keyboard shortcuts" sheet (`core/hooks/common/use-hotkeys.ts:105`) and the
 * sequence `t h` runs `themeToggle` (`core/lib/keyboard/shortcuts.ts:68`), both measured in
 * `docs-page-write-access-ui.spec.ts`'s own header. Every interaction below is a click on a button or a link, and the
 * two cases that reach an editor (case G's opened page, case H's created page) only read it.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `docsService.BASE` (`core/services/client/api/docs/docs.service.ts:29`) on the mock origin, proxy-prefixed. */
const DOCS_PREFIX = '/api/plugins/docs';
const DOCS_BASE = '/api/plugins/docs/documents';
const DOCS_COUNT = `${DOCS_BASE}/count`;

/** Synthetic ids: the lane mock holds no document of its own. */
const PARENT_ID = 'playwright-docs-parent';
const CHILD_ID = 'playwright-docs-child';
const SIBLING_ID = 'playwright-docs-sibling';
const TRASH_A_ID = 'playwright-docs-trashed-a';
const TRASH_B_ID = 'playwright-docs-trashed-b';
const CREATED_ID = 'playwright-docs-created';

/** What the mock's `fails` arm writes as the message (`cypress/support/mock-gauzy-server.mjs:1102`). */
const MOCK_REFUSAL_403 = 'Synthetic Gauzy refusal (403)';

/** The English, copied from `locales/en.json` (the key named in each entry; the suite has no locale helper). */
const TEXT = {
	title: 'Docs', // docs.TITLE
	welcome: 'Write things down next to your work', // docs.WELCOME_TITLE
	workspace: 'Workspace', // docs.WORKSPACE
	private: 'Private', // docs.PRIVATE
	home: 'Home', // docs.HOME
	trash: 'Trash', // docs.TRASH
	trashEmptyTitle: 'The trash is empty', // docs.TRASH_EMPTY_TITLE
	trashEmptyText: 'Pages you move to the trash wait here until you restore or delete them.', // docs.TRASH_EMPTY_TEXT
	trashedAt: 'In the trash since', // docs.TRASHED_AT, "In the trash since {date}"
	restore: 'Restore', // docs.RESTORE
	deleteForever: 'Delete forever', // docs.DELETE_FOREVER
	restored: '"Probe Trashed B" is back.', // docs.RESTORED, "\"{title}\" is back."
	loadError: 'The pages could not be loaded.', // docs.LOAD_ERROR
	retry: 'Retry', // docs.RETRY
	unavailableTitle: 'Docs is not available on this server', // docs.UNAVAILABLE_TITLE
	unavailableText: 'The platform this workspace runs on does not serve documents yet.', // docs.UNAVAILABLE_TEXT
	workspaceEmpty: 'No pages yet. Create the first one.', // docs.WORKSPACE_EMPTY
	privateEmpty: 'Pages only you can see go here.', // docs.PRIVATE_EMPTY
	projectPagesEmptyTitle: 'No pages yet', // docs.PROJECT_PAGES_EMPTY_TITLE
	newPage: 'New page', // docs.NEW_PAGE
	createError: 'The page could not be created.', // docs.CREATE_ERROR
	untitled: 'Untitled', // docs.UNTITLED
	expand: 'Expand', // docs.EXPAND
	pageTitle: 'Page title', // docs.PAGE_TITLE
	emptyCount: '3 pages', // docs.PAGE_COUNT, "# pages" with count 3
	crashTitle: 'Something went wrong', // error.HEADING_TITLE, en.json:2813 — the app's own render-crash screen
	breadcrumb: 'breadcrumb' // docs-page-view.tsx:827 <Breadcrumb> → nav[aria-label="breadcrumb"]
};

const NAMES: Record<string, string> = {
	[PARENT_ID]: 'Probe Parent',
	[CHILD_ID]: 'Probe Child',
	[SIBLING_ID]: 'Probe Sibling',
	[TRASH_A_ID]: 'Probe Trashed A',
	[TRASH_B_ID]: 'Probe Trashed B'
};

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c docs home] MEASURE ${label} · ${parts}`);
}

/** What the app under test publishes as its public runtime env, read off the document it serves. */
let docsFlag: string | undefined;
async function readDocsFlag(request: APIRequestContext): Promise<string | undefined> {
	if (docsFlag === undefined) {
		const html = await (await request.get('/')).text();
		const match = html.match(/data-ever-teams-runtime-env="([^"]*)"/);
		const json = (match?.[1] ?? '')
			.replace(/&quot;/g, '"')
			.replace(/&#x27;/g, "'")
			.replace(/&lt;/g, '<')
			.replace(/&gt;/g, '>')
			.replace(/&amp;/g, '&');
		let env: Record<string, string> = {};
		try {
			env = json ? (JSON.parse(json) as Record<string, string>) : {};
		} catch {
			env = {};
		}
		docsFlag = env.NEXT_PUBLIC_DOCS_ENABLED;
	}
	return docsFlag;
}

test.beforeEach(async ({ request }) => {
	const flag = await readDocsFlag(request);
	test.skip(
		flag !== 'true',
		`this app publishes NEXT_PUBLIC_DOCS_ENABLED = ${JSON.stringify(flag ?? null)}, so /docs and /docs/trash bounce ` +
			`to the app home (docs-page.tsx:87,121) and no case here can be reached — start the lane with E2E_DOCS=1 ` +
			`(playwright/test-servers.ts sharedEnv)`
	);
});

// Several cases arm `fails` / `drops`, and a scenario outlives a test unless the mock is reset: `setScenario`
// shallow-merges (playwright/helpers.ts:138-139). This is what keeps an arm from being seen by the next spec.
test.afterEach(async () => {
	await mockReset();
});

/** The mock's own CORS answer, restated on every answer this spec writes (`clients-access-ui.spec.ts:138-145`). */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** One listed page, from `IDocumentPage` (`core/types/interfaces/common/docs.ts:56-94`); no content fields, as a list row has none. */
function pageRow(
	fixture: BootstrapFixture,
	id: string,
	overrides: Record<string, unknown> = {}
): Record<string, unknown> {
	return {
		id,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		kind: 'PAGE',
		parentId: null,
		index: 0,
		name: NAMES[id] ?? id,
		icon: null,
		color: null,
		description: null,
		visibility: 'ORGANIZATION',
		organizationTeamId: null,
		isArchived: false,
		archivedAt: null,
		createdByUserId: fixture.ids.user,
		createdAt: '2026-01-05T09:00:00.000Z',
		updatedAt: '2026-01-05T09:00:00.000Z',
		version: 1,
		...overrides
	};
}

/** The tree the stub answers: a root page with one child, and a second root page. */
const TREE_ROWS = (fixture: BootstrapFixture): Array<Record<string, unknown>> => [
	pageRow(fixture, PARENT_ID, { index: 0, updatedAt: '2026-01-06T09:00:00.000Z' }),
	pageRow(fixture, CHILD_ID, { parentId: PARENT_ID, index: 0, updatedAt: '2026-01-07T09:00:00.000Z' }),
	pageRow(fixture, SIBLING_ID, { index: 1, updatedAt: '2026-01-04T09:00:00.000Z' })
];

/** The trash the stub answers: two archived pages, the newer one asked first (`sortByUpdated`, newest first). */
const TRASH_ROWS = (fixture: BootstrapFixture): Array<Record<string, unknown>> => [
	pageRow(fixture, TRASH_B_ID, {
		isArchived: true,
		archivedAt: '2026-01-09T09:00:00.000Z',
		updatedAt: '2026-01-09T09:00:00.000Z'
	}),
	pageRow(fixture, TRASH_A_ID, {
		isArchived: true,
		archivedAt: '2026-01-08T09:00:00.000Z',
		updatedAt: '2026-01-08T09:00:00.000Z'
	})
];

/** What a page read answers, so opening a stubbed row is a real page: empty but editable. */
const PAGE_CONTENT = {
	contentJson: { type: 'doc', content: [{ type: 'paragraph' }] },
	contentHtml: ''
};

type DocsStub = {
	/** The availability count: a number, `404`/`500` (answered here), or unset = let the read reach the mock. */
	count?: number | 404 | 500;
	/** Answer the two list reads at all; unset leaves every docs read to the mock. */
	lists?: boolean;
	/** Answer `documents/<id>` and its `/path` for the stubbed rows; needed before a row is opened. */
	single?: boolean;
	/** Answer the create POST with a created page; unset lets it reach the mock. */
	create?: boolean;
	/** `true` = the trash list answers with the two archived rows, `false` = with none. Default true when `lists`. */
	trashRows?: boolean;
};

/** The stub's own memory, so the trash and the tree agree with each other as a platform's would. */
type StubState = {
	restored: Set<string>;
	created: Record<string, unknown> | null;
};

/**
 * Answers the docs reads the cases depend on and lets every other docs call through to the mock
 * (`route.fallback()`), so the mock's log still records what the page really asked. Routes go on **before** the
 * navigation, or the answer has already been given (`clients-access-ui.spec.ts:210-237`).
 */
async function stubDocs(page: Page, fixture: BootstrapFixture, stub: DocsStub = {}): Promise<StubState> {
	const state: StubState = { restored: new Set(), created: null };

	const treeRows = (): Array<Record<string, unknown>> => [
		...TREE_ROWS(fixture),
		...TRASH_ROWS(fixture)
			.filter((row) => state.restored.has(String(row.id)))
			.map((row) => ({ ...row, isArchived: false, archivedAt: null }))
	];
	const trashRows = (): Array<Record<string, unknown>> =>
		stub.trashRows === false ? [] : TRASH_ROWS(fixture).filter((row) => !state.restored.has(String(row.id)));
	const knownRows = (): Array<Record<string, unknown>> => [
		...treeRows(),
		...trashRows(),
		...(state.created ? [state.created] : [])
	];

	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(DOCS_PREFIX),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const pathname = new URL(request.url()).pathname;
			const archived = new URL(request.url()).searchParams.get('archived');

			if (method === 'GET' && pathname === DOCS_COUNT) {
				if (stub.count === 404 || stub.count === 500) {
					const status = stub.count;
					return route.fulfill({
						status,
						headers: CORS_HEADERS,
						json: { statusCode: status, message: `Playwright docs probe refusal (${status})` }
					});
				}
				if (typeof stub.count === 'number') {
					return route.fulfill({ status: 200, headers: CORS_HEADERS, json: stub.count });
				}
				return route.fallback();
			}

			if (method === 'GET' && pathname === DOCS_BASE && stub.lists) {
				const items = archived === 'only' ? trashRows() : treeRows();
				return route.fulfill({ status: 200, headers: CORS_HEADERS, json: { items, total: items.length } });
			}

			if (method === 'POST' && pathname === DOCS_BASE && stub.create) {
				const body = (JSON.parse(request.postData() ?? '{}') as Record<string, unknown>) ?? {};
				const created = pageRow(fixture, CREATED_ID, {
					name: body.name ?? TEXT.untitled,
					parentId: body.parentId ?? null,
					index: body.index ?? 0,
					visibility: body.visibility ?? 'ORGANIZATION',
					updatedAt: '2026-01-10T09:00:00.000Z',
					...PAGE_CONTENT
				});
				state.created = created;
				return route.fulfill({ status: 201, headers: CORS_HEADERS, json: created });
			}

			// Only the segment right after `documents/` is the page id: `…/<id>/path` and `…/<id>/unarchive` carry
			// their own segment after it, and taking the whole tail made those two fall through to the mock —
			// measured in the first run: the mock's `{items,total}` answer to `…/path` reached
			// `path.filter (…/docs-page-view.tsx:804)` and the page view died with "path.filter is not a function".
			const rowId = pathname.startsWith(`${DOCS_BASE}/`)
				? decodeURIComponent(pathname.slice(`${DOCS_BASE}/`.length).split('/')[0])
				: '';
			const row = knownRows().find((candidate) => String(candidate.id) === rowId);

			if (method === 'POST' && row && pathname.endsWith('/unarchive')) {
				state.restored.add(rowId);
				return route.fulfill({
					status: 200,
					headers: CORS_HEADERS,
					json: { ...row, ...PAGE_CONTENT, isArchived: false, archivedAt: null }
				});
			}

			if (method === 'GET' && row && stub.single) {
				if (pathname === `${DOCS_BASE}/${rowId}/path`) {
					const parentId = row.parentId ? String(row.parentId) : null;
					const parent = parentId
						? knownRows().find((candidate) => String(candidate.id) === parentId)
						: undefined;
					return route.fulfill({
						status: 200,
						headers: CORS_HEADERS,
						json: parent ? [{ id: parent.id, name: parent.name, kind: 'PAGE' }] : []
					});
				}
				if (pathname === `${DOCS_BASE}/${rowId}`) {
					return route.fulfill({
						status: 200,
						headers: CORS_HEADERS,
						json: { ...row, ...PAGE_CONTENT, canWrite: true }
					});
				}
			}

			return route.fallback();
		}
	);

	return state;
}

/** Routes first, then the scenario, then the cookies, then the navigation (`playwright/helpers.ts:439-451`). */
async function openDocs(
	page: Page,
	fixture: BootstrapFixture,
	path: string,
	stub: DocsStub = {},
	scenario: MockScenario = {}
): Promise<StubState> {
	const state = await stubDocs(page, fixture, stub);
	await signInAndVisit(page, fixture, path, { scenario });
	return state;
}

type DocsRequest = { method: string; path: string; search: string; body: string | null };

/**
 * What the browser itself sent under `/api/plugins/docs` **for the page loaded at `path`**, oldest first.
 *
 * Arming waits for that page's document **response**, not for its request. `hardVisit` warms the browser with a
 * `goto` of the app home (`playwright/helpers.ts:424`) and that home page keeps running — its sidebar mounts
 * `useDocsAvailability`, which asks the count — until the target document is answered. In a cold lane that answer can
 * take a long time; run 5's trace of case A measured `GET http://localhost:3033/docs` starting at 17:25:47.109 and
 * taking **31 052 ms** to answer, and the warm-up page's own `GET …/documents/count` landing at 17:25:48.851, i.e.
 * 1.7 s *after* the target's document request. Arming on the request counted that warm-up ask as this page's, and a
 * case that pinned "the count was asked once" went red on it (that was case A in run 5). Arming on the response puts
 * the cut exactly where the old document is replaced.
 *
 * What the warm-up page asked in that window is not thrown away: pass an array and it is collected there, so a case
 * can print it (case A does) instead of silently mixing the two page loads together.
 */
function docsRequestsSeen(page: Page, path: string, before: DocsRequest[] = []): DocsRequest[] {
	const seen: DocsRequest[] = [];
	let armed = false;
	const entryOf = (request: {
		method: () => string;
		url: () => string;
		postData: () => string | null;
	}): DocsRequest => ({
		method: request.method(),
		path: new URL(request.url()).pathname,
		search: new URL(request.url()).search,
		body: request.postData()
	});
	const isDocsCall = (url: URL): boolean => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(DOCS_PREFIX);

	page.on('response', (response) => {
		if (armed) return;
		const url = new URL(response.url());
		if (
			response.frame() === page.mainFrame() &&
			url.origin === new URL(APP_ORIGIN).origin &&
			url.pathname === path
		) {
			armed = true;
		}
	});
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (!isDocsCall(url)) return;
		if (armed) {
			seen.push(entryOf(request));
			return;
		}
		before.push(entryOf(request));
	});
	return seen;
}

const countAsks = (requests: DocsRequest[]): DocsRequest[] => requests.filter((r) => r.path === DOCS_COUNT);
const listReads = (requests: DocsRequest[]): DocsRequest[] =>
	requests.filter((r) => r.method === 'GET' && r.path === DOCS_BASE);
const docsWrites = (requests: DocsRequest[]): DocsRequest[] =>
	requests.filter((r) => !['GET', 'OPTIONS', 'HEAD'].includes(r.method));

/** The docs calls the mock recorded: every docs read here is a GET, so anything else is a write. */
async function docsWritesLogged(mock: {
	requests: () => Promise<Array<{ method: string; path: string; status: number }>>;
}): Promise<Array<{ method: string; path: string; status: number }>> {
	return (await mock.requests()).filter(
		(request) => request.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(request.method)
	);
}

/**
 * Console lines that name a docs call. The app's own HttpClient line writes `GET /plugins/docs/…` **without** the
 * `/api` the browser's request line carries, so filtering on `DOCS_PREFIX` prints `[]` even while a refusal is
 * logging itself (measured in this file's first run); `/plugins/docs` is the part both spellings share.
 */
const docsConsoleErrors = (shield: Shield): string[] =>
	shield.consoleErrors().filter((text) => text.includes('/plugins/docs'));

/**
 * The Docs page's own pane: the last of the three `<main>` elements it mounts (see the header) — the home, or the
 * trash, never the tree aside and never the app shell.
 */
const docsPane = (page: Page): Locator => page.locator('main').last();
const workspaceTree = (page: Page): Locator => page.getByRole('tree', { name: TEXT.workspace });
const treeRow = (page: Page, id: string): Locator => page.locator(`a[data-docs-row="${id}"]`);
const treeItem = (page: Page, id: string): Locator =>
	page.locator('li[role="treeitem"]').filter({ has: page.locator(`a[data-docs-row="${id}"]`) });
/** The home's rows and empty state: the section is the only one of its kind, and it names itself. */
const recentSection = (page: Page): Locator => page.locator('section[aria-labelledby="docs-home-recent"]');
const trashRow = (page: Page, name: string): Locator => docsPane(page).locator('li').filter({ hasText: name });
const docsNavEntry = (page: Page): Locator => page.getByRole('link', { name: TEXT.title, exact: true });
const unavailableCopy = (page: Page): Locator => page.getByText(TEXT.unavailableTitle, { exact: true });
const loadErrorAlerts = (page: Page): Locator => page.getByRole('alert').filter({ hasText: TEXT.loadError });
const titleField = (page: Page): Locator => page.getByRole('textbox', { name: TEXT.pageTitle, exact: true });
const editableEditor = (page: Page): Locator => page.locator('[contenteditable="true"]');
/** The top bar's path: `nav[aria-label="breadcrumb"]`, ancestors as links, the current page in `li[aria-current=page]`. */
const breadcrumb = (page: Page): Locator => page.locator(`nav[aria-label="${TEXT.breadcrumb}"]`);
/**
 * The app's render-crash screen (core/components/common/error-boundary …, error.HEADING_TITLE). Asserting it away is
 * what catches a page view that died while rendering — a `shield.pageErrors()` check does not, because the boundary
 * swallows the throw.
 */
const crashScreen = (page: Page): Locator => page.getByText(TEXT.crashTitle, { exact: true });

test.describe('lane-c · whether Docs is offered at all (use-docs-availability.ts:28-40, docs-page.tsx:374-382)', () => {
	test('A · the count probe answered a number — the Docs home, the tree beside it, and the sidebar entry', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		// This case also collects what the warm-up page load asked, so a count asked there is printed as what it is
		// instead of being read as this page's ask (`docsRequestsSeen`, run 5's trace).
		const warmUp: DocsRequest[] = [];
		const requests = docsRequestsSeen(page, '/docs', warmUp);
		await openDocs(page, fixture, '/docs', { count: 3, lists: true, single: true });

		await expect(page).toHaveURL(`${APP_ORIGIN}/docs`);
		await expect(
			docsPane(page).getByRole('heading', { level: 1, name: TEXT.title }),
			`the home's own title is docs.TITLE (${await docsPane(page).getByRole('heading', { level: 1 }).count()} level-1 heading(s) in the pane)`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			// Not `exact`: the welcome paragraph also holds the page-count span, so its whole text is longer than the
			// sentence (docs-home.tsx:112-115).
			page.getByText(TEXT.welcome).first(),
			'and its welcome line'
		).toBeVisible();
		await expect(
			page.getByText(TEXT.emptyCount),
			`docs.PAGE_COUNT of the three stubbed pages (docs-home.tsx:114, ${await page.getByText(TEXT.emptyCount).count()} match(es))`
		).toHaveCount(1);
		await expect(
			workspaceTree(page),
			`the tree pane beside it, labelled docs.WORKSPACE (${await page.getByRole('tree').count()} tree(s))`
		).toHaveCount(1);
		await expect(unavailableCopy(page), 'and nothing says Docs is missing').toHaveCount(0);
		measure('A count 200 with a number', {
			countAsks: countAsks(requests).length,
			listReads: listReads(requests).length,
			treeRows: await page.locator('a[data-docs-row]').count(),
			sidebarDocsEntry: await docsNavEntry(page).count(),
			pageCount: await page.getByText(TEXT.emptyCount).count(),
			warmUpAsks: warmUp.map((request) => `${request.method} ${request.path}`),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			docsNavEntry(page).first(),
			'the sidebar offers Docs, because the probe answered (app-sidebar.tsx:245)'
		).toBeVisible();
		expect(
			countAsks(requests).length,
			`the count was asked ${countAsks(requests).length} time(s) in this visit`
		).toBe(1);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(
			docsConsoleErrors(shield),
			`no docs read reported a console error here: ${docsConsoleErrors(shield).join(' | ')}`
		).toEqual([]);
	});

	test("B · the count answered the mock's own {items,total} — available, because NaN is not an error", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		// Nothing stubbed: this case is about the answer the lane mock really gives.
		await openDocs(page, fixture, '/docs', {});

		const logged = await mock.calls(DOCS_COUNT);
		expect(logged.length, `the count reached the mock (${JSON.stringify(logged)})`).toBeGreaterThanOrEqual(1);
		expect(
			logged.map((call) => call.status),
			`and the mock answered it 200 with {"items":[],"total":0} (${JSON.stringify(logged)})`
		).toContain(200);
		await expect(
			unavailableCopy(page),
			`docs.UNAVAILABLE_TITLE is not shown: docsService.count resolved (Number({items,total}) is NaN, docs.service.ts:81, and NaN is not an error) ` +
				`so use-docs-availability.ts:32 answered "available"`
		).toHaveCount(0);
		await expect(
			page.getByText(TEXT.workspaceEmpty, { exact: true }).first(),
			`the tree says ${JSON.stringify(TEXT.workspaceEmpty)} for the empty list it was given`
		).toBeVisible();
		await expect(
			recentSection(page).getByText(TEXT.projectPagesEmptyTitle, { exact: true }),
			'and the home lists no recent page'
		).toHaveCount(1);
		await expect(
			page.getByText(TEXT.privateEmpty, { exact: true }),
			`docs.PRIVATE_EMPTY is where a private page would go`
		).toHaveCount(1);
		measure('B count answered {items,total}', {
			countAsks: countAsks(requests).length,
			countStatuses: logged.map((call) => call.status),
			listReads: listReads(requests).length,
			treeRows: await page.locator('a[data-docs-row]').count(),
			pageCount: await page.getByText(/\d+ pages?/).count(),
			sidebarDocsEntry: await docsNavEntry(page).count(),
			unavailableCopy: await unavailableCopy(page).count(),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			docsNavEntry(page).first(),
			'the sidebar still offers Docs — an available platform, even one whose answer was not a number'
		).toBeVisible();
		await expect(
			docsPane(page).getByText(/\d+ pages?/),
			'and the welcome line carries no docs.PAGE_COUNT, which the tree list — not the count — feeds (docs-home.tsx:68)'
		).toHaveCount(0);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test('C · the count answered 404 — "Docs is not available on this server", no tree, no retry', async ({
		page,
		fixture,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		await openDocs(page, fixture, '/docs', { count: 404, lists: true });

		await expect(page).toHaveURL(`${APP_ORIGIN}/docs`);
		const unavailable = unavailableCopy(page);
		await expect(
			unavailable.first(),
			`docs.UNAVAILABLE_TITLE in an AnimatedEmptyState (docs-page.tsx:374-381); the pane says ${await docsPane(
				page
			)
				.innerText()
				.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			page.getByText(TEXT.unavailableText, { exact: true }),
			'with docs.UNAVAILABLE_TEXT under it'
		).toHaveCount(1);
		await expect(
			page.getByRole('tree'),
			`and no tree at all: useDocsTree is switched off once the answer is "unavailable" (docs-page.tsx:90; ${await page
				.getByRole('tree')
				.count()} found)`
		).toHaveCount(0);
		await expect(
			docsPane(page).getByRole('button', { name: TEXT.newPage, exact: true }),
			'no way to start a page'
		).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: TEXT.retry, exact: true }),
			'and no retry: an extension that is not there is not something to try again'
		).toHaveCount(0);
		await expect(docsNavEntry(page), 'the sidebar hides the Docs entry too (app-sidebar.tsx:245)').toHaveCount(0);
		measure('C count 404', {
			countAsks: countAsks(requests).length,
			listReads: listReads(requests).length,
			unavailableTitle: await unavailable.count(),
			treeRows: await page.locator('a[data-docs-row]').count(),
			sidebarDocsEntry: await docsNavEntry(page).count(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			docsConsoleErrors: docsConsoleErrors(shield)
		});
		// Whether a tree read goes out at all here is a race between the probe and the tree mount, and this case was
		// measured both ways — a read in runs 1, 4 and 7 and none in runs 2 and 3: in the runs that read one the list
		// availability was still `unknown`; in the runs that read 0 the 404 was back before the tree mounted, so
		// `docs-page.tsx:90` `useDocsTree(enabled && availability !== 'unavailable')` disabled the query
		// before it fired, `use-docs-tree.ts:41`). The ceiling is what is stable — never more than one, and never a
		// tree on screen, which the `role=tree` and `data-docs-row` counts above pin at 0.
		expect(
			listReads(requests).length,
			`the tree list was asked ${listReads(requests).length} time(s) before the "unavailable" answer closed the ` +
				`query (${JSON.stringify(listReads(requests))})`
		).toBeLessThanOrEqual(1);
		expect(
			countAsks(requests).length,
			'a refused probe is asked exactly once: "unavailable" is a decided answer'
		).toBe(1);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		// The refusal reports itself once in the console (`[ERROR] [HttpClient] HTTP Error: GET /plugins/docs/…count`);
		// that is the app naming a 404 it was told about, not a defect, so it is printed above rather than asserted away.
	});

	test('D · the count answered 500 — the home as if Docs were available: no notice, no alert, no retry', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		await openDocs(page, fixture, '/docs', { count: 500, lists: true });

		await expect(
			workspaceTree(page).first(),
			`the tree is there (availability stayed "unknown", so useDocsTree is enabled: docs-page.tsx:90)`
		).toBeVisible({ timeout: 30_000 });
		await expect(treeRow(page, PARENT_ID), 'with its rows').toHaveCount(1);
		await expect(unavailableCopy(page), 'and nothing says Docs is missing').toHaveCount(0);
		await expect(
			loadErrorAlerts(page),
			`no docs.LOAD_ERROR either — that copy belongs to the tree query, which answered (${await loadErrorAlerts(page).count()})`
		).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: TEXT.retry, exact: true }),
			'and no retry is offered for the probe'
		).toHaveCount(0);
		measure('D count 500', {
			countAsks: countAsks(requests).length,
			listReads: listReads(requests).length,
			unavailableCopy: await unavailableCopy(page).count(),
			alerts: await page.getByRole('alert').count(),
			docsAlerts: await loadErrorAlerts(page).count(),
			// What the one alert that is not Docs' own actually is — printed, because the raw count is meaningless
			// without it (a dev lane mounts the Next.js dev-tools overlay, which carries its own live regions).
			alertTexts: await page.getByRole('alert').allInnerTexts(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			sidebarDocsEntry: await docsNavEntry(page).count(),
			mockDocsCalls: (await mock.requests()).filter((r) => r.path.startsWith(DOCS_PREFIX)),
			docsConsoleErrors: docsConsoleErrors(shield)
		});
		// An undecided answer releases the memo (`use-docs-availability.ts:35`), so a consumer that mounts after it asks
		// again: 2 asks in runs 1, 2 and 7 of this case and 1 in runs 3 and 4, depending on whether the tree pane
		// mounted before or after the refusal landed (mount first and both consumers share the one in-flight promise).
		// What is pinned is that the page never decides, and shows nothing about it.
		expect(
			countAsks(requests).length,
			`the count was asked ${countAsks(requests).length} time(s)`
		).toBeGreaterThanOrEqual(1);
		await expect(
			docsNavEntry(page).first(),
			'and the sidebar keeps the Docs entry: only "unavailable" hides it (app-sidebar.tsx:245)'
		).toBeVisible();
		expect(await docsWritesLogged(mock), 'nothing was written').toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test('E · the count connection was cut off — the same silent home, and the mock logged it unanswered', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		// The drop is the mock's own switch (`cypress/support/mock-gauzy-server.mjs:1064-1090`), so the count is not
		// stubbed here: the browser really gets `net::ERR_EMPTY_RESPONSE`.
		await openDocs(page, fixture, '/docs', { lists: true }, { drops: { [DOCS_COUNT]: 1 } });

		const logged = await mock.calls(DOCS_COUNT);
		expect(
			logged.filter((call) => call.status === 0).length,
			`the mock logged the count it cut off with status 0 (${JSON.stringify(logged)})`
		).toBeGreaterThanOrEqual(1);
		await expect(
			workspaceTree(page).first(),
			'the tree still loaded, because the dropped probe says nothing about the extension'
		).toBeVisible({ timeout: 30_000 });
		await expect(unavailableCopy(page), 'no "not available" copy').toHaveCount(0);
		await expect(loadErrorAlerts(page), 'no load-error alert').toHaveCount(0);
		measure('E count dropped', {
			countAsks: countAsks(requests).length,
			mockCountStatuses: logged.map((call) => call.status),
			listReads: listReads(requests).length,
			sidebarDocsEntry: await docsNavEntry(page).count(),
			docsConsoleErrors: docsConsoleErrors(shield)
		});
		expect(
			countAsks(requests).length,
			`the count was asked ${countAsks(requests).length} time(s)`
		).toBeGreaterThanOrEqual(1);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test('F · it is the tree read that is refused 500 — two load-error alerts, each with its Retry', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		// The refusal comes from the mock, on the list path, so its log carries it; the probe is answered normally.
		await openDocs(page, fixture, '/docs', { count: 3 }, { fails: { [DOCS_BASE]: 500 } });

		await expect(
			loadErrorAlerts(page).first(),
			`docs.LOAD_ERROR shows where a tree read was expected (docs-tree-pane.tsx:158-169 and docs-home.tsx:187-196); ` +
				`the page says ${await page
					.locator('body')
					.innerText()
					.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			loadErrorAlerts(page),
			'exactly twice: once in the tree pane, once in the home\'s "Recently updated" section'
		).toHaveCount(2);
		await expect(page.getByRole('button', { name: TEXT.retry, exact: true }), 'with one Retry each').toHaveCount(2);
		await expect(unavailableCopy(page), 'and Docs is still offered: the availability probe answered 3').toHaveCount(
			0
		);
		measure('F tree 500', {
			countAsks: countAsks(requests).length,
			listReads: listReads(requests).length,
			alerts: await page.getByRole('alert').count(),
			alertTexts: await page.getByRole('alert').allInnerTexts(),
			treeRows: await page.locator('a[data-docs-row]').count(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			mockListCalls: (await mock.calls(DOCS_BASE)).filter((call) => call.path === DOCS_BASE)
		});
		const beforeRetry = listReads(requests).length;
		await page.getByRole('button', { name: TEXT.retry, exact: true }).first().click();
		await expect.poll(() => listReads(requests).length, { timeout: 15_000 }).toEqual(beforeRetry + 1);
		expect(
			listReads(requests).length,
			`Retry asked the same list again (${JSON.stringify(listReads(requests))})`
		).toBe(beforeRetry + 1);
		// A dev lane also raises a developer-only toast for every failed query (`core/components/common/dev-error-toaster.tsx`),
		// carrying the mock's raw text; a production deployment does not mount it, so it is printed, not asserted.
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · the page tree on the Docs home (docs-tree.tsx, use-docs-tree.ts:37-67)', () => {
	test('G · three pages, their titles, the child under its parent, and opening it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		await openDocs(page, fixture, '/docs', { count: 3, lists: true, single: true });

		await expect(treeRow(page, PARENT_ID), `a root page's row carries its title (docs-tree.tsx:276)`).toBeVisible({
			timeout: 30_000
		});
		await expect(treeRow(page, SIBLING_ID), 'and the second root page').toHaveCount(1);
		await expect(
			treeItem(page, PARENT_ID),
			'the parent says it has children and is closed (docs-tree.tsx:229)'
		).toHaveAttribute('aria-expanded', 'false');
		await expect(
			treeRow(page, CHILD_ID),
			`so its child is not in the tree yet — flattenTree (core/lib/utils/docs-tree.ts:75-85) walks children only of an
			 expanded node (${await treeRow(page, CHILD_ID).count()} row(s) for ${CHILD_ID})`
		).toHaveCount(0);
		await expect(
			recentSection(page).getByRole('link', { name: NAMES[CHILD_ID] }),
			'while the home lists it under "Recently updated" (docs-home.tsx:203-233)'
		).toHaveCount(1);

		await expect(
			page.getByRole('button', { name: TEXT.expand, exact: true }),
			`one row offers docs.EXPAND, the one with children`
		).toHaveCount(1);
		await page.getByRole('button', { name: TEXT.expand, exact: true }).first().click();
		await expect(treeRow(page, CHILD_ID), 'and after clicking it the child is in the tree').toBeVisible({
			timeout: 15_000
		});

		// Nesting in the DOM is not a nested list: every row is a `li[role=treeitem]` in one flat `ul[role=tree]`,
		// placed by `aria-level` (depth + 1) and an inline `padding-inline-start` of 2 + 14·depth px
		// (docs-tree.tsx:230,242). Measured order and indents after the expand:
		const rows = await page
			.locator('a[data-docs-row]')
			.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-docs-row')));
		const indents = await page
			.locator('li[role="treeitem"]')
			.evaluateAll((nodes) => nodes.map((node) => node.style.paddingInlineStart));
		measure('G tree', {
			countAsks: countAsks(requests).length,
			listReads: listReads(requests).length,
			rows,
			indents,
			levels: await page
				.locator('li[role="treeitem"]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-level'))),
			childHref: await treeRow(page, CHILD_ID).getAttribute('href')
		});
		expect(rows, `the rows of the tree, in order (${JSON.stringify(rows)})`).toEqual([
			PARENT_ID,
			CHILD_ID,
			SIBLING_ID
		]);
		expect(indents, `their indents: 2px at depth 0, 16px at depth 1 (${JSON.stringify(indents)})`).toEqual([
			'2px',
			'16px',
			'2px'
		]);
		await expect(treeItem(page, PARENT_ID), 'the parent is now open').toHaveAttribute('aria-expanded', 'true');
		await expect(treeItem(page, CHILD_ID), 'and the child sits at level 2').toHaveAttribute('aria-level', '2');
		await expect(treeItem(page, SIBLING_ID), 'while the sibling stays at level 1').toHaveAttribute(
			'aria-level',
			'1'
		);
		await expect(treeRow(page, CHILD_ID), 'its row links to its own page').toHaveAttribute(
			'href',
			`/docs/${CHILD_ID}`
		);

		await treeRow(page, CHILD_ID).click();
		await expect(page).toHaveURL(`${APP_ORIGIN}/docs/${CHILD_ID}`);
		await expect(
			crashScreen(page),
			`opening a page must not land on the app's render-crash screen (${await crashScreen(page).count()} such ` +
				`screen(s) at ${page.url()})`
		).toHaveCount(0);
		await expect(
			titleField(page).first(),
			`the page opened with its stored title in the title field (${await titleField(page).count()} title field(s) found)`
		).toHaveValue(NAMES[CHILD_ID]);
		await expect(
			editableEditor(page),
			`and its editor, because the stubbed page read says canWrite: true (${await editableEditor(page).count()})`
		).toHaveCount(1);
		await expect(
			breadcrumb(page).getByRole('link', { name: NAMES[PARENT_ID], exact: true }),
			'the top bar names its parent, from GET …/<id>/path (docs-page-view.tsx:802-806, use-docs-page.ts:38-44)'
		).toHaveCount(1);
		await expect(
			breadcrumb(page).locator('li[aria-current="page"]'),
			'and the child itself is the current crumb, named like its page'
		).toHaveText(NAMES[CHILD_ID]);
		measure('G tree, after opening the child', {
			url: page.url(),
			countAsksAfterClick: countAsks(requests).length,
			pageReads: requests
				.filter((r) => r.path.startsWith(`${DOCS_BASE}/${CHILD_ID}`))
				.map((r) => `${r.method} ${r.path}`),
			crumbs: await breadcrumb(page)
				.locator('li')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())),
			// Everything docs the browser asked was answered by this spec, so the mock logged none of it — the only
			// way to tell a stubbed read from a real one is this list.
			mockDocsCalls: (await mock.requests())
				.filter((call) => call.path.startsWith(DOCS_PREFIX))
				.map((call) => `${call.method} ${call.path}`)
		});
		// The click is a client-side navigation: the module-level probe is not re-asked for it (measured: still 1).
		expect(countAsks(requests).length, 'the count was not asked again for the client-side navigation').toBe(1);
		expect(await docsWritesLogged(mock), 'nothing was written').toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · starting a page from the home (docs-page.tsx:178-194, use-docs-actions.ts:75-108)', () => {
	test("H · the home's New page — one POST …/documents, and the person lands on the new page", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		await openDocs(page, fixture, '/docs', { count: 3, lists: true, single: true, create: true });

		await expect(
			docsPane(page).getByRole('button', { name: TEXT.newPage, exact: true }),
			`docs.NEW_PAGE is the home's primary action (docs-home.tsx:128); page-wide there are ${await page
				.getByRole('button', { name: TEXT.newPage, exact: true })
				.count()} buttons with that name, the other two in the tree pane`
		).toHaveCount(1);
		const listReadsBefore = listReads(requests).length;
		await docsPane(page).getByRole('button', { name: TEXT.newPage, exact: true }).click();

		await expect(page).toHaveURL(`${APP_ORIGIN}/docs/${CREATED_ID}`, { timeout: 30_000 });
		const writes = docsWrites(requests);
		expect(
			writes.map((write) => `${write.method} ${write.path}`),
			`exactly one docs write was sent (${JSON.stringify(writes.map((w) => `${w.method} ${w.path}`))})`
		).toEqual([`POST ${DOCS_BASE}`]);
		const body = JSON.parse(writes[0].body ?? '{}') as Record<string, unknown>;
		measure('H create', {
			bodyKeys: Object.keys(body),
			name: body.name,
			parentId: body.parentId,
			index: body.index,
			visibility: body.visibility,
			contentJson: JSON.stringify(body.contentJson),
			contentHtml: JSON.stringify(body.contentHtml),
			url: page.url(),
			toasts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			listReads: listReads(requests).length
		});
		expect(
			Object.keys(body).sort(),
			`the keys of the create body (use-docs-actions.ts:93-103 plus the tenant/organization ` +
				`APIService.post adds) (${JSON.stringify(Object.keys(body))})`
		).toEqual(
			[
				'contentHtml',
				'contentJson',
				'index',
				'kind',
				'name',
				'organizationId',
				'parentId',
				'tenantId',
				'visibility'
			].sort()
		);
		expect(body, 'a root page of the workspace, named docs.UNTITLED, one index past its siblings').toMatchObject({
			kind: 'PAGE',
			name: TEXT.untitled,
			parentId: null,
			index: 2,
			visibility: 'ORGANIZATION',
			contentHtml: '',
			contentJson: { type: 'doc', content: [{ type: 'paragraph' }] }
		});
		await expect(
			crashScreen(page),
			`landing there is a rendered page, not the app's render-crash screen (${await crashScreen(page).count()} ` +
				`such screen(s) at ${page.url()})`
		).toHaveCount(0);
		await expect(
			titleField(page).first(),
			'the person lands on the new page, its title in the title field'
		).toHaveValue(TEXT.untitled);
		await expect(editableEditor(page), 'with its editor open').toHaveCount(1);
		await expect(
			breadcrumb(page).locator('li[aria-current="page"]'),
			'and its own breadcrumb, with no parent to name (parentId null in the body above)'
		).toHaveText(TEXT.untitled);
		await expect(
			treeRow(page, CREATED_ID),
			'and the new page is already a row in the tree: useDocsActions.putPage wrote it into the tree cache ' +
				'rather than asking again'
		).toBeVisible();
		expect(
			listReads(requests).length,
			`the list was read ${listReads(requests).length} time(s), i.e. the create did not trigger a re-read (${listReadsBefore} before the click)`
		).toBe(listReadsBefore);
		expect(
			(await mock.requests()).filter((r) => r.path === DOCS_BASE && r.method === 'POST').length,
			'the mock was never asked to create: the create was answered here, so it is not in its log'
		).toBe(0);
		await expect(
			page.locator('[data-sonner-toast]'),
			'and the home said nothing: a create that worked is silent'
		).toHaveCount(0);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test("I · the same create refused 403 — the person is told in the platform's own words, and nothing moves", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs');
		// The refusal comes from the mock so its log carries it. The switch is keyed by pathname with no verb
		// (`cypress/support/mock-gauzy-server.mjs:1088-1093`), which is why this case answers the tree list itself:
		// it shares that pathname with the create.
		await openDocs(
			page,
			fixture,
			'/docs',
			{ count: 3, lists: true, create: false },
			{ fails: { [DOCS_BASE]: 403 } }
		);

		await expect(
			docsPane(page).getByRole('button', { name: TEXT.newPage, exact: true }),
			'the home offers its New page'
		).toHaveCount(1);
		await docsPane(page).getByRole('button', { name: TEXT.newPage, exact: true }).click();

		// Sonner closes a toast after ~4 s, so this is read while it is open — which is also what the person sees.
		await expect(
			page.getByText(MOCK_REFUSAL_403),
			`the refusal is shown as a toast; the pane says ${await docsPane(page)
				.innerText()
				.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 8_000 });
		const refused = (await mock.requests()).filter((r) => r.path === DOCS_BASE && r.method === 'POST');
		measure('I create 403', {
			refusals: refused.length,
			toastTexts: await page.locator('[data-sonner-toast]').allInnerTexts(),
			createErrorShown: await page.getByText(TEXT.createError).count(),
			url: page.url(),
			editors: await editableEditor(page).count(),
			treeRows: await page.locator('a[data-docs-row]').count(),
			docsConsoleErrors: docsConsoleErrors(shield)
		});
		expect(
			refused.map((r) => r.status),
			`the create reached the mock exactly once and was refused there (${JSON.stringify(refused)})`
		).toEqual([403]);
		await expect(
			page,
			'and nothing navigates: docs-page.tsx:188 pushes only after `await actions.createPage` resolved'
		).toHaveURL(`${APP_ORIGIN}/docs`);
		await expect(editableEditor(page), 'no page opened').toHaveCount(0);
		await expect(treeRow(page, CREATED_ID), 'no page was added to the tree').toHaveCount(0);
		await expect(
			page.getByText(TEXT.createError),
			`docs.CREATE_ERROR is not what the person is told: docs-page.tsx:171-173 shows \`error.message\` when the ` +
				`failure is an ApiErrorService (core/services/client/api-error.service.ts:136), i.e. the platform's own ` +
				`text, and keeps its translation only for a failure that carries none`
		).toHaveCount(0);
		expect(docsWrites(requests).length, 'one write went out, once — the create is not retried').toBe(1);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · the Docs trash (docs-trash.tsx, use-docs-tree.ts:70-81)', () => {
	test('J · two archived pages — both rows, newest first, each with Restore and Delete forever', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs/trash');
		await openDocs(page, fixture, '/docs/trash', { count: 3, lists: true });

		await expect(page).toHaveURL(`${APP_ORIGIN}/docs/trash`);
		await expect(
			docsPane(page).getByRole('heading', { name: TEXT.trash, exact: true }),
			'the pane is headed docs.TRASH'
		).toBeVisible({ timeout: 30_000 });
		await expect(trashRow(page, NAMES[TRASH_B_ID]), 'the newer archived page is shown').toHaveCount(1);
		await expect(trashRow(page, NAMES[TRASH_A_ID]), 'and the older one').toHaveCount(1);
		// Each row's first paragraph is its title (docs-trash.tsx:67), so the paragraph order is the row order.
		const rowTitles = await docsPane(page)
			.locator('li p')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		measure('J trash', {
			rowTitles,
			rowTexts: await docsPane(page)
				.locator('li')
				.evaluateAll((nodes) => nodes.map((node) => node.textContent ?? '')),
			countAsks: countAsks(requests).length,
			trashReads: listReads(requests).filter((r) => r.search.includes('archived=only')).length,
			treeReads: listReads(requests).filter((r) => r.search.includes('archived=exclude')).length,
			restoreButtons: await page.getByRole('button', { name: TEXT.restore, exact: true }).count(),
			emptyState: await page.getByText(TEXT.trashEmptyTitle, { exact: true }).count(),
			ariaCurrentTrash: await page
				.getByRole('link', { name: TEXT.trash, exact: true })
				.first()
				.getAttribute('aria-current')
		});
		expect(
			rowTitles.filter((title) => title.startsWith('Probe ')),
			`the rows, newest first — useDocsTrash sorts updatedAt DESC (use-docs-tree.ts:74) and sortByUpdated keeps ` +
				`that order (${JSON.stringify(rowTitles)})`
		).toEqual([NAMES[TRASH_B_ID], NAMES[TRASH_A_ID]]);
		await expect(
			trashRow(page, NAMES[TRASH_B_ID]).getByText(TEXT.trashedAt),
			'each row says how long it has been there (docs.TRASHED_AT, docs-trash.tsx:69)'
		).toHaveCount(1);
		await expect(
			trashRow(page, NAMES[TRASH_B_ID]).getByRole('button', { name: TEXT.restore, exact: true }),
			'with docs.RESTORE'
		).toHaveCount(1);
		await expect(
			trashRow(page, NAMES[TRASH_B_ID]).getByRole('button', { name: TEXT.deleteForever, exact: true }),
			'and docs.DELETE_FOREVER, which this case does not click: it would open the confirmation dialog ' +
				'(docs-trash.tsx:83-96) and then send a DELETE'
		).toHaveCount(1);
		await expect(
			page.getByText(TEXT.trashEmptyTitle, { exact: true }),
			'no empty state while there are rows'
		).toHaveCount(0);
		expect(
			listReads(requests).filter((r) => r.search.includes('archived=only')).length,
			'the trash was asked for once, with archived=only'
		).toBe(1);
		expect(
			listReads(requests).filter((r) => r.search.includes('archived=exclude')).length,
			'and the tree was asked for too, because its pane is mounted beside the trash (docs-page.tsx:399-424)'
		).toBe(1);
		expect(await docsWritesLogged(mock), 'nothing was written').toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test('K · restoring one sends POST …/<id>/unarchive and the page leaves the trash', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const requests = docsRequestsSeen(page, '/docs/trash');
		await openDocs(page, fixture, '/docs/trash', { count: 3, lists: true });
		await expect(trashRow(page, NAMES[TRASH_B_ID])).toBeVisible({ timeout: 30_000 });

		const trashReadsBefore = listReads(requests).filter((r) => r.search.includes('archived=only')).length;
		await trashRow(page, NAMES[TRASH_B_ID]).getByRole('button', { name: TEXT.restore, exact: true }).click();

		// docs.RESTORED is a sonner toast: read while it is open (see case I).
		await expect(
			page.getByText(TEXT.restored).first(),
			`the restore is confirmed in the person's words (docs-page.tsx:219, docs.RESTORED); the page says ` +
				`${await docsPane(page)
					.innerText()
					.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 8_000 });
		const writes = docsWrites(requests);
		measure('K restore', {
			writes: writes.map((w) => `${w.method} ${w.path} body=${JSON.stringify(w.body)}`),
			trashReads: listReads(requests).filter((r) => r.search.includes('archived=only')).length,
			treeReads: listReads(requests).filter((r) => r.search.includes('archived=exclude')).length,
			trashTitlesLeft: await docsPane(page)
				.locator('li p')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()))
				.then((titles) => titles.filter((title) => title.startsWith('Probe '))),
			treeRows: await page
				.locator('a[data-docs-row]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-docs-row')))
		});
		expect(
			writes.map((write) => `${write.method} ${write.path}`),
			`one write (${JSON.stringify(writes.map((w) => `${w.method} ${w.path}`))})`
		).toEqual([`POST ${DOCS_BASE}/${TRASH_B_ID}/unarchive`]);
		expect(
			JSON.parse(writes[0].body ?? '{}') as Record<string, unknown>,
			'docsService.unarchive posts nothing of its own; the tenant and organization come from APIService.post'
		).toEqual({ tenantId: fixture.ids.tenantA, organizationId: fixture.ids.organizationA });
		await expect(trashRow(page, NAMES[TRASH_B_ID]), 'the restored page is out of the trash').toHaveCount(0);
		await expect(trashRow(page, NAMES[TRASH_A_ID]), 'while the other one stays').toHaveCount(1);
		await expect(
			treeRow(page, TRASH_B_ID),
			'and it is back in the tree: restorePage invalidates both queries (use-docs-actions.ts:206-215)'
		).toBeVisible({ timeout: 15_000 });
		expect(
			listReads(requests).filter((r) => r.search.includes('archived=only')).length,
			'the trash was read again after the write'
		).toBeGreaterThan(trashReadsBefore);
		await expect(page).toHaveURL(`${APP_ORIGIN}/docs/trash`);
		expect(
			(await mock.requests()).filter((request) => request.path === `${DOCS_BASE}/${TRASH_B_ID}/unarchive`).length,
			'the unarchive was answered by this spec, so the mock was never asked to change anything'
		).toBe(0);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test('L · an empty trash — its own empty state, and no row to restore', async ({ page, fixture, mock, shield }) => {
		const requests = docsRequestsSeen(page, '/docs/trash');
		await openDocs(page, fixture, '/docs/trash', { count: 3, lists: true, trashRows: false });

		await expect(
			page.getByText(TEXT.trashEmptyTitle, { exact: true }),
			`docs.TRASH_EMPTY_TITLE (docs-trash.tsx:57); the pane says ${await docsPane(page)
				.innerText()
				.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 30_000 });
		await expect(page.getByText(TEXT.trashEmptyText, { exact: true }), 'with docs.TRASH_EMPTY_TEXT').toHaveCount(1);
		measure('L trash empty', {
			countAsks: countAsks(requests).length,
			trashReads: listReads(requests).filter((r) => r.search.includes('archived=only')).length,
			rows: await docsPane(page).locator('li').count(),
			restoreButtons: await page.getByRole('button', { name: TEXT.restore, exact: true }).count(),
			loading: await page.getByText('Loading…', { exact: true }).count()
		});
		await expect(docsPane(page).locator('li'), 'no rows').toHaveCount(0);
		await expect(
			page.getByRole('button', { name: TEXT.restore, exact: true }),
			'and nothing to restore'
		).toHaveCount(0);
		expect(await docsWritesLogged(mock), 'nothing was written').toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});
