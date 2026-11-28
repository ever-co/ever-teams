import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator, Page, Route } from '@playwright/test';

import { expect, test } from '../../fixtures';
import { APP_ORIGIN, signInAndVisit, type BootstrapFixture } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a person does with the **Kanban card menu** and the **filter menu's submenus** on `/kanban`
 * (`core/components/pages/kanban/board/kanban-task-menu.tsx:48-186`,
 * `core/components/tasks/property-filter-menu.tsx:75-225`), on lane-c (app `http://localhost:3033`, mock
 * `http://127.0.0.1:4002`, control `4004`, `playwright/test-servers.ts:40`). It is the follow-up to
 * `suites/lane-b/kanban-board-ui.spec.ts:165-173`, which named these as what it left out: `Edit status`, the card-menu
 * rows it only listed (`Assign task to me`, the `Assignee` submenu, the three daily-plan rows) and the filter
 * submenus other than `Priority`. The board itself (lanes, dragging, paging, the creation-day switch, the team
 * avatars, `Priority`, `Create task`) stays pinned in that file; this one reuses its harness shape, on lane-c's ports.
 *
 * Every value asserted below was printed by a run first: the throwaway probes in `D:\Coding\.tmp\probe-kanbanmenu\`
 * (`p1.log` … `p6.log`, harness `serve-board.ts`) and this file's own `MEASURE` lines in
 * `D:\Coding\.tmp\s3-lane-c-kanbanmenu-measure.log`, then the two acceptance logs `D:\Coding\.tmp\s3-lane-c-kanbanmenu-1.log`
 * / `-2.log`. Nothing here is a number copied from the code. A run needs `E2E_LANE=lane-c E2E_BROWSER_CHANNEL=chrome`
 * (no bundled Chromium on this PC, `playwright/README.md:16,43`) and the lane lock:
 * `node /d/Coding/.tmp/lane-lock.mjs acquire lane-c kanbanmenu` … `release lane-c kanbanmenu`.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's NextAuth stub, the shell and all of its own reads (`/api/user/me`, `/api/organization-team`,
 * `/api/role-permissions/me`, `/api/timesheet/timer/status`, `/api/invite/me`, `PUT /api/employee/me/presence`,
 * `/api/daily-plan…`) answered by the lane mock. **The board's task list, its statuses, priorities, sizes and labels,
 * and every write this file proves, are served here** through `page.route` on the mock origin (the shape of
 * `suites/lane-b/kanban-board-ui.spec.ts:406-544`): `GET /api/task-metadata/bootstrap`, `GET /api/tasks/team`,
 * `PUT /api/tasks/<id>`, `PUT /api/task-statuses/<id>`, `POST /api/daily-plan`. The store is the answer: a write changes
 * what the next read returns, a refused write changes nothing, and a refused status write answers from a queue so one
 * test can see 400 then 500. Two paths this file shares with the mock are **handed back to it** with `route.fallback()`
 * and recorded separately (`forwarded()`): `GET /api/tasks/<id>` (the shell's active-task read) and `GET /api/daily-plan`
 * (the plan reads the mock answers with its one fixture plan, `cypress/support/mock-gauzy-server.mjs:760`). Every answer
 * restates the mock's CORS headers (`mock-gauzy-server.mjs:997-1006`) and every stub answers `OPTIONS` with 204 before
 * it records a call; `route.fetch()` is never called, so the mock never hears a stubbed path.
 *
 * **The menu's own reads:** the card menu mounts its rows and its mutation hooks only while it is open
 * (`kanban-task-menu.tsx:69-76`), and the `Assignee` submenu builds one `useTeamMemberMutations` per member row
 * (`core/components/tasks/task-assignee-items.tsx:22-41`). The members it lists are the active team's rows
 * (`kanban-board-context.tsx:77-78` → `mock-gauzy-server.mjs:217-225`: the fixture manager, the teammate and the
 * restricted member). Opening a menu sends nothing: measured, the only mock-origin calls in that test are the load's
 * own two task reads.
 *
 * **Plan dates are the page's own calendar steps.** `use-plan-task-for-day.ts:13,41` builds the date with
 * `moment().add(DAY_OFFSET[day], 'day').format('YYYY-MM-DD')` in the browser's zone, and the some-day dialog defaults
 * to tomorrow (`create-daily-plan-form-modal.tsx:122` `useState(getTomorrowDate)` with `keepUpcomingDay` `:87-95`); this
 * file recomputes each expected date with `setDate` from the same day at assertion time (`localDay`), so a run at any
 * hour holds (only a midnight crossing during a test would not). The dialog's calendar is react-day-picker:
 * a day is a `role="gridcell"` button whose text is the day number, and every day before today carries `disabled`
 * (`create-daily-plan-form-modal.tsx:333-365` `disabled={[pastDays, …]}), measured `p6.log` P11.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `kanban-task-menu.tsx`: trigger `:59-67` (`aria-label common.MORE_OPTIONS`), items mounted only while open `:69-76`,
 *   `Open` `:115-118`, `Edit task` `:119-122`, `Move to` submenu `:123-133`, `Assign task to me` only when the card is
 *   not the person's `:107-109,135-140`, `Unassign task from me` only when it is `:110,141-146`, `Assignee` submenu
 *   `:147-157`, the three plan rows `:159-170`, `Copy issue link` / `Copy task ID` / `Make a copy` `:172-183`; the
 *   some-day row opens `CreateDailyPlanFormModal` with `planMode CUSTOM` and `chooseMember` `:79-88`.
 * - `task-assignee-items.tsx`: `isTaskAssignee` `:9-19` (compares `assignee.id === member.employeeId` or
 *   `assignee.userId === member.employee.userId`), `TaskAssigneeMenuItem` `:22-41` (`closeOnClick={false}`, toggles).
 * - `use-team-member-mutations.ts`: `assignTask` `:56-77` (`updateTask({ …task, members:[…task.members, member] })` —
 *   the **team-member row**), `unassignTask` `:84-107` (`members.filter(m => m.id !== member.employeeId)`).
 * - `task.service.ts`: `PUT /tasks/<id>` `:284-341`, `normalizeTaskMembers` `:262-274` with
 *   `normalizeOrganizationTeamEmployee` `:237-254` (spreads `member.employee`, adds `userId`, `user`,
 *   `organizationTeamId`, `isManager`, `isTrackingEnabled`).
 * - `use-update-task.ts`: optimistic cache `:130-163`, `onError` `:166-186` (restores the cache), `onSettled` `:191-203`
 *   (a **failed** update re-reads every task list; a saved one goes to `refreshAfterTaskUpdate`
 *   `task-update-refresh.ts:49-73`, which re-reads the task's own queries and the other lists that hold it but only
 *   marks the team's task pages — what the board and its menu read — stale, `:4-6,49-52`).
 * - `use-plan-task-for-day.ts` `:11-60` (day offsets, `createDailyPlan`, `task.toastMessages.*` toasts),
 *   `use-create-daily-plan.ts` `:32-67` (`POST /daily-plan` through `daily-plan.service.ts:274-301`, its own `onError`
 *   toast `toasts.plans.CREATE_FAILED`, `trackPlanAddition`), `use-pending-plan-additions.ts:96-133` (the create waits
 *   for the plan reads to land, `waitForDailyPlanReads` `:65-87`), `daily-plan.schema.ts` (`createDailyPlanSchema` /
 *   `dailyPlanSchema` decide what the stub must answer).
 * - `edit-status-modal.tsx`: `createNew = useState(status)` `:34`, `headingAction` `:91-94`, title `:102-104`, name
 *   field `:107-113`, `IconPopover` + `ColorPicker` `:116-117`, Cancel `:121-130`, submit `:131-140`,
 *   `onSubmit` `:62-90` (`editTaskStatus(...).then(… onClose())` — a rejection never reaches `onClose`);
 *   mounted by `kanban-page.tsx:306-316` with `setColumn={keepStatusesFromQuery}` (`kanban-page.tsx:55-57` returns
 *   `undefined`, so the modal's own `renameProperty` `:43-60` is a no-op on the board).
 * - `use-edit-task-status.ts` (mutation with **no** `onError`) → `mutation-error-toaster.tsx:38-62` shows
 *   `toasts.MUTATION_FAILED` + `t(errorReasonKeyOf(error))`; `task-status.service.ts:74-112` is the `PUT`.
 * - `property-filter-menu.tsx`: trigger + count chip `:89-100`, one submenu row per category `:104-111`, `Clear filters`
 *   row only when a filter is active `:112-120`, a row disabled when its category has no options `:156,160`, options as
 *   `CheckboxItem` with `closeOnClick={false}` `:193-224`, `withToggled` `:51-57`.
 *   Categories `kanban-toolbar.tsx:32-79`; epic options `:38-47` (value = the epic's task id, name
 *   `#<number> <title>`); option values `use-map-to-task-status-values.tsx:13-40` (`value = item.value || item.name`).
 *   Narrowing `use-kanban-board.ts:44,51-54,66-68,94-96` and `core/lib/utils/kanban-board.ts:81-144`
 *   (`matchesEpics` `:104-113` keeps the epic itself, `rootEpic.id` and `parentId`; `matchesLabels` `:94-101` compares
 *   tag **names**).
 *
 * ## Findings (measured; each says which run printed it)
 *
 * 1. **The card menu swaps one row by who holds the card.** With 11 rows, the 4th is `Assign task to me` when the card
 *    does not hold the signed-in person and `Unassign task from me` when it does (`p2.log` P1/P2, `kanban-task-menu.tsx:107-110`).
 *    `Move to` and `Assignee` are the only two `[aria-haspopup=menu]` rows.
 * 2. **`Assign task to me` writes the team's member row, and the menu cannot see the result of its own write.** The
 *    `PUT /api/tasks/<id>` body carries the whole task (`use-team-member-mutations.ts:62-65`), whose `members` entry
 *    `task.service.ts:237-254` re-shapes from the team-member row (`p2.log` P2). The card's avatar row shows the person
 *    (`personFromTaskMember` `people-avatars.tsx:17-20` reads `fullName ?? user.name`), but `isTaskAssignee`
 *    (`task-assignee-items.tsx:9-19`) compares `assignee.id`/`assignee.userId` with `member.employeeId`/
 *    `member.employee.userId` against the **client's own cache**, which `use-update-task.ts:130-163` filled with the
 *    row as the hook built it, and a saved update only marks those team pages stale (`onSettled` `:191-203` →
 *    `task-update-refresh.ts:49-73`; a lead corrected the worker's "re-reads nothing", 2026-11-28). So the menu reopened right
 *    after the write still offers `Assign task to me` and the `Assignee` checkbox stays unchecked (`p2.log` P2/P3);
 *    after a reload (a real re-read) the row is `Unassign task from me` and both members read as `Selected`/checked.
 *    Untagged: nothing in the code says the row should flip without a read.
 * 3. **`Assignee` lists exactly the active team's members**, in the mock's order, with the assigned one marked: the row
 *    text starts with `Selected` (`SelectedMark` `core/components/common/selected-mark.tsx:16`, `common.SELECTED`
 *    `locales/en.json:509`) and `aria-checked="true"` (`p2.log` P3). Picking a member sends the whole members list
 *    (the served assignee plus the new team-member row) in one `PUT`.
 * 4. **`Edit status` prefills from the served status and saves with one `PUT`** — body `{ name, icon, color }` plus the
 *    scope ids the API service adds; the color sent is the served one because the form's `color` starts empty and
 *    `edit-status-modal.tsx:66` falls back to `status.color`. The lane shows the new name only after the statuses query
 *    is re-read (`use-edit-task-status.ts` `onSuccess → invalidateTaskStatusesData`, `p3.log` P5). Cancel sends nothing.
 * 5. **`[MEASURED, NOT INTENDED]` the edit-status dialog is headed `New Issue type` for an existing status.**
 *    `edit-status-modal.tsx:91-94` reads `let headingAction = t('common.EDIT'); if (createNew) { headingAction =
 *    t('common.NEW'); }` with `const [createNew] = useState(status)` `:34` — always truthy for a lane status — so the
 *    heading measured is `New Issue type` (`common.NEW :259` + `common.ISSUE_TYPE :352`) while the row that opens it is
 *    `Edit status` (`common.EDIT_STATUS :112`, `kanban-lane.tsx:115-118`) and its submit button says `Edit`
 *    (`common.EDIT :297`), which is what an existing lane's rename is (`p5.log` P12 headings `["New Issue type"]`).
 *    The modal cannot create at all — `onSubmit` acts only `if (status && values)` (`:63`) and only calls
 *    `editTaskStatus` — so whenever it can save, `createNew` holds that status and the `common.EDIT` heading is dead code.
 * 6. **A refused `Edit status` keeps the modal open and names the reason, and it blocks the board.** `onSubmit` awaits
 *    `editTaskStatus(...).then(… onClose())` (`edit-status-modal.tsx:62-90`), so a rejection skips `onClose`: the dialog
 *    stays open with the typed name, its panel intercepts pointer events (`p3.log` failure 1 call log), the lane keeps
 *    its served name and the store never changed. The message is the fallback toaster's (`mutation-error-toaster.tsx:52-62`):
 *    `toasts.MUTATION_FAILED` "That change was not saved" with `toasts.REASONS.INVALID` for 400 and
 *    `toasts.REASONS.SERVER` for 500 (`p3.log` P6, P6b). No re-read followed either refusal.
 * 7. **The two one-click plan rows differ only by the date**, and their toast arrives after the plan re-reads: today →
 *    `date` = the page's own day, tomorrow → the next day (`p3.log` P7); `use-plan-task-for-day.ts:42-51` awaits
 *    `createDailyPlan`, whose `trackPlanAddition` waits for the daily-plan reads (`use-pending-plan-additions.ts:120-126`),
 *    and only then toasts — measured `p2.log` P7 reading no toast at all right after the write, `p4.log` P10 polling it
 *    visible. The card itself is untouched (no task write, `p3.log` P7 `other writes? []`), because a plan is not a task field.
 * 8. **`Plan for selected day` sends nothing until the dialog submits, and its own submit toasts nothing.** Cancel left
 *    the write count where it was (`p3.log` P7); submitting wrote `date:"2026-11-29"` with the dialog untouched (its
 *    default is tomorrow) and `date:"2026-12-01"` after a calendar pick 3 days ahead (`p6.log` P11), and the 3 s quiet
 *    window after that write printed no toast (`p6.log` P11 `toasts after picking a day []`) — `CreateDailyPlanFormModal`
 *    calls `createDailyPlan` directly (`:183-199`), so the plan toast of finding 7 never runs here.
 * 9. **A refused plan is the caller's own toast, not the fallback's**: `use-create-daily-plan.ts:40-44` has an `onError`,
 *    so `toasts.plans.CREATE_FAILED` "The plan was not created" + `toasts.REASONS.INVALID` is what appears, and the card
 *    text is identical before and after (`p3.log` P8).
 * 10. **Every filter category here is client-side, and all five are openable**: with an epic served, `Epic` is *not*
 *    disabled (lane-b's finding 8 pinned the opposite for a board with no epics); Issue type holds the four
 *    `EIssueType` values (`kanban-toolbar.tsx:32-36`, `core/types/generics/enums/task.ts:69-74`), Epic lists
 *    `#105 Probe epic five` from the served task, Size and Labels list what the bootstrap carried. Picking stacks
 *    (AND): `Story` kept 2 cards, adding `Epic` left 0, and the trigger grew `Filter` → `Filter 1` → `Filter 2`
 *    (`p2.log` P9) while the reads stayed the load's two and no write was sent.
 * 11. **`Clear filters` appears in the menu only once something is filtered** (`property-filter-menu.tsx:112-120`) and
 *    the menu rows grow their own count chips (`Issue type 1`, `Epic 1`, `p2.log` P9). This file clears through the
 *    hidden-bar button, which calls the same `board.clearFilters`/`clearPropertyFilters`: the menu's own row is a Base UI
 *    item whose popup was still animating when a click landed on it in `suites/lane-b/kanban-board-ui.spec.ts:1587-1592`.
 *
 * ## What this file does not cover
 *
 * - The board itself: lanes, dragging, paging, the creation-day switch, team avatars, `Priority`, `Create task`,
 *   collapse/expand — `suites/lane-b/kanban-board-ui.spec.ts`.
 * - `Copy issue link` / `Copy task ID`: they write to the clipboard through `navigator.clipboard`
 *   (`use-task-menu-actions.ts:15-39`), which needs a permission grant this lane does not set; `Make a copy` is pinned
 *   by `suites/lane-b/kanban-board-ui.spec.ts:979-1092`.
 * - `Open` (it routes to `/task/<id>`, `kanban-task-menu.tsx:115`) and the `Edit task` title editor
 *   (`kanban-task-title-editor.tsx`, pinned in the lane-b file `:1094-1132`).
 * - The plan dialog's member picker: `chooseMember` shows it only for a team manager
 *   (`create-daily-plan-form-modal.tsx:232`), and picking another member changes `employeeId`; this file plans for the
 *   signed-in person and pins the dialog's day handling instead.
 * - The `Select` (stay open) submit variant, remembered in `localStorage` (`:56-70`): a fresh context always starts on
 *   `Select & close`, which is what this file submits.
 * - `Move to`, collapse/expand and lane ordering writes (lane-b `:979-1092`, `:1247-1362`); the `blocked` status here
 *   exists only to keep a collapsed lane on the board.
 * - Anything needing a second team, organization or tenant: the lane answers exactly one of each.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const KANBAN_PATH = '/kanban';
const BOOTSTRAP_ROUTE = '/api/task-metadata/bootstrap';
const TASKS_ROUTE = '/api/tasks';
const TEAM_TASKS_ROUTE = '/api/tasks/team';
const TASK_STATUSES_ROUTE = '/api/task-statuses';
const DAILY_PLAN_ROUTE = '/api/daily-plan';

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
	pages: {
		kanban: Record<string, string>;
		taskDetails: Record<string, string>;
		settingsTeam: Record<string, string>;
	};
	common: Record<string, string>;
	dailyPlan: Record<string, string>;
	task: { toastMessages: Record<string, string> };
	toasts: Record<string, string> & { REASONS: Record<string, string>; plans: Record<string, string> };
	modals: { dailyPlan: Record<string, string> };
};
/** Loading the file fails if a key this spec names is gone, so a renamed row never silently weakens an assertion. */
function copyTable(table: Record<string, string>, keys: string[], where: string) {
	const missing = keys.filter((key) => typeof table[key] !== 'string');
	if (missing.length) throw new Error(`locales/en.json (${where}) has no key for ${missing.join(', ')}`);
	return table;
}
/** `pages.kanban`: `KANBAN_BOARD :2363`, `HIDDEN_COLUMNS :2364`, `TASKS_HIDDEN_BY_FILTERS :2369`. */
const K = copyTable(EN.pages.kanban, ['KANBAN_BOARD', 'HIDDEN_COLUMNS', 'TASKS_HIDDEN_BY_FILTERS'], 'pages.kanban');
/** `common.*`: `COLLAPSE_COLUMN :110`, `EDIT_STATUS :112`, `EDIT_TASK :182`, `OPEN :223`, `CREATE_TASK :236`,
 *  `WORKED :265`, `FILTER :272`, `NEW :259`, `EDIT :297`, `CANCEL :308`, `ISSUE_TYPE :352`, `LABELS :154`,
 *  `CLEAR_FILTERS :177`, `SELECT_DATE :444`, `SELECT_AND_CLOSE :445`, `ASSIGN_TASK_TO_ME :185`,
 *  `UNASSIGN_TASK_FROM_ME :186`, `COPY_ISSUE_LINK :437`, `COPY_TASK_ID :438`, `MAKE_A_COPY :439`, `ASSIGNEE :440`,
 *  `MOVE_TO :443`, `MORE_OPTIONS :503`, `SELECTED :509`. */
const C = copyTable(
	EN.common,
	[
		'ASSIGNEE',
		'ASSIGN_TASK_TO_ME',
		'CANCEL',
		'CLEAR_FILTERS',
		'COLLAPSE_COLUMN',
		'COPY_ISSUE_LINK',
		'COPY_TASK_ID',
		'CREATE_TASK',
		'EDIT',
		'EDIT_STATUS',
		'EDIT_TASK',
		'FILTER',
		'ISSUE_TYPE',
		'LABELS',
		'MAKE_A_COPY',
		'MOVE_TO',
		'MORE_OPTIONS',
		'NEW',
		'OPEN',
		'SELECTED',
		'SELECT_AND_CLOSE',
		'SELECT_DATE',
		'UNASSIGN_TASK_FROM_ME',
		'WORKED'
	],
	'common'
);
/** `pages.taskDetails`: `EPIC :2387`, `SIZE :2391`, `PRIORITY :2392` — the filter menu's row labels. */
const D = copyTable(EN.pages.taskDetails, ['EPIC', 'SIZE', 'PRIORITY'], 'pages.taskDetails');
/** `pages.settingsTeam.CREATE_NEW_ISSUE_TYPES :2626` — the edit-status name field's placeholder. */
const S = copyTable(EN.pages.settingsTeam, ['CREATE_NEW_ISSUE_TYPES'], 'pages.settingsTeam');
/** `dailyPlan.PLAN_FOR_TODAY :3282`, `PLAN_FOR_TOMORROW :3286`, `PLAN_FOR_SOME_DAY :3287`. */
const P = copyTable(EN.dailyPlan, ['PLAN_FOR_TODAY', 'PLAN_FOR_TOMORROW', 'PLAN_FOR_SOME_DAY'], 'dailyPlan');
/** `task.toastMessages.TASK_PLANNED_FOR_TODAY :3270`, `TASK_PLANNED_FOR_TOMORROW :3271`. */
const TT = copyTable(
	EN.task.toastMessages,
	['TASK_PLANNED_FOR_TODAY', 'TASK_PLANNED_FOR_TOMORROW'],
	'task.toastMessages'
);
/** `toasts.MUTATION_FAILED :4322`, `toasts.REASONS.INVALID :4330`, `toasts.REASONS.SERVER :4332`,
 *  `toasts.plans.CREATE_FAILED :4451`. */
const TOASTS = copyTable(EN.toasts, ['MUTATION_FAILED'], 'toasts');
const REASONS = copyTable(EN.toasts.REASONS, ['INVALID', 'SERVER'], 'toasts.REASONS');
const PLAN_TOASTS = copyTable(EN.toasts.plans, ['CREATE_FAILED'], 'toasts.plans');
/** `modals.dailyPlan.searchMember :3751`. */
const M = copyTable(EN.modals.dailyPlan, ['searchMember'], 'modals.dailyPlan');
/** `{count, plural, one {# task hidden by the filters} other {# tasks hidden by the filters}}` (`pages.kanban:2369`). */
const pluralOf = (template: string, count: number) => {
	const branch = (count === 1 ? /one\s*\{([^{}]*)\}/ : /other\s*\{([^{}]*)\}/).exec(template);
	if (!branch) throw new Error(`no plural branch for ${count} in ${template}`);
	return branch[1].replaceAll('#', String(count));
};
const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const report = (label: string, value: unknown) =>
	console.log(`[lane-c kanban menu] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** React's dev-mode store warning, not this page's (see `suites/lane-a/chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** The shell's own `GET /api/health` timing out on a loaded lane dev server (`core/services/client/api/default.ts:42`):
 *  lane noise like `SHELL_STORE_NOISE`, excused only by this whole line. */
const HEALTH_CHECK_NOISE = 'Local API Health Check Error: AxiosError: timeout of 30000ms exceeded';

type Shield = { consoleErrors: () => string[]; logMatching: (pattern: RegExp) => string[] };

/** Only the two shell noises are excused everywhere; a test that arms a refusal names its own lines, so a mutation
 *  that fails where nothing was armed still fails the test. */
const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(HEALTH_CHECK_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/* ------------------------------------------------------------------ served board ---------------------------------- */

const UUID_LEAD: Record<string, string> = {
	status: '90000000',
	task: '70000000',
	tag: '50000000',
	priority: '40000000',
	size: '30000000',
	plan: '60000000'
};
const uuid = (kind: string, index: number) => `${UUID_LEAD[kind]}-0000-4000-8000-${String(index).padStart(12, '0')}`;

/** A status as this file serves it: `taskStatusSchema` is `.strict()` (`task-status.schema.ts:12-42`). */
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

/** A team task: `mock-gauzy-server.mjs:183-196` plus the properties the cards print and the epic link the filter reads. */
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
	issueType?: string | null;
	parentId?: string | null;
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
	priorities: Array<{ id: string; name: string; value: string; color: string | null }>;
	sizes: Array<{ id: string; name: string; value: string; color: string | null }>;
	labels: ServedTag[];
	taskWriteRefusal?: Refusal;
	/** Answered in order, so one test can see a 400 and then a 500 on the same path. */
	statusWriteRefusals?: Refusal[];
	planWriteRefusal?: Refusal;
};

type ServedCall = { method: string; path: string; search: string; body: Record<string, unknown> | null };

type BoardApi = {
	calls: ServedCall[];
	statuses: ServedStatus[];
	tasks: ServedTask[];
	plans: Array<Record<string, unknown>>;
	reads: () => ServedCall[];
	writes: () => ServedCall[];
	writesOf: (method: string, pathPrefix: string) => ServedCall[];
	/** mock-origin calls this file handed back to the mock with `route.fallback()`, in send order. */
	forwarded: () => ServedCall[];
	shapes: () => string[];
};

/**
 * This file's stand-in for the task platform, on the mock origin only, on an exact path list (the mock's own
 * `GET /api/tasks/<id>` and `GET /api/daily-plan` are handed back to it, never answered here). The answer is always the
 * current store, so a save changes what the next read returns and a refusal changes nothing — the only way "the card is
 * back as it was" can be told apart from "the platform still says it changed".
 */
async function serveBoard(page: Page, script: BoardScript): Promise<BoardApi> {
	const store = {
		statuses: [...script.statuses],
		tasks: [...script.tasks],
		priorities: [...script.priorities],
		sizes: [...script.sizes],
		labels: [...script.labels],
		plans: [] as Array<Record<string, unknown>>
	};
	const calls: ServedCall[] = [];
	const forwarded: ServedCall[] = [];
	let statusRefusals = 0;

	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(url.pathname === BOOTSTRAP_ROUTE ||
			url.pathname === TEAM_TASKS_ROUTE ||
			url.pathname === DAILY_PLAN_ROUTE ||
			url.pathname.startsWith(`${TASKS_ROUTE}/`) ||
			url.pathname.startsWith(`${TASK_STATUSES_ROUTE}/`));

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
		const mine =
			(url.pathname === BOOTSTRAP_ROUTE && method === 'GET') ||
			(url.pathname === TEAM_TASKS_ROUTE && method === 'GET') ||
			(url.pathname.startsWith(`${TASKS_ROUTE}/`) && method === 'PUT') ||
			(url.pathname.startsWith(`${TASK_STATUSES_ROUTE}/`) && method === 'PUT') ||
			(url.pathname === DAILY_PLAN_ROUTE && method === 'POST');
		if (!mine) {
			forwarded.push({ method, path: url.pathname, search: decodeURIComponent(url.search), body });
			return route.fallback();
		}
		calls.push({ method, path: url.pathname, search: decodeURIComponent(url.search), body });

		if (url.pathname === BOOTSTRAP_ROUTE && method === 'GET') {
			const pagination = <T>(items: T[]) => ({ items, total: items.length });
			return answer(route, 200, {
				taskStatuses: pagination(store.statuses),
				taskPriorities: pagination(store.priorities),
				taskSizes: pagination(store.sizes),
				taskLabels: pagination(store.labels),
				taskVersions: pagination([]),
				issueTypes: pagination([]),
				relatedIssueTypes: pagination([])
			});
		}

		if (url.pathname === TEAM_TASKS_ROUTE && method === 'GET') {
			// `task.service.ts:137-153` sends `skip` as a 1-based page with `order[createdAt] DESC, order[id] DESC`.
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

		if (url.pathname.startsWith(`${TASK_STATUSES_ROUTE}/`) && method === 'PUT') {
			const statusId = decodeURIComponent(url.pathname.slice(TASK_STATUSES_ROUTE.length + 1));
			const refusal = (script.statusWriteRefusals ?? [])[statusRefusals];
			if (refusal) {
				statusRefusals += 1;
				return answer(route, refusal.status, refusal);
			}
			store.statuses = store.statuses.map((status) =>
				status.id === statusId ? { ...status, ...(body as object) } : status
			);
			// `task-status.service.ts:97-98` validates the answer against `taskStatusUpdateResponseSchema`
			return answer(route, 200, { generatedMaps: [], raw: [], affected: 1 });
		}

		if (url.pathname === DAILY_PLAN_ROUTE && method === 'POST') {
			if (script.planWriteRefusal) return answer(route, script.planWriteRefusal.status, script.planWriteRefusal);
			// `daily-plan.service.ts:288` validates the answer against `dailyPlanSchema` (`daily-plan.schema.ts:39-58`)
			const plan = { ...(body as object), id: uuid('plan', store.plans.length + 1) };
			store.plans = [...store.plans, plan];
			return answer(route, 201, plan);
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
		get plans() {
			return store.plans;
		},
		reads: () => calls.filter((call) => call.method === 'GET'),
		writes: () => calls.filter((call) => call.method !== 'GET'),
		writesOf: (method, pathPrefix) =>
			calls.filter((call) => call.method === method && call.path.startsWith(pathPrefix)),
		forwarded: () => forwarded,
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
 * The board this file serves: 4 statuses (the last collapsed), two priorities, two sizes, two labels, and seven tasks
 * chosen so each filter has something to narrow to — a card held by the signed-in person, a free card, a teammate's
 * card, a `Story` with a size and a label, an `Epic`, a `Bug` under that epic (by `parentId`), and a `Bug` in review.
 * Distinct `createdAt` values so the read's `order[createdAt]=DESC, order[id]=DESC` decides the list, none on a day the
 * creation-day switch could hide (this file never touches that switch).
 */
function boardScript(fixture: BootstrapFixture): {
	script: BoardScript;
	statuses: { open: ServedStatus; doing: ServedStatus; review: ServedStatus; blocked: ServedStatus };
	tasks: Record<'mine' | 'free' | 'teammateCard' | 'sized' | 'epic' | 'underEpic' | 'bugInReview', ServedTask>;
	labels: ServedTag[];
} {
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
	// minutes apart, oldest first: the read's `order[createdAt]=DESC, order[id]=DESC` then decides the list.
	const createdOf = (index: number) => new Date(Date.now() - (40 - index) * 60_000).toISOString();
	const taskOf = (index: number, title: string, extra: Partial<ServedTask>): ServedTask => ({
		id: uuid('task', index),
		title,
		number: 100 + index,
		public: false,
		status: 'open',
		taskStatusId: uuid('status', 1),
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
	const labels = [tagOf(1, 'frontend'), tagOf(2, 'backend')];
	const manager = memberOf(ids.employee, ids.user, names.user);
	const teammate = memberOf(ids.teammateEmployee, ids.teammateUser, names.teammate);

	const tasks = {
		mine: taskOf(1, 'Probe menu card one', {
			taskStatusId: open.id,
			priority: 'urgent',
			size: 'small',
			tags: [labels[0]],
			members: [manager],
			issueType: 'Task',
			estimate: 3600
		}),
		free: taskOf(2, 'Probe menu card two', { taskStatusId: open.id, issueType: 'Task' }),
		teammateCard: taskOf(3, 'Probe plan card three', {
			status: 'in-progress',
			taskStatusId: doing.id,
			priority: 'low',
			tags: [labels[1]],
			members: [teammate],
			issueType: 'Story'
		}),
		sized: taskOf(4, 'Probe size card four', {
			taskStatusId: open.id,
			priority: 'low',
			size: 'medium',
			tags: [labels[1]],
			issueType: 'Story'
		}),
		epic: taskOf(5, 'Probe epic five', { taskStatusId: open.id, issueType: 'Epic' }),
		underEpic: taskOf(6, 'Probe under epic six', {
			taskStatusId: open.id,
			issueType: 'Bug',
			parentId: uuid('task', 5)
		}),
		bugInReview: taskOf(7, 'Probe review card seven', {
			status: 'code-review',
			taskStatusId: review.id,
			issueType: 'Bug',
			members: [manager]
		})
	};

	return {
		script: {
			statuses: [open, doing, review, blocked],
			labels,
			priorities: [
				{ id: uuid('priority', 1), name: 'Urgent', value: 'urgent', color: '#ef4444' },
				{ id: uuid('priority', 2), name: 'Low', value: 'low', color: null }
			],
			sizes: [
				{ id: uuid('size', 1), name: 'Small', value: 'small', color: '#38bdf8' },
				{ id: uuid('size', 2), name: 'Medium', value: 'medium', color: '#a78bfa' }
			],
			tasks: Object.values(tasks)
		},
		statuses: { open, doing, review, blocked },
		tasks,
		labels
	};
}

/** What `statusLabelOf` prints (`kanban-lane.tsx:53-56`) and the `Move to` row (`kanban-task-menu.tsx:211`). */
const laneLabel = (name: string) => name.split('-').join(' ');

const laneSection = (page: Page, label: string): Locator =>
	page.locator(`section[aria-label="${label}"]`).filter({ has: page.locator('h2') });
const cardOf = (page: Page, taskId: string): Locator => page.locator(`[data-task-id="${taskId}"]`);
const cardTextOf = (page: Page, taskId: string) => cardOf(page, taskId).innerText();
/** The lane header's own row (`kanban-lane.tsx:132`; `lane-b/kanban-board-ui.spec.ts:660-666` measured why a plain
 *  `> div` is ambiguous and why `:has(> h2)` matches nothing). */
const laneHeaderRow = (page: Page, label: string) => laneSection(page, label).locator('> div:has(h2)');
const laneMenuButton = (page: Page, label: string) =>
	laneHeaderRow(page, label).getByRole('button', { name: C.MORE_OPTIONS });
const cardMenuButton = (page: Page, taskId: string) =>
	cardOf(page, taskId).locator(`button[aria-label="${C.MORE_OPTIONS}"]`);
/** The board's own sections in DOM order; the shell's notifications region is the only other labelled section. */
const boardLaneLabels = (page: Page) =>
	page
		.locator('section[aria-label]')
		.evaluateAll((nodes) =>
			nodes
				.map((node) => node.getAttribute('aria-label') ?? '')
				.filter((label) => !label.startsWith('Notifications'))
		);
/** Every card id on the board right now, in DOM order (the rail holds collapsed statuses, never cards). */
const boardCardIds = (page: Page) =>
	page
		.locator('section[aria-label] [data-task-id]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('data-task-id') ?? ''));
const sorted = <T extends string>(items: T[]) => [...items].sort();
/* The `evaluateAll` callbacks below run in the browser, where this file's Node-side helpers do not exist
   (`ReferenceError: flat is not defined`, measured in `s3-lane-c-kanbanmenu-measure.log`), so each flattens inline. */
const menuRows = (page: Page) =>
	page
		.locator('[role="menuitem"]')
		.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const checkRows = (page: Page) =>
	page.locator('[role="menuitemcheckbox"]').evaluateAll((nodes) =>
		nodes.map((node) => ({
			text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
			checked: node.getAttribute('aria-checked') ?? '',
			disabled: node.getAttribute('aria-disabled') ?? ''
		}))
	);
const toastTexts = (page: Page) =>
	page
		.locator('[data-sonner-toast]')
		.allInnerTexts()
		.then((texts) => texts.map(flat));
const dialogOf = (page: Page) => page.locator('[role="dialog"]');

/** The card menu of a card that is on screen. The trigger is `opacity-0` until the card is hovered or focused
 *  (`kanban-task-menu.tsx:63`), which is why the card is waited for first. */
const openCardMenu = async (page: Page, taskId: string) => {
	await expect(cardOf(page, taskId)).toBeVisible({ timeout: 20_000 });
	await cardMenuButton(page, taskId).click({ timeout: 15_000 });
	await expect(page.locator('[role="menuitem"]').first()).toBeVisible({ timeout: 15_000 });
};
/** Base UI menus are document-level portals that block pointer events while open: a submenu needs one Escape, the
 *  root menu another, and every later click waits until nothing is left. */
const closeMenu = async (page: Page) => {
	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
	await expect(page.locator('[role="menuitem"]')).toHaveCount(0, { timeout: 15_000 });
};
const filterTrigger = (page: Page) =>
	page.getByRole('button', { name: new RegExp(`^${escapeRegExp(C.FILTER)}( \\d+)?$`) }); // `property-filter-menu.tsx:94-100`
/** The hidden-by-filters bar for any count: both plural branches of `pages.kanban.TASKS_HIDDEN_BY_FILTERS` (`lane-b/kanban-board-ui.spec.ts:279-286`). */
const anyHiddenBar = (page: Page) =>
	page.getByText(
		new RegExp(
			[1, 2]
				.map((count) => escapeRegExp(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, count)).replace(String(count), '\\d+'))
				.join('|')
		)
	);
const hiddenBar = (page: Page, count: number) => page.getByText(pluralOf(K.TASKS_HIDDEN_BY_FILTERS, count));

/** `personFromTaskMember` (`people-avatars.tsx:17-20`) + `initialsOf` (`:28-32`): what a card's avatar prints. */
const initialsOf = (fullName: string) =>
	fullName
		.trim()
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word[0])
		.join('')
		.toUpperCase();
/** The page's own calendar step (`moment().add(offset,'day')`, `use-plan-task-for-day.ts:41`): `setDate`, not 24 h. */
const localDay = (offset: number) => {
	const day = shiftedLocalDay(offset);
	const pad = (value: number) => String(value).padStart(2, '0');
	return `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
};
/** The same step as the number a calendar cell prints (`String(date.getDate())`, no padding — measured `p6.log` P11). */
const localDayNumber = (offset: number) => String(shiftedLocalDay(offset).getDate());
function shiftedLocalDay(offset: number) {
	const day = new Date();
	day.setDate(day.getDate() + offset);
	return day;
}

/** Serves this file's board, signs the fixture person in and lands on `/kanban`. */
const openBoard = async (page: Page, fixture: BootstrapFixture, script: BoardScript) => {
	const api = await serveBoard(page, script);
	await signInAndVisit(page, fixture, KANBAN_PATH);
	// the board is really there before any menu is opened (`kanban-page.tsx`, `pages.kanban.KANBAN_BOARD`)
	await expect(page.locator('h1').filter({ hasText: K.KANBAN_BOARD })).toBeVisible({ timeout: 20_000 });
	return api;
};
/** The ids of the served tasks the board prints (no served task sits in the collapsed status here). */
const servedCardIds = (script: BoardScript) => sorted(script.tasks.map((task) => task.id));

/* ------------------------------------------------------------------ the tests ---------------------------------- */

test('the card menu swaps Assign / Unassign by who holds the card and lists its rows', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const rowsOf = [
		C.OPEN,
		C.EDIT_TASK,
		C.MOVE_TO,
		C.UNASSIGN_TASK_FROM_ME,
		C.ASSIGNEE,
		P.PLAN_FOR_TODAY,
		P.PLAN_FOR_TOMORROW,
		P.PLAN_FOR_SOME_DAY,
		C.COPY_ISSUE_LINK,
		C.COPY_TASK_ID,
		C.MAKE_A_COPY
	];

	// the card the signed-in person holds: the menu offers the way out, not the way in
	await openCardMenu(page, tasks.mine.id);
	await expect(page.locator('[role="menuitem"]')).toHaveCount(rowsOf.length);
	for (const name of rowsOf) {
		await expect(page.getByRole('menuitem', { name, exact: true })).toBeVisible({ timeout: 10_000 });
	}
	await expect(page.getByRole('menuitem', { name: C.ASSIGN_TASK_TO_ME, exact: true })).toHaveCount(0);
	report('menu rows (my card)', await menuRows(page));
	// only `Move to` and `Assignee` are submenu triggers (`kanban-task-menu.tsx:123-133,147-157`)
	await expect
		.poll(
			() =>
				page
					.locator('[role="menuitem"][aria-haspopup]')
					.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())),
			{ timeout: 10_000 }
		)
		.toEqual([C.MOVE_TO, C.ASSIGNEE]);
	await closeMenu(page);

	// a card held by someone else, and a card held by nobody: both get `Assign task to me`. The menu is closed after
	// each one: an open Base UI menu keeps its portal layer (`<div role="presentation" data-base-ui-inert>`) over the
	// page, and that layer blocked the next card's `More options` click (`s3-lane-c-kanbanmenu-measure3.log` failure 1).
	for (const task of [tasks.teammateCard, tasks.free]) {
		await openCardMenu(page, task.id);
		await expect(page.getByRole('menuitem', { name: C.ASSIGN_TASK_TO_ME, exact: true })).toBeVisible({
			timeout: 10_000
		});
		await expect(page.getByRole('menuitem', { name: C.UNASSIGN_TASK_FROM_ME, exact: true })).toHaveCount(0);
		await closeMenu(page);
	}

	// opening menus asked the platform for nothing: the only reads are the load's own two
	expect(sorted(api.reads().map((call) => call.path))).toEqual(sorted([BOOTSTRAP_ROUTE, TEAM_TASKS_ROUTE]));
	expect(api.writes()).toEqual([]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('Assign task to me writes the team member row and puts the person on the card; a reload turns the row into Unassign', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const { ids, names } = fixture;
	const api = await openBoard(page, fixture, script);
	const target = tasks.free;
	const initials = initialsOf(names.user);

	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: C.ASSIGN_TASK_TO_ME, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/`).length, { timeout: 15_000 }).toBe(1);
	const write = api.writesOf('PUT', `${TASKS_ROUTE}/`)[0];
	report('assign write', `${write.method} ${write.path}`);
	report('assign body keys', sorted(Object.keys(write.body ?? {})));
	expect(write.path).toBe(`${TASKS_ROUTE}/${target.id}`);
	// `assignTask` spreads the whole task (`use-team-member-mutations.ts:62-65`); no `priority`/`size`/`label` key
	// because this card has none (`p2.log` P2)
	expect(sorted(Object.keys(write.body ?? {}))).toEqual([
		'createdAt',
		'estimate',
		'id',
		'issueType',
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
	const body = write.body as Record<string, unknown>;
	expect(body.title).toBe(target.title);
	expect(body.taskStatusId).toBe(target.taskStatusId);
	// the one member is the team's member row, re-shaped by `task.service.ts:237-254`
	const members = body.members as Record<string, unknown>[];
	expect(members).toHaveLength(1);
	expect([members[0].id, members[0].userId, members[0].fullName]).toEqual([ids.employee, ids.user, names.user]);
	expect(members[0].organizationTeamId).toBe(ids.teamA);

	// the platform holds it (`p2.log` P2) and the card prints it (`p2.log` P8)
	expect(api.tasks.find((task) => task.id === target.id)?.members.map((member) => member.id)).toEqual([ids.employee]);
	await expect(cardOf(page, target.id)).toContainText(initials, { timeout: 15_000 });
	// the card's own day row sits next to the avatar (`common.WORKED`, measured `p2.log` P8)
	await expect(cardOf(page, target.id)).toContainText(C.WORKED, { timeout: 15_000 });
	// quiet window 3 s: proves assigning sends no toast (no `task.toastMessages.*` for an assign, `p2.log` P9)
	await page.waitForTimeout(3_000);
	await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });

	// the menu reopened right after the write still offers the same row (finding 2)
	await openCardMenu(page, target.id);
	await expect(page.getByRole('menuitem', { name: C.ASSIGN_TASK_TO_ME, exact: true })).toBeVisible({
		timeout: 10_000
	});
	await expect(page.getByRole('menuitem', { name: C.UNASSIGN_TASK_FROM_ME, exact: true })).toHaveCount(0);
	await closeMenu(page);

	// a re-read is what makes the card's holder known to the menu
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(cardOf(page, target.id)).toBeVisible({ timeout: 20_000 });
	await openCardMenu(page, target.id);
	await expect(page.getByRole('menuitem', { name: C.UNASSIGN_TASK_FROM_ME, exact: true })).toBeVisible({
		timeout: 15_000
	});
	await page.getByRole('menuitem', { name: C.UNASSIGN_TASK_FROM_ME, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/`).length, { timeout: 15_000 }).toBe(2);
	const back = api.writesOf('PUT', `${TASKS_ROUTE}/`)[1];
	// `unassignTask` filters by `member.employeeId` (`use-team-member-mutations.ts:91-94`)
	expect(back.body?.members).toEqual([]);
	expect(api.tasks.find((task) => task.id === target.id)?.members).toEqual([]);
	await expect(cardOf(page, target.id)).not.toContainText(initials, { timeout: 15_000 });
	report('writes', api.shapes());

	expect(consoleFindings(shield)).toEqual([]);
});

test('the Assignee submenu lists the team the board was served and writes the members list on each pick', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const { ids, names } = fixture;
	const api = await openBoard(page, fixture, script);
	const target = tasks.mine;
	// the submenu's members are the active team's rows (`kanban-board-context.tsx:77-78` → `mock-gauzy-server.mjs:217-225`)
	const teamNames = [names.user, names.teammate, names.denied];

	const openAssigneeSubmenu = async () => {
		await openCardMenu(page, target.id);
		await page.getByRole('menuitem', { name: C.ASSIGNEE, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByRole('menuitemcheckbox', { name: teamNames[0] })).toBeVisible({ timeout: 15_000 });
		await expect(page.getByRole('menuitemcheckbox')).toHaveCount(teamNames.length);
	};

	await openAssigneeSubmenu();
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.text), { timeout: 10_000 })
		.toEqual([
			`${C.SELECTED}${initialsOf(names.user)}${names.user}`,
			`${initialsOf(names.teammate)}${names.teammate}`,
			`${initialsOf(names.denied)}${names.denied}`
		]);
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.checked), { timeout: 10_000 })
		.toEqual(['true', 'false', 'false']);
	report('assignee rows at open', await checkRows(page));

	// pick the teammate: one write, holding the served assignee plus the new member row
	await page.getByRole('menuitemcheckbox', { name: names.teammate }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/`).length, { timeout: 15_000 }).toBe(1);
	const added = api.writesOf('PUT', `${TASKS_ROUTE}/`)[0].body as Record<string, unknown>;
	report('assignee add members', JSON.stringify(added.members));
	expect((added.members as Record<string, unknown>[]).map((member) => member.id)).toEqual([
		target.members[0].id,
		ids.teammateEmployee
	]);
	await expect(cardOf(page, target.id)).toContainText(initialsOf(names.teammate), { timeout: 15_000 });
	await expect(cardOf(page, target.id)).toContainText(initialsOf(names.user), { timeout: 15_000 });
	// `closeOnClick={false}` (`task-assignee-items.tsx:36`) keeps the submenu open for a second pick
	await expect(page.getByRole('menuitemcheckbox')).toHaveCount(teamNames.length);
	// the row the click just answered is still unchecked: the submenu compares against the client's own cache (finding 2)
	// (read after the positive signal above, the card printing the teammate's initials)
	report('assignee rows right after the pick', await checkRows(page));
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.checked), { timeout: 10_000 })
		.toEqual(['true', 'false', 'false']);
	await closeMenu(page);

	// and after a re-read the menu knows both holders, so a second pick is an unassignment
	await page.reload({ waitUntil: 'domcontentloaded' });
	await expect(cardOf(page, target.id)).toBeVisible({ timeout: 20_000 });
	await openAssigneeSubmenu();
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.checked), { timeout: 15_000 })
		.toEqual(['true', 'true', 'false']);
	report('assignee rows after a re-read', await checkRows(page));

	await page.getByRole('menuitemcheckbox', { name: names.user }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', `${TASKS_ROUTE}/`).length, { timeout: 15_000 }).toBe(2);
	const dropped = api.writesOf('PUT', `${TASKS_ROUTE}/`)[1].body as Record<string, unknown>;
	report('assignee drop members', JSON.stringify(dropped.members));
	expect((dropped.members as Record<string, unknown>[]).map((member) => member.id)).toEqual([ids.teammateEmployee]);
	await expect(cardOf(page, target.id)).not.toContainText(initialsOf(names.user), { timeout: 15_000 });
	await expect(cardOf(page, target.id)).toContainText(initialsOf(names.teammate), { timeout: 15_000 });
	// the submenu, still open, now marks the member that is left (`p2.log` P3 rows after unassign)
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.checked), { timeout: 15_000 })
		.toEqual(['false', 'true', 'false']);
	report('assignee rows after the drop', await checkRows(page));
	await closeMenu(page);
	report('writes', api.shapes());

	expect(consoleFindings(shield)).toEqual([]);
});

