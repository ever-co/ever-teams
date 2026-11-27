import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, overrideRuntimeEnv, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * The team task trash, `/team/tasks/trash`, driven in the browser on lane-a.
 *
 * WHAT THIS DRIVES
 * - `core/components/pages/task-trash/team-task-trash-page.tsx:18-53` through
 *   `app/[locale]/(main)/(teams)/team/tasks/trash/page.tsx` (`withAuthentication`): the breadcrumb (19-31), the page's
 *   own `<h1>` (36), the flag-off empty state (37-44), the no-team empty state (45-52) and
 *   `<TaskTrashList teamId={activeTeam.id} projectId={null} />` (53).
 * - `core/components/pages/task-trash/task-trash-list.tsx`: the status states unavailable (87-96), unscoped (97-106),
 *   forbidden (107-116), loading (142), error (143-152), empty / no-match (153-161); the hint (124), the search field
 *   (130-139), the rows (163-207), Load more (209-220) and the Delete forever question (222-236) as
 *   `core/components/common/alert-dialog-confirmation.tsx:33-66` builds it.
 * - `core/hooks/tasks/use-task-trash.ts`: `useInfiniteQuery` (62-83, `TASK_TRASH_PAGE_SIZE` 50, `retry: false`), the
 *   status mapping `trashStatusOf` (28-33), `restore` (114-127), `deleteForever` (134-149).
 * - `core/services/client/api/tasks/task-trash.service.ts`: `list` (56-79), `restore` (87-89), `deleteForever` (96-102).
 * - `core/lib/utils/task-trash.ts:19-24,27-44`: `trashDeleteFailureOf`, `trashedTaskPersonName`, `trashedTaskNumberOf`.
 *
 * WHAT IS REAL AND WHAT IS SERVED
 * Real: the lane's Next app on 3031, its auth and shell against the lane's mock on 3992, the hook, the services, the
 * components, the sonner toasts, the alert dialog, the log lines the app writes.
 * Served: every trash call — `GET /api/tasks/trash`, `PUT /api/tasks/<id>/recover`, `DELETE /api/tasks/<id>/trashed`
 * (and `/soft`, answered 599 to prove nothing asks for it). `serveTaskTrash` answers them on the **mock origin**,
 * because the mock has no handler for any of them; its catch-all answers an unknown read with an empty page, so an
 * unstubbed trash looks exactly like an empty trash (measured: with no stub the mock heard `GET /api/tasks/trash 200`
 * and the page showed "The trash is empty", probe-3 Q2 / probe-4 R8). The stub restates the mock's own CORS answer,
 * replies 204 to `OPTIONS`, and never calls `route.fetch()`.
 * Store-backed rule: the list answer is always the store the stub holds, so a successful write can be followed by a
 * re-read that no longer lists the task; a refused write changes nothing; only a 404 write with `platformMovedOn`
 * drops the id — a 404 on `/trashed` asserts that the platform no longer holds the task
 * (`task-trash.service.ts:91-95`), so the list answer after it has to agree.
 *
 * THE DEPLOYMENT FLAG
 * `NEXT_PUBLIC_TASK_TRASH_ENABLED` is a runtime public value read in the browser
 * (`core/lib/utils/comments-trash-flags.ts:23-25` through `core/services/client/env-config.ts` `readRuntimeEnv`).
 * This lane does not set it: the `<html data-ever-teams-runtime-env>` payload served here holds 52 keys and none of
 * them is that one (probe-3 Q1), and with the flip in place the payload still holds 52 keys while the injected global
 * carries `true` (probe-3 Q2). No lane-a spec may turn the feature on for the whole lane — the other specs in this
 * folder rely on it staying off — so every test below that needs it calls the shared
 * `overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_TRASH_ENABLED: 'true' })` (`playwright/helpers.ts:485`) before its
 * first visit, the way `suites/lane-c/automations-settings-ui.spec.ts:24-43` does. This file copies none of that
 * helper. Test 1 is the lane exactly as it is served.
 *
 * WHERE EVERY ASSERTED VALUE CAME FROM
 * Throwaway probe runs against this lane (`/e/Coding/.tmp/probe-tasktrash/`, config with no `webServer`):
 * `s3-lane-a-tasktrash-probe-1.log` (P1-P13), `-probe-3.log` (Q1-Q16), `-probe-4.log` (R1-R8), `-probe-5.log`
 * (S1-S4) and `-probe-6.log` (U1-U2). Every test here also prints its own `[lane-a task-trash] MEASURE …` line, so
 * each asserted value is in a log. Pinned there: the read shape
 * `?tenantId=…&organizationId=…&organizationTeamId=…&skip=0&take=50` and the search shape `…&search=42&skip=0&take=50`
 * and the second page `…&skip=50&take=50` (Q12, Q13), built from the fixture ids the shell's own scope cookies carry;
 * the write shape `?tenantId=…&organizationId=…` (R1, R2); `API-42` / `FIX-7` / `#11` / no key at all for the four
 * ways a task key arrives (Q3); the date text as `Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' })`
 * over a local-noon `deletedAt` (Q3); `Load more (50 of 55)` (Q12); `maxlength="200"` (Q13); 1 Trash-named link with
 * the flag off and 2 with it on (Q1, Q2, S4); the row-button busy pattern `[[disabled,disabled],[enabled,enabled]]`
 * and the question closing on Confirm (U1).
 *
 * FINDINGS (measured; the code that explains each one is named)
 * 1. A platform whose trash answers the list read with **400** is not treated as "this platform has no trash":
 *    `trashStatusOf` maps only 404 to `unavailable` and 403/401 to `forbidden` (`use-task-trash.ts:28-33`), so 400
 *    lands on the `LOAD_FAILED` error state with its Try again. 400 is precisely what `isAvailable` reads as "no
 *    trash" (`task-trash.service.ts:29-30,35-53`) — but that probe never runs from this page (finding 2), so a 400
 *    platform is shown here as a load failure.
 * 2. Nothing in this UI puts a task into the trash, with the mock as it is: `moveToTrash` (`task-trash.service.ts:82`)
 *    has no caller at all, and the only callers of `taskService.deleteTask` — which is what would try the soft delete
 *    and the availability probe (`task.service.ts:194`, the only `isAvailable` call site) — are
 *    `core/hooks/organizations/teams/use-delete-task.ts:39` and `use-team-tasks.ts:186`, and no component calls the
 *    `deleteTask` either hook returns (the hooks that import `useDeleteTask` use only its unassign helpers). So
 *    `DELETE /tasks/<id>/soft` and `GET /tasks/trash?…&take=1` are **not reachable from this page**; the stub answers `soft` with 599 and no test ever sees that answer (test 6 asserts no `/soft` shape).
 * 3. A restore the platform answers 404 for is reported as an ordinary failure ("The task was not restored. Try
 *    again.") and nothing is re-read: `restore` returns `false` before `refreshTaskLists` (`use-task-trash.ts:118-125`),
 *    so the row stays on screen although the 404 says the task is already back (probe-4 R3: one list read, both rows
 *    still drawn). The delete path is the opposite: 404 there is `not-in-trash`, the one refusal that re-reads
 *    (`use-task-trash.ts:141-142`), and the row disappears (R4).
 * 4. A 409 delete keeps everything — its own sentence, no re-read, the row and the platform's store untouched (R5).
 * 5. `[MEASURED, NOT INTENDED]` The Delete forever question closes the moment Confirm is clicked, so its busy shape
 *    (aria `Confirming…`, text `Processing...`, disabled — `alert-dialog-confirmation.tsx:38-42,57-60`) is never
 *    visible in the browser: `AlertDialogAction` closes the dialog and `task-trash-list.tsx:235`
 *    (`onOpenChange`) clears `deleting` at once, so `loading` (`task-trash-list.tsx:233`) has nothing left to mark.
 *    The row itself is still busy: its own Restore and Delete forever buttons are disabled while the delete runs and
 *    the other rows stay usable (probe-6 U1) — which is what `task-trash-list.test.tsx:107-129` ("its buttons and the
 *    confirmation are disabled") pins against a stubbed confirmation, `data-testid="confirm-delete"`, not the real one.
 * 6. The client's own log line is what a test has to excuse: `api.service.ts:439-474` hands the failure to
 *    `logger-adapter.service.ts:189-199`, which prints `🚨 CRITICAL: HTTP 403 Forbidden - <verb> <path+query> -
 *    Permission Denied` for a 403 and `HTTP Error: <verb> <path+query> <status>` for anything else — without the
 *    `/api` prefix, because the axios base already carries it, and keeping the query string. The excuse fragments
 *    below are exact substrings of those printed lines; anything unnamed fails the test.
 * 7. A failed list read raises **no** app toast: what appears is the dev-mode "DEV Query failed … Copy details" toast
 *    (`core/components/common/dev-error-toaster.tsx`, probe-3 Q16, probe-5 S3) beside the app's own `LOAD_FAILED`
 *    state with its `pages.unauthorized.TRY_AGAIN` action (`task-trash-list.tsx:143-152`). The toast assertions here
 *    filter that dev toast out by its "Copy details" action instead of ignoring it, and a failed read is only ever
 *    asserted as "asked again", never as a number of reads.
 * 8. Sonner toasts are short-lived: a successful restore's or delete's copy is there right after the action and gone
 *    seconds later (probe-4 R1/R2 read them empty at +5 s; probe-5 S2 caught them at +1.2 s), so every toast here is
 *    asserted right after the action that raises it.
 * 9. A write the platform accepts re-reads the trash exactly once more (R1/R2/U1: `GET`, `PUT|DELETE`, `GET`) because
 *    `refreshTaskLists` invalidates `tasks.all` and `taskViews.all` (`use-task-trash.ts:108-111`); that invalidation
 *    also refetches the shell's own task lists at the mock (`GET /api/tasks/team 200` twice, R1/R2) — none of the
 *    trash paths ever reaches the mock in these tests.
 * 10. `getByRole` cannot see the page while the question is open: with the dialog up the rows' Restore buttons count
 *     0 (R2), because the dialog makes the rest of the document inert. The row-button assertions that have to look
 *     at the rows use CSS locators.
 * 11. The shell draws two `<main>` elements (probe-3 Q1/Q3 `mains`), so nothing here scopes on `main`; the list is
 *     found under the page's own `<h1>`.
 * 12. `taskTrash.TITLE` is the same word in three places — the page's `<h1>`, the breadcrumb's last link and the
 *     sidebar item — so the off page holds that word twice as text (the `<h1>` and the breadcrumb link, printed
 *     by `s3-lane-a-tasktrash-1.log`) and no test here asserts that it
 *     is absent; test 1 pins one `<h1>` plus the copy that only the off state draws.
 *
 * NOT COVERED (and why)
 * - "Choose a team" (`taskTrash.NO_TEAM_TITLE`, `team-task-trash-page.tsx:45-52`) and the list's own `unscoped`
 *   branch (`task-trash-list.tsx:97-106`): the page mounts the list only when `activeTeam?.id` is set
 *   (`team-task-trash-page.tsx:53`), and with this lane's fixture the shell always has an active team — dropping the
 *   `auth-active-team` cookie and reloading left the page with no `<h1>`, no breadcrumb and no `<main>` at all
 *   (probe-3 Q15), i.e. the shell re-selects a team instead of rendering the no-team state. Not reachable through
 *   the UI with this fixture.
 * - Moving a task into the trash from the UI, and the availability probe (finding 2).
 * - The task drawer the Restore toast's "Open" action points at (the toast text carries it, measured `“…” is back Open`).
 * - The project page's trash: `core/components/pages/projects/project-detail/page-component.tsx` mounts the same
 *   `TaskTrashList` with a `projectId`; out of this brief's scope.
 * - Other locales, responsive layout, and what a real Gauzy platform answers.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PAGE_PATH = '/team/tasks/trash';
const TRASH_ROUTE = '/api/tasks/trash';
/** The same call as the client's own log line names it: the axios base already carries `/api` (`logger-adapter.service.ts:189-199`). */
const LOGGED_ROUTE = '/tasks/trash';
/** Every trash path the mock has no handler for: the list, the recover, the delete-forever, the soft delete. */
const trashPathOf = (pathname: string) =>
	pathname === TRASH_ROUTE || /^\/api\/tasks\/[^/]+\/(recover|trashed|soft)$/.test(pathname);

/** Copy is read from `locales/en.json` by key, never typed: `taskTrash` plus the sentences this page borrows. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	taskTrash: Record<string, string>;
	common: { CANCEL: string; PROCESSING: string };
	modals: { confirmation: { CONFIRMING: string } };
	pages: { unauthorized: { TRY_AGAIN: string } };
	sidebar: { TEAMTASKS: string };
};
const T = EN.taskTrash;
/** `DELETED_BY` = "Deleted by {name} · {date}", `DELETED_AT` = "Deleted {date}", `LOAD_MORE` = "Load more ({shown} of {total})". */
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-a task-trash] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer restated for every reply this file writes, `OPTIONS` → 204 as the mock does. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:421`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The dev-mode mutation toast (`core/components/common/dev-error-toaster.tsx`), printed for a failed mutation. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/**
 * The line the client writes for a refusal this file armed (`api.service.ts:439-474` → `logger-adapter.service.ts:189-199`):
 * a 403 as the CRITICAL sentence, every other status as the plain one, both keeping the path and query the service
 * passed. Exact substrings of the printed lines, so nothing unnamed can slip past.
 */
const armedHttpError = (verb: string, url: string, status: number) =>
	status === 403
		? `🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${url} - Permission Denied`
		: `HTTP Error: ${verb} ${url} ${status}`;

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** A served `deletedAt` at local noon, so a rendered date cannot straddle a day boundary mid-test. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};
/** `task-trash-list.tsx:48-51` `new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' })`; this page's locale is `en`. */
const shownDateTime = (iso: string) =>
	new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));

