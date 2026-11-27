import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person sees and does on the **Kanban board** (`/kanban` →
 * `app/[locale]/(main)/kanban/page.tsx:7` → `core/components/pages/kanban/board/kanban-page.tsx:159`), on lane-b
 * (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, control `3998`, `playwright/test-servers.ts:39`).
 *
 * Every value asserted below was printed by a run first: the throwaway probes `probe1` … `probe5` in
 * `D:\Coding\.tmp\probe-kanban\` (logs `D:\Coding\.tmp\probe-kanban\p1.log` … `p6.log`, one log per run) and this
 * file's own `MEASURE` lines in `D:\Coding\.tmp\s3-lane-b-kanban-measure.log`, `-measure2.log` and the two acceptance
 * logs `D:\Coding\.tmp\s3-lane-b-kanban-1.log` / `-2.log`. Nothing here is a number copied from the code. A run here
 * needs `E2E_LANE=lane-b E2E_BROWSER_CHANNEL=chrome` (this PC has no bundled Chromium, `playwright/README.md:16,43`)
 * and the lane lock: `node /d/Coding/.tmp/lane-lock.mjs acquire lane-b kanban` … `release lane-b kanban`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub, the app shell and all of its own reads (`/api/user/me`, `/api/organization-team`,
 * `/api/organization-team/<id>`, `/api/role-permissions/me`, `/api/timesheet/timer/status`, `/api/daily-plan`,
 * `/api/invite/me`, `PUT /api/employee/me/presence`, …) answered by the lane mock — measured in `p1.log` P1, which
 * lists the whole load of `/kanban` with nothing stubbed. The mock also answers the two task reads this page makes:
 * `GET /api/tasks/team` → one fixture task (`cypress/support/mock-gauzy-server.mjs:677-678`) and
 * `GET /api/task-metadata/bootstrap` → 2 system statuses with empty priorities/sizes/labels (`:686`, `:336-341`);
 * P1 pins what that board prints (two lanes `open` / `in progress`, one card `#1Fixture active task`).
 *
 * **Served by this file:** the board's own data and every write it makes, through `page.route` on the mock origin
 * (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:275-360`): the bootstrap sections (statuses,
 * priorities, sizes, labels — the board reads all of them from that one call, see below), the team task list with its
 * paging, `PUT /api/tasks/<id>`, `POST /api/tasks`, `PUT /api/task-statuses/<id>`. The store is the answer: a write
 * changes what the next read returns, and a refused write changes nothing — which is the only way "the card is back in
 * its old lane" can be told apart from "the platform still says it moved". Every answer restates the mock's CORS
 * headers (`mock-gauzy-server.mjs:997-1006`, and `OPTIONS` → 204) because the page sits on `localhost:3032` and the
 * API on `127.0.0.1:3996`. `route.fetch()` is never called, so the mock never hears any stubbed path.
 *
 * **The page reads its metadata from one call, not from four.** `use-task-metadata-bootstrap-query.ts:35`
 * (`const useBootstrap = !publicTeam`) makes `use-task-statuses-query.ts:41-47` disable the `/task-statuses` query
 * (`enabled: … && !taskMetadataQuery.useBootstrap`), and the same gate holds for priorities
 * (`use-task-priorities-query.ts:36`), sizes and labels (`use-task-labels-query.ts:39`); the per-section reads happen
 * only as the fallback of `task-metadata-bootstrap.service.ts:48-50` when the endpoint is unavailable. Measured: the
 * load asked `GET /api/task-metadata/bootstrap?…&include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions`
 * and never `/api/task-statuses`, `/api/task-priorities`, `/api/task-sizes` or `/api/tags/level` (`p1.log` P1, P2).
 *
 * **Dragging is native HTML5 drag and drop**, driven by `@atlaskit/pragmatic-drag-and-drop` 1.7.10 — the only three
 * `@atlaskit/pragmatic-*` packages the workspace installs (`package.json:43-45`: the core, `-auto-scroll`, `-hitbox`;
 * the payloads in `core/components/pages/kanban/board/kanban-dnd.ts:9-11`). `draggable()` writes
 * `draggable="true"` onto the element and the adapter listens to the browser's own `dragstart`/`dragover`/`drop` on
 * `document` (`node_modules/@atlaskit/pragmatic-drag-and-drop/dist/cjs/adapter/element-adapter.js`), so this file
 * drives drags with `page.mouse` (`move` → `down` → several stepped `move`s → `up`), which in Chromium is exactly what
 * starts a real drag (`node_modules/playwright-core/lib/server/chromium/crInput.js:118` hands the move to
 * `crDragDrop.js`, which enables `Input.setInterceptDrags` and replays `dragOver`/`drop`). Nothing here dispatches a
 * synthetic drag event. **Keyboard dragging is not available on this board**: the package contains no keyboard sensor
 * (no `keydown`/`Space`/`ArrowUp` handler anywhere in its `dist`), and neither the card's draggable element
 * (`kanban-task-card.tsx:358`) nor the lane's drag handle (`kanban-lane.tsx:133`) is focusable, so the brief's
 * keyboard option is not reachable here — measured: the mouse route moved a card and a lane (`p2.log` P3, P6).
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `kanban-page.tsx`: `KanbanBoardArea` `:107-152` (skeleton `:118-120`, error empty state `:121-132`,
 *   `NO_STATUSES_TITLE`/`_MESSAGE` `:133-143`, board `:144-151,147`, hidden-by-filters bar `:149`), the toolbar slot
 *   `:254-261`, the create modal `:293-305`, the edit-status modal `:306-316`, the invite `:317`.
 * - `kanban-board.tsx`: `visibleLanes`/`hiddenLanes` `:76-78`; one `monitorForElements` `:116-129`; `dropCard`
 *   `:80-97` (a drop that lands in the card's own slot returns at `:92-95`), `dropLane` `:99-108` (same index returns
 *   at `:104-106`); `cardDropIndex` `:35-43` and `laneDropIndex` `:55-59` with `finalIndex` `:27-33`.
 * - `kanban-lane.tsx`: `statusLabelOf` `:53-56` (`name.split('-').join(' ')`), `<section aria-label=…>` `:249-251`,
 *   header `:124-152` (drag handle `:133`, `<h2>` `:135-137`, count chip `:138`, add button `:140-148`), `LaneMenu`
 *   `:84-121` (`CREATE_TASK` `:103-106`, `COLLAPSE_COLUMN` `:111-114`, `EDIT_STATUS` `:115-118`), `CreateTaskRow`
 *   `:154-167` rendered at `:266`; lane drag `:194-200` (`dragHandle: handle`), lane as lane-drop-target `:201-220`
 *   (`allowedEdges: ['left','right']`), lane body as card-drop-target `:221-228`.
 * - `kanban-task-card.tsx`: properties row `:90-117` (stray status `:108`, priority `:109`, size `:110`, the first
 *   `VISIBLE_LABEL_COUNT = 2` labels `:47,111-113`, the `+N` chip `:114`), `TaskProgress` `:119-139` (only when
 *   `estimate > 0`, `:121-123`), `WorkedTime` `:141-163` (rendered for every card), `TaskTitle` `:217-240`
 *   (`#<number>` from `task.taskNumber ?? task.number` `:218`), `data-task-id` wrapper `:358`,
 *   `<article aria-label={task.title}>` `:366`, the card as its own drop target with `allowedEdges: ['top','bottom']`
 *   `:259-292`.
 * - `kanban-task-menu.tsx` `:48-214`, `kanban-hidden-lanes.tsx` `:15-85`, `kanban-task-title-editor.tsx` `:12-66`,
 *   `kanban-toolbar.tsx` `:102-182`.
 * - `core/hooks/tasks/use-kanban-board.ts`: filters are React state (`:40-54`), only `employee` is a URL parameter
 *   (`:18,70-83`), `isNarrowed` `:63`, `hiddenTaskCount` `:64`.
 * - `core/hooks/tasks/use-kanban-lanes.ts`: `moveTask` `:145-163` (session order first `:149-154`, same status →
 *   **no request** `:156-159`, cross-status → the whole task plus `status`/`taskStatusId` `:160`); `saveStatusField`
 *   `:166-199` through the shared latest-write queue `:93` (success = `affected > 0` `:82-85`; refused → the override
 *   is dropped and the lane shows what the statuses hold `:194-195`); `moveLane` `:208-220` writes one
 *   `{ order }` per status whose index changed.
 * - `core/hooks/organizations/teams/use-team-tasks-query.ts`: page size 50 `:34`, infinite query `:119-146`, the next
 *   page fetched one at a time `:157-166`; `core/services/client/api/tasks/task.service.ts:137-153` sends
 *   `take=50&skip=<1-based page>` with `order[createdAt]=DESC&order[id]=DESC`.
 * - Writes as the client builds them: `task.service.ts:284-341` (`PUT /tasks/<id>`, `project` deleted `:309-310`,
 *   `selectedTeam`/`rootEpic` deleted on the direct transport `:311-314`), `:350-399` (`POST /tasks`, then a list
 *   re-read without take/skip `:387`), `task-status.service.ts:74-112` (`PUT /task-statuses/<id>`, the answer read as
 *   `{generatedMaps, raw, affected}`).
 *
 * ## Findings (measured; each says which run printed it)
 *
 * 1. **A cross-lane move sends the whole task, not a patch.** `moveTask` spreads the card's task object
 *    (`use-kanban-lanes.ts:160`), so the `PUT /api/tasks/<id>` body carried
 *    `id, title, number, public, status, priority, size, estimate, taskStatusId, label, organizationId, tenantId,
 *    createdAt, tags, members, teams` (`p2.log` P3). Two of those keys are not this page's doing: `label` is the first
 *    tag's name, added to every team task when the list is written into the shared store
 *    (`use-team-tasks-query.ts:176-180`), and `members` arrives re-shaped by
 *    `task.service.ts:262-274` (`normalizeTaskMembers`). A same-lane drop sent nothing at all (`p2.log` P4).
 * 2. **Collapsing and reordering send `tenantId`/`organizationId` with the field.** `saveStatusField` sends
 *    `{ isCollapsed }` / `{ order }` only (`use-kanban-lanes.ts:179`), yet the request body measured was
 *    `{"order":0,"tenantId":"…","organizationId":"…"}` (`p2.log` P6) — the API service adds the scope to the body.
 * 3. **A card whose status no lane has is shown in the first lane and names its own status.** Served a task with a
 *    `taskStatusId` of a status the board was not given and `status: 'archived'`; it appeared in `open` with an extra
 *    `archived` chip (`p2.log` P2, `p3.log` …), exactly as `buildKanbanLanes` (`core/lib/utils/kanban-board.ts:199-217`,
 *    `statusIdOf … ?? firstStatusId`) and `strayStatusOf` (`:175-181`, `kanban-task-card.tsx:93,108`) describe.
 * 4. **No card selection on this lane.** `isTaskViewsEnabled()` (`core/lib/utils/task-views-enabled.ts:8-11`,
 *    "Off by default") is false for the lane's runtime env, so `selection` is null (`kanban-page.tsx:188,198-201`),
 *    no card renders its `SelectCheck` (`kanban-task-card.tsx:371`) and `TaskSelectionBar` / `TeamTaskPicker`
 *    (`kanban-page.tsx:270-291`) never exist — measured: 0 `[role="checkbox"]` on the board.
 * 5. The lane menu's `Collapse column` and the hidden rail's `Expand column` were enabled for the fixture person: the
 *    mock's role holds no `ORG_TASK_SETTING` (`mock-gauzy-server.mjs:49`), so `use-task-settings-access.ts:106-108`
 *    falls back to team management (`writesEveryRow = holdsPermission || !isDecided`, `:110`), and the fixture member
 *    manages team A.
 * 6. **Every filter on the toolbar is client-side: none of them asks the platform anything, none of them writes.**
 *    The creation-day switch, the search field, the property filter menu and the team avatars all changed which cards
 *    are printed while the reads stayed `GET /api/task-metadata/bootstrap` + `GET /api/tasks/team`
 *    (`p5.log` R4/R5, `p6.log` S2, `s3-lane-b-kanban-measure.log`). `use-kanban-board.ts:40-54` keeps them in React
 *    state and `matchesKanbanFilters` (`core/lib/utils/kanban-board.ts:131-144`) does the narrowing; only `employee`
 *    reaches the URL (`use-kanban-board.ts:70-83`, measured `?employee=Fixture+Manager`), and the bar's number is
 *    `tasks.length - visibleTasks.length` (`use-kanban-board.ts:64`).
 * 7. **The filter trigger's accessible name carries the active count**: `Filter` with no filter, `Filter 1` with one
 *    (`p6.log` S2). A locator pinned to the exact name `Filter` therefore stops resolving the moment a filter is on —
 *    measured in `s3-lane-b-kanban-measure.log`, where such a locator timed out on its own `innerText()`. This file
 *    matches the trigger with `common.FILTER` followed by an optional count, which the bar's `Clear filters` button cannot match.
 * 8. **A filter row with no options is disabled, not missing**: `Epic` carried `data-disabled` because this board was
 *    served no epics (`property-filter-menu.tsx:150` `disabled={!hasOptions}`) while `Issue type` always holds the four
 *    `EIssueType` options (`kanban-toolbar.tsx:30-34`). Its submenus open on hover — clicking the row printed no
 *    `menuitemcheckbox` (`p3.log` P7).
 * 9. **`Create task` fills in two things the person never typed**: an unpicked issue type becomes
 *    `EIssueType.BUG` (`use-task-input.ts:168`, `core/types/generics/enums/task.ts:70`) and the signed-in person's
 *    employee record goes into `members` (`autoAssignTaskAuth`, `use-task-input.ts:175`); `priority`/`size` are passed
 *    as `undefined` and so are absent from the body (`use-task-input.ts:171-172`). The lane decides `status` and
 *    `taskStatusId`: `kanbanTitle` is matched against `ETaskStatusName` (`task-input-kanban.tsx:420-424`), so the
 *    `in progress` lane posted `status:"in-progress"` with that status' id (`p6.log` S1).
 *    **Enter does not submit this form** — `task-input-kanban.tsx:327-336` submits on Enter only when
 *    `createOnEnterClick` is passed and `create-task-modal.tsx:27-39` does not pass it, so the create goes through the
 *    dialog's own `Create task` button (`task-input-kanban.tsx:651-665`), which is disabled until a title is typed
 *    (`p6.log` S1 logged `disabled=true`, and the enabled click wrote the POST).
 * 10. **Collapse and expand are one write each**, `PUT /api/task-statuses/<id> {"isCollapsed":true|false,…}`
 *     (`p5.log` R1), and the rail lists *every* collapsed status in status order with its own card count — collapsing
 *     `open` made the rail read `Hidden columns Open 3 Blocked 1` (`p5.log` R1), it did not replace the rail's content.
 * 11. **Where a same-lane drop has to land.** The bottom edge of the card directly below is what takes a card: the
 *     lane's own two cards swapped places there and sent nothing (`p3.log` P13, `s3-lane-b-kanban-measure2.log`); the
 *     lane's last card dropped on the bottom edge of the card *above* it — a slot below itself — left the order
 *     unchanged and sent nothing (`s3-lane-b-kanban-measure.log`: `cardIndexOf` stayed 2 with `api.writes()` empty).
 *     `dropCard` returns when the drop resolves to the card's own slot (`kanban-board.tsx:92-95`, `cardDropIndex` `:35-43`).
 * 12. **The stray card is not a same-status card.** Dropping `#105` (shown in `open`, but holding a status no lane has)
 *     inside the `open` lane wrote `PUT /api/tasks/<its id>` with `status:"open"` and that lane's `taskStatusId`,
 *     because `moveTask` compares the task's own status with the lane it was dropped into
 *     (`use-kanban-lanes.ts:156-159`) — measured `s3-lane-b-kanban-measure2.log`; the card never changed lane.
 *
 * ## What this file does not cover
 *
 * - The task-input form behind `Create task` beyond what reaches the platform: its fields, validation and voice fill
 *   are `lane-c/task-detail-verification-gates.spec.ts:619-688`; the invite behind the verification gate is
 *   `lane-b/verification-gated-actions.spec.ts:516-536`; the gate itself is `lane-d/page-gate-lane.spec.ts:127`.
 * - `Edit status` (`kanban-lane.tsx:115` → `kanban-page.tsx:306-316` → `core/components/features/tasks/edit-status-modal.tsx`):
 *   a settings form on the same `PUT /task-statuses/<id>`, not the board's own mutation.
 * - The card menu rows this file only *lists*: `Assign task to me`, the `Assignee` submenu and the three daily-plan
 *   rows (`Plan for today` / `Plan for tomorrow` / `Plan for selected day`, all measured present in `p3.log` P8). The
 *   two the file drives are `Move to` and `Make a copy`. The plan rows write `POST /api/daily-plan`, another page's
 *   business (`core/hooks/daily-plans/use-plan-task-actions.ts`).
 * - The filter menu's other submenus: this file drives `Priority` only, after measuring that `Issue type`, `Epic`,
 *   `Size` and `Labels` are all there (`p6.log` S2). `Labels`/`Size` need values the served board already has, so
 *   they are reachable but not driven here.
 * - Selecting cards and the bulk `POST /api/tasks/bulk-update` path: unreachable on this lane (finding 4).
 * - `PATCH /api/task-statuses/reorder` (`task-status.service.ts:121-151`): this board never calls it
 *   (`use-kanban-lanes.ts:208-220` writes `order` per status instead).
 * - The keyboard layer (`X` select, `M`/`A`/`L`, `/` focus): it is pinned by unit tests
 *   (`core/components/pages/kanban/board/kanban-task-card.test.tsx:84-127`) and needs the selection this lane does not
 *   have; `G`-prefixed sequences and the shortcuts sheet are out.
 * - The drawer opened by clicking a card (`kanban-board-context` → `useTaskDrawer`): its own pages are other files.
 * - Anything needing a second team, organization or tenant: the lane answers exactly one of each.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const KANBAN_PATH = '/kanban';
const BOOTSTRAP_ROUTE = '/api/task-metadata/bootstrap';
const TASKS_ROUTE = '/api/tasks';
const TEAM_TASKS_ROUTE = '/api/tasks/team';
const TASK_STATUSES_ROUTE = '/api/task-statuses';

/** The mock's own CORS answer (`mock-gauzy-server.mjs:997-1006`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

/** Every English row this spec names is read out of `locales/en.json` by key, never typed here. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	pages: { kanban: Record<string, string>; taskDetails: Record<string, string> };
	common: Record<string, string>;
	form: Record<string, string>;
};
/** Loading the file fails if a key this spec names is gone, so a renamed row never silently weakens an assertion. */
function copyTable(table: Record<string, string>, keys: string[], where: string) {
	const missing = keys.filter((key) => typeof table[key] !== 'string');
	if (missing.length) throw new Error(`locales/en.json (${where}) has no key for ${missing.join(', ')}`);
	return table;
}
/** `pages.kanban` `:2362-2375`. */
const K = copyTable(
	EN.pages.kanban,
	[
		'KANBAN_BOARD',
		'HIDDEN_COLUMNS',
		'SEARCH_TASKS',
		'SHOW_MEMBER_TASKS',
		'ASSIGNED_TO',
		'SHOW_EVERY_MEMBER',
		'TASKS_HIDDEN_BY_FILTERS',
		'NO_STATUSES_TITLE',
		'NO_STATUSES_MESSAGE',
		'CREATION_DAY'
	],
	'pages.kanban'
);
/** `common.*`: `COLLAPSE_COLUMN :110`, `EXPAND_COLUMN :111`, `TOMORROW :138`, `YESTERDAY :139`, `LABELS :154`,
 *  `CLEAR_FILTERS :177`, `EDIT_TASK :182`, `TODAY :212`, `OPEN :223`, `CREATE_TASK :236`, `WORKED :265`,
 *  `FILTER :272`, `ISSUE_TYPE :352`, `FILTER_ALL :354`, `COPY_ISSUE_LINK :437`, `COPY_TASK_ID :438`,
 *  `MAKE_A_COPY :439`, `ASSIGNEE :440`, `MOVE_TO :443`, `LIVE :498`, `MORE_OPTIONS :503`, `SELECTED :509`. */
const C = copyTable(
	EN.common,
	[
		'COLLAPSE_COLUMN',
		'EXPAND_COLUMN',
		'TOMORROW',
		'YESTERDAY',
		'LABELS',
		'CLEAR_FILTERS',
		'CLEAR',
		'EDIT_TASK',
		'TODAY',
		'OPEN',
		'CREATE_TASK',
		'WORKED',
		'FILTER',
		'ISSUE_TYPE',
		'FILTER_ALL',
		'COPY_ISSUE_LINK',
		'COPY_TASK_ID',
		'MAKE_A_COPY',
		'ASSIGNEE',
		'MOVE_TO',
		'LIVE',
		'MORE_OPTIONS',
		'SELECTED',
		'ASSIGN_TASK_TO_ME',
		'EDIT_STATUS'
	],
	'common'
);
/** `pages.taskDetails`: `EPIC :2387`, `SIZE :2392`, `PRIORITY :2393` — the filter menu's row labels. */
const D = copyTable(EN.pages.taskDetails, ['EPIC', 'SIZE', 'PRIORITY'], 'pages.taskDetails');
/** `form.TASK_INPUT_PLACEHOLDER` `:3432` — the create form's title field (`task-input-kanban.tsx:303`). */
const F = copyTable(EN.form, ['TASK_INPUT_PLACEHOLDER'], 'form');
/** `{count, plural, one {# task hidden by the filters} other {# tasks hidden by the filters}}` (`pages.kanban:2369`). */
const pluralOf = (template: string, count: number) => {
	const branch = (count === 1 ? /one\s*\{([^{}]*)\}/ : /other\s*\{([^{}]*)\}/).exec(template);
	if (!branch) throw new Error(`no plural branch for ${count} in ${template}`);
	return branch[1].replaceAll('#', String(count));
};
const filled = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The hidden-by-filters bar for any count: both plural branches of `pages.kanban.TASKS_HIDDEN_BY_FILTERS`, by key. */
const anyHiddenBar = (page: Page) =>
	page.getByText(
		new RegExp(
			[1, 2]
				.map((count) => escapeRegExp(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, count)).replace(String(count), '\\d+'))
				.join('|')
		)
	);

