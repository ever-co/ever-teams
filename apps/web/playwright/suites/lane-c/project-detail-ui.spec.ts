import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on a **project page** (`/projects/<id>`,
 * `app/[locale]/(main)/projects/[id]/page.tsx` → `core/components/pages/projects/project-detail/page-component.tsx`),
 * on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`, control `4004`, issuer `4005`,
 * `playwright/test-servers.ts`; the run passes `E2E_DOCS=1` → `NEXT_PUBLIC_DOCS_ENABLED` at `test-servers.ts:177`).
 *
 * ## Where the numbers came from
 *
 * Everything below was measured first, on this lane, with the throwaway probes in `D:\Coding\.tmp\probe-projectdetail\`
 * (logs `D:\Coding\.tmp\s3-lane-c-projectdetail-probe-1.log`, `-probe-2`, `-probe-4`, `-probe-5`, `-probe-6`, `-probe-7`,
 * all 2026-11-26), and is re-confirmed by this file's own runs (`s3-lane-c-projectdetail-1.log`, `-2.log`). No expected
 * value here is typed from a guess: locale copy is read from `locales/en.json` by key, served values are this file's own
 * constants, and dates are served relative to today (`dayIso(offset)`) and formatted the way the app formats them — no
 * fixed day, no hard-coded time zone.
 *
 * Two things are re-read from the lane instead of typed: the mock's own project (`readMockProject` below — its name,
 * code and currency; the mock builds it at `cypress/support/mock-gauzy-server.mjs:226-238`) and the bootstrap ids and
 * names (`fixture.ids`, `fixture.names`; `playwright/fixtures.ts:147-151` → `playwright/helpers.ts:157-160`).
 *
 * ## Which layer is real and which is served
 *
 * **Real (the lane's own mock).** Test 1 runs with no stub at all, so every answer there is the mock's, including the
 * project it answers with (`mock-gauzy-server.mjs:763-764`: the list is `pagination([data.project])` and **any**
 * `…/organization-projects/<anything>` is answered with that same project — which is what 11a pins) and the delete
 * answer test 8 pins (`:764` has no method gate, so a `DELETE` of that path comes back 200 with the project body). In
 * every test the mock also answers the shell's own reads (`/api/user/me`, `/api/organization-team*`,
 * `/api/task-metadata/bootstrap` — the task statuses the Tasks tab groups by — `/api/favorite/employee`,
 * `/api/auth/workspaces`, `/api/employee/me/presence`), the session is the fixtures' NextAuth stub, and the app is the
 * lane's dev-mode Next server on `http://localhost:3033`.
 *
 * **Served by this file.** Everything the mock has no handler for, with `page.route` on the mock origin (the pattern of
 * `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`): the project (detail and list), its client rates, its tasks,
 * the budget-report rows, the Docs links and documents, and the project's files. Every answer restates the mock's CORS
 * answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204, `access-control-allow-origin: http://localhost:3033`) —
 * the page is on `localhost:3033` and the API on `127.0.0.1:4002`, so without it the browser throws the answer away.
 * `route.fetch()` is never called, so a call the mock answered shows up in `mock.requests()` and a call this file
 * answered shows up only in the harness' own `calls`. The stores are live: the detail answer is the current store (a
 * `PUT` merges the body into it), a `DELETE` with `deleteRemoves` makes every later read of that row a 404 and drops it
 * from the list, and a rate `PUT` writes into the rates row — which is the only way "the page re-read what it just
 * wrote" can be told apart from "the page kept its own copy".
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `core/components/pages/projects/project-detail/page-component.tsx`: the detail read `:103-117` (`retry: 1` at
 *   `:115`), `tabOf` `:42-52` (an unknown `?tab=`, and `trash`/`docs` where the flag is off, is the overview),
 *   `setTab` `:125-137` (a click rewrites `?tab=`, Overview deletes it), the error card `:160-166` (`ERROR_TITLE` +
 *   `ERROR_MESSAGE` + `pages.unauthorized.TRY_AGAIN`), the breadcrumb `:146-155` (rendered by
 *   `core/components/duplicated-components/breadcrumb.tsx:31-72`: `nav aria-label="breadcrumb"`, the separators are
 *   aria-hidden icons).
 * - `core/components/pages/projects/project-detail/project-detail-header.tsx` `:95-170`: the eyebrow `[code · client]`,
 *   `<h1>{name}</h1>`, the status chip, the `SCOPE_ARCHIVED` mark, the tabs `:103-108` (`Overview`, `Tasks` + count,
 *   `People` + count, `Docs` when Docs is on, Trash only under `isTaskTrashEnabled()` — `core/lib/utils/comments-trash-flags.ts:23-24`,
 *   and the lane's `sharedEnv` never sets `NEXT_PUBLIC_TASK_TRASH_ENABLED`), and the `SegmentedControl` named by
 *   `pages.projects.detail.SECTIONS` (`core/components/common/segmented-control.tsx:118-166` renders `role="tablist"` +
 *   `role="tab" aria-selected`, **not** `role="group"`).
 * - `core/components/projects/project-actions-menu.tsx`: the `common.MORE_OPTIONS` trigger `:73`, the rows Restore
 *   `:104-106`, Edit `:114`, Archive `:120-122`, Delete `:127-131`, gated by `canEdit / canArchive / canDelete` from
 *   `useProjectPermissions({ members })` `:43`.
 * - `core/components/pages/projects/project-detail/project-overview.tsx` `:13-35` (BudgetSummary, Properties, Links,
 *   Description, then `EntityFilesSection entity="OrganizationProject"`; the aside is the Progress panel and the Facts)
 *   and `core/components/projects/project-properties.tsx`: `PropertyRow` `:57-82`, the Properties `section` + `h2`
 *   `:205-238` in the order Status / Managers / Members / (Visibility only when the organization object carries
 *   `enforcePrivateProjects`, `:161-189`) / Dates / Teams / Budget / Client? / Tags?, `ProjectLinks` `:303-348`,
 *   `ProjectFacts` `:386-408` (only the rows the project actually carries). Dates and status as printed:
 *   `core/components/projects/project-cells.tsx` — `formatProjectDay` `:213-219` (month + day, the year only when the
 *   date is not in the current year), `ProjectDatesCell` `:221-249` (no date at all → the literal `-`),
 *   `formatRangeStart` `:267-272`, and the status chip `:69-92` (`normalizeStatusName`
 *   `core/lib/utils/project-list.ts:136-143` lower-cases the name and turns `-`/`_` into spaces, and the span is CSS
 *   `capitalize`d at `:90`, so `open` prints as `Open`).
 * - `core/components/pages/projects/project-detail/project-budget-summary.tsx` (whole file): the frame (`section` + `h2`
 *   `pages.projects.consumption.SUMMARY_LABEL` + `MetricStrip`), the four cells, Used and Remaining only when
 *   `budgetUseOf(row)` is not null, the `Open budget report` link only when the row exists, and the whole frame only
 *   when `useCanSeeProjectConsumption()` is true (`core/hooks/projects/use-project-consumption.ts:27-29` =
 *   `canManageActiveTeamState`). Cell text: `MISSING_FIGURE` (`core/components/dashboards/project-budget/budget-cells.tsx:33`),
 *   `typeTextOf` `:67-75`, `shareTextOf` `:160-165` → `limitShareLabelOf` (`core/lib/utils/dashboards/weekly-limit.ts:566-575`),
 *   `verdictKeyOf` `:181-194`, `remainingLabelOf` `:216-228`, hours by `groupedHoursOf`
 *   (`core/lib/utils/dashboards/project-budget.ts:171-179` over `durationPartsOf` `core/lib/utils/dashboard-figures.ts:11-16`).
 *   Which projects get a row: `core/hooks/dashboards/project-budget/use-project-budget-rows.ts` (`budgetRowsOf` merges
 *   the report answer with the project list, so a project with its own budget still gets a row when the report answer
 *   says nothing about time).
 * - `core/components/pages/projects/project-detail/project-progress-panel.tsx`: `Figure` `:82-92`, `ScopeBar` `:94-103`,
 *   `AssigneeRows` `:115-137` (`completionPercentOf` = `Math.round(done / total * 100)`, `project-list.ts:575-580`, and
 *   `pages.projects.detail.SHARE_OF`), `StatusRows` `:139-…`, the `BREAKDOWN` switch, and the weekly-trend note
 *   (`WEEKLY_TREND_UNDATED`) in `project-activity-chart.tsx`. The figures come from `useProjectTaskStats` →
 *   `buildProjectTaskStats` (`core/lib/utils/project-list.ts:549+`).
 * - `core/components/pages/projects/project-detail/project-tasks-tab.tsx`: `LAYOUT_STORAGE_KEY` `:38`,
 *   `LAYOUTS_ON_EVERY_DEPLOYMENT = ['list','calendar']` `:42`, Timeline only under `isTaskViewsEnabled()` `:60-63` (the
 *   lane never sets that flag either), the layout `SegmentedControl` named `pages.teamTasks.LAYOUT`, group headers with a
 *   CSS-`capitalize`d status label `:189`, rows `#<number> <title> … <due day>`; the frames carry
 *   `data-testid="project-tasks-<layout>"` (`project-tasks-layouts.tsx:68`). The tasks arrive through
 *   `GET /api/tasks/team` (`take=50 & skip=<page>`) and every page is validated strictly —
 *   `zodStrictPaginationResponseValidate(taskSchema, …)` (`core/services/client/api/tasks/task.service.ts:162`) with
 *   `task.id = uuIdSchema = z.string().uuid()` (`core/types/schemas/common/base.schema.ts:8`) — so a served task whose
 *   `id` is not a uuid drops the whole page and the tab stays a skeleton (measured with non-uuid ids in
 *   `s3-lane-c-projectdetail-probe-2.log` Q2, fixed with uuid ids in probe-4).
 * - `core/components/pages/projects/project-detail/project-people-tab.tsx` `:142-200` (the `Client rates` section only
 *   when the rates are shown, `PersonRow` per manager with the `common.MANAGER` role and per member with **no** role
 *   label `:163-166`+`:181`, `TeamRow` with `MEMBER_COUNT`) and `core/components/rates/rate-value-field.tsx` (the
 *   trigger's `aria-label` is the label, or `<label>: <amount>` once a rate is saved; the popover holds a label, a hint,
 *   `input[inputmode="decimal"]`, the currency and `CLEAR` / `CANCEL` / `SAVE`). Written by
 *   `PUT …/organization-projects/<id>/rate` and `PUT …/organization-projects/<id>/members/<employeeId>/rate`, read by
 *   `GET …/rates`.
 * - `core/components/pages/projects/project-detail/project-description.tsx` and
 *   `core/components/common/rich-editor/editable-rich-text.tsx`: the reader is a section with an `h3` label
 *   (`common.DESCRIPTION`) and a `richEditor.EDIT` button (its empty state is `richEditor.EMPTY_DESCRIPTION`); the
 *   editor is a `contenteditable` with plain `common.CANCEL` / `common.SAVE` buttons, and its save sends
 *   `editOrganizationProject(project.id, { description })` — the description field only (measured PUT body:
 *   `s3-lane-c-projectdetail-probe-4.log` S5).
 * - `core/components/features/projects/delete-project-modal.tsx:44-50`: `if (!isDeleted) return` — a refused or invalid
 *   delete leaves the question open. The answer is validated by `deleteProjectNoContentResponseSchema`
 *   (`core/types/schemas/organization/organization-project.schema.ts:183` = `undefined | '' | null`). The archive,
 *   restore and edit modals come from `useProjectActionModal` (`core/hooks/use-project-action-modal.ts`), rendered by
 *   `core/components/pages/projects/project-views/index.tsx`; their copy is `pages.projects.modals.*` and
 *   `pages.projects.archiveModal.title`.
 * - `core/components/pages/projects/project-detail/project-docs-tab.tsx`: `dateStyle: 'medium'` `:37`, the `Pages of
 *   this project` heading `:67`, the empty state `:91`, one `li` per linked page `:96-110` linking `/docs/<pageId>` at
 *   `:100` with a `docs.DETACH_PAGE` button at `:109`. The writes come from `core/hooks/docs/use-docs-actions.ts`
 *   (`createPage` `:87-105`, whose `index: nextIndexUnder(tree, parentId)` is `core/lib/utils/docs-tree.ts:126-130` =
 *   the largest sibling index + 1, which is why the New page body below carries `index: 3` for two served pages).
 * - The list refresh after a project `PUT`: `core/hooks/organizations/projects/use-invalidate-organization-projects.ts:22-28`
 *   invalidates the whole `queryKeys.organizationProjects.all` prefix, so the detail read **and** the list read happen
 *   again (measured `s3-lane-c-projectdetail-probe-6.log` V2 and `…-probe-5.log` U4).
 *
 * ## Findings (all measured; only the first is tagged)
 *
 * - **[MEASURED, NOT INTENDED] the mock's own answer makes a real project delete fail inside the client.** With no
 *   stub, `DELETE /api/organization-projects/<id>` is answered 200 with the project JSON
 *   (`mock-gauzy-server.mjs:764` answers that path with `data.project` whatever the method), and
 *   `deleteProjectNoContentResponseSchema` (`core/types/schemas/organization/organization-project.schema.ts:183`)
 *   accepts only `undefined`, `''` or `null`. The console then carries `Mutation failed: ZodError … deleteOrganizationProject`
 *   and `Failed to delete project: ZodError … deleteOrganizationProject` (`s3-lane-c-projectdetail-probe-1.log` P9),
 *   the question dialog stays open (`delete-project-modal.tsx:44-48` closes it only when the hook reports success) and
 *   the page stays put. The schema's own name states the intent (a delete answers with no content), so the mismatch is
 *   the finding, in the test backend rather than in the page.
 * - The mock answers `GET /api/organization-projects/<anything>` with the fixture project (`mock-gauzy-server.mjs:764`),
 *   so a project id that exists nowhere opens the fixture project instead of an error. Written as measured (11a): it is
 *   a limit of the test backend, not a product claim.
 * - The project's `Files` section and its Docs tab share one route (`GET /api/plugins/docs/links?entity=OrganizationProject&…`):
 *   a `FILE` kind link shows in Files, a `PAGE` kind link shows under Docs. Written as measured (tests 12 and 10).
 * - Not covered here, and why: the pager `Previous project / Next project` (the served list holds one project, so both
 *   neighbours are absent — `page-component.tsx:118-123` `neighboursOf`); the project page's Trash tab and the Timeline
 *   layout (both behind flags this lane never sets); uploading a file (an upload is not a served answer); the project
 *   `View info` modal and the favorite star (pinned by `suites/mock/favorites.spec.ts:115`); the budget report page
 *   itself (`suites/lane-a/project-budget-report-ui.spec.ts`); the task views (`suites/lane-c/task-views-ui.spec.ts`);
 *   the task trash (`suites/lane-a/task-trash-ui.spec.ts`). The `Archive at` Facts row appeared after an archive in
 *   `s3-lane-c-projectdetail-probe-6.log` V3 but was not there at the same moment in `…-probe-4.log` S6, so its timing
 *   is not pinned — test 7 pins the header mark, the menu rows and both PUT bodies instead. The `pages.teamTasks.LAYOUT_CALENDAR_HINT`
 *   text is not pinned either: it is the Layout switch's hover tooltip (`team-tasks-layout-options.ts:29`, rendered by
 *   the `Tooltip` around each tab at `project-tasks-tab.tsx:104-113`) and the calendar frame never prints it — measured
 *   in `…-debug-4.log`, where asking for it in the frame's text failed against `… Today November 2026 3 tasks due
 *   Export due dates (.ics) …`, which is what test 3 pins instead.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PROJECTS_ROUTE = '/api/organization-projects';
const PROJECT_PATH = (id: string) => `${PROJECTS_ROUTE}/${id}`;
const RATES_PATH = (id: string) => `${PROJECT_PATH(id)}/rates`;
const PROJECT_RATE_PATH = (id: string) => `${PROJECT_PATH(id)}/rate`;
const MEMBER_RATE_PATH = (id: string, employeeId: string) => `${PROJECT_PATH(id)}/members/${employeeId}/rate`;
const TASKS_ROUTE = '/api/tasks/team';
const DOCS_LINKS_ROUTE = '/api/plugins/docs/links';
const DOCS_DOCUMENTS_ROUTE = '/api/plugins/docs/documents';
const REPORT_ROUTE = '/api/timesheet/time-log/project-budget-limit';
const PROJECTS_PATHNAME = (id: string) => `/projects/${id}`;

/** `locales/en.json`, read by key and never typed. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	common: Record<string, string>;
	dashboard: { projectBudget: Record<string, string> };
	docs: Record<string, string>;
	entityFiles: Record<string, string>;
	modals: { project: { editTitle: string } };
	rates: Record<string, string>;
	richEditor: Record<string, string>;
	taskTrash: { TAB: string };
	pages: {
		unauthorized: { TRY_AGAIN: string };
		projects: {
			archiveModal: { title: string };
			basicInformationForm: { formFields: { title: string } };
			billable: { LABEL: string };
			categorizationForm: { formFields: { tags: string } };
			consumption: Record<string, string>;
			detail: Record<string, string>;
			financialSettingsForm: { formFields: { currency: string } };
			list: Record<string, string>;
			modals: {
				archive: Record<string, string>;
				delete: Record<string, string>;
				restore: Record<string, string>;
			};
			projectTitle: { PLURAL: string };
		};
		teamTasks: Record<string, string>;
	};
};

const C = EN.common;
const BUDGET = EN.dashboard.projectBudget;
const DOCS = EN.docs;
const FILES = EN.entityFiles;
const RATES = EN.rates;
const RICH = EN.richEditor;
const DETAIL = EN.pages.projects.detail;
const LIST = EN.pages.projects.list;
const CONSUMPTION = EN.pages.projects.consumption;
const MODALS = EN.pages.projects.modals;
const TEAM_TASKS = EN.pages.teamTasks;

/** `{name}`-style placeholders, filled the way `next-intl` fills them. */
const fill = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

/** The `other`/`one` branch of an ICU plural with `#` replaced (e.g. `MEMBER_COUNT` → "3 members"). */
const plural = (template: string, count: number) => {
	const branch = count === 1 ? /\bone \{([^}]*)\}/ : /\bother \{([^}]*)\}/;
	return (template.match(branch)?.[1] ?? template).replace(/#/g, String(count));
};

