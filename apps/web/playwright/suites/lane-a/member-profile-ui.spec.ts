/**
 * A member's work profile (`/profile/<memberId>`) driven through a browser, against the lane's mock, with the
 * screenshots, the apps/sites rows, the member's worked figures and the overlap lookup served by this file.
 *
 * This file covers what the page **shows and sends**. Who may read whose profile, as API traffic, is pinned by
 * `suites/mock/profile-activity.spec.ts`, and the route gate by `suites/lane-d/page-gate-lane.spec.ts`; neither is
 * repeated here.
 *
 * ## What is real and what is served
 *
 * Real: the route `app/[locale]/(main)/profile/[memberId]/page.tsx` (the month summary `:146-151`, `statsCount`
 * `:155-157`, `isActivityViewVisible` `:244`, `ProfileTimer` / `TrackingOffNotice` `:253-255`, the back link `:269`,
 * `LazyUserProfileDetail` + `LazyTaskFilter` `:277-286`, `unreadableMemberValidation` `:229-242`); the tab bar built in
 * `core/hooks/tasks/use-task-filter.ts` (tabs `:200-235`, hook-local `canSeeActivity` `:105-108`, persisted tab
 * `:112`, first-load auto-pick `:283-299`, filtering `:319-341`) and `core/hooks/organizations/teams/use-auth-team-tasks.ts`
 * (`assigned`/`unassigned` `:21-33`, `workedTasks` `:49-59`); the band `core/components/pages/profile/user-profile-detail.tsx`
 * (`ProfileEmail` `:188-229`, `ProfileSummaryCard` `:231-269`, `OwnTimerCard` `:292-302`, `ProfileFigures` `:350-382`,
 * `useLastActiveLabel` `:384-400`) drawn through `core/components/dashboards/kit/metric-strip.tsx:165-205`; the tab
 * bodies `core/components/pages/profile/user-profile-tasks.tsx` (`ActivityViewSwitch` `:261-272`, `TaskTabBody`
 * `:274-316`, `DeferredTaskCard` `:366-388`, `NoMatchingTasks` `:391-419` with `noMatchTitleKey` `:122-131`,
 * `EmptyTaskTab` `:422-431`, `TaskList` `:441-495`, `TaskRows` `:502-513`); the row figures
 * `core/components/tasks/task-times.tsx:41-77`; the actions `core/components/pages/profile/profile-actions.tsx:41-79`
 * and `core/components/features/manual-time/add-manual-time-modal.tsx` (guard `:265-276`, check error `:887`); the
 * screenshots `core/components/pages/profile/screenshots/screenshoots.tsx` (head line `:81-97`, day `:108-150`,
 * `ScreenshootTab` `:163-183`) and `screenshots/screenshot-item.tsx` (`DeleteSlotButton` `:104-170`, tile `:205-245`);
 * the apps/sites rows `core/components/pages/profile/activity-share-groups.tsx:61-148`, `visited-Item.tsx:139-176` and
 * the grouping `core/lib/helpers/array-data.ts:27-53`; the calendar `core/components/activities/activity-calendar.tsx`
 * (`yearRequestOf` `:54-59`, `YearBody` `:119-141`, `YearFiguresLine` `:142-169`, `MonthRows` `:172-197`, `YearMenu`
 * `:230-263`, `LevelLegend` `:266-283`) and `activity-year-grid.tsx` (`DAY_TRACKED` `:106`, sr-only table `:280-281`,
 * `GRID_LABEL` `:380`, `role="slider"` `:393-399`); the plans tab `core/components/users/user-profile-plans.tsx`
 * (`planViewItems` — the sub-tab labels and counts — `:352-356`, the tab views `:379-427`, the `Plans to show`
 * control `:440-452`); the hooks
 * `core/hooks/activities/use-time-slots.ts` (params `:33-47`, authorization `:51-64`, delete `:136-158`,
 * `canDeleteTimeSlots` `:178-182`), `core/hooks/activities/use-time-daily-activity.ts:25-48`,
 * `core/hooks/calendar/time-taken-on-server.ts:81-92` and `core/hooks/timesheet/use-time-overlap-guard.ts:40-113`; the
 * services `core/services/client/api/timesheets/statistic.service.ts:59-265`,
 * `core/services/client/api/activities/activity.service.ts:109-150`,
 * `core/services/client/api/timesheets/time-slot.service.ts:20-50` and
 * `core/services/client/api/timesheets/time-log.service.ts:198-265`; the schemas
 * `core/types/schemas/activities/statistics.schema.ts:4-14`, `activity.schema.ts:91-100`,
 * `core/types/schemas/timer/time-slot.schema.ts:56-80`; the shell, the cookies, next-intl, TanStack Query and Jotai.
 * Served by `page.route` on the mock origin (restating the mock's own CORS headers `mock-gauzy-server.mjs:1087-1096`
 * and answering `OPTIONS` with 204, the way `api-tokens-settings-ui.spec.ts:228-345` does — no stub here calls
 * `route.fetch()`), because the mock answers nothing usable for them:
 * `GET|DELETE /api/timesheet/statistics/time-slots` and `/api/timesheet/time-slot` → `[]` / `{success:true}`
 * (`mock-gauzy-server.mjs:802`, `:759`, catch-all `:893-895`) while `timeSlotDataRequestSchema`
 * (`timer/time-slot.schema.ts:56-80`) wants an employee array with `timeSlots[]` and `deleteTimeSlotsResponseSchema`
 * (`:80`) wants a boolean — served here as a store-backed list (tests 3);
 * `GET /api/timesheet/activity/daily` has no handler at all (catch-all `pagination([])`, `:893-895`) — served with
 * this file's own rows (test 4);
 * `GET /api/organization-team` answers the fixture team whose members carry `totalTodayTasks: []` /
 * `totalWorkedTasks: []` (`:214-215`), which is why Worked is empty as the mock stands — served with this file's own
 * figures (tests 2, 5);
 * `GET /api/timesheet/time-log/conflict` has no handler, so the mock answers `pagination([])` where
 * `getTimeLogConflicts` validates `timeLogConflictSchema.array()` (`time-log.service.ts:251-258`) — served as `[]` in
 * test 13 so the save is allowed to run, and left to the mock in test 12 to show what a refused lookup does;
 * `POST /api/timesheet/time-log` is answered by the catch-all echoing the request body (`:893-895`), which
 * `timeLogSchema` refuses (`time-log.service.ts:212`) — measured in test 13, and the answer is not served because the
 * test pins the request the browser sent.
 * Every other read the shell and the page make (user, teams, tasks, timer, daily plans, notifications, languages, …)
 * is answered by the mock itself.
 *
 * ## Where every number came from
 *
 * `/d/Coding/.tmp/probe-profile/` probes 1-12, logged as `/d/Coding/.tmp/s3-lane-a-profile-probe-1.log` …
 * `-probe-12.log`
 * (`probe1` P1-P8 the band, tabs, mount reads, Planned; `probe2` Q1-Q12 the sub-tabs, the yearly read, the Stats
 * figures and month rows, the filter bar, the other members' profiles, the unknown id, both armed 500s, the served
 * apps/sites rows, the served screenshots, the served Worked row; `probe3` R1-R9 the row text, the assign PUT, the Add
 * time modal, the delete flow, the Planned tab, the e-mail copy; `probe4` T1-T6 a drawn row, the filter menu, the
 * Planned tab in full, the modal's inputs; `probe5` S1-S3 the status options, a refused duration, a row whose member
 * figures are both non-zero; `probe6` U1-U3 the search box, the menu items, an invalid duration; `probe7` V1-V2 the
 * menu opened the right way, the failed overlap lookup; `probe8` W1-W2 the filter in one direction and the Add time
 * POST body; `probe9` X1-X5 what the first whole-file run disagreed with (the copy button's own text, the timer
 * surfaces, the activity rows, the filter menu's portal, the duration hint); `probe10` Y1-Y4 the same five read
 * through the components' own classes and landmarks; `probe11` Z1-Z2 the pressed copy state read in a single tick and
 * the Apps / sites groups with exactly the shape this file serves; `probe12` Z3-Z5 the assertion shapes tests 1, 8 and
 * 9 now use.) Each test below prints what it asserts as a `MEASURE` line, so the run logs carry the same numbers a
 * second time.
 *
 * ## The data this file serves
 *
 * Dates come from served data only and are relative to today: `atClock(dayOffset, hours, minutes)` is a local clock
 * time of a day counted from today, activity rows
 * sit at whole/quarter hours of **today** in the machine's own zone (`Intl.DateTimeFormat().resolvedOptions()` reads
 * it, nothing here is hard-coded), time slots sit `now - 90 min … now - 40 min`. The two fixture people are the
 * mock's own: the signed-in user (`fixture.ids.user`, employee `fixture.ids.employee`) and the teammate
 * (`fixture.ids.teammateUser`, `fixture.ids.teammateEmployee`), the team is `fixture.ids.teamA`, the organization
 * `fixture.ids.organizationA`, the tenant `fixture.ids.tenantA`. Durations are seconds; every figure below is what a run
 * printed. The mock's own answers this file does not touch: `activeDays 3`, `totalDuration 10_800`,
 * `firstActiveOn = lastActiveOn = startDate` and, for `includeDaily=true`, `daily: [{ date: startDate, duration: 3600 }]`
 * (`mock-gauzy-server.mjs:780-795`).
 *
 * ## Findings (measured, with the line that explains each)
 *
 * 1. **The row's Today and Total are the member's own figures, not the statistics read.** `POST
 *    /api/timesheet/statistics/tasks` fires on mount (`statistic.service.ts:212-265`, body with
 *    `taskIds:[activeTaskId]`) and again on the Planned tab (`use-get-tasks-stats-data.ts:58,81` through
 *    `user-profile-plans.tsx:430`, body with `employeeIds` only), yet the row figures come from
 *    `useActiveTeamMember(…).totalTodayTasks` / `.totalWorkedTasks` (`task-times.tsx:41-77`). Served 5400 / 10800
 *    seconds on the member → `Today 1h 30m Total 3h 0m`, and the mock's own `[]` answer (`:817`) changed no printed
 *    figure. `durationPercentage` (`statistics.schema.ts:10`) is read only by the weekly-limit and app-url dashboards,
 *    never by a profile component. Test 2.
 * 2. **`Stats <n>` is the employee's `activeDays`, and a refused summary turns it into `Stats 0` and the band figures
 *    into `–`.** `page.tsx:155-157` passes `summaryData.activeDays` as `statsCount`, which the unit test
 *    `core/hooks/activities/use-profile-activity.test.tsx:371-382` pins ("uses the employee activeDays summary for
 *    Stats"). Measured: `Stats 3` with the mock's `activeDays 3`, `Stats 0` plus `This month – Active days – Last
 *    active –` with the read armed 500. Tests 1 and 11.
 * 3. **Which tab is selected at first depends on the served member figures.** The persisted default is `worked`
 *    (`use-task-filter.ts:112`) and the first-load effect auto-picks Worked only when the member has worked tasks
 *    (`:283-299`). Measured: `Unassigned 1|selected=true` on the teammate's profile with the mock as it is, and
 *    `Worked 1|selected=true` once this file served `totalTodayTasks` for that member. Tests 1, 2 and 9.
 * 4. **A search or a status filter sends nothing.** Filtering runs in the browser (`use-task-filter.ts:319-341`): a
 *    non-matching search, a status picked and the way back each added **zero** requests to the mock's log. The tab
 *    chips do not follow the filter either — with the only row hidden the chip still read `Unassigned 1`, while the
 *    `Filter` button grew a badge (`Filter 1`). Test 8.
 * 5. **`hour by hour` is not what the apps/sites grouping does.** `activity-share-groups.tsx:61` ("The day's entries
 *    by hour … the latest hour first") and `:86-89` ("Today's apps or visited sites, hour by hour") describe an hour
 *    per group, but the group key is the row's own clock text cut to the minute (`getActivityHour` →
 *    `app.time.slice(0,5)`, `array-data.ts:27-29`, used at `:31-53`), while the label is a whole hour
 *    (`hourLabelOf(start, start+1)`, `activity-share-groups.tsx:50-59`). Served `14:23` and `14:05` — same hour,
 *    different minutes — printed **two** sections both labelled `2:00 – 3:00 PM`. `[MEASURED, NOT INTENDED]` Test 4.
 * 6. **Add time cannot save as the mock stands, and the page says why in two different places.** Saving first asks
 *    what the entry would overwrite (`use-time-overlap-guard.ts:40-113`; `time-log.service.ts:224-226` "Saving manual
 *    time over them makes the API delete those entries whole, so the dialogs ask this before they save"; "A lookup
 *    that fails saves nothing" `:94`). The mock's catch-all answers that lookup with an object where
 *    `timeLogConflictSchema.array()` wants an array (`time-log.service.ts:251-258`), so nothing is sent and the dialog
 *    shows `We could not check whether this time overlaps time already recorded, so nothing was saved. Try again.`
 *    (`TimeOverlapCheckError`, drawn at `add-manual-time-modal.tsx:887`, described at
 *    `time-overlap-confirm-dialog.tsx:94`) — intended behaviour. Serve the lookup as `[]` and the `POST
 *    /api/timesheet/time-log` leaves the browser with this file's measured body; the mock's echoed answer is then
 *    refused by `timeLogSchema` (`:212`) and the dialog stays open. Tests 12 and 13. `[MEASURED, NOT INTENDED]` for
 *    the mock's answer only: the app's own guard is exactly what its comments say.
 * 7. **The copy button's feedback is an accessible-name swap, never its own text, and the figures strip is not a
 *    `region`.** The button holds only an icon, so its `innerText` is `""` before and after the click; while the
 *    1500 ms pressed state lives (`user-profile-detail.tsx:211-226`: the `copyLabel` / `copyIcon` swap at `:211-214`,
 *    the button at `:222`, the live span at `:224-226`; the window closes at `:196` on `COPIED_MS` = 1500, `:36`) its
 *    `aria-label` and `title` read `Copied`, `getByRole('button', { name: 'Copy email' })` matches **nothing**,
 *    `…{ name: 'Copied' }` matches the button, and a separate `aria-live="polite"` screen-reader-only span prints
 *    `Copied`; no toast appears. Test 1
 *    reads all four in one `expect.poll` because three separate assertions can each land after the window closed.
 *    `getByRole('region', { name: 'Time figures' })` finds nothing because the strip is `role="list"` with
 *    `role="listitem"` cells (`metric-strip.tsx:165-205`), so this file reads the strip by its `aria-label`. Test 1.
 * 8. **`data-timer-surface` is not one component, so it cannot count a timer card.** The profile's own card
 *    (`OwnTimerCard`, `user-profile-detail.tsx:292-302`) and the shell's mini timer (`timer.tsx:452`) both carry the
 *    attribute, and `page.tsx:247-266` picks which one to render: `showsTimer = profileIsAuthUser &&
 *    isTrackingEnabled` for the signed-in member (measured: 1 surface, inside `main`, none inside `header`, text
 *    `Open #1 Fixture active task 00:00:00`), `showsHeaderTimer = !profileIsAuthUser && …` for anyone else (measured:
 *    1 surface inside `header`, text `00:00:00`, `Start timer` present). What a teammate profile does **not** show is
 *    the member's own task line — `OwnTimerCard` needs that member's `activeTaskId` and the mock answers it for the
 *    signed-in user only (`mock-gauzy-server.mjs:207-208`), so the band prints neither `#1` nor the task title.
 *    Tests 1 and 9.
 * 9. **Apps and Visited sites rows are `div`s, not list items.** The task rows below them are `ul li`
 *    (`user-profile-tasks.tsx`), but each activity group is `<section aria-label={hour.label}>` wrapping
 *    `<div className={ROWS_SURFACE}>` with one `<div className="@container">` per row (`activity-share-groups.tsx:129`
 *    and `:134`, `visited-Item.tsx:159-160`), so `section ul li` measures **0** while `section > div > div` measures
 *    one row each. Test 4.
 * 10. **`Clear filters` is not clickable by mouse while the filter menu is open.** Its click is intercepted by the
 *    open menu's portal (`<div role="presentation" data-base-ui-inert="">` inside `<div data-base-ui-portal="">`, two
 *    such portals measured in that state) and Playwright retries until the test times out. Two paths work: clicking
 *    the same status checkbox again, and activating the button from the keyboard (`press('Enter')`). `Escape` closes
 *    the submenu but leaves the portal, so it does not free the button. Test 8.
 * 11. **Not reachable from the profile with the mock as it is, measured rather than forced.** A profile whose view is
 *    not shared (`shareProfileView: false`) is not an empty page: it keeps the `Assigned 0` / `Unassigned 1` tabs, the
 *    name, the e-mail, `Add time`, `Assign task` and the header timer, and drops only the figures strip, `Stats`,
 *    `Worked` and `Active days` (test 9). The *Assigned* tab prints its hint sentence
 *    (`This tab shows all tasks that are assigned to you`, `locales/en.json:3230`). Each tab's hint is a `Tooltip`
 *    label that only mounts while the tooltip is open (`task-filters.tsx:97-98`), so its presence in the page text is
 *    a matter of the moment: the Assigned hint was there in every read, the Unassigned one (`:3231`) was absent in
 *    one run and present in the next. Only the stable half is pinned (test 5); the tooltip's open/close behaviour is
 *    not this file's subject.
 *    The screenshots' *View info* dialog and the *Apps* / *Visited sites* favourite actions are out of scope here:
 *    this file pins the cards and their read, not the dialog's contents. The Stats year grid's arrow-key navigation
 *    is pinned by its `role="slider"` label only (test 7), never by pixel colours.
 * 12. **Screenshot cards come newest-hour-first, and the head figure is the mean of the slots that are left.** The
 *    day is grouped by hour and the groups are sorted `byLatestHourFirst` (`screenshot-slots.ts:99-103`), slots
 *    inside a group ascending (`:101`), so the first card is the newer slot's and deleting it sends *that* slot's id
 *    (`time-slot.service.ts:20-50`, `forceDelete=false`); `Activity <n>%` is `averageActivityOf` over the remaining
 *    slots (`screenshoots.tsx:62-77`), which is why serving 66 % and 33 % printed `Activity 50%` and after the delete
 *    printed the survivor's own `66%`. Two slots 40 minutes apart can share an hour group and flip the card order
 *    with the clock, so test 3 serves them at 09:10 and 14:20 — always two groups. Test 3.
 */