const report = (label: string, value: unknown) =>
	console.log(`[lane-b kanban] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** React's dev-mode store warning, not this page's (see `suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;

type Shield = { consoleErrors: () => string[]; logMatching: (pattern: RegExp) => string[] };

/** Only the store warning is excused everywhere; a test that arms a refusal names its own lines (`DEV_MUTATION_NOISE`
 *  among them), so a mutation that fails where nothing was armed still fails the test. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/* ------------------------------------------------------------------ served board ---------------------------------- */

const UUID_LEAD: Record<string, string> = {
	status: '90000000',
	task: '70000000',
	tag: '50000000',
	priority: '40000000',
	size: '30000000'
};
const uuid = (kind: string, index: number) => `${UUID_LEAD[kind]}-0000-4000-8000-${String(index).padStart(12, '0')}`;

/** A status as this file serves it: `taskStatusSchema` is `.strict()`, so only its own keys (`task-status.schema.ts:12-42`). */
type ServedStatus = {
	id: string;
	name: string;
	value: string;
	color: string | null;
	order: number;
	isCollapsed?: boolean;
	isSystem?: boolean;
	isDefault?: boolean;
	isTodo?: boolean;
	isInProgress?: boolean;
	tenantId: string;
	organizationId: string;
	organizationTeamId: string;
};

/** A label: `tagSchema` is `.strict()` too (`tag.schema.ts:22-24`). */
type ServedTag = { id: string; name: string; color: string | null; tenantId: string; organizationId: string };

/** A task assignee, in the shape the lane mock answers `task.members` with (`mock-gauzy-server.mjs:134-143`). */
type ServedMember = {
	id: string;
	userId: string;
	fullName: string;
	isTrackingEnabled: boolean;
	isActive: boolean;
	organizationTeamId: string;
	organizationId: string;
	tenantId: string;
};

/** A team task: the shape `mock-gauzy-server.mjs:183-196` answers with, plus the properties the cards print. */
type ServedTask = {
	id: string;
	title: string;
	number: number;
	public: boolean | null;
	status: string;
	taskStatusId: string;
	estimate: number;
	priority?: string | null;
	size?: string | null;
	createdAt: string;
	tags: ServedTag[];
	members: ServedMember[];
	teams: Array<{ id: string; name: string; organizationId: string; tenantId: string }>;
	tenantId: string;
	organizationId: string;
};

type Refusal = { status: number; message: string };

type BoardScript = {
	statuses: ServedStatus[];
	tasks: ServedTask[];
	priorities?: Array<{ id: string; name: string; value: string; color: string | null }>;
	sizes?: Array<{ id: string; name: string; value: string; color: string | null }>;
	labels?: ServedTag[];
	taskWriteRefusal?: Refusal;
	statusWriteRefusal?: Refusal;
	createRefusal?: Refusal;
	/** Serve the bootstrap with no statuses at all (the board's own empty state). */
	noStatuses?: boolean;
};

type ServedCall = { method: string; path: string; search: string; body: Record<string, unknown> | null };

type BoardApi = {
	calls: ServedCall[];
	statuses: ServedStatus[];
	tasks: ServedTask[];
	/** The board's reads on the mock origin, as the browser sent them. */
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	writesOf: (method: string, pathPrefix: string) => ServedCall[];
	shapes: () => string[];
};

/**
 * This file's stand-in for the task platform, on the mock origin, because the mock's own answers are one task and two
 * system statuses (`mock-gauzy-server.mjs:677-678`, `:686`). The answer is always the current store, so a move, a
 * collapse or a create changes what the next read returns, and a refusal changes nothing.
 */
async function serveBoard(page: Page, script: BoardScript): Promise<BoardApi> {
	const store = {
		statuses: [...script.statuses],
		tasks: [...script.tasks],
		priorities: [...(script.priorities ?? [])],
		sizes: [...(script.sizes ?? [])],
		labels: [...(script.labels ?? [])]
	};
	const calls: ServedCall[] = [];
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === BOOTSTRAP_ROUTE ||
			url.pathname.startsWith(TASKS_ROUTE) ||
			url.pathname.startsWith(TASK_STATUSES_ROUTE));

	const answer = (route: Route, status: number, body?: unknown) =>
		route.fulfill({
			status,
			headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
			body: body === undefined ? '' : JSON.stringify(body)
		});

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const url = new URL(request.url());
		if (method === 'OPTIONS') {
			return answer(route, 204);
		}
		const body = request.postData() ? (JSON.parse(request.postData() as string) as Record<string, unknown>) : null;
		calls.push({ method, path: url.pathname, search: decodeURIComponent(url.search), body });

		if (url.pathname === BOOTSTRAP_ROUTE && method === 'GET') {
			const pagination = <T>(items: T[]) => ({ items, total: items.length });
			return answer(route, 200, {
				taskStatuses: pagination(script.noStatuses ? [] : store.statuses),
				taskPriorities: pagination(store.priorities),
				taskSizes: pagination(store.sizes),
				taskLabels: pagination(store.labels),
				taskVersions: pagination([]),
				issueTypes: pagination([]),
				relatedIssueTypes: pagination([])
			});
		}

		if (url.pathname === TEAM_TASKS_ROUTE && method === 'GET') {
			// `task.service.ts:143-151` sends `skip` as a 1-based page and asks for `order[createdAt] DESC, order[id] DESC`:
			// this stand-in sorts the same way a Gauzy holding those orders would, so a page's content is decided, not racy.
			const newestFirst = [...store.tasks].sort(
				(first, second) => second.createdAt.localeCompare(first.createdAt) || second.id.localeCompare(first.id)
			);
			const take = Number(url.searchParams.get('take') ?? '');
			const skip = Number(url.searchParams.get('skip') ?? '');
			const items =
				Number.isFinite(take) && take > 0 && Number.isFinite(skip) && skip >= 1
					? newestFirst.slice((skip - 1) * take, skip * take)
					: newestFirst;
			return answer(route, 200, { items, total: store.tasks.length });
		}

		if (url.pathname.startsWith(`${TASKS_ROUTE}/`) && method === 'PUT') {
			const taskId = decodeURIComponent(url.pathname.slice(TASKS_ROUTE.length + 1));
			if (script.taskWriteRefusal) return answer(route, script.taskWriteRefusal.status, script.taskWriteRefusal);
			const current = store.tasks.find((task) => task.id === taskId);
			if (!current) return answer(route, 404, { statusCode: 404, message: `no task ${taskId} here` });
			const merged = { ...current, ...(body as object) } as ServedTask;
			const status = store.statuses.find((entry) => entry.id === merged.taskStatusId);
			merged.status = status ? status.name : merged.status;
			store.tasks = store.tasks.map((task) => (task.id === taskId ? merged : task));
			return answer(route, 200, merged);
		}

		if (url.pathname === TASKS_ROUTE && method === 'POST') {
			if (script.createRefusal) return answer(route, script.createRefusal.status, script.createRefusal);
			const created = {
				...(body as object),
				id: uuid('task', store.tasks.length + 101),
				createdAt: new Date().toISOString(),
				public: false,
				number: store.tasks.length + 101,
				status: String((body?.status as string) ?? ''),
				taskStatusId: String(body?.taskStatusId ?? ''),
				estimate: Number(body?.estimate ?? 0),
				tags: (body?.tags as ServedTag[]) ?? [],
				members: (body?.members as ServedMember[]) ?? [],
				// the client posts `teams: [{ id }]` only (`task.service.ts:350-399`); a platform answers the full team, which
				// is what the client's own re-read of the list then validates against
				teams: ((body?.teams as Array<{ id: string }>) ?? []).map(
					(entry) => store.tasks[0]?.teams.find((team) => team.id === entry.id) ?? entry
				),
				organizationId: store.tasks[0]?.organizationId ?? '',
				tenantId: store.tasks[0]?.tenantId ?? ''
			} as ServedTask;
			store.tasks = [...store.tasks, created];
			return answer(route, 201, created);
		}

		if (url.pathname.startsWith(`${TASK_STATUSES_ROUTE}/`) && method === 'PUT') {
			const statusId = decodeURIComponent(url.pathname.slice(TASK_STATUSES_ROUTE.length + 1));
			if (script.statusWriteRefusal)
				return answer(route, script.statusWriteRefusal.status, script.statusWriteRefusal);
			store.statuses = store.statuses.map((status) =>
				status.id === statusId
					? {
							...status,
							...(body?.isCollapsed === true || body?.isCollapsed === false
								? { isCollapsed: Boolean(body.isCollapsed) }
								: {}),
							...(typeof body?.order === 'number' ? { order: body.order } : {})
						}
					: status
			);
			return answer(route, 200, { generatedMaps: [], raw: [], affected: 1 });
		}

		return answer(route, 599, { message: `no answer scripted for ${method} ${url.pathname}` });
	});

	return {
		calls,
		get statuses() {
			return store.statuses;
		},
		get tasks() {
			return store.tasks;
		},
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		writesOf: (method, pathPrefix) =>
			calls.filter((call) => call.method === method && call.path.startsWith(pathPrefix)),
		shapes: () =>
			calls.map(
				(call) =>
					`${call.method} ${call.path}${call.search ? `?${call.search}` : ''}${
						call.body ? ` ${JSON.stringify(call.body)}` : ''
					}`
			)
	};
}

