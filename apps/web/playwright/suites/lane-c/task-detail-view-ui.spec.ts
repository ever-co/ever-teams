import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type BootstrapFixture, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInWithFixture, stubNextAuthSession } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees on **one task's own page** (`/task/<id>`,
 * `app/[locale]/(main)/task/[id]/page.tsx`) on lane-c (app `http://localhost:3033`, mock `http://127.0.0.1:4002`,
 * control `4003`, `playwright/test-servers.ts` `LANE_PORTS['lane-c']`), read-only: what the page prints for a task
 * this file serves, which reads it makes and when, and what it shows when a read is refused, the task is not there,
 * tracking is off for this member, or the window is narrow.
 *
 * ## Where the numbers came from
 *
 * Every pinned value was read off a run first. The measurements come from the throwaway probes
 * `D:\Coding\.tmp\probe-taskdetail\` run on this lane on 2026-11-26 (logs `D:\Coding\.tmp\probe-taskdetail-4.log`,
 * `-6.log`, `-9.log`, `-10.log`, `-11.log`, `-12.log`, `-13.log`, `-14.log`; `-1.log` to `-3.log` found the first two
 * traps: the lane's own `h1`-less first paint needs a real wait, and a synthetic id with a non-hex tail is refused by
 * `uuIdSchema` (`core/types/schemas/common/base.schema.ts:8` `z.string().uuid('Invalid UUID')`), which lands the page
 * on its failure panel instead of the task). The probe harness `serve-task.ts` is the seed of this file's own
 * `serveTaskDetail`. Each test also prints its own `[lane-c task-detail] MEASURE …` line, so a later run re-reads the
 * same numbers; two consecutive whole-file runs (logs `D:\Coding\.tmp\s3-lane-c-taskdetail-1.log`, `-2.log`) hold
 * every expectation below.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's app, its shell, the NextAuth stub of the fixture, and the mock's answers for everything this
 * file does not touch (`/api/user/me`, `/api/role-permissions/me`, `/api/changelog`, `/api/employee-notification`,
 * `/api/auth/workspaces`, `/api/employee/me/presence`, `/api/favorite/employee`, `/api/organization-projects`,
 * `/api/daily-plan*`, `/api/timesheet/*`, `/api/employee-notification-setting`). The mock's own task answer is its
 * fixture task (`cypress/support/mock-gauzy-server.mjs` answers **any** `/api/tasks/<id>` with it) — test 9a visits an
 * unknown id with no stub at all, so what is measured there is the mock's own behaviour, not this file's.
 *
 * **Served by this file:** the task itself (the mock's fixture task carries one child, no relatives, no files and no
 * activity, so nothing beyond test 9a can be measured against it), its relatives, the task list the band's pager
 * walks, `GET /api/task-metadata/bootstrap` (the mock answers all seven sections empty,
 * `mock-gauzy-server.mjs:336-343` handed out at `:686-693`), `GET /api/plugins/docs/links` (the Files rows),
 * `GET /api/comment`, `GET /api/activity-log`, `GET /api/reaction/comments`, `GET /api/timesheet/activity`, and
 * `GET /api/organization-team[/<id>]` when a test needs the member's tracking switches (the mock hard-codes both to
 * `true`, `:144` and `:206`, and a `scenario` cannot change them). Every served answer restates the mock's own CORS
 * answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`): the page sits on `localhost:3033` and
 * the API on `127.0.0.1:4002`, and without it the browser throws the answer away. `route.fetch()` is never called for
 * an answer this file wants to prove was used, so `mock.calls('/api/tasks/')` and its twins stay empty in every
 * stubbed test — the witness that the page acted on this file.
 *
 * **The browser talks to the mock, never to the app's route twins** (`playwright/test-servers.ts`,
 * `core/constants/config/constants.tsx` `GAUZY_API_BASE_SERVER_URL`, `core/services/client/axios.ts`): this lane sets
 * `NEXT_PUBLIC_GAUZY_API_SERVER_URL` to the mock origin, which is why the task read carries its full query
 * (`task.service.ts` `getTaskById` only appends `?<query>` when that URL is set) — pinned in test 1.
 * `app/api/tasks/**` (proxy mode) is not in this file's path.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `app/[locale]/(main)/task/[id]/page.tsx`: `useRequestedTask` `:45-90` — `hasLoadFailed` `:51`, `isTaskNotFound`
 *   `:52` fed by `isTaskNotFoundError` (`core/hooks/organizations/teams/use-task-queries.ts:18-23`, which maps a 404
 *   **or a 406** to "does not exist"), `isLoadError = hasLoadFailed && !isTaskNotFound` `:53`,
 *   `isStoredTask = detailedTask?.id === taskId` `:54` (so a read that answers a *different* task is a not-found),
 *   `isMissing` `:88`, `retry` `:76-80`; the render `:113-136` — `showTimer={isTrackingEnabled}` `:116`, the header
 *   `Breadcrumb` `:118-122`, `{isMissing && <TaskNotFound />}` `:133` (`TaskNotFound` `:24-32`, whose action is
 *   `<Link href="/">`), `{isLoadError && <TaskLoadFailedState … onRetry={retry} …>}` `:134`.
 * - `core/components/tasks/detail/task-load-states.tsx:26-51`: the not-found title/description and the failure panel
 *   (`pages.error.HEADING_TITLE`, `pages.error.HEADING_DESCRIPTION`, `pages.unauthorized.TRY_AGAIN`).
 * - `core/components/pages/task/task-detail-page-band.tsx`: `crumbsOf` `:26-37` (the epic, then the parent **only if
 *   `parent && task.parentId`**), the number button `:111`, the crumbs `:112-121` (`max-md:hidden`), the timer only
 *   `isTrackingEnabled` `:123-128`, the pager inside `max-sm:hidden` `:129-137`, `TaskFavoriteButton` `:138`,
 *   `TaskCopyLinkButton` inside `max-sm:hidden` `:139-142`.
 * - `core/components/tasks/detail/task-detail-actions.tsx`: `TaskNumberButton` `:111-139` (aria
 *   `taskDetail.header.COPY_NUMBER`), `TaskDetailPager` `:150-196` (`hasSiblings = total > 1` `:161`, the
 *   `position / total` caption, `taskDetail.header.PREVIOUS` with `key: 'K'` `:184`, `taskDetail.header.NEXT` with
 *   `key: 'J'` `:190`).
 * - `core/hooks/tasks/use-task-drawer.ts:26-35`: on a task page `openTaskDrawer` navigates (`router.push`) instead of
 *   opening the drawer, and the drawer `sequence` — which is all the band's pager knows (`taskDrawerState.sequence`,
 *   `core/stores/tasks/task-drawer.ts`) — is only set by a list page. That is why a direct visit prints no pager.
 * - `core/components/pages/task/task-detail-page-body.tsx`: `WIDE_LAYOUT_QUERY = '(min-width: 1024px)'` `:20`, the rail
 *   `TaskDetailRail` `:39-58` (`aside aria-label={t('common.DETAILS')}`, the four `TaskDetailRailSection`s Properties
 *   `:46`, Time `:49`, `pages.taskDetails.DAILY_PLANS` `:52`, Details `:55`), `!isWide && <TaskDetailProperties />`
 *   and `!isWide && <TimePlansAndFacts />` (the rail's parts printed inline instead), `EntityFilesSection` `:77`,
 *   `TaskDetailTimesheet` `:79`, `TaskDetailActivity showsComposer` `:81`, `{isWide && <TaskDetailRail />}` `:85`.
 * - `core/components/tasks/detail/task-detail-properties.tsx`: the property rows (`Priority`, `Size`, `Issue type`,
 *   `Assignees`, `Labels`, `Project`, `Version`, `Parent`, dates, `Visibility`), whose pickers read the metadata
 *   sections (`use-task-priorities-query.ts:23-40` and its twins take `taskMetadataQuery.data?.[section]`).
 * - `core/components/tasks/detail/task-detail-subtasks.tsx:95` (`common.CHILD_ISSUES`),
 *   `task-detail-relations.tsx:34-46`, `:187` (`common.RELATED_ISSUES`, `common.IS_BLOCKED_BY`, `common.RELATES_TO`),
 *   `task-issue-row.tsx:103` (`href={'/task/' + task.id}`).
 * - `core/components/common/entity-files/entity-files-section.tsx`: `state === 'unavailable'` renders nothing `:142`,
 *   `section aria-label={t('entityFiles.TITLE')}` `:197`, the file row's `title={t('entityFiles.OPEN', { name })}`
 *   `:46`, its `Remove` `:62-63`, the empty drop target `:104` (`entityFiles.EMPTY`).
 * - `core/components/common/rich-editor/editable-rich-text.tsx:75-89` (the empty states) and
 *   `rich-text-view.tsx` (DOMPurify, `hardenNode` putting `target="_blank"` and
 *   `rel="noopener noreferrer nofollow"` on every link).
 * - `core/components/tasks/detail/task-detail-activity.tsx`: `useHasComeNear` `:239`, `loadedTask` / `loadedTaskId`
 *   staying null until the section comes near `:245-249`, `useTaskComments(loadedTask)` `:250` and
 *   `useTaskActivityLog(loadedTaskId)` `:251` (both `enabled` only with a task id —
 *   `use-task-comments.ts:121-131`, `use-task-activity-log.ts:37-49`), `useFeedTabs` `:257`.
 *   `core/hooks/common/use-has-come-near.ts:1-54`: an IntersectionObserver with `DEFAULT_MARGIN = '600px'` rooted at
 *   the nearest vertically scrolling ancestor (`:20-28`, `:40-46`).
 * - `core/components/tasks/detail/task-detail-timesheet.tsx`: `useState(false)` `:41` and `{isOpen &&
 *   <TimesheetEntries />}` `:62-66`, so the read only exists while the section is open; the empty copy
 *   `pages.taskDetails.NO_ACTIVITY` `:21`; `useTaskTimeSheets` `core/hooks/tasks/use-task-activity.ts:24-31` — the
 *   read is `enabled` only when `activityFilter.member?.employeeId === user?.employee?.id` **or**
 *   `user?.role?.name?.toUpperCase() === 'MANAGER'`, and this lane's fixture role is `ADMIN`.
 *   `core/components/tasks/user-task-activity.tsx:37-38` prints the entry's `duration` as the number it was served
 *   with, and `:56-75` gives every entry its own `Screenshots / Apps / Visited Sites` tab group.
 * - `core/stores/timer/active-timer.ts:26-35` `isTrackingEnabledState` over
 *   `core/lib/helpers/team-member-tracking.ts:11-15` `canMemberTrackTime` (the team switch **and** the employee's own
 *   switch; a read that leaves the employee switch out is not an off).
 * - `core/lib/utils/comments-trash-flags.ts:12-16`: comment reactions need
 *   `NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED=true`, which this lane was not started with.
 *
 * ## Findings (measured; tagged only where a comment, a type, a unit test or the copy says otherwise)
 *
 * 1. The band's pager is missing on a direct visit — not a bug, but not obvious either: it follows
 *    `taskDrawerState.sequence`, which only a list page sets (`use-task-drawer.ts:26-35`). Test 8 reaches it the way
 *    a person does: open the task from **Teams › Tasks**, then the drawer's `Open full page`
 *    (`taskDrawer.OPEN_FULL_PAGE`, `core/components/tasks/drawer/task-drawer.tsx`).
 * 2. A read that answers a *different* task is shown as "Task not found". The mock answers any `/api/tasks/<id>` with
 *    its own fixture task, so an unknown id is not a 404 here at all: `page.tsx:54` decides it.
 * 3. (measured, untagged: a gap in the lane's mock, not in the app) `core/hooks/organizations/teams/use-task-queries.ts:17`
 *    says the API answers 404 for a missing task and 406 for an id that is not a UUID. On this lane a non-UUID id
 *    asked of the mock is answered **200 with the fixture task** (measured, `probe-taskdetail-5.log` "non uuid id"),
 *    so the 406 half has to be armed by this file to be seen at all (test 9c). The app's own mapping is as the comment
 *    says once the 406 arrives: both 9b and 9c print the not-found panel.
 * 4. The lane prints a property *label* where the served value should be: Priority, Size, Version print their own
 *    field label and Labels prints nothing, because the mock answers every metadata section empty
 *    (`mock-gauzy-server.mjs:336-343`, `:686-693`; and `:658` hands the team record empty `priorities/sizes/labels`
 *    too). Served metadata changes nothing about the page — the same rows then print the served strings (test 1
 *    against test 4 of `probe-taskdetail-9.log`). `Issue type` prints `Task` either way, which is why test 1 does not
 *    claim it proves a served value.
 * 5. The Files section is not lazy: its read is on mount (`entity-files-section.tsx` has no proximity trigger), and
 *    scrolling changes nothing (1 read before the scroll, 1 after, `probe-taskdetail-9.log`). The Activity section's
 *    History read *is* lazy (0 before the section comes near, 1 after, `probe-taskdetail-10.log`), but the comments
 *    read was already on the wire in the same window — this file pins the counts, not which component sent the first
 *    one.
 * 6. A `404` on the Files read leaves no section at all (`state === 'unavailable'`, `:142`): not an error message,
 *    not an empty drop target — the element is gone (count 0).
 * 7. The Timesheet section reads nothing while closed, and with this lane's `ADMIN` role it prints
 *    `pages.taskDetails.NO_ACTIVITY` even when the lane has time logs to give, because the read is not enabled for
 *    that role (`use-task-activity.ts:24-31`). Test 12 arms `roleName: 'MANAGER'` to see the rows at all.
 * 8. A timesheet entry prints its duration as the raw number it was served with (`user-task-activity.tsx:38`
 *    `<span className="… tabular-nums …">{timesheet.duration}</span>`, measured `5400` and `1200`) — no `1h 30m`
 *    formatting on this page.
 * 9. Comment reactions: served rows with `👍` printed nothing and `/api/reaction/comments` was never requested
 *    (`comments-trash-flags.ts:12-16`; `probe-taskdetail-4.log`, `probe-taskdetail-9.log`).
 * 10. The band's Back is a history back, not "go to the task list" (`useGoBack`): arriving from the list through the
 *     drawer and pressing Back lands on `/team/tasks` (`probe-taskdetail-10.log`); after two pager moves it lands on
 *     the task page opened before (`probe-taskdetail-9.log`, where that is what the probe's own assertion tripped on).
 * 11. `max-sm:hidden` on the band's pager (`task-detail-page-band.tsx:129`) cuts off between 600 and 570 px **on this
 *     build** (measured at 660/640/620/600 offered, 570/560/540/500 not, `probe-taskdetail-13.log`), while the buttons
 *     stay in the DOM (2 `div.h-11 button[aria-label*="task ("]` at every width) and only leave the accessibility
 *     tree. `Copy issue link` (`:139-142`) follows the same cut. Not a claim about Tailwind's arithmetic — a measured
 *     width.
 * 12. Tracking off is reached from *either* switch (`canMemberTrackTime`), and a team read that does not carry the
 *     employee's switch keeps the timer (`probe-taskdetail-11.log`). With a timer running, the header shows a running
 *     clock instead of the `timer.TRACKING_OFF` notice even with the team switch off
 *     (`probe-taskdetail-14.log`), which is what the store's own comment describes
 *     (`active-timer.ts:22-24` "A running timer keeps it true"); this file does not test it, because arming
 *     `timerRunning` changes shared lane state.
 * 13. The activity's changed-field row prints `field → value` with the value capitalised by the row's own CSS
 *     (`status → Open`, `priority → High`, measured `innerText`), while the Properties row prints the same served status
 *     as `open` (`textContent`, `probe-taskdetail-9.log`). Same served value, two renderings — test 5 pins what the
 *     reader actually sees.
 * 14. The shell header carries a `Start timer` of its own beside the band's, so a page-wide `Start timer` locator is
 *     ambiguous (2 matches). The band's controls are asserted inside the band (`div.h-11`).
 *
 * ## What this file does not cover
 *
 * - Any write: the composer (post/reply/attach), the pickers (status, priority, size, labels, assignees, parent,
 *   visibility, dates), the child/related add and remove affordances, favorite, timer start/stop. They are reachable
 *   in the browser but change state this lane shares; the property *values* are pinned as read.
 * - Comment reactions: not reachable with this lane as it is started (`NEXT_PUBLIC_COMMENT_REACTIONS_ENABLED` is not
 *   set, `comments-trash-flags.ts:12-16`) — measured as "nothing printed, no read", and that is all it can measure.
 * - The **drawer** as a surface (its own pager, its `Open full page`, its tabs): only the two clicks the band's pager
 *   needs are used, and the drawer's own controls are not pinned. `suites/lane-c/task-*` files that drive the drawer
 *   own that.
 * - The Timesheets page (`/timesheets`) and every other page the crumbs lead to: this file pins only *where a link
 *   goes and that the target task page loaded*.
 * - The file download itself: a Files row is a button, never a link (measured `href` count 0), and this file never
 *   clicks it, so no bytes are pulled.
 * - A 406 produced by the mock: it cannot produce one for a task id (it answers its fixture task for any id), so
 *   test 9c arms it. `suites/lane-c/gauzy-refusals-relayed.spec.ts` owns what the mock itself refuses.
 * - The exact set of reads a load causes: this file asserts that the reads it is about are present with the query it
 *   expects, and **reports** the whole sorted list, because the shell's own reads (changelog, notifications,
 *   presence, statistics) are not this page's contract.
 *
 * ## Secrets
 *
 * Nothing here is a secret: every id in this file is a synthetic `aaaaaaaa-…` value or one of the lane fixture's ids,
 * and no header, cookie or token value is read or printed — only path lists and counts.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** `locales/en.json`, read by key: never a typed copy of the product's words. */
