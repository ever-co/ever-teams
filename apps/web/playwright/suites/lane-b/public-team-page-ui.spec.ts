import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Route } from '@playwright/test';

import { expect, test, type MockControl, type Page, type Shield } from '../../fixtures';
import { mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a **public team page** shows and does: `app/[locale]/(main)/(teams)/team/[teamId]/[profileLink]/page.tsx`
 * opened at `/team/<teamId>/<profileLink>` — signed out (the route is on the no-session list,
 * `core/services/client/api.service.ts:69-78`), signed in as a member, and signed in as a stranger. Lane-b:
 * app `http://localhost:3032`, mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, issuer `3999`
 * (`playwright/test-servers.ts:37-42`).
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-publicteam\probe1.spec.disabled` … `probe12.spec.ts`, run on this lane on
 * 2026-11-26 and logged in `D:\Coding\.tmp\probe-publicteam-2.log` (P1: the signed-out visit on the mock's own fixture
 * team, its two reads and their queries, the whole rendered text, the malformed links), `-probe-5.log` (A3 ×4: a 200
 * payload carrying `status:404`, an HTTP 404, an HTTP 500, a body the schemas reject), `-probe-7.log` (A2 the estimate
 * pill opened and escaped, A4 the member redirect, A6/A7 the polling window), `-probe-8.log` (B1 five served members and
 * their card strings, B2 the extra timer read, B4 the signed-in stranger, B5 polling with the flag unset, B6 the estimate
 * Save), `-probe-9.log` (C1 the badge tooltip of every served member, C2 the `status:404` payload, C3 the outside-team
 * running log, C4 the estimate Save's PUT, C5 a payload flagged `public:false`, C6 the member redirect), `-probe-11.log`
 * (D1 the copy `notFound()` renders, D2 the signed-out control census, D3 the signed-in control census, D4 the dot links),
 * `-probe-12.log` (E1 the labelled time cells of one card, E2 the whole console line of an armed 500 and the page
 * state it leaves), `probe9.spec.ts` in `-probe-14.log` F1 / `-probe-13.log` F2 (every `ul` of the signed-out and of
 * the signed-in page with its classes, and the selector counts behind finding 12) and `probe10.spec.ts` in
 * `-probe-15.log` G1 / G2 (the signed-in stranger's member card and the same served team signed out, sampled once a
 * second for 14 s, with the mock-origin request timeline behind finding 8) and `probe11.spec.ts` in `-probe-16.log`
 * H1 / H2 / H3 (that same visit, three times over, one census every 2 s for 20 s — the census test 8 pins) and
 * `probe12.spec.ts` in `-probe-17.log` J1 / J2 (the five-member served team with one task named per member: the five
 * card strings, the estimate labels, `h3Shown` / `h3Total`, sampled twice in each of two visits). Every value asserted
 * below is one those runs printed, or one this file's own `MEASURE` line printed
 * on a run that passed. No case names today's date or the browser's time zone: the served `startDate` / `endDate` bounds
 * are only checked to exist, and served durations are fixed numbers in the payload this file writes, never offsets from
 * the clock — except test 11, whose one duration is the app's own (see finding 9).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, its shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization,
 * team, project and task ids and names (`fixture.ids`, `fixture.names`, `profileLink`), the three team members and their
 * initials (`mock-gauzy-server.mjs:120-135`), the one fixture task with its estimate 3600 s (`:136-160`), the reader's
 * role (`:50-81`), the team's `profileLink` (`:218-223`) and the invitation fixture a signed-in reader is shown
 * (`invited@example.test`, `Task title`, `Pending`). Tests 1, 6, 7, 9 and the signed-in half of test 3 run with **no
 * stub**: the mock's own `/api/public/team/**` handler answers (`:657-659`).
 *
 * **Served by this file:** everything from test 2 on that needs a member state or an answer the mock cannot produce —
 * a member whose timer runs, paused, idle or whose account is inactive, a member with no current task, a team or task
 * with numbers of its own, a `status:404` payload, an HTTP 404 / 500 refusal, a body the Zod schemas reject, a team
 * flagged `public:false`, and the `/api/timesheet/timer/status/worked` answer. Those go through `page.route` on the mock
 * origin (the pattern of `suites/lane-a/api-tokens-settings-ui.spec.ts:221-345`), each answer restating the mock's CORS
 * answer (`mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204 at `:1097-1101`) — the page is on `localhost:3032`, the API
 * on `127.0.0.1:3996`. `route.fetch()` is never called on a served path, so `mock.calls('/api/public/team')` stays empty
 * in every stubbed test: the witness that the page acted on this file and not on the mock. Served ids are uuids this
 * file builds (`uuidOf`) because `uuIdSchema` is `z.string().uuid()` (`core/types/schemas/common/schema-primitives.ts`);
 * a non-hex id makes the service reject the whole payload (seen in `-probe-5.log` A3 before that was fixed).
 *
 * **The browser talks to the mock, never to the app's route twins**: the lane points the client's axios base at
 * `<mock origin>/api` (`test-servers.ts:37-42`, `NEXT_PUBLIC_GAUZY_API_SERVER_URL`), so
 * `public-organization-team.service.ts:38-40` takes the relations branch and `app/api/public/team/**` (with its
 * `.` / `..` 400 guard) is **not** in this file's path at all — which test 6 pins from the browser side.
 *
 * ## The code this file drives (each line read out of its file before it is named)
 *
 * - `app/[locale]/(main)/(teams)/team/[teamId]/[profileLink]/page.tsx`: `isMissingPublicTeam` `:26-33` (a 200 answer
 *   whose body carries `status:404`); the member redirect `:49-55` (`getActiveUserIdCookie()` matched against
 *   `members[].employee.userId` → `router.replace('/')`); `loadData` `:57-66` + `setPublic(true)`; the two refresh
 *   intervals `:83-84` (`10 * 1000`, `30 * 1000`); `if (isMissingTeam) notFound()` `:89-91`; the skeleton while
 *   `teamsFetching || !publicTeamData` `:93-95`; the header `:115-127` (`EntityTile`, `h1`, `pages.home.MEMBER_COUNT`,
 *   `profile.page.PUBLIC_VIEW`); `<UserTeamCardHeader />` `:134`; `<TeamMembersView view={IssuesView.CARDS} publicTeam>`
 *   `:138-144`.
 * - `core/hooks/organizations/teams/use-public-organization-teams.ts`: `PUBLIC_TEAM_STALE_TIME` 5 min / `…_MISC_…` 15 min
 *   `:19-20`; `ensurePublicTeamQueryData` `:27-34` (a query in error is not retried inside one stale window; failures
 *   resolve to `undefined`); the `status === 404` branch `:81-84`; the loaders `:153-183`.
 * - `core/hooks/common/use-refresh-interval.ts`: the interval starts only when the stored flag says so;
 *   `core/lib/utils/settings-data-sync.ts`: `DATA_SYNC_STORAGE_KEY = 'conf-is-data-sync'`, `parseStoredDataSync(null)`
 *   `=== true` `:16-19` — a fresh browser has polling on.
 * - `core/services/client/api/organizations/public-organization-team.service.ts`: the relations lists and the
 *   `withLastWorkedTask / startDate / endDate` params, the relations-vs-`type=` branch `:38-40`, the Zod validation and
 *   its `logger.error('Get public organization teams validation failed:'…)` line.
 * - `core/types/schemas/team/public-organization-team.schema.ts:18-27`: the response schema, `status: z.number().optional()`
 *   `:20` (`// For 404 status handling`), `statuses / sizes / priorities / labels / issueTypes`.
 * - Cards: `core/components/pages/teams/team/team-members-views/user-team-card/index.tsx` (the drag block `:255-274`,
 *   `allowEmptyTask={false}` `:326` and `:414`, the two copies of every card — the grid row and the `xl:hidden` stack —
 *   which is why every card's text and every `h3` appears twice); `…/user-team-card/user-info.tsx` (`href` `#` for a
 *   public team `:40`, the avatar initial only `:73`, no e-mail line `:97-110`, `TimerStatus` `:54-59`);
 *   `…/team-members-header.tsx:29-58` (the column labels); `…/team-members-card-view.tsx` (`draggable={isTeamManager &&
 *   …}` `:149`, the invitation cards `:159-166`, the `Invite` button behind `<Transition show={isTeamManager}>`
 *   `:190-202`); `core/components/pages/teams/team/public-team-page-skeleton.tsx` (`role="status" aria-busy="true"` +
 *   `common.LOADING`).
 * - Times and states: `core/components/tasks/task-times.tsx` (`common.TODAY` / `common.TOTAL` labels `:136`, `:145`,
 *   `TodayWorkedTime` `:220-237`); `core/hooks/organizations/teams/use-today-seconds-without-team.ts:23-52` (one read of
 *   `timerService.getLastTimerLogsOf`, `enabled: employeeIds.length > 0`, and `statuses?.find(...)` `:46`);
 *   `core/lib/helpers/team-member-tracking.ts` (`isTrackingOutsideTeam`, `employeeIdsTrackingOutsideTeam`);
 *   `core/services/client/api/timers/timer.service.ts:325-332` (`GET /timesheet/timer/status/worked?employeeIds[i]`);
 *   `core/components/timer/timer-status.tsx:83-162` (`getTimerStatusValue` and its condition order);
 *   `core/lib/utils/team-members.utils.ts:50-61` (`getMemberPresence` and its 3-minute window
 *   `EMPLOYEE_PRESENCE_CONSTANTS.ONLINE_WINDOW_MS`, `core/constants/config/constants.tsx:1150-1157`).
 * - Estimate: `core/components/tasks/task-estimate.tsx` (its three states and the intent line `:82`),
 *   `…/user-team-card/task-estimate.tsx:71-73` (`showEditAndSaveButton`), `core/hooks/tasks/use-task-member-estimation.ts`
 *   (the Hours / Minutes inputs and Save).
 * - Not-found copy: `core/components/pages/404/index.tsx:27-31` (`DEFAULT_LABELS`, the root boundary's English defaults)
 *   vs `app/[locale]/not-found.tsx:12-19` (the locale boundary's translated labels, `pages.taskDetails.GO_BACK_HOME`).
 *
 * ## Findings the measurements forced
 *
 * 1. **[MEASURED, NOT INTENDED]** `core/components/tasks/task-estimate.tsx:78-82` says "Without the right to edit it is
 *    plain text, so a field always means \"editable\"". Measured: a **signed-out** visitor gets the editable field and
 *    can save it — the pill's Save sent `PUT mock /api/tasks/<taskId>` and the card then read `Estimate: 7h 30m`
 *    (`-probe-8.log` B6 writes, `-probe-9.log` C4 estimate after / writes). The reason is `…/user-team-card/task-estimate.tsx:71-73`:
 *    with `allowEmptyTask={false}` (`user-team-card/index.tsx:326`) the flag becomes `Boolean(task)`, which a public
 *    payload satisfies. Test 10 pins both halves: Escape sends nothing, Save writes.
 * 2. (measured, untagged: the comment's premise holds for the real payload) `core/components/timer/timer-status.tsx:143-145`
 *    says the public team payload carries no heartbeat, so a public view never shows presence. Measured: when a
 *    **served** public payload does carry
 *    `employee.lastSeenAt` inside `EMPLOYEE_PRESENCE_CONSTANTS.ONLINE_WINDOW_MS`, the public card's badge reads `Online`
 *    (`-probe-9.log` C1, the member `D`), so the rule holds only because the real payload omits the field. Caveat
 *    written into test 2: this is a payload the real endpoint may never send.
 * 3. A refused read is not a "not found" page. `notFound()` needs `isMissingPublicTeam` (`page.tsx:26-33`), which reads
 *    `response.status` of the **answer body**; an HTTP 404/500 throws in the client (`api.service.ts:247-284`) and
 *    `ensurePublicTeamQueryData` turns it into `undefined` (`:33`), so the page sits on `PublicTeamPageSkeleton`
 *    (`page.tsx:93-95`) forever: `-probe-5.log` A3 and `-probe-12.log` E2 (`docStatus 200`, `headings []`,
 *    `role="status" aria-busy="true"` reading `Loading`). The same skeleton is what a body the schemas rejects leaves
 *    (A3 malformed-body). Only a 200 body carrying `status:404` reaches `notFound()` (test 4).
 * 4. A failing read costs one attempt per stale window, not one per tick: `use-public-organization-teams.ts:22-26`
 *    states that, and `-probe-12.log` E2 measured exactly 2 answers in a 13 s window with the interval armed.
 * 5. The refresh interval does not repeat these reads inside a test run. With `conf-is-data-sync` unset (polling **on**,
 *    `settings-data-sync.ts:16-19`) the page still answered 2 reads and nothing more in a 13 s window
 *    (`-probe-8.log` B5 flag `null`, timeline `3073ms GET rel0=tasks / 3078ms GET rel0=statuses`), because every tick
 *    goes through `ensureQueryData`, which returns the cached answer until `PUBLIC_TEAM_STALE_TIME` (5 min) has passed
 *    (`use-public-organization-teams.ts:19`). So brief item 8's "the read repeats at its interval" is **not reachable**
 *    in a run: a repeat would need a 5-minute test. Test 9 pins what is observable — the same 2 reads with the flag on
 *    and with the flag off — and names the line that makes them indistinguishable.
 * 6. A public visitor sees no team-management control, and the same controls are visible to a signed-in manager on the
 *    signed-in team card view (`-probe-11.log` D2 vs D3): `Invite`, the `role="tablist"` named `common.VIEW` with
 *    `Cards / Table / Blocks / Kanban`, the `common.ACTIVITY_FOR_TODAY` toggles, `draggable="true"` handles and visible
 *    `common.MORE_OPTIONS` buttons. On the public page every `[draggable]` is `false`, every `More options` button is
 *    rendered but invisible (6 of them, `hidden`), and there is no `combobox` / `select` / `searchbox` at all — the same
 *    zero the signed-in card view shows for that locator, so "no filter" is pinned as those three roles, not as a
 *    control that exists somewhere else.
 * 7. A signed-in stranger sees the reader's **own** invitation cards on somebody else's public page: `invited@example.test`
 *    with `Pending` and `Task title` (`-probe-8.log` B4 liVisible), while a signed-out visitor causes no `/api/invite`
 *    read at all (`-probe-2.log` P1 mock requests / api calls; the query needs tenant, organization, team, user and token,
 *    `core/hooks/invitations/use-team-invitations-query.ts`). Test 8 pins both sides.
 * 8. On a signed-in visit the member row is fed from the shell's stores — and which store wins over the served public
 *    payload is decided by write order, not by the page:
 *    `TodayWorkedTime` (`task-times.tsx:221-237`) looks the member up with `useActiveTeamMember`
 *    (`use-active-team-member.ts:14-23`) in `activeTeamState` = the `organizationTeamsState` team matching the cookie's
 *    active team id (`core/stores/teams/organization-team.ts:28-45`), and the served member is not in it. **What that row
 *    prints is a race, not a rule** — four settled shapes were measured. With `activeTaskId` +
 *    `totalTodayTasks:[{duration:600}]` + `totalWorkedTasks:[{duration:1200}]` it settled as `Today 0h 0m Total 0h 0m
 *    Estimated -` (`-probe-15.log` G1, identical from 3948 ms to 14 066 ms; `s3-lane-b-publicteam-0d.log`) and as
 *    `Today 0h 10m Total 0h 20m` with an `Estimate: 10m` control (`-0c.log`;
 *    `s3-lane-b-publicteam-attempt1-cardrace.log`, where it held for the whole 30 s of a poll). With **no task and no
 *    totals** in the payload it settled as the reader's own `Fixture active task` + `Estimate: 1h` (`-probe-16.log`
 *    H1 / H2 / H3 — one census every 2 s for 20 s, unchanged from 6463 / 4841 / 4726 ms on; `-0e.log`) and as no task at
 *    all with `Estimated -` (`-0f.log`). The cause is the public payload merged into `organizationTeamsState[0]`
 *    (`use-public-organization-teams.ts:86-105`) versus the shell's own writes (`GET /api/organization-team/<teamA>` at
 *    2509 ms, `POST /api/timesheet/statistics/tasks` at 2850 ms in `-probe-15.log` G1): either can land last and the
 *    loser is never rewritten, so the task and estimate cells are pinned nowhere. Test 8 pins what every one of those
 *    shapes has in common — the initials, the two cards, the reader's own invitation card, the served name and e-mail
 *    absent from text and markup, and the two `0h 0m` time cells — and prints the estimate it landed on. The served
 *    totals themselves are pinned where the order cannot flip: on the signed-out page (`-probe-15.log` G2, test 2).
 * 9. A served member whose timer runs outside the team adds one read: `GET /api/timesheet/timer/status/worked` carrying
 *    only `employeeIds[0]=<that employee id>` (`-probe-8.log` B2, `-probe-9.log` C3), and its `{items,total}` catch-all
 *    answer from the mock crashes the card (`TypeError: statuses?.find is not a function` at
 *    `use-today-seconds-without-team.ts:46`, seen in `-probe-7.log` A1/A5, which is why every test here stubs that read
 *    or avoids the condition). What the read does to the printed times is **not stable** across runs: the extra,
 *    unlabelled summary cell read `0h 10m` in `-probe-9.log` C3 and `0h 0m` in `-probe-12.log` E1 for the same served
 *    running log, while the labelled `Today` / `Total` cells stayed `0h 0m` in both — so test 11 pins the read and the
 *    labelled cells only.
 * 10. The client never checks the flag it is named after: a served payload with `public:false` rendered as the public
 *     team page (`-probe-9.log` C5 `h1 "Not A Public Team"`, `Public view` badge shown). Test 12 pins it.
 * 11. A member of the team is redirected to `/` after the member list arrived (`page.tsx:49-55`; `-probe-9.log` C6), and
 *     the malformed-link forms `.` / `..` / `%2e` / `%2e%2e` / `..%2F` never reach the API at all: the browser normalizes
 *     them (`/team/<teamId>` and `/team`) and Next answers 404 with the **root** boundary's English defaults
 *     (`Go back to home`, `core/components/pages/404/index.tsx:27-31`), which is the wording test 4's client-side
 *     `notFound()` does **not** get (`Go back home`, `app/[locale]/not-found.tsx:17`).
 * 12. The card census is scoped to the member list container. A plain `ul > li` is not the member list: on the signed-in
 *     visit it also matches the shell's sidebar nav — 13 `ul > li` of which 11 are nav items and 2 are the cards
 *     (`-probe-13.log` F2), and on the signed-out page 14 of which only 3 are cards (`-probe-14.log` F1). The nav items
 *     appear when the shell finishes mounting, so an unscoped census changed between runs (`s3-lane-b-publicteam-0.log`
 *     2 cards vs `-0b.log` 13). `div[class*="overflow-x-auto"] > ul > li` — `MEMBER_LIST_CONTAINER`
 *     (`core/components/teams/member-row-grid.ts:53`) around the cards view's `ul`
 *     (`…/team-members-views/team-members-card-view.tsx:121`), whose `li` are the member/invitation cards
 *     (`:124,143,163`) — measured 2 (signed-in stranger) and 3 (fixture, signed out), identical at every moment measured.
 * 13. A member whose payload names no task shows `tasks[0]` (`use-member-active-task.ts:73-79`), and **which** served
 *     task that was is not stable: served five members and two tasks, three such cards printed `Served task one` /
 *     `Estimated 1h 30m` in `-probe-8.log` B1 and `-probe-9.log` C1, and `Served task two` / `Estimated 15m` in
 *     `s3-lane-b-publicteam-attempt2-taskfallback.log`, same payload, same order. Test 2 therefore names the task in every member's
 *     `activeTaskId`, so no card depends on that fallback (`-probe-17.log` J1 / J2 printed the same five cards in both
 *     visits and 8 s later).
 *
 * ## What this file does not cover
 *
 * The Next.js route twins under `app/api/public/team/**` (the browser on this lane never calls them; their 400 guard and
 * traversal re-encoding are pinned in `app/api/public/team/[profileLink]/[teamId]/route.test.ts` and
 * `suites/lane-b/path-segment-sweep.spec.ts`). The signed-in team page's own behaviour (filters, view switch, drag order,
 * invitations) belongs to `team-dashboard-ui.spec.ts` and `member-timesheet-report-ui.spec.ts`; this file only borrows its
 * control census for the comparison in test 3. The `/join` and `Request to join` flows, the mobile (< 1280 px) layout of
 * the cards, and the 5-minute stale window itself (no test budget reaches it) are not covered.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
/** The path on the mock origin the browser calls. */
const PUBLIC_TEAM_ROUTE = '/api/public/team';
/** The same call as the client logs it: `api.service.ts` logs axios' own `config.url`, which is relative to the API base, so it has no `/api` (`-probe-12.log` E2). */
const PUBLIC_TEAM_ENDPOINT = '/public/team';
const WORKED_ROUTE = '/api/timesheet/timer/status/worked';

/** `locales/en.json`, read by key: never typed here. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	pages: {
		home: { BREADCRUMB: string; MEMBER_COUNT: string };
		page404: { HEADING_TITLE: string; HEADING_DESCRIPTION: string };
		taskDetails: { GO_BACK_HOME: string };
	};
	profile: { page: { PUBLIC_VIEW: string } };
	modals: { invite: { PENDING_STATUS: string } };
	common: Record<string, string>;
	dailyPlan: { TASK_TIME: string; TOTAL_TODAY: string };
	timer: { presence: Record<string, string> };
};

const T = EN.common;
/** `pages.home.MEMBER_COUNT` = `"{count, plural, one {# member} other {# members}}"`, rendered by next-intl. */
const memberCountText = (count: number) => (count === 1 ? `1 member` : `${count} members`);

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b public-team] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/** A uuid the schemas accept (`uuIdSchema` is `z.string().uuid()`), made deterministically from any seed. */
const uuidOf = (seed: string) => {
	const hex = seed
		.split('')
		.map((ch) => (ch.charCodeAt(0) % 16).toString(16))
		.join('')
		.padEnd(32, '0')
		.slice(0, 32);
	return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4${hex.slice(13, 16)}-8${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
};

const flat = (value: unknown) =>
	String(value ?? '')
		.replace(/\s+/g, ' ')
		.trim();

/** React's dev-mode store warning, not this page's (`chat-conversation-ui.spec.ts:1074-1083`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `api.service.ts` `logError`: the client's own line for a refusal this file armed, `<status> {statusCode: …}` at the end (`-probe-12.log` E2). */
const armedHttpError = (profileLink: string, teamId: string, status: number) => (line: string) =>
	line.includes(`[ERROR] [HttpClient] HTTP Error: GET ${PUBLIC_TEAM_ENDPOINT}/${profileLink}/${teamId}`) &&
	line.includes(` ${status} {`);
/** `public-organization-team.service.ts` `logger.error`, printed when a 200 answer fails the Zod layer. */
const validationFailure = (line: string) =>
	line.includes('[PublicOrganizationTeamService] Get public organization teams validation failed:') ||
	line.includes('[PublicOrganizationTeamService] Get public organization teams misc data validation failed:');

const consoleFindings = (shield: Shield, expected: Array<(line: string) => boolean> = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((matches) => matches(line)));

/** The names the snapshot looks for, every one of them a `locales/en.json` value passed in as the callback's argument. */
const NAMES = {
	estimate: T.ESTIMATE,
	moreOptions: T.MORE_OPTIONS,
	invite: T.INVITE,
	activity: T.ACTIVITY_FOR_TODAY,
	view: T.VIEW,
	hours: T.HOURS,
	minutes: T.MINUTES
};

/**
 * A snapshot of what the document actually renders. Self-contained: a browser callback cannot see a Node variable, and
 * nothing here uses a name the window also owns (see `D:\Coding\.tmp\scan-evaluate-globals.mjs`).
 */
const SNAPSHOT = (names: typeof NAMES) => {
	const trim = (v: unknown) =>
		String(v ?? '')
			.replace(/\s+/g, ' ')
			.trim();
	const shown = (el: Element) => {
		const box = el.getBoundingClientRect();
		return box.width > 0 && box.height > 0 && getComputedStyle(el).visibility !== 'hidden';
	};
	const estimateSelector = `button[aria-label^="${names.estimate}"]`;
	const moreOptionsSelector = `button[aria-label="${names.moreOptions}"]`;
	const memberCardsSelector = 'div[class*="overflow-x-auto"] > ul > li';
	return {
		title: document.title,
		headings: Array.from(document.querySelectorAll('h1,h2,h3')).map((h) => [h.tagName, trim(h.textContent)]),
		h1Shown: Array.from(document.querySelectorAll('h1'))
			.filter(shown)
			.map((h) => trim(h.textContent)),
		h3Shown: Array.from(document.querySelectorAll('h3'))
			.filter(shown)
			.map((h) => trim(h.textContent)),
		h3Total: document.querySelectorAll('h3').length,
		// the member cards only: `MEMBER_LIST_CONTAINER` (`member-row-grid.ts:53`) around the cards view's `ul`
		// (`team-members-card-view.tsx:121`), whose `li` are the member cards (`:124,143,163`). A plain `ul > li` would
		// also count the signed-in shell's sidebar nav (`-probe-13.log` F2: 13 `ul > li`, 11 of them nav items, 2 cards;
		// the scoped selector 2) and other lists of the public page (`-probe-14.log` F1: 14 `ul > li`, 3 cards).
		cardsShown: Array.from(document.querySelectorAll(memberCardsSelector))
			.filter(shown)
			.map((li) => trim(li.textContent)),
		statusRegions: Array.from(document.querySelectorAll('[role="status"]')).map((el) => [
			el.getAttribute('aria-busy'),
			trim(el.textContent)
		]),
		memberLinks: Array.from(document.querySelectorAll('a[href="#"]')).map((a) => trim(a.textContent)),
		badgesShown: Array.from(document.querySelectorAll('div[class*="bg-card"][class*="ring-2"]')).filter(shown)
			.length,
		estimateButtons: Array.from(document.querySelectorAll(estimateSelector)).map((b) => [
			b.getAttribute('aria-label'),
			(b as HTMLButtonElement).disabled,
			shown(b)
		]),
		moreOptionsShown: Array.from(document.querySelectorAll(moreOptionsSelector)).filter(shown).length,
		moreOptionsTotal: document.querySelectorAll(moreOptionsSelector).length,
		draggable: Array.from(document.querySelectorAll('[draggable]')).map((el) => [
			el.getAttribute('draggable'),
			shown(el)
		]),
		tablists: Array.from(document.querySelectorAll('[role="tablist"]')).map((el) => [
			el.getAttribute('aria-label'),
			shown(el)
		]),
		tabsShown: Array.from(document.querySelectorAll('[role="tab"]'))
			.filter(shown)
			.map((el) => el.getAttribute('aria-label') ?? trim(el.textContent)),
		pickers: Array.from(document.querySelectorAll('[role="combobox"], select, [role="searchbox"]'))
			.filter(shown)
			.map((el) => el.tagName),
		srOnlyShown: Array.from(document.querySelectorAll('.sr-only'))
			.filter((el) => shown(el) && trim(el.textContent) === names.activity)
			.map((el) => trim(el.textContent)),
		inviteShown: Array.from(document.querySelectorAll('button')).filter(
			(b) => trim(b.textContent) === names.invite && shown(b)
		).length,
		bodyText: trim(document.body.textContent).slice(0, 1500)
	};
};

const snapshot = (page: Page) => page.evaluate(SNAPSHOT, NAMES);

/** Does the rendered document contain these strings, and do they appear anywhere in its markup? */
const bodyContains = (page: Page, values: string[]) =>
	page.evaluate(
		(wanted: string[]) =>
			wanted.map((value) => [
				value,
				String(document.body.textContent).includes(value),
				document.documentElement.innerHTML.includes(value)
			]),
		values
	);

type ServedScript =
	| { kind: 'team'; body: unknown }
	| { kind: 'refusal'; status: number; message: string }
	| { kind: 'raw'; body: string };

/**
 * This file's stand-in for the public team endpoint, on the mock origin, for both its reads (team + misc). The script is
 * a getter so one visit can be answered one way and the next one another, without registering a second route.
 */
async function servePublicTeam(page: Page, scriptOf: () => ServedScript) {
	const calls: Array<{ method: string; path: string; relations: string[]; params: string }> = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname.startsWith(PUBLIC_TEAM_ROUTE),
		(route: Route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({
				method: request.method(),
				path: url.pathname,
				relations: Array.from(url.searchParams.keys())
					.filter((key) => key.startsWith('relations['))
					.sort()
					.map((key) => String(url.searchParams.get(key))),
				params: Array.from(url.searchParams.keys())
					.filter((key) => !key.startsWith('relations['))
					.sort()
					.join(',')
			});
			const script = scriptOf();
			if (script.kind === 'refusal') {
				return route.fulfill({
					status: script.status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: JSON.stringify({ statusCode: script.status, message: script.message })
				});
			}
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: script.kind === 'raw' ? script.body : JSON.stringify(script.body)
			});
		}
	);
	return calls;
}