/**
 * The board this file serves: 4 statuses (the last collapsed), priorities, sizes, labels, and tasks of every shape.
 * `dayOffsets` (in days from now, one per task) is how the creation-day switch gets something to narrow to; the test
 * process and the browser share this machine's clock, so a task at "now − 1 day" is on yesterday for both.
 */
function boardScript(fixture: BootstrapFixture, options: { count?: number; dayOffsets?: number[] } = {}): BoardScript {
	const taskCount = options.count ?? 5;
	const { ids, names } = fixture;
	const scope = { tenantId: ids.tenantA, organizationId: ids.organizationA };
	const team = { id: ids.teamA, name: names.teamA, organizationId: ids.organizationA, tenantId: ids.tenantA };
	const statusOf = (index: number, name: string, extra: Partial<ServedStatus> = {}): ServedStatus => ({
		id: uuid('status', index),
		name,
		value: name,
		color: '#94a3b8',
		order: index,
		...scope,
		organizationTeamId: ids.teamA,
		...extra
	});
	const tagOf = (index: number, name: string): ServedTag => ({
		id: uuid('tag', index),
		name,
		color: '#38bdf8',
		...scope
	});
	const memberOf = (employeeId: string, userId: string, fullName: string): ServedMember => ({
		id: employeeId,
		userId,
		fullName,
		isTrackingEnabled: true,
		isActive: true,
		organizationTeamId: ids.teamA,
		...scope
	});
	// Distinct `createdAt` values, oldest first, so the read's `order[createdAt]=DESC` decides the list deterministically.
	// Calendar days, not 24-hour steps: `setDate` keeps the local time of day across a daylight-saving change.
	const createdOf = (index: number) => {
		const at = new Date(Date.now() - (taskCount - index) * 60_000);
		at.setDate(at.getDate() + (options.dayOffsets?.[index - 1] ?? 0));
		return at.toISOString();
	};
	const taskOf = (index: number, title: string, extra: Partial<ServedTask>): ServedTask => ({
		id: uuid('task', index),
		title,
		number: 100 + index,
		public: false,
		status: 'open',
		taskStatusId: statusOf(1, 'open').id,
		estimate: 0,
		createdAt: createdOf(index),
		tags: [],
		members: [],
		teams: [team],
		...scope,
		...extra
	});

	const open = statusOf(1, 'open', { isSystem: true, isDefault: true, isTodo: true });
	const doing = statusOf(2, 'in-progress', { isSystem: true, isInProgress: true });
	const review = statusOf(3, 'code-review');
	const blocked = statusOf(4, 'blocked', { isCollapsed: true });
	const labels = [tagOf(1, 'frontend'), tagOf(2, 'backend'), tagOf(3, 'probe-label')];
	const manager = memberOf(ids.employee, ids.user, names.user);
	const teammate = memberOf(ids.teammateEmployee, ids.teammateUser, names.teammate);

	const tasks: ServedTask[] = [
		taskOf(1, 'Probe card one', {
			taskStatusId: open.id,
			priority: 'urgent',
			size: 'small',
			tags: labels,
			members: [manager],
			estimate: 3600
		}),
		taskOf(2, 'Probe card two', { taskStatusId: open.id }),
		taskOf(3, 'Probe card three', {
			status: 'in-progress',
			taskStatusId: doing.id,
			members: [teammate],
			estimate: 7200
		}),
		taskOf(4, 'Probe card four', { status: 'blocked', taskStatusId: blocked.id, members: [manager] }),
		// A status id the board was not given: the card must name its own status (`strayStatusOf`).
		taskOf(5, 'Probe stray five', { status: 'archived', taskStatusId: uuid('status', 99) })
	];
	for (let index = 6; index <= taskCount; index += 1) {
		tasks.push(taskOf(index, `Probe bulk ${index}`, { taskStatusId: index % 2 === 0 ? doing.id : open.id }));
	}

	return {
		statuses: [open, doing, review, blocked],
		labels,
		priorities: [
			{ id: uuid('priority', 1), name: 'Urgent', value: 'urgent', color: '#ef4444' },
			{ id: uuid('priority', 2), name: 'Low', value: 'low', color: null }
		],
		sizes: [{ id: uuid('size', 1), name: 'Small', value: 'small', color: '#38bdf8' }],
		tasks
	};
}

