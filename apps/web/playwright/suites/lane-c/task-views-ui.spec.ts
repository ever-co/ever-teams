import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import {
	APP_ORIGIN,
	hardVisit,
	mockReset,
	overrideRuntimeEnv,
	signInAndVisit,
	type BootstrapFixture
} from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in member sees and what the browser really sends on the **views** pages — `/views`
 * (`app/[locale]/(main)/views/page.tsx:1-14` → `core/components/pages/teams/team/tasks/views/views-page.tsx`) and
 * `/views/[viewId]` (`app/[locale]/(main)/views/[viewId]/page.tsx:1-15` → `TaskViewRoute`,
 * `core/components/pages/teams/team/tasks/views/task-view-route.tsx:94-105`), on lane-c (app `http://localhost:3033`,
 * mock `http://127.0.0.1:4002`, statistics `4003`, control `4004`, issuer `4005`).
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `E:\Coding\.tmp\probe-taskviews\probe.spec.ts` (P0-P11) and `probe3.spec.ts` (Q1-Q9), run on
 * this lane on 2026-11-25 and logged in `E:\Coding\.tmp\s3-lane-c-taskviews-probe-2.log` and `-probe-3.log`. Every
 * value asserted below is one those runs printed; this file's own `MEASURE` lines print the same shapes.
 *
 * ## The switch, and what this file has to do to reach the pages at all
 *
 * Both pages refuse their own content before anything else: `views-page.tsx:83-94` renders
 * `UNAVAILABLE_TITLE` + `UNAVAILABLE_TEXT` when `isTaskViewsEnabled()` is false, and `task-view-route.tsx:98-100`
 * renders the same pair before it even looks at the route segment. `isTaskViewsEnabled()`
 * (`core/lib/utils/task-views-enabled.ts:8-11`) is `NEXT_PUBLIC_TASK_VIEWS_ENABLED` read at run time through
 * `readRuntimeEnv` (`core/lib/utils/env-config.ts`), i.e. from the payload the server writes on
 * `<html data-ever-teams-runtime-env>`. **This lane does not set that key** (`playwright/test-servers.ts` `sharedEnv`
 * has no such entry): the payload this lane's app served carries 52 public keys without it, and the hooks' own gate
 * (`use-task-views-query.ts:17`, `use-built-in-view-tasks.ts:19`, `use-task-views-scope.ts:35`) keeps every read off —
 * test 1 is the honest measurement of both pages **as the lane serves them**, and it pins that no `/task-views` call
 * went out.
 *
 * To reach the feature at all, tests 2-13 use the shared helper `overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED:
 * 'true' })` (`playwright/helpers.ts`, end of file) before the first visit: it is the same test-side flip the
 * automations spec hand-rolled (`suites/lane-c/automations-settings-ui.spec.ts:24-43,428-453`), now shared — the
 * `__EVER_TEAMS_RUNTIME_ENV__` global `env-config.ts` `readInjectedRuntimeEnv()` consults before the `<html>`
 * attribute becomes this file's payload plus the flag, and it refuses the layout's later `installRuntimeEnv(env)`. It
 * changes only what the browser's `readRuntimeEnv` readers see; the server's markup is untouched (no hydration error
 * appeared in any run) and the lane's server is not reconfigured, which every other spec on this lane depends on.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** NextAuth, the shell and its reads (`/api/user/me`, `/api/organization-team`, `/api/tasks/team`,
 * `/api/task-metadata/bootstrap`, …) are the lane's mock. The team's one fixture task `Fixture active task`
 * (`cypress/support/mock-gauzy-server.mjs:183-196`, answered at `:677-678`) is what a **saved** view's page lists, and
 * the statuses `open` / `in-progress` (`:156-182`) are what a list is grouped by. The mock has **no** handler for
 * `/task-views`, `/tasks/built-in/*` or `/tasks/bulk-update`: it answers them with its catch-all `pagination([])` =
 * `{ items: [], total: 0 }` (`:897`, `:9`), which is a shape `taskViewsService.list` accepts (`task-views.service.ts:43-57`
 * reads `page.items` / `page.total`), so with the switch on and no stub `/views` renders its built-in cards and the
 * empty saved-views state (test 2 measures exactly that, and it is why the rest of this file can stub).
 *
 * **Served by this file:** every saved view, built-in page and write, through `page.route` on the mock origin (the
 * pattern of `suites/lane-c/automations-settings-ui.spec.ts:296-405` and `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`):
 * the list answer is always the current store, so a delete or a rename is followed by a re-read that no longer holds
 * the old row, and a refused write changes nothing. Every answer restates the mock's CORS answer
 * (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) because the page is on `localhost:3033` and the
 * API on `127.0.0.1:4002`. `route.fetch()` is never called, so `mock.calls('/api/task-views')` stays empty in every
 * stubbed test — the witness that the page acted on this file and not on the mock.
 *
 * **The browser talks to the mock, never to the app's own route twins** (measured `probe-2.log` P0's path list): the
 * only origins the browser asked were `127.0.0.1:4002` and the app itself (`/api/auth/session`, `/api/health`,
 * `POST /api/log`), so `app/api/task-views/**` (proxy mode) is not in this file's path; `suites/api` pins those routes.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `views-page.tsx`: the off branch `:83-94`; the toolbar `:107-129` (`DashboardToolbar` with
 *   `SAVED_COUNT` meta `:110`, the `data-testid="views-new"` button `:113` → `router.push(NEW_VIEW_PATH)` `:79`,
 *   `ViewsSearchField` `:33-59` with `common.CLEAR` as the × button `:50`, the `SegmentedControl` filter `:121-126`
 *   named by `FILTER_LABEL`); the built-in section `:133-142` (one `BuiltInViewCard` per `TASK_BUILT_IN_VIEWS`,
 *   `views-index-parts.tsx:54-75`, `data-testid="built-in-view-<key>"`, `href="/views/<key>"`); the saved section
 *   `:144-180` (`SHOWING` meta `:146-150`, `DashboardErrorNotice` `:155`, `SavedViewsSkeleton` `:156`,
 *   `SavedViewsEmpty` `:157`, `SavedViewsNoMatch` `:158-165`, the `<ul>` of `SavedViewRow` `:166-179`,
 *   `views-index-parts.tsx:86-158`: name, description, `saved-view-layout`, `PERSONAL`/`SHARED`, `UPDATED`, and a
 *   `DropdownMenu` named `ACTIONS_OF` with `RENAME` / `MAKE_SHARED`|`MAKE_PERSONAL` / `DELETE`); the two dialogs
 *   `:184-197` (`SaveViewDialog` in `rename` mode, `DeleteViewDialog`).
 * - `task-view-route.tsx`: the gate `:98-100`; the built-in branch `:101-103` → `BuiltInViewPage` `:76-91`
 *   (`useBuiltInViewTasks`), the saved branch `:61-74` (`useTaskViewQuery`, skeleton `:65`, not-found `:66-67`,
 *   another team `:70-72` → `OtherTeamView` `:42-59`), `ViewNotice` `:22-39` (`AnimatedEmptyState` + the
 *   `BACK_TO_VIEWS` link `:33-35`); `isBuiltInViewKey` (`core/lib/utils/task-views.ts:84-86`) decides which branch a
 *   segment takes, so `/views/<some-uuid>` is a saved view and `/views/mine` is a built-in one.
 * - `core/hooks/task-views/`: `use-task-views-query.ts:15-27` (the list, `staleTime` 30 s, `sortTaskViews`
 *   `core/lib/utils/task-views.ts:89-95` = shared first then personal, each by name), `:30-41` (one view, `retry: false`),
 *   `use-task-views-scope.ts:18-31` (the read waits for tenant + organization + user + team),
 *   `use-built-in-view-tasks.ts:17-37` (`staleTime` 15 s, `refetchInterval` 60 s), `use-task-view-actions.ts`:
 *   `TaskViewConflictError` `:19-24`, `conflictOf` `:26-35` (409 → the latest view from `response.data.view`),
 *   `createView` `:94-113`, `saveDefinition` `:115-135`, `updateView` `:137-154` (both state `expectedVersion`),
 *   `moveTask` + its queue `:156-295` (one rebase after a 409, never a second), `deleteView` `:297-307`;
 *   `views-page`'s own commands `use-saved-view-list-commands.ts` (rename `:33-50`, `toggleVisibility` `:52-69`,
 *   `confirmDelete` `:72-85`, `CONFLICT_IN_LIST` vs `SAVE_FAILED` `:20-27`) and the page's commands
 *   `use-saved-view-commands.ts` (save `:90-105`, create `:108-122`, move `:129-142`, rename `:145-158`,
 *   `toggleVisibility` `:160-175`, `confirmRemove` `:178-191`, `Mod+S` `:205-217`).
 * - `core/services/client/api/task-views/task-views.service.ts`: list `:43-57` (pages of 100, at most 500), one view
 *   `:59-63`, create `:65-68`, update `:70-73`, delete `:75-77` (no body), order `:79-83`, built-in `:87-111` (pages
 *   of 200, at most `BUILT_IN_MAX_TASKS = 1000`, `BUILT_IN_RELATIONS` `:28`); `api.service.ts` puts `organizationId`
 *   and `tenantId` in the body of every write (measured on the create, the rename and the share). Nothing here
 *   validates an answer.
 * - `core/lib/utils/task-views.ts`: `DEFAULT_TASK_VIEW_DEFINITION` `:19-24`, `columnsOf` `:55-63` (the three JSON
 *   columns), `sortTaskViews` `:89-95`; `core/lib/utils/task-views-index.ts`: `savedViewsShownOf` `:18-31` (search in
 *   name **and** description, case-insensitive), `savedViewCountsOf` `:34-37`, `builtInViewLabelKey` `:5-8`,
 *   `BUILT_IN_TEXT_KEYS` `:39-47`.
 * - `list/team-tasks-page.tsx`: `TaskViewContext` `:74-84`, `bodyStateOf` `:119-142`, the built-in truncation note
 *   `:341-344`, the retry `:378-381`, the bodies `:383-391` (`TeamTasksError` / `TeamTasksViewEmpty` from
 *   `team-tasks-states.tsx:56-64,90-102`), the toolbar's `viewActions` `:417-426` and the two view dialogs `:468-481`.
 * - `views/use-new-view-request.ts:18-30` (`NEW_VIEW_PATH = '/team/tasks?saveView=1'`), `views/save-view-dialog.tsx`
 *   (name `maxLength={80}` `:73`, the submit disabled while the name is blank `:48,:87`), `views/delete-view-dialog.tsx`
 *   (`DELETE_CONFIRM_TITLE`, `DELETE_TEXT`, Cancel / Delete), `views/task-view-toolbar-actions.tsx:28-70`.
 * - `core/components/common/empty-state.tsx` renders a notice as `<h3>` + `<p>` (+ one optional `Button`), and
 *   `dashboards/kit/dashboard-states.tsx:11-30` as a `Notice` with `dashboard.states.ERROR_TITLE` /
 *   `ERROR_MESSAGE` and a `pages.unauthorized.TRY_AGAIN` button.
 * - The sidebar also calls `useTaskViewsQuery` (`layouts/app-sidebar.tsx:132`, its Views group `:412-428`), which is
 *   why **every** views page reads the saved-views list, even `/views/<id>` (measured `probe-2.log` P4).
 *
 * ## Findings — every one of these is a value a run printed
 *
 * 1. **Switched off is the lane's real state, and it asks nothing.** The runtime payload the app served carries 52
 *    public keys and no `NEXT_PUBLIC_TASK_VIEWS_ENABLED`; `views-page.tsx:83-94` and `task-view-route.tsx:98-100`
 *    answer with `UNAVAILABLE_TITLE` + `UNAVAILABLE_TEXT`, and the hooks' gate (`use-task-views-query.ts:17`,
 *    `use-built-in-view-tasks.ts:19`) means zero `/task-views` calls left the browser (test 1).
 * 2. **The mock's catch-all is what makes the feature testable at all.** `mock-gauzy-server.mjs:897,9` answers an
 *    unknown GET with `pagination([])` = `{ items: [], total: 0 }`, which `taskViewsService.list`
 *    (`task-views.service.ts:43-57`) accepts, so with the flag flipped and no stub `/views` draws its four built-in
 *    cards and `EMPTY_TITLE` / `EMPTY_TEXT` after exactly one list read (test 2).
 * 3. **The order on screen is the client's, not the platform's.** `sortTaskViews` (`core/lib/utils/task-views.ts:89-95`)
 *    puts shared views first by name and personal ones after, whatever order the answer held them in (test 3).
 * 4. **The search reads descriptions too**, case-insensitively (`savedViewsShownOf`,
 *    `core/lib/utils/task-views-index.ts:18-31`): `UI TASKS` matched a view named `Design review` (test 3).
 * 5. **A built-in view is paged until the browser holds `total` tasks** (`builtInAll`,
 *    `task-views.service.ts:99-110`: `skip += page.items.length`, stop at `skip >= page.total` or
 *    `BUILT_IN_MAX_TASKS`). Asked 2 items with `total: 5` it asked three times (`skip=0`, `skip=2`, `skip=4`) and the
 *    same two tasks were listed six times — `probe-6.log` U1. Tests 4 and 5 therefore answer `total` = the items,
 *    which is the one case that asks exactly once (measured, test 4's `built-in-keys` measure line).
 * 6. **…so the "Showing x of y tasks" note (`team-tasks-page.tsx:341-344`) only appears when the platform answers
 *    fewer tasks than its own `total` and then stops**: `total > tasks.length` is false after paging repeated pages,
 *    which is why the note appeared nowhere in the probes (U1 `SHOWING_OF` count 0 for both 2-of-2 and 2-of-5).
 * 7. **Nothing validates a saved-view answer.** `task-views.service.ts:59-63` hands `response.data` straight to
 *    `SavedViewPage` (`task-view-route.tsx:61-74`): an answer of `{}` drew the plain `Team's tasks` heading
 *    (`sidebar.TEAMTASKS`), an answer of `{ id: 'x1', name: 'Answer name' }` drew that name, and neither produced a
 *    notice, a console error or a page error (test 9). `ITaskView`
 *    (`core/types/interfaces/common/task-views.ts:33-55`) is what the answer is typed as; nothing checks it, so the
 *    page is drawn from whatever arrived.
 * 8. **A view of a team the member is not in is indistinguishable from a missing one here.** `OtherTeamView`
 *    (`task-view-route.tsx:42-59`) looks for the view's `organizationTeamId` in the shell's team list; this lane's
 *    mock answers exactly one team (`mock-gauzy-server.mjs:655`), so the branch at `:48-49` prints
 *    `NOT_FOUND_TITLE` / `NOT_FOUND_TEXT` and the `SWITCH_TEAM` button (`:51-58`) never exists — probed directly in
 *    `probe-2.log` P6, where a stub offering two teams still left the button absent until the probe timed out
 *    (test 8 pins the notice and pins the button's absence).
 * 9. **A created view lands on its own page.** `useSavedViewCommands`' create (`use-saved-view-commands.ts:108-122`)
 *    navigates to `/views/<the id the platform answered>`, and the index lists the new row afterwards (test 10, and
 *    `probe-4.log` R4 / `probe-5.log` S4). An index with no views offers `New view` twice — the toolbar's
 *    (`views-page.tsx:113`) and `SavedViewsEmpty`'s own action (`views-index-parts.tsx:174-189`).
 * 10. **Every write carries `expectedVersion`, and a 409 is told apart from any other failure.**
 *     `use-task-view-actions.ts:94-154` sends it; `conflictOf` (`:26-35`) turns a 409 into
 *     `TaskViewConflictError` (`:19-24`). On the index that is `CONFLICT_IN_LIST` plus a re-read of the view and of
 *     the list; on a view page it is `CONFLICT`, whose toast carries the `Reload` button, with the page left dirty;
 *     a 500 is `SAVE_FAILED` with no re-read at all (`refused-rename` and `refused-page-writes` measure lines).
 *     A refused create (400 / 403 / 500) keeps the dialog open and the store untouched (`CREATE_FAILED`).
 * 11. **`DELETE` carries no body** (`task-views.service.ts:75-77`, measured `postData()` null), a cancelled confirm
 *     sends nothing at all, and `confirmRemove` (`use-saved-view-commands.ts:178-191`) pushes `/views` only on
 *     success — a refused delete leaves the member on the view page (test 12, test 16).
 * 12. **The dialog refuses a blank name before any request**: `!name.trim()` disables the submit
 *     (`save-view-dialog.tsx:87`, `:48`), `maxLength={80}` caps it (`:73`), and the rename dialog opens *prefilled*
 *     with the current name, so its Save is ready immediately (`probe-3.log` Q5: enabled with the initial name,
 *     disabled with an empty one) (tests 10, 11).
 * 13. **The client logs a refused call as its own line**, naming the path without the `/api` prefix and keeping the
 *     search percent-encoded — `armedHttpError` above restates exactly those lines and nothing else is excused; the
 *     dev-mode `DEV Query failed` toast is reported, not asserted (test 6).
 *
 * ## What this file does not cover
 *
 * - **Manual order, and the whole `PUT /task-views/<id>/order` path** (`task-views.service.ts:79-83`, the move queue
 *   and its single rebase after a 409 in `use-task-view-actions.ts:156-295`). Unreachable on this lane, measured:
 *   the views index has no reorder command at all (`use-saved-view-list-commands.ts:33,52,72` are rename, share,
 *   delete); the task list's row menu needs `canReorder` (`core/hooks/tasks/use-team-tasks-view.ts:242`:
 *   `manualOrder !== undefined && settings.ordering === 'manual'`) **and** a group of at least two tasks
 *   (`team-tasks-page.tsx:287,292`), and the mock lists exactly one task for the team
 *   (`mock-gauzy-server.mjs:677-678`). Stubbing `/api/tasks/team` with two tasks did not take over the mock's own
 *   handler (`probe-3.log` Q8), and the served views carry `manualOrder: null`.
 * - **`/team/tasks`' bulk toolbar** (`POST /tasks/bulk-update`, `task-views.service.ts:116-117`) — out of this brief;
 *   only its route is stubbed here so a stray call cannot land on the mock's catch-all.
 * - **The Next.js proxy of these routes** (`app/api/task-views/route.ts`, `app/api/task-views/[id]/route.ts`,
 *   `app/api/task-views/[id]/order/route.ts`): on this lane the client talks to the mock origin directly, and
 *   `recordBrowserCalls` recorded no `app/api/**` task-views call.
 * - **The other layouts and the editing behind the Display menu** (Kanban / Calendar / Table / Timeline of a saved
 *   view, grouping, ordering, properties, filters): test 13 changes the scope tab only, because that is the change
 *   the toolbar reports as `UNSAVED` without opening a panel.
 * - **`Mod+S`** (`use-saved-view-commands.ts:205-217`), the sidebar's own Views group beyond the list read it
 *   triggers (`app-sidebar.tsx:132,412-428`), and anything needing a second tenant, organization or workspace: the
 *   lane's mock answers one of each (`cypress/fixtures/bootstrap.json`).
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const VIEWS_ROUTE = '/api/task-views';
const BUILT_IN_ROUTE = '/api/tasks/built-in';
const BULK_ROUTE = '/api/tasks/bulk-update';
/** The same paths as the client's own log line names them: its axios base already carries `/api`. */
const LOGGED_VIEWS_ROUTE = '/task-views';
const LOGGED_BUILT_IN_ROUTE = '/tasks/built-in';

/** `locales/en.json`: `taskViews` (its 74 keys), plus the shared copy the notices and the list borrow. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	taskViews: Record<string, string>;
	common: { CLEAR: string; CLEAR_FILTERS: string; CANCEL: string };
	sidebar: { TEAMTASKS: string };
	dashboard: { states: { ERROR_TITLE: string; ERROR_MESSAGE: string } };
	pages: {
		unauthorized: { TRY_AGAIN: string };
		error: { HEADING_TITLE: string; HEADING_DESCRIPTION: string };
		teamTasks: {
			LAYOUT_LIST: string;
			META_TASKS: string;
			NEW_TASK: string;
			SHOW_ALL_TASKS: string;
			SCOPE_ACTIVE: string;
			SCOPE_ALL: string;
			SCOPE_DONE: string;
			ACTIVE_EMPTY_TITLE: string;
			ACTIVE_EMPTY_MESSAGE: string;
		};
	};
};
const T = EN.taskViews;
/** The layout switch's first label, which every saved-view row carries (`pages.teamTasks.LAYOUT_LIST`). */
const LAYOUT_LIST = EN.pages.teamTasks.LAYOUT_LIST;
const filled = (key: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), T[key]);
/**
 * One of the locale's ICU plural strings, read out as next-intl renders it: `taskViews.SAVED_COUNT` is
 * `{count, plural, =0 {No saved views} one {# saved view} other {# saved views}}`, `pages.teamTasks.META_TASKS`
 * `{count, plural, one {# task} other {# tasks}}` — so the copy still comes from the file, never from this one.
 */