/** Every non-GET the browser sent to the mock origin, the app's own dev-log posts excluded. */
function watchWrites(page: Page) {
	const writes: string[] = [];
	page.on('request', (request) => {
		if (request.method() === 'GET') return;
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN) return;
		writes.push(`${request.method()} ${url.pathname}`);
	});
	return writes;
}

/** The relations a public team read asks for, read out of the mock's own request log (`helpers.ts` StubRequest). */
const relationsOf = (query: string) =>
	(query.match(/relations%5B\d+%5D=[^&]*/g) ?? []).map((pair) =>
		decodeURIComponent(pair.split('=').slice(1).join('='))
	);

/** The worked-time read of the members whose timer runs outside the team (`timer.service.ts:325-332`). */
async function serveWorked(page: Page, body: unknown) {
	const calls: Array<{ method: string; path: string; params: string }> = [];
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === WORKED_ROUTE,
		(route: Route) => {
			const request = route.request();
			const url = new URL(request.url());
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			calls.push({ method: request.method(), path: url.pathname, params: url.searchParams.toString() });
			return route.fulfill({
				status: 200,
				headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
				body: JSON.stringify(body)
			});
		}
	);
	return calls;
}

/** A team payload in the shape the lane mock itself answers with (`mock-gauzy-server.mjs:657-659` + its `buildData`). */
function servedTeam(
	fixture: { ids: Record<string, string>; profileLink: string },
	options: { name: string; teamId?: string; publicFlag?: boolean }
) {
	const status = {
		id: fixture.ids.todoStatus,
		name: 'open',
		value: 'open',
		color: '#94a3b8',
		order: 1,
		isSystem: true,
		isDefault: true,
		isTodo: true,
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		organizationTeamId: options.teamId ?? fixture.ids.teamA
	};
	const employeeOf = (
		employeeId: string,
		userId: string,
		first: string,
		last: string,
		email: string,
		extra: Record<string, unknown> = {}
	) => {
		const user = {
			id: userId,
			firstName: first,
			lastName: last,
			name: `${first} ${last}`,
			fullName: `${first} ${last}`,
			email,
			image: null,
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA
		};
		return {
			id: employeeId,
			userId,
			user,
			fullName: `${first} ${last}`,
			isTrackingEnabled: true,
			isTrackingTime: false,
			isOnline: false,
			isActive: true,
			organizationId: fixture.ids.organizationA,
			tenantId: fixture.ids.tenantA,
			...extra
		};
	};
	const taskOf = (taskId: string, title: string, estimate: number, members: unknown[]) => ({
		id: taskId,
		title,
		number: 1,
		public: false,
		status: 'open',
		taskStatusId: status.id,
		taskStatus: status,
		estimate,
		description: 'Served public team task',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		members,
		tags: [],
		teams: [
			{
				id: options.teamId ?? fixture.ids.teamA,
				name: options.name,
				organizationId: fixture.ids.organizationA,
				tenantId: fixture.ids.tenantA
			}
		]
	});
	const memberOf = (
		memberId: string,
		employee: ReturnType<typeof employeeOf>,
		extra: Record<string, unknown> = {}
	) => ({
		id: memberId,
		employeeId: employee.id,
		employee,
		user: employee.user,
		isManager: false,
		isActive: true,
		isTrackingEnabled: true,
		organizationTeamId: options.teamId ?? fixture.ids.teamA,
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		roleId: fixture.ids.role,
		totalWorkedTasks: [],
		totalTodayTasks: [],
		...extra
	});
	const team = (members: unknown[], tasks: unknown[]) => ({
		id: options.teamId ?? fixture.ids.teamA,
		name: options.name,
		color: '#101010',
		organizationId: fixture.ids.organizationA,
		tenantId: fixture.ids.tenantA,
		public: options.publicFlag ?? true,
		profile_link: fixture.profileLink,
		prefix: 'SPT',
		shareProfileView: true,
		members,
		managers: [],
		projects: [],
		tasks,
		statuses: [status],
		priorities: [],
		sizes: [],
		labels: [],
		issueTypes: []
	});
	return { team, status, employeeOf, taskOf, memberOf };
}