type Messages = {
	common: { [key: string]: string } & { timesheets: { [key: string]: string } };
	pages: {
		taskDetails: { [key: string]: string };
		error: { [key: string]: string };
		unauthorized: { [key: string]: string };
	};
	entityFiles: { [key: string]: string };
	richEditor: { [key: string]: string };
	taskDetail: {
		sections: { [key: string]: string };
		header: { [key: string]: string };
		activity: { [key: string]: string };
		properties: { [key: string]: string };
	};
	taskDrawer: { [key: string]: string };
	timer: { [key: string]: string };
	hotkeys: { [key: string]: string };
};

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as Messages;
const C = EN.common;
const TD = EN.taskDetail;
const PAGE = EN.pages.taskDetails;

const fill = (template: string, values: Record<string, string | number>) =>
	Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), template);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-c task-detail] MEASURE ${label} ${JSON.stringify(value)}`);

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** The mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`) restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * Synthetic ids. Every tail is hex: `uuIdSchema` (`core/types/schemas/common/base.schema.ts:8`) is a strict uuid and a
 * tail holding a non-hex letter (an `l`, a `p`, an `m`) is refused by the task schema, after which the page shows its
 * failure panel instead of the task (found in `probe-taskdetail-2.log` / `-3.log`).
 */
const uuid = (tail: string) => {
	if (!/^[0-9a-f]{12}$/.test(tail)) {
		throw new Error(`a synthetic id tail must be 12 hex digits, got ${tail}`);
	}
	return `aaaaaaaa-aaaa-4aaa-8aaa-${tail}`;
};

/** Dates relative to now; nothing here pins today's date. */
const day = (offset: number, at = 'T09:00:00.000Z') => {
	const date = new Date();
	date.setDate(date.getDate() + offset);
	return `${date.toISOString().slice(0, 10)}${at}`;
};

const CHILD_ID = uuid('000000000ac1');
const CHILD2_ID = uuid('000000000ac2');
const CHILD_FILE_ID = uuid('000000000ac3');
const CHILD_DOC_ID = uuid('000000000ac4');
const NOTE_FILE_ID = uuid('000000000ac5');
const NOTE_DOC_ID = uuid('000000000ac6');
const RELATED_LINK_ID = uuid('000000000ae1');
const RELATED2_LINK_ID = uuid('000000000ae2');
const RELATED_ID = uuid('000000000ad1');
const RELATED2_ID = uuid('000000000ad2');
const PARENT_ID = uuid('000000000af1');
const EPIC_ID = uuid('000000000ab1');
const SECOND_TASK_ID = uuid('000000000aa2');
const LABEL_ID = uuid('000000000b01');
const PRIORITY_ID = uuid('000000000b02');
const SIZE_ID = uuid('000000000b03');
const VERSION_ID = uuid('000000000b04');
const COMMENT_ID = uuid('000000000a21');
const REPLY_ID = uuid('000000000a22');
const ACTIVITY_ID = uuid('000000000a11');
const ACTIVITY2_ID = uuid('000000000a12');
const TIME_LOG_ID = uuid('000000000a31');
const TIME_LOG2_ID = uuid('000000000a32');
const UNKNOWN_TASK_ID = uuid('000000000aff');
/** Not a uuid at all (`task.service.ts` asks for it verbatim), which is what the 406 case is about. */
const NON_UUID_ID = 'not-a-uuid';