test('Edit status prefills the served status, saves with one PUT, and the lane shows the new name after the re-read', async ({
	page,
	fixture,
	shield
}) => {
	const { script, statuses } = boardScript(fixture);
	const { ids } = fixture;
	const api = await openBoard(page, fixture, script);
	const served = statuses.open;
	const label = laneLabel(served.name);
	const renamed = 'Probe renamed lane';
	const dialog = dialogOf(page);

	await expect(laneSection(page, label)).toBeVisible({ timeout: 20_000 });
	await laneMenuButton(page, label).click({ timeout: 15_000 });
	await expect(page.getByRole('menuitem', { name: C.CREATE_TASK, exact: true })).toBeVisible({ timeout: 10_000 });
	await expect(page.getByRole('menuitem', { name: C.COLLAPSE_COLUMN, exact: true })).toBeVisible({ timeout: 10_000 });
	await page.getByRole('menuitem', { name: C.EDIT_STATUS, exact: true }).click({ timeout: 15_000 });

	// the modal is a lazy `Suspense` mount: wait for its form, not for the `[role=dialog]` wrapper (which is 0-high)
	await expect.poll(() => dialog.locator('input').count(), { timeout: 20_000 }).toBe(1);
	// prefilled from the served status (`edit-status-modal.tsx:36-42`)
	await expect(dialog.locator('input').first()).toHaveValue(served.name, { timeout: 15_000 });
	await expect(dialog.locator('input').first()).toHaveAttribute('placeholder', S.CREATE_NEW_ISSUE_TYPES);
	report(
		'edit status fields',
		await dialog.locator('input').evaluateAll((nodes) =>
			nodes.map((node) => {
				const field = node as HTMLInputElement;
				return { value: field.value, placeholder: field.placeholder ?? '' };
			})
		)
	);
	// finding 5: headed `New Issue type` although this is an existing lane, and the color glyph shows the served color
	await expect(dialog.getByRole('heading')).toHaveText([`${C.NEW} ${C.ISSUE_TYPE}`], { timeout: 15_000 });
	await expect(dialog.getByRole('button', { name: C.CANCEL, exact: true })).toBeVisible({ timeout: 10_000 });
	await expect(dialog.getByRole('button', { name: C.EDIT, exact: true })).toBeVisible({ timeout: 10_000 });
	// the color the modal shows is the served one — measured as a button whose whole text is the color (`p5.log` P12)
	await expect(dialog.getByRole('button', { name: served.color ?? '', exact: true })).toBeVisible({
		timeout: 15_000
	});

	await dialog.locator('input').first().fill(renamed);
	await dialog.getByRole('button', { name: C.EDIT, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('PUT', TASK_STATUSES_ROUTE).length, { timeout: 20_000 }).toBe(1);
	const write = api.writesOf('PUT', TASK_STATUSES_ROUTE)[0];
	report('edit status write', `${write.path} ${JSON.stringify(write.body)}`);
	expect(write.path).toBe(`${TASK_STATUSES_ROUTE}/${served.id}`);
	// the form's own three fields (`edit-status-modal.tsx:62-67`) plus the scope `api.service.ts` adds
	expect(sorted(Object.keys(write.body ?? {}))).toEqual(['color', 'icon', 'name', 'organizationId', 'tenantId']);
	const body = write.body as Record<string, unknown>;
	expect(body.name).toBe(renamed);
	expect(body.icon).toBe('');
	// `color: !values.color ? status.color : values.color` (`edit-status-modal.tsx:66`): the served color went back out
	expect(body.color).toBe(served.color);
	expect([body.tenantId, body.organizationId]).toEqual([ids.tenantA, ids.organizationA]);

	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(0); // `onClose()` runs only in `.then` (`:87`)
	// the rename reaches the board through the statuses re-read that follows the answer
	const bootstrapsAfterWrite = () =>
		api.calls.slice(api.calls.indexOf(write) + 1).filter((call) => call.path === BOOTSTRAP_ROUTE);
	await expect.poll(() => bootstrapsAfterWrite().length, { timeout: 30_000 }).toBeGreaterThanOrEqual(1);
	await expect(laneSection(page, laneLabel(renamed))).toBeVisible({ timeout: 20_000 });
	await expect
		.poll(() => boardLaneLabels(page), { timeout: 15_000 })
		.toEqual([
			laneLabel(renamed),
			laneLabel(statuses.doing.name),
			laneLabel(statuses.review.name),
			K.HIDDEN_COLUMNS
		]);
	expect(api.statuses.find((status) => status.id === served.id)?.name).toBe(renamed);

	// Cancel on a second open: prefilled with what the platform now holds, and it sends nothing
	await laneMenuButton(page, laneLabel(renamed)).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.EDIT_STATUS, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.locator('input').count(), { timeout: 20_000 }).toBe(1);
	await expect(dialog.locator('input').first()).toHaveValue(renamed, { timeout: 15_000 });
	await dialog.getByRole('button', { name: C.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(0);
	expect(api.writesOf('PUT', TASK_STATUSES_ROUTE)).toHaveLength(1);
	await expect(laneSection(page, laneLabel(renamed))).toBeVisible({ timeout: 15_000 });

	expect(consoleFindings(shield)).toEqual([]);
});

test('Edit status refused 400 then 500 keeps the modal open, names the reason, and leaves the lane as it was', async ({
	page,
	fixture,
	shield
}) => {
	const { script, statuses } = boardScript(fixture);
	const served = statuses.open;
	const label = laneLabel(served.name);
	const refusal400 = { status: 400, message: 'Probe refusal: bad status name' };
	const refusal500 = { status: 500, message: 'Probe refusal: server exploded' };
	const api = await openBoard(page, fixture, {
		...script,
		statusWriteRefusals: [refusal400, refusal500]
	});
	// the modal by its own accessible name (`dialog "New Issue type"`, measured in `p5.log` P12 headings and in this
	// run's page snapshot). A bare `[role="dialog"]` count is wrong in a refusal test: the refusal also makes the
	// Next dev overlay mount its own dialog, so the count read 2 (`s3-lane-c-kanbanmenu-measure2.log` failure 2).
	const dialog = page.getByRole('dialog', { name: `${C.NEW} ${C.ISSUE_TYPE}`, exact: true });

	const keptFieldValues = () =>
		dialog.locator('input').evaluateAll((nodes) => nodes.map((node) => (node as HTMLInputElement).value));
	const submitIntoTheKeptModal = async (typedName: string, expectedWrites: number) => {
		await dialog.locator('input').first().fill(typedName);
		await dialog.getByRole('button', { name: C.EDIT, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => api.writesOf('PUT', TASK_STATUSES_ROUTE).length, { timeout: 20_000 })
			.toBe(expectedWrites);
	};

	// the modal opened the way the lane menu opens it (`kanban-lane.tsx:115-118` → `kanban-page.tsx:306-316`)
	await expect(laneSection(page, label)).toBeVisible({ timeout: 20_000 });
	await laneMenuButton(page, label).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.EDIT_STATUS, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.locator('input').count(), { timeout: 20_000 }).toBe(1);

	await submitIntoTheKeptModal('Probe refused lane', 1);
	const first = api.writesOf('PUT', TASK_STATUSES_ROUTE)[0];
	report('refused 400 write', `${first.path} ${JSON.stringify(first.body)}`);
	// finding 6: `mutation-error-toaster.tsx:52-62` is the only voice here (`use-edit-task-status.ts` has no `onError`).
	// Its title and reason are two blocks of one toast whose `textContent` joins them with **no** space, so the joined
	// copy matched nothing (`s3-lane-c-kanbanmenu-measure.log` failure 3) — each part is named on its own instead.
	// The pointer is parked away from the toast first, so hover cannot pause its timer out from under the wait.
	await page.mouse.move(2, 2);
	const failureToast = (reason: string) =>
		page.locator('[data-sonner-toast]').filter({ hasText: TOASTS.MUTATION_FAILED }).filter({ hasText: reason });
	await expect(failureToast(REASONS.INVALID)).toBeVisible({ timeout: 20_000 });
	report('400 toasts', await toastTexts(page));
	// the modal is kept (`edit-status-modal.tsx:62-90`: a rejection never reaches `onClose`) with the name typed into it
	await expect.poll(() => dialog.count()).toBe(1);
	await expect.poll(() => keptFieldValues(), { timeout: 10_000 }).toEqual(['Probe refused lane']);
	report('kept modal fields after the 400', await keptFieldValues());
	// and the lane is still the one the platform holds
	await expect(laneSection(page, label)).toBeVisible({ timeout: 15_000 });
	await expect(laneSection(page, laneLabel('Probe refused lane'))).toHaveCount(0);
	expect(api.statuses.map((status) => status.name)).toEqual(script.statuses.map((status) => status.name));
	// a refusal read no other path than the load's own two; whether it re-read those is not pinned here, because the
	// load's own count of them varies (the header's "no re-read" is the probes' measure, `p3.log` P6)
	expect(sorted([...new Set(api.reads().map((call) => call.path))])).toEqual(
		sorted([BOOTSTRAP_ROUTE, TEAM_TASKS_ROUTE])
	);

	// the kept modal can be retried: the same dialog, another name, the next refusal in the queue
	await submitIntoTheKeptModal('Probe 500 lane', 2);
	const second = api.writesOf('PUT', TASK_STATUSES_ROUTE)[1];
	report('refused 500 write', `${second.path} ${JSON.stringify(second.body)}`);
	await expect(failureToast(REASONS.SERVER)).toBeVisible({ timeout: 20_000 });
	report('500 toasts', await toastTexts(page));
	await expect.poll(() => dialog.count()).toBe(1);
	await expect.poll(() => keptFieldValues(), { timeout: 10_000 }).toEqual(['Probe 500 lane']);
	await expect(laneSection(page, label)).toBeVisible({ timeout: 15_000 });
	await expect(laneSection(page, laneLabel('Probe 500 lane'))).toHaveCount(0);
	expect(api.statuses.map((status) => status.name)).toEqual(script.statuses.map((status) => status.name));

	// Cancel on the kept modal closes it, and it is still the two refused writes and nothing else
	await dialog.getByRole('button', { name: C.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(0);
	expect(api.writesOf('PUT', TASK_STATUSES_ROUTE)).toHaveLength(2);
	await expect(laneSection(page, label)).toBeVisible({ timeout: 15_000 });
	report('refused status console errors', shield.consoleErrors());

	expect(
		consoleFindings(shield, [
			armedStatusError('PUT', `/task-statuses/${served.id}`, refusal400.status),
			armedStatusError('PUT', `/task-statuses/${served.id}`, refusal500.status),
			armedMutationError(refusal400),
			armedMutationError(refusal500)
		])
	).toEqual([]);
});

/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`), pinned from
 *  `s3-lane-c-kanbanmenu-measure3.log`: `… [ERROR] [HttpClient] HTTP Error: PUT /task-statuses/<id> 400 {…}`. */
function armedStatusError(verb: string, url: string, status: number) {
	return `[ERROR] [HttpClient] HTTP Error: ${verb} ${url} ${status}`;
}
/** The dev-mode line every failed mutation gets (`mutation-error-toaster.tsx:48` `console.error('Mutation failed:',
 *  error)`), measured as `Mutation failed: ApiError: <the message this file answered with>` — no status in it. */
function armedMutationError(refusal: Refusal) {
	return `Mutation failed: ApiError: ${refusal.message}`;
}
/** The plan caller's own two lines for the same refusal: `use-create-daily-plan.ts:43`
 *  `logErrorInDev('Failed to create daily plan', error)` and `use-plan-task-for-day.ts:55`
 *  `console.error('Plan creation error:', error)`; both texts measured in `s3-lane-c-kanbanmenu-measure3.log`. */
function armedPlanCallerErrors(refusal: Refusal) {
	return [
		`[Failed to create daily plan] ApiError: ${refusal.message}`,
		`Plan creation error: ApiError: ${refusal.message}`
	];
}

test('Plan for today and Plan for tomorrow write the task into those two calendar days', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const { ids } = fixture;
	const api = await openBoard(page, fixture, script);
	const target = tasks.free;
	const planWrites = () => api.writesOf('POST', DAILY_PLAN_ROUTE);
	/** The daily-plan reads this file hands to the mock (`mock-gauzy-server.mjs:760-761`), counted before each step. */
	const planReads = () =>
		api.forwarded().filter((call) => call.method === 'GET' && call.path === DAILY_PLAN_ROUTE).length;

	const planReadsBeforeToday = planReads();
	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: P.PLAN_FOR_TODAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => planWrites().length, { timeout: 30_000 }).toBe(1);
	const todayWrite = planWrites()[0];
	report('plan today', JSON.stringify(todayWrite.body));
	expect(todayWrite.path).toBe(DAILY_PLAN_ROUTE);
	expect(sorted(Object.keys(todayWrite.body ?? {}))).toEqual([
		'date',
		'employeeId',
		'organizationId',
		'organizationTeamId',
		'status',
		'taskId',
		'tenantId',
		'workTimePlanned'
	]);
	const todayBody = todayWrite.body as Record<string, unknown>;
	// `moment().add(0,'day')` (`use-plan-task-for-day.ts:41`), recomputed here with the same calendar step
	expect(todayBody.date).toBe(localDay(0));
	expect([todayBody.taskId, todayBody.employeeId, todayBody.organizationTeamId]).toEqual([
		target.id,
		ids.employee,
		ids.teamA
	]);
	expect([todayBody.tenantId, todayBody.organizationId]).toEqual([ids.tenantA, ids.organizationA]);
	expect(todayBody.status).toBe('open');
	expect(todayBody.workTimePlanned).toBe(0);

	// the toast is sent only after the plan re-reads land (`use-pending-plan-additions.ts:120-126`)
	await expect(page.locator('[data-sonner-toast]').filter({ hasText: TT.TASK_PLANNED_FOR_TODAY })).toBeVisible({
		timeout: 30_000
	});
	report('today toasts', await toastTexts(page));
	// and the plan re-reads the create invalidates really reach the mock: at least one more than before the click
	report('plan reads before / after the today write', [planReadsBeforeToday, planReads()]);
	await expect.poll(() => planReads(), { timeout: 30_000 }).toBeGreaterThanOrEqual(planReadsBeforeToday + 1);
	report(
		'plan reads after the today write',
		api.forwarded().filter((call) => call.path === DAILY_PLAN_ROUTE)
	);

	// a plan is not a task field: the only write is the plan, and the card is exactly as served
	expect(api.writes().map((call) => `${call.method} ${call.path}`)).toEqual([`POST ${DAILY_PLAN_ROUTE}`]);
	await expect(cardOf(page, target.id)).toContainText(`#${String(target.number)}`, { timeout: 15_000 });
	await expect(cardOf(page, target.id)).toContainText(target.title, { timeout: 15_000 });
	await closeMenu(page);

	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: P.PLAN_FOR_TOMORROW, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => planWrites().length, { timeout: 30_000 }).toBe(2);
	const tomorrowBody = planWrites()[1].body as Record<string, unknown>;
	report('plan tomorrow', JSON.stringify(tomorrowBody));
	// the only difference from the row above is the day (`DAY_OFFSET`, `use-plan-task-for-day.ts:13`)
	expect(tomorrowBody.date).toBe(localDay(1));
	expect(tomorrowBody.taskId).toBe(target.id);
	await expect(page.locator('[data-sonner-toast]').filter({ hasText: TT.TASK_PLANNED_FOR_TOMORROW })).toBeVisible({
		timeout: 30_000
	});
	report('tomorrow toasts', await toastTexts(page));
	await closeMenu(page);

	report('writes', api.shapes());
	expect(consoleFindings(shield)).toEqual([]);
});

test('Plan for selected day opens the date dialog: Cancel writes nothing, picking a day plans that day and toasts nothing', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const target = tasks.free;
	const dialog = dialogOf(page);
	const planWrites = () => api.writesOf('POST', DAILY_PLAN_ROUTE);

	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: P.PLAN_FOR_SOME_DAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(1);
	await expect.poll(() => dialog.locator('input').count(), { timeout: 20_000 }).toBeGreaterThan(0);
	await expect(dialog.getByText(C.SELECT_DATE, { exact: true })).toBeVisible({ timeout: 15_000 });
	// the member search is here because `chooseMember` is on and the fixture person manages the team (`:232`);
	// measured as a plain text input carrying this placeholder (`p6.log` P11 `dialog inputs`)
	await expect(dialog.getByPlaceholder(M.searchMember)).toBeVisible({ timeout: 15_000 });
	await expect(dialog.getByRole('button', { name: C.CANCEL, exact: true })).toBeVisible({ timeout: 15_000 });
	await expect(dialog.getByRole('button', { name: C.SELECT_AND_CLOSE, exact: true })).toBeVisible({
		timeout: 15_000
	});
	expect(api.writes()).toEqual([]); // the row itself sent nothing

	// the dialog's own default day is tomorrow (`useState(getTomorrowDate)` `:122` + `keepUpcomingDay` `:87-95`),
	// measured as the `aria-selected` cell carrying that day's number (`p6.log` P11 `selected cells`)
	await expect
		.poll(
			() =>
				dialog
					.locator('[aria-selected="true"]')
					.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())),
			{
				timeout: 15_000
			}
		)
		.toContain(localDayNumber(1));
	// and every day before today is disabled in it (`disabled={[pastDays, …]}` `:333-365`; `p6.log` P11 `enabled gridcells`):
	// the first cell of yesterday's number is always a day that already passed
	await expect(dialog.getByRole('gridcell', { name: new RegExp(`^${localDayNumber(-1)}$`) }).first()).toBeDisabled({
		timeout: 15_000
	});

	await dialog.getByRole('button', { name: C.CANCEL, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(0);
	expect(api.writes()).toEqual([]);
	await closeMenu(page);

	// reopen and pick a day three calendar days ahead: react-day-picker's day is a `role=gridcell` button
	const ahead = new Date();
	ahead.setDate(ahead.getDate() + 3);
	const aheadDay = String(ahead.getDate());
	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: P.PLAN_FOR_SOME_DAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(1);
	// the last cell of that number is the one ahead of today; every day before today carries `disabled` (`:333-365`)
	const cell = dialog.getByRole('gridcell', { name: new RegExp(`^${aheadDay}$`) }).last();
	await expect(cell).toBeVisible({ timeout: 15_000 });
	await expect(cell).toBeEnabled({ timeout: 15_000 });
	await cell.click({ timeout: 15_000 });
	await dialog.getByRole('button', { name: C.SELECT_AND_CLOSE, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => planWrites().length, { timeout: 30_000 }).toBe(1);
	const body = planWrites()[0].body as Record<string, unknown>;
	report('selected day write', JSON.stringify(body));
	expect(body.date).toBe(localDay(3));
	expect(body.taskId).toBe(target.id);
	await expect.poll(() => dialog.count(), { timeout: 20_000 }).toBe(0);
	// quiet window 3 s: proves this submit shows no "Task planned" toast — the dialog calls `createDailyPlan`
	// itself (`create-daily-plan-form-modal.tsx:183-199`), so `use-plan-task-for-day.ts:51` never runs
	await page.waitForTimeout(3_000);
	await expect(page.locator('[data-sonner-toast]')).toHaveCount(0, { timeout: 15_000 });
	expect(api.writes().map((call) => `${call.method} ${call.path}`)).toEqual([`POST ${DAILY_PLAN_ROUTE}`]);

	expect(consoleFindings(shield)).toEqual([]);
});

test('a refused plan says the plan was not created, with the reason, and leaves the card as it was', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const refusal = { status: 400, message: 'Probe refusal: bad plan' };
	const api = await openBoard(page, fixture, { ...script, planWriteRefusal: refusal });
	const target = tasks.free;

	await expect(cardOf(page, target.id)).toBeVisible({ timeout: 20_000 });
	const before = flat(await cardTextOf(page, target.id));
	await openCardMenu(page, target.id);
	await page.getByRole('menuitem', { name: P.PLAN_FOR_TODAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => api.writesOf('POST', DAILY_PLAN_ROUTE).length, { timeout: 30_000 }).toBe(1);
	// finding 9: `use-create-daily-plan.ts:40-44` owns this toast, so the fallback toaster stays silent; title and
	// reason are separate blocks of it, so each part is named on its own (see the note in the refused-status test).
	await page.mouse.move(2, 2); // parked away from the toast, so hover cannot pause its timer out from under the wait
	const planToast = (part: string) =>
		page.locator('[data-sonner-toast]').filter({ hasText: PLAN_TOASTS.CREATE_FAILED }).filter({ hasText: part });
	await expect(planToast(REASONS.INVALID)).toBeVisible({ timeout: 30_000 });
	report('refused plan toasts', await toastTexts(page));
	report('plans the platform kept after the refusal', api.plans);
	// the card is exactly the one the platform still serves: the same text, nothing added by the refused plan.
	// `innerText` keeps the card's line breaks (`#102Probe menu card two\nWorked\n0h 0m`, measured
	// `s3-lane-c-kanbanmenu-measure2.log` failure 3), so both sides are flattened the same way.
	await expect.poll(async () => flat(await cardTextOf(page, target.id)), { timeout: 15_000 }).toBe(before);
	report('refused plan console errors', shield.consoleErrors());
	expect(api.writes().map((call) => `${call.method} ${call.path}`)).toEqual([`POST ${DAILY_PLAN_ROUTE}`]);
	// finding 9, the other half: the fallback toaster's own user copy (`toasts.MUTATION_FAILED`, "That change was not
	// saved") never appears here — the caller's `onError` already spoke. Proven after the plan toast was seen above,
	// and measured in `p2.log` P8 (`refused plan toast`: `The plan was not created …` and no `That change was not saved`).
	await expect(page.locator('[data-sonner-toast]').filter({ hasText: TOASTS.MUTATION_FAILED })).toHaveCount(0);

	expect(
		consoleFindings(shield, [
			armedStatusError('POST', '/daily-plan', refusal.status),
			// `mutation-error-toaster.tsx:47-49` logs the dev line for every failed mutation, before it decides the
			// caller already handled it — so it appears here too, next to the caller's own two lines.
			armedMutationError(refusal),
			...armedPlanCallerErrors(refusal)
		])
	).toEqual([]);
});

test('the filter menu opens Issue type, Epic, Size and Labels and each pick narrows the cards without a read', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks, labels } = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const allIds = servedCardIds(script);
	const filterRows = [C.ISSUE_TYPE, D.EPIC, D.PRIORITY, D.SIZE, C.LABELS];

	await expect(page.locator('[data-task-id]').first()).toBeVisible({ timeout: 20_000 });
	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(allIds);

	const openFilterMenu = async () => {
		await filterTrigger(page).click({ timeout: 15_000 });
		await expect(page.locator('[role="menuitem"]')).toHaveCount(filterRows.length);
	};

	await openFilterMenu();
	report('filter rows', await menuRows(page));
	for (const label of filterRows) {
		await expect(page.getByRole('menuitem', { name: label, exact: true })).toBeVisible({ timeout: 10_000 });
	}
	// every category has options on this board, so no row is disabled (`property-filter-menu.tsx:156,160`;
	// the disabled `Epic` of a board with no epics is `lane-b/kanban-board-ui.spec.ts` finding 8)
	await expect(page.locator('[role="menuitem"][data-disabled]')).toHaveCount(0);

	// Issue type holds the four `EIssueType` values (`kanban-toolbar.tsx:32-36`, `core/types/generics/enums/task.ts:69-74`)
	await page.getByRole('menuitem', { name: C.ISSUE_TYPE, exact: true }).hover();
	await expect(page.getByRole('menuitemcheckbox', { name: 'Story', exact: true })).toBeVisible({ timeout: 15_000 });
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.text), { timeout: 10_000 })
		.toEqual(['Bug', 'Task', 'Story', 'Epic']);
	const stories = script.tasks.filter((task) => task.issueType === 'Story');
	await page.getByRole('menuitemcheckbox', { name: 'Story', exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(sorted(stories.map((task) => task.id)));
	await expect
		.poll(async () => flat(await filterTrigger(page).innerText()), { timeout: 15_000 })
		.toBe(`${C.FILTER} 1`);
	await expect(hiddenBar(page, script.tasks.length - stories.length)).toBeVisible({ timeout: 15_000 });
	// the same row checked off again puts every card back (`withToggled`, `property-filter-menu.tsx:51-57`)
	await page.getByRole('menuitemcheckbox', { name: 'Story', exact: true }).click({ timeout: 15_000 });
	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(allIds);
	await closeMenu(page);

	// Epic lists what the served board holds as epics (`kanban-toolbar.tsx:38-47`), and keeping one keeps its child
	await openFilterMenu();
	await page.getByRole('menuitem', { name: D.EPIC, exact: true }).hover();
	const epicRow = `#${String(tasks.epic.number)} ${tasks.epic.title}`; // `kanban-toolbar.tsx:38-47`
	await expect(page.getByRole('menuitemcheckbox', { name: epicRow })).toBeVisible({ timeout: 15_000 });
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.text), { timeout: 10_000 })
		.toEqual([epicRow]);
	await page.getByRole('menuitemcheckbox', { name: epicRow }).click({ timeout: 15_000 });
	// `matchesEpics` (`core/lib/utils/kanban-board.ts:104-113`): the epic plus the task whose `parentId` is it
	report('cards kept for the epic filter', sorted([tasks.epic.id, tasks.underEpic.id]));
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(sorted([tasks.epic.id, tasks.underEpic.id]));
	await page.getByRole('menuitemcheckbox', { name: epicRow }).click({ timeout: 15_000 });
	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(allIds);
	await closeMenu(page);

	// Size and Labels list the bootstrap's own sections; a label filters by the tag's name (`matchesLabels :94-101`)
	const sized = script.tasks.filter((task) => task.size === 'small');
	const labelled = script.tasks.filter((task) => task.tags.some((tag) => tag.name === labels[1].name));
	await openFilterMenu();
	await page.getByRole('menuitem', { name: D.SIZE, exact: true }).hover();
	await expect(page.getByRole('menuitemcheckbox', { name: 'Small', exact: true })).toBeVisible({ timeout: 15_000 });
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.text), { timeout: 10_000 })
		.toEqual(script.sizes.map((size) => size.name));
	await page.getByRole('menuitemcheckbox', { name: 'Small', exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(sorted(sized.map((task) => task.id)));
	await page.getByRole('menuitemcheckbox', { name: 'Small', exact: true }).click({ timeout: 15_000 });
	await closeMenu(page);

	await openFilterMenu();
	await page.getByRole('menuitem', { name: C.LABELS, exact: true }).hover();
	await expect(page.getByRole('menuitemcheckbox', { name: labels[1].name, exact: true })).toBeVisible({
		timeout: 15_000
	});
	await expect
		.poll(async () => (await checkRows(page)).map((row) => row.text), { timeout: 10_000 })
		.toEqual([labels[0].name, labels[1].name]);
	await page.getByRole('menuitemcheckbox', { name: labels[1].name, exact: true }).click({ timeout: 15_000 });
	await expect
		.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 })
		.toEqual(sorted(labelled.map((task) => task.id)));
	report('cards kept for a label', sorted(labelled.map((task) => task.id)));

	// every step above was client-side: the only board reads are the load's two, and nothing was written
	report(
		'board reads after filtering',
		api.reads().map((call) => `${call.method} ${call.path}`)
	);
	expect(sorted(api.reads().map((call) => `${call.method} ${call.path}`))).toEqual(
		sorted([`GET ${BOOTSTRAP_ROUTE}`, `GET ${TEAM_TASKS_ROUTE}`])
	);
	expect(api.writes()).toEqual([]);
	expect(consoleFindings(shield)).toEqual([]);
});