const LANE_STATUS_NAMES = ['open', 'in-progress', 'code-review', 'blocked'] as const;
/** What `statusLabelOf` prints for each of them (`kanban-lane.tsx:53-56`). */
const laneLabel = (name: string) => name.split('-').join(' ');

const laneSection = (page: Page, label: string): Locator =>
	page.locator(`section[aria-label="${label}"]`).filter({ has: page.locator('h2') });
const hiddenRail = (page: Page): Locator => page.locator(`section[aria-label="${K.HIDDEN_COLUMNS}"]`);
const cardOf = (page: Page, taskId: string): Locator => page.locator(`[data-task-id="${taskId}"]`);
const laneCards = (page: Page, label: string): Locator => laneSection(page, label).locator('[data-task-id]');
const cardIdsOf = (page: Page, label: string) =>
	laneCards(page, label).evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id') ?? ''));
const cardTextOf = (page: Page, taskId: string) => cardOf(page, taskId).innerText();
/**
 * The lane header's own row (`kanban-lane.tsx:132`). A plain `> div` is ambiguous — the lane body is the section's
 * other direct child (measured: `section[aria-label="in progress"] > div` resolved to 2, `p3.log` P14) — and `h2` is a
 * grandchild of the row (it sits in the drag handle `:133`), so the descendant form of `:has` is what separates them
 * (`:has(> h2)` matched nothing, `p4.log` R1/Q2/Q4).
 */
const laneHeaderRow = (page: Page, label: string) => laneSection(page, label).locator('> div:has(h2)');
const laneMenuButton = (page: Page, label: string) =>
	laneHeaderRow(page, label).getByRole('button', { name: C.MORE_OPTIONS });
const laneAddButton = (page: Page, label: string) =>
	laneHeaderRow(page, label).getByRole('button', { name: C.CREATE_TASK });
/** The lane's drag handle: the div holding the tile, the `<h2>` and the count (`kanban-lane.tsx:133`). */
const laneHandle = (page: Page, label: string) => laneSection(page, label).locator('h2').locator('xpath=..');
const cardIndexOf = async (page: Page, label: string, taskId: string) => (await cardIdsOf(page, label)).indexOf(taskId);

/** The board's own sections, in DOM order. The shell's notifications region (`aria-label="Notifications alt+T"`,
 *  measured in `p2.log` P2) is the only other labelled section on this page, so it is named out. */
const boardLaneLabels = (page: Page) =>
	page
		.locator('section[aria-label]')
		.evaluateAll((nodes) =>
			nodes
				.map((node) => node.getAttribute('aria-label') ?? '')
				.filter((label) => !label.startsWith('Notifications'))
		);
/** The count chip as a locator, for `toHaveText` instead of a snapshot read. */
const laneCountChip = (page: Page, label: string) => laneSection(page, label).locator('h2 + span');
/**
 * The ids one lane holds before anything was dragged: this file's stand-in answers the read sorted
 * `createdAt DESC, id DESC`, and `buildKanbanLanes` (`core/lib/utils/kanban-board.ts:199-217`) puts every task in the
 * lane of its `taskStatusId`, or in the first lane when no status has it.
 */
function servedLaneIds(script: BoardScript, statusId: string) {
	const orderedStatuses = [...script.statuses].sort((first, second) => first.order - second.order);
	const firstStatusId = orderedStatuses[0]?.id;
	const laneOf = (task: ServedTask) =>
		orderedStatuses.some((status) => status.id === task.taskStatusId) ? task.taskStatusId : firstStatusId;
	return [...script.tasks]
		.sort((first, second) => second.createdAt.localeCompare(first.createdAt) || second.id.localeCompare(first.id))
		.filter((task) => laneOf(task) === statusId)
		.map((task) => task.id);
}

/** Every API call the browser sent to the mock origin under a path prefix. */
function watchApi(page: Page, prefixes: string[]) {
	const calls: Array<{ method: string; path: string; search: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && prefixes.some((prefix) => url.pathname.startsWith(prefix))) {
			calls.push({ method: request.method(), path: url.pathname, search: decodeURIComponent(url.search) });
		}
	});
	return { calls, of: (prefix: string) => calls.filter((call) => call.path.startsWith(prefix)) };
}

/** Reads a page fires at once arrive in race order: compare them sorted, never as an ordered list. */
const sorted = <T extends string>(items: T[]) => [...items].sort();

const dragByMouse = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	// A press only becomes a drag once the pointer moves: step out of the card, then across, then onto the target.
	await page.mouse.move(from.x, from.y + 26, { steps: 5 });
	await page.mouse.move((from.x + to.x) / 2, (from.y + to.y) / 2, { steps: 8 });
	await page.mouse.move(to.x, to.y, { steps: 8 });
	await page.mouse.up();
};

const boxOf = async (locator: Locator) => {
	const box = await locator.boundingBox();
	if (!box) throw new Error('the drag locator has no box');
	return box;
};

/** A point on the card's own property row: not the title link (`draggable={false}`, `kanban-task-card.tsx:230`) or a button. */
const cardDragPoint = async (page: Page, taskId: string) => {
	const box = await boxOf(cardOf(page, taskId).locator('article'));
	return { x: box.x + 14, y: box.y + 16, box };
};

/** Serves this file's board, signs the fixture person in and lands on `/kanban`. Every test then waits for the one
 *  locator its own step acts on — the lane config sets no `actionTimeout`, so an early action would hang otherwise. */
const openBoard = async (page: Page, fixture: BootstrapFixture, script: BoardScript) => {
	const api = await serveBoard(page, script);
	await signInAndVisit(page, fixture, KANBAN_PATH);
	return api;
};

/** A point inside the first lane, once its first card is on screen. */
const openLaneReady = async (page: Page) => {
	const label = laneLabel(LANE_STATUS_NAMES[0]);
	await expect(laneSection(page, label).locator('[data-task-id]').first()).toBeVisible({ timeout: 20_000 });
	return label;
};

/* ------------------------------------------------------------------ the tests ---------------------------------- */

test('the board prints one lane per status, a rail for the collapsed one, and the card content its data holds', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	// listening before the first navigation, so the load's own reads are in it
	const reads = watchApi(page, ['/api/']);
	const api = await openBoard(page, fixture, script);
	const [open, doing, review, blocked] = LANE_STATUS_NAMES.map(laneLabel);
	const [openStatus] = script.statuses;
	const first = script.tasks[0];

	await expect(page.locator('h1').filter({ hasText: K.KANBAN_BOARD })).toBeVisible({ timeout: 20_000 });
	// the lanes in the statuses' `order` (`kanban-board.tsx:76`, `sortStatusesByOrder` `core/lib/utils/kanban-board.ts:52`),
	// the collapsed status in the rail instead of a lane (`kanban-board.tsx:77` → `kanban-hidden-lanes.tsx:77`)
	await expect.poll(() => boardLaneLabels(page)).toEqual([open, doing, review, K.HIDDEN_COLUMNS]);

	const openIds = servedLaneIds(script, openStatus.id);
	await expect(laneCountChip(page, open)).toHaveText(String(openIds.length));
	await expect(laneCountChip(page, doing)).toHaveText(String(servedLaneIds(script, script.statuses[1].id).length));
	await expect(laneCountChip(page, review)).toHaveText('0');
	await expect(hiddenRail(page)).toContainText(new RegExp(blocked, 'i'));
	await expect(hiddenRail(page).getByRole('button', { name: C.EXPAND_COLUMN }).first()).toBeVisible();
	await expect(hiddenRail(page).locator('li')).toHaveCount(
		script.statuses.filter((status) => status.isCollapsed).length
	);

	// the card of a task whose status no lane has is printed in the first lane and names its own status
	const stray = script.tasks[4];
	await expect(laneSection(page, open).locator(`[data-task-id="${stray.id}"]`)).toBeVisible();
	await expect(cardOf(page, stray.id)).toContainText(new RegExp(String(stray.status), 'i'));

	const card = cardOf(page, first.id);
	await expect(card.locator('article')).toHaveAttribute('aria-label', first.title);
	await expect(card).toContainText(`#${first.number}`);
	await expect(card).toContainText(first.title);
	await expect(card).toContainText(new RegExp(String(first.priority), 'i'));
	await expect(card).toContainText(new RegExp(String(first.size), 'i'));
	for (const label of (first.tags ?? []).slice(0, 2)) {
		await expect(card).toContainText(new RegExp(label.name, 'i'));
	}
	// `VISIBLE_LABEL_COUNT = 2` (`kanban-task-card.tsx:47`): the rest collapse into a `+N` chip
	await expect(card).toContainText(`+${(first.tags ?? []).length - 2}`);
	await expect(card).toContainText('0%');
	await expect(card).toContainText(C.WORKED);
	await expect(card).toContainText('0h 0m');

	// the metadata all arrives from one call; the per-section reads never happen (`use-task-statuses-query.ts:41-47`)
	const taskReads = api.reads().filter((call) => call.path.startsWith('/api/task'));
	report('board reads', sorted([...new Set(taskReads.map((call) => call.path))]));
	expect(sorted([...new Set(taskReads.map((call) => call.path))])).toEqual([BOOTSTRAP_ROUTE, TEAM_TASKS_ROUTE]);
	const bootstrapRead = taskReads.find((call) => call.path === BOOTSTRAP_ROUTE);
	expect(bootstrapRead?.search).toContain(
		'include=issueTypes,relatedIssueTypes,taskLabels,taskPriorities,taskSizes,taskStatuses,taskVersions'
	);
	const teamRead = taskReads.find((call) => call.path === TEAM_TASKS_ROUTE);
	for (const part of ['take=50', 'skip=1', 'order[createdAt]=DESC', 'order[id]=DESC', 'relations[0]=tags']) {
		expect(teamRead?.search).toContain(part);
	}
	const neverRead = ['/api/task-statuses', '/api/task-priorities', '/api/task-sizes', '/api/tags/level'];
	report(
		'per-section reads',
		neverRead.filter((path) => reads.calls.some((call) => call.path === path))
	);
	expect(neverRead.filter((path) => reads.calls.some((call) => call.path === path))).toEqual([]);

	// no card selection on this lane (finding 4): `isTaskViewsEnabled()` is off, so no `SelectCheck` is mounted
	await expect(page.locator('[role="checkbox"]')).toHaveCount(0);

	report('board lanes', await boardLaneLabels(page));
	report('open lane cards', await cardIdsOf(page, open));
	expect(consoleFindings(shield)).toEqual([]);
});