const TASK_TITLE = 'Probe task title';
const TASK_NUMBER = 42;
const SECOND_TITLE = 'Probe second team task';
const SECOND_NUMBER = 44;
const CHILD_TITLE = 'Probe finished child';
const CHILD_NUMBER = 41;
const CHILD2_TITLE = 'Probe running child';
const CHILD2_NUMBER = 43;
const RELATED_TITLE = 'Probe blocking issue';
const RELATED_NUMBER = 51;
const RELATED2_TITLE = 'Probe related issue';
const RELATED2_NUMBER = 52;
const PARENT_TITLE = 'Probe parent task';
const PARENT_NUMBER = 31;
const EPIC_TITLE = 'Probe root epic';
const EPIC_NUMBER = 7;
const PRIORITY_NAME = 'Probe priority high';
const SIZE_NAME = 'Probe size medium';
const VERSION_NAME = 'Probe version 1.0';
const LABEL_NAME = 'Probe label';
const FILE_NAME = 'probe-spec.pdf';
const NOTE_NAME = 'probe-notes.md';

const RICH_DESCRIPTION = [
	'<h3>Probe heading</h3>',
	'<p>First paragraph with <strong>bold words</strong>.</p>',
	'<ul><li>First list item</li><li>Second list item</li></ul>',
	'<p>Read <a href="https://probe.example.test/doc">the probe document</a>.</p>',
	'<pre><code>const probe = 1;</code></pre>'
].join('');

/** A description long enough to push the sections below the first viewport (`task-detail-page-body.tsx`). */
const TALL_DESCRIPTION = `<h3>Probe heading</h3>${'<p>Probe paragraph that fills the page so the sections below it are far from the first viewport.</p>'.repeat(24)}`;

type ServedCall = { method: string; path: string; search: string };

/** The team's own status records, exactly as the mock answers them (`mock-gauzy-server.mjs:157-181`). */
const statusesOf = (ids: Record<string, string>) => [
	{
		id: ids.todoStatus,
		name: 'open',
		value: 'open',
		color: '#94a3b8',
		order: 1,
		isSystem: true,
		isDefault: true,
		isTodo: true,
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		organizationTeamId: ids.teamA
	},
	{
		id: ids.inProgressStatus,
		name: 'in-progress',
		value: 'in-progress',
		color: '#6366f1',
		order: 2,
		isSystem: true,
		isInProgress: true,
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		organizationTeamId: ids.teamA
	}
];

