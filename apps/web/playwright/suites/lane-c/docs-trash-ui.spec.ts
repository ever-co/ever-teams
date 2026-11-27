import { expect, test, type Page, type Shield } from '../../fixtures';
import type { APIRequestContext } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { APP_ORIGIN, mockReset, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person can do with a page that is already in the Docs trash (`/docs/trash`): read the rows, Cancel
 * or confirm "Delete forever", be told when the platform refuses, and see what the list does when it is longer than
 * one read. Pinned in a real Chrome on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control
 * `http://127.0.0.1:4004`, `playwright/test-servers.ts:37`) with `E2E_LANE=lane-c E2E_EVER_ID=1 E2E_DOCS=1
 * E2E_LIVEKIT=1 E2E_BROWSER_CHANNEL=chrome E2E_REUSE_SERVERS=1` (`test-servers.ts:117`), the lane checked (never started) with
 * `node playwright/scripts/lane-servers.mjs check lane-c`. Every value below is one a run printed: the probes
 * `/d/Coding/.tmp/p-docstrash-1.log` (P1-P7) and `/d/Coding/.tmp/p-docstrash-2.log` (Q1-Q5) measured the page first,
 * and every case here repeats what it asserted on its own `[lane-c docs trash] MEASURE …` line in
 * `/d/Coding/.tmp/s3-lane-c-docstrash-1.log` and `-2.log`.
 *
 * ## The page, and the gate that opens it
 *
 * `/docs/trash` → `app/[locale]/(main)/docs/trash/page.tsx` → `DocsPage view="trash"` → the trash block at
 * `core/components/pages/docs/docs-page.tsx:437-448` (`onRestore={restore}`, and `onDelete` =
 * `await actions.deletePage(page.id, 'subtree'); forget(page.id);` inside a try/catch that ends in
 * `fail(error, 'docs.DELETE_ERROR')`) → `core/components/pages/docs/docs-trash.tsx`: rows at `:59-81` (an icon span, a
 * title `<p>`, a trashed-at `<p>`, `docs.RESTORE`, `docs.DELETE_FOREVER`), the loading line at `:47`, the error line
 * plus its `docs.RETRY` button at `:48-55`, the empty state at `:56-58`, and the confirmation dialog at `:83-96`
 * (`AlertDialogConfirmation`, title `docs.DELETE_FOREVER`, description `docs.DELETE_FOREVER_TEXT` filled with
 * `pageTitle(deleting, t('docs.UNTITLED'))`, confirm `docs.DELETE_FOREVER`, cancel `docs.CANCEL`). Docs ships behind
 * `NEXT_PUBLIC_DOCS_ENABLED` (`core/lib/utils/docs-enabled.ts:7-10`); this file reads the flag back off the served
 * document and skips itself without it, exactly as `suites/lane-c/docs-home-ui.spec.ts` does.
 *
 * Read: `useDocsTrash` (`core/hooks/docs/use-docs-tree.ts:70-81`) → `docsService.listAll({kind:[FOLDER,PAGE],
 * archived:'only', sort:'updatedAt', sortOrder:'DESC'})` (`core/services/client/api/docs/docs.service.ts:51-76`) with
 * `retry: false`; the rows are then re-sorted in the client by `sortByUpdated` (`core/lib/utils/docs-tree.ts:215-217`).
 * Writes: `remove(id, 'subtree')` → `DELETE …/documents/<id>?<organizationId>&<tenantId>&strategy=subtree` with no body
 * (`docs.service.ts:141-144`, `:45-47`); `unarchive(id)` → `POST …/documents/<id>/unarchive` with an empty body
 * (`docs.service.ts:135-138`). Both are followed by `invalidateTree() + invalidateTrash()` and a trash re-read
 * (`core/hooks/docs/use-docs-actions.ts:206-224`).
 *
 * ## What is real here and what this file serves
 *
 * The browser, the app, its queries and its dialogs are real. The platform is not: the lane mock has **no docs
 * handler** (`suites/lane-c/docs-home-ui.spec.ts`'s header), so `stubDocs` answers the docs paths this file depends
 * on, on the mock origin, restating the mock's CORS set and answering `OPTIONS` with 204
 * (`cypress/support/mock-gauzy-server.mjs:1087-1100`). It is store-backed: every list answer is the current store, so
 * an accepted DELETE is followed by a list read that no longer answers that page, and a refused one changes nothing —
 * the only way "the row left the trash" can be told apart from "the page stopped painting it". Refusals are served
 * here too (`statusCode` + `message`, Gauzy's error shape), which is why this file can name the message a person is
 * shown; the mock's own `fails` arm could only ever say `Synthetic Gauzy refusal (${failStatus})` (`:1169`). `spaces` is left
 * to the mock, so it still logs the one docs call it answers itself.
 *
 * Row counts and page numbers come from `listAll`'s own arithmetic, not from a machine: `DOCS_LIST_PAGE_SIZE = 100`
 * (`core/types/interfaces/common/docs.ts:305`), so 101 served pages is exactly one full read plus one (`take=100&skip=1`,
 * then `take=100&skip=2`, measured in `p-docstrash-2.log` Q5 and pinned in case I). Case I is the only case whose read
 * count is pinned exactly; every other read count is polled (`expect.poll(…).toBeGreaterThan(…)`), never counted.
 * Dates are served relative to the run's own day (`dayIso`, at local noon so a `dateStyle: 'medium'` rendering cannot
 * straddle midnight) and asserted against the **browser's** formatting of the same ISO string (`browserDate`), so no
 * time zone and no calendar day is written down anywhere in this file.
 *
 * ## What the runs measured, in the order it was found
 *
 * - A row is `<title>` + `In the trash since <date>` + `Restore` + `Delete forever`, the date the served `archivedAt`
 *   formatted by `new Intl.DateTimeFormat(locale, {dateStyle:'medium', timeStyle:'short'})` (`docs-trash.tsx:26`):
 *   `Nov 27, 2026, 12:00 PM` for the same-day page, `Nov 26, 2026, 12:00 PM` for the day-before page,
 *   `Oct 27, 2026, 12:00 PM` for the month-before page (`p-docstrash-1.log` P1). Measured note: the row prints the
 *   absolute stamp; nothing on the page words it as today, yesterday or a month ago (case H pins that absence).
 * - A row served **without** an `archivedAt` prints `docs.IN_TRASH` and no date (`docs-trash.tsx:69`); that state only
 *   exists because this file serves it — the mock answers no archived page at all.
 * - The rows are printed newest-first with ties broken by id, whatever order the list came back in
 *   (`use-docs-tree.ts:79` + `core/lib/utils/docs-tree.ts:215-217`): `p-docstrash-1.log` P4 served `[parent, child, grandchild, other]`
 *   and the page printed `Branch, Root, Twig, Aside`. The unit rule says the same thing — its test names it
 *   `it('sorts by the newest change first', …)` (`core/lib/utils/docs-tree.test.ts:135-138`) — so case D pins the
 *   order the page printed, not a guess.
 * - The dialog (`role="alertdialog"`, Base UI, `core/components/common/alert-dialog.tsx:58-140`): title
 *   `docs.DELETE_FOREVER`, description `docs.DELETE_FOREVER_TEXT` with the row's title in it, a `Cancel` button that
 *   **starts focused** (`alert-dialog.tsx:60-62`, whose own comment at `:13` says "Radix moved the initial focus to the Cancel button, so a stray Enter never confirms a destructive action.") and the destructive button whose accessible name is also
 *   `docs.DELETE_FOREVER`. While it is open the page behind is out of the accessibility tree: page-wide there is
 *   exactly **one** `Delete forever` button and it is the dialog's (`p-docstrash-1.log` P2). Case J adds the case the
 *   unit test names `it('reads a blank name as untitled', …)` (`core/lib/utils/docs-tree.test.ts:129-133`): a page
 *   whose served name is three spaces prints `docs.UNTITLED` in its row and is named `Untitled` in the sentence above
 *   the Cancel button.
 * - **Cancel sends nothing at all**: no write, no re-read, no toast, the row stays, the dialog closes (case A, with a
 *   short commented quiet window as the only way to prove a non-event).
 * - **Confirm closes the dialog with the click itself** — the action button is Base UI's Close
 *   (`alert-dialog.tsx:126-140`), so `dialogCount` was already 0 at the first read after the click while the row's own
 *   `Restore` and `Delete forever` were both disabled (`busyId === page.id`, `docs-trash.tsx:72,75`). Measured note, a
 *   branch this page never reaches: `docs-trash.tsx:90` passes `loading` into the dialog and
 *   `core/components/common/alert-dialog-confirmation.tsx:44-47` would turn the confirm button into
 *   `modals.confirmation.CONFIRMING` / `common.PROCESSING` with a spinner — that painting was never observed on this
 *   page, because the dialog is gone before the write answers. To see the busy state at all, case B's stub holds the
 *   DELETE **answer** for 1.2 s (`deleteAnswerDelayMs`); the request itself went out at once, and that is what the case
 *   asserts.
 * - The DELETE as sent, pinned in cases B and D: `DELETE /api/plugins/docs/documents/<id>?organizationId=…
 *   &tenantId=…&strategy=subtree`, `body: null` — the scope and the strategy ride on the query
 *   (`docs.service.ts:141-144` with `scopedQuery` at `:45-47`). After it: the trash is read again with the identical
 *   query, the deleted page is out of the pane, a subtree delete takes the parent and every page under it out of the
 *   list (case D: one write for four rows, three of them a family — the family leaving is *this store* answering
 *   `strategy=subtree`; what the app is measured to do is send that one query), and **no toast follows a delete that
 *   worked** (`p-docstrash-1.log` P4, `p-docstrash-2.log` Q1: `toasts []`).
 * - A refused delete is told in the platform's own words: the toast is exactly the `message` this file served
 *   (`Playwright docs refusal (403): the page is locked`, `… (500): the server blinked`) and `docs.DELETE_ERROR` is
 *   printed **zero** times, because `fail` keeps its translation only for a failure that carries no message
 *   (`docs-page.tsx:170-176`, the same finding `docs-home-ui.spec.ts` case I made for a create). The row stays, its
 *   two buttons become usable again, the dialog closes on its own a moment after the refusal, and the trash is **not**
 *   re-read — `deletePage` awaits the remove before it invalidates anything (`use-docs-actions.ts:218-224`). Measured
 *   note on the console: a 403 logs itself as `🚨 CRITICAL: HTTP 403 Forbidden - DELETE <url> - Permission Denied`
 *   while every other status logs `HTTP Error: DELETE <url> 500` (`core/services/logs/logger-adapter.service.ts:196` for the 403 and `:199` for every other status), and both write the **relative** url (`/plugins/docs/…`, no origin, no `/api`), which is why the
 *   excused lines here are built from the recorded request path rather than from the browser's request line.
 * - A refused Restore (`POST …/<id>/unarchive` answered 500) says the same: the platform's message as a toast,
 *   `docs.RESTORE_ERROR` count 0, no `docs.RESTORED` claim, the row still listed with Restore offered again, nothing
 *   added to the tree pane beside it, and no re-read (case F). What the unarchive posts is only
 *   `{"tenantId":…,"organizationId":…}` — `docsService.unarchive` posts `{}` (`docs.service.ts:135-138`).
 * - When the trash read itself is refused 500 the pane shows `docs.LOAD_ERROR` and one `docs.RETRY` button, with **no
 *   rows, no `docs.LOADING` line and no empty state** (an outage is not an empty trash, `docs-trash.tsx:56`), and it is
 *   a plain `<p>` plus a Button — not an alert: the page's only `role="alert"` holds no text at all and belongs to the
 *   shell (`p-docstrash-1.log` P6). The tree read beside the trash answered, so that Retry is the only one on the page.
 *   `Retry` is `query.refetch` (`use-docs-tree.ts:80`); this file polls the recorded calls until a further identical
 *   read shows up (never an exact count) and then pins the served success: both rows printed, the error line and its
 *   Retry gone. In dev the failed query also raises a developer-only toast carrying `500 · <message>` and
 *   `Copy details` (`core/components/common/dev-error-toaster.tsx:16-20`) — printed, filtered out of every toast
 *   assertion by `userToasts`, never asserted.
 * - 101 trashed pages: `listAll` reads it as `take=100&skip=1` then `take=100&skip=2` (`skip` is a page number counted
 *   from 1, `docs.service.ts:57-60`) and the pane shows all 101 rows with no paging control of its own — the only
 *   buttons in the Docs pane are the rows' own `Restore` and `Delete forever` pair.
 * - The availability count is asked **once** per `/docs/trash` document (`use-docs-availability.ts:28-40`), provided the
 *   arming cuts at that document's **response**: `hardVisit` warms the browser with the app home and that warm-up page
 *   runs its own docs reads, which is what made an un-armed stub log show two count asks (`p-docstrash-1.log` P1
 *   counted 2 while `p-docstrash-2.log` Q1, armed, counted 1 with the warm-up list empty). Cases print both lists.
 *
 * ## What this file does not cover
 *
 * The trash list with its Restore and its empty state already belongs to `suites/lane-c/docs-home-ui.spec.ts` cases J,
 * K and L, and nothing here repeats them: the success path of **Restore** is not re-tested. Neither is the route of a
 * page that was just deleted: `/docs/<id>` shows a warning Notice with `docs.RESTORE` when the read answers an archived
 * page (`core/components/pages/docs/docs-page-view.tsx:987-993`, whose copy `docs.IN_TRASH_NOTICE` is "This page is in
 * the trash. Restore it to edit it.", `locales/en.json:7220`) — reaching it needs the single-page reads `…/<id>` and
 * `…/<id>/path`, which `suites/lane-c/docs-page-write-access-ui.spec.ts` answers. A row served with `name: null` is not pinned (it prints
 * the same `docs.UNTITLED` title as the blank-named row of case J, and two rows with the same printed title cannot be
 * addressed by their text). `DOCS_TREE_MAX_PAGES = 2000` (`core/types/interfaces/common/docs.ts:307`) is not served:
 * it would take twenty reads to reach and nothing on the page distinguishes it from a shorter list. A refused trash
 * read is armed as a 500 only — a 404 (`isEndpointUnavailable`, `core/services/client/api-error.service.ts:253-255`)
 * and a cut connection (`scenario.drops`) are what `docs-home-ui.spec.ts` cases C and E measured for the tree. The
 * trash header's `docs.BACK` link carries `lg:hidden` (`docs-trash.tsx:40`, an icon-only `aria-label` link), so at the
 * `Desktop Chrome` viewport this config runs at (`playwright.lane.config.ts:51`) that class hides it; nothing here
 * asserts it either way.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `docsService.BASE` (`core/services/client/api/docs/docs.service.ts:29`) on the mock origin, proxy-prefixed. */
const DOCS_PREFIX = '/api/plugins/docs';
const DOCS_BASE = '/api/plugins/docs/documents';
const DOCS_COUNT = `${DOCS_BASE}/count`;

/** `core/types/interfaces/common/docs.ts:305` — the page size `listAll` asks with (`docs.service.ts:61-76`). */
const LIST_PAGE_SIZE = 100;

/** The English, read from `locales/en.json` by key (the suite has no locale helper). */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	docs: Record<string, string>;
	common: Record<string, string>;
	modals: { confirmation: Record<string, string> };
};
const T = EN.docs;

/** Fills a copy's `{placeholders}` the way next-intl does. */
const filled = (key: string, values: Record<string, string>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, value), T[key]);