/** Polling is on in a fresh browser (`settings-data-sync.ts:16-19`); a test that wants it off says so before the visit. */
const pollingOff = (page: Page) => page.addInitScript(() => window.localStorage.setItem('conf-is-data-sync', 'false'));

const cardTexts = async (page: Page, contains: string) =>
	(await snapshot(page)).cardsShown.filter((text) => text.includes(contains));

const estimateLabels = async (page: Page) =>
	(await snapshot(page)).estimateButtons.filter((entry) => entry[2]).map((entry) => String(entry[0]));

/** The tooltip a member's status badge prints: park the pointer, wait for no tooltip, hover, read the one that opens. */
const badgeTooltip = async (page: Page, index: number) => {
	const tooltip = page.locator('span[class*="whitespace-nowrap"]');
	const badge = page.locator('div[class*="bg-card"][class*="ring-2"]:visible').nth(index);
	await page.mouse.move(2, 2);
	await expect.poll(() => tooltip.count(), { timeout: 10_000 }).toBe(0);
	const card = flat(await badge.evaluate((el) => String(el.closest('li')?.textContent ?? ''))).slice(0, 24);
	await badge.hover({ timeout: 15_000 });
	await expect.poll(() => tooltip.count(), { timeout: 10_000 }).toBe(1);
	const tip = flat(await tooltip.textContent());
	await page.mouse.move(2, 2);
	return { card, tip };
};