const employeeOf = (ids: Record<string, string>, id: string, userId: string, name: string, email: string) => ({
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

/** A child / related / parent task shaped like the lane's fixture task. */
const probeTask = (
	id: string,
	ids: Record<string, string>,
	status: 'open' | 'in-progress' | 'completed',
	title: string,
	number: number,
	extra: Record<string, unknown> = {}
) => ({
	id,
	title,
	number,
	public: false,
	status,
	taskStatusId: status === 'in-progress' ? ids.inProgressStatus : ids.todoStatus,
	taskStatus: statusesOf(ids)[status === 'in-progress' ? 1 : 0],
	estimate: 1800,
	description: 'probe relative description',
	organizationId: ids.organizationA,
	tenantId: ids.tenantA,
	members: [employeeOf(ids, ids.employee, ids.user, 'Fixture Manager', 'manager@example.test')],
	tags: [],
	teams: [{ id: ids.teamA, name: 'Fixture Team A', organizationId: ids.organizationA, tenantId: ids.tenantA }],
	...extra
});

/**
 * The team as the mock answers it (`mock-gauzy-server.mjs:199-252`), with the signed-in member's tracking switches
 * changed — the mock hard-codes `isTrackingEnabled: true` on both the member and its employee (`:206`, `:144`), and a
 * `scenario` cannot reach either (`core/lib/helpers/team-member-tracking.ts:11-15` reads both).
 */
const teamAnswerOf = (
	ids: Record<string, string>,
	task: Record<string, unknown>,
	script: { teamTrackingOff?: boolean; employeeTrackingOff?: boolean; employeeSwitchMissing?: boolean }
) => {
	const self = employeeOf(ids, ids.employee, ids.user, 'Fixture Manager', 'manager@example.test');
	const teammate = employeeOf(
		ids,
		ids.teammateEmployee,
		ids.teammateUser,
		'Fixture Teammate',
		'teammate@example.test'
	);
	const employeeOfMember = (employee: Record<string, unknown>) => {
		if (script.employeeTrackingOff) return { ...employee, isTrackingEnabled: false };
		if (script.employeeSwitchMissing) {
			const { isTrackingEnabled, ...rest } = employee;
			void isTrackingEnabled;
			return rest;
		}
		return employee;
	};
	const member = (id: string, employee: Record<string, unknown>, isManager: boolean) => ({
		id,
		employeeId: employee.id as string,
		employee: employeeOfMember(employee),
		user: employee.user,
		isManager,
		isActive: true,
		isTrackingEnabled: !script.teamTrackingOff,
		activeTaskId: employee.id === ids.employee ? (task.id as string) : null,
		activeTask: employee.id === ids.employee ? task : null,
		organizationTeamId: ids.teamA,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		totalWorkedTasks: [],
		totalTodayTasks: []
	});
	const members = [member(ids.member, self, true), member(ids.teammateMember, teammate, false)];
	return [
		{
			id: ids.teamA,
			name: 'Fixture Team A',
			organizationId: ids.organizationA,
			tenantId: ids.tenantA,
			public: true,
			profile_link: 'fixture-team',
			prefix: 'FIA',
			shareProfileView: false,
			requirePlanToTrack: false,
			members,
			managers: members.filter((entry) => entry.isManager),
			projects: [
				{
					id: ids.project,
					name: 'Fixture Project',
					public: true,
					owner: null,
					code: 'FIX',
					currency: 'USD',
					organizationId: ids.organizationA,
					tenantId: ids.tenantA,
					members: [self],
					teams: [],
					tags: []
				}
			],
			tasks: [task],
			statuses: statusesOf(ids)
		}
	];
};

type ServedScript = {
	/** Merged over the base task last, so `description: null` survives (`page.tsx` / `task.schema.ts:56-58`). */
	task?: Record<string, unknown>;
	children?: Array<Record<string, unknown>>;
	linkedIssues?: Array<Record<string, unknown>>;
	parent?: Record<string, unknown> | null;
	rootEpic?: Record<string, unknown> | null;
	/** Extra tasks the team's list answers, which is what the band's pager walks. */
	teamTasks?: Array<Record<string, unknown>>;
	files?: Array<Record<string, unknown>>;
	/** Arm `GET /api/plugins/docs/links` with this status instead of answering the store. */
	filesRefusal?: number;
	activities?: Array<Record<string, unknown>>;
	comments?: Array<Record<string, unknown>>;
	reactions?: Array<Record<string, unknown>>;
	timeLogs?: Array<Record<string, unknown>>;
	/** Answer `GET /api/task-metadata/bootstrap` with these sections instead of the mock's empty ones. */
	metadata?: Record<string, { items: unknown[]; total: number }>;
	/** `GET /api/organization-team[/<id>]` answered from `teamAnswerOf` (the tracking-switch cases). */
	servesTeam?: boolean;
	teamTrackingOff?: boolean;
	employeeTrackingOff?: boolean;
	employeeSwitchMissing?: boolean;
	/** Arm a path this file answers, keyed by path (`{ '/api/tasks/<id>': 404 }`). */
	refusals?: Record<string, number>;
	/** Leave `/api/tasks/**` to the mock (test 9a measures the mock's own answer). */
	passthroughTaskRead?: boolean;
};

/**
 * This file's stand-in for the task API, on the mock origin. Every answer is the current store, so a test that arms a
 * refusal and one that reads the same path again see the difference, and `calls` is what an "did it read again"
 * assertion counts.
 */
async function serveTaskDetail(page: Page, ids: Record<string, string>, script: ServedScript) {
	const self = employeeOf(ids, ids.employee, ids.user, 'Fixture Manager', 'manager@example.test');
	const teammate = employeeOf(
		ids,
		ids.teammateEmployee,
		ids.teammateUser,
		'Fixture Teammate',
		'teammate@example.test'
	);
	const baseTask: Record<string, unknown> = {
		id: ids.task,
		title: TASK_TITLE,
		number: TASK_NUMBER,
		prefix: 'FIA',
		public: false,
		status: 'open',
		taskStatusId: ids.todoStatus,
		taskStatus: statusesOf(ids)[0],
		priority: 'high',
		size: 'medium',
		issueType: 'Task',
		version: VERSION_NAME,
		estimate: 3600,
		totalWorkedTime: 5400,
		description: 'Synthetic browser fixture task',
		startDate: day(-2),
		dueDate: day(5),
		createdAt: day(-9),
		updatedAt: day(-1),
		createdByUserId: ids.teammateUser,
		createdByUser: { id: ids.teammateUser, name: 'Fixture Teammate', firstName: 'Fixture', lastName: 'Teammate' },
		organizationId: ids.organizationA,
		tenantId: ids.tenantA,
		projectId: ids.project,
		project: { id: ids.project, name: 'Fixture Project' },
		members: [self, teammate],
		tags: [
			{
				id: LABEL_ID,
				name: LABEL_NAME,
				color: '#123456',
				organizationId: ids.organizationA,
				tenantId: ids.tenantA
			}
		],
		teams: [{ id: ids.teamA, name: 'Fixture Team A', organizationId: ids.organizationA, tenantId: ids.tenantA }],
		children: script.children ?? [],
		linkedIssues: script.linkedIssues ?? [],
		parent: script.parent ?? null,
		rootEpic: script.rootEpic ?? null,
		...(script.task ?? {})
	};

	const store = {
		task: { ...baseTask },
		files: [...(script.files ?? [])],
		activities: [...(script.activities ?? [])],
		comments: [...(script.comments ?? [])],
		reactions: [...(script.reactions ?? [])],
		timeLogs: [...(script.timeLogs ?? [])],
		teamTasks: [...(script.teamTasks ?? [])]
	};

	/** Every task this file can answer a single read for, so a relative's own page loads. */
	const taskPool = () => [
		store.task,
		...store.teamTasks,
		...(Array.isArray(store.task.children) ? (store.task.children as Record<string, unknown>[]) : []),
		...(Array.isArray(store.task.linkedIssues)
			? (store.task.linkedIssues as Record<string, unknown>[]).flatMap(
					(issue) => [issue.taskFrom, issue.taskTo].filter(Boolean) as Record<string, unknown>[]
				)
			: []),
		...([store.task.parent, store.task.rootEpic].filter(Boolean) as Record<string, unknown>[])
	];

	const servedPaths = new Set([
		'/api/organization-team',
		`/api/organization-team/${ids.teamA}`,
		'/api/tasks/team',
		'/api/tasks',
		'/api/plugins/docs/links',
		'/api/activity-log',
		'/api/comment',
		'/api/reaction/comments',
		'/api/timesheet/activity',
		'/api/task-metadata/bootstrap'
	]);
	const matcher = (url: URL) =>
		url.origin === MOCK_API_ORIGIN &&
		(servedPaths.has(url.pathname) || (!script.passthroughTaskRead && url.pathname.startsWith('/api/tasks/')));

	const calls: ServedCall[] = [];

	await page.route(matcher, async (route) => {
		const request = route.request();
		const method = request.method();
		const path = new URL(request.url()).pathname;
		if (method === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		calls.push({ method, path, search: new URL(request.url()).search });
		const answer = (status: number, body?: unknown) =>
			route.fulfill({
				status,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: body === undefined ? '' : JSON.stringify(body)
			});
		const armed = script.refusals?.[path];
		if (armed) {
			return answer(armed, { statusCode: armed, message: 'this spec armed the refusal' });
		}

		if (path === '/api/organization-team' && method === 'GET') {
			if (!script.servesTeam) return route.fallback();
			const items = teamAnswerOf(ids, store.task, script).map((team) => ({ ...team, statuses: undefined }));
			return answer(200, { items, total: items.length });
		}
		if (path === `/api/organization-team/${ids.teamA}` && method === 'GET') {
			if (!script.servesTeam) return route.fallback();
			return answer(200, teamAnswerOf(ids, store.task, script)[0]);
		}
		if ((path === '/api/tasks/team' || path === '/api/tasks') && method === 'GET') {
			const items = [store.task, ...store.teamTasks];
			return answer(200, { items, total: items.length });
		}
		if (path === '/api/task-metadata/bootstrap' && method === 'GET') {
			const sections = script.metadata ?? {};
			return answer(200, {
				taskStatuses: sections.taskStatuses ?? { items: statusesOf(ids), total: 2 },
				taskPriorities: sections.taskPriorities ?? { items: [], total: 0 },
				taskSizes: sections.taskSizes ?? { items: [], total: 0 },
				taskLabels: sections.taskLabels ?? { items: [], total: 0 },
				taskVersions: sections.taskVersions ?? { items: [], total: 0 },
				issueTypes: sections.issueTypes ?? { items: [], total: 0 },
				relatedIssueTypes: sections.relatedIssueTypes ?? { items: [], total: 0 }
			});
		}
		if (path.startsWith('/api/tasks/') && method === 'GET') {
			const wanted = path.slice('/api/tasks/'.length);
			const found = taskPool().find((task) => task.id === wanted);
			if (!found) return answer(404, { statusCode: 404, message: 'this spec has no such task' });
			return answer(200, found);
		}
		if (path === '/api/plugins/docs/links' && method === 'GET') {
			if (script.filesRefusal)
				return answer(script.filesRefusal, { statusCode: script.filesRefusal, message: 'armed refusal' });
			return answer(200, { items: store.files, total: store.files.length });
		}
		if (path === '/api/activity-log')
			return answer(200, { items: store.activities, total: store.activities.length });
		if (path === '/api/comment') return answer(200, { items: store.comments, total: store.comments.length });
		if (path === '/api/reaction/comments') return answer(200, store.reactions);
		if (path === '/api/timesheet/activity') return answer(200, store.timeLogs);
		return answer(599, { message: `this spec has no answer for ${method} ${path}` });
	});

	const countOf = (path: string) => calls.filter((call) => call.path === path).length;
	const pathsOf = () => [...new Set(calls.map((call) => call.path))].sort();
	return { calls, countOf, pathsOf, store };
}

/** Sign in, then load a route on a page whose routes are already in place. */
async function signInAndLoad(page: Page, fixture: BootstrapFixture, path: string) {
	await signInWithFixture(page.context(), fixture, 'A');
	await stubNextAuthSession(page);
	return page.goto(`${APP_ORIGIN}${path}`, { waitUntil: 'domcontentloaded' });
}

const taskPage = (id: string) => `/task/${id}`;

/**
 * React's dev-mode store warning (`security-two-factor-ui.spec.ts:226-233`), the dev-mode mutation line
 * (`mutation-error-toaster.tsx:43-45`), and the client's own HTTP error line for a refusal this file armed
 * (`api.service.ts` `logError`) — the last two are excused only where a test armed the refusal.
 */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
const DEV_MUTATION_NOISE = 'Mutation failed:';

const consoleFindings = (shield: Shield, expected: Array<string | RegExp> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter(
			(line) =>
				!expected.some((finding) => (finding instanceof RegExp ? finding.test(line) : line.includes(finding)))
		);

/**
 * The client's own line for a refusal this file armed (`core/services/client/api/api.service.ts` `logError`):
 * `[ERROR] [HttpClient] HTTP Error: GET /tasks/<id>?<query> 500`. It names the path **and** the armed status, and it is
 * excused only in the test that armed that path to that status.
 */
const armedHttpError = (path: string, status: number) =>
	new RegExp(
		`\\[HttpClient\\] HTTP Error: GET ${path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?\\b${status}\\b`
	);

/** The page's own catch of the read it armed (`page.tsx` `retry`'s source): `Error fetching task by ID: ApiError: …`. */
const armedFetchError = 'Error fetching task by ID:';

/**
 * `"{count, plural, one {updated # property} other {updated # properties}}"` → the `other` branch with `#` filled, so a
 * count these tests serve is asserted in the product's own words instead of a typed copy.
 */
const pluralOther = (template: string, count: number) => {
	const other = /other \{([^}]*)\}/.exec(template)?.[1];
	if (!other) {
		throw new Error(`this file cannot read an "other" plural form out of ${template}`);
	}
	return other.replace('#', String(count));
};

/** A property row is `label` in one span and the value in the `div` beside it (`task-property-row.tsx`). */
const propertyRows = (page: Page) =>
	page.evaluate(() =>
		[...document.querySelectorAll('div.grid > span > span')].map((span) => {
			const row = span.parentElement?.parentElement;
			const label = (span.textContent || '').trim();
			const value = (row?.querySelectorAll('div')[0]?.textContent || '').replace(/\s+/g, ' ').trim();
			return `${label} => ${value}`;
		})
	);

/**
 * The section a section title belongs to — the nearest one, the way `task-detail-section.tsx` nests it (an
 * `ancestor::section[1]`, not the outer section that also happens to contain the title).
 */
const sectionByHeading = (page: Page, heading: string): Locator =>
	page.getByRole('heading', { level: 2, name: heading, exact: true }).first().locator('xpath=ancestor::section[1]');

const textOf = (page: Page, selector: string) =>
	page
		.locator(selector)
		.allInnerTexts()
		.then((all) => all.map(flat));

/** The `GET /api/tasks/<id>` query `task.service.ts` `getTaskById` builds when the API URL is set (this lane). */
const expectedTaskReadQuery = (ids: Record<string, string>) =>
	[
		`where[organizationId]=${ids.organizationA}`,
		`where[tenantId]=${ids.tenantA}`,
		'join[alias]=task',
		'join[leftJoinAndSelect][members]=task.members',
		'join[leftJoinAndSelect][user]=members.user',
		'join[leftJoinAndSelect][estimations]=task.estimations',
		'relations[0]=tags',
		'relations[1]=teams',
		'relations[2]=members',
		'relations[3]=members.user',
		'relations[4]=createdByUser',
		'relations[5]=linkedIssues',
		'relations[6]=linkedIssues.taskTo',
		'relations[7]=linkedIssues.taskFrom',
		'relations[8]=parent',
		'relations[9]=children',
		'relations[10]=estimations',
		'relations[11]=project',
		'includeRootEpic=true'
	].sort();

const queryPairs = (search: string) =>
	[...new URLSearchParams(search).entries()].map(([key, value]) => `${key}=${value}`).sort();

/** The metadata the lane's mock answers empty (`mock-gauzy-server.mjs:336-343`), served here instead. */
const metadataServed = (ids: Record<string, string>) => ({
	taskStatuses: { items: statusesOf(ids), total: 2 },
	taskPriorities: {
		items: [
			{
				id: PRIORITY_ID,
				name: PRIORITY_NAME,
				value: 'high',
				tenantId: ids.tenantA,
				organizationId: ids.organizationA
			}
		],
		total: 1
	},
	taskSizes: {
		items: [
			{ id: SIZE_ID, name: SIZE_NAME, value: 'medium', tenantId: ids.tenantA, organizationId: ids.organizationA }
		],
		total: 1
	},
	taskVersions: {
		items: [
			{
				id: VERSION_ID,
				name: VERSION_NAME,
				value: VERSION_NAME,
				tenantId: ids.tenantA,
				organizationId: ids.organizationA
			}
		],
		total: 1
	},
	taskLabels: {
		items: [
			{
				id: LABEL_ID,
				name: LABEL_NAME,
				color: '#123456',
				tenantId: ids.tenantA,
				organizationId: ids.organizationA
			}
		],
		total: 1
	}
});

const relativesOf = (ids: Record<string, string>) => ({
	children: [
		probeTask(CHILD_ID, ids, 'completed', CHILD_TITLE, CHILD_NUMBER),
		probeTask(CHILD2_ID, ids, 'in-progress', CHILD2_TITLE, CHILD2_NUMBER)
	],
	linkedIssues: [
		{
			id: RELATED_LINK_ID,
			organizationId: ids.organizationA,
			tenantId: ids.tenantA,
			taskToId: ids.task,
			taskFromId: RELATED_ID,
			action: 1,
			taskFrom: probeTask(RELATED_ID, ids, 'open', RELATED_TITLE, RELATED_NUMBER),
			taskTo: probeTask(ids.task, ids, 'open', TASK_TITLE, TASK_NUMBER)
		},
		{
			id: RELATED2_LINK_ID,
			organizationId: ids.organizationA,
			tenantId: ids.tenantA,
			taskToId: ids.task,
			taskFromId: RELATED2_ID,
			action: 7,
			taskFrom: probeTask(RELATED2_ID, ids, 'completed', RELATED2_TITLE, RELATED2_NUMBER),
			taskTo: probeTask(ids.task, ids, 'open', TASK_TITLE, TASK_NUMBER)
		}
	],
	parent: probeTask(PARENT_ID, ids, 'open', PARENT_TITLE, PARENT_NUMBER),
	rootEpic: probeTask(EPIC_ID, ids, 'open', EPIC_TITLE, EPIC_NUMBER, { issueType: 'Epic' })
});

const filesServed = (ids: Record<string, string>) => [
	{
		id: CHILD_FILE_ID,
		documentId: CHILD_DOC_ID,
		entity: 'Task',
		entityId: ids.task,
		createdAt: day(-3),
		document: {
			id: CHILD_DOC_ID,
			name: FILE_NAME,
			originalFilename: FILE_NAME,
			mimeType: 'application/pdf',
			fileSize: 262144,
			kind: 'FILE',
			createdAt: day(-3)
		}
	},
	{
		id: NOTE_FILE_ID,
		documentId: NOTE_DOC_ID,
		entity: 'Task',
		entityId: ids.task,
		createdAt: day(-1),
		document: {
			id: NOTE_DOC_ID,
			name: NOTE_NAME,
			originalFilename: NOTE_NAME,
			mimeType: 'text/markdown',
			fileSize: 1024,
			kind: 'FILE',
			createdAt: day(-1)
		}
	}
];

const commentsServed = (ids: Record<string, string>) => [
	{
		id: COMMENT_ID,
		comment: 'Probe first comment body',
		entity: 'Task',
		entityId: ids.task,
		createdAt: day(-2, 'T11:20:00.000Z'),
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		employeeId: ids.employee,
		employee: { id: ids.employee, fullName: 'Fixture Manager', user: { id: ids.user, name: 'Fixture Manager' } },
		createdByUserId: ids.user,
		parentId: null,
		resolved: false
	},
	{
		id: REPLY_ID,
		comment: 'Probe reply body',
		entity: 'Task',
		entityId: ids.task,
		createdAt: day(-2, 'T12:40:00.000Z'),
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		employeeId: ids.teammateEmployee,
		employee: {
			id: ids.teammateEmployee,
			fullName: 'Fixture Teammate',
			user: { id: ids.teammateUser, name: 'Fixture Teammate' }
		},
		createdByUserId: ids.teammateUser,
		parentId: COMMENT_ID,
		resolved: false
	}
];

const activitiesServed = (ids: Record<string, string>) => [
	{
		id: ACTIVITY_ID,
		entity: 'Task',
		entityId: ids.task,
		action: 'updated',
		createdAt: day(-1, 'T10:15:00.000Z'),
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		employeeId: ids.teammateEmployee,
		employee: {
			id: ids.teammateEmployee,
			fullName: 'Fixture Teammate',
			user: { id: ids.teammateUser, name: 'Fixture Teammate' }
		},
		updatedFields: ['status', 'priority'],
		previousValues: [{ status: 'backlog' }, { priority: 'low' }],
		updatedValues: [{ status: 'open' }, { priority: 'high' }]
	},
	{
		id: ACTIVITY2_ID,
		entity: 'Task',
		entityId: ids.task,
		action: 'created',
		createdAt: day(-9, 'T08:05:00.000Z'),
		tenantId: ids.tenantA,
		organizationId: ids.organizationA,
		employeeId: ids.employee,
		employee: { id: ids.employee, fullName: 'Fixture Manager', user: { id: ids.user, name: 'Fixture Manager' } },
		updatedFields: [],
		previousValues: [],
		updatedValues: []
	}
];

/** A reaction this file serves and the page cannot show (`comments-trash-flags.ts:12-16`). */
const reactionsServed = (ids: Record<string, string>) => [
	{
		entity: 'Comment',
		entityId: COMMENT_ID,
		emoji: '👍',
		count: 2,
		reactedByMe: false,
		reactionId: null,
		reactors: [{ employeeId: ids.teammateEmployee, name: 'Fixture Teammate', imageUrl: null }]
	}
];

const timeLogsServed = (ids: Record<string, string>) => [
	{
		id: TIME_LOG_ID,
		title: 'Probe work session',
		description: null,
		date: day(-1, 'T00:00:00.000Z').slice(0, 10),
		time: '09:00',
		duration: 5400,
		type: 'TRACKED',
		source: 'TEAMS',
		employeeId: ids.employee,
		employee: { id: ids.employee, fullName: 'Fixture Manager', user: { id: ids.user, name: 'Fixture Manager' } },
		taskId: ids.task,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA
	},
	{
		id: TIME_LOG2_ID,
		title: 'Probe second session',
		description: null,
		date: day(-1, 'T00:00:00.000Z').slice(0, 10),
		time: '10:00',
		duration: 1200,
		type: 'MANUAL',
		source: 'TEAMS',
		employeeId: ids.teammateEmployee,
		employee: {
			id: ids.teammateEmployee,
			fullName: 'Fixture Teammate',
			user: { id: ids.teammateUser, name: 'Fixture Teammate' }
		},
		taskId: ids.task,
		organizationId: ids.organizationA,
		tenantId: ids.tenantA
	}
];

// --------------------------------------------------------------------------- 1. the task as printed

test('1 · a fully served task: the band, the title, the byline, every property, and the read that brought it', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });
	const served = await serveTaskDetail(page, ids, {
		...relativesOf(ids),
		task: { parentId: PARENT_ID, description: RICH_DESCRIPTION, createdAt: day(-9), updatedAt: day(-1) },
		files: filesServed(ids),
		comments: commentsServed(ids),
		activities: activitiesServed(ids),
		reactions: reactionsServed(ids),
		timeLogs: timeLogsServed(ids),
		metadata: metadataServed(ids)
	});
	const response = await signInAndLoad(page, fixture, taskPage(ids.task));

	expect(response?.status(), 'the task page itself answers 200').toBe(200);
	await expect(page.locator('h1')).toHaveText(TASK_TITLE);

	// the band: the number, the crumbs the task carries (each printed `#<number><title>`, with no space between them),
	// and no pager on a direct visit (use-task-drawer.ts:26-35)
	const band = page.locator('div.h-11').first();
	await expect(band).toContainText(`#${TASK_NUMBER}`);
	await expect(band).toContainText(`#${EPIC_NUMBER}${EPIC_TITLE}`);
	await expect(band).toContainText(`#${PARENT_NUMBER}${PARENT_TITLE}`);
	await expect(
		page.getByRole('button', { name: fill(TD.header.COPY_NUMBER, { number: TASK_NUMBER }), exact: true })
	).toBeVisible();
	// the band's own controls (the shell header carries a `Start timer` of its own, so these are scoped to the band)
	await expect(band.getByRole('button', { name: C.BACK, exact: true })).toBeVisible();
	await expect(band.getByRole('button', { name: EN.hotkeys.START_TIMER, exact: true })).toBeVisible();
	await expect(band.getByRole('button', { name: C.ADD_FAVORITE_TASK, exact: true })).toBeVisible();
	await expect(band.getByRole('button', { name: C.COPY_ISSUE_LINK, exact: true })).toBeVisible();
	await expect(band.getByRole('button', { name: C.MORE_OPTIONS, exact: true })).toBeVisible();
	await expect(
		page.getByRole('button', { name: /task \((?:K|J)\)/ }),
		'a direct visit has no drawer sequence to walk'
	).toHaveCount(0);

	// the header breadcrumb (page.tsx:118-122), inside `main` so the sidebar's team switcher is not mistaken for it
	const shell = page.locator('main');
	await expect(shell.getByRole('link', { name: 'Fixture Team A', exact: true }).first()).toHaveAttribute('href', '/');
	await expect(shell.getByRole('link', { name: C.TASKS, exact: true }).first()).toHaveAttribute(
		'href',
		'/team/tasks'
	);
	await expect(shell.getByRole('link', { name: `#${TASK_NUMBER} ${TASK_TITLE}` }).first()).toHaveAttribute(
		'href',
		taskPage(ids.task)
	);

	// the byline: the creator, and the two served dates carried as machine-readable <time>
	await expect(page.getByText('Fixture Teammate').first()).toBeVisible();
	const created = day(-9);
	const updated = day(-1);
	const times = await page
		.locator('time')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('datetime') ?? ''));
	expect(times, 'the page prints the served created/updatedAt as <time datetime>').toContain(created);
	expect(times, 'the page prints the served created/updatedAt as <time datetime>').toContain(updated);

	// the rail's property rows, with the metadata the lane's mock answers empty served here
	await expect
		.poll(() => propertyRows(page), { timeout: 20_000 })
		.toEqual(
			expect.arrayContaining([
				`${PAGE.STATUS} => ${statusesOf(ids)[0].name}`,
				`${PAGE.PRIORITY} => ${PRIORITY_NAME}`,
				`${PAGE.SIZE} => ${SIZE_NAME}`,
				`${PAGE.VERSION} => ${VERSION_NAME}`,
				`${C.LABELS} => ${LABEL_NAME}`,
				`${TD.properties.VISIBILITY} => ${TD.properties.PRIVATE}`,
				`${TD.properties.PARENT} => #${PARENT_NUMBER}${PARENT_TITLE}`,
				`${PAGE.EPIC} => #${EPIC_NUMBER}${EPIC_TITLE}`
			])
		);

	// the read this page is about, and the reads its sections make on mount
	const taskCall = served.calls.find((call) => call.path === `/api/tasks/${ids.task}`);
	expect(taskCall?.method, 'the task was read').toBe('GET');
	expect(queryPairs(taskCall?.search ?? ''), 'the task read carries the full query this lane sends').toEqual(
		expectedTaskReadQuery(ids)
	);
	await expect
		.poll(served.pathsOf, { timeout: 20_000 })
		.toEqual(
			expect.arrayContaining([
				`/api/tasks/${ids.task}`,
				'/api/task-metadata/bootstrap',
				'/api/organization-team',
				'/api/organization-team/' + ids.teamA,
				'/api/tasks/team',
				'/api/plugins/docs/links',
				'/api/comment'
			])
		);

	report('task-as-printed', {
		documentStatus: response?.status(),
		h1: await page.locator('h1').innerText(),
		band: await band.innerText().then(flat),
		bandButtons: await page
			.locator('div.h-11 button')
			.evaluateAll((nodes) =>
				nodes.map(
					(node) =>
						`${(node.textContent || '').replace(/\s+/g, ' ').trim()} | aria=${node.getAttribute('aria-label') ?? ''}`
				)
			),
		propertyRows: await propertyRows(page),
		timeElements: await page
			.locator('time')
			.evaluateAll((nodes) =>
				nodes.map((node) => `${node.getAttribute('datetime')} => ${(node.textContent || '').trim()}`)
			),
		servedPaths: served.pathsOf(),
		taskReadSearch: queryPairs(taskCall?.search ?? ''),
		consoleErrors: shield.consoleErrors(),
		pageErrors: shield.pageErrors()
	});
	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 2. the description