import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockRequests, signInAndVisit, type MockScenario, type StubRequest } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';
import type { Locator, Route } from '@playwright/test';

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1096`), restated for every stub here. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

const answerJson = (route: Route, status: number, body: unknown) =>
	route.fulfill({
		status,
		headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
		body: body === undefined ? '' : JSON.stringify(body)
	});

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/** Text of every match, read in Node one element at a time (no Node helper is ever used inside a browser callback). */
const textsOf = async (locator: Locator) => {
	const count = await locator.count();
	const out: string[] = [];
	for (let i = 0; i < count; i += 1) out.push(flat(await locator.nth(i).innerText()));
	return out;
};

const attrsOf = async (locator: Locator, attribute: string) => {
	const count = await locator.count();
	const out: string[] = [];
	for (let i = 0; i < count; i += 1) out.push(String(await locator.nth(i).getAttribute(attribute)));
	return out;
};

/** `text|selected=` for every `role="tab"` on the page, main tabs first, sub-tabs after. */
const tabsOf = async (page: Page) => {
	const tabs = page.getByRole('tab');
	const count = await tabs.count();
	const out: string[] = [];
	for (let i = 0; i < count; i += 1)
		out.push(`${flat(await tabs.nth(i).innerText())}|selected=${await tabs.nth(i).getAttribute('aria-selected')}`);
	return out;
};

const mainText = async (page: Page) => flat(await page.locator('main').first().innerText());

/** Task rows as printed. A card spends one frame as a skeleton (`user-profile-tasks.tsx:366-388`), so this waits
 *  until the row carries text before reading it. */
const rowTexts = async (page: Page) => {
	await expect
		.poll(async () => (await textsOf(page.locator('main ul li'))).join(' | '), { timeout: 30_000 })
		.not.toBe('');
	return textsOf(page.locator('main ul li'));
};

const readsTo = async (fragment: string) =>
	(await mockRequests())
		.filter((request) => request.path.includes(fragment))
		.map((request) => `${request.method} ${request.path}?${request.query}`);

const pathsOf = (requests: StubRequest[]) => requests.map((request) => `${request.method} ${request.path}`);

/** Query of a recorded `METHOD <url>` line, decoded the same whatever encoding the transport used. */
const queryOf = (line: string) => new URL(line.slice(line.indexOf(' ') + 1)).searchParams;

/** The console line an armed mock failure produces (`api-tokens-settings-ui.spec.ts:345-360`), matched by the verb,
 *  a path fragment and the status armed — never by an exact whole line, which carries a timestamp. */
const armedHttpError = (verb: string, pathFragment: string, status: number) =>
	new RegExp(`\\[ERROR\\] \\[HttpClient\\] HTTP Error: ${verb} \\S*${pathFragment}\\S* ${status}`);

/** React's dev-mode store warning, not this page's (the named filters of `api-tokens-settings-ui.spec.ts:419-433`).
 *  Measured here once in four whole-file runs, in test 11 between its two page loads (`s3-lane-a-profile-lead-1.log`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';

/** Console errors that are not one of the armed failures this test expects. A pattern excuses every line it names:
 *  the page logs each refused read once per request, and the statistics pair is two requests. */
const consoleFindings = (shield: Shield, expected: RegExp[]) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !expected.some((pattern) => pattern.test(line)));

/** A `YYYY-MM-01` one month after a given `YYYY-MM` month start (the half-open end the summary asks for). */
const nextMonthStart = (month: string) => {
	const [year, monthNumber] = month.split('-').map(Number);
	const next = new Date(Date.UTC(year, monthNumber, 1));
	return next.toISOString().slice(0, 10);
};

/** Served times sit in the machine's own zone, exactly as the page reads them. */
const zoneOf = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

const atClock = (dayOffset: number, hours: number, minutes: number) => {
	const date = new Date();
	date.setDate(date.getDate() + dayOffset);
	date.setHours(hours, minutes, 0, 0);
	return date;
};

/** The mock's own team, read from the mock, with this file's member figures put on it. */
const serveMemberTotals = async (
	page: Page,
	memberId: string,
	totals: { today: Array<Record<string, unknown>>; worked: Array<Record<string, unknown>> }
) => {
	const listed = (await (await fetch(`${MOCK_ORIGIN}/api/organization-team`)).json()) as {
		items: Array<Record<string, unknown>>;
	};
	const team = listed.items[0];
	const task = (team.tasks as Array<Record<string, unknown>>)[0];
	const withDurations = (rows: Array<Record<string, unknown>>) =>
		rows.map((row) => (row === null ? task : { ...task, ...row }));
	const patched = {
		...team,
		members: (team.members as Array<Record<string, unknown>>).map((member) =>
			member.id === memberId
				? {
						...member,
						totalTodayTasks: withDurations(totals.today),
						totalWorkedTasks: withDurations(totals.worked)
					}
				: member
		)
	};
	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			(url.pathname === '/api/organization-team' || url.pathname.startsWith('/api/organization-team/')),
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			return request.url().includes('/api/organization-team/')
				? answerJson(route, 200, patched)
				: answerJson(route, 200, { items: [patched], total: 1 });
		}
	);
	return task;
};

/** Store-backed time-slot server: the read answers the current store, a DELETE removes from it (`:136-158` wants a
 *  boolean back, `timer/time-slot.schema.ts:80`). */
const serveTimeSlots = (page: Page, employeeId: string, slots: Array<Record<string, unknown>>) => {
	const store = { items: [...slots] };
	const seen: string[] = [];
	const deleted: string[] = [];
	void page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN &&
			['/api/timer/slot', '/api/timesheet/statistics/time-slots', '/api/timesheet/time-slot'].includes(
				url.pathname
			),
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			seen.push(`${request.method()} ${request.url()}`);
			if (request.method() === 'DELETE') {
				const ids = [...new URL(request.url()).searchParams.entries()]
					.filter(([key]) => key.startsWith('ids['))
					.map(([, value]) => value);
				deleted.push(...ids);
				store.items = store.items.filter((slot) => !ids.includes(String(slot.id)));
				return answerJson(route, 200, true);
			}
			return answerJson(route, 200, [
				{ id: employeeId, startedAt: store.items[0]?.startedAt, timeSlots: store.items }
			]);
		}
	);
	return { seen, deleted, store };
};

/** Served `GET /api/timesheet/activity/daily` rows (`activity.service.ts:109-150` validates
 *  `dailyActivitySchema[]`, `activity.schema.ts:91-100`). */
const serveDailyActivities = (page: Page, employeeId: string, rows: Array<Record<string, unknown>>) => {
	const seen: string[] = [];
	void page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === '/api/timesheet/activity/daily',
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			seen.push(`${request.method()} ${request.url()}`);
			return answerJson(
				route,
				200,
				rows.map((row) => ({ ...row, employeeId }))
			);
		}
	);
	return seen;
};

const openStatusFilter = async (page: Page) => {
	await page.getByRole('button', { name: 'Filter', exact: false }).first().click();
	await expect.poll(() => page.getByRole('menuitem', { name: 'Status' }).count(), { timeout: 20_000 }).toBe(1);
	await page.getByRole('menuitem', { name: 'Status' }).first().click();
	await expect.poll(() => page.getByRole('menuitemcheckbox').count(), { timeout: 20_000 }).toBe(2);
};

const statusOptions = async (page: Page) => {
	const boxes = page.getByRole('menuitemcheckbox');
	const count = await boxes.count();
	const out: string[] = [];
	for (let i = 0; i < count; i += 1)
		out.push(`${flat(await boxes.nth(i).innerText())}|checked=${await boxes.nth(i).getAttribute('aria-checked')}`);
	return out;
};

const OWN = { scenario: { manager: true } satisfies MockScenario };

// 1 — own profile: the band, the tabs, and every read the page sent.
test('1 own profile: the band as printed, the tabs and which one is selected, and every read it sent', async ({
	app,
	fixture,
	shield
}) => {
	const page = await app(`/profile/${fixture.ids.user}`, OWN);

	const band = flat(await page.locator('main').first().innerText());
	console.log(`[profile] MEASURE band ${JSON.stringify(band)}`);
	const name = page.getByRole('heading', { level: 1 }).first();
	await expect(name).toHaveText(fixture.names.user);
	await expect(name).toHaveAttribute('title', fixture.names.user);

	const email = page.getByRole('button', { name: 'Copy email' });
	await expect(email).toBeVisible();
	const emailSpan = page.locator('span[title="manager@example.test"]').first();
	await expect(emailSpan).toHaveText('manager@example.test');
	console.log(`[profile] MEASURE emailSpan ${JSON.stringify(await emailSpan.getAttribute('title'))}`);

	const figures = page.locator('[aria-label="Time figures"]');
	await expect
		.poll(async () => flat((await textsOf(figures)).join(' ')), { timeout: 30_000 })
		.toContain('This month 3h 0m');
	const figureText = flat((await textsOf(figures)).join(' '));
	console.log(`[profile] MEASURE figures ${JSON.stringify(figureText)}`);
	// The mock's own summary: totalDuration 10_800, activeDays 3, lastActiveOn = startDate (mock:780-795).
	expect(figureText).toContain('Today 0h 0m');
	expect(figureText).toContain('This month 3h 0m');
	expect(figureText).toContain('Active days 3');
	// `Last active` prints the served day (`useLastActiveLabel`, user-profile-detail.tsx:384-400); the served day is
	// the first day of the month the read asked for, so only its shape is pinned here, never today's date.
	expect(figureText).toMatch(/Last active [A-Z][a-z]{2} \d{1,2}$/);
	// The figures strip is a list, not a region (metric-strip.tsx:165-205).
	await expect(page.getByRole('region', { name: 'Time figures' })).toHaveCount(0);

	// The signed-in member's profile gets the profile's own timer card (`page.tsx:247` `showsTimer =
	// profileIsAuthUser && isTrackingEnabled` → `ProfileTimer`), and it is the only `[data-timer-surface]` here: the
	// shell's mini timer (`timer.tsx:452`, which carries the same attribute) is not rendered for this member.
	const timer = page.locator('[data-timer-surface]');
	await expect
		.poll(async () => flat((await textsOf(timer)).join(' ')), { timeout: 30_000 })
		.toContain(fixture.names.task);
	console.log(`[profile] MEASURE timerCard ${JSON.stringify(await textsOf(timer))}`);
	await expect(timer).toHaveCount(1);
	await expect(page.locator('main [data-timer-surface]')).toHaveCount(1);
	await expect(page.locator('header [data-timer-surface]')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Start timer' })).toHaveCount(1);

	const tabs = await tabsOf(page);
	console.log(`[profile] MEASURE tabs ${JSON.stringify(tabs)}`);
	// As the mock stands the member has no worked task, so Worked is not picked (use-task-filter.ts:283-299), and the
	// tab picked first is an empty one: its own sentence is printed (EmptyTaskTab, user-profile-tasks.tsx:422-431).
	expect(tabs).toContain('Unassigned 0|selected=true');
	expect(tabs.slice(0, 5)).toEqual([
		'Worked 0|selected=false',
		'Assigned 1|selected=false',
		'Unassigned 0|selected=true',
		'Planned 1|selected=false',
		'Stats 3|selected=false'
	]);
	await expect
		.poll(async () => await mainText(page), { timeout: 30_000 })
		.toContain('You are on every task of the team.');

	// The button holds only an icon, so its own text is empty whether or not the copy happened; what changes is its
	// accessible name and a screen-reader-only live line (`user-profile-detail.tsx:209-227`).
	const copy = page.getByRole('button', { name: 'Copy email' });
	await expect(copy).toHaveCount(1);
	const copyIdle = {
		name: await copy.getAttribute('aria-label'),
		title: await copy.getAttribute('title'),
		ownText: await textsOf(copy)
	};
	console.log(`[profile] MEASURE copyIdle ${JSON.stringify(copyIdle)}`);
	expect(copyIdle).toEqual({ name: 'Copy email', title: 'Copy email', ownText: [''] });
	await copy.click();
	// The pressed state lives COPIED_MS = 1500 ms (`user-profile-detail.tsx:191-199`), so all four readings are taken
	// in one poll: split over four assertions each one could land after the window closed.
	await expect
		.poll(
			async () =>
				`copied=${await page.getByRole('button', { name: 'Copied' }).count()}` +
				` copyEmail=${await copy.count()}` +
				` live=${(await textsOf(page.locator('main [aria-live="polite"]'))).join(',')}` +
				` spans=${(await textsOf(page.locator('main .sr-only'))).join(',')}`,
			{ timeout: 10_000 }
		)
		.toBe('copied=1 copyEmail=0 live=Copied spans=Copied');

	const reads = await mockRequests();
	const paths = pathsOf(reads);
	console.log(`[profile] MEASURE paths ${JSON.stringify(paths)}`);
	const summaryReads = await readsTo('/timesheet/statistics/profile-activity');
	console.log(`[profile] MEASURE summaryRead ${JSON.stringify(summaryReads)}`);
	expect(summaryReads).toHaveLength(1);
	// The summary is the current month in the profile's own zone (UTC), half-open (use-profile-activity.test.tsx:157-171).
	const utcMonth = new Date().toISOString().slice(0, 7);
	console.log(`[profile] MEASURE utcMonthStart ${JSON.stringify(`${utcMonth}-01`)}`);
	expect(summaryReads[0]).toContain('includeDaily=false');
	expect(summaryReads[0]).toContain(`employeeId=${fixture.ids.employee}`);
	expect(summaryReads[0]).toContain(`organizationTeamId=${fixture.ids.teamA}`);
	expect(summaryReads[0]).toContain('timeZone=UTC');
	expect(summaryReads[0]).toContain(`startDate=${utcMonth}-01`);
	expect(summaryReads[0]).toContain(`endDate=${nextMonthStart(utcMonth)}`);
	expect(summaryReads[0]).not.toContain('tenantId=');
	for (const path of [
		'GET /api/organization-team',
		'GET /api/tasks/team',
		'GET /api/timesheet/timer/status',
		'GET /api/daily-plan',
		`GET /api/daily-plan/employee/${fixture.ids.employee}`,
		'GET /api/timesheet/statistics/profile-activity',
		'POST /api/timesheet/statistics/tasks'
	])
		expect(paths, `the mount never sent ${path}`).toContain(path);
	expect(paths.filter((p) => p === 'POST /api/timesheet/statistics/tasks')).toHaveLength(2);
	console.log(
		`[profile] MEASURE zoneButtons ${JSON.stringify(
			await textsOf(page.getByRole('button', { name: /^(Keep UTC|Use )/ }))
		)}`
	);
	await expect(page.getByRole('button', { name: 'Keep UTC' })).toHaveCount(1);
	const browserZone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
	await expect(page.getByRole('button', { name: `Use ${browserZone}` })).toHaveCount(1);
	await expect(await mainText(page)).toContain('Your profile uses UTC');
	expect(consoleFindings(shield, [])).toEqual([]);
	await expect(shield.pageErrors()).toEqual([]);
});