test('dragging a card into another lane sends the whole task, and the lane it lands in survives a reload', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const review = laneLabel('code-review');
	const moved = script.tasks[0];
	const reviewStatus = script.statuses[2];
	const openCount = servedLaneIds(script, script.statuses[0].id).length;

	const from = await cardDragPoint(page, moved.id);
	const target = await boxOf(laneSection(page, review));
	await dragByMouse(page, from, { x: target.x + target.width / 2, y: target.y + target.height - 60 });

	await expect(laneSection(page, review).locator(`[data-task-id="${moved.id}"]`)).toBeVisible({ timeout: 15_000 });
	await expect(laneCountChip(page, review)).toHaveText('1');
	await expect(laneCountChip(page, open)).toHaveText(String(openCount - 1));

	const writes = api.writes();
	report(
		'move writes',
		writes.map((call) => `${call.method} ${call.path} ${JSON.stringify(Object.keys(call.body ?? {}))}`)
	);
	expect(writes).toHaveLength(1);
	const [move] = writes;
	expect(move.method).toBe('PUT');
	expect(move.path).toBe(`${TASKS_ROUTE}/${moved.id}`);
	const body = move.body as Record<string, unknown>;
	// finding 1: `moveTask` spreads the whole task (`use-kanban-lanes.ts:160`); the keys are the ones `p2.log` P3 printed
	expect(sorted(Object.keys(body))).toEqual([
		'createdAt',
		'estimate',
		'id',
		'label',
		'members',
		'number',
		'organizationId',
		'priority',
		'public',
		'size',
		'status',
		'tags',
		'taskStatusId',
		'teams',
		'tenantId',
		'title'
	]);
	expect(body.status).toBe(reviewStatus.name);
	expect(body.taskStatusId).toBe(reviewStatus.id);
	expect(body.title).toBe(moved.title);
	expect(body.number).toBe(moved.number);
	// `label` is not this page's field: it is the first tag's name, written into the shared task store on read
	// (`use-team-tasks-query.ts:176-180`) and sent back out with the rest of the task
	expect(body.label).toBe(moved.tags[0].name);
	expect(body.members).toEqual([moved.members[0]]);

	report('board after move', await boardLaneLabels(page));
	report('review lane cards', await cardIdsOf(page, review));

	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(laneSection(page, review).locator(`[data-task-id="${moved.id}"]`)).toBeVisible({ timeout: 20_000 });
	await expect(laneCountChip(page, review)).toHaveText('1');
	await expect(laneCountChip(page, open)).toHaveText(String(openCount - 1));
	expect(api.tasks.find((task) => task.id === moved.id)?.taskStatusId).toBe(reviewStatus.id);

	report('reads total', sorted(api.reads().map((call) => call.path)));
	expect(consoleFindings(shield)).toEqual([]);
});

test('a card dropped inside its own lane reorders it with no write, and a stray card dropped there takes the lane status', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const openStatus = script.statuses[0];
	// the read's order is the board's first paint (`p5.log` R6: `…105, …102, …101` held through a 2.5 s settle).
	// `#105` is the stray card, shown in this lane without belonging to it, so the lane's own cards are the two after it
	const laneIds = servedLaneIds(script, openStatus.id);
	const strayId =
		laneIds.find((id) => script.tasks.find((task) => task.id === id)?.taskStatusId !== openStatus.id) ?? '';
	const ownIds = laneIds.filter((id) => id !== strayId);
	const movedId = ownIds[0];
	const hostId = ownIds[1];
	const movedFrom = laneIds.indexOf(movedId);
	const hostFrom = laneIds.indexOf(hostId);

	const dropOnBottomEdge = async (taskId: string, hostTaskId: string) => {
		const from = await cardDragPoint(page, taskId);
		const hostBox = (await cardDragPoint(page, hostTaskId)).box;
		// the bottom edge of the card below: a drop inside the dragged card's own slot returns before any move
		// (`kanban-board.tsx:92-95`), which is what `p2.log` P4 measured
		await dragByMouse(page, from, { x: hostBox.x + 14, y: hostBox.y + hostBox.height - 6 });
	};

	await dropOnBottomEdge(movedId, hostId);
	await expect.poll(() => cardIndexOf(page, open, movedId), { timeout: 15_000 }).toBe(hostFrom);
	await expect.poll(() => cardIndexOf(page, open, hostId)).toBe(movedFrom);
	report('lane order after the same-lane drag', await cardIdsOf(page, open));
	// same status → no request at all (`use-kanban-lanes.ts:156-159`), measured: `p3.log` P13 and this file's run
	expect(api.writes()).toEqual([]);
	await expect(laneCountChip(page, open)).toHaveText(String(laneIds.length));

	// Gauzy keeps no order inside a status (`core/lib/utils/kanban-board.ts:24`), so a reload shows the read's order
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(laneSection(page, open).locator('[data-task-id]').first()).toBeVisible({ timeout: 20_000 });
	await expect.poll(() => cardIndexOf(page, open, movedId)).toBe(movedFrom);
	report('lane order after reload', await cardIdsOf(page, open));

	// The stray card is the exception: `moveTask` compares the task's own status with the lane's
	// (`use-kanban-lanes.ts:156-159`), and they differ, so moving it *inside* that lane is a status change for the
	// platform. Measured `s3-lane-b-kanban-measure2.log`: `PUT /api/tasks/<stray id>` with `status:"open"` and that
	// lane's `taskStatusId`, while the card stayed in the same lane.
	const stray = script.tasks.find((task) => task.id === strayId) as ServedTask;
	await dropOnBottomEdge(strayId, ownIds[0]);
	await expect.poll(() => cardIndexOf(page, open, strayId), { timeout: 15_000 }).toBe(1);
	const adopted = api.writesOf('PUT', `${TASKS_ROUTE}/`);
	report(
		'stray card write',
		adopted.map((call) => `${call.method} ${call.path} ${JSON.stringify(call.body)}`)
	);
	expect(adopted).toHaveLength(1);
	expect(adopted[0].path).toBe(`${TASKS_ROUTE}/${strayId}`);
	expect((adopted[0].body as Record<string, unknown>).status).toBe(openStatus.name);
	expect((adopted[0].body as Record<string, unknown>).taskStatusId).toBe(openStatus.id);
	expect(stray.status).not.toBe(openStatus.name);
	expect(api.tasks.find((task) => task.id === strayId)?.status).toBe(openStatus.name);
	await expect(laneCountChip(page, open)).toHaveText(String(laneIds.length));

	expect(consoleFindings(shield)).toEqual([]);
});

const cardMenuButton = (page: Page, taskId: string) =>
	cardOf(page, taskId).locator(`button[aria-label="${C.MORE_OPTIONS}"]`);

/** Opens the card's `Move to` submenu, which lists one row per lane status (`kanban-task-menu.tsx:126-137`). */
const openMoveSubmenu = async (page: Page, taskId: string) => {
	await cardMenuButton(page, taskId).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.MOVE_TO }).click({ timeout: 15_000 });
	await expect(page.locator('[role="menuitemcheckbox"]').first()).toBeVisible({ timeout: 15_000 });
};

test('the card menu lists its actions, moves the card by status name and copies it into the same lane', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	await openLaneReady(page);
	const [openStatus, doingStatus] = script.statuses;
	const moved = script.tasks[1];
	const copyTitle = `Copy ${moved.title}`;

	await expect(cardOf(page, moved.id)).toBeVisible({ timeout: 20_000 });
	await cardMenuButton(page, moved.id).click({ timeout: 15_000 });
	report('card menu items', (await page.locator('[role="menuitem"]').allInnerTexts()).map(flat));
	for (const name of [
		C.OPEN,
		C.EDIT_TASK,
		C.MOVE_TO,
		C.ASSIGN_TASK_TO_ME,
		C.ASSIGNEE,
		C.COPY_ISSUE_LINK,
		C.COPY_TASK_ID,
		C.MAKE_A_COPY
	]) {
		await expect(page.getByRole('menuitem', { name })).toBeVisible({ timeout: 10_000 });
	}
	// `Move to` and `Assignee` are the submenu triggers (`p3.log` P8); the rest act on the spot
	expect(
		await page
			.locator('[role="menuitem"][aria-haspopup]')
			.evaluateAll((nodes) => nodes.map((n) => n.textContent ?? ''))
	).toEqual([C.MOVE_TO, C.ASSIGNEE]);
	await page.keyboard.press('Escape');

	await openMoveSubmenu(page, moved.id);
	const statusLabels = script.statuses.map((status) => laneLabel(status.name));
	report('move submenu rows', (await page.locator('[role="menuitemcheckbox"]').allInnerTexts()).map(flat));
	await expect(page.locator('[role="menuitemcheckbox"]')).toHaveCount(statusLabels.length);
	// the status the card already has is marked with `common.SELECTED` and is not a choice (`kanban-task-menu.tsx:196-203`)
	await expect(
		page.getByRole('menuitemcheckbox', { name: new RegExp(laneLabel(openStatus.name), 'i') })
	).toContainText(C.SELECTED);
	await page.getByRole('menuitemcheckbox', { name: new RegExp(laneLabel(doingStatus.name), 'i') }).click({
		timeout: 15_000
	});

	await expect(laneSection(page, laneLabel(doingStatus.name)).locator(`[data-task-id="${moved.id}"]`)).toBeVisible({
		timeout: 15_000
	});
	const moveWrites = api.writesOf('PUT', `${TASKS_ROUTE}/`);
	report(
		'menu move write',
		moveWrites.map((call) => `${call.method} ${call.path} ${JSON.stringify(call.body)}`)
	);
	expect(moveWrites).toHaveLength(1);
	const moveBody = moveWrites[0].body as Record<string, unknown>;
	// the whole task again, minus `priority`/`size`/`label` this card has none of (`p3.log` P8)
	expect(sorted(Object.keys(moveBody))).toEqual([
		'createdAt',
		'estimate',
		'id',
		'members',
		'number',
		'organizationId',
		'public',
		'status',
		'tags',
		'taskStatusId',
		'teams',
		'tenantId',
		'title'
	]);
	expect(moveBody.status).toBe(doingStatus.name);
	expect(moveBody.taskStatusId).toBe(doingStatus.id);

	await cardMenuButton(page, moved.id).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.MAKE_A_COPY }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', TASKS_ROUTE).length, { timeout: 15_000 }).toBe(1);
	const copyBody = api.writesOf('POST', TASKS_ROUTE)[0].body as Record<string, unknown>;
	report('copy write', JSON.stringify(copyBody));
	// `use-task-menu-actions.ts:41-58`: the task minus its `priority`, the title prefixed `Copy `, `Bug` when it has no issue type
	expect(sorted(Object.keys(copyBody))).toEqual([
		'description',
		'estimate',
		'issueType',
		'members',
		'organizationId',
		'projectId',
		'status',
		'tags',
		'taskStatusId',
		'teams',
		'tenantId',
		'title'
	]);
	expect(copyBody.title).toBe(copyTitle);
	expect(copyBody.issueType).toBe('Bug');
	expect(copyBody.taskStatusId).toBe(doingStatus.id);
	expect(copyBody.projectId).toBe(fixture.ids.project);
	expect(copyBody.teams).toEqual([{ id: fixture.ids.teamA }]);
	await expect.poll(() => api.tasks.length, { timeout: 15_000 }).toBe(script.tasks.length + 1);

	// the copy reaches the board with the list's own re-read (`task.service.ts:387`)
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(page.getByRole('article', { name: copyTitle })).toBeVisible({ timeout: 20_000 });
	// the lane now holds what the read gave it, plus the card this test moved in, plus the copy (`s3-lane-b-kanban-measure.log`)
	await expect(laneSection(page, laneLabel(doingStatus.name)).locator('article')).toHaveCount(
		servedLaneIds(script, doingStatus.id).length + 2
	);
	report('lane cards after the copy', await cardIdsOf(page, laneLabel(doingStatus.name)));

	expect(consoleFindings(shield)).toEqual([]);
});