const pluralOf = (template: string, count: number) => {
	const branch = (count === 1 ? /one\s*\{([^{}]*)\}/ : /other\s*\{([^{}]*)\}/).exec(template);
	if (!branch) throw new Error(`no plural branch for ${count} in ${template}`);
	return branch[1].replaceAll('#', String(count));
};

const report = (label: string, value: unknown) =>
	console.log(`[lane-c task-views] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** A view as this file serves it: `ITaskView` (`core/types/interfaces/common/task-views.ts:33-55`). */
type ServedView = {
	id: string;
	name: string;
	description: string | null;
	visibility: 'personal' | 'shared';
	version: number;
	organizationTeamId: string | null;
	organizationId: string;
	tenantId: string;
	createdByUserId: string;
	filterOptions: Record<string, unknown> | null;
	displayOptions: Record<string, unknown> | null;
	queryParams: Record<string, unknown> | null;
	manualOrder: string[] | null;
	createdAt: string;
	updatedAt: string;
};

/** A task of a built-in view: the shape `mock-gauzy-server.mjs:183-196` answers the team's tasks with. */
type ServedTask = {
	id: string;
	title: string;
	number: number;
	status: string;
	taskStatusId: string;
	estimate: number;
	organizationId: string;
	tenantId: string;
	members: unknown[];
	tags: unknown[];
	teams: Array<{ id: string; name: string }>;
};

/** A refusal this file arms on the fake platform. */
type Refusal = { status: number; message?: string };

type ServedScript = {
	views?: ServedView[];
	builtIn?: { items: ServedTask[]; total?: number };
	listRefusal?: Refusal;
	detailRefusal?: Refusal;
	builtInRefusal?: Refusal;
	createRefusal?: Refusal;
	updateRefusal?: Refusal;
	removeRefusal?: Refusal;
	orderRefusal?: Refusal;
	/** An answer for one view's read that is not an `ITaskView` at all (test 9). */
	detailAnswer?: unknown;
};

type ServedCall = { method: string; path: string; search: string; body: string | null; url: string };

type TaskViewsHarness = {
	calls: ServedCall[];
	/** The views this file's fake platform holds: a create adds, a delete removes, a refusal changes nothing. */
	items: ServedView[];
	shapes: () => string[];
	countOf: (method: string, path: string) => number;
	pathOf: (id: string) => string;
	/** What a built-in page was answered with, in the order it was asked (its own paging shows here). */
	builtInReads: () => Array<{ path: string; search: string }>;
	/** Drops this file's answers again, so the next test on the same page can arm a different script. */
	unroute: () => Promise<void>;
};

/**
 * This file's stand-in for the platform's saved views and built-in views, on the mock origin, because the mock has no
 * handler for any of it (see the header). The list answer is always the current store, so a rename, a share or a
 * delete can be followed by the re-read the shell makes and no longer hold the old row — the only way to tell "the row
 * is gone" apart from "the platform still says it exists". `route.fetch()` is never called, so the mock never hears it.
 */
async function serveTaskViews(page: Page, initial: ServedScript): Promise<TaskViewsHarness> {
	const store = { views: [...(initial.views ?? [])] };
	const calls: ServedCall[] = [];
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname.startsWith(VIEWS_ROUTE) ||
			url.pathname.startsWith(BUILT_IN_ROUTE) ||
			url.pathname === BULK_ROUTE);

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({
			method,
			path: url.pathname,
			search: decodeURIComponent(url.search),
			body: request.postData(),
			url: request.url()
		});
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const answerRefusal = (item: Refusal) =>
			answer(item.status, { statusCode: item.status, message: item.message ?? 'this file refused the call' });
		const bodyOf = () => JSON.parse(String(request.postData())) as Record<string, unknown>;

		if (url.pathname === VIEWS_ROUTE && method === 'GET') {
			if (initial.listRefusal) return answerRefusal(initial.listRefusal);
			return answer(200, { items: store.views, total: store.views.length });
		}
		if (url.pathname === VIEWS_ROUTE && method === 'POST') {
			if (initial.createRefusal) return answerRefusal(initial.createRefusal);
			const created = {
				id: `bbbb0000-0000-4000-8000-0000000000${store.views.length + 20}`,
				version: 1,
				createdAt: dayIso(0),
				updatedAt: dayIso(0),
				...bodyOf()
			} as ServedView;
			store.views = [...store.views, created];
			return answer(201, created);
		}
		if (url.pathname.startsWith(`${VIEWS_ROUTE}/`)) {
			const [id, sub] = url.pathname.slice(VIEWS_ROUTE.length + 1).split('/');
			const found = store.views.find((view) => view.id === id);
			if (sub === 'order' && method === 'PUT') {
				if (initial.orderRefusal) return answerRefusal(initial.orderRefusal);
				const ordered = { ...found, ...bodyOf(), version: (found?.version ?? 0) + 1 } as ServedView;
				store.views = store.views.map((view) => (view.id === id ? ordered : view));
				return answer(200, ordered);
			}
			if (method === 'GET') {
				if (initial.detailRefusal) return answerRefusal(initial.detailRefusal);
				if (!found) return answer(404, { statusCode: 404, message: 'Not Found' });
				return answer(200, initial.detailAnswer ?? found);
			}
			if (method === 'PUT') {
				if (initial.updateRefusal) return answerRefusal(initial.updateRefusal);
				const saved = { ...found, ...bodyOf(), version: (found?.version ?? 0) + 1 } as ServedView;
				store.views = store.views.map((view) => (view.id === id ? saved : view));
				return answer(200, saved);
			}
			if (method === 'DELETE') {
				if (initial.removeRefusal) return answerRefusal(initial.removeRefusal);
				store.views = store.views.filter((view) => view.id !== id);
				return answer(204);
			}
		}
		if (url.pathname.startsWith(BUILT_IN_ROUTE) && method === 'GET') {
			if (initial.builtInRefusal) return answerRefusal(initial.builtInRefusal);
			const items = initial.builtIn?.items ?? [];
			return answer(200, { items, total: initial.builtIn?.total ?? items.length });
		}
		return answer(599, { message: `this file scripted no answer for ${method} ${url.pathname}` });
	});

	return {
		calls,
		get items() {
			return store.views;
		},
		shapes: () =>
			calls.map(
				(call) => `${call.method} ${call.path}${call.search}${call.body === null ? '' : ` ${call.body}`}`
			),
		countOf: (method, path) => calls.filter((call) => call.method === method && call.path === path).length,
		pathOf: (id) => `${VIEWS_ROUTE}/${id}`,
		builtInReads: () =>
			calls
				.filter((call) => call.path.startsWith(BUILT_IN_ROUTE))
				.map((call) => ({ path: call.path, search: call.search })),
		unroute: () => page.unroute(matcher)
	};
}

/** Only records: what the browser really sent, split by origin. Nothing is answered here. */
function recordBrowserCalls(page: Page) {
	const mockCalls: Array<{ method: string; path: string; search: string }> = [];
	const appCalls: Array<{ method: string; path: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN) {
			mockCalls.push({ method: request.method(), path: url.pathname, search: decodeURIComponent(url.search) });
		}
		if (url.origin === APP_ORIGIN && url.pathname.startsWith('/api/')) {
			appCalls.push({ method: request.method(), path: url.pathname });
		}
	});
	const viewsCalls = () => mockCalls.filter((call) => /task-views|built-in/.test(call.path));
	return { mockCalls, appCalls, viewsCalls };
}

/** A served date at local noon, so a rendered relative time cannot straddle a day boundary. */
const dayIso = (offsetDays: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offsetDays);
	return day.toISOString();
};

const viewOf = (
	fixture: BootstrapFixture,
	id: string,
	name: string,
	overrides: Partial<ServedView> = {}
): ServedView => ({
	id,
	name,
	description: null,
	visibility: 'personal',
	version: 1,
	organizationTeamId: fixture.ids.teamA,
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA,
	createdByUserId: fixture.ids.user,
	filterOptions: null,
	displayOptions: null,
	queryParams: null,
	manualOrder: null,
	createdAt: dayIso(-10),
	updatedAt: dayIso(-5),
	...overrides
});

const taskOf = (
	fixture: BootstrapFixture,
	id: string,
	title: string,
	number: number,
	status: 'open' | 'in-progress'
): ServedTask => ({
	id,
	title,
	number,
	status,
	taskStatusId: status === 'open' ? fixture.ids.todoStatus : fixture.ids.inProgressStatus,
	estimate: 3600,
	organizationId: fixture.ids.organizationA,
	tenantId: fixture.ids.tenantA,
	members: [],
	tags: [],
	teams: [{ id: fixture.ids.teamA, name: fixture.names.teamA }]
});

/**
 * The definition a team tasks page holds before anyone changed anything: `DEFAULT_TASK_VIEW_DEFINITION`
 * (`core/types/interfaces/common/task-views.ts:19-24`) through `columnsOf` (`task-views.ts:55-63`). Pinned from the
 * bodies the browser really sent (`probe-3.log` Q9, `probe-4.log` R4, `probe-6.log` U3) — tests 10 and 13 compare the
 * whole create / save body against it, so a changed default fails here rather than quietly.
 */
const DEFAULT_DISPLAY_OPTIONS = {
	grouping: 'status',
	ordering: 'priority',
	isDescending: false,
	showsSubTasks: true,
	showsEmptyGroups: false,
	properties: {
		number: true,
		issueType: true,
		priority: true,
		status: true,
		parent: true,
		labels: true,
		size: false,
		project: true,
		progress: true,
		dueDate: true,
		created: false,
		assignees: true
	}
} as const;

/** React's dev-mode store warning, not this page's (see `suites/lane-a/api-tokens-settings-ui.spec.ts:366-372`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The dev-mode query/mutation fallbacks print these for a failed read or write (`DEV Query failed`, `DEV Mutation failed`). */
const DEV_TOAST_NOISE = 'Copy details';

/**
 * The client's own line for a refusal this file armed. It names the path as its axios base names it (no leading
 * `/api`) and keeps the search percent-encoded exactly as it was sent (measured in `probe-2.log` P5 and P10).
 */
const armedHttpError = (verb: string, path: string, status: number) =>
	status === 403
		? `[ERROR] [HttpClient] 🚨 CRITICAL: HTTP 403 Forbidden - ${verb} ${path} - Permission Denied`
		: `[ERROR] [HttpClient] HTTP Error: ${verb} ${path} ${status}`;
const encoded = (search: string) => search.replace(/\[/g, '%5B').replace(/\]/g, '%5D').replace(/\//g, '%2F');

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** Where each copy element must be looked for (a `Page` or a dialog `Locator`). */
type TextScope = { getByText: (text: string, options?: { exact?: boolean }) => Locator };

const sentence = (scope: TextScope, value: string) => scope.getByText(value, { exact: true });
const heading = (page: Page, level: 1 | 2 | 3, name: string) =>
	page.getByRole('heading', { level, name, exact: level !== 2 });
/** `views-index-parts.tsx:35` uppercases the two section titles through CSS, so their accessible name is uppercase. */
const sectionHeading = (page: Page, text: string) => page.getByRole('heading', { level: 2, name: text });
const builtInCards = (page: Page) => page.locator('[data-testid^="built-in-view-"]');
const savedRows = (page: Page) => page.locator('[data-testid="saved-view"]');
const rowActionsButton = (page: Page, name: string) =>
	page.getByRole('button', { name: filled('ACTIONS_OF', { name }), exact: true });
const noticeTitle = (page: Page, title: string) => page.getByRole('heading', { level: 3, name: title, exact: true });
const backToViewsLink = (page: Page) => page.getByRole('link', { name: T.BACK_TO_VIEWS, exact: true });
const filterTabs = (page: Page) =>
	page.getByRole('tab').evaluateAll((nodes) =>
		nodes.map((node) => ({
			label: node.textContent?.trim() ?? '',
			selected: node.getAttribute('aria-selected')
		}))
	);
const rowLinkHrefs = async (page: Page) =>
	savedRows(page)
		.locator('a')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href') ?? ''));
const dialogOf = (page: Page) => page.getByRole('dialog');
const devToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasText: DEV_TOAST_NOISE });
const appToasts = (page: Page) => page.locator('[data-sonner-toast]').filter({ hasNotText: DEV_TOAST_NOISE });
const toastTexts = async (page: Page) =>
	appToasts(page)
		.allInnerTexts()
		.then((all) => all.map(flat));
/** The task rows of a list: the table's header row and the group headers carry no `#<number>`. */
const taskRowTexts = async (page: Page) =>
	page
		.locator('[role="row"]')
		.allInnerTexts()
		.then((all) => all.map(flat).filter((text) => text.includes('#')));

/** The list read's query, as `taskViewsService.list` builds it (`task-views.service.ts:43-57`). */
const listSearch = (fixture: BootstrapFixture) =>
	`?where[organizationId]=${fixture.ids.organizationA}&where[tenantId]=${fixture.ids.tenantA}&where[organizationTeamId]=${fixture.ids.teamA}&take=100&skip=0`;
/** One view's query (`task-views.service.ts:59-63`). */
const detailSearch = (fixture: BootstrapFixture) =>
	`?where[organizationId]=${fixture.ids.organizationA}&where[tenantId]=${fixture.ids.tenantA}`;
/**
 * The zone the browser sends: Playwright starts it without a `timezoneId`, so it is the host's, the same one this Node
 * process resolves (measured `Europe/Madrid` on FRAKTAL). Read here rather than written down, so another runner's zone
 * does not fail the query pins.
 */
const BROWSER_ZONE = Intl.DateTimeFormat().resolvedOptions().timeZone;
/** A built-in page's query (`task-views.service.ts:87-96`, `BUILT_IN_RELATIONS` at `:28`); the zone is the lane browser's own. */
const builtInSearch = (fixture: BootstrapFixture) =>
	`?organizationId=${fixture.ids.organizationA}&tenantId=${fixture.ids.tenantA}&timeZone=${BROWSER_ZONE}&take=200&skip=0` +
	'&relations[]=members&relations[]=members.user&relations[]=tags&relations[]=project&relations[]=taskStatus&relations[]=taskPriority&relations[]=taskSize';

test.describe('lane-c · the views index and a view page: what they show and what the browser sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ---------------------------------------------------------------- 1. the lane exactly as it is: the switch is off

	test('1 · the lane as it is: both pages say the views are not available and ask nothing of the platform', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, '/views');

		// views-page.tsx:83-94 (!isTaskViewsEnabled()) → AnimatedEmptyState(UNAVAILABLE_TITLE, UNAVAILABLE_TEXT)
		await expect(
			noticeTitle(page, T.UNAVAILABLE_TITLE),
			'the views index rendered no unavailable notice'
		).toBeVisible({ timeout: 25_000 });
		await expect(sentence(page, T.UNAVAILABLE_TEXT)).toBeVisible();
		await expect(
			noticeTitle(page, T.UNAVAILABLE_TITLE).locator('xpath=../..'),
			'the notice is not the title + message pair the page builds'
		).toContainText(`${T.UNAVAILABLE_TITLE}`);
		await expect(
			sectionHeading(page, T.BUILT_IN),
			'the built-in section was drawn although the views are off'
		).toHaveCount(0);
		await expect(builtInCards(page), 'a built-in card appeared although the views are off').toHaveCount(0);
		await expect(savedRows(page), 'a saved view row appeared although the views are off').toHaveCount(0);
		await expect(sentence(page, T.NEW_VIEW), 'New view was offered although the views are off').toHaveCount(0);
		await expect(
			sentence(page, T.SEARCH_PLACEHOLDER),
			'the search field appeared although the views are off'
		).toHaveCount(0);

		// task-view-route.tsx:98-99 refuses the same way before it even reads the route segment
		await hardVisit(page, '/views/mine');
		await expect(noticeTitle(page, T.UNAVAILABLE_TITLE), '/views/mine rendered no unavailable notice').toBeVisible({
			timeout: 25_000
		});
		await expect(sentence(page, T.UNAVAILABLE_TEXT)).toBeVisible();
		// ViewNotice's way back (:33-35), which the index itself does not offer
		await expect(backToViewsLink(page), 'the view notice offered no way back to /views').toHaveCount(1);
		await expect(builtInCards(page), 'a built-in card appeared on a switched-off view page').toHaveCount(0);

		// the hooks keep every read off with the flag: use-task-views-query.ts:17, use-built-in-view-tasks.ts:19
		await expect.poll(() => calls.viewsCalls().length, { timeout: 10_000 }).toBe(0);
		expect(
			calls.appCalls.map((call) => call.path),
			'a task-views call went to a Next route'
		).not.toContain(VIEWS_ROUTE);
		expect((await mock.calls(VIEWS_ROUTE)).length, 'the mock heard a task-views call').toBe(0);

		const payload = await page.evaluate(() => {
			const raw = document.documentElement.getAttribute('data-ever-teams-runtime-env') ?? '';
			const env = raw ? (JSON.parse(raw) as Record<string, string>) : {};
			return { keys: Object.keys(env).length, flag: env.NEXT_PUBLIC_TASK_VIEWS_ENABLED ?? null };
		});
		report('lane-as-it-is', {
			indexNotice: flat(await noticeTitle(page, T.UNAVAILABLE_TITLE).locator('xpath=../..').innerText()),
			runtimeEnvPayload: payload,
			browserMockCalls: calls.mockCalls.map((call) => `${call.method} ${call.path}`),
			appApiCalls: [...new Set(calls.appCalls.map((call) => `${call.method} ${call.path}`))],
			backToViewsLinks: await backToViewsLink(page).count(),
			consoleErrors: shield.consoleErrors(),
			pageErrors: shield.pageErrors()
		});
		expect(payload.flag, 'the lane really does leave the flag out').toBeNull();
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	// ---------------------------------------------------------------- 2. switch on, no stub: the mock's catch-all

	test('2 · the switch on with no stub: the built-in cards, the empty saved-views state, one list read', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const calls = recordBrowserCalls(page);
		await signInAndVisit(page, fixture, '/views');

		await expect(heading(page, 1, T.TITLE)).toBeVisible({ timeout: 25_000 });
		// TASK_BUILT_IN_VIEWS (task-views.ts) → BuiltInViewCard (views-index-parts.tsx:54-75): name + the rule it lists by
		await expect(builtInCards(page)).toHaveCount(4);
		await expect
			.poll(
				() =>
					builtInCards(page).evaluateAll((nodes) =>
						nodes.map((node) => `${node.getAttribute('href')} :: ${node.textContent?.trim() ?? ''}`)
					),
				{ timeout: 15_000 }
			)
			.toEqual([
				`/views/mine :: ${T.BUILT_IN_MINE}${T.RULE_MINE}`,
				`/views/this-week :: ${T.BUILT_IN_THIS_WEEK}${T.RULE_THIS_WEEK}`,
				`/views/overdue :: ${T.BUILT_IN_OVERDUE}${T.RULE_OVERDUE}`,
				`/views/due-soon :: ${T.BUILT_IN_DUE_SOON}${T.RULE_DUE_SOON}`
			]);

		// the mock's catch-all `pagination([])` (mock-gauzy-server.mjs:897,9) is a usable ITaskViewList → the empty state
		await expect(sentence(page, T.EMPTY_TITLE)).toBeVisible();
		await expect(sentence(page, T.EMPTY_TEXT)).toBeVisible();
		await expect(savedRows(page), 'an empty list drew a row').toHaveCount(0);
		await expect(sentence(page, T.NO_MATCH_TITLE), 'the no-match state was drawn over an empty list').toHaveCount(
			0
		);
		await expect(sectionHeading(page, T.SAVED), 'the saved-views section was not drawn').toHaveCount(1);
		// an empty index offers New view twice: the toolbar's (`views-page.tsx:113`) and `SavedViewsEmpty`'s own action
		// (`views-index-parts.tsx:174-189`, the same button in the sentence measured in probe-2.log P1)
		await expect(
			page.getByRole('button', { name: T.NEW_VIEW, exact: true }),
			'an empty index lost a New view'
		).toHaveCount(2);
		await expect(page.getByRole('link', { name: T.NEW_VIEW, exact: true })).toHaveCount(0);

		await expect
			.poll(() => calls.viewsCalls(), { timeout: 15_000 })
			.toEqual([{ method: 'GET', path: VIEWS_ROUTE, search: listSearch(fixture) }]);
		expect(
			(await mock.calls(VIEWS_ROUTE)).map((request) => [request.method, request.path, request.status]),
			'the mock did not answer its own catch-all'
		).toEqual([['GET', VIEWS_ROUTE, 200]]);

		report('switch-on-no-stub', {
			heading: await heading(page, 1, T.TITLE).innerText(),
			cards: await builtInCards(page).evaluateAll((nodes) =>
				nodes.map((node) => `${node.getAttribute('href')} :: ${node.textContent?.trim() ?? ''}`)
			),
			sections: (await page.locator('section').allInnerTexts()).map(flat),
			tabs: await filterTabs(page),
			calls: calls.viewsCalls(),
			mockLogged: (await mock.calls(VIEWS_ROUTE)).map((item) => `${item.method} ${item.path} ${item.status}`),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 3. the index of three served views

	test('3 · a served index of three views: sidebar order, each row, the search and the filter', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const served = await serveTaskViews(page, {
			views: [
				viewOf(fixture, 'bbbb0000-0000-4000-8000-0000000000a1', 'Bugs this sprint', { visibility: 'personal' }),
				viewOf(fixture, 'bbbb0000-0000-4000-8000-0000000000a2', 'Design review', {
					visibility: 'shared',
					description: 'UI tasks waiting for a review'
				}),
				viewOf(fixture, 'bbbb0000-0000-4000-8000-0000000000a3', 'Anything first', { visibility: 'shared' })
			]
		});
		await signInAndVisit(page, fixture, '/views');

		await expect(savedRows(page)).toHaveCount(3, { timeout: 25_000 });
		// sortTaskViews (task-views.ts:89-95): shared first by name, then personal — not the order the platform sent them
		await expect
			.poll(
				() =>
					savedRows(page)
						.allInnerTexts()
						.then((all) => all.map(flat)),
				{ timeout: 15_000 }
			)
			.toEqual([
				`Anything first ${LAYOUT_LIST} ${T.SHARED} Updated 5 days ago`,
				`Design review UI tasks waiting for a review ${LAYOUT_LIST} ${T.SHARED} Updated 5 days ago`,
				`Bugs this sprint ${LAYOUT_LIST} ${T.PERSONAL} Updated 5 days ago`
			]);
		await expect(await rowLinkHrefs(page), 'a row does not link to its own view page').toEqual([
			`/views/bbbb0000-0000-4000-8000-0000000000a3`,
			`/views/bbbb0000-0000-4000-8000-0000000000a2`,
			`/views/bbbb0000-0000-4000-8000-0000000000a1`
		]);
		for (const name of ['Anything first', 'Design review', 'Bugs this sprint']) {
			await expect(rowActionsButton(page, name), `the row menu of ${name} is missing`).toHaveCount(1);
		}
		// the toolbar's meta line, measured whole in `probe-6.log` U2 as `Views 3 saved views New view`
		await expect(sentence(page, pluralOf(T.SAVED_COUNT, 3))).toBeVisible();
		// SegmentedControl (views-page.tsx:121-126): a tablist named FILTER_LABEL, each tab carrying its count
		await expect
			.poll(() => filterTabs(page), { timeout: 15_000 })
			.toEqual([
				{ label: `${T.FILTER_ALL}3`, selected: 'true' },
				{ label: `${T.PERSONAL}1`, selected: 'false' },
				{ label: `${T.SHARED}2`, selected: 'false' }
			]);
		await expect(sentence(page, T.EMPTY_TITLE), 'a list of three drew the empty state').toHaveCount(0);

		// savedViewsShownOf (task-views-index.ts:18-31): the search matches the name and the description, any case
		const search = page.getByRole('searchbox');
		await search.fill('design');
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(1);
		await expect(savedRows(page).first()).toContainText('Design review');
		await expect(sentence(page, filled('SHOWING', { shown: 1, total: 3 }))).toBeVisible();
		// the × inside the field (views-page.tsx:47-56), named common.CLEAR
		await expect(page.getByRole('button', { name: EN.common.CLEAR, exact: true })).toHaveCount(1);

		await search.fill('UI TASKS');
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(1);
		await search.fill('roadmap');
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(0);
		// SavedViewsNoMatch (views-index-parts.tsx:191-202)
		await expect(sentence(page, T.NO_MATCH_TITLE)).toBeVisible();
		await expect(sentence(page, T.NO_MATCH_TEXT)).toBeVisible();
		await expect(
			sentence(page, T.EMPTY_TITLE),
			'the empty state was drawn over a list that was only narrowed'
		).toHaveCount(0);
		await page.getByRole('button', { name: T.CLEAR_SEARCH, exact: true }).click();
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(3);
		await expect(search).toHaveValue('');

		// the visibility filter, on top of an empty search. Each tab's accessible name carries its count (`All3`,
		// `Only me1`, `The team2` — measured whole in probe-3.log Q2), so the click matches the label, not exactly.
		await page.getByRole('tab', { name: T.PERSONAL }).click();
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(1);
		await expect(savedRows(page).first()).toContainText('Bugs this sprint');
		await expect(sentence(page, filled('SHOWING', { shown: 1, total: 3 }))).toBeVisible();
		await page.getByRole('tab', { name: T.FILTER_ALL }).click();
		await expect.poll(() => savedRows(page).count(), { timeout: 10_000 }).toBe(3);

		expect(served.shapes(), 'the index wrote something, or read the list more than once').toEqual([
			`GET ${VIEWS_ROUTE}${listSearch(fixture)}`
		]);
		expect((await mock.calls(VIEWS_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('index-of-three', {
			rows: (await savedRows(page).allInnerTexts()).map(flat),
			hrefs: await rowLinkHrefs(page),
			tabs: await filterTabs(page),
			calls: served.shapes(),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 4. the four built-in views

	/** `taskViews.BUILT_IN_*` / `EMPTY_*` / `RULE_*` for a built-in key (`mine` → `BUILT_IN_MINE`). */
	const builtInKeys = (key: string) => {
		const tail = key.toUpperCase().replace('-', '_');
		return { label: T[`BUILT_IN_${tail}`], rule: T[`RULE_${tail}`], empty: T[`EMPTY_${tail}`] };
	};

	test('4 · each built-in key opens its page: its name, the one read it sends, the tasks it lists', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		// `total` is the number of items on purpose: the built-in page keeps asking while it holds fewer tasks than the
		// total it was told about — measured in `probe-6.log` U1 (items 2 / total 5 → three reads, `skip=0`, `skip=2`,
		// `skip=4`, the same two tasks listed six times, the toolbar reading `6 tasks`). Asked an honest page it asks once.
		const served = await serveTaskViews(page, {
			builtIn: {
				items: [
					taskOf(fixture, 'cccc0000-0000-4000-8000-0000000000c1', 'Probe overdue task', 41, 'open'),
					taskOf(fixture, 'cccc0000-0000-4000-8000-0000000000c2', 'Probe due soon task', 42, 'in-progress')
				],
				total: 2
			}
		});
		for (const key of ['mine', 'this-week', 'overdue', 'due-soon'] as const) {
			await signInAndVisit(page, fixture, `/views/${key}`);
			const { label } = builtInKeys(key);
			// the built-in card's name is the page's own h1 (team-tasks-toolbar.tsx:269 via useViewTitle)
			await expect(
				page.getByRole('heading', { level: 1, name: label, exact: true }),
				`${key}: the page heading is not the built-in card's name`
			).toBeVisible({ timeout: 25_000 });
			await expect(
				page.locator('nav').first(),
				`${key}: the breadcrumb is not Views → this view (measured whole in probe-3.log Q3)`
			).toContainText(label);
			// the one read this key sends, with the query `taskViewsService.builtIn` builds
			await expect
				.poll(() => served.builtInReads().filter((read) => read.path === `${BUILT_IN_ROUTE}/${key}`).length, {
					timeout: 15_000
				})
				.toBe(1);
			const read = served.builtInReads().find((item) => item.path === `${BUILT_IN_ROUTE}/${key}`);
			expect(read?.search, `${key}: the built-in read is not the query of task-views.service.ts:87-96`).toBe(
				builtInSearch(fixture)
			);
			// the tasks it was answered with, grouped by status the way the list groups them
			await expect
				.poll(() => taskRowTexts(page), { timeout: 15_000 })
				.toEqual(['#41 Probe overdue task 0h 0m / 1h 0m', '#42 Probe due soon task 0h 0m / 1h 0m']);
			await expect(sentence(page, pluralOf(EN.pages.teamTasks.META_TASKS, 2))).toBeVisible();
			expect(
				served.calls.some((call) => call.method !== 'GET'),
				`${key}: opening a built-in view wrote something`
			).toBe(false);
		}
		expect((await mock.calls(BUILT_IN_ROUTE)).length, 'the mock heard a built-in call this file answered').toBe(0);

		report('built-in-keys', {
			reads: served.builtInReads(),
			rows: await taskRowTexts(page),
			toolbar: flat(await page.locator('h1').locator('xpath=../..').innerText()),
			pagingOfAnOverstatedTotal:
				'probe-6.log U1: items 2 / total 5 → skip=0, skip=2, skip=4 and the rows repeated',
			calls: served.shapes().map((shape) => shape.slice(0, 60)),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'a built-in page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 5. a built-in view with nothing in it

	test('5 · a built-in view that holds no task: it says what it looked for, not that the team is empty', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const served = await serveTaskViews(page, { builtIn: { items: [], total: 0 } });
		for (const key of ['mine', 'this-week', 'overdue', 'due-soon'] as const) {
			await signInAndVisit(page, fixture, `/views/${key}`);
			const { label, empty } = builtInKeys(key);
			await expect(
				page.getByRole('heading', { level: 1, name: label, exact: true }),
				`${key}: an empty built-in view lost its own heading`
			).toBeVisible({ timeout: 25_000 });
			// TeamTasksViewEmpty (team-tasks-states.tsx:56-64): VIEW_EMPTY_TITLE + that built-in's own sentence
			await expect(
				noticeTitle(page, T.VIEW_EMPTY_TITLE),
				`${key}: an empty built-in view rendered no empty notice`
			).toBeVisible({ timeout: 25_000 });
			await expect(sentence(page, empty), `${key}: the empty sentence is not the built-in's own`).toBeVisible();
			await expect(
				sentence(page, EN.pages.teamTasks.ACTIVE_EMPTY_TITLE),
				`${key}: an empty built-in view said the team has nothing in progress`
			).toHaveCount(0);
			await expect(
				sentence(page, EN.pages.teamTasks.ACTIVE_EMPTY_MESSAGE),
				`${key}: an empty built-in view spoke about the team, not about the view`
			).toHaveCount(0);
			await expect(await taskRowTexts(page), `${key}: an empty view listed a task`).toEqual([]);
			// the plain team's empty state ends with a "Show all tasks" action; this one has none
			await expect(
				page.getByRole('button', { name: EN.pages.teamTasks.SHOW_ALL_TASKS, exact: true }),
				`${key}: an empty built-in view offered the team's action`
			).toHaveCount(0);
		}
		expect(
			served.calls.some((call) => call.method !== 'GET'),
			'an empty view wrote something'
		).toBe(false);
		report('built-in-empty', {
			emptySentences: ['mine', 'this-week', 'overdue', 'due-soon'].map((key) => builtInKeys(key).empty),
			reads: served.builtInReads().map((read) => read.path),
			notices: await page.locator('main h3').allInnerTexts()
		});
		expect(consoleFindings(shield), 'an empty built-in page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 6. a built-in read that fails

	test('6 · a built-in read the platform refuses: the failure notice, and its retry asking again', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const served = await serveTaskViews(page, {
			views: [],
			builtInRefusal: { status: 500, message: 'this file refused the built-in read' }
		});
		await signInAndVisit(page, fixture, '/views/overdue');

		// bodyStateOf (team-tasks-page.tsx:119-133) → TeamTasksError (team-tasks-states.tsx:90-102)
		await expect(
			noticeTitle(page, EN.pages.error.HEADING_TITLE),
			'the refused built-in read rendered no failure notice'
		).toBeVisible({ timeout: 25_000 });
		await expect(sentence(page, EN.pages.error.HEADING_DESCRIPTION)).toBeVisible();
		await expect(sentence(page, T.VIEW_EMPTY_TITLE), 'a refused read was presented as an empty view').toHaveCount(
			0
		);
		await expect(
			sentence(page, EN.dashboard.states.ERROR_TITLE),
			"a refused built-in read used the views index's report notice instead"
		).toHaveCount(0);

		const retry = page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
		await expect(retry, 'the failure offers no retry').toHaveCount(1);
		const askedBefore = served.builtInReads().length;
		await retry.click();
		// BuiltInViewPage's refetch (task-view-route.tsx:87) plus the retry's own (team-tasks-page.tsx:378-381). The
		// count is not pinned beyond "it asked again": TanStack Query retries a failed read on its own schedule.
		await expect.poll(() => served.builtInReads().length, { timeout: 15_000 }).toBeGreaterThan(askedBefore);
		expect(
			served.calls.some((call) => call.method !== 'GET'),
			'a refused read wrote something'
		).toBe(false);

		report('built-in-refused', {
			notice: flat(await noticeTitle(page, EN.pages.error.HEADING_TITLE).locator('xpath=../..').innerText()),
			readsBeforeRetry: askedBefore,
			readsAfterRetry: served.builtInReads().length,
			// the dev-mode fallback toast the shell prints for a failed read, printed here because the page's own
			// notice — not a toast — is what the member is told (probe-2.log P10 shows the same pair)
			devFallbackToasts: await devToasts(page).allInnerTexts(),
			appToasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});
		const armed = armedHttpError('GET', `${LOGGED_BUILT_IN_ROUTE}/overdue${encoded(builtInSearch(fixture))}`, 500);
		expect(
			consoleFindings(shield, [armed]),
			'besides the HTTP error lines of the read this file refused, the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------------------------------------- 7. a saved view page

	test('7 · a saved view page: its title and breadcrumb, the one read of the view, the tasks it lists, its menu', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const id = 'bbbb0000-0000-4000-8000-0000000000e1';
		const served = await serveTaskViews(page, {
			views: [viewOf(fixture, id, 'Open view page', { visibility: 'shared', version: 3 })]
		});
		await signInAndVisit(page, fixture, `/views/${id}`);

		await expect(
			page.getByRole('heading', { level: 1, name: 'Open view page', exact: true }),
			"the view page heading is not the saved view's name"
		).toBeVisible({ timeout: 25_000 });
		await expect(page.locator('nav').first(), 'the breadcrumb does not lead back to the views').toContainText(
			T.TITLE
		);
		await expect(
			sentence(page, pluralOf(EN.pages.teamTasks.META_TASKS, 1)),
			'the meta line does not count the tasks'
		).toBeVisible();
		// a saved view's page lists the active team's tasks — the lane mock's own fixture task
		// (`mock-gauzy-server.mjs:183-196`, answered at `:677-678`), not anything this file served
		await expect(
			page.getByRole('row').filter({ hasText: 'Fixture active task' }),
			"the view page did not list the team's task"
		).toHaveCount(1);

		await expect.poll(() => served.countOf('GET', served.pathOf(id)), { timeout: 15_000 }).toBe(1);
		const detail = served.calls.find((call) => call.path === served.pathOf(id));
		expect(detail?.search, 'the view read is not the query of task-views.service.ts:59-63').toBe(
			detailSearch(fixture)
		);
		// the sidebar lists the saved views too (app-sidebar.tsx:132,412-428), so the index is read on this page as
		// well — only after the view's own read, because that read waits for tenant + organization + user + team
		// (use-task-views-scope.ts:18-31), which is why this is polled and not read straight off
		await expect.poll(() => served.countOf('GET', VIEWS_ROUTE), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
		expect(
			served.calls.some((call) => call.method !== 'GET'),
			'opening a view wrote something'
		).toBe(false);

		await page.getByRole('button', { name: T.ACTIONS, exact: true }).click();
		await expect
			.poll(() => page.getByRole('menuitem').allInnerTexts(), { timeout: 10_000 })
			.toEqual([T.SAVE_AS, T.RENAME, T.MAKE_PERSONAL, T.DELETE]);
		await page.keyboard.press('Escape');
		expect((await mock.calls(VIEWS_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('saved-view-page', {
			detailSearch: detail?.search ?? null,
			listReads: served.countOf('GET', VIEWS_ROUTE),
			rows: await taskRowTexts(page),
			toolbar: flat(await page.locator('h1').locator('xpath=../..').innerText()),
			calls: served.shapes().map((shape) => shape.slice(0, 80)),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the view page logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 8. a view that cannot open here

	test('8 · a view the member cannot open: an id answered 404, and a view of a team the member is not in', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const missingId = 'bbbb0000-0000-4000-8000-0000000000ff';
		const missing = await serveTaskViews(page, { views: [], detailRefusal: { status: 404, message: 'Not Found' } });
		await signInAndVisit(page, fixture, `/views/${missingId}`);
		// task-view-route.tsx:66-67 (isError || !data) → ViewNotice(NOT_FOUND_TITLE, NOT_FOUND_TEXT)
		await expect(noticeTitle(page, T.NOT_FOUND_TITLE), 'a 404 view rendered no not-found notice').toBeVisible({
			timeout: 25_000
		});
		await expect(sentence(page, T.NOT_FOUND_TEXT)).toBeVisible();
		await expect(backToViewsLink(page), 'the not-found notice offers no way back to /views').toHaveCount(1);
		// `retry: false` on the view query (use-task-views-query.ts:30-41): one read, and no write
		await expect.poll(() => missing.countOf('GET', missing.pathOf(missingId)), { timeout: 15_000 }).toBe(1);
		expect(
			missing.calls.some((call) => call.method !== 'GET'),
			'a 404 read wrote something'
		).toBe(false);
		await missing.unroute();

		// task-view-route.tsx:47-49: OtherTeamView does not find the view's team in the shell's list and says "not found"
		const otherTeamId = 'bbbb0000-0000-4000-8000-0000000000b2';
		const otherTeam = await serveTaskViews(page, {
			views: [
				viewOf(fixture, otherTeamId, 'Other team view', {
					organizationTeamId: fixture.ids.teamB
				})
			]
		});
		await signInAndVisit(page, fixture, `/views/${otherTeamId}`);
		await expect(noticeTitle(page, T.NOT_FOUND_TITLE), 'a view of another team rendered no notice').toBeVisible({
			timeout: 25_000
		});
		await expect(sentence(page, T.NOT_FOUND_TEXT)).toBeVisible();
		await expect(backToViewsLink(page)).toHaveCount(1);
		await expect(
			sentence(page, filled('OTHER_TEAM_TITLE', { team: fixture.names.teamB })),
			'the other-team notice was shown where the code cannot find the team in the list'
		).toHaveCount(0);
		await expect(
			page.getByRole('button', { name: filled('SWITCH_TEAM', { team: fixture.names.teamB }), exact: true }),
			'a view the member cannot open offered to switch teams'
		).toHaveCount(0);
		await expect.poll(() => otherTeam.countOf('GET', otherTeam.pathOf(otherTeamId)), { timeout: 15_000 }).toBe(1);

		report('view-cannot-open', {
			fourOhFour: {
				notice: flat(await noticeTitle(page, T.NOT_FOUND_TITLE).locator('xpath=../..').innerText()),
				h1: await page.getByRole('heading', { level: 1 }).allInnerTexts(),
				calls: missing.shapes().map((shape) => shape.slice(0, 70))
			},
			otherTeam: {
				noticeShown: [T.NOT_FOUND_TITLE, T.NOT_FOUND_TEXT],
				otherTeamCopyShown: 0,
				switchTeamButtons: 0,
				calls: otherTeam.shapes().map((shape) => shape.slice(0, 70))
			},
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});
		const armed = armedHttpError('GET', `${LOGGED_VIEWS_ROUTE}/${missingId}${encoded(detailSearch(fixture))}`, 404);
		expect(
			consoleFindings(shield, [armed]),
			'besides the HTTP error line of the read this file refused, the page logged a console error'
		).toEqual([]);
	});

	// ---------------------------------------------------------------- 9. an answer that is not a view

	test('9 · an answer that is not an ITaskView: nothing validates it, and the page is drawn from what it got', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const id = 'bbbb0000-0000-4000-8000-0000000000e9';
		const seen: Array<Record<string, unknown>> = [];
		/** Answers the platform could hand back that are not an `ITaskView` (`task-views.ts:33-55`). */
		const answers: Array<Record<string, string>> = [{}, { id: 'x1', name: 'Answer name' }];
		for (const answer of answers) {
			const served = await serveTaskViews(page, {
				views: [viewOf(fixture, id, 'Real name')],
				detailAnswer: answer
			});
			await signInAndVisit(page, fixture, `/views/${id}`);
			const h1 = await page.getByRole('heading', { level: 1 }).allInnerTexts();
			// task-views.service.ts:59-63 hands back `response.data` as it is; no schema, no notice, no retry
			await expect(
				sentence(page, T.NOT_FOUND_TITLE),
				`an answer of ${JSON.stringify(answer)} was called a missing view`
			).toHaveCount(0);
			await expect(
				h1,
				`an answer of ${JSON.stringify(answer)} did not draw the heading the page builds from it`
			).toEqual([answer.name ?? EN.sidebar.TEAMTASKS]);
			await expect(
				page.getByRole('row').filter({ hasText: 'Fixture active task' }),
				'the page stopped listing the team tasks it was never asked to stop listing'
			).toHaveCount(1);
			expect(served.countOf('GET', served.pathOf(id)), 'the malformed answer was read again').toBe(1);
			expect(
				served.calls.some((call) => call.method !== 'GET'),
				'a malformed answer wrote something'
			).toBe(false);
			expect(consoleFindings(shield), 'a malformed answer logged a console error').toEqual([]);
			expect(shield.pageErrors()).toEqual([]);
			seen.push({ answer, h1, calls: served.shapes().map((shape) => shape.slice(0, 60)) });
			await served.unroute();
		}
		report('malformed-answer', { seen, teamTasksTitle: EN.sidebar.TEAMTASKS });
	});

	// ---------------------------------------------------------------- 10. naming a new view

	test('10 · a new view named from the views index: the dialog, an empty name refused before any request, the body sent', async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const served = await serveTaskViews(page, { views: [] });
		await signInAndVisit(page, fixture, '/views');

		// this index holds no view, so New view stands twice (test 2 pinned both places); the toolbar's is first
		const newViews = page.getByRole('button', { name: T.NEW_VIEW, exact: true });
		await expect(newViews, 'the views index offers no New view').toHaveCount(2);
		await expect(
			sentence(page, T.EMPTY_TITLE),
			'an index with no views did not say so before the new one was made'
		).toBeVisible();
		await newViews.first().click();
		// useNewViewRequest (use-new-view-request.ts) sends the member to the team tasks page, dialog open
		await expect(page).toHaveURL(/\/team\/tasks/, { timeout: 25_000 });
		const dialog = dialogOf(page);
		await expect(dialog).toBeVisible({ timeout: 15_000 });
		await expect(sentence(dialog, T.SAVE_VIEW_TEXT)).toBeVisible();
		await expect
			.poll(
				() =>
					dialog
						.getByRole('tab')
						.evaluateAll((nodes) =>
							nodes.map(
								(node) => `${node.textContent?.trim() ?? ''}|${node.getAttribute('aria-selected')}`
							)
						),
				{ timeout: 15_000 }
			)
			.toEqual([`${T.PERSONAL}|true`, `${T.SHARED}|false`]);
		await expect(sentence(dialog, T.VISIBILITY_PERSONAL_TEXT)).toBeVisible();
		await dialog.getByRole('tab', { name: T.SHARED, exact: true }).click();
		await expect(
			sentence(dialog, T.VISIBILITY_SHARED_TEXT),
			'switching visibility did not change its hint'
		).toBeVisible();
		await dialog.getByRole('tab', { name: T.PERSONAL, exact: true }).click();

		const nameField = dialog.getByRole('textbox').first();
		await expect(nameField).toHaveAttribute('maxlength', '80');
		const create = dialog.getByRole('button', { name: T.CREATE, exact: true });
		await expect(create, 'an empty name is not refused before anything is sent').toBeDisabled();
		await nameField.fill('   ');
		await expect(create, 'a name of spaces only is not refused before anything is sent').toBeDisabled();
		expect(served.countOf('POST', VIEWS_ROUTE), 'a name nothing accepts still sent a create').toBe(0);

		await nameField.fill('Made from the index');
		await expect(create).toBeEnabled();
		await create.click();

		await expect.poll(() => served.countOf('POST', VIEWS_ROUTE), { timeout: 15_000 }).toBe(1);
		const post = served.calls.find((call) => call.method === 'POST');
		// createView (use-task-view-actions.ts:94-113) posts the definition the page is showing now
		expect(JSON.parse(String(post?.body)), 'the create body is not what the page holds').toEqual({
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			name: 'Made from the index',
			visibility: 'personal',
			organizationTeamId: fixture.ids.teamA,
			displayOptions: DEFAULT_DISPLAY_OPTIONS,
			filterOptions: {},
			queryParams: { scope: EN.pages.teamTasks.SCOPE_ACTIVE.toLowerCase(), search: '' }
		});
		await expect
			.poll(() => served.items.map((view) => [view.name, view.visibility]), { timeout: 15_000 })
			.toEqual([['Made from the index', 'personal']]);
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toEqual([filled('CREATED_TOAST', { name: 'Made from the index' })]);
		// useSavedViewCommands' create lands on the new view's own page (measured probe-4.log R4, probe-5.log S4)
		const createdId = String(served.items[0].id);
		await expect(page).toHaveURL(new RegExp(`/views/${createdId}$`), { timeout: 15_000 });
		const urlAfterCreate = page.url();
		await expect(
			page.getByRole('heading', { level: 1, name: 'Made from the index', exact: true }),
			"the new view's page is not named after it"
		).toBeVisible({ timeout: 25_000 });

		// and the index now lists it
		await hardVisit(page, '/views');
		await expect(savedRows(page)).toHaveCount(1, { timeout: 25_000 });
		await expect(savedRows(page).first()).toContainText('Made from the index');
		await expect(savedRows(page).first()).toContainText(T.PERSONAL);
		expect((await mock.calls(VIEWS_ROUTE)).length, 'the mock heard a call this file answered').toBe(0);

		report('new-view', {
			urlWhileDialogOpen: '/team/tasks (measured probe-4.log R4, probe-5.log S4)',
			urlAfterCreate,
			urlOnTheIndexAfterwards: page.url(),
			rowsOnTheIndex: (await savedRows(page).allInnerTexts()).map(flat),
			postBody: JSON.parse(String(post?.body)),
			toasts: await toastTexts(page),
			calls: served.shapes().map((shape) => shape.slice(0, 40)),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the new-view flow logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 11. renaming and sharing from the index

	test('11 · renaming and sharing a saved view from the index: the body each one puts and the row it leaves', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const renamedId = 'bbbb0000-0000-4000-8000-0000000000a1';
		const sharedId = 'bbbb0000-0000-4000-8000-0000000000a2';
		const served = await serveTaskViews(page, {
			views: [viewOf(fixture, renamedId, 'Rename me'), viewOf(fixture, sharedId, 'Share me')]
		});
		await signInAndVisit(page, fixture, '/views');
		await expect(savedRows(page)).toHaveCount(2, { timeout: 25_000 });

		// the row menu (views-index-parts.tsx:133-155), measured in probe-5.log S3 / probe-2.log P8
		await rowActionsButton(page, 'Rename me').click();
		await expect
			.poll(() => page.getByRole('menuitem').allInnerTexts(), { timeout: 10_000 })
			.toEqual([T.RENAME, T.MAKE_SHARED, T.DELETE]);
		await page.getByRole('menuitem', { name: T.RENAME, exact: true }).click();
		const renameDialog = dialogOf(page);
		await expect(renameDialog).toBeVisible({ timeout: 10_000 });
		await expect(sentence(renameDialog, T.RENAME), 'the rename dialog carries no title').toBeVisible();
		await expect(sentence(renameDialog, T.RENAME_TEXT)).toBeVisible();
		const nameField = renameDialog.getByRole('textbox').first();
		await expect(nameField).toHaveValue('Rename me');
		await expect(nameField).toHaveAttribute('maxlength', '80');
		const save = renameDialog.getByRole('button', { name: T.SAVE, exact: true });
		// the rename dialog opens with the view's own name in the field, so Save is ready right away; it is the empty
		// (or blank) name it refuses, by `!name.trim()` (save-view-dialog.tsx:87) — measured both ways in probe-3.log Q5
		await expect(save, 'a rename opened prefilled but unsubmittable').toBeEnabled();
		await nameField.fill('');
		await expect(save, 'a rename with an empty name is not refused').toBeDisabled();
		await nameField.fill('   ');
		await expect(save, 'a name of spaces only is not refused').toBeDisabled();
		expect(
			served.calls.some((call) => call.method === 'PUT'),
			'a rename nothing accepts still sent a write'
		).toBe(false);
		await nameField.fill('Renamed view');
		await expect(save).toBeEnabled();
		await save.click();

		await expect
			.poll(() => served.calls.find((call) => call.method === 'PUT')?.body, { timeout: 15_000 })
			.toBe(
				JSON.stringify({
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA,
					name: 'Renamed view',
					expectedVersion: 1
				})
			);
		await expect.poll(() => toastTexts(page), { timeout: 15_000 }).toEqual([T.SAVED_TOAST]);
		await renameDialog.waitFor({ state: 'detached', timeout: 15_000 });

		// the share needs no dialog: the menu item puts the new visibility straight away
		await rowActionsButton(page, 'Share me').click();
		await page.getByRole('menuitem', { name: T.MAKE_SHARED, exact: true }).click();
		await expect
			.poll(
				() => served.calls.filter((call) => call.method === 'PUT').map((call) => `${call.path} ${call.body}`),
				{ timeout: 15_000 }
			)
			.toEqual([
				`${served.pathOf(renamedId)} ${JSON.stringify({
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA,
					name: 'Renamed view',
					expectedVersion: 1
				})}`,
				`${served.pathOf(sharedId)} ${JSON.stringify({
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA,
					visibility: 'shared',
					expectedVersion: 1
				})}`
			]);
		await expect.poll(() => toastTexts(page), { timeout: 15_000 }).toContain(T.SAVED_TOAST);

		// each write is followed by the re-read the shell makes, and the rows show what the platform now holds
		await expect
			.poll(
				() =>
					savedRows(page)
						.allInnerTexts()
						.then((all) => all.map(flat)),
				{ timeout: 15_000 }
			)
			.toEqual([
				`Share me ${LAYOUT_LIST} ${T.SHARED} Updated 5 days ago`,
				`Renamed view ${LAYOUT_LIST} ${T.PERSONAL} Updated 5 days ago`
			]);
		expect(served.items.map((view) => [view.name, view.visibility, view.version])).toEqual([
			['Renamed view', 'personal', 2],
			['Share me', 'shared', 2]
		]);
		expect(served.countOf('GET', VIEWS_ROUTE), 'a write did not re-read the list').toBeGreaterThanOrEqual(3);

		report('rename-and-share', {
			calls: served.shapes().map((shape) => shape.slice(0, 30)),
			store: served.items.map((view) => [view.name, view.visibility, view.version]),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the rename or the share logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 12. deleting from the index

	test('12 · deleting a saved view from the index: Cancel sends nothing, the confirm deletes only that view', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const doomedId = 'bbbb0000-0000-4000-8000-0000000000a3';
		const served = await serveTaskViews(page, {
			views: [
				viewOf(fixture, doomedId, 'Delete me'),
				viewOf(fixture, 'bbbb0000-0000-4000-8000-0000000000a4', 'Keep me')
			]
		});
		await signInAndVisit(page, fixture, '/views');
		await expect(savedRows(page)).toHaveCount(2, { timeout: 25_000 });

		await rowActionsButton(page, 'Delete me').click();
		await page.getByRole('menuitem', { name: T.DELETE, exact: true }).click();
		const confirm = dialogOf(page);
		await expect(confirm).toBeVisible({ timeout: 10_000 });
		// confirmDelete's dialog (use-saved-view-list-commands.ts:72-85), measured in probe-5.log S5 / probe-2.log P9
		await expect(sentence(confirm, filled('DELETE_CONFIRM_TITLE', { name: 'Delete me' }))).toBeVisible();
		await expect(sentence(confirm, filled('DELETE_TEXT', { name: 'Delete me' }))).toBeVisible();
		const confirmCopy = flat(await confirm.innerText());
		await confirm.getByRole('button', { name: EN.common.CANCEL, exact: true }).click();
		await expect(confirm).toBeHidden({ timeout: 10_000 });
		expect(
			served.calls.some((call) => call.method !== 'GET'),
			'a cancelled delete still sent a DELETE'
		).toBe(false);
		await expect(savedRows(page)).toHaveCount(2);

		await rowActionsButton(page, 'Delete me').click();
		await page.getByRole('menuitem', { name: T.DELETE, exact: true }).click();
		await dialogOf(page).getByRole('button', { name: T.DELETE, exact: true }).click();

		await expect.poll(() => served.countOf('DELETE', served.pathOf(doomedId)), { timeout: 15_000 }).toBe(1);
		const removed = served.calls.find((call) => call.method === 'DELETE');
		expect(removed?.body, 'the delete sent a body, and task-views.service.ts:75-77 sends none').toBeNull();
		await expect.poll(() => served.items.map((view) => view.name), { timeout: 15_000 }).toEqual(['Keep me']);
		await expect
			.poll(
				() =>
					savedRows(page)
						.allInnerTexts()
						.then((all) => all.map(flat)),
				{ timeout: 15_000 }
			)
			.toEqual([`Keep me ${LAYOUT_LIST} ${T.PERSONAL} Updated 5 days ago`]);
		await expect
			.poll(() => toastTexts(page), { timeout: 15_000 })
			.toEqual([filled('DELETED_TOAST', { name: 'Delete me' })]);
		await expect(savedRows(page).filter({ hasText: 'Delete me' }), 'the deleted view is still listed').toHaveCount(
			0
		);

		report('delete', {
			confirmCopy,
			calls: served.shapes().map((shape) => shape.slice(0, 45)),
			store: served.items.map((view) => view.name),
			toasts: await toastTexts(page),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the delete logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 13. a dirty change on a view page

	test('13 · changing what a saved view page shows: Unsaved changes, the Save, the definition it puts', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const id = 'bbbb0000-0000-4000-8000-0000000000e1';
		const served = await serveTaskViews(page, {
			views: [viewOf(fixture, id, 'Dirty save page', { visibility: 'shared', version: 3 })]
		});
		await signInAndVisit(page, fixture, `/views/${id}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Dirty save page', exact: true })).toBeVisible({
			timeout: 25_000
		});
		await expect(sentence(page, T.UNSAVED), 'a page that matches its view claims it is dirty').toHaveCount(0);
		await expect(page.getByRole('button', { name: T.SAVE, exact: true })).toHaveCount(0);

		await page.getByRole('tab', { name: EN.pages.teamTasks.SCOPE_ALL }).click();
		// TeamTasksToolbar (team-tasks-toolbar.tsx:270) says the page no longer matches the saved view
		await expect(sentence(page, T.UNSAVED), 'a changed page does not say it is unsaved').toHaveCount(1);
		const save = page.getByRole('button', { name: T.SAVE, exact: true });
		await expect(save, 'an unsaved page offers no Save').toHaveCount(1);

		await save.click();
		await expect
			.poll(() => served.calls.filter((call) => call.method === 'PUT').map((call) => call.body), {
				timeout: 15_000
			})
			.toEqual([
				JSON.stringify({
					organizationId: fixture.ids.organizationA,
					tenantId: fixture.ids.tenantA,
					displayOptions: DEFAULT_DISPLAY_OPTIONS,
					filterOptions: {},
					queryParams: { scope: EN.pages.teamTasks.SCOPE_ALL.toLowerCase(), search: '' },
					expectedVersion: 3
				})
			]);
		await expect.poll(() => toastTexts(page), { timeout: 15_000 }).toEqual([T.SAVED_TOAST]);
		await expect(sentence(page, T.UNSAVED), 'the page still claims it is unsaved after saving').toHaveCount(0);
		await expect(page.getByRole('button', { name: T.SAVE, exact: true })).toHaveCount(0);
		expect(
			served.items.map((view) => view.version),
			'the saved view did not take the new version'
		).toEqual([4]);

		report('dirty-save', {
			putBody: JSON.parse(String(served.calls.find((call) => call.method === 'PUT')?.body)),
			versionAfterSave: served.items.map((view) => view.version),
			toolbar: flat(await page.locator('h1').locator('xpath=../..').innerText()),
			consoleErrors: shield.consoleErrors()
		});
		expect(consoleFindings(shield), 'the dirty save logged a console error').toEqual([]);
	});

	// ---------------------------------------------------------------- 14. a refused create

	test('14 · a create the platform refuses (400, 403, 500): the sentence, the dialog that stays, the store that does not move', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const armed: string[] = [];
		const seen: Array<Record<string, unknown>> = [];
		for (const status of [400, 403, 500]) {
			const served = await serveTaskViews(page, {
				views: [],
				createRefusal: { status, message: 'this file refused the create' }
			});
			await signInAndVisit(page, fixture, '/team/tasks?saveView=1');
			const dialog = dialogOf(page);
			await expect(dialog, `${status}: the page opened no save-view dialog`).toBeVisible({ timeout: 25_000 });
			await expect(sentence(dialog, T.SAVE_VIEW_TEXT)).toBeVisible();
			const create = dialog.getByRole('button', { name: T.CREATE, exact: true });
			await expect(create, `${status}: an empty name is not refused before anything is sent`).toBeDisabled();
			await dialog.getByRole('textbox').first().fill(`Refused view ${status}`);
			await create.click();
			await expect.poll(() => served.countOf('POST', VIEWS_ROUTE), { timeout: 15_000 }).toBe(1);
			await expect.poll(() => toastTexts(page), { timeout: 15_000 }).toEqual([T.CREATE_FAILED]);
			await expect(dialog, `${status}: a refused create closed the dialog`).toBeVisible();
			expect(served.items, `${status}: a refused create still changed the store`).toEqual([]);
			expect(served.countOf('POST', VIEWS_ROUTE), `${status}: the create was sent more than once`).toBe(1);
			armed.push(armedHttpError('POST', LOGGED_VIEWS_ROUTE, status));
			expect(
				consoleFindings(shield, armed),
				`${status}: besides the HTTP error lines this file armed, the page logged a console error`
			).toEqual([]);
			seen.push({
				status,
				toasts: await toastTexts(page),
				url: page.url(),
				calls: served.shapes().map((s) => s.slice(0, 30))
			});
			await served.unroute();
		}
		report('refused-create', { seen, armedConsoleLines: armed });
	});

	// ---------------------------------------------------------------- 15. a refused update on the index

	test('15 · a rename the platform refuses: 409 prints the conflict and keeps the other version, 500 prints the failure', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const id = 'bbbb0000-0000-4000-8000-0000000000a1';
		const armed: string[] = [];
		const seen: Array<Record<string, unknown>> = [];
		for (const status of [409, 500]) {
			const served = await serveTaskViews(page, {
				views: [viewOf(fixture, id, 'Conflict rename', { version: 2 })],
				updateRefusal: { status, message: 'this file refused the rename' }
			});
			await signInAndVisit(page, fixture, '/views');
			await expect(savedRows(page)).toHaveCount(1, { timeout: 25_000 });
			await rowActionsButton(page, 'Conflict rename').click();
			await page.getByRole('menuitem', { name: T.RENAME, exact: true }).click();
			const dialog = dialogOf(page);
			await dialog.getByRole('textbox').first().fill(`Renamed ${status}`);
			await dialog.getByRole('button', { name: T.SAVE, exact: true }).click();
			await expect.poll(() => served.countOf('PUT', served.pathOf(id)), { timeout: 15_000 }).toBe(1);
			// conflictOf (use-task-view-actions.ts:26-35) splits a conflict from any other failure
			await expect
				.poll(() => toastTexts(page), { timeout: 15_000 })
				.toEqual([status === 409 ? T.CONFLICT_IN_LIST : T.SAVE_FAILED]);
			expect(
				served.items.map((view) => [view.name, view.version]),
				`${status}: a refused rename changed the store`
			).toEqual([['Conflict rename', 2]]);
			await expect
				.poll(
					() =>
						savedRows(page)
							.allInnerTexts()
							.then((all) => all.map(flat)),
					{ timeout: 15_000 }
				)
				.toEqual([`Conflict rename ${LAYOUT_LIST} ${T.PERSONAL} Updated 5 days ago`]);
			armed.push(armedHttpError('PUT', `${LOGGED_VIEWS_ROUTE}/${id}`, status));
			expect(
				consoleFindings(shield, armed),
				`${status}: besides the HTTP error lines this file armed, the page logged a console error`
			).toEqual([]);
			seen.push({
				status,
				toasts: await toastTexts(page),
				detailReReads: served.countOf('GET', served.pathOf(id)),
				listReReads: served.countOf('GET', VIEWS_ROUTE)
			});
			await served.unroute();
		}
		report('refused-rename', { seen, armedConsoleLines: armed });
	});

	// ---------------------------------------------------------------- 16. refused writes on a view page

	test('16 · a view page whose save and delete are refused: the conflict with its Reload, the failure sentence, nothing changed', async ({
		page,
		fixture,
		shield
	}) => {
		await overrideRuntimeEnv(page, { NEXT_PUBLIC_TASK_VIEWS_ENABLED: 'true' });
		const id = 'bbbb0000-0000-4000-8000-0000000000e2';
		const served = await serveTaskViews(page, {
			views: [viewOf(fixture, id, 'Refused page', { visibility: 'shared', version: 1 })],
			updateRefusal: { status: 409, message: 'this file refused the save' },
			removeRefusal: { status: 500, message: 'this file refused the delete' }
		});
		await signInAndVisit(page, fixture, `/views/${id}`);
		await expect(page.getByRole('heading', { level: 1, name: 'Refused page', exact: true })).toBeVisible({
			timeout: 25_000
		});

		await page.getByRole('tab', { name: EN.pages.teamTasks.SCOPE_ALL }).click();
		await expect(sentence(page, T.UNSAVED)).toHaveCount(1, { timeout: 15_000 });
		await page.getByRole('button', { name: T.SAVE, exact: true }).click();
		await expect.poll(() => served.countOf('PUT', served.pathOf(id)), { timeout: 15_000 }).toBe(1);
		// CONFLICT (TaskViewConflictError at use-task-view-actions.ts:19-24, shown by saveDefinition :115-135): the
		// page keeps its own changes, and the toast itself carries the Reload that reloads the view.
		await expect(
			appToasts(page).filter({ hasText: T.CONFLICT }),
			'the refused save printed no conflict sentence'
		).toHaveCount(1);
		await expect(
			appToasts(page).getByRole('button', { name: T.RELOAD, exact: true }),
			'the conflict offers no Reload'
		).toHaveCount(1);
		await expect(sentence(page, T.UNSAVED), "the refused save threw away the page's changes").toHaveCount(1);
		expect(
			served.items.map((view) => [view.name, view.version]),
			'the refused save changed the stored view'
		).toEqual([['Refused page', 1]]);

		await page.getByRole('button', { name: T.ACTIONS, exact: true }).click();
		await page.getByRole('menuitem', { name: T.DELETE, exact: true }).click();
		const confirm = dialogOf(page);
		await expect(sentence(confirm, filled('DELETE_CONFIRM_TITLE', { name: 'Refused page' }))).toBeVisible({
			timeout: 10_000
		});
		await confirm.getByRole('button', { name: T.DELETE, exact: true }).click();
		await expect.poll(() => served.countOf('DELETE', served.pathOf(id)), { timeout: 15_000 }).toBe(1);
		await expect.poll(() => toastTexts(page), { timeout: 15_000 }).toContain(T.DELETE_FAILED);
		expect(
			served.items.map((view) => view.name),
			'the refused delete removed the view from the store'
		).toEqual(['Refused page']);
		await expect(page).toHaveURL(new RegExp(`/views/${id}$`), { timeout: 15_000 });
		await expect(
			page.getByRole('heading', { level: 1, name: 'Refused page', exact: true }),
			'the refused delete still pushed the member out of the view page'
		).toBeVisible({ timeout: 15_000 });

		report('refused-page-writes', {
			conflictToast: T.CONFLICT,
			toasts: await toastTexts(page),
			detailReReads: served.countOf('GET', served.pathOf(id)),
			store: served.items.map((view) => [view.name, view.version]),
			calls: served.shapes().map((shape) => shape.slice(0, 45)),
			consoleErrors: shield.consoleErrors().map((line) => line.slice(0, 130))
		});
		const armed = [
			armedHttpError('PUT', `${LOGGED_VIEWS_ROUTE}/${id}`, 409),
			armedHttpError('DELETE', `${LOGGED_VIEWS_ROUTE}/${id}`, 500)
		];
		expect(
			consoleFindings(shield, armed),
			'besides the HTTP error lines this file armed, the page logged a console error'
		).toEqual([]);
	});
});