// 2 — Worked › Tasks: where the printed row figures really come from, and the body the page sent.
test('2 Worked › Tasks: each row as printed, and the statistics body the page sent', async ({
	fixture,
	page,
	shield
}) => {
	const task = await serveMemberTotals(page, fixture.ids.member, {
		today: [{ duration: 5400 }],
		worked: [{ duration: 10800 }]
	});
	const bodies: string[] = [];
	page.on('request', (request) => {
		if (request.method() !== 'POST') return;
		if (new URL(request.url()).pathname.includes('/statistics/tasks'))
			bodies.push(request.postData() ?? '<no body>');
	});
	await signInAndVisit(page, fixture, `/profile/${fixture.ids.user}`, { scenario: OWN.scenario });

	// The served member figures make Worked a tab with a row; picking it is what the page's own first-load effect
	// does when the member has worked time (use-task-filter.ts:283-299), so the chip is read after the pick.
	await page
		.getByRole('tab', { name: /^Worked/ })
		.first()
		.click();
	await expect.poll(async () => await tabsOf(page), { timeout: 30_000 }).toContain('Worked 1|selected=true');
	const tabs = await tabsOf(page);
	console.log(`[profile] MEASURE tabs ${JSON.stringify(tabs)}`);
	await expect.poll(async () => await mainText(page), { timeout: 30_000 }).toContain('Last 24 hours 1');

	const rows = await rowTexts(page);
	console.log(`[profile] MEASURE rows ${JSON.stringify(rows)}`);
	expect(rows).toHaveLength(1);
	expect(rows[0]).toContain(`#1 ${fixture.names.task}`);
	// Today 1h 30m / Total 3h 0m are the served member figures (task-times.tsx:41-77), not the statistics answer.
	expect(rows[0]).toContain('Today 1h 30m');
	expect(rows[0]).toContain('Total 3h 0m');
	expect(rows[0]).toContain('Open');
	await expect(page.locator('main ul li a').first()).toHaveAttribute('href', `/task/${String(task.id)}`);
	// The band's `Today` is the served member's own `totalTodayTasks` (finding 1), waited for so the strip is not
	// read while it is still the first-load skeleton (`user-profile-detail.tsx:350-382`).
	await expect
		.poll(async () => flat((await textsOf(page.locator('[aria-label="Time figures"]'))).join(' ')), {
			timeout: 30_000
		})
		.toContain('Today 1h 30m');
	const figures = flat((await textsOf(page.locator('[aria-label="Time figures"]'))).join(' '));
	console.log(`[profile] MEASURE figures ${JSON.stringify(figures)}`);
	expect(figures).toContain('Today 1h 30m');

	await expect.poll(() => bodies.length, { timeout: 30_000 }).toBeGreaterThanOrEqual(2);
	console.log(`[profile] MEASURE statisticsBodies ${JSON.stringify(bodies)}`);
	const first = JSON.parse(bodies[0]) as Record<string, unknown>;
	expect(first).toMatchObject({
		tenantId: fixture.ids.tenantA,
		organizationId: fixture.ids.organizationA,
		taskIds: [String(task.id)],
		employeeIds: [fixture.ids.employee],
		defaultRange: 'false'
	});
	const second = JSON.parse(bodies[1]) as Record<string, unknown>;
	expect(second).toMatchObject({ defaultRange: 'true', unitOfTime: 'day' });
	expect(consoleFindings(shield, [])).toEqual([]);
});