/** `ITrashedTask` (`core/types/interfaces/task/task-trash.ts:16-31`) as this file serves it. */
type ServedTask = {
	id: string;
	title: string;
	number?: number | null;
	prefix?: string | null;
	taskNumber?: string | null;
	project?: { id: string; name?: string | null } | null;
	deletedAt: string;
	deletedByUser?: { firstName?: string; lastName?: string; name?: string } | null;
};

/** A refusal this file arms on its stand-in platform; `delayMs` holds the answer back so a busy row can be seen while it runs. */
type Refusal = { status: number; message?: string; delayMs?: number };

type ServedScript = {
	items: ServedTask[];
	listRefusal?: Refusal;
	restoreRefusal?: Refusal;
	deleteRefusal?: Refusal;
	deleteDelayMs?: number;
	/** With a 404 write answer: the platform moved on (someone restored or deleted the task since the read), so its store agrees with the 404 instead of keeping a task it says it has not got. */
	platformMovedOn?: boolean;
};

type ServedCall = { method: string; path: string; search: string; body: string | null; url: string };

type TrashHarness = {
	calls: ServedCall[];
	/** The trashed tasks the stand-in platform holds: a write it accepts removes one, a refusal changes nothing. */
	items: ServedTask[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	/** Replaces what the platform holds and how it answers, keeping the one route — so no route-ordering question arises. */
	reset: (next: ServedScript) => void;
};

/**
 * This file's stand-in for the platform's trash, on the mock origin, for the paths the mock does not answer. The list
 * answer is always the current store, so a restore or a delete can be followed by a re-read that no longer lists the
 * task — the only way to tell "the row is gone" apart from "the platform still says it is there".
 */
async function serveTaskTrash(page: Page, initial: ServedScript): Promise<TrashHarness> {
	const state: { script: ServedScript; items: ServedTask[] } = { script: { ...initial }, items: [...initial.items] };
	const calls: ServedCall[] = [];
	const matcher = (url: URL) => url.origin === MOCK_API_ORIGIN && trashPathOf(url.pathname);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

		calls.push({ method, path: url.pathname, search: url.search, body: request.postData(), url: request.url() });
		const script = state.script;
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const refuse = async (item: Refusal) => {
			if (item.delayMs) await new Promise((resolve) => setTimeout(resolve, item.delayMs));
			return answer(item.status, {
				statusCode: item.status,
				message: item.message ?? 'this file refused the call'
			});
		};
		// the list is `/api/tasks/trash`; a write is `/api/tasks/<id>/<recover|trashed|soft>`
		const [, id, sub] = /^\/api\/tasks\/([^/]+)\/([^/]+)$/.exec(url.pathname) ?? [];
		const dropFromStore = () => {
			state.items = state.items.filter((task) => task.id !== id);
		};

		if (url.pathname === TRASH_ROUTE && method === 'GET') {
			if (script.listRefusal) return refuse(script.listRefusal);
			// the platform matches a title or a task number (`task-trash.service.ts:61`); this file imitates that match
			const search = (url.searchParams.get('search') ?? '').toLowerCase();
			const matched = state.items.filter((task) => {
				if (!search) return true;
				const number = task.taskNumber
					? String(task.taskNumber).toLowerCase()
					: typeof task.number === 'number'
						? `${task.prefix ? `${task.prefix}-${task.number}` : `#${task.number}`}`.toLowerCase()
						: '';
				return task.title.toLowerCase().includes(search) || number.includes(search);
			});
			const skip = Number(url.searchParams.get('skip') ?? '0');
			const take = Number(url.searchParams.get('take') ?? '50');
			return answer(200, { items: matched.slice(skip, skip + take), total: matched.length });
		}
		if (sub === 'recover' && method === 'PUT') {
			if (script.restoreRefusal) {
				if (script.restoreRefusal.status === 404 && script.platformMovedOn) dropFromStore();
				return refuse(script.restoreRefusal);
			}
			dropFromStore();
			return answer(204);
		}
		if (sub === 'trashed' && method === 'DELETE') {
			if (script.deleteRefusal) {
				if (script.deleteRefusal.status === 404 && script.platformMovedOn) dropFromStore();
				return refuse(script.deleteRefusal);
			}
			if (script.deleteDelayMs) await new Promise((resolve) => setTimeout(resolve, script.deleteDelayMs));
			dropFromStore();
			return answer(204);
		}
		if (sub === 'soft' && method === 'DELETE') {
			return answer(599, { message: 'this file scripted no answer for a soft task delete' });
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		get items() {
			return state.items;
		},
		shapes: () => calls.map((call) => `${call.method} ${call.path}${call.search}`),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		reset: (next) => {
			state.script = { ...next };
			if (next.items) state.items = [...next.items];
		}
	};
}

/** Records only, never answers: what the browser really sent, split by origin. */
function recordBrowserCalls(page: Page) {
	const mockCalls: ServedCall[] = [];
	const appCalls: Array<{ method: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && trashPathOf(url.pathname)) {
			mockCalls.push({
				method: request.method(),
				path: url.pathname,
				search: url.search,
				body: request.postData(),
				url: request.url()
			});
		}
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/')) {
			appCalls.push({ method: request.method(), path: url.pathname });
		}
	});
	return {
		mockCalls,
		appCalls,
		trashShapes: () => mockCalls.map((call) => `${call.method} ${call.path}${call.search}`)
	};
}