const report = (label: string, value: unknown) =>
	console.log(`[lane-c project-detail] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/* --------------------------------------------- served data -------------------------------------------- */

/** This file's own project. Every id it carries looks like a uuid, because `uuIdSchema` (`base.schema.ts:8`) is strict. */
const PROJECT_NAME = 'Probe Project';
const PROJECT_CODE = 'PRB';
const CURRENCY_CODE = 'USD';
const CLIENT_NAME = 'Probe Client';
const TAG_NAME = 'Probe tag';
const SITE_URL = 'https://probe.example.test/site';
const REPO_URL = 'https://code.example.test/probe';
const DESCRIPTION_HTML = '<p>Probe description</p>';
const WRITTEN_TEXT = 'Written by the spec.';
const FILE_NAME = 'probe-notes.pdf';
const PAGE_ONE = 'Probe page one';
const PAGE_TWO = 'Probe page two';
const STRANGER_NAME = 'Stranger Person';
const MANAGER_EMAIL = 'probe-manager@example.test';
const TEAMMATE_EMAIL = 'probe-teammate@example.test';
const STRANGER_EMAIL = 'probe-stranger@example.test';
const TASK_OPEN = 'Probe open task';
const TASK_RUNNING = 'Probe running task';
const TASK_DONE = 'Probe done task';
const NEW_PROJECT_NAME = 'Renamed by the spec';
const UNKNOWN_PROJECT_ID = uuidOf('00000000dead');

/** The budget-report answer test 12 serves; the strip's cells are computed from these numbers, never typed. */
const SPENT_HOURS = 12.5;
const BUDGET_HOURS = 40;
const REMAINING_HOURS = 27.5;

function uuidOf(tail: string) {
	return `aaaaaaaa-aaaa-4aaa-8aaa-${tail}`;
}

/** A served date at local noon, so a rendered day cannot straddle midnight in either direction. */
function dayIso(offsetDays: number) {
	const date = new Date();
	date.setHours(12, 0, 0, 0);
	date.setDate(date.getDate() + offsetDays);
	return date.toISOString();
}

/** `formatProjectDay` (`project-cells.tsx:213-219`): month + day, the year only when the date is not this year. */
function projectDay(iso: string) {
	const date = new Date(iso);
	const options: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
	if (date.getFullYear() !== new Date().getFullYear()) options.year = 'numeric';
	return new Intl.DateTimeFormat('en', options).format(date);
}

/** `project-docs-tab.tsx:37` — `Intl.DateTimeFormat(locale, { dateStyle: 'medium' })`. */
function mediumDate(iso: string) {
	return new Intl.DateTimeFormat('en', { dateStyle: 'medium' }).format(new Date(iso));
}

/** The money a rate prints (`$90.00`), formatted the way the rate field formats it. */
function money(value: number) {
	return new Intl.NumberFormat('en', { style: 'currency', currency: CURRENCY_CODE }).format(value);
}

/** `groupedHoursOf` (`project-budget.ts:171-179`) over `durationPartsOf` (`dashboard-figures.ts:11-16`). */
function hoursText(hours: number, keepsMinutes: boolean) {
	const seconds = Math.max(0, Math.round(hours * 3600));
	const whole = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const grouped = new Intl.NumberFormat('en').format(whole);
	return keepsMinutes || minutes > 0 ? `${grouped}h ${minutes}m` : `${grouped}h`;
}

/** `limitShareLabelOf` (`weekly-limit.ts:566-575`): the rounded share, here always inside the same verdict band. */
function shareText(share: number) {
	return `${Math.round(share)}%`;
}

/** `normalizeStatusName` (`project-list.ts:136-143`) plus the CSS `capitalize` the chip and the group header use. */
function printedStatus(name: string) {
	return name
		.trim()
		.toLowerCase()
		.replace(/[-_]+/g, ' ')
		.split(' ')
		.map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1)}`)
		.join(' ');
}