test('2 · the description: the rich body as rendered, the link the view hardens, and the two empty shapes', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	// editable-rich-text.tsx over rich-text-view.tsx: DOMPurify keeps the structure, hardenNode rewrites every link
	await serveTaskDetail(page, ids, { task: { description: RICH_DESCRIPTION } });
	await signInAndLoad(page, fixture, taskPage(ids.task));

	const description = sectionByHeading(page, C.DESCRIPTION);
	await expect(description).toBeVisible();
	await expect(description.locator('h3')).toHaveText('Probe heading');
	await expect(description.locator('p').filter({ hasText: 'bold words' })).toContainText(
		'First paragraph with bold words.'
	);
	await expect(description.locator('li')).toHaveCount(2);
	await expect(description.locator('pre code')).toHaveText('const probe = 1;');

	const docLink = page.locator('a[href="https://probe.example.test/doc"]');
	await expect(docLink, 'the served link is the only one this file wrote').toHaveCount(1);
	await expect(docLink).toHaveText('the probe document');
	await expect(docLink).toHaveAttribute('target', '_blank');
	await expect(docLink).toHaveAttribute('rel', 'noopener noreferrer nofollow');

	report('description-rich', {
		sectionText: await description.innerText().then(flat),
		linkCount: await docLink.count(),
		target: await docLink.getAttribute('target'),
		rel: await docLink.getAttribute('rel')
	});

	// the two empty shapes the schema allows (`task.schema.ts:56-58`: a description may be absent, null or '')
	for (const shape of [{ description: '' }, { description: null }] as const) {
		await serveTaskDetail(page, ids, { task: shape });
		await signInAndLoad(page, fixture, taskPage(ids.task));
		const emptySection = sectionByHeading(page, C.DESCRIPTION);
		await expect(emptySection, `a description served as ${JSON.stringify(shape)}`).toContainText(
			EN.richEditor.EMPTY_DESCRIPTION
		);
		report(`description-${JSON.stringify(shape)}`, { sectionText: await emptySection.innerText().then(flat) });
	}

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 3. child issues and related issues

test('3 · child issues and related issues: the rows as printed, where their links go, and neither section with nothing in it', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });
	await serveTaskDetail(page, ids, { ...relativesOf(ids) });
	await signInAndLoad(page, fixture, taskPage(ids.task));

	// task-detail-subtasks.tsx:95 over task-issue-row.tsx:103
	const childSection = sectionByHeading(page, C.CHILD_ISSUES);
	await expect(childSection).toContainText(`#${CHILD_NUMBER}${CHILD_TITLE}`);
	await expect(childSection).toContainText(`#${CHILD2_NUMBER}${CHILD2_TITLE}`);
	await expect(childSection.locator('a[href]')).toHaveCount(2);
	await expect(childSection.locator('a').first()).toHaveAttribute('href', taskPage(CHILD_ID));

	// task-detail-relations.tsx:34-46, :187: one group per served relation kind
	const relatedSection = sectionByHeading(page, C.RELATED_ISSUES);
	await expect(relatedSection).toContainText(C.IS_BLOCKED_BY);
	await expect(relatedSection).toContainText(C.RELATES_TO);
	await expect(relatedSection).toContainText(`#${RELATED_NUMBER}${RELATED_TITLE}`);
	await expect(relatedSection).toContainText(`#${RELATED2_NUMBER}${RELATED2_TITLE}`);
	const relatedHrefs = await relatedSection
		.locator('a[href]')
		.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('href')));
	expect(relatedHrefs.sort(), 'a related row links to the task it names').toEqual(
		[taskPage(RELATED2_ID), taskPage(RELATED_ID)].sort()
	);

	// the child row's link is a route: the child's own page loads
	await page
		.getByRole('link', { name: /Probe finished child/ })
		.first()
		.click();
	await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(CHILD_ID));
	await expect(page.locator('h1')).toHaveText(CHILD_TITLE);
	await expect(
		page.getByRole('button', { name: fill(TD.header.COPY_NUMBER, { number: CHILD_NUMBER }), exact: true })
	).toBeVisible();
	report('child-page', { url: page.url(), h1: await page.locator('h1').innerText() });

	// nothing served: the sections stay, each showing only its own add affordance (measured: no empty-state copy)
	await serveTaskDetail(page, ids, { children: [], linkedIssues: [] });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	const emptyChildren = sectionByHeading(page, C.CHILD_ISSUES);
	const emptyRelated = sectionByHeading(page, C.RELATED_ISSUES);
	await expect(emptyChildren).toContainText(EN.taskDrawer.ADD_CHILD_ISSUE);
	await expect(emptyChildren.locator('a[href]'), 'no rows were invented for an empty list').toHaveCount(0);
	await expect(emptyRelated).toContainText(EN.taskDrawer.ADD_RELATED_ISSUE);
	await expect(emptyRelated.locator('a[href]'), 'no rows were invented for an empty list').toHaveCount(0);
	report('empty-relative-sections', {
		children: await emptyChildren.innerText().then(flat),
		related: await emptyRelated.innerText().then(flat)
	});

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 4. the Files section