// 3 — Worked › Screenshots: two served slots, then deleting one through its confirm.
test('3 Worked › Screenshots: what each card prints, then deleting one', async ({ app, fixture }) => {
	// Two slots 30 minutes long, fixed at 09:10 and 14:20 of today in the machine's own zone. Whole hours matter
	// here: the day is drawn as hour groups sorted latest-first (`screenshot-slots.ts:99-103`, `byLatestHourFirst`)
	// and the slots inside one group ascending (`:101`), so two slots 40 minutes apart could land in the same group
	// and flip the card order depending on when the run happens. This pair is always two groups, newest first.
	const older = atClock(0, 9, 10);
	const newer = atClock(0, 14, 20);
	const slots = [
		{
			id: '99999999-9999-4999-8999-111111111111',
			employeeId: fixture.ids.employee,
			startedAt: older.toISOString(),
			stoppedAt: new Date(older.getTime() + 1800 * 1000).toISOString(),
			duration: 1800,
			percentage: 66,
			overall: 70,
			screenshots: [],
			timeLogs: []
		},
		{
			id: '99999999-9999-4999-8999-222222222222',
			employeeId: fixture.ids.employee,
			startedAt: newer.toISOString(),
			stoppedAt: new Date(newer.getTime() + 1800 * 1000).toISOString(),
			duration: 1800,
			percentage: 33,
			overall: 40,
			screenshots: [],
			timeLogs: []
		}
	];
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	const served = serveTimeSlots(page, fixture.ids.employee, slots);
	await page
		.getByRole('tab', { name: /^Worked/ })
		.first()
		.click();
	await page.getByRole('tab', { name: 'Screenshots', exact: true }).first().click();

	const deleteButtons = page.getByRole('button', { name: 'Delete this time slot' });
	await expect.poll(() => deleteButtons.count(), { timeout: 30_000 }).toBe(2);
	const readLine = served.seen.find((line) => line.startsWith('GET')) ?? '';
	const readUrl = new URL(readLine.slice(4));
	console.log(`[profile] MEASURE read ${JSON.stringify(readLine)}`);
	// The service sends the slots read with indexed query keys (`time-slot.service.ts:20-50`); `URLSearchParams`
	// answers them the same whatever encoding the transport used.
	expect(readUrl.pathname).toBe('/api/timesheet/statistics/time-slots');
	expect(readUrl.searchParams.get('employeeIds[0]')).toBe(fixture.ids.employee);
	expect(readUrl.searchParams.get('todayStart')).not.toBeNull();
	expect(readUrl.searchParams.get('todayEnd')).not.toBeNull();
	expect(readUrl.searchParams.get('relations[0]')).toBe('timeSlots.timeLogs.projectId');
	expect(readUrl.searchParams.get('relations[1]')).toBe('timeSlots.timeLogs.taskId');

	const cardAria = await attrsOf(page.getByRole('button', { name: /^View info,/ }), 'aria-label');
	console.log(`[profile] MEASURE cardAria ${JSON.stringify(cardAria)}`);
	expect(cardAria).toHaveLength(2);
	// The tile's accessible name is `View info, <from> – <to>`; the range prints the meridiem once for a range inside
	// one half of the day (`screenshot-item.tsx:205-245`).
	for (const label of cardAria) expect(label).toMatch(/^View info, \d{1,2}:\d{2}(?: [AP]M)? – \d{1,2}:\d{2} [AP]M$/);
	const head = await mainText(page);
	console.log(`[profile] MEASURE head ${JSON.stringify(head.slice(-400))}`);
	// The head line is the mean of the served slots' activity and the member's worked time (screenshoots.tsx:81-97).
	expect(head).toContain('Activity 50%');
	expect(head).toContain('Worked today 0h 0m');
	expect(head).toContain('No screenshot');
	expect(head).toContain('66%');
	expect(head).toContain('33%');

	await deleteButtons.first().click();
	await expect(page.getByText('Are you sure you want to delete this time slot?').first()).toBeVisible();
	const confirm = flat((await textsOf(page.locator('[role="dialog"]'))).join(' '));
	console.log(`[profile] MEASURE confirm ${JSON.stringify(confirm)}`);
	await expect(page.getByRole('button', { name: 'Cancel', exact: true }).last()).toBeVisible();
	await page.getByRole('button', { name: 'Delete', exact: true }).last().click();

	await expect.poll(() => served.deleted.length, { timeout: 30_000 }).toBeGreaterThan(0);
	const deleteLine = served.seen.find((line) => line.startsWith('DELETE')) ?? '';
	const deleteUrl = new URL(deleteLine.slice(7));
	console.log(`[profile] MEASURE delete ${JSON.stringify(deleteLine)}`);
	expect(deleteUrl.pathname).toBe('/api/timesheet/time-slot');
	// The card clicked is the first one, and the first card is the **newer** slot: hour groups print latest-first
	// (`screenshot-slots.ts:99-103`), so the delete names this file's 14:20 slot and it names exactly one slot
	// (`time-slot.service.ts:20-50`, `forceDelete=false`).
	expect(deleteUrl.searchParams.get('ids[0]')).toBe('99999999-9999-4999-8999-222222222222');
	expect(deleteUrl.searchParams.get('ids[1]')).toBeNull();
	expect(deleteUrl.searchParams.get('forceDelete')).toBe('false');
	expect(served.deleted).toEqual(['99999999-9999-4999-8999-222222222222']);

	await expect.poll(() => deleteButtons.count(), { timeout: 30_000 }).toBe(1);
	const after = await mainText(page);
	console.log(`[profile] MEASURE after ${JSON.stringify(after.slice(-400))}`);
	// The head line is the mean of the slots that are left (`screenshoots.tsx:62-77` `averageActivityOf`), so after
	// the 33 % slot is gone it is the other served slot's own 66.
	expect(after).toContain('Activity 66%');
	const toasts = await textsOf(page.locator('[data-sonner-toast]'));
	console.log(`[profile] MEASURE toasts ${JSON.stringify(toasts)}`);
	expect(toasts).toContain('Time slot deleted');
	// The list after is the store after: one slot left, and it is the one that was not deleted.
	expect(served.store.items.map((slot) => slot.id)).toEqual(['99999999-9999-4999-8999-111111111111']);
	const remainingCard = await attrsOf(page.getByRole('button', { name: /^View info,/ }), 'aria-label');
	console.log(`[profile] MEASURE remainingCard ${JSON.stringify(remainingCard)}`);
	expect(remainingCard).toEqual([cardAria[1]]);
});