/** The initials an avatar chip prints next to a name. */
function initialsOf(name: string) {
	return name
		.split(/\s+/)
		.slice(0, 2)
		.map((word) => word.charAt(0).toUpperCase())
		.join('');
}

const RELATIONS = ['organizationContact', 'members.employee.user', 'tags', 'teams'];
const relationParam = (index: number) => `relations%5B${index}%5D=${RELATIONS[index]}`;
const relationParams = () => RELATIONS.map((_, index) => relationParam(index)).join('&');

/** The detail read's query, exactly as measured in `s3-lane-c-projectdetail-probe-4.log` S1. */
function detailSearch(ids: Record<string, string>) {
	return `tenantId=${ids.tenantA}&${relationParams()}`;
}

/** The list read's query, same log. */
function listSearch(ids: Record<string, string>) {
	return `where%5BorganizationId%5D=${ids.organizationA}&where%5BtenantId%5D=${ids.tenantA}&${relationParams()}`;
}

type ServedTask = Record<string, unknown>;
type ServedRates = {
	id: string;
	billRateValue: number;
	currency: string;
	members: Array<{ employeeId: string; billRateValue: number }>;
};
type ServedLink = {
	id: string;
	documentId: string;
	entity: string;
	entityId: string;
	createdAt: string;
	document: {
		id: string;
		name: string;
		kind: 'PAGE' | 'FILE';
		updatedAt?: string;
		mimeType?: string;
		fileSize?: number;
	};
};

type ServedScript = {
	/** Serve a project whose people do not include the signed-in person (test 9). */
	membersWithoutSelf?: boolean;
	tasks?: ServedTask[];
	reportRows?: Array<Record<string, unknown>>;
	links?: ServedLink[];
	docsPages?: Array<Record<string, unknown>>;
	rates?: ServedRates;
	/** A status the `GET …/rates` read answers instead of the rates row. */
	ratesRefusal?: number;
	/** A status the detail read answers instead of the project. */
	detailRefusal?: number;
	/** What the `DELETE` answers; the default 204 is the shape `deleteProjectNoContentResponseSchema` accepts. */
	deleteStatus?: number;
	/** The `DELETE` really removes the row: every later read of it is a 404 and the list stops listing it. */
	deleteRemoves?: boolean;
};

type ServedCall = { method: string; path: string; search: string; body: string | null };

/** The JSON a recorded request carried; null when it carried none, so a missing call fails as null, not as a parse error. */
const jsonBody = (call: ServedCall | undefined) =>
	typeof call?.body === 'string' ? (JSON.parse(call.body) as Record<string, unknown>) : null;

type ProjectHarness = {
	calls: ServedCall[];
	/** The project this file's fake server holds: a `PUT` merges into it, a `DELETE` can remove it. */
	project: () => Record<string, unknown>;
	/**
	 * The body of the **last** write this file answered with that method and path, looking only at calls recorded from
	 * `after` on (pass the `calls.length` you noted before the action). Test 7 sends two `PUT`s to the same project
	 * path, and `…-debug-3.log` showed the first one answering for both when the marker was missing.
	 */
	bodyOf: (method: string, path: string, after?: number) => Record<string, unknown> | null;
	/** `METHOD path` of every non-read this file answered after `marker`. */
	writesAfter: (marker: number) => string[];
};

/** A task of the served project, shaped like the mock's own fixture task (`mock-gauzy-server.mjs:182-200`). */
function servedTask(
	id: string,
	ids: Record<string, string>,
	names: Record<string, string>,
	status: 'open' | 'in-progress' | 'completed',
	title: string,
	number: number
): ServedTask {
	return {
		id,
		title,
		number,
		public: false,
		status,
		taskStatusId: status === 'in-progress' ? ids.inProgressStatus : ids.todoStatus,
		estimate: 3600,
		description: 'served by the spec',
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		projectId: ids.project,
		issueType: 'Task',
		priority: 'High',
		dueDate: dayIso(3),
		members: [
			{
				id: ids.employee,
				userId: ids.user,
				user: { id: ids.user, name: names.user, email: MANAGER_EMAIL },
				fullName: names.user,
				isTrackingEnabled: true,
				isActive: true,
				organizationId: ids.organizationA,
				tenantId: ids.tenantA
			}
		],
		tags: [],
		teams: [{ id: ids.teamA, name: names.teamA, organizationId: ids.organizationA, tenantId: ids.tenantA }]
	};
}

/** One served task per status, each due on the same served day (tests 2, 3, 7 and 12). */
function servedTasks(fixture: { ids: Record<string, string>; names: Record<string, string> }): ServedTask[] {
	return [
		servedTask(uuidOf('0000000000a1'), fixture.ids, fixture.names, 'open', TASK_OPEN, 1),
		servedTask(uuidOf('0000000000a2'), fixture.ids, fixture.names, 'in-progress', TASK_RUNNING, 2),
		servedTask(uuidOf('0000000000a3'), fixture.ids, fixture.names, 'completed', TASK_DONE, 3)
	];
}

/**
 * This file's stand-in for the project API, on the mock origin, because the mock answers only two project routes
 * (`mock-gauzy-server.mjs:763-764`) and nothing else this page reads. `route.fetch()` is never called, so anything
 * this file answered is missing from `mock.requests()` — the witness that the page acted on this file and not on the
 * mock. A path this matcher does not claim (for instance an unknown project id) keeps going to the mock.
 */
async function serveProject(
	page: Page,
	ids: Record<string, string>,
	names: Record<string, string>,
	script: ServedScript
): Promise<ProjectHarness> {
	const employee = (id: string, userId: string, name: string, email: string) => ({
		id,
		userId,
		user: { id: userId, name, email, firstName: name.split(' ')[0], lastName: name.split(' ')[1] },
		fullName: name,
		isTrackingEnabled: true,
		isTrackingTime: false,
		isActive: true,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA
	});
	const managerEmployee = employee(ids.employee, ids.user, names.user, MANAGER_EMAIL);
	const teammateEmployee = employee(ids.teammateEmployee, ids.teammateUser, names.teammate, TEAMMATE_EMAIL);
	const strangerEmployee = employee(uuidOf('00000000000d'), uuidOf('00000000000e'), STRANGER_NAME, STRANGER_EMAIL);

	const project: Record<string, unknown> = {
		id: ids.project,
		name: PROJECT_NAME,
		public: true,
		owner: null,
		code: PROJECT_CODE,
		currency: CURRENCY_CODE,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		status: 'open',
		startDate: dayIso(-10),
		endDate: dayIso(20),
		createdAt: dayIso(-30),
		budget: BUDGET_HOURS,
		budgetType: 'hours',
		billable: true,
		description: DESCRIPTION_HTML,
		projectUrl: SITE_URL,
		openSourceProjectUrl: REPO_URL,
		tags: [{ id: uuidOf('00000000000t'), name: TAG_NAME }],
		teams: [
			{
				id: ids.teamA,
				name: names.teamA,
				color: '#111111',
				members: [{ id: 'tm1' }, { id: 'tm2' }, { id: 'tm3' }]
			}
		],
		organizationContact: { id: uuidOf('00000000000c'), name: CLIENT_NAME },
		isActive: true,
		isArchived: false,
		archivedAt: null,
		members: script.membersWithoutSelf
			? [
					{
						id: uuidOf('00000000000m'),
						employeeId: strangerEmployee.id,
						isManager: true,
						employee: strangerEmployee
					}
				]
			: [
					{ id: ids.member, employeeId: ids.employee, isManager: true, employee: managerEmployee },
					{
						id: ids.teammateMember,
						employeeId: ids.teammateEmployee,
						isManager: false,
						employee: teammateEmployee
					}
				]
	};

	const store = {
		project: { ...project },
		links: [...(script.links ?? [])],
		docsPages: [...(script.docsPages ?? [])],
		rates: script.rates ?? {
			id: uuidOf('00000000000r'),
			billRateValue: 75,
			currency: CURRENCY_CODE,
			members: [{ employeeId: ids.teammateEmployee, billRateValue: 90 }]
		},
		isDeleted: false
	};

	const calls: ServedCall[] = [];
	const matcher = (url: URL) => {
		const path = url.pathname;
		return (
			path === PROJECTS_ROUTE ||
			path.startsWith(PROJECT_PATH(ids.project)) ||
			path === DOCS_LINKS_ROUTE ||
			path.startsWith(`${DOCS_LINKS_ROUTE}/`) ||
			path === DOCS_DOCUMENTS_ROUTE ||
			path === TASKS_ROUTE ||
			path === REPORT_ROUTE
		);
	};

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;
		if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

		calls.push({ method, path, search: new URL(request.url()).search, body: request.postData() });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});

		if (path === TASKS_ROUTE) {
			const items = script.tasks ?? [];
			return answer(200, { items, total: items.length });
		}
		if (path === REPORT_ROUTE) return answer(200, script.reportRows ?? []);

		if (path === DOCS_LINKS_ROUTE && method === 'GET')
			return answer(200, { items: store.links, total: store.links.length });
		if (path === DOCS_LINKS_ROUTE && method === 'POST') {
			const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
			const documentId = String(body.documentId);
			const docsPage = store.docsPages.find((item) => item.id === documentId);
			const link: ServedLink = {
				id: uuidOf(`00000000000${store.links.length + 1}`),
				documentId,
				entity: String(body.entity),
				entityId: String(body.entityId),
				createdAt: dayIso(0),
				document: docsPage
					? {
							id: documentId,
							name: String(docsPage.name),
							kind: 'PAGE',
							updatedAt: String(docsPage.updatedAt)
						}
					: { id: documentId, name: 'Attached page', kind: 'PAGE' }
			};
			store.links = [...store.links, link];
			return answer(201, link);
		}
		if (path.startsWith(`${DOCS_LINKS_ROUTE}/`) && method === 'DELETE') {
			const linkId = path.slice(DOCS_LINKS_ROUTE.length + 1);
			store.links = store.links.filter((link) => link.id !== linkId);
			return answer(204);
		}

		if (path === DOCS_DOCUMENTS_ROUTE && method === 'GET')
			return answer(200, { items: store.docsPages, total: store.docsPages.length });
		if (path === DOCS_DOCUMENTS_ROUTE && method === 'POST') {
			const body = JSON.parse(request.postData() ?? '{}') as Record<string, unknown>;
			const created = {
				id: uuidOf('00000000000p'),
				kind: 'PAGE',
				name: String(body.name),
				parentId: body.parentId ?? null,
				index: Number(body.index),
				visibility: String(body.visibility),
				createdAt: dayIso(0),
				updatedAt: dayIso(0)
			};
			store.docsPages = [...store.docsPages, created];
			return answer(201, created);
		}

		if (path === RATES_PATH(ids.project)) {
			if (script.ratesRefusal)
				return answer(script.ratesRefusal, {
					statusCode: script.ratesRefusal,
					message: 'this file refused the rates read'
				});
			return answer(200, store.rates);
		}
		if (path === PROJECT_RATE_PATH(ids.project) || path.startsWith(`${PROJECT_PATH(ids.project)}/members/`)) {
			const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
			const value = Number(body.billRateValue);
			if (path.includes('/members/')) {
				const employeeId = decodeURIComponent(path.slice(path.indexOf('/members/') + 9).split('/rate')[0]);
				const row = store.rates.members.find((member) => member.employeeId === employeeId);
				store.rates = row
					? {
							...store.rates,
							members: store.rates.members.map((member) =>
								member === row ? { ...member, billRateValue: value } : member
							)
						}
					: { ...store.rates, members: [...store.rates.members, { employeeId, billRateValue: value }] };
			} else {
				store.rates = { ...store.rates, billRateValue: value };
			}
			return answer(200, { repricedTimeLogs: 0 });
		}

		if (path === PROJECT_PATH(ids.project)) {
			if (method === 'PUT') {
				const body = JSON.parse(String(request.postData() ?? '{}')) as Record<string, unknown>;
				store.project = { ...store.project, ...body };
				return answer(200, store.project);
			}
			if (method === 'DELETE') {
				const status = script.deleteStatus ?? 204;
				if (status < 400 && script.deleteRemoves) store.isDeleted = true;
				if (status === 204) return answer(204);
				return answer(status, { statusCode: status, message: 'this file refused the delete' });
			}
			if (store.isDeleted) return answer(404, { statusCode: 404, message: 'this file removed the row' });
			if (script.detailRefusal)
				return answer(script.detailRefusal, {
					statusCode: script.detailRefusal,
					message: 'this file refused the project read'
				});
			return answer(200, store.project);
		}

		if (path === PROJECTS_ROUTE)
			return answer(200, store.isDeleted ? { items: [], total: 0 } : { items: [store.project], total: 1 });

		return answer(599, { message: `this file has no answer for ${method} ${path}` });
	});

	return {
		calls,
		project: () => store.project,
		bodyOf: (method, path, after = 0) => {
			const match = [...calls.slice(after)]
				.reverse()
				.find((item) => item.method === method && item.path === path);
			return typeof match?.body === 'string' ? (JSON.parse(match.body) as Record<string, unknown>) : null;
		},
		writesAfter: (marker) =>
			calls
				.slice(marker)
				.filter((call) => call.method !== 'GET' && call.method !== 'OPTIONS')
				.map((call) => `${call.method} ${call.path}`)
	};
}