test('4 · the Files section: each row as printed, that no row is a link, its read before and after the section comes into view, the empty copy, and a refused read', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 400 });
	const filesSelector = `section[aria-label="${EN.entityFiles.TITLE}"]`;

	const served = await serveTaskDetail(page, ids, { files: filesServed(ids) });
	const response = await signInAndLoad(page, fixture, taskPage(ids.task));
	expect(response?.status(), 'the page itself was served').toBe(200);

	const files = page.locator(filesSelector);
	await expect(files, 'the section is named by entityFiles.TITLE as its aria-label').toHaveCount(1);
	await expect(files.getByRole('button', { name: EN.entityFiles.ATTACH, exact: true })).toBeVisible();

	// entity-files-section.tsx:46 — the row is a button carrying title=entityFiles.OPEN; a row is never a link
	const openPdf = files.locator(`button[title="${fill(EN.entityFiles.OPEN, { name: FILE_NAME })}"]`);
	const openNote = files.locator(`button[title="${fill(EN.entityFiles.OPEN, { name: NOTE_NAME })}"]`);
	await expect(openPdf).toContainText(FILE_NAME);
	await expect(openPdf).toContainText('262.1 kB');
	await expect(openNote).toContainText(NOTE_NAME);
	await expect(openNote).toContainText('1 kB');
	await expect(
		files.getByRole('button', { name: fill(EN.entityFiles.REMOVE, { name: FILE_NAME }), exact: true })
	).toBeVisible();
	await expect(
		files.getByRole('button', { name: fill(EN.entityFiles.REMOVE, { name: NOTE_NAME }), exact: true })
	).toBeVisible();
	await expect(files.locator('a[href]'), 'no Files row is a link, so this file pulls no bytes').toHaveCount(0);

	// measured order: the newest served row is printed first
	const openTitles = (
		await files.locator('button[title]').evaluateAll((nodes) => nodes.map((node) => node.getAttribute('title')))
	).filter((title) => title?.startsWith(EN.entityFiles.OPEN.split(' ')[0]));
	expect(openTitles, 'the Files rows print newest first').toEqual([
		fill(EN.entityFiles.OPEN, { name: NOTE_NAME }),
		fill(EN.entityFiles.OPEN, { name: FILE_NAME })
	]);

	// not lazy: the read is on mount, and bringing the section into view changes nothing
	await expect.poll(() => served.countOf('/api/plugins/docs/links'), { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
	const readsBeforeScroll = served.countOf('/api/plugins/docs/links');
	await files.scrollIntoViewIfNeeded();
	// 3 s quiet window, on purpose: it proves the scroll added no second Files read
	await page.waitForTimeout(3_000);
	expect(served.countOf('/api/plugins/docs/links'), 'the scroll added no read').toBe(readsBeforeScroll);

	report('files', {
		sectionText: await files.innerText().then(flat),
		openTitles,
		readsBeforeScroll,
		readsAfterScroll: served.countOf('/api/plugins/docs/links'),
		hrefCount: await files.locator('a[href]').count()
	});

	// nothing served: the drop target stands, with no rows
	await serveTaskDetail(page, ids, { files: [] });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	const emptyFiles = page.locator(filesSelector);
	await expect(emptyFiles).toHaveCount(1);
	await expect(emptyFiles).toContainText(EN.entityFiles.EMPTY);
	await expect(emptyFiles.locator('button[title]'), 'an empty store prints no rows').toHaveCount(0);
	report('files-empty', { sectionText: await emptyFiles.innerText().then(flat) });

	// a refused read: `state === 'unavailable'` renders nothing at all (entity-files-section.tsx:142)
	await serveTaskDetail(page, ids, { files: filesServed(ids), filesRefusal: 404 });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	// 4 s quiet window, on purpose: it proves the 404 leaves the section rendered as nothing, with no retry copy
	await page.waitForTimeout(4_000);
	await expect(page.locator(filesSelector), 'a refused Files read leaves no section, no error copy').toHaveCount(0);
	report('files-refused', { sectionCount: await page.locator(filesSelector).count() });

	expect(
		consoleFindings(shield, [armedHttpError('/plugins/docs/links', 404)]),
		'only the client line naming the armed Files 404 was logged'
	).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 5. the activity feed as printed

test('5 · the activity feed as printed: the tabs, the comment entries, the History entries, and the reactions this lane never shows', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	const served = await serveTaskDetail(page, ids, {
		comments: commentsServed(ids),
		activities: activitiesServed(ids),
		reactions: reactionsServed(ids)
	});
	await signInAndLoad(page, fixture, taskPage(ids.task));

	const activity = sectionByHeading(page, C.ACTIVITY);
	await expect(activity).toBeVisible();

	// the tab group, named by taskDetail.activity.FILTER; each counted tab's accessible name is `label count`
	const tablist = page.getByRole('tablist', { name: TD.activity.FILTER });
	await expect(tablist).toBeVisible();
	await expect(tablist.getByRole('tab', { name: TD.activity.ALL, exact: true })).toBeVisible();
	await expect(tablist.getByRole('tab', { name: `${C.FILTER_COMMENTS} 2`, exact: true })).toBeVisible();
	await expect(tablist.getByRole('tab', { name: `${TD.activity.HISTORY} 2`, exact: true })).toBeVisible();

	const text = await activity.innerText().then(flat);
	// the comments, in the order served, with the reply marked as a reply
	expect(text).toContain('Probe first comment body');
	expect(text).toContain('Probe reply body');
	// the History entry: the actor, the plural copy read from its key, and the field changes as served — the row prints
	// `field → value`, the arrow as its own part and the value capitalised by the row's own CSS (measured innerText)
	expect(text).toContain(`Fixture Teammate ${pluralOther(TD.activity.UPDATED_FIELDS, 2)}`);
	expect(text).toContain('status → Open');
	expect(text).toContain('priority → High');

	// comment reactions are env-gated off on this lane (comments-trash-flags.ts:12-16): the served reaction printed
	// nothing and was never asked for
	expect(text, 'a served reaction printed nothing on this lane').not.toContain('👍');
	expect(served.countOf('/api/reaction/comments'), 'the reaction read never fired').toBe(0);

	report('activity-as-printed', {
		sectionText: text,
		tabs: await page
			.locator('[role="tab"]')
			.allInnerTexts()
			.then((all) => all.map(flat)),
		commentReads: served.countOf('/api/comment'),
		historyReads: served.countOf('/api/activity-log'),
		reactionReads: served.countOf('/api/reaction/comments')
	});

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 6. the lazy History read, and no activity

test('6 · what brings the History read: the comments are on the wire while the History read waits for the section to come near, and with nothing to show the section says so', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 400 });

	const served = await serveTaskDetail(page, ids, {
		task: { description: TALL_DESCRIPTION },
		comments: commentsServed(ids),
		activities: activitiesServed(ids)
	});
	await signInAndLoad(page, fixture, taskPage(ids.task));

	await expect.poll(() => served.countOf('/api/comment'), { timeout: 20_000 }).toBeGreaterThan(0);
	// 3 s quiet window, on purpose: the Activity section sits far below this viewport, and its History read has not fired
	await page.waitForTimeout(3_000);
	const commentsBefore = served.countOf('/api/comment');
	const historyBefore = served.countOf('/api/activity-log');
	report('activity-before-scroll', {
		viewportHeight: 400,
		commentsBefore,
		historyBefore,
		sectionTop: await sectionByHeading(page, C.ACTIVITY).evaluate((node) =>
			Math.round(node.getBoundingClientRect().top)
		)
	});
	expect(historyBefore, 'the History read waited for the section to come near (use-has-come-near.ts)').toBe(0);

	await sectionByHeading(page, C.ACTIVITY).scrollIntoViewIfNeeded();
	await expect.poll(() => served.countOf('/api/activity-log'), { timeout: 20_000 }).toBeGreaterThan(0);
	await expect(page.getByRole('tab', { name: `${TD.activity.HISTORY} 2`, exact: true })).toBeVisible();
	report('activity-after-scroll', {
		historyReads: served.countOf('/api/activity-log'),
		commentReads: served.countOf('/api/comment'),
		sectionText: await sectionByHeading(page, C.ACTIVITY).innerText().then(flat)
	});

	// nothing served: the tabs stay, and the section prints its own empty copy
	await serveTaskDetail(page, ids, { comments: [], activities: [] });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	const emptyActivity = sectionByHeading(page, C.ACTIVITY);
	await emptyActivity.scrollIntoViewIfNeeded();
	await expect.poll(() => served.countOf('/api/comment'), { timeout: 20_000 }).toBeGreaterThan(0);
	await expect(emptyActivity).toContainText(TD.activity.EMPTY);
	report('activity-empty', {
		sectionText: await emptyActivity.innerText().then(flat),
		tabs: await page
			.locator('[role="tab"]')
			.allInnerTexts()
			.then((all) => all.map(flat))
	});

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 7. the band's crumbs and where they lead

test('7 · the band crumbs: the epic and the parent as printed, where each crumb goes, and the parent crumb only when the task has a parent', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });
	const served = await serveTaskDetail(page, ids, { ...relativesOf(ids), task: { parentId: PARENT_ID } });
	await signInAndLoad(page, fixture, taskPage(ids.task));

	// task-detail-page-band.tsx:26-37 — the epic, then the parent, each printed as `#<number><title>`
	const band = page.locator('div.h-11').first();
	await expect(band).toContainText(`#${EPIC_NUMBER}${EPIC_TITLE}`);
	await expect(band).toContainText(`#${PARENT_NUMBER}${PARENT_TITLE}`);
	const crumbLinks = await band
		.locator('a[href]')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) => `${(node.textContent || '').replace(/\s+/g, ' ').trim()} -> ${node.getAttribute('href')}`
			)
		);
	report('band crumbs', { links: crumbLinks });

	// each crumb is a route to that task's own page
	const openCrumb = async (name: RegExp, id: string, title: string, number: number) => {
		const crumb = band.getByRole('link', { name }).first();
		await expect(crumb).toHaveAttribute('href', taskPage(id));
		await crumb.click();
		await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(id));
		await expect(page.locator('h1')).toHaveText(title);
		await expect(
			page.getByRole('button', { name: fill(TD.header.COPY_NUMBER, { number }), exact: true })
		).toBeVisible();
		report(`crumb ${title}`, { url: page.url(), h1: await page.locator('h1').innerText() });
		await signInAndLoad(page, fixture, taskPage(ids.task));
	};
	await openCrumb(new RegExp(EPIC_TITLE), EPIC_ID, EPIC_TITLE, EPIC_NUMBER);
	await openCrumb(new RegExp(PARENT_TITLE), PARENT_ID, PARENT_TITLE, PARENT_NUMBER);

	// no `parentId` served: the parent crumb is not printed (`crumbsOf` needs `parent && task.parentId`)
	await serveTaskDetail(page, ids, { rootEpic: relativesOf(ids).rootEpic });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	const noParentBand = page.locator('div.h-11').first();
	await expect(noParentBand).toContainText(`#${EPIC_NUMBER}${EPIC_TITLE}`);
	await expect(noParentBand, 'no parent was served, so no parent crumb is printed').not.toContainText(PARENT_TITLE);
	report('band crumbs without a parent', { band: await noParentBand.innerText().then(flat) });

	expect(served.countOf(`/api/tasks/${ids.task}`), 'the task was read from this file').toBeGreaterThan(0);
	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 8. the band's pager, its width, and Back