// 4 — Worked › Apps and Worked › Visited sites: the served rows, and the query each sub-tab sent.
test('4 Worked › Apps and Visited sites: each row as printed, and the query each one sent', async ({
	app,
	fixture
}) => {
	const editor = atClock(0, 14, 23);
	const browser = atClock(0, 14, 5);
	const site = atClock(0, 9, 12);
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	const seen = serveDailyActivities(page, fixture.ids.employee, [
		{ title: 'Served Editor', date: editor.toISOString(), time: '14:23', duration: 4200, sessions: 1 },
		{ title: 'Served Browser', date: browser.toISOString(), time: '14:05', duration: 1200, sessions: 2 },
		{ title: 'example.test/page', date: site.toISOString(), time: '09:12', duration: 600, sessions: 1 }
	]);
	await page
		.getByRole('tab', { name: /^Worked/ })
		.first()
		.click();

	await page.getByRole('tab', { name: 'Apps', exact: true }).first().click();
	await expect.poll(() => seen.length, { timeout: 30_000 }).toBeGreaterThan(0);
	const appsRead = seen[seen.length - 1];
	const appsQuery = queryOf(appsRead);
	console.log(`[profile] MEASURE appsRead ${JSON.stringify(appsRead)}`);
	expect(new URL(appsRead.slice(appsRead.indexOf(' ') + 1)).pathname).toBe('/api/timesheet/activity/daily');
	expect(appsQuery.getAll('types[0]')).toContain('APP');
	expect(appsQuery.get('employeeIds[0]')).toBe(fixture.ids.employee);
	expect(appsQuery.get('organizationId')).toBe(fixture.ids.organizationA);
	expect(appsQuery.has('tenantId')).toBe(true);
	expect(appsQuery.get('startDate')).not.toBeNull();
	expect(appsQuery.get('endDate')).not.toBeNull();

	// The activity rows are divs, not list items: `<section aria-label={hour.label}>` (`activity-share-groups.tsx:129`)
	// wraps `<div className={ROWS_SURFACE}>` (`:134`, `ROWS_SURFACE` defined at `:31`) with one row `<div>` per entry
	// (`visited-Item.tsx:159-160`), so `section ul li` measures 0 here even though the task rows below are `ul li`.
	const groups = page.locator('main section[aria-label]');
	await expect.poll(() => groups.count(), { timeout: 30_000 }).toBe(3);
	await expect(groups.locator('ul li')).toHaveCount(0);
	const rowsOnApps = await textsOf(groups.locator('> div > div'));
	console.log(`[profile] MEASURE appRows ${JSON.stringify(rowsOnApps)}`);
	expect(rowsOnApps).toHaveLength(3);
	const editorRow = rowsOnApps.find((row) => row.includes('Served Editor')) ?? '';
	expect(editorRow).toContain('1h 10m');
	expect(editorRow).toContain('100%');
	expect(editorRow).toMatch(/\d{1,2}:\d{2} [AP]M/);
	const browserRow = rowsOnApps.find((row) => row.includes('Served Browser')) ?? '';
	expect(browserRow).toContain('0h 20m');
	const labels = await attrsOf(groups, 'aria-label');
	console.log(`[profile] MEASURE sectionAria ${JSON.stringify(labels)}`);
	// Both rows sit in `14:` — the group key is the clock text cut to the minute (array-data.ts:27-29), so three
	// groups carry only two labels, and two of them print the same hour range.
	expect(labels).toHaveLength(3);
	expect(new Set(labels).size).toBe(2);
	const duplicated = labels.filter((label) => labels.indexOf(label) !== labels.lastIndexOf(label));
	console.log(`[profile] MEASURE duplicateLabel ${JSON.stringify(duplicated)}`);
	expect(duplicated).toHaveLength(2);
	// The same served row is not a link on this panel; only the sites panel links it.
	await expect(page.getByRole('link', { name: /example\.test\/page/ })).toHaveCount(0);

	await page.getByRole('tab', { name: 'Visited sites', exact: true }).first().click();
	await expect
		.poll(() => seen.filter((line) => queryOf(line).getAll('types[0]').includes('URL')).length, {
			timeout: 30_000
		})
		.toBeGreaterThan(0);
	const siteRead = seen[seen.length - 1];
	const siteQuery = queryOf(siteRead);
	console.log(`[profile] MEASURE sitesRead ${JSON.stringify(siteRead)}`);
	expect(siteQuery.getAll('types[0]')).toContain('URL');
	expect(siteQuery.getAll('types[0]')).not.toContain('APP');
	await expect.poll(() => page.locator('main section[aria-label]').count(), { timeout: 30_000 }).toBe(3);
	const siteRows = await textsOf(page.locator('main section[aria-label] > div > div'));
	console.log(`[profile] MEASURE siteRows ${JSON.stringify(siteRows)}`);
	expect(siteRows).toHaveLength(3);
	const siteRow = siteRows.find((row) => row.includes('example.test/page')) ?? '';
	expect(siteRow).toContain('0h 10m');
	expect(siteRow).toContain('100%');
	// On the sites panel the same row is a link with a screen-reader-only tail (`visited-Item.tsx:117-136`, the tail at
	// `:134`); on the
	// Apps panel the identical row is plain text and prints no link at all.
	// `toHaveText` reads the element's own text content, which joins the title span and the sr-only span with no
	// space between them; the row text above (`innerText` of the row) prints the same words with a space.
	await expect(page.getByRole('link', { name: /example\.test\/page/ }).first()).toHaveText(
		'example.test/page, Open in a new tab'
	);
	await expect(page.getByRole('link', { name: /example\.test\/page/ }).first()).toHaveAttribute(
		'href',
		'https://example.test/page'
	);
});

// 5 — Assigned and Unassigned: which served task each lists, and the assign action's PUT.
test('5 Assigned and Unassigned: what each one lists, then the assign action and the lists after', async ({
	app,
	fixture
}) => {
	const own = await app(`/profile/${fixture.ids.user}`, OWN);
	await own
		.getByRole('tab', { name: /^Assigned/ })
		.first()
		.click();
	const assignedRows = await rowTexts(own);
	console.log(`[profile] MEASURE ownAssigned ${JSON.stringify(assignedRows)}`);
	expect(assignedRows).toHaveLength(1);
	expect(assignedRows[0]).toContain(`#1 ${fixture.names.task}`);
	expect(assignedRows[0]).toContain('Today 0h 0m');
	expect(assignedRows[0]).toContain('Estimated 1h');
	expect(assignedRows[0]).toContain('Open');
	await expect(own.locator('main ul li a').first()).toHaveAttribute('href', `/task/${fixture.ids.task}`);
	await expect(own.getByRole('tab', { name: /^Assigned/ }).first()).toHaveAttribute('aria-selected', 'true');
	// Each tab's hint is a `Tooltip` label that mounts only when the tooltip opens (`task-filters.tsx:97-98`, texts at
	// `locales/en.json:3230-3231`). Measured: after clicking it, the Assigned tab's hint is in the page text; the
	// Unassigned tab that this file selects on the teammate's profile printed no such hint, so only the measured one
	// is pinned here.
	const ownTooltip = await mainText(own);
	console.log(`[profile] MEASURE assignedTooltip ${JSON.stringify(ownTooltip.slice(-260))}`);
	expect(ownTooltip).toContain('This tab shows all tasks that are assigned to you');

	const page = await app(`/profile/${fixture.ids.teammateUser}`, OWN);
	const writes: string[] = [];
	page.on('request', (request) => {
		if (request.method() === 'PUT' || request.method() === 'PATCH')
			writes.push(`${request.method()} ${request.url()} ${request.postData() ?? ''}`);
	});
	await page
		.getByRole('tab', { name: /^Unassigned/ })
		.first()
		.click();
	const rows = await rowTexts(page);
	console.log(`[profile] MEASURE unassigned ${JSON.stringify(rows)}`);
	expect(rows).toHaveLength(1);
	expect(rows[0]).toContain('#1');
	expect(rows[0]).toContain('Today 0h 0m');
	expect(rows[0]).toContain('Open');
	await expect(page.locator('main ul li a').last()).toHaveAttribute(
		'href',
		`/profile/${fixture.ids.user}?name=${fixture.names.user}`
	);
	// Kept as the record behind finding 11: the selected Unassigned tab prints no hint sentence.
	console.log(`[profile] MEASURE unassignedMainText ${JSON.stringify(await mainText(page))}`);

	await page.getByRole('button', { name: 'Assign task', exact: false }).first().click();
	const dialog = page.getByRole('dialog');
	await expect
		.poll(async () => flat((await textsOf(dialog)).join(' ')), { timeout: 30_000 })
		.toContain(fixture.names.task);
	const dialogText = flat((await textsOf(dialog)).join(' '));
	console.log(`[profile] MEASURE assignPopover ${JSON.stringify(dialogText)}`);
	console.log(`[profile] MEASURE assignDialogButtons ${JSON.stringify(await textsOf(dialog.getByRole('button')))}`);
	await dialog.getByText(fixture.names.task).first().click();
	await expect.poll(() => writes.length, { timeout: 30_000 }).toBeGreaterThan(0);
	// A recorded line is `<method> <full url> <post data>` (`request.url()` is absolute), so the method, the path and
	// the body are read apart instead of compared with a hand-written line.
	const assignLine = writes.find((line) => line.includes(`/api/tasks/${fixture.ids.task}`)) ?? '';
	expect(assignLine).not.toBe('');
	console.log(`[profile] MEASURE assignWrite ${JSON.stringify(assignLine.slice(0, 900))}`);
	expect(assignLine.split(' ')[0]).toBe('PUT');
	expect(new URL(assignLine.split(' ')[1]).pathname).toBe(`/api/tasks/${fixture.ids.task}`);
	const body = JSON.parse(assignLine.slice(assignLine.indexOf('{'))) as { members: Array<{ id: string }> };
	const memberIds = body.members.map((member) => member.id);
	console.log(`[profile] MEASURE assignMembers ${JSON.stringify(memberIds)}`);
	expect(memberIds).toContain(fixture.ids.employee);
	expect(memberIds).toContain(fixture.ids.teammateEmployee);

	await expect
		.poll(async () => (await textsOf(page.getByRole('tab'))).join(' '), { timeout: 30_000 })
		.toContain('Assigned 1');
	const chips = await textsOf(page.getByRole('tab'));
	console.log(`[profile] MEASURE chipsAfterAssign ${JSON.stringify(chips)}`);
	expect(chips).toContain('Assigned 1');
	expect(chips).toContain('Unassigned 0');
	await page
		.getByRole('tab', { name: /^Assigned/ })
		.first()
		.click();
	const nowAssigned = await rowTexts(page);
	console.log(`[profile] MEASURE assignedNow ${JSON.stringify(nowAssigned)}`);
	expect(nowAssigned).toHaveLength(1);
	await page
		.getByRole('tab', { name: /^Unassigned/ })
		.first()
		.click();
	await expect
		.poll(async () => await mainText(page), { timeout: 30_000 })
		.toContain(`${fixture.names.teammate} is on every task of the team.`);
});