test('two filters stack, the menu counts them on its rows and trigger, and Clear filters puts every card back', async ({
	page,
	fixture,
	shield
}) => {
	const { script, tasks } = boardScript(fixture);
	const api = await openBoard(page, fixture, script);
	const allIds = servedCardIds(script);
	const epicRow = `#${String(tasks.epic.number)} ${tasks.epic.title}`;
	const bugIds = script.tasks.filter((task) => task.issueType === 'Bug').map((task) => task.id);
	// the one served `Bug` inside the epic this file picks (`matchesEpics` keeps it by `parentId`)
	const bothIds = bugIds.filter((id) => id === tasks.underEpic.id);

	await expect(cardOf(page, tasks.epic.id)).toBeVisible({ timeout: 20_000 });

	await filterTrigger(page).click({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: C.ISSUE_TYPE, exact: true }).hover();
	await page.getByRole('menuitemcheckbox', { name: 'Bug', exact: true }).click({ timeout: 15_000 });
	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(sorted(bugIds));
	await closeMenu(page);

	await filterTrigger(page).click({ timeout: 15_000 });
	// the row the filter came from now carries its own count chip (`property-filter-menu.tsx:163`)
	await expect(page.getByRole('menuitem', { name: `${C.ISSUE_TYPE} 1` })).toBeVisible({ timeout: 15_000 });
	await page.getByRole('menuitem', { name: D.EPIC, exact: true }).hover();
	await page.getByRole('menuitemcheckbox', { name: epicRow }).click({ timeout: 15_000 });
	// both narrow at once (`matchesKanbanFilters` `core/lib/utils/kanban-board.ts:131-144`: every check must pass)
	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 15_000 }).toEqual(sorted(bothIds));
	await expect
		.poll(async () => flat(await filterTrigger(page).innerText()), { timeout: 15_000 })
		.toBe(`${C.FILTER} 2`);
	await expect(page.getByRole('menuitem', { name: `${D.EPIC} 1` })).toBeVisible({ timeout: 15_000 });
	// `Clear filters` is in the menu only while something is filtered (`:112-120`)
	await expect(page.getByRole('menuitem', { name: C.CLEAR_FILTERS, exact: true })).toBeVisible({ timeout: 15_000 });
	await expect(hiddenBar(page, script.tasks.length - bothIds.length)).toBeVisible({ timeout: 15_000 });
	report('cards kept by two filters', sorted(bothIds));
	report('trigger with two filters', flat(await filterTrigger(page).innerText()));
	// the menu's own row is a Base UI item whose popup animates (lane-b `:1587-1592`); the clear goes through the
	// bar's button, which calls the same `board.clearFilters` (`kanban-page.tsx:149`, `HiddenByFiltersBar :57-74`)
	await page.keyboard.press('Escape');
	await page.keyboard.press('Escape');
	await expect(page.locator('[role="menuitem"]')).toHaveCount(0, { timeout: 15_000 });
	await page.getByRole('button', { name: C.CLEAR_FILTERS, exact: true }).click({ timeout: 15_000 });

	await expect.poll(async () => sorted(await boardCardIds(page)), { timeout: 20_000 }).toEqual(allIds);
	await expect.poll(async () => flat(await filterTrigger(page).innerText()), { timeout: 15_000 }).toBe(C.FILTER);
	await expect(page.locator('[data-task-id]')).toHaveCount(script.tasks.length);
	await expect(anyHiddenBar(page)).toHaveCount(0); // no bar for any count, in either plural branch
	// nothing was filtered through the platform: no write, and only the load's two reads
	expect(api.writes()).toEqual([]);
	expect(sorted([...new Set(api.reads().map((call) => call.path))])).toEqual(
		sorted([BOOTSTRAP_ROUTE, TEAM_TASKS_ROUTE])
	);

	expect(consoleFindings(shield)).toEqual([]);
});