/** Prints what one case saw, so the run log carries the numbers its assertions are pinned on. */
function measure(label: string, seen: Record<string, unknown>): void {
	const parts = Object.entries(seen)
		.map(([key, value]) => `${key} ${typeof value === 'object' ? JSON.stringify(value) : value}`)
		.join(' · ');
	console.log(`[lane-c docs trash] MEASURE ${label} · ${parts}`);
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

/** `fails` / `drops` arms outlive a test unless the mock is reset (`playwright/helpers.ts:138-139`). */
test.afterEach(async () => {
	await mockReset();
});

/** The mock's own CORS answer (`cypress/support/mock-gauzy-server.mjs:1087-1100`), restated on every answer here. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** A served date at local noon, so a `dateStyle: 'medium'` rendering cannot straddle midnight. */
const dayIso = (offsetDays: number): string => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};

/** One trashed page, as this file serves it: the fields a list row reads (`IDocumentPage`, core/types/interfaces/common/docs.ts:56-94). */
type ServedRow = {
	id: string;
	name: string | null;
	parentId: string | null;
	icon: string | null;
	archivedAt: string | null;
	updatedAt: string;
};

/** `undefined` = trashed yesterday; an explicit `null` = a row with no trashed-at date at all (`docs-trash.tsx:69`). */
const row = (id: string, overrides: Partial<ServedRow> = {}): ServedRow => {
	const archivedAt = overrides.archivedAt === undefined ? dayIso(-1) : overrides.archivedAt;
	return {
		id,
		name: overrides.name === undefined ? (NAMES[id] ?? id) : overrides.name,
		parentId: overrides.parentId ?? null,
		icon: overrides.icon ?? null,
		archivedAt,
		updatedAt: overrides.updatedAt ?? archivedAt ?? dayIso(-1)
	};
};

/** Synthetic pages: the lane mock holds no document of its own. Names stay pairwise non-overlapping, because a row
 *  is found by the text it prints (`trashRow`). */