// 6 — Planned: the served plan's figures, then the tab with no plan at all.
test('6 Planned: the served plan and its figures, then no plan at all', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	await page
		.getByRole('tab', { name: /^Planned/ })
		.first()
		.click();
	await expect.poll(async () => await mainText(page), { timeout: 30_000 }).toContain('Plans');
	const withPlan = await mainText(page);
	console.log(`[profile] MEASURE withPlan ${JSON.stringify(withPlan)}`);
	expect(withPlan).toContain('Today 1');
	expect(withPlan).toContain('Outstanding 0');
	expect(withPlan).toContain('Planned 8h 0m');
	expect(withPlan).toContain('Estimated 1h 0m');
	expect(withPlan).toContain('Done 0 / 1');
	const aria = await attrsOf(page.locator('main [aria-label]'), 'aria-label');
	console.log(`[profile] MEASURE plannedAria ${JSON.stringify(aria)}`);
	expect(aria).toContain('Plans to show');
	expect(aria).toContain('Cards');
	expect(aria).toContain('Table');
	expect(aria).toContain('Blocks');
	// The Planned sub-tabs and their views (user-profile-plans.tsx:379-427); the labels below are the strings the run printed.
	expect(aria).toContain('Planned time: 8h 0m');
	expect(aria).toContain('Estimate: 1h');
	expect(await mainText(page)).toContain('This tab shows all your planned tasks');
	const planReads = await readsTo('/api/daily-plan');
	console.log(`[profile] MEASURE planReads ${JSON.stringify(planReads)}`);
	expect(planReads.some((line) => line.includes(`/api/daily-plan/employee/${fixture.ids.employee}`))).toBe(true);
	expect(planReads.some((line) => line.includes('relations%5B0%5D=tasks'))).toBe(true);
	await expect
		.poll(
			async () => (await mockRequests()).filter((request) => request.path === '/api/timesheet/time-log').length,
			{
				timeout: 30_000
			}
		)
		.toBeGreaterThanOrEqual(1);

	const noPlan = await app(`/profile/${fixture.ids.user}`, { scenario: { manager: true, hasPlan: false } });
	await noPlan
		.getByRole('tab', { name: /^Planned/ })
		.first()
		.click();
	await expect.poll(async () => await mainText(noPlan), { timeout: 30_000 }).toContain('No task planned');
	const empty = await mainText(noPlan);
	console.log(`[profile] MEASURE noPlan ${JSON.stringify(empty.slice(-300))}`);
	const emptyChips = await textsOf(noPlan.getByRole('tab'));
	console.log(`[profile] MEASURE noPlanChips ${JSON.stringify(emptyChips)}`);
	expect(emptyChips).toContain('Planned 0');
	await expect(noPlan.getByRole('tab', { name: /^Outstanding/ })).toHaveAttribute('aria-selected', 'true');
});

// 7 — Stats: the yearly read and what the served day prints for a reader.
test('7 Stats: the calendar read with includeDaily, and what its day and months print', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	await page
		.getByRole('tab', { name: /^Stats/ })
		.first()
		.click();
	await expect
		.poll(async () => await mainText(page), { timeout: 30_000 })
		.toContain('Days with tracked time over the year');
	// The heading can paint before the yearly read reaches the mock's log, so the read is polled, never snapshotted.
	const yearlyRead = async () =>
		(await readsTo('/timesheet/statistics/profile-activity')).find((line) => line.includes('includeDaily=true'));
	await expect.poll(yearlyRead, { timeout: 30_000 }).toBeDefined();
	const yearly = await yearlyRead();
	console.log(`[profile] MEASURE yearlyRead ${JSON.stringify(yearly)}`);
	expect(yearly ?? '').toContain('includeDaily=true');
	expect(yearly ?? '').toContain(`employeeId=${fixture.ids.employee}`);
	expect(yearly ?? '').not.toContain('tenantId=');
	const yearStart = new URLSearchParams((yearly ?? '').split('?')[1] ?? '').get('startDate') ?? '';
	const year = yearStart.slice(0, 4);
	console.log(`[profile] MEASURE year ${JSON.stringify({ yearStart, year, zone: zoneOf() })}`);
	expect(year).toMatch(/^\d{4}$/);
	expect((yearly ?? '').includes(`startDate=${year}-01-01`)).toBe(true);
	expect((yearly ?? '').includes(`endDate=${Number(year) + 1}-01-01`)).toBe(true);

	const figureText = await mainText(page);
	console.log(`[profile] MEASURE statsText ${JSON.stringify(figureText.slice(0, 500))}`);
	// One served day of 3600 s (mock:794 `daily: [{ date: startDate, duration: 3600 }]`).
	expect(figureText).toContain('Total 1h 0m');
	expect(figureText).toContain('Active days 1');
	expect(figureText).toContain('Longest streak 1 day');
	expect(figureText).toContain('Best day 1h 0m');

	const monthLabel = await attrsOf(page.locator('main ul[aria-label]'), 'aria-label');
	const monthRows = await textsOf(page.locator('main ul[aria-label] li'));
	console.log(`[profile] MEASURE months ${JSON.stringify({ monthLabel, monthRows })}`);
	expect(monthLabel).toContain(`Tracked time per month in ${year}`);
	expect(monthRows[0]).toContain('1h 0m');
	expect(monthRows[0]).toContain('1 active day');
	expect(monthRows[1]).toContain('0h 0m');
	expect(monthRows[monthRows.length - 1]).toContain('–');

	const tableText = flat(await page.locator('main table').first().innerText());
	console.log(`[profile] MEASURE srOnlyTable ${JSON.stringify(tableText)}`);
	expect(tableText).toContain(`Days with tracked time in ${year}`);
	expect(tableText).toContain('January 1');
	expect(tableText).toContain('1h 0m');
	const sliders = await attrsOf(page.locator('[role="slider"]'), 'aria-label');
	console.log(`[profile] MEASURE gridLabel ${JSON.stringify(sliders)}`);
	expect(sliders).toHaveLength(1);
	expect(sliders[0]).toContain(`Tracked time per day in ${year}`);
	const legend = await attrsOf(page.locator('[role="img"]'), 'aria-label');
	console.log(`[profile] MEASURE legend ${JSON.stringify(legend)}`);
	expect(legend.join(' ')).toContain(
		'Tracked time per day: none, under 2 hours, 2 to 4 hours, 4 to 8 hours, 8 hours or more'
	);
	await expect(page.getByRole('combobox')).toHaveCount(1);
	await expect(page.getByRole('combobox')).toHaveAttribute('aria-label', 'Year');
});