test('8 · the band pager: reached through the task list and the drawer, walked forwards and back, offered down to 600 px and gone at 570 px, and what Back really does', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	const served = await serveTaskDetail(page, ids, {
		teamTasks: [probeTask(SECOND_TASK_ID, ids, 'in-progress', SECOND_TITLE, SECOND_NUMBER)]
	});

	const previous = () => page.getByRole('button', { name: fill(TD.header.PREVIOUS, { key: 'K' }), exact: true });
	const next = () => page.getByRole('button', { name: fill(TD.header.NEXT, { key: 'J' }), exact: true });
	const openFullPage = async () => {
		await page.getByRole('link', { name: TASK_TITLE }).first().click();
		await page.getByRole('link', { name: EN.taskDrawer.OPEN_FULL_PAGE }).click();
		await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(ids.task));
	};

	// a direct visit prints no pager at all: `taskDrawerState.sequence` is only set by a list page
	await page.setViewportSize({ width: 1280, height: 900 });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	await expect(page.locator('h1')).toHaveText(TASK_TITLE);
	await expect(previous()).toHaveCount(0);
	await expect(next()).toHaveCount(0);
	report('pager on a direct visit', { url: page.url(), previous: 0, next: 0 });

	// the way a person reaches it: Teams › Tasks, the row, then the drawer's `Open full page`
	await signInAndLoad(page, fixture, '/team/tasks');
	await openFullPage();
	const band = page.locator('div.h-11').first();
	await expect(band).toContainText(`${TASK_NUMBER}`);
	await expect(band).toContainText('1 / 2');
	await expect(previous()).toBeVisible();
	await expect(previous()).toBeDisabled();
	await expect(next()).toBeEnabled();
	report('pager position 1', { band: await band.innerText().then(flat), url: page.url() });

	// the width cut (`task-detail-page-band.tsx:129-137` `max-sm:hidden`, measured offered at 660…600 and not at 570…500)
	for (const width of [600, 570, 500] as const) {
		await page.setViewportSize({ width, height: 900 });
		const copyLink = page.getByRole('button', { name: C.COPY_ISSUE_LINK, exact: true });
		if (width >= 600) {
			await expect(next(), `the pager at ${width} px`).toBeVisible();
			await expect(previous(), `the pager at ${width} px`).toBeVisible();
			await expect(copyLink, `Copy issue link at ${width} px`).toBeVisible();
		} else {
			await expect(next(), `the pager at ${width} px`).toBeHidden();
			await expect(previous(), `the pager at ${width} px`).toBeHidden();
			await expect(copyLink, `Copy issue link at ${width} px`).toBeHidden();
		}
		report(`pager at ${width} px`, {
			band: await band.innerText().then(flat),
			pagerButtonsInDom: await page.locator('div.h-11 button[aria-label*="task ("]').count()
		});
	}
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(next()).toBeVisible();

	// walk it: Next to the second task, Previous back
	await next().click();
	await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(SECOND_TASK_ID));
	await expect(page.locator('h1')).toHaveText(SECOND_TITLE);
	await expect(
		page.getByRole('button', { name: fill(TD.header.COPY_NUMBER, { number: SECOND_NUMBER }), exact: true })
	).toBeVisible();
	await expect(band).toContainText('2 / 2');
	await expect(next()).toBeDisabled();
	await expect(previous()).toBeEnabled();
	report('pager position 2', {
		band: await band.innerText().then(flat),
		url: page.url(),
		h1: await page.locator('h1').innerText()
	});

	await previous().click();
	await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(ids.task));
	await expect(page.locator('h1')).toHaveText(TASK_TITLE);
	report('pager back to position 1', { url: page.url() });

	// Back is a history back (`useGoBack`), not "go to the list": after two pager moves it lands on the page opened before
	await page.getByRole('button', { name: C.BACK, exact: true }).click();
	await expect.poll(() => page.url(), { timeout: 20_000 }).toContain(taskPage(SECOND_TASK_ID));
	report('back after two pager moves', { url: page.url(), h1: await page.locator('h1').innerText() });

	// arriving straight from the list, the same button lands on the list
	await signInAndLoad(page, fixture, '/team/tasks');
	await openFullPage();
	await page.getByRole('button', { name: C.BACK, exact: true }).click();
	await expect.poll(() => page.url(), { timeout: 20_000 }).toContain('/team/tasks');
	await expect(page.getByRole('link', { name: TASK_TITLE }).first(), 'the list page loaded again').toBeVisible();
	report('back to the list', { url: page.url() });

	expect(served.countOf('/api/tasks/team'), 'the list the pager walks was served here').toBeGreaterThan(0);
	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 9. the task is not there