/**
 * Every request this page's document sent to the mock origin, tagged with the document that sent it. The sign-in
 * helper hard-loads the app first (`playwright/helpers.ts:424-438` → `hardVisit`), so a flat request log would mix the
 * warm-up's reads with this page's; the frame filter is what separates them (measured: `…-probe-4.log` S1, whose
 * "another document" list came back empty).
 */
function watchBrowserCalls(page: Page) {
	const calls: Array<ServedCall & { frame: string }> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN) return;
		calls.push({
			method: request.method(),
			path: url.pathname,
			search: url.search,
			body: request.postData(),
			frame: request.frame().url()
		});
	});
	return {
		all: calls,
		/**
		 * `METHOD path?query` of this page's reads of the project, de-duplicated and **sorted**: the reads a page sends
		 * at once arrive in race order, so the members are pinned and never the order. `URL.search` already carries
		 * its `?` (`…-debug-3.log` showed the doubled `??` when it was added by hand).
		 */
		projectReads: (ids: Record<string, string>) =>
			[
				...new Set(
					calls
						.filter(
							(call) =>
								call.method === 'GET' &&
								call.frame.startsWith(`${APP_ORIGIN}${PROJECTS_PATHNAME(ids.project)}`) &&
								(call.path === PROJECTS_ROUTE || call.path === PROJECT_PATH(ids.project))
						)
						.map((call) => `${call.method} ${call.path}${call.search}`)
				)
			].sort(),
		pathsAfter: (marker: number) => calls.slice(marker).map((call) => `${call.method} ${call.path}`)
	};
}

/* ------------------------------------------------ locators ---------------------------------------------- */

/** The page's own scroll owner; `main` and `header` are strict-ambiguous here (the shell has its own of each). */
const CONTENT = '[data-page-scroll-owner="true"]';

async function settle(page: Page) {
	await page
		.waitForFunction(() => !document.querySelector('[aria-busy="true"]'), undefined, { timeout: 20_000 })
		.catch(() => undefined);
}

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
/**
 * Flattened `innerText` of one element, and of a whole list of them. This is the form every probe measurement was
 * taken in (`allInnerTexts()`), and it is **not** what Playwright's `toHaveText` / `toContainText` compare: those
 * matchers read `textContent`, where a CSS-`capitalize`d label stays lowercase and neighbouring spans run together
 * (`open1`, `Probe Projectopen`, `Fixture Team AProjectsFixture Project` — all three measured in
 * `…-debug-2.log`), while `innerText` of the same elements gives `Open 1`, `Probe Project Open`. So every list of
 * elements in this file is compared as flattened `innerText`, never with `toHaveText`.
 */
const textOf = async (locator: Locator) => flat(await locator.innerText());
const innerTexts = async (locator: Locator) => (await locator.allInnerTexts()).map(flat);

const sectionByHeading = (page: Page, heading: string) =>
	page.locator('section').filter({ has: page.getByRole('heading', { level: 2, name: heading, exact: true }) });

/** The innermost `section` carrying that `h2` (an ancestor section carries the heading too), flattened. */
async function sectionText(page: Page, heading: string) {
	const section = sectionByHeading(page, heading).last();
	await expect(section, `no section headed ${heading}`).toBeVisible({ timeout: 20_000 });
	return textOf(section);
}

const stripCells = (page: Page) => page.locator(`${CONTENT} [role="listitem"]`);
const sectionsTablist = (page: Page) => page.getByRole('tablist', { name: DETAIL.SECTIONS, exact: true });
const sectionTabs = (page: Page) => sectionsTablist(page).getByRole('tab');
const layoutTablist = (page: Page) => page.getByRole('tablist', { name: TEAM_TASKS.LAYOUT, exact: true });
const headerRow = (page: Page) => page.locator('h1').locator('xpath=..');
const breadcrumbNav = (page: Page) => page.getByRole('navigation', { name: 'breadcrumb', exact: true });
/** The description reader's own `section` (the one that holds its `h3`, not an ancestor of it). */
const descriptionSection = (page: Page) =>
	page
		.locator('section')
		.filter({ has: page.getByRole('heading', { level: 3, name: C.DESCRIPTION, exact: true }) })
		.last();
/** `ul` rows of this page (Tailwind's `list-style: none` strips their list role, so `listitem` does not match them). */
const pageRows = (page: Page) => page.locator(`${CONTENT} li`);
const groupHeaders = (page: Page) => page.locator(`${CONTENT} button[aria-expanded]`);
const headerEditButton = (page: Page) => page.getByRole('button', { name: C.EDIT, exact: true });
const moreOptionsButton = (page: Page) => page.getByRole('button', { name: C.MORE_OPTIONS, exact: true });
const dialogOf = (page: Page) => page.getByRole('dialog');

const menuItemTexts = async (page: Page) =>
	(
		await page.getByRole('menuitem').evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()))
	).sort();

/**
 * A tablist's labels as the DOM holds them. A tab's count is a separate span, so `innerText` writes `Tasks 3` while
 * `textContent` and the accessible name write `Tasks3` (measured both ways: `…-probe-5.log` U2 by `textContent`,
 * `…-probe-6.log` V3 by `allInnerTexts`), so tabs are read through `textContent` here and never through `toHaveText`.
 */
const tabLabels = async (tabs: Locator) =>
	await tabs.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').trim()));

/**
 * The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`), as a fragment the
 * console line contains. Two shapes matter, both measured in `…-debug-3.log`: the line starts with a timestamp
 * (`[2026-11-26T09:26:00.013Z] [ERROR] …`) and it names the **resource** path the service composed
 * (`/organization-projects/<id>?…`), not the request path the request log shows (`/api/organization-projects/<id>?…`),
 * because the client's base URL already ends in `/api`.
 */