const ALPHA = 'pw-trash-alpha';
const BETA = 'pw-trash-beta';
const ROOT = 'pw-sub-root';
const BRANCH = 'pw-sub-branch';
const TWIG = 'pw-sub-twig';
const ASIDE = 'pw-sub-aside';
const UNTITLED = 'pw-untitled';
const LOCKED = 'pw-refuse-locked';
const BLINKED = 'pw-refuse-blinked';
const STUCK = 'pw-refuse-stuck';
const TREE_PAGE = 'pw-tree-page';
const TODAYS = 'pw-when-today';
const YESTERDAYS = 'pw-when-yesterday';
const LONG_AGO = 'pw-when-long-ago';
const UNDATED = 'pw-when-undated';

const NAMES: Record<string, string> = {
	[ALPHA]: 'Alpha',
	[BETA]: 'Beta',
	[ROOT]: 'Root',
	[BRANCH]: 'Branch',
	[TWIG]: 'Twig',
	[ASIDE]: 'Aside',
	[LOCKED]: 'Locked',
	[BLINKED]: 'Blinked',
	[STUCK]: 'Stuck',
	[TREE_PAGE]: 'Tree Page',
	// No word of these names may read like a date the app could print ('Today', 'Yesterday', …): case H asserts none
	// of that wording appears in the pane.
	[TODAYS]: 'DateSameDay',
	[YESTERDAYS]: 'DateOneDayBack',
	[LONG_AGO]: 'DateMonthBack',
	[UNDATED]: 'DateNoStamp'
};

/** This file's own refusal bodies; the mock's `fails` arm could only ever say `Synthetic Gauzy refusal (n)`. */
const REFUSAL_403 = { status: 403, message: 'Playwright docs refusal (403): the page is locked' };
const REFUSAL_500 = { status: 500, message: 'Playwright docs refusal (500): the server blinked' };
const REFUSAL_RESTORE = { status: 500, message: 'Playwright docs refusal (500): this page cannot come back' };
const REFUSAL_TRASH_READ = { status: 500, message: 'Playwright docs refusal (500): the trash could not be read' };

/** What `docsService.remove` puts on the query (`docs.service.ts:141-144` + `:45-47`), in the order `qs` writes it. */
const deleteSearch = (fixture: BootstrapFixture, strategy = 'subtree'): string =>
	`?organizationId=${fixture.ids.organizationA}&tenantId=${fixture.ids.tenantA}&strategy=${strategy}`;

/** The url the client's own console line writes for a call to this path: relative, `/plugins/…`, no `/api` (`api.service.ts`). */
const loggedUrl = (path: string, search: string): string => `${path.replace('/api/plugins', '/plugins')}${search}`;

type Refusal = { status: number; message: string };

type DocsScript = {
	/** The availability probe's answer (`use-docs-availability.ts:28-40`); a number decides it, so it is asked once. */
	count?: number;
	/** The pages the trash list answers, in the order the platform would return them. */
	trash?: ServedRow[];
	/** The pages the tree list answers (its pane is mounted beside the trash, `docs-page.tsx:399-424`). */
	tree?: ServedRow[];
	/** Refuse the first trash list read with this status and message; every later one answers normally. */
	refuseTrashRead?: Refusal;
	/** Refuse the `POST …/<id>/unarchive` of these ids. */
	refuseUnarchive?: Record<string, Refusal>;
	/** Refuse the `DELETE …/<id>` of these ids. */
	refuseDelete?: Record<string, Refusal>;
	/**
	 * Hold an accepted DELETE this many ms before answering it, so the row's busy state (`docs-trash.tsx:72,75`) can be
	 * seen at all: the write goes out at once (the stub records it before waiting), only the answer is late.
	 */
	deleteAnswerDelayMs?: number;
};

type ServedCall = { method: string; path: string; search: string; body: string | null };

type DocsHarness = {
	/** Every docs call this stub answered, oldest first, whatever page caused it. */
	calls: ServedCall[];
	/** What the store holds right now: exactly what the next list read will answer. */
	trash: () => ServedRow[];
	reads: (archived: 'only' | 'exclude') => ServedCall[];
	writes: () => ServedCall[];
};

/**
 * This file's stand-in for the platform's documents API, on the mock origin, because the lane mock has no docs
 * handler at all (every docs GET answers `{"items":[],"total":0}`, `suites/lane-c/docs-home-ui.spec.ts`'s header).
 * Store-backed: the list answer is always the current store, so an accepted write changes what the next list read
 * answers and a refused one changes nothing — which is the only way "the row left the trash" can be told apart from
 * "the page just stopped showing it". Routes go on **before** the navigation, or the answer has already been given.
 */
async function stubDocs(page: Page, script: DocsScript): Promise<DocsHarness> {
	const store: { trash: ServedRow[]; tree: ServedRow[] } = {
		trash: [...(script.trash ?? [])],
		tree: [...(script.tree ?? [])]
	};
	const calls: ServedCall[] = [];
	let refusedTrashReads = 0;

	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(DOCS_PREFIX),
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const pathname = url.pathname;
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});

			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method, path: pathname, search: url.search, body: request.postData() });

			if (method === 'GET' && pathname === DOCS_COUNT) return answer(200, script.count ?? 1);

			if (method === 'GET' && pathname === DOCS_BASE) {
				const archived = url.searchParams.get('archived');
				if (archived !== 'only' && archived !== 'exclude') return answer(200, { items: [], total: 0 });
				const items = archived === 'only' ? store.trash : store.tree;
				if (archived === 'only' && script.refuseTrashRead && refusedTrashReads === 0) {
					refusedTrashReads += 1;
					return answer(script.refuseTrashRead.status, {
						statusCode: script.refuseTrashRead.status,
						message: script.refuseTrashRead.message
					});
				}
				// `listAll` addresses pages, not rows: `skip` is a page number counted from 1 (`docs.service.ts:57-60`).
				const take = Number(url.searchParams.get('take') ?? String(LIST_PAGE_SIZE));
				const skip = Number(url.searchParams.get('skip') ?? '1');
				const slice = items.slice((skip - 1) * take, (skip - 1) * take + take);
				return answer(200, { items: slice, total: items.length });
			}

			// Only the segment right after `documents/` is the page id: `…/<id>/unarchive` carries its own segment.
			const tail = pathname.startsWith(`${DOCS_BASE}/`)
				? decodeURIComponent(pathname.slice(`${DOCS_BASE}/`.length))
				: '';
			const id = tail.split('/')[0];

			if (method === 'POST' && tail.endsWith('/unarchive')) {
				const refusal = script.refuseUnarchive?.[id];
				if (refusal) return answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
				const moved = store.trash.find((candidate) => candidate.id === id);
				if (!moved)
					return answer(404, { statusCode: 404, message: `this file's store holds no trashed page ${id}` });
				store.trash = store.trash.filter((candidate) => candidate.id !== id);
				store.tree = [...store.tree, { ...moved, archivedAt: null }];
				return answer(200, { ...moved, archivedAt: null });
			}

			if (method === 'DELETE' && id) {
				const refusal = script.refuseDelete?.[id];
				if (refusal) return answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
				// The request asked for `strategy=subtree`: this store answers it by taking the page and every page under it.
				const gone = new Set<string>([id]);
				let grew = true;
				while (grew) {
					grew = false;
					for (const candidate of [...store.trash]) {
						if (candidate.parentId && gone.has(candidate.parentId) && !gone.has(candidate.id)) {
							gone.add(candidate.id);
							grew = true;
						}
					}
				}
				store.trash = store.trash.filter((candidate) => !gone.has(candidate.id));
				if (script.deleteAnswerDelayMs) {
					await new Promise((resolve) => setTimeout(resolve, script.deleteAnswerDelayMs));
				}
				return answer(200, { id, removedWithSubtree: [...gone] });
			}

			// Everything else docs this page asks (spaces, follow, …) goes to the mock, so its log still records it.
			return route.fallback();
		}
	);

	return {
		calls,
		trash: () => store.trash,
		reads: (archived) =>
			calls.filter(
				(call) =>
					call.method === 'GET' && call.path === DOCS_BASE && call.search.includes(`archived=${archived}`)
			),
		writes: () => calls.filter((call) => !['GET', 'OPTIONS', 'HEAD'].includes(call.method))
	};
}

/** Routes first, then the sign-in and the visit (`playwright/helpers.ts:439-451`). */
async function openTrash(page: Page, fixture: BootstrapFixture, script: DocsScript): Promise<DocsHarness> {
	const harness = await stubDocs(page, script);
	await signInAndVisit(page, fixture, '/docs/trash', { scenario: {} });
	return harness;
}

type SeenRequest = { method: string; path: string; search: string; body: string | null };

/**
 * What the browser itself sent under `/api/plugins/docs` **for the page loaded at `path`**, oldest first — armed on
 * that document's **response**, because `hardVisit` warms the browser with the app home and that warm-up page runs
 * its own docs reads until the target document is answered (`suites/lane-c/docs-home-ui.spec.ts`'s header, run 5's
 * trace). What the warm-up page asked is collected in `before` so a case can print it instead of mixing page loads.
 */
