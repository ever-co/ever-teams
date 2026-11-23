import { expect, test, type Page } from '../../fixtures';
import type { APIRequestContext, Locator } from '@playwright/test';

import { APP_ORIGIN, signInAndVisit, type BootstrapFixture, type MockScenario } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees on `/docs/<pageId>` when the platform says they may read the page and not change it —
 * the read-only page #5723 shipped — pinned in a real Chrome on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, `playwright/test-servers.ts:40`) on 2026-11-23 in this file's own consecutive green runs
 * `E:\Coding\.tmp\s2-lane-c-docs-8.log` and `-9.log` (each `7 passed`), after `-1.log` (1 failed), `-2.log`, `-3.log`
 * and `-4.log` (each 7 passed) and `-5.log` (1 failed). Both failures were this file's own, not the app's: in `-1.log`,
 * an exact-text match on a paragraph the case had just typed into; in `-5.log`, the letters it typed — on a page with
 * nothing editable a keystroke is one of the app's shortcut keys, and that run's `h` opened the "Keyboard shortcuts"
 * dialog over the page. Both were corrected (in `-5.log`'s case by typing letters no component binds, measured in
 * `s2-lane-c-docs-probe-type-safe-false.log` against `s2-lane-c-docs-probe-type-false.log`) before the two green runs
 * were taken. Every number, string and attribute below is one the runs printed on their `MEASURE` line, and each of
 * those lines is repeated by the measurement probe `E:\Coding\.tmp\docs-probe.mjs`
 * (`s2-lane-c-docs-probe-{false,true,absent,locked,archived,save403,insert-false,type-safe-false,type-false,403-safe}.log`),
 * which is what the request list and the DOM facts were read off before a single assertion was written.
 *
 * ## The gate this file runs behind, and the switch that opens it
 *
 * - Docs ships behind `NEXT_PUBLIC_DOCS_ENABLED` (`core/lib/utils/docs-enabled.ts:7-9`, read from the public runtime
 *   env the server writes on `<html data-ever-teams-runtime-env>`). Off, `core/components/pages/docs/docs-page.tsx:87`
 *   `const enabled = isDocsEnabled()` and `:121` `if (!enabled) router.replace('/')` send `/docs/<anything>` to the app
 *   home: measured, the browser landed on `/docs/playwright-docs-probe`, the shell became ready, and a moment later the
 *   URL was `http://localhost:3033/` with the team home in the body and **no** `/api/plugins/docs/*` call in the mock's
 *   log at all (`E:\Coding\.tmp\s2-lane-c-docs-probe-off.log`, 2026-11-23 10:44).
 * - A lane gets that flag from `E2E_DOCS=1` (`playwright/test-servers.ts` `sharedEnv`, added in 3b95fef4f). Every run of
 *   this file therefore carries `E2E_LANE=lane-c E2E_REUSE_SERVERS=1 E2E_EVER_ID=1 E2E_DOCS=1 E2E_BROWSER_CHANNEL=chrome`,
 *   and the file reads the flag back off the served document (the way `suites/api/board-origin.spec.ts:118-142` reads the
 *   Board key) and **skips itself** when it is not `'true'` — a lane started without the switch cannot reach any case,
 *   and a red run there would read as a Docs bug rather than as a lane that was never configured for Docs.
 * - Live editing is a second switch this lane does not have (`NEXT_PUBLIC_DOCS_LIVE_ENABLED`,
 *   `core/lib/docs-live/config.ts:8-11`), so the live editor's own read-only text (`docs-page-view.tsx:1005-1009` with
 *   `useLiveReadOnlyText`) is **not pinned here**: measured, the page never asked `GET /api/plugins/docs/live/status`
 *   within 12 s after the shell was ready, because `useDocsLive` does not start a session at all without that flag.
 *   Pinning it needs the flag plus a realtime session the mock does not serve; that is a case for a lane that has both.
 *
 * ## What the page asks for, measured before any stub was written
 *
 * The browser calls the mock **directly** (`GAUZY_API_BASE_SERVER_URL` is the mock origin, and `api.service.ts:516`
 * appends `/api` to it), so these are the paths the stubs answer. In order, on `GET /docs/<id>` with a stubbed
 * single-page read (from `s2-lane-c-docs-probe-false.log`, identical in the other five probe runs):
 *
 * 1. `GET /api/plugins/docs/documents/count?kind[0]=PAGE&archived=exclude&where[organizationId]=…&where[tenantId]=…` —
 *    the availability probe (`core/hooks/docs/use-docs-availability.ts:38`).
 * 2. `GET /api/plugins/docs/documents/<id>?organizationId=…&tenantId=…` — the single page with its content
 *    (`core/hooks/docs/use-docs-page.ts:19`). **Stubbed**: it is the only read that carries `canWrite`.
 * 3. `GET /api/plugins/docs/exports/pdf` — the PDF export probe (`core/hooks/docs/use-docs-import.ts:51`,
 *    `core/services/client/api/docs/docs-import.service.ts:48`).
 * 4. `GET /api/plugins/docs/documents?kind[0]=FOLDER&kind[1]=PAGE&archived=exclude&sort=name&sortOrder=ASC&take=100&skip=1&…`
 *    — the tree (`core/hooks/docs/use-docs-tree.ts:40`, `listAll` → one page of 100).
 * 5. `GET /api/plugins/docs/documents/<id>/path?…` — the breadcrumb (`use-docs-page.ts:38`). **Stubbed with `[]`**: the
 *    mock's fallback answer for that read is `{items:[],total:0}` (curl-verified against `http://127.0.0.1:4002`), which
 *    is not the array `useDocsPath` hands to `path.filter(…)` at `docs-page-view.tsx:801-808`; the stub page has
 *    `parentId: null`, so `[]` is the honest answer for it.
 * 6. `GET /api/plugins/docs/documents/<id>/comment-anchors?…` (`core/hooks/docs/use-docs-comments.ts`).
 * 7. `GET /api/comment` — the page's comments, through `commentService`, outside the docs prefix; left to the mock.
 *
 * Not asked, measured over the same 12 s: `documents/spaces`, `documents/<id>/follow` and `/plugins/docs/live/status`.
 * Nothing is stubbed for them and nothing here asserts their absence — the stub predicate is `startsWith('/api/plugins/docs')`,
 * and every docs call that is not the single page or the path falls through to the mock (`route.fallback()`), so the
 * mock's own log still carries the reads the page really made.
 *
 * ## The stubs
 *
 * - The lane mock has **no docs handler**: every docs GET answers 200 `{"items":[],"total":0}` (verified by curl at
 *   `/api/plugins/docs/documents/count`, `…/documents/abc`, `…/abc/path`, `…/abc/comment-anchors`, `…/exports/pdf`,
 *   `…/abc/follow`). For the list reads that is a harmless empty tree; for the single-page read it describes **no page**
 *   (no `kind`, no `name`, no `canWrite`), which would silently turn every case into the empty-editor case. So the
 *   single page and its path are answered here, with the mock's own CORS set restated (`clients-access-ui.spec.ts:137-145`
 *   for the technique) — without it the browser discards the answer and the read becomes an outage.
 * - The page is synthetic: no mock id stands for it, it is a root page (`parentId: null`), `kind: PAGE`,
 *   `visibility: ORGANIZATION`, and it is **not** in the tree the mock answers, so the sub-pages section is never
 *   mounted (measured: the article ends at its last block).
 * - Its body is two blocks with the editor's own anchors — version 4 UUIDs, because
 *   `core/components/common/rich-editor/block-id-extension.ts:18-27` drops any `blockId` that is not one (measured with
 *   a non-UUID anchor: 0 anchors in the DOM; with UUIDs: 2). Its `contentHtml` carries **no** anchors on purpose, which
 *   is the state the anchored read-only rendering exists for (`docs-page-view.tsx:602-617`, `docs-editor-html.ts:14-24`).
 * - Case 7 arms the refusal with `scenario.fails` on the content-save path, so 403 comes from the mock and lands in its
 *   log; the mock's route handler is skipped for an armed path, so nothing is written to its state. No other case
 *   writes: nothing here opens a create, rename, trash or move control.
 *
 * ## What the runs measured, case by case
 *
 * - `canWrite: false` (A): no `[contenteditable="true"]` anywhere (0), the body is the `RichTextView` text, the title
 *   `textarea[aria-label="Page title"]` is `readOnly: true`, and the notice `docs.NO_WRITE_ACCESS_NOTICE` is in a
 *   `role="note"` block (the local `Notice` at `docs-page-view.tsx:1309-1322` renders `role="note"` for `tone="muted"`
 *   and `role="alert"` for `tone="warning"`). Typing into the body and into the title afterwards produced **no** write:
 *   no `PUT`/`POST`/`PATCH` under `/api/plugins/docs` in the browser's own requests nor in the mock's log, the body text
 *   did not change and the title kept its stored name. The letters typed there are chosen for a reason that is itself a
 *   measurement — on a page with nothing editable, a keystroke is the app's shortcut key rather than text, and typing
 *   `… the …` there was measured to run `themeToggle` (`light → dark`) and, in run `-5.log`, to open the "Keyboard
 *   shortcuts" dialog; `tryTyping` carries the numbers, the two probe logs and the source lines.
 * - `canWrite: true` (B) and `canWrite` absent (C): one `contenteditable="true"` editor, `readOnly: false` on the title,
 *   and no no-write notice. (In the probe, typing there did save — `PUT /api/plugins/docs/documents/<id>/content`,
 *   `s2-lane-c-docs-probe-{true,absent}.log` — but these two cases do not type, so the shared mock is never written.)
 * - `canWrite: false` + `isLocked: true` (D): the locked notice `docs.LOCKED_NOTICE` is the only note, the no-write
 *   notice is absent — the condition at `docs-page-view.tsx:1001` excludes it — and the page is read-only.
 * - `canWrite: false` + `isArchived: true` (E): the trash notice `docs.IN_TRASH_NOTICE` (a `role="alert"`) with its
 *   `Restore` button, no no-write notice, read-only. `unsupported` is the fourth way `isReadOnly` (`:798`) turns on and
 *   the fourth way the notice is skipped; it needs content this editor cannot carry, which no case here builds.
 * - `canWrite: false` with anchored blocks (F): the read-only body holds `[data-block-id="<uuid>"]` for both blocks —
 *   the selector a `?block=` link is resolved with (`blockSelectorOf`, `docs-page-view.tsx:114-117`), rendered from the
 *   JSON because the stored HTML carried none. That is 217661ac8 pinned.
 * - `canWrite` absent + the save refused 403 (G): what the person gets is the alert
 *   `docs.SAVE_FORBIDDEN` — "You can read this page, but not change it: the last change was not saved. It stays in this
 *   tab. Ask the author to share the page with you for editing." — with the editor still editable, the typed text still
 *   in it, the toolbar's `role="status"` saying `docs.NOT_SAVED`, exactly one refused `PUT` in the mock's log
 *   (no retry), and no `docs.NO_WRITE_ACCESS_NOTICE` (the platform never said `canWrite: false`). The app classifies
 *   the status at `use-docs-autosave.ts:365` (`403 → 'forbidden'`) and renders it at `docs-page-view.tsx:1040-1042`.
 *   It is a clear refusal, so nothing in this file is marked "measured, not intended". Measured on the editor itself:
 *   the block it was typed into reads `Probe paragraph text. probe reply` afterwards (`s2-lane-c-docs-probe-403-safe.log`,
 *   where the same run moved the page's word count from 5 to 7), so this case asserts the editor `toContainText` of both
 *   halves rather than an exact match on the stored sentence.
 * - `shield.consoleErrors()` is deliberately not asserted in G: the refusal reports itself twice
 *   (`Failed to load resource: … 403` and `[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - PUT
 *   /plugins/docs/documents/<id>/content - Permission Denied`), which is the app naming a refusal rather than a defect.
 *   Every other case does assert it.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `docsService.BASE` (`core/services/client/api/docs/docs.service.ts:29`) on the mock origin, proxy-prefixed. */
const DOCS_PREFIX = '/api/plugins/docs';
const DOCS_BASE = '/api/plugins/docs/documents';

/** A synthetic page: the lane mock has no document of its own (`cypress/support/mock-gauzy-server.mjs` has no docs handler). */
const PAGE_ID = 'playwright-docs-write-access';
const PAGE_NAME = 'Playwright Write Access Probe';
/** The editor's own block anchors: version 4 UUIDs, or `isBlockId` (block-id-extension.ts:26-28) drops them. */
const BLOCK_HEADING = '2f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a11';
const BLOCK_PARAGRAPH = '3f7b6a3c-1c0d-4f0a-9a6c-1c2c6b7c9a22';
/**
 * What every case types into the body (`tryTyping`), so a run log says what was typed where.
 *
 * Its letters are chosen: on a page with no editable field a keystroke is not text, it is the app's own shortcut key
 * (see `tryTyping`), so nothing here types `a`, `c`, `h`, `g`, `n`, `t` or `/`.
 */
const TYPED_INTO_BODY = 'probe reply';

/** The mock's own CORS answer, restated on every answer this spec writes (`clients-access-ui.spec.ts:138-145`). */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** The English, copied from `locales/en.json` (the key named in each entry; the suite has no locale helper). */
const TEXT = {
	noWriteAccess: 'You can read this page, but not change it. Ask its author to share it with you for editing.', // docs.NO_WRITE_ACCESS_NOTICE, en.json:7209
	locked: 'This page is locked on the platform and can only be read.', // docs.LOCKED_NOTICE, en.json:7208
	inTrash: 'This page is in the trash. Restore it to edit it.', // docs.IN_TRASH_NOTICE, en.json:7207
	saveForbidden:
		'You can read this page, but not change it: the last change was not saved. It stays in this tab. Ask the author to share the page with you for editing.', // docs.SAVE_FORBIDDEN, en.json:7232
	notSaved: 'Not saved', // docs.NOT_SAVED, the SaveStateLabel of docs-page-view.tsx:1295 for state 'forbidden'
	restore: 'Restore', // docs.RESTORE
	pageTitle: 'Page title', // docs.PAGE_TITLE, en.json:7171
	heading: 'Probe heading',
	paragraph: 'Probe paragraph text.'
};

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c docs write access] MEASURE ${label} · ${parts}`);
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
		`this app publishes NEXT_PUBLIC_DOCS_ENABLED = ${JSON.stringify(flag ?? null)}, so /docs/<id> bounces to the ` +
			`app home (docs-page.tsx:87,121) and no case here can be reached — start the lane with E2E_DOCS=1 ` +
			`(playwright/test-servers.ts sharedEnv)`
	);
});

type PageOverrides = {
	/** `absent` is a platform that predates the field: the answer carries no `canWrite` at all. */
	canWrite?: boolean | 'absent';
	isLocked?: boolean;
	isArchived?: boolean;
};

/** One page, built from `IDocumentPage` (`core/types/interfaces/common/docs.ts:56-94`). */
function stubPageOf(fixture: BootstrapFixture, overrides: PageOverrides): Record<string, unknown> {
	const page: Record<string, unknown> = {
		id: PAGE_ID,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		kind: 'PAGE',
		parentId: null,
		index: 0,
		name: PAGE_NAME,
		icon: null,
		color: null,
		description: null,
		contentJson: {
			type: 'doc',
			content: [
				{
					type: 'heading',
					attrs: { level: 2, blockId: BLOCK_HEADING },
					content: [{ type: 'text', text: TEXT.heading }]
				},
				{
					type: 'paragraph',
					attrs: { blockId: BLOCK_PARAGRAPH },
					content: [{ type: 'text', text: TEXT.paragraph }]
				}
			]
		},
		// The platform's HTML cache keeps no block anchors — exactly the gap the anchored read-only view closes
		// (docs-page-view.tsx:602-617, docs-editor-html.ts:14-24).
		contentHtml: `<h2>${TEXT.heading}</h2><p>${TEXT.paragraph}</p>`,
		visibility: 'ORGANIZATION',
		organizationTeamId: null,
		isArchived: overrides.isArchived === true,
		archivedAt: overrides.isArchived === true ? '2026-01-06T09:00:00.000Z' : null,
		createdByUserId: fixture.ids.user,
		createdAt: '2026-01-05T09:00:00.000Z',
		updatedAt: '2026-01-05T09:00:00.000Z',
		version: 1
	};
	if (overrides.canWrite !== 'absent') page.canWrite = overrides.canWrite === true;
	if (overrides.isLocked === true) page.isLocked = true;
	return page;
}

/**
 * Answers the two reads that describe this page and lets every other docs call through to the mock
 * (`route.fallback()`), so the mock's log still records what the page really asked. Routes go on **before** the
 * navigation, or the answer has already been given (`clients-access-ui.spec.ts:210-237`).
 */
async function stubDocsPage(page: Page, fixture: BootstrapFixture, overrides: PageOverrides): Promise<void> {
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(DOCS_PREFIX),
		async (route) => {
			const method = route.request().method();
			const pathname = new URL(route.request().url()).pathname;
			if (method === 'GET' && pathname === `${DOCS_BASE}/${PAGE_ID}`) {
				// Asked of the mock first, so its log carries the read this spec then answers.
				await route.fetch();
				return route.fulfill({ status: 200, headers: CORS_HEADERS, json: stubPageOf(fixture, overrides) });
			}
			if (method === 'GET' && pathname === `${DOCS_BASE}/${PAGE_ID}/path`) {
				await route.fetch();
				return route.fulfill({ status: 200, headers: CORS_HEADERS, json: [] });
			}
			return route.fallback();
		}
	);
}

/** Routes first, then the scenario, then the cookies, then the navigation (`playwright/helpers.ts:439-451`). */
async function openDocsPage(
	page: Page,
	fixture: BootstrapFixture,
	overrides: PageOverrides,
	scenario: MockScenario = {}
): Promise<void> {
	await stubDocsPage(page, fixture, overrides);
	await signInAndVisit(page, fixture, `/docs/${encodeURIComponent(PAGE_ID)}`, { scenario });
}

/** The body's editable editor: tiptap's own `contenteditable="true"` (0 when the page opens read-only). */
const editableEditor = (page: Page): Locator => page.locator('[contenteditable="true"]');
/** The read-only body's block anchors, the same selector a `?block=` link resolves with (docs-page-view.tsx:114-117). */
const blockAnchor = (page: Page, blockId: string): Locator =>
	page.locator(`[data-block-id="${blockId}"], [data-blockid="${blockId}"]`);
const titleField = (page: Page): Locator => page.getByRole('textbox', { name: TEXT.pageTitle, exact: true });
const notice = (page: Page, role: 'note' | 'alert', text: string): Locator =>
	page.getByRole(role).filter({ hasText: text });

/** The title gets the same treatment as the body: letters the app does not bind as shortcut keys (`tryTyping`). */
const TYPED_INTO_TITLE = 'probe';

/**
 * Types into the body — and, unless told otherwise, into the title too — then waits past the autosave's debounce
 * (`use-docs-autosave.ts:14`, 2 000 ms) and past the title's own (`docs-page-view.tsx:667`).
 *
 * **Why the typed words avoid `a`, `c`, `g`, `h`, `n`, `t` and `/`.** On a page the person may not change there is no
 * editable target: clicking the body text measured `document.activeElement = BODY`
 * (`E:\Coding\.tmp\s2-lane-c-docs-probe-type-safe-false.log`, `…-insert-false.log`), and hotkeys-js lets a shortcut
 * through unless the target is editable — `node_modules/hotkeys-js/dist/hotkeys.esm.js:220-229` stands down for
 * `isContentEditable` or a non-`readOnly` `INPUT`/`TEXTAREA`/`SELECT`, so even the read-only title field is not a typing
 * target for it. The keystrokes then reach the app's own keys: `HostKeys.SHORTCUT_LIST` is `shift+h,h`
 * (`core/hooks/common/use-hotkeys.ts:105`, bound while `core/components/layouts/app/keyboard-shortcuts-mount.tsx:66-79`
 * is mounted) and the registry binds `themeToggle` as the sequence `t h` (`core/lib/keyboard/shortcuts.ts:68`). Both
 * were measured. Typing the sentence ` typed by the probe` on the read-only page flipped the app theme `light → dark`
 * (that `t h`, `s2-lane-c-docs-probe-type-false.log`) and, in run `s2-lane-c-docs-5.log`, its `h` opened the
 * "Keyboard shortcuts" dialog, behind which the title stopped answering `getByRole('textbox', …)` — that dialog, not the
 * Docs page, is what made that run red. `probe reply` / `probe` hit no bound key: same probe, `shortcutsDialog 0`,
 * theme still `light`, body unchanged, nothing sent. In case G the target **is** the editor (`activeElement` measured as
 * `DIV` with `contenteditable="true"`), where hotkeys-js stands down and the same letters are ordinary text — measured by
 * the refused save that typing there causes.
 */
async function tryTyping(page: Page, { intoTitle = true } = {}): Promise<void> {
	await page.getByText(TEXT.paragraph, { exact: true }).first().click();
	await page.keyboard.press('End');
	await page.keyboard.type(` ${TYPED_INTO_BODY}`);
	if (intoTitle) {
		const title = titleField(page).first();
		await title.click();
		await page.keyboard.press('End');
		await page.keyboard.type(` ${TYPED_INTO_TITLE}`);
	}
	await page.waitForTimeout(4_000);
}

/** The docs writes the browser itself sent, independent of what the mock recorded. */
function docsWritesSent(page: Page): Array<{ method: string; path: string }> {
	const sent: Array<{ method: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN || !url.pathname.startsWith(DOCS_PREFIX)) return;
		if (request.method() === 'GET' || request.method() === 'OPTIONS' || request.method() === 'HEAD') return;
		sent.push({ method: request.method(), path: url.pathname });
	});
	return sent;
}

/** The docs writes the mock recorded: every docs read here is a GET, so anything else is a write. */
async function docsWritesLogged(mock: {
	requests: () => Promise<Array<{ method: string; path: string; status: number }>>;
}): Promise<Array<{ method: string; path: string; status: number }>> {
	return (await mock.requests()).filter(
		(request) => request.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(request.method)
	);
}

test.describe('lane-c · a page the person may read and not change (docs-page-access → docs-page-view.tsx:600,798,1001)', () => {
	test('A · canWrite:false — read-only body, the no-write notice, and typing changes nothing', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const sent = docsWritesSent(page);
		await openDocsPage(page, fixture, { canWrite: false });

		const editors = editableEditor(page);
		await expect(
			page.getByText(TEXT.noWriteAccess, { exact: true }),
			`the page must say docs.NO_WRITE_ACCESS_NOTICE (${await page.getByText(TEXT.noWriteAccess, { exact: true }).count()} found)`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			`and it is the muted Notice, i.e. role="note" (docs-page-view.tsx:1309-1322)`
		).toHaveCount(1);
		await expect(
			page.getByText(TEXT.paragraph, { exact: true }),
			`the body is the read-only RichTextView, so its text is there (${await page.getByText(TEXT.paragraph, { exact: true }).count()})`
		).toHaveCount(1);
		await expect(
			editors,
			`a page the person may not change mounts no editable editor at all (docs-page-view.tsx:1115-1117 renders RichTextView instead; ${await editors.count()} found)`
		).toHaveCount(0);
		await expect(
			titleField(page).first(),
			`the title field is readOnly too (docs-page-view.tsx:1088)`
		).toHaveAttribute('readonly');

		const titleBefore = await titleField(page).first().inputValue();
		await tryTyping(page);
		const logged = await docsWritesLogged(mock);
		measure('A canWrite:false', {
			editors: await editors.count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			titleReadonly: await titleField(page).first().getAttribute('readonly'),
			titleBefore,
			titleAfter: await titleField(page).first().inputValue(),
			browserWrites: sent,
			mockWrites: logged
		});
		expect(sent, `typing into a read-only page sent a write (${JSON.stringify(sent)})`).toEqual([]);
		expect(logged, `and the mock was never asked to write this page (${JSON.stringify(logged)})`).toEqual([]);
		await expect(
			page.getByText(TEXT.paragraph, { exact: true }),
			`the body still reads as it was stored: nothing typed landed in it`
		).toHaveCount(1);
		await expect(
			titleField(page).first(),
			`the read-only title still holds the stored name: nothing typed landed there either`
		).toHaveValue(titleBefore);
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});

	test('B · canWrite:true — the editable editor, and no such notice', async ({ page, fixture, mock, shield }) => {
		await openDocsPage(page, fixture, { canWrite: true });

		const editors = editableEditor(page);
		await expect(
			editors.first(),
			`a page the person may change opens its editor (${await editors.count()} found)`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			`and says nothing about lacking write access`
		).toHaveCount(0);
		const title = titleField(page).first();
		measure('B canWrite:true', {
			editors: await editors.count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			titleReadonly: await title.getAttribute('readonly'),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			title,
			`the title field is writable (no readonly attribute = ${String(await title.getAttribute('readonly'))})`
		).not.toHaveAttribute('readonly');
		await expect(
			page.getByText(TEXT.paragraph, { exact: true }),
			`the stored text is in the editor, not in a read-only view`
		).toHaveCount(1);
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});

	test('C · canWrite absent (a platform that predates the field) — editable, and no such notice', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await openDocsPage(page, fixture, { canWrite: 'absent' });

		const editors = editableEditor(page);
		await expect(
			editors.first(),
			`isPageWithoutWriteAccess (core/lib/utils/docs-page-access.ts:9-11) counts only an explicit false, so the page opens editable as before (${await editors.count()} editors)`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			`and no notice is shown for a field the platform never sent`
		).toHaveCount(0);
		measure('C canWrite absent', {
			editors: await editors.count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			titleReadonly: await titleField(page).first().getAttribute('readonly'),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(titleField(page).first(), 'and the title field stays writable').not.toHaveAttribute('readonly');
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});

	test('D · canWrite:false + isLocked — the locked notice says it, the no-write notice stays out', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await openDocsPage(page, fixture, { canWrite: false, isLocked: true });

		await expect(
			notice(page, 'note', TEXT.locked).first(),
			`the locked page says docs.LOCKED_NOTICE (${await notice(page, 'note', TEXT.locked).count()})`
		).toBeVisible({ timeout: 30_000 });
		measure('D canWrite:false + isLocked', {
			lockedNotice: await notice(page, 'note', TEXT.locked).count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			editors: await editableEditor(page).count(),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			`docs-page-view.tsx:1001 keeps docs.NO_WRITE_ACCESS_NOTICE out when the page is locked, so the person is told once`
		).toHaveCount(0);
		await expect(
			editableEditor(page),
			'and the page is still read-only (a locked page was read-only before #5723)'
		).toHaveCount(0);
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});

	test('E · canWrite:false + isArchived — the trash notice and its Restore, no no-write notice', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await openDocsPage(page, fixture, { canWrite: false, isArchived: true });

		const trash = notice(page, 'alert', TEXT.inTrash);
		await expect(
			trash.first(),
			`a trashed page says docs.IN_TRASH_NOTICE as the warning Notice, i.e. role="alert" (${await trash.count()})`
		).toBeVisible({ timeout: 30_000 });
		await expect(
			trash.first().getByRole('button', { name: TEXT.restore, exact: true }),
			`with its Restore button beside the sentence (docs-page-view.tsx:987-994)`
		).toHaveCount(1);
		measure('E canWrite:false + isArchived', {
			trashNotice: await trash.count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			editors: await editableEditor(page).count(),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			'docs-page-view.tsx:1001 keeps the no-write notice out of a trashed page too'
		).toHaveCount(0);
		await expect(editableEditor(page), 'and a trashed page is read-only').toHaveCount(0);
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});

	test('F · canWrite:false with anchored blocks — the read-only body keeps its block links (217661ac8)', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await openDocsPage(page, fixture, { canWrite: false });

		const heading = blockAnchor(page, BLOCK_HEADING);
		const paragraph = blockAnchor(page, BLOCK_PARAGRAPH);
		await expect(
			heading.first(),
			`the stored HTML carried no anchor for this block, so the read-only body must render it from the JSON ` +
				`(docs-page-view.tsx:605-617 → docs-editor-html.ts:14-24): ${await heading.count()} element(s) for ${BLOCK_HEADING}`
		).toBeVisible({ timeout: 30_000 });
		const anchors = page.locator('[data-block-id], [data-blockid]');
		measure('F canWrite:false, anchored body', {
			anchors: await anchors.count(),
			ids: await anchors.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-block-id'))),
			editors: await editableEditor(page).count(),
			mockWrites: await docsWritesLogged(mock)
		});
		await expect(
			paragraph,
			`both blocks keep their anchor (${await paragraph.count()} for ${BLOCK_PARAGRAPH})`
		).toHaveCount(1);
		await expect(
			anchors,
			`exactly the two anchors of the stored page, and no other (${await anchors.count()})`
		).toHaveCount(2);
		// The anchor is what a `?block=` link points at: blockSelectorOf (docs-page-view.tsx:114-117) is the same selector.
		expect(
			await anchors.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-block-id'))),
			"the anchors in the read-only body are the page's own block ids"
		).toEqual([BLOCK_HEADING, BLOCK_PARAGRAPH]);
		await expect(
			editableEditor(page),
			'while the page stays read-only — the anchors are kept without giving the person an editor'
		).toHaveCount(0);
		expect(
			shield.consoleErrors(),
			`the page reported console errors: ${shield.consoleErrors().join(' | ')}`
		).toEqual([]);
	});
});

test.describe('lane-c · a platform that never answered canWrite refuses the save (docs-page-access.ts:4-7)', () => {
	// No `shield` here on purpose: the refusal logs itself twice (see the header), which is the app naming a refusal.
	test('G · canWrite absent + PUT …/content refused 403 — the person is told the save was refused, in their own words', async ({
		page,
		fixture,
		mock
	}) => {
		const contentPath = `${DOCS_BASE}/${PAGE_ID}/content`;
		// The refusal comes from the mock (its route handler is skipped for an armed path), so its log carries it.
		await openDocsPage(page, fixture, { canWrite: 'absent' }, { fails: { [contentPath]: 403 } });

		await expect(
			editableEditor(page).first(),
			'the page opened editable, because the platform never said it may not be written'
		).toBeVisible({ timeout: 30_000 });
		// Only the body: the title's own save (docs-page-view.tsx:643-660 → PUT …/documents/<id>) is not armed, so
		// typing there would send a write this case does not need.
		await tryTyping(page, { intoTitle: false });

		const refusal = notice(page, 'alert', TEXT.saveForbidden);
		await expect(
			refusal.first(),
			`the refused save says docs.SAVE_FORBIDDEN (docs-page-view.tsx:1040-1042, autosave 'forbidden' from the 403 at ` +
				`use-docs-autosave.ts:365); the page says ${await page
					.locator('article')
					.innerText()
					.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toBeVisible({ timeout: 30_000 });
		const refusedSaves = (await mock.calls(contentPath)).filter((call) => call.status === 403);
		measure('G canWrite absent + 403 save', {
			refusals: refusedSaves.length,
			saveForbiddenNotice: await refusal.count(),
			noWriteNotice: await notice(page, 'note', TEXT.noWriteAccess).count(),
			notSavedLabel: await page.getByRole('status').filter({ hasText: TEXT.notSaved }).count(),
			editors: await editableEditor(page).count()
		});
		expect(
			refusedSaves.length,
			`the save reached the mock exactly once and was refused there (${JSON.stringify(await mock.calls(contentPath))})`
		).toBe(1);
		await expect(
			notice(page, 'note', TEXT.noWriteAccess),
			'no read-only notice is shown: the platform never answered canWrite, so the refusal is the only thing the person is told'
		).toHaveCount(0);
		await expect(
			page.getByRole('status').filter({ hasText: TEXT.notSaved }).first(),
			`and the toolbar says ${JSON.stringify(TEXT.notSaved)} beside the save state (docs-page-view.tsx:1291-1300)`
		).toHaveCount(1);
		await expect(
			editableEditor(page),
			'the editor stays open with the text in it, so nothing typed here is lost'
		).toHaveCount(1);
		// The block it was typed into now reads "Probe paragraph text. typed by the probe", which is the point: the
		// refused save left the text where it was typed (an exact match on the stored sentence is gone by then).
		await expect(
			editableEditor(page).first(),
			'the editor still holds the stored sentence it was typed onto'
		).toContainText(TEXT.paragraph);
		await expect(editableEditor(page).first(), `and the typed text itself (${TYPED_INTO_BODY})`).toContainText(
			TYPED_INTO_BODY
		);
	});
});