test('9 · an id that is not this task: the mock as it is (9a), an armed 404 (9b) and an armed 406 for a non-UUID id (9c) all print the not-found panel', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	const notFoundPanel = async (label: string, path: string, script: ServedScript) => {
		const served = await serveTaskDetail(page, ids, script);
		const response = await signInAndLoad(page, fixture, path);
		const status = response?.status();
		await expect(page.getByRole('heading', { level: 2, name: PAGE.TASK_NOT_FOUND, exact: true })).toBeVisible();
		await expect(page.getByText(PAGE.TASK_NOT_FOUND_DESCRIPTION)).toBeVisible();
		const home = page.getByRole('link', { name: PAGE.GO_BACK_HOME, exact: true });
		await expect(home).toHaveCount(1);
		await expect(home).toHaveAttribute('href', '/');
		report(label, {
			documentStatus: status,
			h2: await textOf(page, 'h2'),
			goBackHome: await home.getAttribute('href'),
			reads: served.pathsOf()
		});
	};

	// 9a: no stub at all on /api/tasks/** — the mock answers any id with its own fixture task, and `page.tsx:54` decides
	await notFoundPanel('9a unknown id, the mock as it is', taskPage(UNKNOWN_TASK_ID), { passthroughTaskRead: true });

	// 9b: this file answers 404 for the fixture task's own id
	await notFoundPanel('9b armed 404', taskPage(ids.task), { refusals: { [`/api/tasks/${ids.task}`]: 404 } });

	// 9c: a non-UUID id answered 406, which `use-task-queries.ts:18-23` maps to the same panel
	await notFoundPanel('9c armed 406 for a non-UUID id', taskPage(NON_UUID_ID), {
		refusals: { [`/api/tasks/${NON_UUID_ID}`]: 406 }
	});

	expect(
		consoleFindings(shield, [
			armedHttpError(`/tasks/${ids.task}`, 404),
			armedHttpError(`/tasks/${NON_UUID_ID}`, 406),
			armedFetchError
		]),
		'only the client lines naming the two refusals this file armed were logged'
	).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 10. the read is refused

test('10 · a refused read (500): the failure panel, and Try again reading the task once more', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	const served = await serveTaskDetail(page, ids, { refusals: { [`/api/tasks/${ids.task}`]: 500 } });
	await signInAndLoad(page, fixture, taskPage(ids.task));

	await expect(
		page.getByRole('heading', { level: 2, name: EN.pages.error.HEADING_TITLE, exact: true })
	).toBeVisible();
	await expect(page.getByText(EN.pages.error.HEADING_DESCRIPTION)).toBeVisible();
	const retry = page.getByRole('button', { name: EN.pages.unauthorized.TRY_AGAIN, exact: true });
	await expect(retry).toBeVisible();
	// not-found copy would mean the page read the 500 as "no such task"; it does not
	await expect(page.getByRole('heading', { level: 2, name: PAGE.TASK_NOT_FOUND, exact: true })).toHaveCount(0);
	report('failure panel', {
		h2: await textOf(page, 'h2'),
		readsBeforeRetry: served.countOf(`/api/tasks/${ids.task}`)
	});

	const before = served.countOf(`/api/tasks/${ids.task}`);
	await retry.click();
	await expect.poll(() => served.countOf(`/api/tasks/${ids.task}`), { timeout: 20_000 }).toBeGreaterThan(before);
	await expect(
		page.getByRole('heading', { level: 2, name: EN.pages.error.HEADING_TITLE, exact: true })
	).toBeVisible();
	report('after Try again', {
		readsBefore: before,
		readsAfter: served.countOf(`/api/tasks/${ids.task}`),
		h2: await textOf(page, 'h2')
	});

	expect(
		consoleFindings(shield, [armedHttpError(`/tasks/${ids.task}`, 500), armedFetchError]),
		'only the client lines naming the armed 500 and the page reading it were logged'
	).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 11. tracking off for this member

test('11 · tracking off for this member: either switch taken away prints the tracking-off notice instead of the band timer, and a team read without the employee switch keeps the timer', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	const shapes = [
		{ label: 'team switch off', script: { servesTeam: true, teamTrackingOff: true } },
		{ label: 'employee switch off', script: { servesTeam: true, employeeTrackingOff: true } },
		{ label: 'employee switch absent', script: { servesTeam: true, employeeSwitchMissing: true } }
	] as const;

	for (const shape of shapes) {
		await serveTaskDetail(page, ids, shape.script);
		await signInAndLoad(page, fixture, taskPage(ids.task));
		await expect(page.locator('h1')).toHaveText(TASK_TITLE);

		const band = page.locator('div.h-11').first();
		const timerButton = band.getByRole('button', { name: EN.hotkeys.START_TIMER, exact: true });
		const offNotice = page.getByText(EN.timer.TRACKING_DISABLED_MESSAGE, { exact: true });
		if (shape.label === 'employee switch absent') {
			// `canMemberTrackTime` treats a read that leaves the employee's own switch out as not-off
			await expect(timerButton, 'no employee switch was served, so the timer stays').toBeVisible();
			await expect(offNotice, 'no tracking-off notice').toHaveCount(0);
		} else {
			await expect(timerButton, `${shape.label}: the band offers no timer`).toHaveCount(0);
			await expect(page.getByText(EN.timer.TRACKING_OFF, { exact: true }).first()).toBeVisible();
			await expect(offNotice).toBeVisible();
		}
		report(`tracking ${shape.label}`, {
			bandButtons: await band
				.locator('button')
				.evaluateAll((nodes) =>
					nodes.map(
						(node) =>
							`${(node.textContent || '').replace(/\s+/g, ' ').trim()} | aria=${node.getAttribute('aria-label') ?? ''}`
					)
				),
			band: await band.innerText().then(flat),
			headerText: await page.locator('header').first().innerText().then(flat)
		});
	}

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 12. the Timesheet section (last: it arms a lane role)

test('12 · the Timesheet section: closed it reads nothing, open on this lane as ADMIN it says there is no activity, and only a MANAGER read gets the rows, with each duration printed as the number it was served with', async ({
	page,
	fixture,
	mock,
	shield
}) => {
	const ids = fixture.ids;
	await page.setViewportSize({ width: 1280, height: 900 });

	const served = await serveTaskDetail(page, ids, { timeLogs: timeLogsServed(ids) });
	const section = sectionByHeading(page, EN.common.timesheets.SINGULAR);
	const toggle = () => page.getByRole('button', { name: EN.common.timesheets.SINGULAR, exact: true });

	await signInAndLoad(page, fixture, taskPage(ids.task));
	await expect(section).toBeVisible();
	await expect(toggle()).toHaveAttribute('aria-expanded', 'false');
	await expect.poll(() => served.countOf('/api/timesheet/activity')).toBe(0);
	report('timesheet closed', {
		sectionText: await section.innerText().then(flat),
		ariaExpanded: await toggle().getAttribute('aria-expanded')
	});

	// open it on this lane as it is started (the fixture role is ADMIN): `use-task-activity.ts:24-31` keeps the read off
	await toggle().click();
	await expect(toggle()).toHaveAttribute('aria-expanded', 'true');
	await expect(section).toContainText(PAGE.NO_ACTIVITY);
	// 2 s quiet window, on purpose: opening the section as ADMIN started no read at all
	await page.waitForTimeout(2_000);
	expect(served.countOf('/api/timesheet/activity'), 'ADMIN never asks for the task timesheet').toBe(0);
	report('timesheet open as ADMIN', {
		sectionText: await section.innerText().then(flat),
		reads: served.countOf('/api/timesheet/activity')
	});

	// the rows are only reachable for a role the hook enables; this is the one place this file arms a lane scenario
	await mock.scenario({ roleName: 'MANAGER' });
	try {
		await signInAndLoad(page, fixture, taskPage(ids.task));
		await expect(toggle()).toHaveAttribute('aria-expanded', 'false');
		await toggle().click();
		await expect.poll(() => served.countOf('/api/timesheet/activity'), { timeout: 20_000 }).toBeGreaterThan(0);

		const opened = sectionByHeading(page, EN.common.timesheets.SINGULAR);
		await expect(opened).toContainText('Fixture Manager');
		await expect(opened).toContainText('Fixture Teammate');
		// user-task-activity.tsx:38 — the duration is printed as the number it was served with, not as `1h 30m`
		await expect(opened).toContainText('5400');
		await expect(opened).toContainText('1200');
		// user-task-activity.tsx:58-77 — every entry carries its own tab group, named straight from `ActivityFilters`
		await expect(opened.locator('text=Screenshots')).toHaveCount(2);
		await expect(opened.locator('text=Apps')).toHaveCount(2);
		await expect(opened.locator('text=Visited Sites')).toHaveCount(2);

		const read = served.calls.find((call) => call.path === '/api/timesheet/activity');
		expect(queryPairs(read?.search ?? ''), 'the timesheet read names this task and this tenant').toEqual(
			[`organizationId=${ids.organizationA}`, `taskIds[0]=${ids.task}`, `tenantId=${ids.tenantA}`].sort()
		);
		report('timesheet open as MANAGER', {
			sectionText: await opened.innerText().then(flat),
			reads: served.countOf('/api/timesheet/activity'),
			query: queryPairs(read?.search ?? '')
		});
	} finally {
		await mockReset();
	}

	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

// --------------------------------------------------------------------------- 13. the side rail, wide and narrow

test('13 · the side rail: at 620 px there is no rail and its parts print as sections under the task, at 1280 px they move into an aside named Details', async ({
	page,
	fixture,
	shield
}) => {
	const ids = fixture.ids;
	const served = await serveTaskDetail(page, ids, {
		...relativesOf(ids),
		files: filesServed(ids),
		comments: commentsServed(ids),
		activities: activitiesServed(ids),
		metadata: metadataServed(ids),
		task: { parentId: PARENT_ID }
	});

	// narrow first: the rail is not rendered at all, its parts print inline as their own sections
	await page.setViewportSize({ width: 620, height: 900 });
	await signInAndLoad(page, fixture, taskPage(ids.task));
	await expect(page.locator('h1')).toHaveText(TASK_TITLE);
	await expect(page.locator(`aside[aria-label="${C.DETAILS}"]`)).toHaveCount(0);
	const narrowHeadings = await textOf(page, 'h2');
	expect(narrowHeadings).toEqual([
		C.DESCRIPTION,
		C.CHILD_ISSUES,
		C.RELATED_ISSUES,
		TD.sections.TIME,
		PAGE.DAILY_PLANS,
		C.DETAILS,
		EN.common.timesheets.SINGULAR,
		C.ACTIVITY
	]);
	report('narrow 620', { asideCount: 0, h2: narrowHeadings });

	// wide: `WIDE_LAYOUT_QUERY` (task-detail-page-body.tsx:20) puts those parts into the rail beside the task
	await page.setViewportSize({ width: 1280, height: 900 });
	await expect(page.locator(`aside[aria-label="${C.DETAILS}"]`), 'the rail is named by common.DETAILS').toHaveCount(
		1
	);
	const rail = page.locator(`aside[aria-label="${C.DETAILS}"]`);
	for (const railSection of [TD.sections.PROPERTIES, TD.sections.TIME, PAGE.DAILY_PLANS, C.DETAILS]) {
		await expect(
			rail.getByRole('button', { name: railSection, exact: true }),
			`the rail prints ${railSection}`
		).toBeVisible();
	}
	const wideHeadings = await textOf(page, 'h2');
	expect(wideHeadings).toEqual([
		C.DESCRIPTION,
		C.CHILD_ISSUES,
		C.RELATED_ISSUES,
		EN.common.timesheets.SINGULAR,
		C.ACTIVITY
	]);
	report('wide 1280', {
		asideLabel: await rail.getAttribute('aria-label'),
		h2: wideHeadings,
		railText: await rail.innerText().then(flat)
	});

	expect(served.pathsOf()).toEqual(
		expect.arrayContaining([
			'/api/task-metadata/bootstrap',
			'/api/plugins/docs/links',
			'/api/comment',
			`/api/tasks/${ids.task}`
		])
	);
	expect(consoleFindings(shield), 'the page logged a console error').toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});