test('editing a card title saves on Enter and cancels on Escape', async ({ page, fixture, shield }) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	await openLaneReady(page);
	const edited = script.tasks[1];
	const card = cardOf(page, edited.id);
	await expect(card).toBeVisible({ timeout: 20_000 });
	const newTitle = 'Probe title edited';

	await cardMenuButton(page, edited.id).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.EDIT_TASK }).click({ timeout: 15_000 });
	const editor = page.getByRole('textbox', { name: C.EDIT_TASK });
	await expect(editor).toBeVisible({ timeout: 15_000 });
	await editor.fill(newTitle);
	await editor.press('Enter');
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/${edited.id}`).length, { timeout: 15_000 }).toBe(1);
	report('title write', JSON.stringify(api.writesOf('PUT', `${TASKS_ROUTE}/${edited.id}`)[0].body));
	// Enter saves (`kanban-task-title-editor.tsx:39-45`); the body is the task with the new title
	expect((api.writesOf('PUT', `${TASKS_ROUTE}/${edited.id}`)[0].body as Record<string, unknown>).title).toBe(
		newTitle
	);
	await expect(card.locator('article')).toContainText(newTitle);

	const savedWrites = api.writes().length;
	await cardMenuButton(page, edited.id).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.EDIT_TASK }).click({ timeout: 15_000 });
	const editorAgain = page.getByRole('textbox', { name: C.EDIT_TASK });
	await expect(editorAgain).toBeVisible({ timeout: 15_000 });
	await editorAgain.fill('Probe title escaped');
	await editorAgain.press('Escape');
	// Escape hands the edit back with no request (`kanban-task-title-editor.tsx:46-49`)
	await expect(card.locator('article')).toBeVisible({ timeout: 15_000 });
	await expect.poll(() => api.writes().length).toBe(savedWrites);
	await expect(card.locator('article')).toContainText(newTitle);
	await expect(card.locator('article')).not.toContainText('Probe title escaped');
	report('card text after Escape', flat(await cardTextOf(page, edited.id)));

	expect(consoleFindings(shield)).toEqual([]);
});

test('a refused move leaves the board where it was and says why', async ({ page, fixture, shield }) => {
	const script = boardScript(fixture);
	const refusal = { status: 400, message: 'Probe refusal: bad status' };
	const api = await openBoard(page, fixture, { ...script, taskWriteRefusal: refusal });
	const open = await openLaneReady(page);
	const moved = script.tasks[0];
	const doingStatus = script.statuses[1];
	const openIds = servedLaneIds(script, script.statuses[0].id);

	await openMoveSubmenu(page, moved.id);
	await page.getByRole('menuitemcheckbox', { name: new RegExp(laneLabel(doingStatus.name), 'i') }).click({
		timeout: 15_000
	});
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/`).length, { timeout: 15_000 }).toBe(1);
	report('refused write', api.writesOf('PUT', `${TASKS_ROUTE}/`)[0].path);

	// `saveStatusField`/`updateTask` drop an unsaved change: the lane shows what the platform holds
	// (`use-kanban-lanes.ts:194-195`), and the platform here never changed (`p3.log` P11)
	await expect(laneSection(page, open).locator(`[data-task-id="${moved.id}"]`)).toBeVisible({ timeout: 15_000 });
	await expect(laneCountChip(page, open)).toHaveText(String(openIds.length));
	await expect(laneCountChip(page, laneLabel(doingStatus.name))).toHaveText(
		String(servedLaneIds(script, doingStatus.id).length)
	);
	expect(api.tasks.find((task) => task.id === moved.id)?.taskStatusId).toBe(script.statuses[0].id);

	// the toast names the refusal (pointer parked, so a hover cannot dismiss it first)
	await page.mouse.move(2, 2);
	await expect(
		page.locator('[data-sonner-toast]').filter({ hasText: `${refusal.status} · ${refusal.message}` })
	).toBeVisible({ timeout: 15_000 });
	report('refusal toast', (await page.locator('[data-sonner-toast]').allInnerTexts()).map(flat));

	report('refused console', shield.logMatching(/HTTP Error|Error updating|failed/i));
	expect(
		consoleFindings(shield, [
			armedHttpError('PUT', `/tasks/${moved.id}`, refusal.status),
			'Error updating task:',
			DEV_MUTATION_NOISE
		])
	).toEqual([]);
});

test('a team with more tasks than one page asks for the next page and prints both', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture, { count: 55 });
	const api = await openBoard(page, fixture, script);
	await openLaneReady(page);
	const teamReads = () => api.reads().filter((call) => call.path === TEAM_TASKS_ROUTE);
	// `use-team-tasks-query.ts:157-166` asks for the next page one at a time once the first reports more
	await expect.poll(() => teamReads().length, { timeout: 25_000 }).toBe(2);
	report(
		'paging reads',
		teamReads().map((call) => /take=\d+&skip=\d+/.exec(call.search)?.[0] ?? call.search)
	);
	expect(teamReads().map((call) => /take=\d+&skip=\d+/.exec(call.search)?.[0])).toEqual([
		'take=50&skip=1',
		'take=50&skip=2'
	]);

	const [open, doing, , blocked] = script.statuses;
	const collapsedIds = servedLaneIds(script, blocked.id);
	await expect(page.locator('[data-task-id]')).toHaveCount(script.tasks.length - collapsedIds.length);
	await expect(laneCountChip(page, laneLabel(open.name))).toHaveText(String(servedLaneIds(script, open.id).length));
	await expect(laneCountChip(page, laneLabel(doing.name))).toHaveText(String(servedLaneIds(script, doing.id).length));
	// the collapsed status stays a rail row, and its tasks are counted there, not as cards
	await expect(hiddenRail(page).locator('li')).toHaveCount(script.statuses.filter((s) => s.isCollapsed).length);
	await expect(hiddenRail(page).getByRole('listitem').first()).toContainText(laneLabel(blocked.name));
	report('lane cards', await cardIdsOf(page, laneLabel(open.name)));

	expect(consoleFindings(shield)).toEqual([]);
});

/** The statuses in the order the board lays them out (`sortStatusesByOrder`, `core/lib/utils/kanban-board.ts:52`). */
const sortedStatuses = (statuses: ServedStatus[]) => [...statuses].sort((first, second) => first.order - second.order);
/** The tasks whose `taskStatusId` no lane has; they land in the first lane (`core/lib/utils/kanban-board.ts:199-217`). */
const strayTaskIds = (script: BoardScript) =>
	script.tasks
		.filter((task) => !script.statuses.some((status) => status.id === task.taskStatusId))
		.map((task) => task.id);
/** The status id of the lane a served task lands in: its own status, or the first lane when none has it. */
const laneIdHolding = (script: BoardScript, task: ServedTask) => {
	const ordered = sortedStatuses(script.statuses);
	return ordered.some((status) => status.id === task.taskStatusId) ? task.taskStatusId : (ordered[0]?.id ?? '');
};
/** The ids of `tasks` that show as cards: one in a collapsed status sits in the rail, so it is not on the board. */
const cardIdsShown = (script: BoardScript, tasks: ServedTask[]) =>
	sorted(
		tasks
			.filter((task) => {
				const status = sortedStatuses(script.statuses).find(
					(entry) => entry.id === laneIdHolding(script, task)
				);
				return !status?.isCollapsed;
			})
			.map((task) => task.id)
	);
/**
 * What the rail's own text is: `Hidden columns` then one `label count` pair per collapsed status, in status order —
 * measured `p5.log` R1 printing `Hidden columns Open 3 Blocked 1` (`kanban-hidden-lanes.tsx:77-79,43-66`).
 */
const railTextOf = (statuses: ServedStatus[], countOf: (status: ServedStatus) => number) =>
	[
		K.HIDDEN_COLUMNS,
		...sortedStatuses(statuses)
			.filter((status) => status.isCollapsed)
			.flatMap((status) => [laneLabel(status.name), String(countOf(status))])
	]
		.join(' ')
		.toLowerCase();

test('collapsing a lane moves its cards into the rail with one write, and Expand column puts them back', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const [openStatus, , , blockedStatus] = script.statuses;
	const openIds = servedLaneIds(script, openStatus.id);
	const blockedIds = servedLaneIds(script, blockedStatus.id);

	// the lane menu offers `Create task`, `Collapse column`, `Edit status` (`kanban-lane.tsx:103-118`); the fixture person
	// gets the write rows because the mock's role holds no `ORG_TASK_SETTING` (`mock-gauzy-server.mjs:49`) and
	// `use-task-settings-access.ts:106-110` then falls back to team management (`p5.log` R1)
	await laneMenuButton(page, open).click({ timeout: 15_000 });
	report('lane menu rows', (await page.locator('[role="menuitem"]').allInnerTexts()).map(flat));
	for (const name of [C.CREATE_TASK, C.COLLAPSE_COLUMN, C.EDIT_STATUS]) {
		await expect(page.getByRole('menuitem', { name })).toBeVisible({ timeout: 10_000 });
	}
	await page.getByRole('menuitem', { name: C.COLLAPSE_COLUMN }).click({ timeout: 15_000 });

	await expect(laneSection(page, open)).toHaveCount(0);
	await expect(hiddenRail(page).locator('li')).toHaveCount(
		script.statuses.filter((status) => status.isCollapsed).length + 1
	);
	await expect.poll(() => api.writesOf('PUT', TASK_STATUSES_ROUTE).length, { timeout: 15_000 }).toBe(1);
	const collapseWrite = api.writesOf('PUT', TASK_STATUSES_ROUTE)[0];
	report('collapse write', `${collapseWrite.path} ${JSON.stringify(collapseWrite.body)}`);
	expect(collapseWrite.path).toBe(`${TASK_STATUSES_ROUTE}/${openStatus.id}`);
	// `saveStatusField` sends the one field it changed (`use-kanban-lanes.ts:179`); `api.service.ts:700-706` adds the scope
	expect(sorted(Object.keys(collapseWrite.body as object))).toEqual(['isCollapsed', 'organizationId', 'tenantId']);
	expect((collapseWrite.body as Record<string, unknown>).isCollapsed).toBe(true);
	expect(api.statuses.find((status) => status.id === openStatus.id)?.isCollapsed).toBe(true);
	// the rail lists every collapsed status in status order, each with its own card count
	// (`p5.log` R1: `Hidden columns Open 3 Blocked 1`) — `api.statuses` is the platform's state after that write
	await expect
		.poll(async () => flat(await hiddenRail(page).innerText()).toLowerCase(), { timeout: 15_000 })
		.toBe(railTextOf(api.statuses, (status) => (status.id === openStatus.id ? openIds.length : blockedIds.length)));

	await hiddenRail(page)
		.getByRole('listitem')
		.filter({ hasText: new RegExp(openStatus.name, 'i') })
		.getByRole('button', { name: C.EXPAND_COLUMN })
		.click({ timeout: 15_000 });

	await expect(laneSection(page, open)).toBeVisible({ timeout: 15_000 });
	await expect(laneCountChip(page, open)).toHaveText(String(openIds.length));
	await expect(laneCards(page, open)).toHaveCount(openIds.length);
	await expect.poll(() => api.writesOf('PUT', TASK_STATUSES_ROUTE).length, { timeout: 15_000 }).toBe(2);
	const expandWrite = api.writesOf('PUT', TASK_STATUSES_ROUTE)[1];
	report('expand write', JSON.stringify(expandWrite.body));
	expect((expandWrite.body as Record<string, unknown>).isCollapsed).toBe(false);
	await expect(hiddenRail(page).locator('li')).toHaveCount(
		script.statuses.filter((status) => status.isCollapsed).length
	);
	await expect
		.poll(async () => flat(await hiddenRail(page).innerText()).toLowerCase(), { timeout: 15_000 })
		.toBe(railTextOf(script.statuses, () => blockedIds.length));

	expect(consoleFindings(shield)).toEqual([]);
});