function docsRequestsSeen(page: Page, path: string, before: SeenRequest[] = []): SeenRequest[] {
	const seen: SeenRequest[] = [];
	let armed = false;
	const entryOf = (request: {
		method: () => string;
		url: () => string;
		postData: () => string | null;
	}): SeenRequest => ({
		method: request.method(),
		path: new URL(request.url()).pathname,
		search: new URL(request.url()).search,
		body: request.postData()
	});
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
		if (!(url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(DOCS_PREFIX))) return;
		(armed ? seen : before).push(entryOf(request));
	});
	return seen;
}

const shapeOf = (calls: SeenRequest[] | ServedCall[]): string[] =>
	calls.map((call) => `${call.method} ${call.path}${call.search}`);

/**
 * React's dev-mode store warning, not this page's (`suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`).
 */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `core/components/common/dev-error-toaster.tsx:16-20` prints a developer-only toast for every failed query or mutation in dev. */
const DEV_ERROR_TOAST = ['Query failed', 'Mutation failed', 'Caught error'];

/**
 * The client's own line for a refusal this file armed. It writes the **relative** url — `/plugins/docs/…`, no `/api`
 * and no origin — in two spellings: `core/services/logs/logger-adapter.service.ts:196` for a 403
 * (`🚨 CRITICAL: HTTP 403 Forbidden - DELETE <url> - Permission Denied`) and `:198` for every other status
 * (`HTTP Error: DELETE <url> 500`). Excused only when the line names both the url armed and its status.
 */
const armedRefusal = (line: string, verb: string, appUrl: string, status: number): boolean =>
	line.includes('[HttpClient]') &&
	line.includes(verb + ' ' + appUrl) &&
	(line.includes(`HTTP Error: ${verb} ${appUrl} ${status}`) || line.includes(`🚨 CRITICAL: HTTP ${status} `));

const consoleFindings = (shield: Shield, armed: { verb: string; url: string; status: number }[] = []): string[] =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((arm) => armedRefusal(line, arm.verb, arm.url, arm.status)));

/** The browser's own rendering of a served `archivedAt` (`docs-trash.tsx:26`); the ISO is passed in, never closed over. */
const browserDate = (page: Page, iso: string): Promise<string> =>
	page.evaluate(
		(value) =>
			new Intl.DateTimeFormat(document.documentElement.lang, { dateStyle: 'medium', timeStyle: 'short' }).format(
				new Date(value)
			),
		iso
	);

/** What this device remembers as its Docs Recent list: `docs:recent:<organizationId>`, a JSON array of page ids
 *  (`core/lib/utils/docs-recent.ts:14`, `:37-40`). The key is passed in, never closed over. */
const recentOf = (page: Page, key: string): Promise<string[]> =>
	page.evaluate((name) => JSON.parse(window.localStorage.getItem(name) ?? '[]') as string[], key);

/** Seeds that list the way `rememberRecent` writes it, newest first (`docs-recent.ts:42-46`). */
const seedRecent = (page: Page, key: string, ids: string[]): Promise<void> =>
	page.evaluate(([name, value]) => window.localStorage.setItem(name, value), [key, JSON.stringify(ids)]);

/** The Docs pane: the last of the three `<main>` elements the page mounts (`suites/lane-c/docs-home-ui.spec.ts`'s header). */
const docsPane = (page: Page) => page.locator('main').last();
/** A trash row: the pane's own `<li>`, named by the title the row prints (`docs-trash.tsx:62-78`). */
const trashRow = (page: Page, name: string) => docsPane(page).locator('li').filter({ hasText: name });
const rowTitle = (page: Page, name: string) => trashRow(page, name).locator('p').first();
const rowDateLine = (page: Page, name: string) => trashRow(page, name).locator('p').nth(1);
const rowButton = (page: Page, name: string, label: string) =>
	trashRow(page, name).getByRole('button', { name: label, exact: true });
/** The confirmation dialog's own parts, by the `data-slot` the component writes (`core/components/common/alert-dialog.tsx:71-140`). */
const dialogBox = (page: Page) => page.locator('[data-slot="alert-dialog-content"]');
const dialogTitle = (page: Page) => page.locator('[data-slot="alert-dialog-title"]');
const dialogDescription = (page: Page) => page.locator('[data-slot="alert-dialog-description"]');
const dialogAction = (page: Page) => page.locator('[data-slot="alert-dialog-action"]');
const dialogCancel = (page: Page) => page.locator('[data-slot="alert-dialog-cancel"]');
const loadErrorLine = (page: Page) => docsPane(page).getByText(T.LOAD_ERROR, { exact: true });
const retryButtons = (page: Page) => docsPane(page).getByRole('button', { name: T.RETRY, exact: true });
const toasts = (page: Page) => page.locator('[data-sonner-toast]');
/** The toasts a person is meant to read: the dev-only ones carry the copy above and a `Copy details` button. */
const userToasts = (texts: string[]): string[] =>
	texts.filter((text) => !DEV_ERROR_TOAST.some((label) => text.includes(label)) && !text.includes('Copy details'));