const taskOf = (sequence: number, overrides: Partial<ServedTask> = {}): ServedTask => ({
	id: `77777777-7777-4777-8777-0000000000${String(sequence).padStart(2, '0')}`,
	title: `Probe trash ${sequence}`,
	deletedAt: dayIso(-sequence),
	...overrides
});

/** The row text for a task with no key, no person and no project — the shape measured in probe-3 Q6-Q10 and probe-6 U1. */
const plainRow = (title: string, deletedAt: string) =>
	`${title} ${filled('DELETED_AT', { date: shownDateTime(deletedAt) })} ${T.RESTORE} ${T.DELETE_FOREVER}`;

/** `team-task-trash-page.tsx:36` — the page's own `<h1>`, and the column holding the list under it (the shell draws two `<main>` elements, so nothing here scopes on `main`). */
const pageHeading = (page: Page) => page.getByRole('heading', { level: 1, name: T.TITLE, exact: true });
const trashArea = (page: Page) => pageHeading(page).locator('xpath=..');
const rows = (page: Page) => trashArea(page).locator('ul > li');
const rowTexts = async (page: Page) =>
	rows(page)
		.allInnerTexts()
		.then((all) => all.map(flat));
const copy = (scope: Page | Locator, value: string) => scope.getByText(value, { exact: true });
const breadcrumbLinks = async (page: Page) =>
	page.locator('nav[aria-label="breadcrumb"] a').evaluateAll((nodes) =>
		nodes.map((node) => ({
			text: (node.textContent ?? '').trim(),
			href: node.getAttribute('href'),
			current: node.closest('li')?.getAttribute('aria-current')
		}))
	);