test('dragging a lane by its header writes the order of both statuses it changed, and a reload keeps it', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const [open, doing, review] = LANE_STATUS_NAMES.slice(0, 3).map(laneLabel);
	await openLaneReady(page);
	const [openStatus, doingStatus] = script.statuses;
	const strays = strayTaskIds(script);

	await expect.poll(() => boardLaneLabels(page)).toEqual([open, doing, review, K.HIDDEN_COLUMNS]);
	const from = await boxOf(laneHandle(page, doing));
	const to = await boxOf(laneHandle(page, open));
	await dragByMouse(page, { x: from.x + 30, y: from.y + 10 }, { x: to.x + 20, y: to.y + 12 });

	// one `{ order }` write per status whose index changed (`use-kanban-lanes.ts:208-220`), measured `p4.log` Q3
	await expect.poll(() => api.writesOf('PUT', TASK_STATUSES_ROUTE).length, { timeout: 15_000 }).toBe(2);
	const writes = api.writesOf('PUT', TASK_STATUSES_ROUTE);
	report(
		'lane reorder writes',
		writes.map((call) => `${call.path} ${JSON.stringify(call.body)}`)
	);
	expect(writes.map((call) => [call.path, (call.body as { order: number }).order])).toEqual([
		[`${TASK_STATUSES_ROUTE}/${doingStatus.id}`, 0],
		[`${TASK_STATUSES_ROUTE}/${openStatus.id}`, 1]
	]);
	for (const call of writes) {
		expect(sorted(Object.keys(call.body as object))).toEqual(['order', 'organizationId', 'tenantId']);
	}

	await expect.poll(() => boardLaneLabels(page)).toEqual([doing, open, review, K.HIDDEN_COLUMNS]);
	// a task with no status of these lanes rides in the first one (`core/lib/utils/kanban-board.ts:207`), so it followed
	// the lane that became first (`p4.log` Q3: `in progress:2`, `open:2`)
	await expect(laneCountChip(page, doing)).toHaveText(
		String(servedLaneIds(script, doingStatus.id).length + strays.length)
	);
	await expect(laneCountChip(page, open)).toHaveText(
		String(servedLaneIds(script, openStatus.id).length - strays.length)
	);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(laneSection(page, doing)).toBeVisible({ timeout: 20_000 });
	await expect.poll(() => boardLaneLabels(page)).toEqual([doing, open, review, K.HIDDEN_COLUMNS]);
	report(
		'status orders after reload',
		api.statuses.map((status) => `${status.name}:${status.order}`)
	);
	report('lanes after reload', await boardLaneLabels(page));

	expect(consoleFindings(shield)).toEqual([]);
});

/** Every card id on the board right now, in DOM order. The rail holds collapsed statuses, never cards (`p6.log` S2). */
const boardCardIds = (page: Page) =>
	page
		.locator('section[aria-label] [data-task-id]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id') ?? ''));

/**
 * The tasks this file served whose `createdAt` falls on the local calendar day `Date.now() + offset` days — the day
 * the switch calls `Yesterday` (-1), `Today` (0) and `Tomorrow` (1) (`core/lib/utils/kanban-board.ts:35-39,63-72`).
 */
const tasksCreatedOn = (script: BoardScript, offset: number) => {
	const day = new Date();
	day.setDate(day.getDate() + offset);
	const target = day.toDateString();
	return script.tasks.filter((task) => new Date(task.createdAt).toDateString() === target);
};

test('the creation-day switch keeps exactly the tasks created on the day picked, and counts what it hid', async ({
	page,
	fixture,
	shield
}) => {
	// One task on yesterday, one on tomorrow, the rest today: `wasCreatedOn` compares local calendar days
	// (`core/lib/utils/kanban-board.ts:55-72`), so the ±1 calendar-day offsets work in every timezone and across a
	// daylight-saving change. The kept sets are rebuilt from the served `createdAt` values when each day is checked
	// (`tasksCreatedOn`), so a run just after midnight (a "today" task a few minutes into yesterday) still holds; only a
	// midnight that passes during the test itself would not.
	const script = boardScript(fixture, { count: 6, dayOffsets: [0, 0, -1, 1, 0, 0] });
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const doing = laneLabel(LANE_STATUS_NAMES[1]);
	const review = laneLabel(LANE_STATUS_NAMES[2]);
	const [openStatus, doingStatus, reviewStatus] = script.statuses;
	const daySwitch = page.getByRole('tablist', { name: K.CREATION_DAY });
	const idsIn = (tasks: ServedTask[], statusId: string) =>
		sorted(tasks.filter((task) => laneIdHolding(script, task) === statusId).map((task) => task.id));
	const visibleIds = (tasks: ServedTask[]) => cardIdsShown(script, tasks);

	// `SegmentedControl` renders `role="tablist"` named by `pages.kanban.CREATION_DAY` (`segmented-control.tsx:141-145`,
	// `kanban-toolbar.tsx:158`) with items `common.FILTER_ALL`, `common.TODAY`, `common.YESTERDAY`, `common.TOMORROW`
	// (`kanban-toolbar.tsx:111-117`). The toolbar's other switch (the view tabs) is its own `tablist` named
	// `common.VIEW`, so `getByRole('tab')` unscoped resolves to 8 nodes (`p4.log` R4 logged 4 empty ones).
	await expect(daySwitch.getByRole('tab')).toHaveCount(4);
	for (const label of [C.FILTER_ALL, C.TODAY, C.YESTERDAY, C.TOMORROW]) {
		await expect(daySwitch.getByRole('tab', { name: label })).toBeVisible({ timeout: 10_000 });
	}
	await expect(daySwitch.getByRole('tab', { name: C.FILTER_ALL })).toHaveAttribute('aria-selected', 'true');

	const expectDay = async (label: string, offset: number) => {
		await daySwitch.getByRole('tab', { name: label }).click({ timeout: 15_000 });
		const kept = tasksCreatedOn(script, offset);
		report(`cards kept on ${label}`, visibleIds(kept));
		await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(visibleIds(kept));
		await expect(laneCountChip(page, open)).toHaveText(String(idsIn(kept, openStatus.id).length));
		await expect(laneCountChip(page, doing)).toHaveText(String(idsIn(kept, doingStatus.id).length));
		await expect(laneCountChip(page, review)).toHaveText(String(idsIn(kept, reviewStatus.id).length));
		// the collapsed lane stays in the rail, and its own count follows the filter too (`p4.log` R4: `blocked0`)
		await expect(hiddenRail(page).locator('li')).toHaveCount(
			script.statuses.filter((status) => status.isCollapsed).length
		);
		await expect
			.poll(async () => flat(await hiddenRail(page).innerText()).toLowerCase(), { timeout: 15_000 })
			.toBe(railTextOf(script.statuses, (status) => idsIn(kept, status.id).length));
		await expect(daySwitch.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
		const hidden = script.tasks.length - kept.length;
		await expect(page.getByText(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, hidden))).toBeVisible({ timeout: 10_000 });
		report(`hidden bar on ${label}`, pluralOf(K.TASKS_HIDDEN_BY_FILTERS, hidden));
	};

	await expectDay(C.TODAY, 0);
	await expectDay(C.YESTERDAY, -1);
	await expectDay(C.TOMORROW, 1);

	await daySwitch.getByRole('tab', { name: C.FILTER_ALL }).click({ timeout: 15_000 });
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(visibleIds(script.tasks));
	await expect(anyHiddenBar(page)).toHaveCount(0);

	// the day lives in the filter state only: the board never asked the platform again (`p4.log` R4 logged 2 reads)
	expect(sorted(api.reads().map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([`GET ${BOOTSTRAP_ROUTE}`, `GET ${TEAM_TASKS_ROUTE}`])
	);
	report('url after the day switch', page.url());
	expect(new URL(page.url()).search).toBe('');

	expect(consoleFindings(shield)).toEqual([]);
});

test('a team avatar narrows the board to that person and writes the pick into ?employee=; the chip clears it', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const doing = laneLabel(LANE_STATUS_NAMES[1]);
	const { names } = fixture;
	const manager = names.user;
	const pickLabel = filled(K.SHOW_MEMBER_TASKS, { name: manager });
	const membersOf = (task: ServedTask) => task.members.some((member) => member.fullName === manager);
	const keptTasks = script.tasks.filter(membersOf);
	const blockedKept = keptTasks.filter((task) => task.taskStatusId === script.statuses[3].id);

	// the toolbar's avatar stack names each person `pages.kanban.SHOW_MEMBER_TASKS` (`kanban-toolbar.tsx:133-139`);
	// the mock's team is the manager, the teammate and the restricted member (`mock-gauzy-server.mjs:120-143`)
	for (const name of [names.user, names.teammate, names.denied]) {
		await expect(
			page.getByRole('button', { name: filled(K.SHOW_MEMBER_TASKS, { name }), exact: true })
		).toBeVisible({
			timeout: 10_000
		});
	}

	await page.getByRole('button', { name: pickLabel, exact: true }).click({ timeout: 15_000 });

	await expect(page.getByText(filled(K.ASSIGNED_TO, { name: manager }))).toBeVisible({ timeout: 15_000 });
	// the pick is written into the URL (`use-kanban-board.ts:70-83`), and a router replace is not synchronous with the click
	await expect.poll(() => new URL(page.url()).searchParams.get('employee'), { timeout: 15_000 }).toBe(manager);
	report('employee url', page.url());
	report('cards kept for the employee', sorted(keptTasks.map((task) => task.id)));
	// `matchesEmployee` compares the pick against `task.members[].fullName` (`core/lib/utils/kanban-board.ts:123-129`):
	// the unassigned card drops out of the first lane, the teammate's card drops out of its own
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, keptTasks));
	await expect(laneCards(page, open)).toHaveCount(
		keptTasks.filter((task) => task.taskStatusId === script.statuses[0].id).length
	);
	await expect(laneCards(page, doing)).toHaveCount(0);
	await expect(hiddenRail(page).locator('li')).toHaveCount(1);
	await expect
		.poll(async () => flat(await hiddenRail(page).innerText()).toLowerCase(), { timeout: 15_000 })
		.toBe(railTextOf(script.statuses, (status) => (status.isCollapsed ? blockedKept.length : 0)));
	await expect(
		page.getByText(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, script.tasks.length - keptTasks.length))
	).toBeVisible({
		timeout: 10_000
	});
	// narrowing is client-side too: the same two reads, no third one for the employee
	expect(sorted(api.reads().map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([`GET ${BOOTSTRAP_ROUTE}`, `GET ${TEAM_TASKS_ROUTE}`])
	);

	await page.getByRole('button', { name: K.SHOW_EVERY_MEMBER, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => new URL(page.url()).searchParams.get('employee'), { timeout: 15_000 }).toBeNull();
	report('url after clearing the employee', page.url());
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, script.tasks));
	await expect(anyHiddenBar(page)).toHaveCount(0);

	expect(consoleFindings(shield)).toEqual([]);
});