test.describe("lane-c · the trash's Delete forever, and its Cancel (docs-trash.tsx:75,83-96)", () => {
	test('A · the dialog names the page and says what leaves; Cancel sends nothing and the row stays', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const dialogCopy = filled('DELETE_FOREVER_TEXT', { title: NAMES[ALPHA] });
		const harness = await openTrash(page, fixture, { count: 1, trash: [row(ALPHA), row(BETA)], tree: [] });
		await expect(trashRow(page, NAMES[ALPHA])).toBeVisible({ timeout: 30_000 });
		await expect(trashRow(page, NAMES[BETA])).toHaveCount(1);
		await expect(
			page.getByText(dialogCopy, { exact: true }),
			'no dialog copy before the button is clicked'
		).toHaveCount(0);

		await expect(
			rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER),
			`every row carries docs.DELETE_FOREVER (${await rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER).count()})`
		).toBeVisible();
		await rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER).click({ timeout: 15_000 });

		await expect(dialogBox(page), 'AlertDialogConfirmation opens (docs-trash.tsx:83-96)').toHaveCount(1);
		await expect(dialogTitle(page), 'its title is docs.DELETE_FOREVER').toHaveText(T.DELETE_FOREVER);
		await expect(
			dialogDescription(page),
			`its description is docs.DELETE_FOREVER_TEXT with the row's own title in it`
		).toHaveText(filled('DELETE_FOREVER_TEXT', { title: NAMES[ALPHA] }));
		await expect(dialogAction(page), 'the confirm button repeats docs.DELETE_FOREVER').toHaveText(T.DELETE_FOREVER);
		await expect(dialogAction(page), 'and carries it as its aria-label too').toHaveAttribute(
			'aria-label',
			T.DELETE_FOREVER
		);
		await expect(dialogCancel(page), 'with docs.CANCEL beside it').toHaveText(T.CANCEL);
		await expect(
			page.getByText(dialogCopy, { exact: true }),
			'and the whole sentence is on the screen'
		).toHaveCount(1);
		await expect(
			dialogCancel(page),
			'and the focus lands on Cancel, not on the destructive button (alert-dialog.tsx:60-62,121-123)'
		).toBeFocused();
		measure('A dialog open', {
			roleAlertdialog: await page.getByRole('alertdialog').count(),
			roleDialog: await page.getByRole('dialog').count(),
			paneText: (await docsPane(page).innerText()).replace(/\s+/g, ' ').trim().slice(0, 200),
			// The row's own Delete forever is out of the accessibility tree while the dialog is open: page-wide there is
			// exactly one button with that name, and it is the dialog's.
			deleteForeverButtonsPageWide: await page
				.getByRole('button', { name: T.DELETE_FOREVER, exact: true })
				.count(),
			deleteForeverButtonsInPane: await docsPane(page)
				.getByRole('button', { name: T.DELETE_FOREVER, exact: true })
				.count(),
			dialogText: (await dialogBox(page).innerText()).replace(/\s+/g, ' ').trim()
		});
		await expect(
			page.getByRole('button', { name: T.DELETE_FOREVER, exact: true }),
			"while it is open the only Delete forever the browser can reach is the dialog's"
		).toHaveCount(1);

		const callsBefore = harness.calls.length;
		const trashReadsBefore = harness.reads('only').length;
		await expect(dialogCancel(page)).toBeEnabled();
		await dialogCancel(page).click({ timeout: 15_000 });
		// A quiet window, on purpose and short: it is the only way to prove Cancel sent **nothing** — no write, no
		// re-read, no toast. Nothing here is read out of it; every value below is asserted after it.
		await page.waitForTimeout(1_500);
		measure('A after Cancel', {
			callsAfterCancel: harness.calls
				.slice(callsBefore)
				.map((call) => `${call.method} ${call.path}${call.search}`),
			writes: harness.writes().map((call) => `${call.method} ${call.path}`),
			trashReads: harness.reads('only').length,
			trashReadsBefore,
			store: harness.trash().map((item) => item.id),
			liTexts: await docsPane(page)
				.locator('li')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())),
			toasts: await toasts(page).allInnerTexts(),
			mockDocs: (await mock.requests())
				.filter((call) => call.path.startsWith(DOCS_PREFIX))
				.map((call) => `${call.method} ${call.path}`),
			consoleErrors: shield.consoleErrors()
		});
		await expect(dialogBox(page), 'the dialog is gone').toHaveCount(0);
		await expect(trashRow(page, NAMES[ALPHA]), 'the row it was about is still in the trash').toHaveCount(1);
		await expect(trashRow(page, NAMES[BETA]), 'and so is the other one').toHaveCount(1);
		expect(
			harness.calls.slice(callsBefore).map((call) => `${call.method} ${call.path}${call.search}`),
			`Cancel asked for nothing at all (${JSON.stringify(harness.calls.slice(callsBefore))})`
		).toEqual([]);
		expect(harness.writes().length, 'no write of any kind was sent').toBe(0);
		expect(harness.reads('only').length, 'and the trash was not read again either').toBe(trashReadsBefore);
		await expect(
			page.getByText(dialogCopy, { exact: true }),
			'and nothing of the dialog is left on the page'
		).toHaveCount(0);
		await expect(page, 'and the person is still on the trash').toHaveURL(`${APP_ORIGIN}/docs/trash`);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(consoleFindings(shield), `no console error here: ${consoleFindings(shield).join(' | ')}`).toEqual([]);
	});

	test('B · confirming sends one DELETE with strategy=subtree; the row leaves and nothing is announced', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const warmUp: SeenRequest[] = [];
		const requests = docsRequestsSeen(page, '/docs/trash', warmUp);
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [row(ALPHA), row(BETA)],
			tree: [row(TREE_PAGE, { archivedAt: null })],
			// This file's stub holds the answer (not the request) so the row's busy state can be seen at all.
			deleteAnswerDelayMs: 1_200
		});
		await expect(trashRow(page, NAMES[ALPHA])).toBeVisible({ timeout: 30_000 });

		await rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER).click({ timeout: 15_000 });
		await expect(dialogAction(page)).toHaveCount(1);
		const trashReadsBefore = harness.reads('only').length;
		await dialogAction(page).click({ timeout: 15_000 });

		// The dialog is already closed by the click (its button is Base UI's Close), so the busy state shows on the row:
		// both of its buttons are disabled while the write is in flight (docs-trash.tsx:72,75 with busyId at :25,28-35).
		await expect(rowButton(page, NAMES[ALPHA], T.RESTORE), 'the row is busy while the delete runs').toBeDisabled({
			timeout: 5_000
		});
		await expect(rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER), 'both buttons').toBeDisabled({ timeout: 5_000 });
		await expect.poll(() => harness.writes().length, { timeout: 30_000 }).toBe(1);

		const deleted = harness.writes()[0];
		expect(
			`${deleted.method} ${deleted.path}${deleted.search}`,
			`one write, exactly this one (${deleted.method} ${deleted.path}${deleted.search})`
		).toBe(`DELETE ${DOCS_BASE}/${ALPHA}${deleteSearch(fixture)}`);
		expect(
			deleted.body,
			'docsService.remove sends no body; the scope and the strategy ride on the query'
		).toBeNull();
		measure('B delete', {
			write: `${deleted.method} ${deleted.path}${deleted.search} body=${JSON.stringify(deleted.body)}`,
			storeAfterTheWrite: harness.trash().map((item) => item.id),
			armedConsoleUrl: loggedUrl(deleted.path, deleted.search),
			warmUpAsks: shapeOf(warmUp),
			seenAsks: shapeOf(requests)
		});

		await expect.poll(() => harness.reads('only').length, { timeout: 30_000 }).toBeGreaterThan(trashReadsBefore);
		await expect(dialogBox(page), 'the dialog was already closed by the confirm click').toHaveCount(0);
		await expect(trashRow(page, NAMES[ALPHA]), 'the deleted page is out of the list').toHaveCount(0);
		await expect(trashRow(page, NAMES[BETA]), 'and the other page is still there').toHaveCount(1);
		await expect(trashRow(page, NAMES[BETA]).locator('p').first(), 'with its own title').toHaveText(NAMES[BETA]);
		await expect(
			docsPane(page).locator('li'),
			`one row is left in the pane (${await docsPane(page).locator('li').count()})`
		).toHaveCount(1);
		await expect(
			toasts(page),
			`and a delete that worked says nothing: the pane says ${await docsPane(page)
				.innerText()
				.then((text) => text.replace(/\s+/g, ' ').trim().slice(0, 200))}`
		).toHaveCount(0);
		expect(
			harness.reads('only').map((call) => call.search),
			`every trash read this page made asked the identical query, the one after the write included (${JSON.stringify(
				harness.reads('only').map((call) => call.search)
			)})`
		).toEqual(harness.reads('only').map(() => harness.reads('only')[0].search));
		expect(
			(await mock.requests())
				.filter(
					(call) => call.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(call.method)
				)
				.map((call) => `${call.method} ${call.path}`),
			'the mock was never asked to delete anything: this file answered it'
		).toEqual([]);
		expect(
			requests.filter((call) => call.method === 'DELETE').length,
			'the browser sent the DELETE once, not retried'
		).toBe(1);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(
			consoleFindings(shield),
			`no console error for a delete that worked: ${consoleFindings(shield).join(' | ')}`
		).toEqual([]);
	});
});