/** The breadcrumb always links to Trash; the sidebar's own Trash link exists only with the flag on (`app-sidebar.tsx:403-406`). */
const trashLinks = (page: Page) => page.getByRole('link', { name: T.TITLE, exact: true });
const searchInput = (page: Page) => page.locator('input[type=search]');
const restoreButtons = (page: Page) => rows(page).getByRole('button', { name: T.RESTORE, exact: true });
const deleteButtons = (page: Page) => rows(page).getByRole('button', { name: T.DELETE_FOREVER, exact: true });
/** CSS only: an open dialog makes the page inert, so role locators see no row button while a dialog is up. */
const rowButtonStates = (page: Page) =>
	rows(page).evaluateAll((list) =>
		list.map((row) =>
			Array.from(row.querySelectorAll('button')).map((button) => ({
				text: (button.textContent ?? '').trim(),
				aria: button.getAttribute('aria-label'),
				disabled: (button as HTMLButtonElement).disabled
			}))
		)
	);
const loadMoreButton = (page: Page, shown: number, total: number) =>
	page.getByRole('button', { name: filled('LOAD_MORE', { shown, total }), exact: true });
const tryAgainButton = (page: Page) => page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
/** Sonner toasts: the app's own copy, and the dev-mode error toast, told apart by its "Copy details" action. */
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: 'Copy details' });
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: 'Copy details' });
const toastWith = (page: Page, value: string) => appToasts(page).filter({ hasText: value });
/** The app's own toast texts, read from the DOM: a live toast keeps animating, and an action on it waits for it to settle. */
const toastTexts = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[data-sonner-toast]'))
			.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
			.filter((value) => !value.includes('Copy details'))
	);
/** `AlertDialogConfirmation` (`alert-dialog-confirmation.tsx:43-66`) renders a Radix AlertDialog. */
const questionOf = (page: Page) => page.getByRole('alertdialog');
const questionButton = (page: Page, name: string) => questionOf(page).getByRole('button', { name, exact: true });

/** The deployment flag on, for this test only, through the shared helper (`helpers.ts:485`) — never a private copy. */
const turnTrashOn = (page: Page) => overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_TRASH_ENABLED: 'true' });

/** The scope the app sends, as its own scope cookies carry it (`helpers.ts:171-186`, probe-3 Q12/Q13). */
const listQuery = (fixture: BootstrapFixture, search?: string) =>
	`?tenantId=${fixture.ids.tenantA}&organizationId=${fixture.ids.organizationA}&organizationTeamId=${fixture.ids.teamA}` +
	`${search ? `&search=${encodeURIComponent(search)}` : ''}&skip=0&take=50`;
const secondQuery = (fixture: BootstrapFixture) =>
	`?tenantId=${fixture.ids.tenantA}&organizationId=${fixture.ids.organizationA}&organizationTeamId=${fixture.ids.teamA}&skip=50&take=50`;
/** The services send only tenant and organization on a write (`task-trash.service.ts:87-102`, probe-4 R1/R2). */
const writeQuery = (fixture: BootstrapFixture) =>
	`?tenantId=${fixture.ids.tenantA}&organizationId=${fixture.ids.organizationA}`;
/** A write hangs off the task, not off the trash list: `/api/tasks/<id>/recover`, `/api/tasks/<id>/trashed` (probe-4 R1/R2). */
const writePath = (id: string, sub: 'recover' | 'trashed') => `/api/tasks/${id}/${sub}`;
/**
 * The same write as the client's own log line names it: `/tasks/<id>/<sub>`, with no `/api` prefix. `api.service.ts:516`
 * puts `/api` on the axios `baseURL`, and `logger-adapter.service.ts:189-199` builds the line from `error.config.url`
 * only — so the console names a write without the prefix the wire path carries (the 400 lines of test 8).
 */
const loggedWritePath = (id: string, sub: 'recover' | 'trashed') => `/tasks/${id}/${sub}`;

const runtimeEnvOf = (page: Page) =>
	page.evaluate(() => {
		const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '';
		const env: Record<string, string> = raw ? (JSON.parse(raw) as Record<string, string>) : {};
		const injected = (globalThis as Record<string, unknown>).__EVER_TEAMS_RUNTIME_ENV__ as
			| Record<string, string>
			| undefined;
		return {
			payloadKeys: Object.keys(env).length,
			payloadFlag: env.NEXT_PUBLIC_TASK_TRASH_ENABLED ?? null,
			injectedFlag: injected?.NEXT_PUBLIC_TASK_TRASH_ENABLED ?? null
		};
	});