const armedHttpError = (verb: string, resourcePath: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${resourcePath} ${status}`;
/** The same project path as the client's own error line writes it (no `/api`). */
const resourcePathOf = (id: string) => PROJECT_PATH(id).replace(/^\/api/, '');
/** React's dev-mode store warning, not this page's (`security-two-factor-ui.spec.ts:226-233`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/** `dev-error-toaster.tsx`, the dev-only query toast (it carries "Copy details"). */
const DEV_QUERY_NOISE = 'DEV Query failed';

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !line.includes(DEV_QUERY_NOISE))
		.filter((line) => !expected.some((text) => line.includes(text)));

/** The mock's own answer for the fixture project, read straight from the mock (nothing about it is typed here). */
async function readMockProject(page: Page, ids: Record<string, string>) {
	const answer = await page.request.get(`${MOCK_ORIGIN}${PROJECT_PATH(ids.project)}?tenantId=${ids.tenantA}`);
	return answer.json() as Promise<Record<string, unknown>>;
}

test.describe('lane-c · the project page: what it prints, what it sends, and what it does when the answer is bad', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	// ------------- 1. the lane as it is: the mock's own project, with no stub anywhere in this test

	test("1 · the overview of the mock's own project: every row as the page prints it, and the reads it sent", async ({
		page,
		fixture,
		shield
	}) => {
		const { ids, names } = fixture;
		// Read the mock's answer before any recorder is listening, so this fetch is never counted as a page read.
		const mockProject = await readMockProject(page, ids);
		const browser = watchBrowserCalls(page);
		const mockName = String(mockProject.name);

		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		await expect(page.locator('h1')).toHaveText(mockName);
		// The breadcrumb's separators are aria-hidden icons, so its text runs the three crumbs together
		// (`breadcrumb.tsx:31-72`; the concatenation is what `…-debug-2.log` measured).
		await expect(breadcrumbNav(page)).toHaveText(
			`${names.teamA}${EN.pages.projects.projectTitle.PLURAL}${mockName}`
		);

		await expect(page.locator(`${CONTENT} h2`)).toHaveText([
			CONSUMPTION.SUMMARY_LABEL,
			DETAIL.PROPERTIES,
			C.PROGRESS,
			C.DETAILS
		]);

		// No budget on the mock's project and no time on it: the strip keeps its two first cells only, and there is
		// no report link (measured `…-probe-1.log` P1 and `…-probe-4.log` S10; each cell is a `role="listitem"`, the
		// four-cell case measured in `…-probe-4.log` S1 listitems).
		const missing = '–'; // `MISSING_FIGURE`, budget-cells.tsx:33
		const strip = await sectionText(page, CONSUMPTION.SUMMARY_LABEL);
		report('1 budget strip', strip);
		expect(strip).toEqual(
			[
				CONSUMPTION.SUMMARY_LABEL,
				`${BUDGET.COLUMN_SPENT} ${missing} ${BUDGET.RISK_NO_TIME}`,
				`${LIST.COLUMN_BUDGET} ${missing} ${BUDGET.NO_BUDGET}`
			].join(' ')
		);
		await expect(stripCells(page)).toHaveCount(2);
		await expect(page.getByRole('link', { name: CONSUMPTION.OPEN_REPORT, exact: true })).toHaveCount(0);

		// No status, no dates, no client, no tags; the members the mock serves carry no employee record, so
		// `personFromProjectMember` (`project-list.ts:202-208`) has no name to print and the chip is empty.
		const properties = await sectionText(page, DETAIL.PROPERTIES);
		report('1 properties section', properties);
		expect(properties).toEqual(
			[
				DETAIL.PROPERTIES,
				`${C.STATUS} ${LIST.NO_STATUS}`,
				`${C.MANAGERS} ${DETAIL.NOBODY}`,
				C.MEMBERS,
				`${LIST.COLUMN_DATES} -`,
				`${C.TEAMS} ${DETAIL.NO_TEAM}`,
				`${LIST.COLUMN_BUDGET} ${LIST.NOT_SET}`
			].join(' ')
		);
		expect(properties).not.toContain(C.CLIENT);
		expect(properties).not.toContain(EN.pages.projects.categorizationForm.formFields.tags);
		await expect(page.getByRole('heading', { level: 2, name: DETAIL.RESOURCES, exact: true })).toHaveCount(0);

		const progress = await sectionText(page, C.PROGRESS);
		report('1 progress panel', progress);
		expect(progress).toContain(fill(DETAIL.TASKS_IN_TEAM, { team: names.teamA }));
		expect(progress).toContain(fill(LIST.NO_TASKS_IN_TEAM, { team: names.teamA }));

		// The Facts hold only what the project carries: no Created row (no createdAt), no Archive at row.
		const facts = await sectionText(page, C.DETAILS);
		report('1 details section', facts);
		expect(facts).toEqual(
			[
				C.DETAILS,
				`${DETAIL.CODE} ${String(mockProject.code)}`,
				`${EN.pages.projects.financialSettingsForm.formFields.currency} ${String(mockProject.currency)}`,
				`${EN.pages.projects.billable.LABEL} ${C.NO}`
			].join(' ')
		);
		expect(facts).not.toContain(DETAIL.CREATED);
		expect(facts).not.toContain(C.ARCHIVE_AT);

		await expect(descriptionSection(page), 'no description reader').toBeVisible({ timeout: 20_000 });
		expect(await textOf(descriptionSection(page))).toContain(RICH.EMPTY_DESCRIPTION);

		const reads = browser.projectReads(ids);
		report('1 project reads', reads);
		expect(reads).toEqual(
			[`GET ${PROJECT_PATH(ids.project)}?${detailSearch(ids)}`, `GET ${PROJECTS_ROUTE}?${listSearch(ids)}`].sort()
		);

		expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
		expect(shield.pageErrors(), 'the page threw').toEqual([]);
	});

	// ------------- 2. which sections this lane offers, what ?tab= does, and what a click writes into the URL

	test('2 · the sections of a project, the ?tab= matrix (known, unknown, flag-off), and the URL a click writes', async ({
		page,
		fixture
	}) => {
		const { ids } = fixture;
		await serveProject(page, ids, fixture.names, { tasks: servedTasks(fixture) });
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		await expect
			.poll(() => tabLabels(sectionTabs(page)), { timeout: 20_000 })
			.toEqual([DETAIL.TAB_OVERVIEW, `${C.TASKS}3`, `${C.PEOPLE}2`, DOCS.TITLE]);
		// Trash is a flag this lane never sets (`comments-trash-flags.ts:23-24`, `test-servers.ts` sharedEnv).
		await expect(sectionsTablist(page).getByRole('tab', { name: EN.taskTrash.TAB, exact: true })).toHaveCount(0);
		const overview = sectionTabs(page).first();
		await expect(overview).toHaveAttribute('aria-selected', 'true');

		for (const tab of [
			{ param: 'tasks', label: `${C.TASKS}3` },
			{ param: 'people', label: `${C.PEOPLE}2` },
			{ param: 'docs', label: DOCS.TITLE }
		]) {
			const tabButton = sectionTabs(page).filter({ hasText: tab.label }).first();
			await tabButton.click({ timeout: 15_000 });
			await expect(tabButton).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
			// `setTab` rewrites the param (`page-component.tsx:125-137`).
			await expect.poll(() => new URL(page.url()).searchParams.get('tab'), { timeout: 15_000 }).toBe(tab.param);
		}

		await overview.click({ timeout: 15_000 });
		await expect(overview).toHaveAttribute('aria-selected', 'true');
		await expect.poll(() => new URL(page.url()).searchParams.get('tab'), { timeout: 15_000 }).toBe(null);

		// `?tab=trash` (flag off) and an unknown tab both select the overview and leave the URL as it was (`tabOf` `:42-52`).
		for (const unknown of ['trash', 'bogus']) {
			await page.goto(`${APP_ORIGIN}${PROJECTS_PATHNAME(ids.project)}?tab=${unknown}`, {
				waitUntil: 'domcontentloaded'
			});
			await settle(page);
			await expect(overview).toHaveAttribute('aria-selected', 'true', { timeout: 15_000 });
			await expect
				.poll(() => tabLabels(sectionTabs(page)), { timeout: 20_000 })
				.toEqual([DETAIL.TAB_OVERVIEW, `${C.TASKS}3`, `${C.PEOPLE}2`, DOCS.TITLE]);
			expect(new URL(page.url()).searchParams.get('tab')).toBe(unknown);
		}
	});

	// ------------- 3. the Tasks tab: the served tasks grouped by status, and the layout switch

	test('3 · the Tasks tab groups the served tasks by status, and the Layout switch moves them to the calendar', async ({
		page,
		fixture
	}) => {
		const { ids, names } = fixture;
		await serveProject(page, ids, names, { tasks: servedTasks(fixture) });
		const storageKey = 'project-tasks-layout'; // `project-tasks-tab.tsx:38`

		await signInAndVisit(page, fixture, `${PROJECTS_PATHNAME(ids.project)}?tab=tasks`);
		await settle(page);

		// The group header prints `normalizeStatusName` and the count; what capitalises it is the CSS `capitalize`
		// on the label span (`project-tasks-tab.tsx:189`), which `innerText` shows and `textContent` does not —
		// hence `innerTexts`, the form `…-probe-4.log` S2 measured these in.
		const dueDay = projectDay(dayIso(3));
		await expect
			.poll(() => innerTexts(groupHeaders(page)), { timeout: 20_000 })
			.toEqual([
				`${printedStatus('open')} 1`,
				`${printedStatus('in-progress')} 1`,
				`${printedStatus('completed')} 1`
			]);
		await expect
			.poll(() => innerTexts(pageRows(page)), { timeout: 20_000 })
			.toEqual([
				`#1 ${TASK_OPEN} ${initialsOf(names.user)} ${dueDay}`,
				`#2 ${TASK_RUNNING} ${initialsOf(names.user)} ${dueDay}`,
				`#3 ${TASK_DONE} ${initialsOf(names.user)} ${dueDay}`
			]);
		expect(await textOf(page.locator(CONTENT))).toContain(fill(DETAIL.TASKS_IN_TEAM, { team: names.teamA }));

		// Layout: only what every deployment has (`project-tasks-tab.tsx:42`); Timeline needs its own flag (`:60-63`).
		await expect
			.poll(() => tabLabels(layoutTablist(page).getByRole('tab')), { timeout: 20_000 })
			.toEqual([TEAM_TASKS.LAYOUT_LIST, C.CALENDAR]);
		await expect(
			layoutTablist(page).getByRole('tab', { name: TEAM_TASKS.LAYOUT_TIMELINE, exact: true })
		).toHaveCount(0);
		await expect
			.poll(
				async () =>
					await layoutTablist(page)
						.getByRole('tab', { name: TEAM_TASKS.LAYOUT_LIST, exact: true })
						.getAttribute('aria-selected'),
				{
					timeout: 15_000
				}
			)
			.toBe('true');
		expect(await page.evaluate((key) => window.localStorage.getItem(key), storageKey)).toBe(null);

		await layoutTablist(page).getByRole('tab', { name: C.CALENDAR, exact: true }).click({ timeout: 15_000 });
		await expect(page.getByTestId('project-tasks-calendar')).toBeVisible({ timeout: 20_000 });
		await expect
			.poll(async () => await page.evaluate((key) => window.localStorage.getItem(key), storageKey), {
				timeout: 15_000
			})
			.toBe(JSON.stringify('calendar'));
		// What the calendar frame really prints, from `…-debug-4.log`: `… List Calendar Today November 2026
		// 3 tasks due Export due dates (.ics) …`. The due figure is the month's own line
		// (`team-tasks-calendar.tsx:565`) and the export is a button (`:593`, the app's own unit test reaches it by
		// role). The `LAYOUT_CALENDAR_HINT` text is **not** in the frame: it is the Layout switch's hover tooltip
		// (`team-tasks-layout-options.ts:29` reached through `project-tasks-tab.tsx:104-113`), so it is not asserted.
		const calendarText = await textOf(page.locator(CONTENT));
		report('3 calendar frame', calendarText);
		expect(calendarText).toContain(plural(TEAM_TASKS.CALENDAR_DUE_COUNT, 3));
		await expect(page.getByRole('button', { name: TEAM_TASKS.CALENDAR_EXPORT, exact: true })).toBeVisible();

		await layoutTablist(page)
			.getByRole('tab', { name: TEAM_TASKS.LAYOUT_LIST, exact: true })
			.click({ timeout: 15_000 });
		await expect(groupHeaders(page).first()).toBeVisible({ timeout: 20_000 });
		await expect
			.poll(async () => await page.evaluate((key) => window.localStorage.getItem(key), storageKey), {
				timeout: 15_000
			})
			.toBe(JSON.stringify('list'));
	});

	// ------------- 4. the People tab: the rows, the rates as printed, and what saving a rate sends

	test('4 · the People tab prints each rate, and saving the project rate and a member rate is two PUTs', async ({
		page,
		fixture
	}) => {
		const { ids, names } = fixture;
		const harness = await serveProject(page, ids, names, {});
		await signInAndVisit(page, fixture, `${PROJECTS_PATHNAME(ids.project)}?tab=people`);
		await settle(page);

		await expect(
			page.getByRole('heading', { level: 2, name: RATES.PROJECT_RATES_SECTION, exact: true })
		).toBeVisible();
		expect(await sectionText(page, RATES.PROJECT_RATES_SECTION)).toContain(RATES.MOST_SPECIFIC_WINS);
		expect(await sectionText(page, RATES.PROJECT_RATES_SECTION)).toContain(
			fill(RATES.PER_HOUR, { amount: money(75) })
		);

		// The manager row carries the `common.MANAGER` role, the member row carries none
		// (`project-people-tab.tsx:163-181`); the row texts are the ones `…-probe-5.log` U1 measured with `allInnerTexts`.
		await expect
			.poll(() => innerTexts(pageRows(page)), { timeout: 20_000 })
			.toEqual([
				`${initialsOf(names.user)} ${names.user} ${MANAGER_EMAIL} ${C.MANAGER} ${RATES.ADD_RATE}`,
				`${initialsOf(names.teammate)} ${names.teammate} ${TEAMMATE_EMAIL} ${fill(RATES.PER_HOUR, { amount: money(90) })}`,
				`${initialsOf(names.teamA)} ${names.teamA} ${plural(DETAIL.MEMBER_COUNT, 3)}`
			]);

		const projectRate = `${RATES.PROJECT_RATE}: ${money(75)}`;
		const memberRate = `${fill(RATES.RATE_ON_PROJECT_OF, { name: names.teammate })}: ${money(90)}`;
		await expect(page.getByRole('button', { name: projectRate, exact: true })).toBeVisible();
		await expect(page.getByRole('button', { name: memberRate, exact: true })).toBeVisible();

		await page.getByRole('button', { name: projectRate, exact: true }).click({ timeout: 15_000 });
		const popover = dialogOf(page);
		await expect(popover, 'the rate popover never opened').toBeVisible({ timeout: 15_000 });
		expect(await popover.innerText().then(flat)).toContain(RATES.PROJECT_RATE_HINT);
		await popover.locator('input[inputmode="decimal"]').first().fill('120', { timeout: 15_000 });
		const beforeProjectSave = harness.calls.length;
		await popover.getByRole('button', { name: C.SAVE, exact: true }).click({ timeout: 15_000 });
		await expect(popover).toHaveCount(0, { timeout: 15_000 });
		const projectBody = harness.bodyOf('PUT', PROJECT_RATE_PATH(ids.project), beforeProjectSave);
		report('4 project rate body', projectBody);
		expect(projectBody).toEqual({ billRateValue: 120, organizationId: ids.organizationA, tenantId: ids.tenantA });
		await expect(
			page.getByRole('button', { name: `${RATES.PROJECT_RATE}: ${money(120)}`, exact: true })
		).toBeVisible({ timeout: 15_000 });
		expect(harness.writesAfter(beforeProjectSave)).toEqual([`PUT ${PROJECT_RATE_PATH(ids.project)}`]);

		await page.getByRole('button', { name: memberRate, exact: true }).click({ timeout: 15_000 });
		expect(await dialogOf(page).innerText().then(flat)).toContain(RATES.MEMBER_RATE_HINT);
		await dialogOf(page).locator('input[inputmode="decimal"]').first().fill('99', { timeout: 15_000 });
		const beforeMemberSave = harness.calls.length;
		await dialogOf(page).getByRole('button', { name: C.SAVE, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => textOf(pageRows(page).nth(1)), { timeout: 20_000 })
			.toContain(fill(RATES.PER_HOUR, { amount: money(99) }));
		const memberBody = harness.bodyOf('PUT', MEMBER_RATE_PATH(ids.project, ids.teammateEmployee), beforeMemberSave);
		report('4 member rate body', memberBody);
		expect(memberBody).toEqual({ billRateValue: 99, organizationId: ids.organizationA, tenantId: ids.tenantA });
		expect(harness.writesAfter(beforeMemberSave)).toEqual([
			`PUT ${MEMBER_RATE_PATH(ids.project, ids.teammateEmployee)}`
		]);
		await expect
			.poll(() => textOf(page.locator(CONTENT)), { timeout: 20_000 })
			.toContain(fill(RATES.PER_HOUR, { amount: money(120) }));

		const ratesRead = harness.calls.find((call) => call.method === 'GET' && call.path === RATES_PATH(ids.project));
		report('4 rates read', ratesRead ? `${ratesRead.method} ${ratesRead.path}?${ratesRead.search}` : null);
		expect(ratesRead?.search).toContain(`organizationId=${ids.organizationA}`);
	});

	// ------------- 5. editing the project: the composer's write and the two reads that write invalidates

	test('5 · Edit project: what the save sends, what the header shows after it, and the two reads it invalidates', async ({
		page,
		fixture
	}) => {
		const { ids } = fixture;
		const harness = await serveProject(page, ids, fixture.names, {});
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		await headerEditButton(page).first().click({ timeout: 15_000 });
		const dialog = dialogOf(page);
		// The composer is loaded lazily, so the dialog is briefly empty: wait for a field before reading it.
		await expect(dialog.getByRole('textbox').first(), 'the edit dialog never filled with fields').toBeVisible({
			timeout: 20_000
		});
		expect(await dialog.innerText().then(flat)).toContain(EN.modals.project.editTitle);

		const titleField = dialog
			.getByRole('textbox', { name: EN.pages.projects.basicInformationForm.formFields.title, exact: true })
			.first();
		await expect(titleField, 'no title field in the dialog').toBeVisible({ timeout: 15_000 });
		const beforeSave = harness.calls.length;
		await titleField.fill(NEW_PROJECT_NAME, { timeout: 15_000 });
		await dialog.getByRole('button', { name: C.SAVE_CHANGES, exact: true }).click({ timeout: 15_000 });

		await expect(page.locator('h1')).toHaveText(NEW_PROJECT_NAME, { timeout: 20_000 });
		const body = harness.bodyOf('PUT', PROJECT_PATH(ids.project), beforeSave);
		report('5 edit PUT keys', body ? Object.keys(body).sort() : null);
		expect(body?.name).toBe(NEW_PROJECT_NAME);
		// The composer sends its whole state, not a patch (measured `…-probe-6.log` V2).
		expect(Object.keys(body ?? {}).sort()).toEqual(
			[
				'billable',
				'billing',
				'budget',
				'budgetType',
				'currency',
				'description',
				'endDate',
				'imageId',
				'imageUrl',
				'isActive',
				'isArchived',
				'isTasksAutoSync',
				'isTasksAutoSyncOnLabel',
				'managerIds',
				'memberIds',
				'name',
				'organizationContactId',
				'organizationId',
				'projectUrl',
				'public',
				'startDate',
				'status',
				'tags',
				'teams',
				'tenantId'
			].sort()
		);

		// `use-invalidate-organization-projects.ts:22-28` invalidates the whole prefix, so the list read and the detail
		// read both happen again. The write is picked by method (never by index) and the two reads are compared sorted.
		await expect.poll(() => harness.writesAfter(beforeSave).length, { timeout: 20_000 }).toBe(1);
		await expect
			.poll(
				() =>
					[
						...new Set(
							harness.calls
								.slice(beforeSave)
								.filter(
									(call) =>
										call.method === 'GET' &&
										(call.path === PROJECTS_ROUTE || call.path === PROJECT_PATH(ids.project))
								)
								.map((call) => call.path)
						)
					].sort(),
				{ timeout: 20_000 }
			)
			.toEqual([PROJECTS_ROUTE, PROJECT_PATH(ids.project)].sort());
	});

	// ------------- 6. the description editor: what its save carries, and what a reload reads back

	test('6 · the description editor sends the description only, and a reload reads the written text back from the store', async ({
		page,
		fixture
	}) => {
		const { ids } = fixture;
		const harness = await serveProject(page, ids, fixture.names, {});
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		const section = descriptionSection(page);
		expect(await textOf(section)).toContain('Probe description');

		await section.getByRole('button', { name: RICH.EDIT, exact: true }).click({ timeout: 15_000 });
		const editor = page.locator(`${CONTENT} [contenteditable="true"]`);
		await expect(editor.first(), 'the editor never mounted').toBeVisible({ timeout: 20_000 });
		await expect(editor).toHaveCount(1);
		await editor.first().click({ timeout: 15_000 });
		await page.keyboard.press('Control+A');
		await page.keyboard.press('Delete');
		await page.keyboard.type(WRITTEN_TEXT);

		const beforeSave = harness.calls.length;
		await section.getByRole('button', { name: C.SAVE, exact: true }).click({ timeout: 15_000 });

		await expect
			.poll(() => harness.writesAfter(beforeSave), { timeout: 20_000 })
			.toEqual([`PUT ${PROJECT_PATH(ids.project)}`]);
		const body = harness.bodyOf('PUT', PROJECT_PATH(ids.project), beforeSave);
		report('6 description PUT keys', body ? Object.keys(body).sort() : null);
		expect(Object.keys(body ?? {}).sort()).toEqual(['description', 'organizationId', 'tenantId']);
		expect(String(body?.description)).toContain(WRITTEN_TEXT);
		await expect(section).toContainText(WRITTEN_TEXT, { timeout: 20_000 });

		// A reload asks the server again, and the answer is this file's store, which the PUT wrote into.
		const beforeReload = harness.calls.length;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await settle(page);
		await expect(descriptionSection(page)).toContainText(WRITTEN_TEXT, { timeout: 20_000 });
		const reRead = harness.calls
			.slice(beforeReload)
			.find((call) => call.method === 'GET' && call.path === PROJECT_PATH(ids.project));
		report('6 detail read after the reload', reRead ? `${reRead.method} ${reRead.path}?${reRead.search}` : null);
		expect(reRead?.path).toBe(PROJECT_PATH(ids.project));
		expect(String(harness.project().description)).toContain(WRITTEN_TEXT);
	});

	// ------------- 7. archive, then restore: the two writes, the header and the menu in each state

	test('7 · archive then restore: the question, each PUT body, the header mark, and the menu rows each state offers', async ({
		page,
		fixture
	}) => {
		const { ids } = fixture;
		const harness = await serveProject(page, ids, fixture.names, { tasks: servedTasks(fixture) });
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		// `h1`'s own row, as `…-probe-6.log` V3 measured it with `innerText`: the name, then the status chip (whose
		// capitalisation is the CSS `capitalize` on the chip's span, `project-cells.tsx:90`).
		await expect
			.poll(() => textOf(headerRow(page)), { timeout: 20_000 })
			.toEqual(`${PROJECT_NAME} ${printedStatus('open')}`);
		await moreOptionsButton(page).click({ timeout: 15_000 });
		const menu = await menuItemTexts(page);
		report('7 menu before', menu);
		expect(menu).toEqual([C.ARCHIVE, C.DELETE, C.EDIT].sort());
		await page.getByRole('menuitem', { name: C.ARCHIVE, exact: true }).click({ timeout: 15_000 });

		const archiveDialog = dialogOf(page);
		await expect(
			archiveDialog.getByRole('heading', {
				name: fill(EN.pages.projects.archiveModal.title, { projectName: PROJECT_NAME }),
				exact: true
			})
		).toBeVisible({ timeout: 15_000 });
		expect(await archiveDialog.innerText().then(flat)).toContain(MODALS.archive.moves);
		expect(await archiveDialog.innerText().then(flat)).toContain(MODALS.archive.restorable);

		const beforeArchive = harness.calls.length;
		await archiveDialog
			.getByRole('button', { name: MODALS.archive.confirm, exact: true })
			.click({ timeout: 15_000 });
		await expect
			.poll(() => harness.writesAfter(beforeArchive), { timeout: 20_000 })
			.toEqual([`PUT ${PROJECT_PATH(ids.project)}`]);
		const archiveBody = harness.bodyOf('PUT', PROJECT_PATH(ids.project), beforeArchive);
		report('7 archive body', archiveBody);
		expect(Object.keys(archiveBody ?? {}).sort()).toEqual([
			'archivedAt',
			'isActive',
			'isArchived',
			'organizationId',
			'tenantId'
		]);
		expect(archiveBody?.isArchived).toBe(true);
		expect(archiveBody?.isActive).toBe(false);
		// `archivedAt` is the app's own "now": pinned as a real instant of today, never as a fixed date.
		expect(new Date(String(archiveBody?.archivedAt)).toDateString()).toBe(new Date().toDateString());

		await expect
			.poll(() => textOf(headerRow(page)), { timeout: 20_000 })
			.toEqual(`${PROJECT_NAME} ${printedStatus('open')} ${LIST.SCOPE_ARCHIVED}`);
		await expect(headerEditButton(page)).toHaveCount(0);
		await moreOptionsButton(page).click({ timeout: 15_000 });
		const archivedMenu = await menuItemTexts(page);
		report('7 menu after archive', archivedMenu);
		expect(archivedMenu).toEqual([C.DELETE, C.RESTORE].sort());
		await page.getByRole('menuitem', { name: C.RESTORE, exact: true }).click({ timeout: 15_000 });

		const restoreDialog = dialogOf(page);
		await expect(
			restoreDialog.getByRole('heading', {
				name: fill(MODALS.restore.title, { name: PROJECT_NAME }),
				exact: true
			})
		).toBeVisible({
			timeout: 15_000
		});
		expect(await restoreDialog.innerText().then(flat)).toContain(MODALS.restore.backToActive);
		expect(await restoreDialog.innerText().then(flat)).toContain(MODALS.restore.keepsSettings);

		const beforeRestore = harness.calls.length;
		await restoreDialog
			.getByRole('button', { name: MODALS.restore.confirm, exact: true })
			.click({ timeout: 15_000 });
		await expect
			.poll(() => harness.writesAfter(beforeRestore).length, { timeout: 20_000 })
			.toBeGreaterThanOrEqual(1);
		const restoreBody = harness.bodyOf('PUT', PROJECT_PATH(ids.project), beforeRestore);
		report('7 restore body', restoreBody);
		expect(Object.keys(restoreBody ?? {}).sort()).toEqual([
			'archivedAt',
			'isActive',
			'isArchived',
			'organizationId',
			'tenantId'
		]);
		expect(restoreBody?.archivedAt).toBe(null);
		expect(restoreBody?.isActive).toBe(true);
		expect(restoreBody?.isArchived).toBe(false);

		await expect
			.poll(() => textOf(headerRow(page)), { timeout: 20_000 })
			.toEqual(`${PROJECT_NAME} ${printedStatus('open')}`);
		expect(page.url()).toBe(`${APP_ORIGIN}${PROJECTS_PATHNAME(ids.project)}`);
	});

	// ------------- 8. delete: what the mock's own answer does, and what a 204 that really removes the row does

	test("8 · delete: the mock's own answer leaves the question open, a 204 that removes the row leaves the error card", async ({
		page,
		fixture,
		mock,
		shield
	}) => {
		const { ids } = fixture;

		// (a) no stub at all: the lane's mock answers the DELETE with the project body (`mock-gauzy-server.mjs:764`).
		const mockProject = await readMockProject(page, ids);
		const mockName = String(mockProject.name);
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);
		await moreOptionsButton(page).click({ timeout: 15_000 });
		await page.getByRole('menuitem', { name: C.DELETE, exact: true }).click({ timeout: 15_000 });

		const deleteDialog = dialogOf(page);
		await expect(
			deleteDialog.getByRole('heading', { name: fill(MODALS.delete.title, { name: mockName }), exact: true })
		).toBeVisible({
			timeout: 15_000
		});
		expect(await deleteDialog.innerText().then(flat)).toContain(MODALS.delete.removes);
		expect(await deleteDialog.innerText().then(flat)).toContain(MODALS.delete.final);
		expect(await deleteDialog.innerText().then(flat)).toContain(MODALS.delete.archiveInstead);

		await deleteDialog.getByRole('button', { name: MODALS.delete.confirm, exact: true }).click({ timeout: 15_000 });
		const deleteAnswers = (await mock.requests()).filter(
			(request) => request.method === 'DELETE' && request.path === PROJECT_PATH(ids.project)
		);
		report(
			'8a mock delete answers',
			deleteAnswers.map((request) => `${request.method} ${request.path} ${request.status}`)
		);
		expect(deleteAnswers.map((request) => request.status)).toContain(200);
		// `deleteProjectNoContentResponseSchema` is `undefined | '' | null`, so the project body is refused by the client.
		await expect
			.poll(() => shield.consoleErrors().some((line) => line.includes('deleteOrganizationProject')), {
				timeout: 20_000
			})
			.toBe(true);
		report(
			'8a rejected-delete console lines',
			shield
				.consoleErrors()
				.filter((line) => line.includes('deleteOrganizationProject'))
				.map(flat)
		);
		// The question stays open (`delete-project-modal.tsx:44-48`) and the page stays put.
		await expect(deleteDialog).toBeVisible();
		await expect(page.locator('h1')).toHaveText(mockName);
		expect(page.url()).toBe(`${APP_ORIGIN}${PROJECTS_PATHNAME(ids.project)}`);
		await deleteDialog.getByRole('button', { name: C.CANCEL, exact: true }).click({ timeout: 15_000 });
		await expect(deleteDialog).toHaveCount(0, { timeout: 15_000 });

		// (b) a served 204 that also removes the row: the list is read again, the detail 404s, the card replaces the page.
		const harness = await serveProject(page, ids, fixture.names, { deleteRemoves: true });
		const browser = watchBrowserCalls(page);
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);
		await expect(page.locator('h1')).toHaveText(PROJECT_NAME);

		// The console log is the whole page's, so what part (a) already printed (the mock's refused delete) is noted
		// here and subtracted later — only the 404 this file arms is excused, and only from this point on.
		const armed = armedHttpError('GET', `${resourcePathOf(ids.project)}?${detailSearch(ids)}`, 404);
		const findingsBeforePartB = consoleFindings(shield);
		const newFindings = () =>
			consoleFindings(shield, [armed]).filter((line) => !findingsBeforePartB.includes(line));

		await moreOptionsButton(page).click({ timeout: 15_000 });
		await page.getByRole('menuitem', { name: C.DELETE, exact: true }).click({ timeout: 15_000 });
		const beforeDelete = browser.all.length;
		await dialogOf(page)
			.getByRole('button', { name: MODALS.delete.confirm, exact: true })
			.click({ timeout: 15_000 });

		await expect
			.poll(
				() =>
					browser.pathsAfter(beforeDelete).filter((entry) => entry === `DELETE ${PROJECT_PATH(ids.project)}`)
						.length,
				{ timeout: 20_000 }
			)
			.toBeGreaterThanOrEqual(1);
		await expect(page.getByRole('heading', { name: DETAIL.ERROR_TITLE, exact: true })).toBeVisible({
			timeout: 30_000
		});
		expect(await textOf(page.locator(CONTENT))).toContain(DETAIL.ERROR_MESSAGE);
		await expect(page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })).toBeVisible();
		expect(page.url()).toBe(`${APP_ORIGIN}${PROJECTS_PATHNAME(ids.project)}`);

		const afterDelete = browser.all
			.slice(beforeDelete)
			.filter((call) => call.path === PROJECTS_ROUTE || call.path === PROJECT_PATH(ids.project));
		const writes = afterDelete.filter((call) => call.method === 'DELETE');
		report(
			'8b calls after the confirm',
			afterDelete.map((call) => `${call.method} ${call.path}`)
		);
		expect(writes[0]?.body).toBe(null);
		// A failed read is retried (`page-component.tsx:115`), so its members are pinned and never a count.
		expect(
			[...new Set(afterDelete.filter((call) => call.method === 'GET').map((call) => call.path))].sort()
		).toEqual([PROJECTS_ROUTE, PROJECT_PATH(ids.project)].sort());

		// The armed 404 line is waited for (the failed read is retried, so its count is never pinned), and nothing
		// else may have been logged since part (b) began.
		await expect
			.poll(() => shield.consoleErrors().some((line) => line.includes(armed)), { timeout: 30_000 })
			.toBe(true);
		report(
			'8b armed 404 console lines',
			shield
				.consoleErrors()
				.filter((line) => line.includes(armed))
				.map((line) => flat(line).slice(0, 150))
		);
		expect(newFindings(), 'part (b) logged something beyond the armed 404').toEqual([]);
		expect(harness.calls.some((call) => call.method === 'DELETE')).toBe(true);
	});

	// ------------- 9. a person who is neither an admin nor a manager of this project

	test('9 · neither admin nor project manager: no Edit, no More options, no consumption, read-only files and description', async ({
		page,
		fixture
	}) => {
		const { ids, names } = fixture;
		await serveProject(page, ids, names, { membersWithoutSelf: true });
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project), {
			scenario: { roleName: 'EMPLOYEE', manager: false }
		});
		await settle(page);

		await expect(page.locator('h1')).toHaveText(PROJECT_NAME);
		await expect(headerEditButton(page)).toHaveCount(0);
		await expect(moreOptionsButton(page)).toHaveCount(0);
		// `use-project-consumption.ts:27-29`: the budget strip follows the right to manage the active team.
		await expect(sectionByHeading(page, CONSUMPTION.SUMMARY_LABEL)).toHaveCount(0);

		await expect(descriptionSection(page).getByRole('button', { name: RICH.EDIT, exact: true })).toHaveCount(0);
		expect(await textOf(descriptionSection(page))).toContain('Probe description');
		// `EntityFilesSection` read-only: the empty state is `EMPTY_READ_ONLY`, with no drop zone to attach into.
		expect(await textOf(page.locator(CONTENT))).toContain(FILES.EMPTY_READ_ONLY);
		expect(await textOf(page.locator(CONTENT))).not.toContain(FILES.EMPTY);
		await expect(
			page.getByRole('button', { name: fill(FILES.REMOVE, { name: FILE_NAME }), exact: true })
		).toHaveCount(0);

		expect(await textOf(page.locator(CONTENT))).toContain(`${initialsOf(STRANGER_NAME)} ${STRANGER_NAME}`);
		expect(await textOf(page.locator(CONTENT))).not.toContain(`${initialsOf(names.teammate)} ${names.teammate}`);

		// The sections are still there, with the counts the served project carries (1 member, no tasks).
		await expect
			.poll(() => tabLabels(sectionTabs(page)), { timeout: 20_000 })
			.toEqual([DETAIL.TAB_OVERVIEW, `${C.TASKS}0`, `${C.PEOPLE}1`, DOCS.TITLE]);
	});

	// ------------- 10. the Docs tab: the linked pages, detaching one, attaching one, and New page

	test('10 · the Docs tab prints each linked page, detaches and attaches with a body, and New page posts then goes there', async ({
		page,
		fixture
	}) => {
		const { ids, names } = fixture;
		const pageOneId = uuidOf('0000000000d1');
		const pageTwoId = uuidOf('0000000000d2');
		const linkOneId = uuidOf('0000000000l1');
		const createdPageId = uuidOf('00000000000p');
		const docsPages = [
			{
				id: pageOneId,
				kind: 'PAGE',
				name: PAGE_ONE,
				index: 1,
				visibility: 'ORGANIZATION',
				updatedAt: dayIso(-1)
			},
			{ id: pageTwoId, kind: 'PAGE', name: PAGE_TWO, index: 2, visibility: 'ORGANIZATION', updatedAt: dayIso(-2) }
		];
		const links: ServedLink[] = [
			{
				id: linkOneId,
				documentId: pageOneId,
				entity: 'OrganizationProject',
				entityId: ids.project,
				createdAt: dayIso(-1),
				document: { id: pageOneId, name: PAGE_ONE, kind: 'PAGE', updatedAt: dayIso(-1) }
			}
		];
		const harness = await serveProject(page, ids, names, { docsPages, links });

		await signInAndVisit(page, fixture, `${PROJECTS_PATHNAME(ids.project)}?tab=docs`);
		await settle(page);

		await expect
			.poll(() => innerTexts(pageRows(page)), { timeout: 20_000 })
			.toEqual([`${PAGE_ONE} ${mediumDate(dayIso(-1))}`]);
		await expect(page.locator(`${CONTENT} a[href="/docs/${pageOneId}"]`)).toBeVisible();

		await page.getByRole('button', { name: DOCS.ATTACH_PAGE, exact: true }).click({ timeout: 15_000 });
		const picker = dialogOf(page);
		await expect(
			picker.getByRole('button', { name: PAGE_TWO, exact: true }),
			'the picker never listed the workspace page'
		).toBeVisible({
			timeout: 20_000
		});
		expect(await picker.innerText().then(flat)).toContain(DOCS.ATTACH_PAGE_TEXT);
		const beforeAttach = harness.calls.length;
		await picker.getByRole('button', { name: PAGE_TWO, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => innerTexts(pageRows(page)), { timeout: 20_000 })
			.toEqual([`${PAGE_ONE} ${mediumDate(dayIso(-1))}`, `${PAGE_TWO} ${mediumDate(dayIso(-2))}`]);
		const attachCall = harness.calls
			.slice(beforeAttach)
			.find((call) => call.method === 'POST' && call.path === DOCS_LINKS_ROUTE);
		report('10 attach body', jsonBody(attachCall));
		expect(jsonBody(attachCall)).toEqual({
			documentId: pageTwoId,
			entity: 'OrganizationProject',
			entityId: ids.project,
			organizationId: ids.organizationA,
			tenantId: ids.tenantA
		});

		const beforeDetach = harness.calls.length;
		await page.getByRole('button', { name: DOCS.DETACH_PAGE, exact: true }).first().click({ timeout: 15_000 });
		await expect
			.poll(() => innerTexts(pageRows(page)), { timeout: 20_000 })
			.toEqual([`${PAGE_TWO} ${mediumDate(dayIso(-2))}`]);
		const detachCall = harness.calls.slice(beforeDetach).find((call) => call.method === 'DELETE');
		report('10 detach call', detachCall ? `${detachCall.method} ${detachCall.path}` : null);
		expect(detachCall?.path).toBe(`${DOCS_LINKS_ROUTE}/${linkOneId}`);

		// New page: the document first, then the link that puts it on this project, then the browser goes there.
		const beforeNew = harness.calls.length;
		await page.getByRole('button', { name: DOCS.NEW_PAGE, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => harness.calls.slice(beforeNew).filter((call) => call.method === 'POST').length, {
				timeout: 20_000
			})
			.toBeGreaterThanOrEqual(2);
		const posts = harness.calls.slice(beforeNew).filter((call) => call.method === 'POST');
		const documentPost = posts.find((call) => call.path === DOCS_DOCUMENTS_ROUTE);
		const linkPost = posts.find((call) => call.path === DOCS_LINKS_ROUTE);
		report(
			'10 new page bodies',
			posts.map((call) => `${call.method} ${call.path} ${call.body}`)
		);
		expect(jsonBody(documentPost)).toEqual({
			// `index` is `nextIndexUnder(tree, null)` (`docs-tree.ts:126-130`): the two served top-level pages, +1.
			contentHtml: '',
			contentJson: { content: [{ type: 'paragraph' }], type: 'doc' },
			index: 3,
			kind: 'PAGE',
			name: DOCS.UNTITLED,
			organizationId: ids.organizationA,
			parentId: null,
			tenantId: ids.tenantA,
			visibility: 'ORGANIZATION'
		});
		expect(jsonBody(linkPost)).toMatchObject({
			documentId: createdPageId,
			entity: 'OrganizationProject',
			entityId: ids.project
		});
		await expect.poll(() => page.url(), { timeout: 30_000 }).toContain(`/docs/${createdPageId}`);
	});

	// ------------- 11. an id the mock answers anyway, then a project read the server refuses

	test("11 · an unknown id opens the mock's own project, and a refused project read is the error card with Try again", async ({
		page,
		fixture,
		shield
	}) => {
		const { ids } = fixture;

		// (a) no stub: `mock-gauzy-server.mjs:764` answers any `…/organization-projects/<anything>` with the fixture
		// project, so an id that exists nowhere opens that project instead of an error (see the findings above).
		const mockProject = await readMockProject(page, ids);
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(UNKNOWN_PROJECT_ID));
		await settle(page);
		await expect(page.locator('h1')).toHaveText(String(mockProject.name));
		expect(new URL(page.url()).pathname).toBe(PROJECTS_PATHNAME(UNKNOWN_PROJECT_ID));

		// (b) now refuse the detail read (500) and load the served project.
		await serveProject(page, ids, fixture.names, { detailRefusal: 500 });
		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		await expect(page.getByRole('heading', { name: DETAIL.ERROR_TITLE, exact: true })).toBeVisible({
			timeout: 30_000
		});
		expect(await textOf(page.locator(CONTENT))).toContain(DETAIL.ERROR_MESSAGE);
		await expect(page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true })).toBeVisible();
		await expect(sectionByHeading(page, DETAIL.PROPERTIES)).toHaveCount(0);

		// A failed read is retried (`page-component.tsx:115`): its armed console lines are pinned, never their count.
		const armed = armedHttpError('GET', `${resourcePathOf(ids.project)}?${detailSearch(ids)}`, 500);
		await expect
			.poll(() => shield.consoleErrors().some((line) => line.includes(armed)), { timeout: 30_000 })
			.toBe(true);
		report(
			'11 refused-read console lines',
			shield
				.consoleErrors()
				.filter((line) => line.includes('HTTP Error'))
				.map((line) => flat(line).slice(0, 140))
		);
		expect(consoleFindings(shield, [armed]), 'the page logged something beyond the armed 500').toEqual([]);
	});

	// ------------- 12. the figures the report and the task statistics put on the overview, and the project's file

	test('12 · the overview figures (budget strip, progress, trend note) and the file row with its remove request', async ({
		page,
		fixture
	}) => {
		const { ids, names } = fixture;
		const fileLinkId = uuidOf('0000000000f1');
		const links: ServedLink[] = [
			{
				id: fileLinkId,
				documentId: uuidOf('0000000000f2'),
				entity: 'OrganizationProject',
				entityId: ids.project,
				createdAt: dayIso(-1),
				document: {
					id: uuidOf('0000000000f2'),
					name: FILE_NAME,
					kind: 'FILE',
					mimeType: 'application/pdf',
					fileSize: 20480
				}
			}
		];
		await serveProject(page, ids, names, {
			tasks: servedTasks(fixture),
			reportRows: [
				{
					project: { id: ids.project, name: PROJECT_NAME, currency: CURRENCY_CODE, membersCount: 2 },
					budgetType: 'hours',
					budget: BUDGET_HOURS,
					spent: SPENT_HOURS,
					remainingBudget: REMAINING_HOURS,
					spentPercentage: 31
				}
			],
			links
		});
		const browser = watchBrowserCalls(page);

		await signInAndVisit(page, fixture, PROJECTS_PATHNAME(ids.project));
		await settle(page);

		// Every cell below is computed from the served row the way the summary computes it, and the four strings are
		// the `innerText` of the four `role="listitem"` cells `…-probe-4.log` S1 measured for the same served numbers.
		await expect
			.poll(() => innerTexts(stripCells(page)), { timeout: 20_000 })
			.toEqual([
				`${C.TIME_SPENT} ${hoursText(SPENT_HOURS, true)}`,
				`${LIST.COLUMN_BUDGET} ${hoursText(BUDGET_HOURS, false)} ${BUDGET.TYPE_HOURS}`,
				`${BUDGET.COLUMN_USED} ${shareText((SPENT_HOURS / BUDGET_HOURS) * 100)} ${BUDGET.RISK_WITHIN}`,
				`${BUDGET.COLUMN_REMAINING} ${fill(BUDGET.LEFT, { amount: hoursText(REMAINING_HOURS, true) })}`
			]);
		await expect(page.getByRole('link', { name: CONSUMPTION.OPEN_REPORT, exact: true })).toHaveAttribute(
			'href',
			`/reports/project-budget?project=${ids.project}`
		);

		const progress = await sectionText(page, C.PROGRESS);
		report('12 progress panel', progress);
		expect(progress).toContain(fill(DETAIL.TASKS_IN_TEAM, { team: names.teamA }));
		expect(progress).toContain(`${DETAIL.SCOPE} 3`);
		expect(progress).toContain(`${LIST.STARTED} 1`);
		expect(progress).toContain(`${DETAIL.COMPLETED} 1`);
		// One completed task of three: `completionPercentOf` (`project-list.ts:575-580`).
		expect(progress).toContain(
			`${initialsOf(names.user)} ${names.user} ${fill(DETAIL.SHARE_OF, { percent: Math.round((1 / 3) * 100), total: 3 })}`
		);
		expect(progress).toContain(fill(DETAIL.WEEKLY_TREND_UNDATED, { count: 1 }));
		await expect
			.poll(
				() => tabLabels(page.getByRole('tablist', { name: DETAIL.BREAKDOWN, exact: true }).getByRole('tab')),
				{
					timeout: 20_000
				}
			)
			.toEqual([DETAIL.BY_ASSIGNEE, C.STATUS]);

		await expect(page.getByRole('link', { name: SITE_URL, exact: true })).toHaveAttribute('href', SITE_URL);
		await expect(page.getByRole('link', { name: REPO_URL, exact: true })).toHaveAttribute('href', REPO_URL);
		await expect(page.getByRole('button', { name: DETAIL.COPY_LINK, exact: true })).toHaveCount(2);

		const removeButton = page.getByRole('button', { name: fill(FILES.REMOVE, { name: FILE_NAME }), exact: true });
		await expect(removeButton, 'the served file never got a row').toBeVisible({ timeout: 20_000 });
		expect(await textOf(page.locator(CONTENT))).toContain(FILE_NAME);
		const before = browser.all.length;
		await removeButton.click({ timeout: 15_000 });
		await expect
			.poll(
				() =>
					browser.all
						.slice(before)
						.filter((call) => call.method === 'DELETE')
						.map((call) => call.path),
				{ timeout: 20_000 }
			)
			.toEqual([`${DOCS_LINKS_ROUTE}/${fileLinkId}`]);
		await expect(removeButton).toHaveCount(0, { timeout: 20_000 });
	});
});