test.describe('lane-c · what a delete leaves behind (docs-page.tsx:437-448, docs-recent.ts)', () => {
	test('C · an accepted delete forgets the page on this device; a refused one forgets nothing', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const recentKey = `docs:recent:${fixture.ids.organizationA}`; // core/lib/utils/docs-recent.ts:14
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [row(ALPHA), row(BETA)],
			tree: [],
			refuseDelete: { [BETA]: REFUSAL_500 }
		});
		await expect(trashRow(page, NAMES[ALPHA])).toBeVisible({ timeout: 30_000 });
		// The device remembering both pages, in the shape `rememberRecent` writes (`docs-recent.ts:42-46`). Seeded **after**
		// `hardVisit`, which clears storage (`playwright/helpers.ts:422-427`); nothing on this page writes the key by
		// itself — `recentOf` only reads it (`core/hooks/docs/use-docs-recent.ts:29-36`).
		await seedRecent(page, recentKey, [BETA, ALPHA]);
		await expect.poll(() => recentOf(page, recentKey), { timeout: 15_000 }).toEqual([BETA, ALPHA]);

		await rowButton(page, NAMES[ALPHA], T.DELETE_FOREVER).click({ timeout: 15_000 });
		await expect(dialogAction(page)).toHaveCount(1);
		await dialogAction(page).click({ timeout: 15_000 });
		await expect.poll(() => harness.writes().length, { timeout: 30_000 }).toBe(1);
		// `forget(page.id)` runs only after `await actions.deletePage` resolved (docs-page.tsx:441-443).
		await expect.poll(() => recentOf(page, recentKey), { timeout: 30_000 }).toEqual([BETA]);
		measure('C recent, after the accepted delete', {
			write: shapeOf(harness.writes()),
			recentAfter: await recentOf(page, recentKey),
			seeded: [BETA, ALPHA],
			store: harness.trash().map((item) => item.id)
		});
		await expect(trashRow(page, NAMES[ALPHA]), 'the deleted page is out of the list').toHaveCount(0);

		await rowButton(page, NAMES[BETA], T.DELETE_FOREVER).click({ timeout: 15_000 });
		await expect(dialogAction(page)).toHaveCount(1);
		await dialogAction(page).click({ timeout: 15_000 });
		await expect(toasts(page).first()).toBeVisible({ timeout: 10_000 });
		await expect.poll(() => harness.writes().length, { timeout: 30_000 }).toBe(2);
		measure('C recent, after the refused delete', {
			toasts: userToasts(await toasts(page).allInnerTexts()),
			recentAfter: await recentOf(page, recentKey),
			store: harness.trash().map((item) => item.id)
		});
		await expect.poll(() => recentOf(page, recentKey), { timeout: 30_000 }).toEqual([BETA]);
		await expect(
			trashRow(page, NAMES[BETA]),
			'and the page it refused to delete is still there, remembered and listed'
		).toHaveCount(1);
		expect(
			await recentOf(page, recentKey),
			'a refused delete forgot nothing (forget runs after the write, docs-page.tsx:443)'
		).toEqual([BETA]);
		expect(
			harness.writes().map((call) => `${call.method} ${call.path}`),
			`two writes, one per page (${JSON.stringify(harness.writes().map((call) => `${call.method} ${call.path}`))})`
		).toEqual([`DELETE ${DOCS_BASE}/${ALPHA}`, `DELETE ${DOCS_BASE}/${BETA}`]);
		await page.mouse.move(2, 2);
		await expect(toasts(page), 'the error toast closes on its own').toHaveCount(0, { timeout: 30_000 });
		expect(
			(await mock.requests())
				.filter(
					(call) => call.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(call.method)
				)
				.map((call) => `${call.method} ${call.path}`),
			'the mock was asked for neither delete'
		).toEqual([]);
		expect(
			consoleFindings(shield, [
				{ verb: 'DELETE', url: loggedUrl(`${DOCS_BASE}/${BETA}`, deleteSearch(fixture)), status: 500 }
			]),
			`only the armed 500 reports itself in the console: ${consoleFindings(shield).join(' | ')}`
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · a family in the trash (docs-trash.tsx:61-81, docs.service.ts:141-144)', () => {
	test('D · four trashed pages, three of them a family: their rows, and one DELETE of the parent', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [
				row(ROOT),
				row(BRANCH, { parentId: ROOT }),
				row(TWIG, { parentId: BRANCH }),
				row(ASIDE, { archivedAt: dayIso(-3) })
			],
			tree: []
		});
		await expect(docsPane(page).locator('li'), 'four rows').toHaveCount(4, { timeout: 30_000 });

		const titles = await docsPane(page)
			.locator('li')
			.evaluateAll((nodes) => nodes.map((node) => (node.querySelector('p')?.textContent ?? '').trim()));
		const rowTexts = await docsPane(page)
			.locator('li')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		measure('D rows', { titles, rowTexts, parentIdOf: { [BRANCH]: ROOT, [TWIG]: BRANCH } });
		expect(
			titles,
			`the trash prints the family as four separate rows, newest first with ties broken by id — the page re-sorts ` +
				`with sortByUpdated (docs-trash.tsx:79 with core/lib/utils/docs-tree.ts:215-217, the rule its unit test names ` +
				`as "sorts by the newest change first", core/lib/utils/docs-tree.test.ts:135-138), not in the order the list ` +
				`came back in (${JSON.stringify(titles)})`
		).toEqual([NAMES[BRANCH], NAMES[ROOT], NAMES[TWIG], NAMES[ASIDE]]);
		for (const name of [NAMES[ROOT], NAMES[BRANCH], NAMES[TWIG], NAMES[ASIDE]]) {
			await expect(rowButton(page, name, T.RESTORE), `every row can be restored (${name})`).toHaveCount(1);
			await expect(rowButton(page, name, T.DELETE_FOREVER), `and deleted for good (${name})`).toHaveCount(1);
		}

		await rowButton(page, NAMES[ROOT], T.DELETE_FOREVER).click({ timeout: 15_000 });
		await expect(dialogBox(page)).toHaveCount(1);
		await expect(
			dialogDescription(page),
			'the dialog about the parent names the parent and says its sub-pages leave too'
		).toHaveText(filled('DELETE_FOREVER_TEXT', { title: NAMES[ROOT] }));
		const trashReadsBefore = harness.reads('only').length;
		await dialogAction(page).click({ timeout: 15_000 });
		await expect.poll(() => harness.writes().length, { timeout: 30_000 }).toBe(1);

		const [write] = harness.writes();
		expect(
			`${write.method} ${write.path}${write.search}`,
			`one write for the whole family: the strategy rides on the query (docs.service.ts:141-144)`
		).toBe(`DELETE ${DOCS_BASE}/${ROOT}${deleteSearch(fixture, 'subtree')}`);
		expect(write.body, 'and nothing in its body').toBeNull();
		measure('D subtree delete', {
			write: `${write.method} ${write.path}${write.search}`,
			storeAnsweredAfter: harness.trash().map((item) => item.id),
			trashReadsBefore,
			trashReadSearches: harness.reads('only').map((call) => call.search)
		});

		// The list read that followed answers no member of the family: the platform was asked for `strategy=subtree` and
		// this file's store answers it by taking the parent and every page under it (stubDocs' own DELETE branch).
		await expect.poll(() => harness.trash().map((item) => item.id), { timeout: 30_000 }).toEqual([ASIDE]);
		await expect.poll(() => harness.reads('only').length, { timeout: 30_000 }).toBeGreaterThan(trashReadsBefore);
		await expect(docsPane(page).locator('li'), 'the pane shows one row left').toHaveCount(1);
		await expect(rowTitle(page, NAMES[ASIDE])).toHaveText(NAMES[ASIDE]);
		for (const name of [NAMES[ROOT], NAMES[BRANCH], NAMES[TWIG]]) {
			await expect(trashRow(page, name), `${name} left with its parent`).toHaveCount(0);
		}
		await expect(toasts(page), 'a subtree delete that worked is silent').toHaveCount(0);
		expect(
			(await mock.requests())
				.filter(
					(call) => call.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(call.method)
				)
				.map((call) => `${call.method} ${call.path}`),
			'the mock was never asked to delete anything'
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(
			consoleFindings(shield),
			`nothing reported itself in the console: ${consoleFindings(shield).join(' | ')}`
		).toEqual([]);
	});
});