test('the toolbar search and the property filter menu narrow the board without a second read, and Clear filters undoes it', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const open = await openLaneReady(page);
	const doing = laneLabel(LANE_STATUS_NAMES[1]);
	const search = page.getByRole('searchbox', { name: K.SEARCH_TASKS }); // `task-search-field.tsx:101-106`
	// the trigger's own accessible name grows to `Filter 1` once a filter is active (`property-filter-menu.tsx:88-93`),
	// so it is matched by its shape: this must not match the bar's `Clear filters` button either
	const filterTrigger = page.getByRole('button', { name: new RegExp(`^${escapeRegExp(C.FILTER)}( \\d+)?$`) });
	const hiddenBar = (count: number) => page.getByText(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, count));
	const [urgent, low] = script.priorities ?? [];

	// `matchesSearch` compares the trimmed query against the title and against `#number`
	// (`core/lib/utils/kanban-board.ts:81-91`); `Probe card three` is the only title holding 'three' here.
	const titled = script.tasks.filter((task) => task.title.toLowerCase().includes('three'));
	await search.fill('three');
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, titled));
	await expect(laneCards(page, open)).toHaveCount(0);
	await expect(laneCountChip(page, doing)).toHaveText(String(titled.length));
	await expect(hiddenBar(script.tasks.length - titled.length)).toBeVisible({ timeout: 10_000 });

	await page.getByRole('button', { name: C.CLEAR, exact: true }).click({ timeout: 15_000 }); // `task-search-field.tsx:117`
	await expect(search).toHaveValue('');
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, script.tasks));
	await expect(anyHiddenBar(page)).toHaveCount(0);

	// one row per property (`property-filter-menu.tsx:96-104`); the Epic row is disabled because this board was served
	// no epics (`FilterCategorySubmenu`, `property-filter-menu.tsx:150`) — measured `p6.log` S2
	await filterTrigger.click({ timeout: 15_000 });
	report('filter menu rows', (await page.locator('[role="menuitem"]').allInnerTexts()).map(flat));
	await expect(page.locator('[role="menuitem"]')).toHaveCount(5);
	for (const label of [C.ISSUE_TYPE, D.EPIC, D.PRIORITY, D.SIZE, C.LABELS]) {
		await expect(page.getByRole('menuitem', { name: label })).toBeVisible({ timeout: 10_000 });
	}
	await expect(page.locator('[role="menuitem"][data-disabled]')).toHaveText(D.EPIC);

	await page.getByRole('menuitem', { name: D.PRIORITY, exact: true }).hover();
	await expect(page.getByRole('menuitemcheckbox', { name: urgent?.name })).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('menuitemcheckbox', { name: low?.name })).toBeVisible({ timeout: 10_000 });
	await page.getByRole('menuitemcheckbox', { name: urgent?.name }).click({ timeout: 15_000 });
	await page.keyboard.press('Escape'); // the menu is Base UI: close it before touching the board again

	const prioritised = script.tasks.filter((task) => task.priority === urgent?.value);
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, prioritised));
	await expect(laneCountChip(page, open)).toHaveText(String(prioritised.length));
	await expect(laneCountChip(page, doing)).toHaveText('0');
	await expect.poll(async () => flat(await filterTrigger.innerText()), { timeout: 15_000 }).toBe(`${C.FILTER} 1`); // the count chip on the trigger (`property-filter-menu.tsx:92`)
	await expect(hiddenBar(script.tasks.length - prioritised.length)).toBeVisible({ timeout: 10_000 });
	expect(api.writes()).toEqual([]);

	await filterTrigger.click({ timeout: 15_000 });
	report(
		'filter menu rows with an active filter',
		(await page.locator('[role="menuitem"]').allInnerTexts()).map(flat)
	);
	await expect(page.getByRole('menuitem', { name: `${D.PRIORITY} 1` })).toBeVisible({ timeout: 10_000 });
	await expect(page.getByRole('menuitem', { name: C.CLEAR_FILTERS })).toBeVisible({ timeout: 10_000 });
	// the menu's own row is Base UI and its popup was still animating when the click landed there — measured in
	// `s3-lane-b-kanban-measure2.log` (the click retried, then "element was detached from the DOM"). The menu is closed
	// first, and the clear goes through the bar's button, which calls the same `board.clearFilters`
	// (`kanban-page.tsx:149`, `HiddenByFiltersBar` `:78-92`).
	await page.keyboard.press('Escape');
	await page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click({ timeout: 15_000 });

	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(cardIdsShown(script, script.tasks));
	await expect.poll(async () => flat(await filterTrigger.innerText()), { timeout: 15_000 }).toBe(C.FILTER);
	await expect(anyHiddenBar(page)).toHaveCount(0);

	// every step above was a client-side filter: the board never asked the platform again, and never wrote
	expect(sorted(api.reads().map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([`GET ${BOOTSTRAP_ROUTE}`, `GET ${TEAM_TASKS_ROUTE}`])
	);
	expect(api.writes()).toEqual([]);

	expect(consoleFindings(shield)).toEqual([]);
});

test('the lane Create task button posts a task into that lane, and the card appears without a reload', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	await openLaneReady(page);
	const doing = laneLabel(LANE_STATUS_NAMES[1]);
	const doingStatus = script.statuses[1];
	const { ids, names } = fixture;
	const newTitle = 'Probe created task';

	// the lane header's own Create task button (`kanban-lane.tsx:100-102`, measured header row `p5.log` R1)
	await laneAddButton(page, doing).click({ timeout: 15_000 });
	const titleField = page.getByRole('textbox', { name: F.TASK_INPUT_PLACEHOLDER }); // `task-input-kanban.tsx:303-305`
	const dialog = page.locator('[role="dialog"]');
	const submit = dialog.getByRole('button', { name: C.CREATE_TASK });
	await expect(titleField).toBeVisible({ timeout: 15_000 });
	// the submit starts disabled and a title is what enables it (`p6.log` S1 logged `disabled=true` before typing).
	// Enter does not create here: `create-task-modal.tsx:27-39` passes no `createOnEnterClick`, so the form only
	// submits through this button (`task-input-kanban.tsx:327-336`).
	await expect(submit).toBeDisabled();
	await titleField.fill(newTitle);
	await submit.click({ timeout: 15_000 });

	await expect.poll(() => api.writesOf('POST', TASKS_ROUTE).length, { timeout: 15_000 }).toBe(1);
	const write = api.writesOf('POST', TASKS_ROUTE)[0];
	const body = write.body as Record<string, unknown>;
	report('create write', JSON.stringify(body));
	// `use-task-input.ts:165-175` posts the form's fields — no `priority`/`size` key at all when unset (`|| undefined`)
	// — and `task.service.ts` adds the scope ids, `estimate` and `teams`
	expect(sorted(Object.keys(body))).toEqual([
		'description',
		'estimate',
		'issueType',
		'members',
		'organizationId',
		'projectId',
		'status',
		'tags',
		'taskStatusId',
		'teams',
		'tenantId',
		'title'
	]);
	expect(body.title).toBe(newTitle);
	// the lane the button was pressed in: `kanbanTitle` is the status name, and it decides both fields
	// (`task-input-kanban.tsx:420-424`, `use-task-input.ts:169-170`)
	expect(body.status).toBe(doingStatus.name);
	expect(body.taskStatusId).toBe(doingStatus.id);
	// an unpicked issue type becomes `EIssueType.BUG` (`use-task-input.ts:168`, `core/types/generics/enums/task.ts:70`)
	expect(body.issueType).toBe('Bug');
	expect(body.description).toBe('');
	expect(body.estimate).toBe(0);
	expect(body.projectId).toBeNull();
	expect(body.tags).toEqual([]);
	expect(body.teams).toEqual([{ id: ids.teamA }]);
	// `autoAssignTaskAuth` puts the signed-in person's employee record in `members` (`use-task-input.ts:175`)
	const member = (body.members as Record<string, unknown>[])[0];
	report('create write member keys', sorted(Object.keys(member)));
	expect(sorted(Object.keys(member))).toEqual([
		'fullName',
		'id',
		'isActive',
		'isTrackingEnabled',
		'isTrackingTime',
		'organizationId',
		'tenantId',
		'user',
		'userId'
	]);
	expect([member.id, member.userId, member.fullName]).toEqual([ids.employee, ids.user, names.user]);

	await expect(titleField).toHaveCount(0); // the modal closed (`p6.log` S1 dialog count 0)
	const created = api.tasks[api.tasks.length - 1];
	expect(created.status).toBe(doingStatus.name);
	await expect(cardOf(page, created.id)).toBeVisible({ timeout: 20_000 });
	await expect(cardOf(page, created.id)).toContainText(newTitle);
	await expect(laneCards(page, doing)).toHaveCount(servedLaneIds(script, doingStatus.id).length + 1);
	await expect(laneCountChip(page, doing)).toHaveText(String(servedLaneIds(script, doingStatus.id).length + 1));

	// the board re-read its own list after the create; the count of those reads is not pinned (TanStack coalesces
	// concurrent fetches), but no other path was touched
	expect(sorted(Array.from(new Set(api.reads().map((call) => call.path))))).toEqual(
		sorted([BOOTSTRAP_ROUTE, TEAM_TASKS_ROUTE])
	);
	report('team reads after the create', api.reads().filter((call) => call.path === TEAM_TASKS_ROUTE).length);

	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(cardOf(page, created.id)).toBeVisible({ timeout: 20_000 });
	await expect(laneCards(page, doing)).toHaveCount(servedLaneIds(script, doingStatus.id).length + 1);

	expect(consoleFindings(shield)).toEqual([]);
});

test('a team whose statuses hold no task prints one empty lane each, the collapsed one in the rail', async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	script.tasks = [];
	const api = await openBoard(page, fixture, script);
	const [open, doing, review, blocked] = LANE_STATUS_NAMES.map(laneLabel);

	await expect(laneSection(page, open)).toBeVisible({ timeout: 20_000 });
	await expect.poll(() => boardLaneLabels(page)).toEqual([open, doing, review, K.HIDDEN_COLUMNS]);
	await expect.poll(() => boardCardIds(page)).toEqual([]);
	for (const label of [open, doing, review]) {
		await expect(laneCountChip(page, label)).toHaveText('0');
		await expect(laneAddButton(page, label)).toBeVisible({ timeout: 10_000 });
	}
	await expect(hiddenRail(page).locator('li')).toHaveCount(1);
	await expect
		.poll(async () => flat(await hiddenRail(page).innerText()).toLowerCase(), { timeout: 15_000 })
		.toBe(railTextOf(script.statuses, () => 0));
	await expect(hiddenRail(page).getByRole('listitem').first()).toContainText(blocked);
	expect(api.writes()).toEqual([]);

	expect(consoleFindings(shield)).toEqual([]);
});

test("a team with no task statuses gets the board's own empty state instead of lanes", async ({
	page,
	fixture,
	shield
}) => {
	const script = boardScript(fixture);
	script.noStatuses = true;
	const api = await openBoard(page, fixture, script);

	// `kanban-page.tsx:130-138` renders `AnimatedEmptyState` with these two lines when no status came back
	await expect(page.getByText(K.NO_STATUSES_TITLE)).toBeVisible({ timeout: 20_000 });
	await expect(page.getByText(K.NO_STATUSES_MESSAGE)).toBeVisible({ timeout: 10_000 });
	await expect.poll(() => boardLaneLabels(page)).toEqual([]);
	await expect.poll(() => boardCardIds(page)).toEqual([]);
	expect(api.writes()).toEqual([]);

	expect(consoleFindings(shield)).toEqual([]);
});