const teamPath = (fixture: { ids: Record<string, string>; profileLink: string }) =>
	`/team/${fixture.ids.teamA}/${fixture.profileLink}`;

const publicTeamReads = async (mock: MockControl) =>
	(await mock.calls(PUBLIC_TEAM_ROUTE)).map((request) => ({
		method: request.method,
		path: request.path,
		query: request.query,
		relations: relationsOf(request.query)
	}));

/** The expected relations of the two reads (`public-organization-team.service.ts`). */
const TEAM_RELATIONS = [
	'tasks',
	'tasks.members',
	'tasks.teams',
	'tasks.tags',
	'members',
	'members.employee',
	'members.employee.user'
];
const MISC_RELATIONS = ['statuses', 'priorities', 'sizes', 'labels', 'issueTypes'];

/**
 * The signed-out visit on the mock's own fixture team: the header the page builds, the three cards exactly as they
 * print, and the two reads that carried them. Values: `-probe-2.log` P1 (headings, links, the whole rendered text, the
 * two queries) and `-probe-11.log` D2 (the control census, `document.title`).
 */
test('1 signed out: the fixture team, its header, its cards, its two reads', async ({
	anon,
	fixture,
	mock,
	page,
	shield
}) => {
	pollingOff(page);
	await anon(teamPath(fixture));

	// One card = the grid row plus the mobile stack (`user-team-card/index.tsx`, the two copies), one per fixture member.
	const card = `FF# ${fixture.names.task}openToday0h 0mTotal0h 0mEstimated1h0h 0mFF# ${fixture.names.task}openToday0h 0mTotal0h 0mEstimated1h`;
	await expect.poll(() => cardTexts(page, fixture.names.task), { timeout: 30_000 }).toEqual([card, card, card]);

	const snap = await snapshot(page);
	const documents = shield.documents();
	expect(snap.title).toBe('Team');
	expect(documents.at(-1)?.status).toBe(200);
	expect(snap.h1Shown).toEqual([fixture.names.teamA]);
	// three members, each card drawn twice: 6 `h3`, 3 of them visible, each the initial only (`user-info.tsx:73`)
	expect(snap.h3Total).toBe(6);
	expect(snap.h3Shown).toEqual(['F', 'F', 'F']);
	expect(snap.memberLinks).toEqual(['FF', 'FF', 'FF', 'FF', 'FF', 'FF']);
	expect(snap.badgesShown).toBe(3);

	await expect(page.getByText(`${T.TEAM} ${T.MEMBER}`, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(T.TASK, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(EN.dailyPlan.TASK_TIME, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(T.ESTIMATE, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(EN.dailyPlan.TOTAL_TODAY, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	// the mock's fixture has 3 members (`mock-gauzy-server.mjs:120-135`) → `pages.home.MEMBER_COUNT` with count 3
	await expect(page.getByText(memberCountText(3), { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(EN.profile.page.PUBLIC_VIEW, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(JSON.parse(EN.pages.home.BREADCRUMB)[0], { exact: true }).first()).toBeVisible({
		timeout: 15_000
	});

	// what the visit did not reach (`-probe-11.log` D2; the same names test 3 shows a signed-in manager has)
	expect(snap.inviteShown).toBe(0);
	expect(snap.tablists).toEqual([]);
	expect(snap.tabsShown).toEqual([]);
	expect(snap.pickers).toEqual([]);
	expect(snap.moreOptionsShown).toBe(0);
	expect(snap.moreOptionsTotal).toBe(6);
	expect(snap.srOnlyShown).toEqual([]);
	expect(snap.draggable).toEqual([
		['false', true],
		['false', true],
		['false', true]
	]);

	const reads = await publicTeamReads(mock);
	const teamReadPath = `${PUBLIC_TEAM_ROUTE}/${fixture.profileLink}/${fixture.ids.teamA}`;
	expect(reads.map((read) => read.method)).toEqual(['GET', 'GET']);
	expect(reads.map((read) => read.path)).toEqual([teamReadPath, teamReadPath]);
	expect(reads.map((read) => read.relations.join(',')).sort()).toEqual(
		[TEAM_RELATIONS.join(','), MISC_RELATIONS.join(',')].sort()
	);
	for (const read of reads) {
		expect(read.query).toContain('withLastWorkedTask=true');
		// the local-day bounds are there but are never pinned (`public-organization-team.service.ts` params)
		expect(read.query).toContain('startDate=');
		expect(read.query).toContain('endDate=');
		// the relations branch, not the `type=team|misc` branch (`:38-40`)
		expect(read.query).not.toContain('type=');
	}
	// an invitation read needs a session; a signed-out visitor causes none at all
	expect(await mock.calls('/api/invite')).toHaveLength(0);
	expect(consoleFindings(shield)).toEqual([]);

	report('fixture visit', { cards: await cardTexts(page, fixture.names.task), reads });
});

/**
 * A served team whose members cover the states the public view can reach, so every printed number comes from a payload
 * this file wrote. Badge tooltips: `-probe-8.log` B1 and `-probe-9.log` C1 (the tooltip of every badge, keyed by its
 * card). Card strings, initials and estimate labels: `-probe-17.log` J1 / J2 — the same five-member payload served
 * twice, each member naming its own task through `activeTaskId`, cards identical in both visits and 8 s later. Estimates
 * 5400 / 900 / 1200 / 300 / 600 s print `1h 30m` / `15m` / `20m` / `5m` / `10m`; member 1's served durations 3723 s /
 * 7384 s print `1h 2m` / `2h 3m` (`TodayWorkedTime`, `task-times.tsx:221-237`).
 */
test('2 a served team: five member states, five cards, no names, no e-mails', async ({
	anon,
	fixture,
	page,
	shield
}) => {
	const SERVED_NAME = 'Served Public Team';
	const t = servedTeam(fixture, { name: SERVED_NAME });
	const running = t.employeeOf(uuidOf('ptr-e1'), uuidOf('ptr-u1'), 'Ada', 'Byron', 'ada@example.test', {
		isOnline: true,
		isTrackingTime: true
	});
	const paused = t.employeeOf(uuidOf('ptr-e2'), uuidOf('ptr-u2'), 'Curtis', 'Day', 'curtis@example.test');
	const heartbeat = t.employeeOf(uuidOf('ptr-e3'), uuidOf('ptr-u3'), 'Dana', 'East', 'dana@example.test', {
		lastSeenAt: new Date(Date.now() - 60_000).toISOString(),
		isIdle: false
	});
	const inactive = t.employeeOf(uuidOf('ptr-e4'), uuidOf('ptr-u4'), 'Epita', 'Farid', 'epita@example.test', {
		isActive: false
	});
	const idleMember = t.employeeOf(uuidOf('ptr-e5'), uuidOf('ptr-u5'), 'Gil', 'Hall', 'gil@example.test');
	// One task per member, each named by that member's `activeTaskId`. A member without one shows `tasks[0]`
	// (`use-member-active-task.ts:73-79`), and which served task that turned out to be flipped between runs
	// (finding 13), so nothing here may depend on that fallback.
	const taskOne = t.taskOf(uuidOf('ptr-t1'), 'Served task one', 5400, [running]);
	const taskTwo = t.taskOf(uuidOf('ptr-t2'), 'Served task two', 900, [paused]);
	const taskThree = t.taskOf(uuidOf('ptr-t3'), 'Served task three', 1200, [heartbeat]);
	const taskFour = t.taskOf(uuidOf('ptr-t4'), 'Served task four', 300, [inactive]);
	const taskFive = t.taskOf(uuidOf('ptr-t5'), 'Served task five', 600, [idleMember]);
	const body = t.team(
		[
			t.memberOf(uuidOf('ptr-m1'), running, {
				timerStatus: 'running',
				activeTaskId: taskOne.id,
				activeTask: taskOne,
				totalTodayTasks: [{ id: taskOne.id, duration: 3723 }],
				totalWorkedTasks: [{ id: taskOne.id, duration: 7384 }]
			}),
			t.memberOf(uuidOf('ptr-m2'), paused, {
				timerStatus: 'pause',
				activeTaskId: taskTwo.id,
				activeTask: taskTwo
			}),
			t.memberOf(uuidOf('ptr-m3'), heartbeat, {
				lastWorkedTask: taskThree,
				activeTaskId: taskThree.id,
				activeTask: taskThree,
				totalTodayTasks: [{ id: taskThree.id, duration: 60 }],
				totalWorkedTasks: [{ id: taskThree.id, duration: 60 }]
			}),
			t.memberOf(uuidOf('ptr-m4'), inactive, { activeTaskId: taskFour.id, activeTask: taskFour }),
			t.memberOf(uuidOf('ptr-m5'), idleMember, { activeTaskId: taskFive.id, activeTask: taskFive })
		],
		[taskOne, taskTwo, taskThree, taskFour, taskFive]
	);

	pollingOff(page);
	const served = await servePublicTeam(page, () => ({ kind: 'team', body }));
	await anon(teamPath(fixture));

	const cards = [
		'AA# Served task oneopenToday1h 2mTotal2h 3mEstimated1h 30m1h 2mAA# Served task oneopenToday1h 2mTotal2h 3mEstimated1h 30m',
		'CC# Served task twoopenToday0h 0mTotal0h 0mEstimated15m0h 0mCC# Served task twoopenToday0h 0mTotal0h 0mEstimated15m',
		'DD# Served task threeopenToday0h 1mTotal0h 1mEstimated20m0h 1mDD# Served task threeopenToday0h 1mTotal0h 1mEstimated20m',
		'EE# Served task fouropenToday0h 0mTotal0h 0mEstimated5m0h 0mEE# Served task fouropenToday0h 0mTotal0h 0mEstimated5m',
		'GG# Served task fiveopenToday0h 0mTotal0h 0mEstimated10m0h 0mGG# Served task fiveopenToday0h 0mTotal0h 0mEstimated10m'
	];
	await expect.poll(() => cardTexts(page, 'Served task'), { timeout: 30_000 }).toEqual(cards);

	const snap = await snapshot(page);
	await expect(page.getByText(SERVED_NAME, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	await expect(page.getByText(memberCountText(5), { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	expect(snap.h3Shown).toEqual(['A', 'C', 'D', 'E', 'G']);
	expect(snap.h3Total).toBe(10);

	// the badge of each card, in card order: running, explicitly paused, a recent heartbeat, an inactive account, an idle member
	const presence = [
		EN.timer.presence.RUNNING,
		EN.timer.presence.PAUSE,
		EN.timer.presence.ONLINE,
		EN.timer.presence.IDLE,
		EN.timer.presence.IDLE
	];
	const tips: string[] = [];
	for (let index = 0; index < 5; index += 1) tips.push((await badgeTooltip(page, index)).tip);
	expect(tips).toEqual(presence);
	// Finding 2: `timer-status.tsx:143-145` claims "a public view never shows presence" because the payload carries no
	// heartbeat. Served one that does (`lastSeenAt` inside the 3-minute window) and the badge reads `Online`. The real
	// endpoint may never send that field; what is pinned is what the view does with it.
	expect(tips[2]).toBe(EN.timer.presence.ONLINE);
	// and an inactive member is never `Suspended` here: `isSuspended` needs `!publicTeam` (`timer-status.tsx:96`)
	expect(tips[3]).not.toBe(EN.timer.presence.SUSPENDED);

	// the member row prints the initial only (`user-info.tsx:73`) and no e-mail line at all (`:97-110`)
	const hidden = await bodyContains(page, [
		'Ada Byron',
		'Curtis Day',
		'Dana East',
		'Epita Farid',
		'Gil Hall',
		'ada@example.test',
		'curtis@example.test',
		'dana@example.test',
		'epita@example.test',
		'gil@example.test'
	]);
	expect(hidden.map((entry) => entry[1])).toEqual(hidden.map(() => false));
	expect(hidden.map((entry) => entry[2])).toEqual(hidden.map(() => false));

	// one control per card, each carrying its own task's estimate (`-probe-17.log` J1 `estimates`)
	expect((await estimateLabels(page)).slice().sort()).toEqual(
		['Estimate: 1h 30m', 'Estimate: 15m', 'Estimate: 20m', 'Estimate: 5m', 'Estimate: 10m'].sort()
	);
	expect(snap.badgesShown).toBe(5);
	// nobody here tracks outside the team (`isTrackingOutsideTeam`), so the page sent no timer read
	expect(snap.estimateButtons.every(([, disabled]) => disabled === false)).toBe(true);
	expect(consoleFindings(shield)).toEqual([]);
	report('served team', { cards, tips, servedReads: served.length, estimates: await estimateLabels(page) });
});

/**
 * The team-management controls, counted on the public page and on the signed-in team card view. `-probe-11.log` D2
 * (signed out: none) vs `-probe-11.log` D3 (signed in: `Invite`, the `View` tablist with its four tabs, the activity
 * toggles, `draggable="true"` handles, visible `More options`).
 */
test('3 what a public visitor cannot reach, counted against the signed-in controls', async ({
	anon,
	app,
	fixture,
	page
}) => {
	pollingOff(page);
	await anon(teamPath(fixture));
	await expect.poll(async () => (await snapshot(page)).h1Shown, { timeout: 30_000 }).toEqual([fixture.names.teamA]);

	const visitor = await snapshot(page);
	expect(visitor.inviteShown).toBe(0);
	expect(visitor.tablists).toEqual([]);
	expect(visitor.tabsShown).toEqual([]);
	expect(visitor.srOnlyShown).toEqual([]);
	expect(visitor.moreOptionsShown).toBe(0);
	expect(visitor.pickers).toEqual([]);
	expect(visitor.draggable).toEqual([
		['false', true],
		['false', true],
		['false', true]
	]);

	const home = await app('/');
	await expect.poll(async () => (await snapshot(home)).h1Shown, { timeout: 30_000 }).toEqual([fixture.names.teamA]);
	const manager = await snapshot(home);
	expect(manager.inviteShown).toBeGreaterThan(0);
	expect(manager.tablists.some(([label, shown]) => label === T.VIEW && shown)).toBe(true);
	expect(manager.tabsShown.filter((name) => [T.CARDS, T.TABLE, T.BLOCKS, T.KANBAN].includes(name))).toEqual([
		T.CARDS,
		T.TABLE,
		T.BLOCKS,
		T.KANBAN
	]);
	// every entry of `srOnlyShown` is a `common.ACTIVITY_FOR_TODAY` label by construction (`SNAPSHOT` above)
	expect(manager.srOnlyShown.length).toBeGreaterThan(0);
	expect(manager.draggable.some(([value, shown]) => value === 'true' && shown)).toBe(true);
	expect(manager.moreOptionsShown).toBeGreaterThan(0);

	report('control census', { visitor, manager });
});

/**
 * A public link that the server answers with a **200 body carrying `status: 404`** — the shape Gauzy uses for an
 * unknown or disabled link (`page.tsx:25` comment, `public-organization-team.schema.ts:20` keeps the field). That is the
 * only route to `notFound()` (`page.tsx:89-91`), and the boundary `app/[locale]/not-found.tsx` renders with the
 * translated labels. `-probe-11.log` D1 (the copy that rendered, `docStatus 200`, `h1 []`, 2 reads, no console error).
 */
test('4 a 200 answer carrying status 404 renders the not-found page', async ({ anon, fixture, page, shield }) => {
	const MISSING_NAME = 'Missing Public Team';
	const t = servedTeam(fixture, { name: MISSING_NAME });
	const member = t.employeeOf(uuidOf('ptr4-e1'), uuidOf('ptr4-u1'), 'Ada', 'Byron', 'ada@example.test');
	const task = t.taskOf(uuidOf('ptr4-t1'), 'Served task one', 5400, [member]);
	const body = { ...t.team([t.memberOf(uuidOf('ptr4-m1'), member, { activeTaskId: task.id })], [task]), status: 404 };

	pollingOff(page);
	const served = await servePublicTeam(page, () => ({ kind: 'team', body }));
	await anon(teamPath(fixture));

	await expect(page.getByRole('link', { name: EN.pages.taskDetails.GO_BACK_HOME }).first()).toBeVisible({
		timeout: 30_000
	});
	await expect(page.getByText(EN.pages.page404.HEADING_TITLE, { exact: true }).first()).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByText(EN.pages.page404.HEADING_DESCRIPTION, { exact: true }).first()).toBeVisible({
		timeout: 15_000
	});
	await expect(page.getByRole('link', { name: EN.pages.taskDetails.GO_BACK_HOME }).first()).toHaveAttribute(
		'href',
		'/'
	);

	const snap = await snapshot(page);
	expect(snap.h1Shown).toEqual([]);
	expect(snap.h3Shown).toEqual([]);
	expect(page.url()).toBe(`${APP_ORIGIN}/team/${fixture.ids.teamA}/${fixture.profileLink}`);
	expect(shield.documents().at(-1)?.status).toBe(200);
	await expect.poll(() => served.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
	expect(consoleFindings(shield)).toEqual([]);
	report('status 404 payload', { reads: served.length, relations: served.map((call) => call.relations[0]) });
});

/**
 * A read that fails is **not** a not-found page (finding 3): the client throws, `ensurePublicTeamQueryData` resolves the
 * failure to `undefined` (`use-public-organization-teams.ts:33`) and `!publicTeamData` keeps the skeleton
 * (`page.tsx:93-95`). `-probe-5.log` A3 (all four shapes) and `-probe-12.log` E2 (the whole console line of an armed 500,
 * `role="status" aria-busy="true"` reading `Loading`, and 2 answers in a 13 s window).
 */
test('5 a refused or rejected read leaves the loading skeleton', async ({ anon, fixture, page, shield }) => {
	let current: ServedScript = { kind: 'refusal', status: 404, message: 'Public link not found' };
	const served = await servePublicTeam(page, () => current);
	pollingOff(page);

	const cases: Array<{ label: string; script: ServedScript }> = [
		{ label: 'HTTP 404', script: { kind: 'refusal', status: 404, message: 'Public link not found' } },
		{ label: 'HTTP 500', script: { kind: 'refusal', status: 500, message: 'Gauzy exploded' } },
		{ label: 'a body the schemas reject', script: { kind: 'raw', body: '{"members":"not-an-array","name":42}' } }
	];

	for (const item of cases) {
		current = item.script;
		const before = served.length;
		await anon(teamPath(fixture));
		// a failed read is retried by the client at most once per stale window, so poll the log, never read it once
		await expect.poll(() => served.length, { timeout: 20_000 }).toBeGreaterThan(before);
		await expect(page.locator('[role="status"]').first()).toHaveAttribute('aria-busy', 'true', { timeout: 15_000 });
		await expect(page.locator('[role="status"]').first()).toContainText(EN.common.LOADING, { timeout: 15_000 });
		const snap = await snapshot(page);
		expect(snap.h1Shown).toEqual([]);
		expect(snap.cardsShown.filter((text) => text.includes('Today'))).toEqual([]);

		if (item.label === 'HTTP 500') {
			const settled = served.length;
			// quiet window: proves the interval's ticks did not each re-send the failing read
			// (`use-public-organization-teams.ts:22-26` — "A query in error is not refetched on every tick")
			await page.waitForTimeout(13_000);
			expect(served.length).toBe(settled);
		}
	}

	const armed404 = armedHttpError(fixture.profileLink, fixture.ids.teamA, 404);
	const armed500 = armedHttpError(fixture.profileLink, fixture.ids.teamA, 500);
	const errors = shield.consoleErrors();
	report('refused reads', {
		answers: served.length,
		armed: errors.filter((line) => armed404(line) || armed500(line)).length,
		rejected: errors.filter(validationFailure).length,
		// the lines themselves, so a run that disagrees prints what the console really said
		lines: errors.map((line) => line.slice(0, 140))
	});
	// the client names the path and the armed status it was told to expect, and the service names a rejected body
	expect(errors.filter(armed404).length).toBeGreaterThan(0);
	expect(errors.filter(armed500).length).toBeGreaterThan(0);
	expect(errors.filter(validationFailure).length).toBeGreaterThan(0);
	expect(consoleFindings(shield, [armed404, armed500, validationFailure])).toEqual([]);
});

/**
 * The `profileLink` shapes a shared link can arrive in. The browser normalizes the dot forms before Next sees them, the
 * document comes back 404 with the **root** boundary's English defaults, and no public-team read was sent at all
 * (`-probe-2.log` P1 variant lines, `-probe-11.log` D4). The 400 guard of `app/api/public/team/**` is not in this path
 * (header), which is why these are browser-normalized 404s rather than refused links.
 */
test('6 a malformed profileLink never reaches the API', async ({ fixture, mock, page, shield }) => {
	/** `core/components/pages/404/index.tsx:27-31` — the root boundary's own default, not a translated one. */
	const ROOT_404_ACTION = 'Go back to home';

	for (const link of ['.', '..', '%2e', '%2e%2e', '..%2F']) {
		const response = await page.goto(`${APP_ORIGIN}/team/${fixture.ids.teamA}/${link}`, {
			waitUntil: 'domcontentloaded'
		});
		expect(response?.status(), `link ${link}`).toBe(404);
		await expect(page.getByText(EN.pages.page404.HEADING_TITLE, { exact: true }).first()).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByText(EN.pages.page404.HEADING_DESCRIPTION, { exact: true }).first()).toBeVisible({
			timeout: 15_000
		});
		await expect(page.getByRole('link', { name: ROOT_404_ACTION }).first()).toBeVisible({ timeout: 15_000 });
	}
	expect(await mock.calls(PUBLIC_TEAM_ROUTE)).toHaveLength(0);

	// an encoded multi-segment link is an ordinary link: the mock answers any link the page asks for
	const other = await page.goto(`${APP_ORIGIN}/team/${fixture.ids.teamA}/a%2Fb%2Fc`, {
		waitUntil: 'domcontentloaded'
	});
	expect(other?.status()).toBe(200);
	await expect.poll(async () => (await snapshot(page)).h1Shown, { timeout: 30_000 }).toEqual([fixture.names.teamA]);
	expect((await mock.calls(PUBLIC_TEAM_ROUTE)).length).toBeGreaterThan(0);
	expect(consoleFindings(shield)).toEqual([]);
	report('malformed links', { browserUrls: shield.documents().map((document) => document.url) });
});

/**
 * A signed-in visitor who **is** a member of the team is sent away: `page.tsx:49-55` matches `getActiveUserIdCookie()`
 * against `members[].employee.userId` and calls `router.replace('/')`. The mock's own public-team answer carries the
 * fixture user as a member (`mock-gauzy-server.mjs:120-135`, its `employee.userId` = `fixture.ids.user`), so this case
 * needs no stub. `-probe-9.log` C6 (final URL `/`, two public-team reads, the Strict-Mode invite cancellation the shield
 * already excuses).
 */
test('7 a member of the team is redirected to / after the member list', async ({
	app,
	fixture,
	mock,
	page,
	shield
}) => {
	pollingOff(page);
	await app(teamPath(fixture));

	await expect(page).toHaveURL(`${APP_ORIGIN}/`, { timeout: 30_000 });
	const reads = await publicTeamReads(mock);
	expect(reads.filter((read) => read.relations[0] === 'tasks').length).toBeGreaterThanOrEqual(1);
	expect(reads.filter((read) => read.relations[0] === 'statuses').length).toBeGreaterThanOrEqual(1);
	const settled = (await publicTeamReads(mock)).length;
	// quiet window: after the redirect the page sent no further public-team read (polling is off, and it unmounted)
	await page.waitForTimeout(6_000);
	expect((await publicTeamReads(mock)).length).toBe(settled);
	expect(consoleFindings(shield)).toEqual([]);
	report('member redirect', { url: page.url(), reads });
});

/**
 * A signed-in visitor who is **not** a member keeps the public page — with the initials-only row, and with their own
 * workspace's invitation cards printed on it (finding 7). `-probe-16.log` H1 / H2 / H3: the same visit three times, one
 * census every 2 s for 20 s — 2 cards, 1 of 4 `More options` visible, no tablist, no `Invite`, `draggable`
 * `[['false', true]]`, the served name and e-mail absent from the rendered text and from the markup; and `-probe-14.log`
 * F2 (the same page once the shell is up, its `1 member` label and the two cards). Only the row's *identity* and its two
 * time cells are pinned: which task and estimate stand next to them flips between runs (finding 8), and the test prints
 * them on its `MEASURE` line instead of asserting them. The invitation content is the mock's own fixture
 * (`invited@example.test` at `cypress/support/mock-gauzy-server.mjs:662-670`); `Pending` is
 * `modals.invite.PENDING_STATUS` and `Task title` is `common.TASK_TITTLE`
 * (`core/components/teams/invite/user-invite-card.tsx:85`).
 */
test('8 a signed-in visitor who is not a member keeps the page and sees their own invitations', async ({
	fixture,
	mock,
	page,
	shield
}) => {
	const OTHER_NAME = 'Other Public Team';
	const t = servedTeam(fixture, { name: OTHER_NAME });
	const outsider = t.employeeOf(uuidOf('ptr8-e1'), uuidOf('ptr8-u1'), 'Olga', 'Outsider', 'olga@example.test');
	// No task and no totals in the served payload: whatever the row then prints, it cannot have come from this payload,
	// which is the thing this test proves. A payload that does carry them printed the served `Today 0h 10m Total 0h 20m`
	// in one run and `0h 0m / Estimated -` in another (finding 8).
	const body = t.team([t.memberOf(uuidOf('ptr8-m1'), outsider, { isManager: true })], []);

	pollingOff(page);
	await servePublicTeam(page, () => ({ kind: 'team', body }));
	await signInAndVisit(page, fixture, teamPath(fixture), { requireShell: false });

	await expect.poll(async () => (await snapshot(page)).h1Shown, { timeout: 30_000 }).toEqual([OTHER_NAME]);

	/**
	 * What this row provably does **not** come from the served team: both labelled time cells read `0h 0m`, and they do
	 * so in every state the row was measured in (`-probe-16.log` H1 / H2 / H3, `s3-lane-b-publicteam-0d.log`,
	 * `-0e.log`, `-0f.log`). Which task and estimate sit next to them is decided by which write lands last — the reader's
	 * own fixture task with `Estimate: 1h` (`-probe-16.log`, `-0e.log`) or nothing at all with `Estimated -`
	 * (`-0d.log`, `-0f.log`) — and the loser is never rewritten, so those two cells are pinned nowhere (finding 8).
	 */
	const timeCells = `${T.TODAY}0h 0m${T.TOTAL}0h 0m`;
	await expect.poll(() => cardTexts(page, timeCells), { timeout: 30_000 }).toHaveLength(1);

	const snap = await snapshot(page);
	expect(snap.h3Shown).toEqual(['O']);
	// the member row twice, plus the reader's invitation card twice (`team-members-card-view.tsx:159-166`)
	expect(snap.h3Total).toBe(4);
	expect(snap.cardsShown).toHaveLength(2);
	// initials only — the served member's own name and e-mail are absent from the text and from the markup
	expect(snap.cardsShown[0].startsWith('OO')).toBe(true);
	expect(snap.cardsShown[0].includes(timeCells)).toBe(true);
	expect(await bodyContains(page, ['Olga Outsider', 'olga@example.test'])).toEqual([
		['Olga Outsider', false, false],
		['olga@example.test', false, false]
	]);

	// the reader's own invitation card: `Pending` is `modals.invite.PENDING_STATUS`, `Task title` is `common.TASK_TITTLE`
	// (`user-invite-card.tsx:85`), the three cells after it are that component's `NO_VALUE` dash (`:129`), and the e-mail
	// is the mock's own invitation fixture (`cypress/support/mock-gauzy-server.mjs:662-670`)
	expect(
		snap.cardsShown[1].startsWith(`${EN.modals.invite.PENDING_STATUS}invited@example.test${T.TASK_TITTLE}`)
	).toBe(true);

	// and none of what a member of that team would have been offered
	expect(snap.moreOptionsShown).toBe(1);
	expect(snap.moreOptionsTotal).toBe(4);
	expect(snap.tablists).toEqual([]);
	expect(snap.inviteShown).toBe(0);
	expect(snap.draggable).toEqual([['false', true]]);
	expect((await mock.calls('/api/invite')).length).toBeGreaterThan(0);
	expect(consoleFindings(shield)).toEqual([]);
	report('signed-in stranger', {
		cards: snap.cardsShown,
		estimates: snap.estimateButtons.filter((entry) => entry[2]).map((entry) => entry[0]),
		invites: (await mock.calls('/api/invite')).length
	});
});

/**
 * Polling, both ways. With `conf-is-data-sync` unset the flag parses to **true** (`settings-data-sync.ts:16-19`) and
 * `page.tsx:83-84` arms a 10 s and a 30 s interval — yet the page still sent 2 reads and nothing more in a 13 s window
 * (`-probe-8.log` B5 flag `null`, timeline `3073ms GET rel0=tasks / 3078ms GET rel0=statuses`), because every tick goes
 * through `ensureQueryData`, which answers from the cache until `PUBLIC_TEAM_STALE_TIME` passes 5 minutes
 * (`use-public-organization-teams.ts:19`). With the flag off the interval never starts (`use-refresh-interval.ts`) and the
 * observable result is the same (`-probe-7.log` A7). So the two states are indistinguishable inside a test run; the
 * 5-minute window itself is past the budget (finding 5).
 */
test('9 the refresh interval repeats nothing inside the stale window', async ({ anon, fixture, mock, page }) => {
	await anon(teamPath(fixture));
	expect(await page.evaluate(() => window.localStorage.getItem('conf-is-data-sync'))).toBe(null);
	await expect
		.poll(async () => (await mock.calls(PUBLIC_TEAM_ROUTE)).length, { timeout: 30_000 })
		.toBeGreaterThanOrEqual(2);
	const armed = (await mock.calls(PUBLIC_TEAM_ROUTE)).length;
	// quiet window: proves no third read arrived while the cached answer was inside its 5-minute stale window
	await page.waitForTimeout(13_000);
	expect((await mock.calls(PUBLIC_TEAM_ROUTE)).length).toBe(armed);

	await mockReset();
	pollingOff(page);
	await anon(teamPath(fixture));
	expect(await page.evaluate(() => window.localStorage.getItem('conf-is-data-sync'))).toBe('false');
	await expect
		.poll(async () => (await mock.calls(PUBLIC_TEAM_ROUTE)).length, { timeout: 30_000 })
		.toBeGreaterThanOrEqual(2);
	const quiet = (await mock.calls(PUBLIC_TEAM_ROUTE)).length;
	// quiet window: the same, with no interval started at all
	await page.waitForTimeout(13_000);
	expect((await mock.calls(PUBLIC_TEAM_ROUTE)).length).toBe(quiet);

	report('polling', { flagOn: armed, flagOff: quiet });
});

/**
 * The estimate field a **signed-out** visitor is given, and what its Save does (finding 1). `[MEASURED, NOT INTENDED]`:
 * `task-estimate.tsx:78-82` — "Without the right to edit it is plain text, so a field always means \"editable\"" — and
 * `…/user-team-card/task-estimate.tsx:71-73` turns `showEditAndSaveButton` into `Boolean(task)` because the card passes
 * `allowEmptyTask={false}` (`user-team-card/index.tsx:326`). `-probe-7.log` A2 (the pill's state before and after the
 * click), `-probe-8.log` B6 and `-probe-9.log` C4 (`PUT mock /api/tasks/<taskId>`, the card then reading `Estimate: 7h 30m`).
 */
test('10 the estimate pill a public visitor can open, and the PUT its Save sends', async ({
	anon,
	fixture,
	page,
	shield
}) => {
	const SERVED_NAME = 'Served Public Team';
	const t = servedTeam(fixture, { name: SERVED_NAME });
	const member = t.employeeOf(uuidOf('ptrA-e1'), uuidOf('ptrA-u1'), 'Ada', 'Byron', 'ada@example.test');
	const task = t.taskOf(uuidOf('ptrA-t1'), 'Served task one', 5400, [member]);
	const body = t.team([t.memberOf(uuidOf('ptrA-m1'), member, { activeTaskId: task.id })], [task]);

	const writes = watchWrites(page);
	pollingOff(page);
	await servePublicTeam(page, () => ({ kind: 'team', body }));
	await anon(teamPath(fixture));

	const pill = page.getByRole('button', { name: `${T.ESTIMATE}: 1h 30m` }).first();
	await expect(pill).toBeVisible({ timeout: 30_000 });
	await expect(pill).toBeEnabled();
	await expect(pill).toHaveAttribute('aria-expanded', 'false');

	await pill.click({ timeout: 15_000 });
	const hours = page.getByRole('textbox', { name: T.HOURS }).first();
	await expect(hours).toBeVisible({ timeout: 15_000 });
	await expect(page.getByRole('textbox', { name: T.MINUTES }).first()).toBeVisible({ timeout: 15_000 });
	const save = page.getByRole('button', { name: T.SAVE, exact: true }).first();
	await expect(save).toBeVisible({ timeout: 15_000 });
	expect(writes).toEqual([]);

	await hours.fill('7', { timeout: 15_000 });
	await save.click({ timeout: 15_000 });
	await page.mouse.move(2, 2);
	await expect.poll(() => writes.slice(), { timeout: 20_000 }).toEqual([`PUT /api/tasks/${task.id}`]);
	await expect.poll(() => estimateLabels(page), { timeout: 20_000 }).toContain(`${T.ESTIMATE}: 7h 30m`);
	expect(consoleFindings(shield)).toEqual([]);
	report('estimate save', { writes, estimates: await estimateLabels(page) });
});

/**
 * One served member whose timer runs **outside** this team adds a read of its own: `isTrackingOutsideTeam`
 * (`team-member-tracking.ts`) enables `useTodaySecondsWithoutTeam`, which sends `GET /api/timesheet/timer/status/worked`
 * carrying only `employeeIds[0]=<that employee id>` on an unauthenticated visit (`timer.service.ts:325-332`;
 * `-probe-8.log` B2, `-probe-9.log` C3). The labelled `Today` / `Total` cells stay `0h 0m` (`-probe-12.log` E1); what the
 * read does to the card's extra unlabelled summary cell was **not stable** between runs (finding 9), so it is not
 * asserted. The same member with `timerStatus: 'running'` is not an outsider and sends no such read (`-probe-8.log` B1
 * `worked read []`).
 */
test('11 a member whose timer runs outside the team costs one extra read', async ({ anon, fixture, page, shield }) => {
	const SERVED_NAME = 'Served Public Team';
	const t = servedTeam(fixture, { name: SERVED_NAME });
	const outsider = t.employeeOf(uuidOf('ptrB-e1'), uuidOf('ptrB-u1'), 'Ada', 'Byron', 'ada@example.test', {
		isOnline: true,
		isTrackingTime: true
	});
	const task = t.taskOf(uuidOf('ptrB-t1'), 'Outside team task', 1200, [outsider]);
	const employeeId = outsider.id;
	const membersFor = (timerStatus: string) => [
		t.memberOf(uuidOf('ptrB-m1'), outsider, { timerStatus, activeTaskId: task.id })
	];
	let timerStatus = 'pause';

	pollingOff(page);
	const worked = await serveWorked(page, []);
	await servePublicTeam(page, () => ({ kind: 'team', body: t.team(membersFor(timerStatus), [task]) }));

	await anon(teamPath(fixture));
	await expect.poll(() => worked.length, { timeout: 20_000 }).toBeGreaterThan(0);
	const read = worked[0];
	expect(read.method).toBe('GET');
	expect(read.path).toBe(WORKED_ROUTE);
	const params = new URLSearchParams(read.params);
	expect(params.get('employeeIds[0]')).toBe(employeeId);
	expect(Array.from(params.keys())).toEqual(['employeeIds[0]']);
	await expect.poll(() => cardTexts(page, task.title), { timeout: 20_000 }).toHaveLength(1);
	const card = (await cardTexts(page, task.title))[0];
	expect(card).toContain(`${T.TODAY}0h 0m${T.TOTAL}0h 0m`);

	// the same member, now filed under the team: no outsider, so no worked read
	timerStatus = 'running';
	const before = worked.length;
	await anon(teamPath(fixture));
	await expect.poll(() => cardTexts(page, task.title), { timeout: 20_000 }).toHaveLength(1);
	// quiet window: proves the second visit sent no worked read of its own
	await page.waitForTimeout(2_000);
	expect(worked.length).toBe(before);
	expect(consoleFindings(shield)).toEqual([]);
	report('outside-team read', { worked });
});

/**
 * A served team flagged `public: false`: the client never looks at the flag it is named after, so the page renders as
 * the public team page (finding 10, `-probe-9.log` C5 — `h1 "Not A Public Team"` and the `Public view` badge). Note for
 * anyone reading this file: Next's flight payload is a `<script>` inside `<body>`, so `body.textContent` can contain the
 * words `Page not found` on a page that renders none — every "is it rendered" assertion here reads rendered elements.
 */
test('12 a served team flagged public:false renders as the public page anyway', async ({
	anon,
	fixture,
	page,
	shield
}) => {
	const NOT_PUBLIC = 'Not A Public Team';
	const t = servedTeam(fixture, { name: NOT_PUBLIC, publicFlag: false });
	const member = t.employeeOf(uuidOf('ptrC-e1'), uuidOf('ptrC-u1'), 'Ada', 'Byron', 'ada@example.test');
	const task = t.taskOf(uuidOf('ptrC-t1'), 'Private team task', 600, [member]);
	const body = t.team([t.memberOf(uuidOf('ptrC-m1'), member, { activeTaskId: task.id })], [task]);

	pollingOff(page);
	const served = await servePublicTeam(page, () => ({ kind: 'team', body }));
	await anon(teamPath(fixture));

	await expect.poll(async () => (await snapshot(page)).h1Shown, { timeout: 30_000 }).toEqual([NOT_PUBLIC]);
	await expect(page.getByText(EN.profile.page.PUBLIC_VIEW, { exact: true }).first()).toBeVisible({ timeout: 15_000 });
	const snap = await snapshot(page);
	expect(snap.h1Shown).toEqual([NOT_PUBLIC]);
	expect(snap.h3Shown).toEqual(['A']);
	expect(snap.cardsShown.filter((text) => text.includes(task.title))).toHaveLength(1);
	expect(page.url()).toBe(`${APP_ORIGIN}/team/${fixture.ids.teamA}/${fixture.profileLink}`);
	expect(shield.documents().at(-1)?.status).toBe(200);
	await expect.poll(() => served.length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
	expect(consoleFindings(shield)).toEqual([]);
	report('public false', { h1: snap.h1Shown, reads: served.length });
});