// 8 — the filter bar: what a search and a status filter change, and that they send nothing.
test('8 The filter bar: a search and a status filter change the list and cause no read', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.teammateUser}`, OWN);
	await page
		.getByRole('tab', { name: /^Unassigned/ })
		.first()
		.click();
	const rows = await rowTexts(page);
	expect(rows).toHaveLength(1);

	const search = page.getByRole('searchbox', { name: 'Search tasks' });
	await expect(search).toBeVisible();
	const before = await mockRequests();
	await search.fill('zzzz');
	await expect.poll(async () => await mainText(page), { timeout: 30_000 }).toContain('No task matches this search.');
	// A quiet window: the filter had 2 s to cause a read of its own, and caused none.
	await page.waitForTimeout(2_000);
	const afterSearch = (await mockRequests()).slice(before.length);
	console.log(
		`[profile] MEASURE searchAdded ${JSON.stringify({
			reads: pathsOf(afterSearch),
			taskReads: afterSearch.filter((request) => request.path.startsWith('/api/tasks')).length,
			liCount: await page.locator('main ul li').count(),
			chips: await textsOf(page.getByRole('tab'))
		})}`
	);
	expect(afterSearch.filter((request) => request.path.startsWith('/api/tasks'))).toHaveLength(0);
	await expect(page.locator('main ul li')).toHaveCount(0);
	expect(await textsOf(page.getByRole('tab'))).toContain('Unassigned 1');
	await expect(page.getByRole('button', { name: 'Clear search' })).toBeVisible();
	await search.fill('Fixture');
	await expect.poll(() => page.locator('main ul li').count(), { timeout: 30_000 }).toBe(1);
	const searched = await rowTexts(page);
	console.log(`[profile] MEASURE searchedRow ${JSON.stringify(searched)}`);
	expect(searched[0]).toContain('#1');

	await search.fill('');
	await expect.poll(() => page.locator('main ul li').count(), { timeout: 30_000 }).toBe(1);
	await openStatusFilter(page);
	const options = await statusOptions(page);
	console.log(`[profile] MEASURE statusOptions ${JSON.stringify(options)}`);
	expect(options).toEqual(['Open|checked=false', 'In Progress|checked=false']);
	const menuItems = await page
		.getByRole('menu', { name: 'Filter' })
		.getByRole('menuitem')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) =>
					`${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}|disabled=${node.getAttribute('aria-disabled')}`
			)
		);
	console.log(`[profile] MEASURE menuItems ${JSON.stringify(menuItems)}`);
	// Only `Status` is offered; the other three filter groups are there but disabled (no data to offer yet).
	expect(menuItems).toEqual([
		'Status|disabled=null',
		'Priority|disabled=true',
		'Size|disabled=true',
		'Labels|disabled=true'
	]);

	const beforeFilter = await mockRequests();
	const inProgress = page.getByRole('menuitemcheckbox', { name: 'In Progress' }).first();
	await inProgress.click();
	await expect
		.poll(async () => await mainText(page), { timeout: 30_000 })
		.toContain('No task matches these filters.');
	await expect(page.locator('main ul li')).toHaveCount(0);
	const filterButton = await textsOf(page.getByRole('button', { name: /^Filter/ }));
	const chips = await textsOf(page.getByRole('tab'));
	const checked = await statusOptions(page);
	const portals = await page.locator('[data-base-ui-portal]').count();
	console.log(`[profile] MEASURE filtered ${JSON.stringify({ filterButton, chips, checked, portals })}`);
	expect(filterButton).toEqual(['Filter 1']);
	// the pressed box prints a `Selected` tail in its own text
	expect(checked).toEqual(['Open|checked=false', 'In Progress Selected|checked=true']);
	expect(chips).toContain('Unassigned 1');
	expect(
		(await mockRequests()).slice(beforeFilter.length).filter((request) => request.path.startsWith('/api/tasks'))
	).toHaveLength(0);

	// `Clear filters` cannot be clicked with the mouse in this state: the open menu's portal
	// (`<div role="presentation" data-base-ui-inert="">` inside `<div data-base-ui-portal="">`, two such portals
	// measured above) intercepts the pointer, and Playwright retries the click until the test times out. `Escape`
	// closes the submenu but leaves the portal, so it does not free the button either. Both paths that do work are
	// pinned: undoing the filter with the same checkbox, and activating the button from the keyboard.
	await inProgress.click();
	await expect.poll(() => page.locator('main ul li').count(), { timeout: 30_000 }).toBe(1);
	const unchecked = await textsOf(page.getByRole('button', { name: /^Filter/ }));
	const uncheckedRow = await rowTexts(page);
	console.log(`[profile] MEASURE unchecked ${JSON.stringify({ unchecked, uncheckedRow })}`);
	expect(unchecked).toEqual(['Filter']);

	await inProgress.click();
	await expect.poll(() => page.locator('main ul li').count(), { timeout: 30_000 }).toBe(0);
	await page.getByRole('button', { name: 'Clear filters' }).first().press('Enter');
	await expect.poll(() => page.locator('main ul li').count(), { timeout: 30_000 }).toBe(1);
	const cleared = await rowTexts(page);
	const clearedButton = await textsOf(page.getByRole('button', { name: /^Filter/ }));
	console.log(`[profile] MEASURE clearedRow ${JSON.stringify({ cleared, clearedButton })}`);
	expect(clearedButton).toEqual(['Filter']);
});

// 9 — another member's profile as a manager, and one whose view is not shared.
test('9 Another member as a manager, and one whose profile is not shared', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.teammateUser}`, OWN);
	// `Stats <n>` is the month summary's `activeDays` (`page.tsx:155-157`), and that read is asynchronous with
	// `retry:false`: reading the chips before it landed caught `Stats 0` where the served summary says 3. The band is
	// waited for first, then the chips.
	const figures = page.locator('[aria-label="Time figures"]');
	await expect
		.poll(async () => flat((await textsOf(figures)).join(' ')), { timeout: 30_000 })
		.toContain('Active days 3');
	const band = flat(await page.locator('main').first().innerText());
	console.log(`[profile] MEASURE managerBand ${JSON.stringify(band.slice(0, 500))}`);
	expect(band).toContain(`${fixture.names.teammate} Manager`);
	expect(band).toContain('teammate@example.test');
	expect(band).toContain('This month 3h 0m');
	expect(band).toContain('Active days 3');
	await expect(figures).toHaveCount(1);
	const tabs = await tabsOf(page);
	console.log(`[profile] MEASURE managerTabs ${JSON.stringify(tabs)}`);
	expect(tabs.slice(0, 5)).toEqual([
		'Worked 0|selected=false',
		'Assigned 0|selected=false',
		'Unassigned 1|selected=true',
		'Planned 1|selected=false',
		'Stats 3|selected=false'
	]);
	expect(tabs).toContain('Unassigned 1|selected=true');
	// A member who is not the signed-in one gets the shell's mini timer in the header instead of the profile's own
	// card (`page.tsx:247-266`: `showsTimer = profileIsAuthUser && isTrackingEnabled` → `ProfileTimer`,
	// `showsHeaderTimer = !profileIsAuthUser && (isTrackingEnabled || isOwnTrackingOff)` → the header slot), and that
	// mini timer carries `data-timer-surface` too (`timer.tsx:452`). What this profile does not show is the member's
	// own task line inside that surface: `OwnTimerCard` needs that member's `activeTaskId` and the mock answers it
	// for the signed-in user only (`mock-gauzy-server.mjs:207-208`), so the surface prints its clock and nothing
	// else. The pin is on the surface's own text — the band around it does carry the team's task rows, which appear
	// and disappear with the list's own loading (`user-profile-tasks.tsx:366-388`).
	await expect(page.locator('[data-timer-surface]')).toHaveCount(1);
	await expect(page.locator('header [data-timer-surface]')).toHaveCount(1);
	const managerSurfaceText = flat((await textsOf(page.locator('[data-timer-surface]'))).join(' '));
	console.log(`[profile] MEASURE managerTimerSurface ${JSON.stringify(managerSurfaceText)}`);
	expect(managerSurfaceText).not.toContain(fixture.names.task);
	expect(managerSurfaceText).not.toContain('#1');
	await expect(page.getByRole('button', { name: 'Start timer' })).toHaveCount(1);
	const reads = await mockRequests();
	const teammateEmployee = (
		await Promise.all(
			reads
				.filter((request) => request.path.includes('/timesheet/statistics/profile-activity'))
				.map(async (request) => request.query)
		)
	).map((query) => new URLSearchParams(query).get('employeeId'));
	console.log(`[profile] MEASURE summaryEmployees ${JSON.stringify(teammateEmployee)}`);
	expect(teammateEmployee).toContain(fixture.ids.teammateEmployee);

	const denied = await app(`/profile/${fixture.ids.teammateUser}`, {
		scenario: { manager: false, shareProfileView: false }
	});
	const deniedTabs = await tabsOf(denied);
	console.log(`[profile] MEASURE deniedTabs ${JSON.stringify(deniedTabs)}`);
	// Not an empty page: the two team-task tabs stay, while `Worked`, `Daily plan` and `Stats` are only pushed when
	// `activeTeam?.shareProfileView || canSeeActivity` (`use-task-filter.ts:200-235`, the condition at `:216`).
	expect(deniedTabs).toEqual(['Assigned 0|selected=false', 'Unassigned 1|selected=true']);
	await expect(denied.locator('[aria-label="Time figures"]')).toHaveCount(0);
	await expect(denied.locator('header [data-timer-surface]')).toHaveCount(1);
	const deniedText = await mainText(denied);
	console.log(`[profile] MEASURE deniedText ${JSON.stringify(deniedText)}`);
	expect(deniedText).not.toContain('Worked');
	expect(deniedText).not.toContain('Stats');
	expect(deniedText).not.toContain('Active days');
	expect(deniedText).not.toContain('Manager');
	expect(deniedText).toContain(fixture.names.teammate);
	expect(deniedText).toContain('teammate@example.test');
	const deniedReads = await readsTo('/timesheet/statistics/profile-activity');
	console.log(`[profile] MEASURE deniedReads ${JSON.stringify(deniedReads)}`);
});

// 10 — an unknown member id.
test('10 An unknown member id: the copy and the links the page shows', async ({ app }) => {
	const unknownId = '00000000-0000-4000-8000-000000000000';
	const page = await app(`/profile/${unknownId}`, OWN);
	const headings = await textsOf(page.getByRole('heading'));
	console.log(`[profile] MEASURE headings ${JSON.stringify(headings)}`);
	expect(headings).toContain('Member Not found');
	const main = await mainText(page);
	console.log(`[profile] MEASURE main ${JSON.stringify(main)}`);
	expect(main).toContain(
		'If you are looking for a member in a different team, please select the team from the dropdown above.'
	);
	await expect(page.getByRole('link', { name: 'Go to home' })).toHaveAttribute('href', '/');
	const links = await page
		.locator('main a')
		.evaluateAll((nodes) =>
			nodes.map(
				(node) => `${(node.textContent ?? '').replace(/\s+/g, ' ').trim()} -> ${node.getAttribute('href')}`
			)
		);
	console.log(`[profile] MEASURE links ${JSON.stringify(links)}`);
	expect(links.some((line) => line.endsWith('-> /'))).toBe(true);
	await expect(page.locator('[aria-label="Time figures"]')).toHaveCount(0);
	await expect(page.getByRole('button', { name: 'Copy email' })).toHaveCount(0);
});