test.describe('lane-a · /team/tasks/trash: what the trash page shows and what the browser really sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------------------------------------------ 1. the lane exactly as it serves this page

	test('1 · the lane as it is: the flag is off, the page says so in its own words and asks nothing of the platform', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(pageHeading(page), 'the trash page drew no <h1>').toBeVisible({ timeout: 25_000 });
		await expect(copy(page, T.OFF_TITLE)).toBeVisible();
		await expect(copy(page, T.OFF_TEXT)).toBeVisible();
		await expect(pageHeading(page), 'the off page drew more than its own <h1>').toHaveCount(1);
		await expect(copy(page, T.UNAVAILABLE_TITLE), 'an off page called the platform unavailable').toHaveCount(0);
		await expect(copy(page, T.HINT), 'an off page drew the list hint').toHaveCount(0);
		await expect(searchInput(page), 'the search box was drawn although the flag is off').toHaveCount(0);
		await expect(rows(page), 'the list was drawn although the flag is off').toHaveCount(0);
		// only the breadcrumb's own Trash link exists while the deployment keeps the feature off
		await expect(trashLinks(page), 'the sidebar offers Trash while the flag is off').toHaveCount(1);

		const crumbs = await breadcrumbLinks(page);
		expect(crumbs, 'the breadcrumb is not the three links the page builds').toEqual([
			{ text: fixture.names.teamA, href: '/', current: null },
			{ text: EN.sidebar.TEAMTASKS, href: '/team/tasks', current: null },
			{ text: T.TITLE, href: '/team/tasks/trash', current: 'page' }
		]);

		await expect.poll(() => calls.mockCalls.length, { timeout: 10_000 }).toBe(0);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call').toBe(0);
		expect(
			calls.appCalls.map((call) => call.path),
			'a trash call went to a Next route instead of the mock origin'
		).not.toContain(TRASH_ROUTE);

		const payload = await runtimeEnvOf(page);
		report('lane-as-it-is', {
			url: page.url(),
			headings: await page
				.locator('h1, h2, h3')
				.evaluateAll((nodes) => nodes.map((node) => `${node.tagName} ${(node.textContent ?? '').trim()}`)),
			breadcrumb: crumbs,
			trashLinks: await trashLinks(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
			offCopy: [await copy(page, T.OFF_TITLE).innerText(), await copy(page, T.OFF_TEXT).innerText()],
			browserTrashCalls: calls.trashShapes(),
			appApiCalls: [...new Set(calls.appCalls.map((call) => `${call.method} ${call.path}`))],
			runtimeEnv: payload,
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(payload.payloadFlag, 'this lane really does leave the flag out').toBeNull();
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ------------------------------------------------ 2. a platform that keeps no trash

	test('2 · the flag on, a platform with no trash: its 404 says unavailable, and a 400 is a load failure instead', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const armed: string[] = [];
		const served = await serveTaskTrash(page, {
			items: [taskOf(1)],
			listRefusal: { status: 404, message: 'this platform keeps no trash' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(copy(page, T.UNAVAILABLE_TITLE)).toBeVisible({ timeout: 25_000 });
		await expect(copy(page, T.UNAVAILABLE_TEXT)).toBeVisible();
		await expect(copy(page, T.LOAD_FAILED), 'a 404 was called a load failure').toHaveCount(0);
		await expect(copy(page, T.EMPTY_TITLE), 'a platform without a trash drew the empty state').toHaveCount(0);
		await expect(copy(page, T.FORBIDDEN_TITLE), 'a 404 was called a manager problem').toHaveCount(0);
		await expect(searchInput(page), 'the search box was drawn on a platform without a trash').toHaveCount(0);
		// `retry: false` (`use-task-trash.ts:82`): the refused read is asked once
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`]);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);
		armed.push(armedHttpError('GET', `${LOGGED_ROUTE}${listQuery(fixture)}`, 404));

		// the same page on a platform whose trash route does not exist at all: 400, the very shape `isAvailable` reads as "no trash"
		served.reset({ items: [taskOf(1)], listRefusal: { status: 400, message: 'no such route' } });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(copy(page, T.LOAD_FAILED)).toBeVisible({ timeout: 25_000 });
		await expect(tryAgainButton(page)).toHaveCount(1);
		await expect(
			copy(page, T.UNAVAILABLE_TITLE),
			'this page reads the platform 400 as its own failure, not as a platform with no trash'
		).toHaveCount(0);
		await expect.poll(() => served.countOf('GET', TRASH_ROUTE), { timeout: 15_000 }).toBe(2);
		armed.push(armedHttpError('GET', `${LOGGED_ROUTE}${listQuery(fixture)}`, 400));

		report('no-trash-platform', {
			h3After404: T.UNAVAILABLE_TITLE,
			h3After400: (await page.locator('h3').allInnerTexts()).map(flat),
			calls: served.shapes(),
			armed: armed.map((line) => line.slice(0, 70)),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(-70))
		});
		expect(
			consoleFindings(shield, armed),
			'besides its own HTTP error lines the page logged a console error'
		).toEqual([]);
	});

	// ------------------------------------------------ 3. an empty trash

	test('3 · the flag on and the trash empty: the empty state and the one read it asked for', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, { items: [] });
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(copy(page, T.HINT)).toBeVisible({ timeout: 25_000 });
		await expect(copy(page, T.EMPTY_TITLE)).toBeVisible();
		await expect(copy(page, T.EMPTY_TEXT)).toBeVisible();
		await expect(searchInput(page)).toHaveCount(1);
		await expect(rows(page), 'an empty trash drew a row').toHaveCount(0);
		await expect(copy(page, T.NO_MATCH_TITLE), 'an empty trash was called a search miss').toHaveCount(0);
		await expect(trashLinks(page), 'with the flag on the sidebar adds its own Trash link').toHaveCount(2);

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`]);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('empty-trash', {
			calls: served.shapes(),
			searchField: await searchInput(page).evaluate((node) => ({
				ariaLabel: node.getAttribute('aria-label'),
				maxlength: node.getAttribute('maxlength'),
				placeholder: node.getAttribute('placeholder')
			})),
			trashLinks: await trashLinks(page).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href'))),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 4. three served rows

	test('4 · a served trash of three: the rows in served order, with the key, the person and the date each one shows', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const first = taskOf(1, {
			title: 'Probe first trashed',
			taskNumber: 'API-42',
			deletedByUser: { firstName: 'Ann', lastName: 'Lee' },
			project: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-111111111111', name: 'Probe Project' }
		});
		const second = taskOf(2, {
			title: 'Probe second trashed',
			prefix: 'FIX',
			number: 7,
			deletedByUser: { name: 'probe-user' },
			project: { id: 'aaaaaaaa-aaaa-4aaa-8aaa-222222222222', name: 'Fixture Project' }
		});
		const third = taskOf(3, { title: 'Probe third trashed', number: 11 });
		const served = await serveTaskTrash(page, { items: [first, second, third] });
		await signInAndVisit(page, fixture, PAGE_PATH);

		// `task-trash-list.tsx:169-204` with `trashedTaskNumberOf` (`task-trash.ts:39-44`): taskNumber, else `PREFIX-N`, else `#N`, else nothing
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([
				`API-42 Probe first trashed ${filled('DELETED_BY', { name: 'Ann Lee', date: shownDateTime(first.deletedAt) })} · Probe Project ${T.RESTORE} ${T.DELETE_FOREVER}`,
				`FIX-7 Probe second trashed ${filled('DELETED_BY', { name: 'probe-user', date: shownDateTime(second.deletedAt) })} · Fixture Project ${T.RESTORE} ${T.DELETE_FOREVER}`,
				`#11 ${plainRow(third.title, third.deletedAt)}`
			]);
		await expect(restoreButtons(page)).toHaveCount(3);
		await expect(deleteButtons(page)).toHaveCount(3);
		await expect(copy(page, T.EMPTY_TITLE), 'a trash of three was called empty').toHaveCount(0);
		await expect(loadMoreButton(page, 3, 3), 'three of three offered another page').toHaveCount(0);
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`]);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('three-rows', {
			rows: await rowTexts(page),
			dates: [shownDateTime(first.deletedAt), shownDateTime(second.deletedAt), shownDateTime(third.deletedAt)],
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 5. restore

	test('5 · restoring a row: the recover call, the announcement, and the row gone from the re-read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, { items: [taskOf(1), taskOf(2), taskOf(3)] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(3, { timeout: 15_000 });

		await restoreButtons(page).nth(1).click();
		// asserted while the toast is up: sonner takes it away seconds later (finding 8)
		await expect(toastWith(page, filled('RESTORED', { title: 'Probe trash 2' }))).toBeVisible({ timeout: 10_000 });
		await expect(toastWith(page, T.RESTORE_FAILED)).toHaveCount(0);

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`,
				`PUT ${writePath(taskOf(2).id, 'recover')}${writeQuery(fixture)}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`
			]);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([plainRow('Probe trash 1', taskOf(1).deletedAt), plainRow('Probe trash 3', taskOf(3).deletedAt)]);
		expect(
			served.items.map((task) => task.title),
			'the stand-in platform kept the task this file restored'
		).toEqual(['Probe trash 1', 'Probe trash 3']);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);

		report('restore', {
			calls: served.shapes(),
			toastsWhileUp: await toastTexts(page),
			devToastCount: await devToasts(page).count(),
			rows: await rowTexts(page),
			store: served.items.map((task) => task.title),
			mockTaskCalls: (await mock.calls('/api/tasks/')).map((call) => `${call.method} ${call.path} ${call.status}`)
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 6. delete forever

	test('6 · deleting for good: the question, Cancel sending nothing at all, Confirm sending the delete', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, { items: [taskOf(1), taskOf(2)] });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(2, { timeout: 15_000 });

		await deleteButtons(page).first().click();
		const question = questionOf(page);
		await expect(question.getByRole('heading', { name: T.DELETE_FOREVER_TITLE, exact: true })).toBeVisible();
		await expect(copy(question, filled('DELETE_FOREVER_TEXT', { title: 'Probe trash 1' }))).toBeVisible();
		await expect(questionButton(page, EN.common.CANCEL)).toHaveCount(1);
		await expect(questionButton(page, T.DELETE_FOREVER)).toHaveCount(1);
		const questionText = flat(await question.innerText());
		// the question holds the page: no row button is reachable while it is open (finding 10)
		await expect(restoreButtons(page)).toHaveCount(0);

		await questionButton(page, EN.common.CANCEL).click();
		await expect(question).toHaveCount(0);
		expect(served.shapes(), 'Cancel sent a write').toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`]);
		expect(
			served.items.map((task) => task.title),
			'Cancel changed the platform'
		).toEqual(['Probe trash 1', 'Probe trash 2']);
		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a write this file was answering').toBe(0);

		await deleteButtons(page).first().click();
		await questionButton(page, T.DELETE_FOREVER).click();
		await expect(toastWith(page, filled('DELETED_FOREVER', { title: 'Probe trash 1' }))).toBeVisible({
			timeout: 10_000
		});

		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`,
				`DELETE ${writePath(taskOf(1).id, 'trashed')}${writeQuery(fixture)}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`
			]);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([plainRow('Probe trash 2', taskOf(2).deletedAt)]);
		expect(
			served.shapes().filter((shape) => shape.includes('/soft')),
			'a delete forever went the soft path'
		).toEqual([]);

		report('delete-forever', {
			question: questionText,
			calls: served.shapes(),
			toastsWhileUp: await toastTexts(page),
			rows: await rowTexts(page),
			store: served.items.map((task) => task.title),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 7. someone else got there first

	test('7 · a restore and a delete the platform answers 404 for: the restore keeps its row, the delete does not', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const armed: string[] = [];

		// restore answered 404: `restore` returns false before any refresh (`use-task-trash.ts:118-125`)
		const served = await serveTaskTrash(page, {
			items: [taskOf(1), taskOf(2)],
			restoreRefusal: { status: 404, message: 'no such task in the trash' },
			platformMovedOn: true
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(2, { timeout: 15_000 });
		await restoreButtons(page).first().click();
		await expect(toastWith(page, T.RESTORE_FAILED)).toBeVisible({ timeout: 10_000 });
		await expect(toastWith(page, filled('NO_LONGER_IN_TRASH', { title: 'Probe trash 1' }))).toHaveCount(0);
		await expect
			.poll(() => served.shapes(), { timeout: 10_000 })
			.toEqual([
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`,
				`PUT ${writePath(taskOf(1).id, 'recover')}${writeQuery(fixture)}`
			]);
		expect(await rowTexts(page)).toHaveLength(2);
		expect(
			served.items.map((task) => task.title),
			'the platform moved on as its 404 said'
		).toEqual(['Probe trash 2']);
		armed.push(armedHttpError('PUT', `${loggedWritePath(taskOf(1).id, 'recover')}${writeQuery(fixture)}`, 404));
		report('restore-404', {
			calls: served.shapes(),
			listReads: served.countOf('GET', TRASH_ROUTE),
			rows: await rowTexts(page),
			store: served.items.map((task) => task.title),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(-70))
		});

		// delete answered 404: `not-in-trash`, the one refusal that re-reads (`use-task-trash.ts:141-142`)
		served.reset({
			items: [taskOf(1), taskOf(2)],
			deleteRefusal: { status: 404, message: 'no such task in the trash' },
			platformMovedOn: true
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(2, { timeout: 15_000 });
		const beforeDelete = served.shapes();
		await deleteButtons(page).first().click();
		await questionButton(page, T.DELETE_FOREVER).click();
		await expect(toastWith(page, filled('NO_LONGER_IN_TRASH', { title: 'Probe trash 1' }))).toBeVisible({
			timeout: 10_000
		});
		await expect(
			toastWith(page, T.DELETE_FAILED),
			'a task no longer in the trash was called a failed delete'
		).toHaveCount(0);
		await expect(
			toastWith(page, T.STILL_LINKED),
			'a task no longer in the trash was called a linked one'
		).toHaveCount(0);
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				...beforeDelete,
				`DELETE ${writePath(taskOf(1).id, 'trashed')}${writeQuery(fixture)}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`
			]);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([plainRow('Probe trash 2', taskOf(2).deletedAt)]);
		armed.push(armedHttpError('DELETE', `${loggedWritePath(taskOf(1).id, 'trashed')}${writeQuery(fixture)}`, 404));

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		report('delete-404', {
			calls: served.shapes(),
			listReads: served.countOf('GET', TRASH_ROUTE),
			rows: await rowTexts(page),
			store: served.items.map((task) => task.title),
			armed: armed.map((line) => line.slice(0, 70)),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(-70))
		});
		expect(consoleFindings(shield, armed), 'besides its HTTP error lines the page logged a console error').toEqual(
			[]
		);
	});

	// ------------------------------------------------ 8. refused writes

	test('8 · a refused restore and a refused delete (400, 403, 500): its own sentence, the row kept, nothing changed', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, { items: [taskOf(1)] });
		const armed: string[] = [];

		for (const verb of ['restore', 'delete'] as const) {
			for (const status of [400, 403, 500]) {
				served.reset({
					items: [taskOf(1)],
					...(verb === 'restore'
						? { restoreRefusal: { status, message: `refused restore ${status}` } }
						: { deleteRefusal: { status, message: `refused delete ${status}` } })
				});
				await signInAndVisit(page, fixture, PAGE_PATH);
				await expect(rows(page), `${verb} ${status}: no row to refuse`).toHaveCount(1, { timeout: 15_000 });
				const before = served.shapes();
				if (verb === 'restore') {
					await restoreButtons(page).first().click();
				} else {
					await deleteButtons(page).first().click();
					await questionButton(page, T.DELETE_FOREVER).click();
				}
				const sentence = verb === 'restore' ? T.RESTORE_FAILED : T.DELETE_FAILED;
				await expect(toastWith(page, sentence)).toBeVisible({ timeout: 10_000 });
				const other = verb === 'restore' ? T.DELETE_FAILED : T.RESTORE_FAILED;
				await expect(toastWith(page, other)).toHaveCount(0);
				expect(await rowTexts(page)).toHaveLength(1);
				expect(
					served.items.map((task) => task.title),
					`a refused ${verb} (${status}) changed the platform`
				).toEqual(['Probe trash 1']);
				const path = writePath(taskOf(1).id, verb === 'restore' ? 'recover' : 'trashed');
				await expect
					.poll(() => served.shapes(), { timeout: 10_000 })
					.toEqual([...before, `${verb === 'restore' ? 'PUT' : 'DELETE'} ${path}${writeQuery(fixture)}`]);
				armed.push(
					armedHttpError(
						verb === 'restore' ? 'PUT' : 'DELETE',
						`${loggedWritePath(taskOf(1).id, verb === 'restore' ? 'recover' : 'trashed')}${writeQuery(fixture)}`,
						status
					)
				);
				report(`refused-${verb}-${status}`, {
					shapes: served.shapes().slice(before.length),
					toast: (await toastWith(page, sentence).first().innerText()).trim(),
					rows: await rowTexts(page),
					store: served.items.map((task) => task.title),
					consoleErrors: shield.consoleErrors().map((line) => line.slice(-70))
				});
			}
		}

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		expect(consoleFindings(shield, armed), 'besides its HTTP error lines the page logged a console error').toEqual(
			[]
		);
	});

	// ------------------------------------------------ 9. the list read failing

	test('9 · the list read failing (500): its failure state, and Try again asking again until it clears', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, {
			items: [taskOf(1)],
			listRefusal: { status: 500, message: 'the platform is down' }
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		await expect(copy(page, T.LOAD_FAILED)).toBeVisible({ timeout: 25_000 });
		await expect(tryAgainButton(page)).toHaveCount(1);
		await expect(copy(page, T.EMPTY_TITLE), 'a failed read was called an empty trash').toHaveCount(0);
		await expect(copy(page, T.UNAVAILABLE_TITLE), 'a 500 was called a platform without a trash').toHaveCount(0);
		await expect(copy(page, T.FORBIDDEN_TITLE), 'a 500 was called a manager problem').toHaveCount(0);
		await expect(rows(page), 'a failed read drew rows').toHaveCount(0);
		// a failed read raises no app toast here, only the dev-mode one (finding 7)
		await expect(appToasts(page)).toHaveCount(0);

		// Try again while the platform still refuses: asked again, still the failure state. How many reads a failed
		// query ends with is not pinned — only that it is asked again.
		const refused = served.countOf('GET', TRASH_ROUTE);
		await tryAgainButton(page).first().click();
		await expect.poll(() => served.countOf('GET', TRASH_ROUTE), { timeout: 15_000 }).toBeGreaterThan(refused);
		await expect(copy(page, T.LOAD_FAILED)).toBeVisible();

		// Try again once the platform answers again: the state clears and the row arrives
		served.reset({ items: [taskOf(1)] });
		const before = served.countOf('GET', TRASH_ROUTE);
		await tryAgainButton(page).first().click();
		await expect.poll(() => served.countOf('GET', TRASH_ROUTE), { timeout: 15_000 }).toBeGreaterThan(before);
		await expect(copy(page, T.LOAD_FAILED)).toHaveCount(0);
		await expect(tryAgainButton(page), 'the cleared failure still offered its action').toHaveCount(0);
		await expect(copy(page, T.EMPTY_TITLE), 'the re-read drew the empty state instead of the row').toHaveCount(0);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([plainRow('Probe trash 1', taskOf(1).deletedAt)]);

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		report('list-failure', {
			calls: served.shapes(),
			listReads: served.countOf('GET', TRASH_ROUTE),
			devToastCount: await devToasts(page).count(),
			rows: await rowTexts(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(-70))
		});
		expect(
			consoleFindings(shield, [armedHttpError('GET', `${LOGGED_ROUTE}${listQuery(fixture)}`, 500)]),
			'besides its HTTP error line the page logged a console error'
		).toEqual([]);
	});

	// ------------------------------------------------ 10. a busy row

	test('10 · a row stays busy while its delete runs: its own buttons disabled, the other rows usable, one delete only', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, { items: [taskOf(1), taskOf(2), taskOf(3)], deleteDelayMs: 6_000 });
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(3, { timeout: 15_000 });

		await deleteButtons(page).first().click();
		const question = questionOf(page);
		await expect(question).toBeVisible();
		await expect(questionButton(page, EN.common.CANCEL)).toBeEnabled();
		await expect(questionButton(page, T.DELETE_FOREVER)).toBeEnabled();
		await questionButton(page, T.DELETE_FOREVER).click();

		// `[MEASURED, NOT INTENDED]` the question is gone at once: `AlertDialogAction` closes it and `task-trash-list.tsx:235`
		// clears `deleting`, so `loading` (`:233`) has nothing left to mark and the Confirming…/Processing… shape
		// (`alert-dialog-confirmation.tsx:38-42,57-60`) never shows, although `task-trash-list.test.tsx:107-129` pins it.
		await expect(question, 'the question stayed open while its delete ran').toHaveCount(0);
		// the row itself is busy: `disabled={isBusy}` on both of its buttons (`task-trash-list.tsx:187,198`)
		await expect
			.poll(() => rowButtonStates(page))
			.toEqual([
				[
					{ text: T.RESTORE, aria: null, disabled: true },
					{ text: T.DELETE_FOREVER, aria: null, disabled: true }
				],
				[
					{ text: T.RESTORE, aria: null, disabled: false },
					{ text: T.DELETE_FOREVER, aria: null, disabled: false }
				],
				[
					{ text: T.RESTORE, aria: null, disabled: false },
					{ text: T.DELETE_FOREVER, aria: null, disabled: false }
				]
			]);
		report('busy-row-mid-delete', {
			questionCount: await question.count(),
			rowButtons: await rowButtonStates(page),
			calls: served.shapes(),
			processingShown: await copy(page, EN.common.PROCESSING).count(),
			confirmingShown: await page
				.getByRole('button', { name: EN.modals.confirmation.CONFIRMING, exact: true })
				.count()
		});

		await expect(toastWith(page, filled('DELETED_FOREVER', { title: 'Probe trash 1' }))).toBeVisible({
			timeout: 20_000
		});
		await expect
			.poll(() => served.shapes(), { timeout: 25_000 })
			.toEqual([
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`,
				`DELETE ${writePath(taskOf(1).id, 'trashed')}${writeQuery(fixture)}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`
			]);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([plainRow('Probe trash 2', taskOf(2).deletedAt), plainRow('Probe trash 3', taskOf(3).deletedAt)]);
		expect(served.countOf('DELETE', writePath(taskOf(1).id, 'trashed')), 'the delete was sent more than once').toBe(
			1
		);
		expect(
			(await rowButtonStates(page)).every((row) => row.every((button) => !button.disabled)),
			'a row stayed disabled after its delete finished'
		).toBe(true);

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		report('busy-row', {
			calls: served.shapes(),
			toastsWhileUp: await toastTexts(page),
			rows: await rowTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 11. the search box

	test('11 · the search box: the read it asks for, the narrowed rows, and the no-match state', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, {
			items: [taskOf(1, { title: 'Probe first trashed', taskNumber: 'API-42' }), taskOf(2), taskOf(3)]
		});
		await signInAndVisit(page, fixture, PAGE_PATH);
		await expect(rows(page)).toHaveCount(3, { timeout: 15_000 });

		expect(await searchInput(page).getAttribute('maxlength'), 'the cap is not TASK_TRASH_SEARCH_MAX_LENGTH').toBe(
			'200'
		);
		expect(await searchInput(page).getAttribute('aria-label'), 'the field has no accessible name').toBe(T.SEARCH);

		await searchInput(page).fill('42');
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`, `GET ${TRASH_ROUTE}${listQuery(fixture, '42')}`]);
		await expect
			.poll(() => rowTexts(page), { timeout: 15_000 })
			.toEqual([`API-42 ${plainRow('Probe first trashed', taskOf(1).deletedAt)}`]);
		await expect(copy(page, T.NO_MATCH_TITLE), 'a search that matched was called a miss').toHaveCount(0);

		await searchInput(page).fill('nothing matches');
		await expect(copy(page, T.NO_MATCH_TITLE)).toBeVisible({ timeout: 15_000 });
		await expect(copy(page, T.NO_MATCH_TEXT)).toBeVisible();
		await expect(copy(page, T.EMPTY_TITLE), 'a search miss was called an empty trash').toHaveCount(0);
		await expect(rows(page)).toHaveCount(0);
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([
				`GET ${TRASH_ROUTE}${listQuery(fixture)}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture, '42')}`,
				`GET ${TRASH_ROUTE}${listQuery(fixture, 'nothing matches')}`
			]);

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		report('search', {
			calls: served.shapes(),
			h3: (await page.locator('h3').allInnerTexts()).map(flat),
			rows: await rowTexts(page)
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ------------------------------------------------ 12. more than one page

	test('12 · more than a page: fifty rows, the Load more label, and the next page it reads', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await turnTrashOn(page);
		const served = await serveTaskTrash(page, {
			items: Array.from({ length: 55 }, (_, index) => taskOf(index + 1))
		});
		await signInAndVisit(page, fixture, PAGE_PATH);

		// `TASK_TRASH_PAGE_SIZE` is 50 (`task-trash.service.ts:11`), so the first read brings fifty of the fifty-five
		await expect(rows(page)).toHaveCount(50, { timeout: 20_000 });
		await expect(loadMoreButton(page, 50, 55)).toHaveCount(1);
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`]);

		await loadMoreButton(page, 50, 55).click();
		await expect
			.poll(() => served.shapes(), { timeout: 15_000 })
			.toEqual([`GET ${TRASH_ROUTE}${listQuery(fixture)}`, `GET ${TRASH_ROUTE}${secondQuery(fixture)}`]);
		await expect.poll(() => rowTexts(page), { timeout: 20_000 }).toHaveLength(55);
		await expect(loadMoreButton(page, 55, 55), 'a fully read trash still offered more').toHaveCount(0);

		expect((await mock.calls(TRASH_ROUTE)).length, 'the mock heard a trash call this file answered').toBe(0);
		report('pagination', {
			calls: served.shapes(),
			firstRow: (await rowTexts(page))[0],
			lastRow: (await rowTexts(page)).at(-1),
			rowCount: await rows(page).count(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});
});