test.describe('lane-c · a refusal the person can read (docs-page.tsx:170-176,441-447)', () => {
	test('E · a refused delete (403 with a message, then 500): its own words, the row stays, nothing re-read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [row(LOCKED), row(BLINKED)],
			tree: [],
			refuseDelete: { [LOCKED]: REFUSAL_403, [BLINKED]: REFUSAL_500 }
		});
		await expect(trashRow(page, NAMES[LOCKED])).toBeVisible({ timeout: 30_000 });
		await expect(trashRow(page, NAMES[BLINKED])).toHaveCount(1);
		const trashReadsBefore = harness.reads('only').length;
		const armed: { verb: string; url: string; status: number }[] = [];

		for (const [name, id, refusal] of [
			[NAMES[LOCKED], LOCKED, REFUSAL_403],
			[NAMES[BLINKED], BLINKED, REFUSAL_500]
		] as const) {
			await rowButton(page, name, T.DELETE_FOREVER).click({ timeout: 15_000 });
			await expect(dialogBox(page)).toHaveCount(1);
			const writesBefore = harness.writes().length;
			await dialogAction(page).click({ timeout: 15_000 });
			await expect.poll(() => harness.writes().length, { timeout: 30_000 }).toBe(writesBefore + 1);
			await expect(toasts(page).first(), 'the refusal is announced').toBeVisible({ timeout: 10_000 });
			const toastTexts = userToasts(await toasts(page).allInnerTexts());
			const search = harness.writes()[writesBefore].search;
			armed.push({ verb: 'DELETE', url: loggedUrl(`${DOCS_BASE}/${id}`, search), status: refusal.status });
			measure(`E ${name} refused ${refusal.status}`, {
				write: `${harness.writes()[writesBefore].method} ${harness.writes()[writesBefore].path}${search}`,
				servedBody: { statusCode: refusal.status, message: refusal.message },
				toastTexts,
				deleteErrorCopyShown: await page.getByText(T.DELETE_ERROR, { exact: true }).count(),
				dialogStillOpen: await dialogBox(page).count(),
				store: harness.trash().map((item) => item.id),
				consoleErrors: shield.consoleErrors()
			});
			expect(
				toastTexts,
				`the person is told the platform's own words, not docs.DELETE_ERROR (${JSON.stringify(toastTexts)})`
			).toEqual([refusal.message]);
			await expect(
				page.getByText(T.DELETE_ERROR, { exact: true }),
				`docs.DELETE_ERROR stays unused here (docs-page.tsx:171-173 keeps it only for a failure that carries no message)`
			).toHaveCount(0);
			await expect(dialogBox(page), 'the dialog closes by itself once the refusal landed').toHaveCount(0, {
				timeout: 20_000
			});
			await expect(trashRow(page, name), 'the page it refused to delete is still listed').toHaveCount(1);
			await expect(rowButton(page, name, T.RESTORE), 'and its buttons work again').toBeEnabled();
			await expect(rowButton(page, name, T.DELETE_FOREVER), 'both of them').toBeEnabled();
			await page.mouse.move(2, 2);
			await expect(
				toasts(page),
				'the toast closes on its own (the pointer was parked away from it first)'
			).toHaveCount(0, { timeout: 30_000 });
		}

		measure('E after both refusals', {
			writes: harness.writes().map((call) => `${call.method} ${call.path}${call.search}`),
			trashReads: harness.reads('only').length,
			trashReadsBefore,
			store: harness.trash().map((item) => item.id),
			armed
		});
		expect(
			harness.writes().map((call) => `${call.method} ${call.path}`),
			`two refused deletes, not retried (${JSON.stringify(harness.writes().map((call) => call.path))})`
		).toEqual([`DELETE ${DOCS_BASE}/${LOCKED}`, `DELETE ${DOCS_BASE}/${BLINKED}`]);
		// `deletePage` awaits the remove before it invalidates anything (`use-docs-actions.ts:218-224`), so a refusal
		// that never resolved leaves the trash query exactly as it was: no re-read, and the row it refused to take.
		expect(
			harness.reads('only').length,
			`the trash was read ${harness.reads('only').length} time(s) across both refusals (${trashReadsBefore} before them)`
		).toBe(trashReadsBefore);
		expect(
			harness.trash().map((item) => item.id),
			"and this file's store still holds both pages"
		).toEqual([LOCKED, BLINKED]);
		expect(
			(await mock.requests())
				.filter(
					(call) => call.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(call.method)
				)
				.map((call) => `${call.method} ${call.path}`),
			'neither delete reached the mock'
		).toEqual([]);
		expect(
			consoleFindings(shield, armed),
			`only the two armed refusals report themselves (${consoleFindings(shield).join(' | ')})`
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});

	test("F · a refused Restore: the page stays in the trash, and its words are the platform's", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [row(STUCK)],
			tree: [row(TREE_PAGE, { archivedAt: null })],
			refuseUnarchive: { [STUCK]: REFUSAL_RESTORE }
		});
		await expect(trashRow(page, NAMES[STUCK])).toBeVisible({ timeout: 30_000 });
		const trashReadsBefore = harness.reads('only').length;

		await rowButton(page, NAMES[STUCK], T.RESTORE).click({ timeout: 15_000 });
		await expect(toasts(page).first()).toBeVisible({ timeout: 10_000 });
		const toastTexts = userToasts(await toasts(page).allInnerTexts());
		const writes = harness.writes();
		measure('F restore refused', {
			writes: writes.map((call) => `${call.method} ${call.path}${call.search} body=${JSON.stringify(call.body)}`),
			toastTexts,
			restoreErrorCopyShown: await page.getByText(T.RESTORE_ERROR, { exact: true }).count(),
			store: harness.trash().map((item) => item.id),
			treeRows: await page
				.locator('a[data-docs-row]')
				.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-docs-row'))),
			consoleErrors: shield.consoleErrors()
		});
		expect(
			writes.map((call) => `${call.method} ${call.path}`),
			`the restore went out once (${JSON.stringify(writes.map((call) => `${call.method} ${call.path}`))})`
		).toEqual([`POST ${DOCS_BASE}/${STUCK}/unarchive`]);
		expect(
			JSON.parse(writes[0].body ?? '{}') as Record<string, unknown>,
			'docsService.unarchive posts nothing of its own; the tenant and organization come from APIService.post'
		).toEqual({ tenantId: fixture.ids.tenantA, organizationId: fixture.ids.organizationA });
		expect(
			toastTexts,
			`and what they are told is the refusal itself, not docs.RESTORE_ERROR (${JSON.stringify(toastTexts)})`
		).toEqual([REFUSAL_RESTORE.message]);
		await expect(page.getByText(T.RESTORE_ERROR, { exact: true })).toHaveCount(0);
		await expect(
			page.getByText(filled('RESTORED', { title: NAMES[STUCK] }), { exact: true }),
			'and nothing claims the page came back'
		).toHaveCount(0);
		await expect(trashRow(page, NAMES[STUCK]), 'the page is still in the trash').toHaveCount(1);
		await expect(rowButton(page, NAMES[STUCK], T.RESTORE), 'and Restore is offered again').toBeEnabled();
		await expect(
			page.locator(`a[data-docs-row="${STUCK}"]`),
			'and it did not appear in the tree beside the trash'
		).toHaveCount(0);
		await expect(
			page.locator(`a[data-docs-row="${TREE_PAGE}"]`),
			'while the tree pane still shows its own page'
		).toHaveCount(1);
		await page.mouse.move(2, 2);
		await expect(toasts(page)).toHaveCount(0, { timeout: 30_000 });
		expect(
			harness.reads('only').length,
			`a refused restore asked the trash again ${harness.reads('only').length - trashReadsBefore} extra time(s)`
		).toBe(trashReadsBefore);
		expect(
			(await mock.requests())
				.filter(
					(call) => call.path.startsWith(DOCS_PREFIX) && !['GET', 'OPTIONS', 'HEAD'].includes(call.method)
				)
				.map((call) => `${call.method} ${call.path}`),
			'the mock was never asked to restore anything'
		).toEqual([]);
		expect(
			consoleFindings(shield, [
				{ verb: 'POST', url: loggedUrl(`${DOCS_BASE}/${STUCK}/unarchive`, ''), status: 500 }
			]),
			`only the armed refusal reports itself (${consoleFindings(shield).join(' | ')})`
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · the trash read itself failing (docs-trash.tsx:47-55, use-docs-tree.ts:70-81)', () => {
	test('G · the list read refused 500: its own line, one Retry, and the served success after it', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const harness = await openTrash(page, fixture, {
			count: 1,
			trash: [row(ALPHA), row(BETA)],
			tree: [row(TREE_PAGE, { archivedAt: null })],
			refuseTrashRead: REFUSAL_TRASH_READ
		});

		await expect(loadErrorLine(page), 'docs.LOAD_ERROR, printed by the trash itself').toBeVisible({
			timeout: 30_000
		});
		await expect(docsPane(page).locator('li'), 'no rows').toHaveCount(0);
		await expect(
			docsPane(page).getByText(T.TRASH_EMPTY_TITLE, { exact: true }),
			'and not the empty state either: an outage is not an empty trash (docs-trash.tsx:56)'
		).toHaveCount(0);
		await expect(
			docsPane(page).getByText(T.LOADING, { exact: true }),
			'and no loading line is left standing'
		).toHaveCount(0);
		await expect(retryButtons(page), 'one Retry, in the pane').toHaveCount(1);
		await expect(
			page.getByRole('button', { name: T.RETRY, exact: true }),
			'and it is the only Retry on the page: the tree read beside the trash answered'
		).toHaveCount(1);
		await expect(
			page.getByRole('alert').filter({ hasText: T.LOAD_ERROR }),
			"the error is a plain <p> and a Button, not an alert (`docs-trash.tsx:48-55`); the page's one alert belongs to the shell"
		).toHaveCount(0);
		measure('G error state', {
			paneText: (await docsPane(page).innerText()).replace(/\s+/g, ' ').trim().slice(0, 300),
			alertTexts: await page.getByRole('alert').allInnerTexts(),
			toastTexts: await toasts(page).allInnerTexts(),
			userToastTexts: userToasts(await toasts(page).allInnerTexts()),
			trashReads: harness.reads('only').length,
			trashReadSearches: harness.reads('only').map((call) => call.search),
			treeReads: harness.reads('exclude').length,
			consoleErrors: shield.consoleErrors()
		});
		expect(
			userToasts(await toasts(page).allInnerTexts()),
			'a failed list read is not announced in a toast — only the dev-only one, which this file prints'
		).toEqual([]);

		const readsBefore = harness.reads('only').length;
		await retryButtons(page).first().click({ timeout: 15_000 });
		// `expect.poll` on the recorded calls, and no exact number: how often a refused read is asked again is not what
		// this case is about (`use-docs-tree.ts:77` sets `retry: false`, and the Retry button is `query.refetch`).
		await expect.poll(() => harness.reads('only').length, { timeout: 30_000 }).toBeGreaterThan(readsBefore);
		await expect(trashRow(page, NAMES[ALPHA]), 'the served success after Retry shows both rows').toBeVisible({
			timeout: 30_000
		});
		await expect(trashRow(page, NAMES[BETA])).toHaveCount(1);
		await expect(loadErrorLine(page), 'the error line is gone').toHaveCount(0);
		await expect(retryButtons(page), 'and so is its Retry').toHaveCount(0);
		measure('G after Retry', {
			trashReadSearches: harness.reads('only').map((call) => call.search),
			readsBefore,
			liTexts: await docsPane(page)
				.locator('li')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())),
			toastTexts: await toasts(page).allInnerTexts(),
			consoleErrors: shield.consoleErrors()
		});
		expect(
			harness.reads('only').map((call) => call.search),
			`Retry asked the identical query again (${JSON.stringify(harness.reads('only').map((call) => call.search))})`
		).toEqual(harness.reads('only').map(() => harness.reads('only')[0].search));
		await page.mouse.move(2, 2);
		await expect(toasts(page), 'the dev-only toast closes on its own').toHaveCount(0, { timeout: 30_000 });
		const mockDocs = (await mock.requests()).filter((call) => call.path.startsWith(DOCS_PREFIX));
		measure('G mock log', { mockDocs: mockDocs.map((call) => `${call.method} ${call.path}`) });
		expect(
			mockDocs.filter((call) => call.path === DOCS_BASE).map((call) => `${call.method} ${call.path}`),
			'the refused list read never reached the mock: this file answered it, and the mock logged only the reads it ' +
				"still answers itself (spaces, `docs-home-ui.spec.ts`'s header)"
		).toEqual([]);
		expect(
			mockDocs.filter((call) => call.status >= 400).map((call) => `${call.method} ${call.path} ${call.status}`),
			'and the mock refused nothing here'
		).toEqual([]);
		expect(
			consoleFindings(shield, [
				{
					verb: 'GET',
					url: loggedUrl(DOCS_BASE, harness.reads('only')[0].search),
					status: REFUSAL_TRASH_READ.status
				}
			]),
			`only the armed 500 on the list path reports itself (${consoleFindings(shield).join(' | ')})`
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · how long a page has been in the trash (docs-trash.tsx:26,69)', () => {
	test('H · served dates relative to now print as the browser reads them, never as "today"', async ({
		page,
		fixture,
		shield
	}) => {
		const sameDay = dayIso(0);
		const oneDayBack = dayIso(-1);
		const monthBack = dayIso(-31);
		await openTrash(page, fixture, {
			count: 1,
			trash: [
				row(TODAYS, { archivedAt: sameDay }),
				row(YESTERDAYS, { archivedAt: oneDayBack }),
				row(LONG_AGO, { archivedAt: monthBack }),
				row(UNDATED, { archivedAt: null })
			],
			tree: []
		});
		await expect(trashRow(page, NAMES[TODAYS])).toBeVisible({ timeout: 30_000 });

		const served: Record<string, string> = { [TODAYS]: sameDay, [YESTERDAYS]: oneDayBack, [LONG_AGO]: monthBack };
		const rendered: Record<string, string> = {};
		for (const [id, iso] of Object.entries(served)) {
			// The expected string is the browser's own formatting of the same ISO (`docs-trash.tsx:26`), computed in the
			// page with the ISO passed in — no time zone and no calendar day is named from Node, and today's date is never
			// written down.
			rendered[id] = await browserDate(page, iso);
			await expect(
				rowDateLine(page, NAMES[id]),
				`docs.TRASHED_AT with the served ${iso} rendered by the browser itself`
			).toHaveText(filled('TRASHED_AT', { date: rendered[id] }));
		}
		await expect(
			rowDateLine(page, NAMES[UNDATED]),
			'a row whose served archivedAt is null prints docs.IN_TRASH and no date (docs-trash.tsx:69)'
		).toHaveText(T.IN_TRASH);
		measure('H dates', {
			htmlLang: await page.evaluate(() => document.documentElement.lang),
			served,
			renderedByBrowser: rendered,
			lines: await docsPane(page)
				.locator('li p')
				.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()))
		});
		expect(
			[...new Set(Object.values(rendered))].length,
			`the three served days printed as three different lines (${JSON.stringify(rendered)})`
		).toBe(3);
		await expect(
			docsPane(page).getByText(/today|yesterday|last month|month ago|days? ago/i),
			'nothing in the pane words it relatively: the row prints the absolute date the browser made of the served stamp'
		).toHaveCount(0);
		await expect(docsPane(page).locator('li')).toHaveCount(4);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(consoleFindings(shield), `nothing was reported: ${consoleFindings(shield).join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · more pages than one read holds (docs.service.ts:57-76)', () => {
	test('I · 101 trashed pages: two reads (skip=1, then skip=2) and all 101 rows at once, with no paging control', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const many = Array.from({ length: LIST_PAGE_SIZE + 1 }, (_unused, index) => {
			const id = `pw-many-${String(index).padStart(3, '0')}`;
			return row(id, {
				name: `Many ${String(index).padStart(3, '0')}`,
				archivedAt: dayIso(-2),
				updatedAt: dayIso(-2)
			});
		});
		const harness = await openTrash(page, fixture, { count: 1, trash: many, tree: [] });

		// `listAll` stops when a read came back shorter than `take`, when it has read `total`, or at the tree's cap: 101
		// rows is exactly one full page plus one, so the second read is the last one it sends.
		await expect.poll(() => harness.reads('only').length, { timeout: 30_000 }).toBe(2);
		const searches = harness.reads('only').map((call) => call.search);
		expect(
			searches.map((search) => new URLSearchParams(search).get('skip')),
			`skip is a page number counted from 1, not a row offset (${JSON.stringify(
				searches.map((search) => new URLSearchParams(search).get('skip'))
			)})`
		).toEqual(['1', '2']);
		expect(
			searches.map((search) => new URLSearchParams(search).get('take')),
			`both ask for the same page size, DOCS_LIST_PAGE_SIZE = ${LIST_PAGE_SIZE}`
		).toEqual([String(LIST_PAGE_SIZE), String(LIST_PAGE_SIZE)]);
		expect(
			searches[1].replace('skip=2', 'skip=1'),
			'the second read differs from the first by nothing but the page number'
		).toBe(searches[0]);

		await expect(docsPane(page).locator('li'), 'and the person is shown every row at once').toHaveCount(
			LIST_PAGE_SIZE + 1
		);
		const paneButtons = await docsPane(page)
			.getByRole('button')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		measure('I paging', {
			searches,
			liCount: await docsPane(page).locator('li').count(),
			paneButtonNames: [...new Set(paneButtons)],
			firstTitle: await rowTitle(page, 'Many 000').innerText(),
			lastTitle: await rowTitle(page, 'Many 100').innerText(),
			emptyState: await docsPane(page).getByText(T.TRASH_EMPTY_TITLE, { exact: true }).count()
		});
		expect(
			new Set(paneButtons),
			`the pane holds no paging control at all: its only buttons are the rows' own pair (${JSON.stringify([
				...new Set(paneButtons)
			])})`
		).toEqual(new Set([T.RESTORE, T.DELETE_FOREVER]));
		await expect(rowTitle(page, 'Many 000')).toHaveText('Many 000');
		await expect(rowTitle(page, 'Many 100')).toHaveText('Many 100');
		expect(harness.trash().length, 'this file served 101 pages, and every one of them was read').toBe(
			LIST_PAGE_SIZE + 1
		);
		expect(
			(await mock.requests())
				.filter((call) => call.path === DOCS_BASE)
				.map((call) => `${call.method} ${call.path}`),
			'neither read of the trash reached the mock'
		).toEqual([]);
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(consoleFindings(shield), `nothing was reported: ${consoleFindings(shield).join(' | ')}`).toEqual([]);
	});
});

test.describe('lane-c · a page with no name of its own (docs-tree.ts:219-223)', () => {
	test('J · a blank name reads as docs.UNTITLED, in the row and in the dialog about it', async ({
		page,
		fixture,
		shield
	}) => {
		// Only the blank name is served here: a row whose `name` is `null` prints the very same docs.UNTITLED title, and
		// two rows with the same printed title cannot be addressed by their text (`trashRow` finds a row by what it says).
		await openTrash(page, fixture, { count: 1, trash: [row(UNTITLED, { name: '   ' }), row(BETA)], tree: [] });
		await expect(docsPane(page).locator('li')).toHaveCount(2, { timeout: 30_000 });
		await expect(
			rowTitle(page, T.UNTITLED),
			'a row whose served name is spaces prints docs.UNTITLED — the rule its unit test names "reads a blank name as ' +
				'untitled" (core/lib/utils/docs-tree.test.ts:129-133), pageTitle at core/lib/utils/docs-tree.ts:219-223'
		).toHaveText(T.UNTITLED);

		await rowButton(page, T.UNTITLED, T.DELETE_FOREVER).click({ timeout: 15_000 });
		await expect(dialogBox(page)).toHaveCount(1);
		await expect(dialogDescription(page), 'the dialog about it names it the same way').toHaveText(
			filled('DELETE_FOREVER_TEXT', { title: T.UNTITLED })
		);
		await expect(
			page.getByText(filled('DELETE_FOREVER_TEXT', { title: T.UNTITLED }), { exact: true }),
			'as one whole sentence on the screen'
		).toHaveCount(1);
		await dialogCancel(page).click({ timeout: 15_000 });
		await expect(dialogBox(page)).toHaveCount(0);

		const titles = await docsPane(page)
			.locator('li')
			.evaluateAll((nodes) => nodes.map((node) => (node.querySelector('p')?.textContent ?? '').trim()));
		measure('J untitled', {
			blankNameTitle: await rowTitle(page, T.UNTITLED).innerText(),
			untitledCopiesPageWide: await page.getByText(T.UNTITLED, { exact: true }).count(),
			titlesOfEveryRow: titles,
			servedNames: { [UNTITLED]: '   (three spaces)', [BETA]: NAMES[BETA] }
		});
		expect(shield.pageErrors(), `the page threw: ${shield.pageErrors().join(' | ')}`).toEqual([]);
		expect(consoleFindings(shield), `nothing was reported: ${consoleFindings(shield).join(' | ')}`).toEqual([]);
	});
});