// 11 — a refused profile-activity read and a refused statistics read.
test('11 A refused profile-activity read and a refused statistics read', async ({ app, fixture, shield }) => {
	const summaryLine = armedHttpError('GET', 'profile-activity', 500);
	const statisticsLine = armedHttpError('POST', 'statistics/tasks', 500);

	const summaryFails = await app(`/profile/${fixture.ids.user}`, {
		scenario: { manager: true, fails: { '/api/timesheet/statistics/profile-activity': 500 } }
	});
	await expect
		.poll(async () => flat((await textsOf(summaryFails.locator('[aria-label="Time figures"]'))).join(' ')), {
			timeout: 30_000
		})
		.toContain('This month –');
	const figures = flat((await textsOf(summaryFails.locator('[aria-label="Time figures"]'))).join(' '));
	const summaryChips = await textsOf(summaryFails.getByRole('tab'));
	console.log(`[profile] MEASURE refusedSummary ${JSON.stringify({ figures, summaryChips })}`);
	expect(figures).toContain('Today 0h 0m');
	expect(figures).toContain('Active days –');
	expect(figures).toContain('Last active –');
	// `Stats 0` is `statsCount` falling back to 0 when the summary never arrived (page.tsx:155-157).
	expect(summaryChips).toContain('Stats 0');
	expect(summaryChips).toContain('Assigned 1');
	const summaryErrors = shield.consoleErrors();
	console.log(`[profile] MEASURE summaryConsole ${JSON.stringify(summaryErrors)}`);
	expect(summaryErrors.filter((line) => summaryLine.test(line)).length).toBeGreaterThan(0);
	expect(consoleFindings(shield, [summaryLine])).toEqual([]);

	const page = await app(`/profile/${fixture.ids.user}`, {
		scenario: { manager: true, fails: { '/api/timesheet/statistics/tasks': 500 } }
	});
	await expect
		.poll(() => shield.consoleErrors().filter((line) => statisticsLine.test(line)).length, { timeout: 30_000 })
		.toBeGreaterThanOrEqual(2);
	const errors = shield.consoleErrors();
	console.log(`[profile] MEASURE statisticsConsole ${JSON.stringify(errors)}`);
	expect(consoleFindings(shield, [summaryLine, statisticsLine])).toEqual([]);
	const keptChips = await textsOf(page.getByRole('tab'));
	const keptFigures = flat((await textsOf(page.locator('[aria-label="Time figures"]'))).join(' '));
	console.log(`[profile] MEASURE afterStatisticsFailure ${JSON.stringify({ keptChips, keptFigures })}`);
	// A refused statistics read moves no figure: the band and the chips read as in test 1 (finding 1).
	expect(keptChips).toContain('Stats 3');
	expect(keptFigures).toContain('This month 3h 0m');
	expect(keptFigures).toContain('Active days 3');
});

// 12 — Add time: what the dialog asks for, and the guard that saves nothing when the lookup is refused.
test('12 Add time: the fields as printed, and the overlap lookup that saves nothing', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	/** Only the saves this dialog can send: the shell's own writes (presence, …) are not what the guard must stop. */
	const saves: string[] = [];
	page.on('request', (request) => {
		if (request.method() === 'GET' || request.method() === 'OPTIONS') return;
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN && url.pathname.startsWith('/api/timesheet/time-log'))
			saves.push(`${request.method()} ${url.pathname}`);
	});
	await page.getByRole('button', { name: 'Add time', exact: false }).first().click();
	await expect
		.poll(async () => flat((await textsOf(page.locator('[role="dialog"]'))).join(' ')), { timeout: 30_000 })
		.toContain('Duration');
	const dialogText = flat((await textsOf(page.locator('[role="dialog"]'))).join(' '));
	console.log(`[profile] MEASURE dialog ${JSON.stringify(dialogText)}`);
	expect(dialogText).toContain('Date*');
	expect(dialogText).toContain('Start time*');
	expect(dialogText).toContain('End time*');
	expect(dialogText).toContain('Team*');
	expect(dialogText).toContain('Task*');
	expect(dialogText).toContain('Reason (Optional)');
	expect(dialogText).toContain('Billable');
	await expect(page.getByRole('textbox', { name: /Start time/ })).toHaveCount(1);
	await expect(page.getByRole('textbox', { name: /End time/ })).toHaveCount(1);
	const duration = page.getByRole('textbox', { name: /Duration/ });
	await expect(duration).toHaveCount(1);
	await expect(page.getByRole('button', { name: 'View timesheet' })).toHaveCount(1);

	const dialogBody = async () => flat((await textsOf(page.locator('[role="dialog"]'))).join(' '));
	// A shape the field will not take. Measured: filling it changes nothing on screen — the input keeps the typed
	// string and the hint under it stays the default. The hint that names the shapes it accepts appears only once a
	// save is attempted (`core/components/features/manual-time/duration-field.tsx`), and that attempt sends nothing.
	await duration.fill('00:15:00');
	console.log(
		`[profile] MEASURE refusedDuration ${JSON.stringify({ value: await duration.inputValue(), text: await dialogBody() })}`
	);
	expect(await duration.inputValue()).toBe('00:15:00');
	await page.getByRole('dialog').getByRole('button', { name: 'Add time' }).last().click();
	await expect
		.poll(dialogBody, { timeout: 15_000 })
		.toContain('Type a duration such as 1:30, 1.5 or 90m, up to 24 hours.');
	expect(saves).toEqual([]);
	// The shape it does take: right after the fill the field still prints the typed text (`0:15` measured; it becomes
	// `0h 15m` only once Start and End arrive, asserted below), and the hint is back to its default.
	await duration.fill('0:15');
	expect(await duration.inputValue()).toBe('0:15');
	await expect
		.poll(dialogBody, { timeout: 15_000 })
		.toContain('Type a duration and the first free time of the day is proposed.');
	const start = page.getByRole('textbox', { name: /Start time/ });
	const end = page.getByRole('textbox', { name: /End time/ });
	await start.fill('8:00 AM');
	await end.fill('8:15 AM');
	const values = await (async () => {
		const inputs = page.locator('[role="dialog"] input');
		const count = await inputs.count();
		const out: string[] = [];
		for (let i = 0; i < count; i += 1) out.push(await inputs.nth(i).inputValue());
		return out;
	})();
	console.log(`[profile] MEASURE filledValues ${JSON.stringify(values)}`);
	expect(values).toContain('8:00 AM');
	expect(values).toContain('8:15 AM');
	expect(values).toContain('0h 15m');

	const before = saves.length;
	await page.getByRole('dialog').getByRole('button', { name: 'Add time' }).last().click();
	// A quiet window: the save had 3 s to leave the browser, and the refused overlap lookup must stop it
	// (use-time-overlap-guard.ts:94 "A lookup that fails saves nothing").
	await page.waitForTimeout(3_000);
	console.log(`[profile] MEASURE savesAfterRefusedLookup ${JSON.stringify(saves.slice(before))}`);
	expect(saves.slice(before)).toEqual([]);
	await expect
		.poll(async () => flat(await page.getByRole('dialog').innerText()), { timeout: 30_000 })
		.toContain(
			'We could not check whether this time overlaps time already recorded, so nothing was saved. Try again.'
		);
	const toasts = await textsOf(page.locator('[data-sonner-toast]'));
	console.log(`[profile] MEASURE guardToasts ${JSON.stringify(toasts.map((t) => t.slice(0, 160)))}`);
	expect(toasts.some((toast) => toast.includes('Time overlap check failed'))).toBe(true);
	await expect(page.getByRole('dialog')).toHaveCount(1);
});

// 13 — Add time sent: the body the dialog sends once the overlap lookup is answered.
test('13 Add time sent: the POST body once the overlap lookup is answered', async ({ app, fixture }) => {
	const page = await app(`/profile/${fixture.ids.user}`, OWN);
	const writes: Array<{ method: string; url: string; body: string | null }> = [];
	const conflicts: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== MOCK_API_ORIGIN) return;
		if (request.method() === 'GET') {
			if (url.pathname.includes('/time-log/conflict')) conflicts.push(request.url());
			return;
		}
		if (request.method() === 'OPTIONS') return;
		// The save itself only: the shell's own writes are not this test's subject.
		if (url.pathname !== '/api/timesheet/time-log') return;
		writes.push({ method: request.method(), url: request.url(), body: request.postData() });
	});
	await page.route(
		(url) => url.origin === MOCK_API_ORIGIN && url.pathname === '/api/timesheet/time-log/conflict',
		async (route) => {
			const request = route.request();
			if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });
			return answerJson(route, 200, []);
		}
	);
	await page.getByRole('button', { name: 'Add time', exact: false }).first().click();
	await expect
		.poll(async () => flat((await textsOf(page.locator('[role="dialog"]'))).join(' ')), { timeout: 30_000 })
		.toContain('Duration');
	await page.getByRole('textbox', { name: /Duration/ }).fill('0:15');
	await page.getByRole('textbox', { name: /Start time/ }).fill('8:00 AM');
	await page.getByRole('textbox', { name: /End time/ }).fill('8:15 AM');
	const before = writes.length;
	await page.getByRole('dialog').getByRole('button', { name: 'Add time' }).last().click();
	await expect.poll(() => writes.slice(before).length, { timeout: 30_000 }).toBeGreaterThan(0);
	console.log(`[profile] MEASURE conflictRead ${JSON.stringify((conflicts[0] ?? '').slice(0, 240))}`);
	expect(conflicts[0] ?? '').toContain(`employeeId=${fixture.ids.employee}`);
	expect(conflicts[0] ?? '').toContain('organizationId=');
	const write = writes[before];
	console.log(
		`[profile] MEASURE addTimeBody ${JSON.stringify({ method: write.method, path: new URL(write.url).pathname, body: write.body })}`
	);
	expect(write.method).toBe('POST');
	expect(new URL(write.url).pathname).toBe('/api/timesheet/time-log');
	const body = JSON.parse(write.body ?? '{}') as Record<string, unknown>;
	expect(body).toMatchObject({
		tenantId: fixture.ids.tenantA,
		employeeId: fixture.ids.employee,
		logType: 'MANUAL',
		source: 'BROWSER',
		taskId: fixture.ids.task,
		organizationId: fixture.ids.organizationA,
		organizationTeamId: fixture.ids.teamA,
		isBillable: false,
		tags: []
	});
	const startedAt = new Date(String(body.startedAt));
	const stoppedAt = new Date(String(body.stoppedAt));
	console.log(
		`[profile] MEASURE sentWindow ${JSON.stringify({ startedAt: body.startedAt, stoppedAt: body.stoppedAt, zone: zoneOf() })}`
	);
	expect(Number.isNaN(startedAt.getTime())).toBe(false);
	expect((stoppedAt.getTime() - startedAt.getTime()) / 1000).toBe(900);
	await expect
		.poll(async () => flat((await textsOf(page.locator('[data-sonner-toast]'))).join(' ')), { timeout: 30_000 })
		.toContain('Validation failed in addManualTime API response');
	const after = await textsOf(page.locator('[aria-label="Time figures"]'));
	const chips = await textsOf(page.getByRole('tab'));
	console.log(`[profile] MEASURE afterSend ${JSON.stringify({ figures: after, chips })}`);
	expect(flat(after.join(' '))).toContain('Today 0h 0m');
	expect(chips).toContain('Worked 0');
	await expect(page.getByRole('dialog')).toHaveCount(1);
});
