import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { hardVisit, mockReset, signInAndVisit } from '../../helpers';
import { APP_ORIGIN, MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in member sees on **My work › Work diary** (`/work-diary`,
 * `app/[locale]/(main)/work-diary/page.tsx` → `core/components/dashboards/work-diary/work-diary-page.tsx`), on lane-b
 * (app `http://localhost:3032`, mock `http://127.0.0.1:3996`, statistics `3997`, control `3998`, issuer `3999`,
 * `playwright/test-servers.ts:37-42`). Every case signs in as the fixture member (`fixture.ids.employee`, the mock's
 * own organization role, `cypress/support/mock-gauzy-server.mjs:50-81`).
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-workdiary\probe1.spec.ts` (P1 the day and its reads, P2 the slot sheet,
 * the day navigation, the params), `probe2.spec.ts` (W1-W3 the week sheet under three permission sets),
 * `probe3.spec.ts` (X1 delete, X2 the entries without the delete permission, X3 a typed duration, X4 an empty week),
 * `probe4.spec.ts` (PL1-PL3 the plan block, R1-R3 a refused slots read, a refused logs read, a refused delete),
 * `probe5.spec.ts` (E1-E2 an empty today and the slot sheet closed) and `probe6.spec.ts` (PN1 the planned day, PN2 the
 * day with entries and no plan, PN3 an empty today), run on this lane on 2026-11-27 and logged in
 * `D:\Coding\.tmp\probe-workdiary-1.log` … `-12.log`, and in the whole-file runs of this spec
 * `D:\Coding\.tmp\s3-lane-b-workdiary-diag2.log` (finding 11) and `s3-lane-b-workdiary-3.log` / `-4.log` (the two
 * acceptance runs every pin below was last read from). Every value asserted below is one those runs printed, or one this
 * file's own `MEASURE` line printed on a run that passed. Nothing names today's date: served logs and slots sit at day
 * offsets from the day the run runs on (`localDay`, `at`), every printed string is rebuilt from the same offsets with
 * the `Intl` options the page uses, and the browser's zone is read from the page (`test 2` prints it) — on this PC it
 * resolved to `Europe/Madrid`, which is the zone every read range below is computed in.
 *
 * Nothing here is a calendar day of arithmetic either: a range is built from day keys and `setDate`
 * (`localDay`/`addDaysOf`), the end of a day is **the next day's midnight minus one millisecond** (`zoneRangeOf` →
 * `zoneMidnightOf(nextDayKey(…), zone) − 1`) and never `+86 400 000 ms`, which is wrong on a 23-hour or 25-hour
 * daylight-saving day. Every navigation and permission case picks its days the same way, so it runs the same on a
 * Monday, a Tuesday or a Friday (finding 7: how many cells are editable is a property of the weekday, so no test
 * counts them).
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — the tenant, organization,
 * team, project and task ids and names (`fixture.ids`, `fixture.names`), the reader's employee id and role permissions
 * (`mock-gauzy-server.mjs:50-81`), the organization's `allowManualTime / allowModifyTime / allowDeleteTime` (`:95-97`),
 * and the day's plan (`:256-267`, `:760-761`: the mock answers `GET /api/daily-plan/*` with its one plan, dated
 * `scenario.planDate` — that is how the planned day and the day with no plan are told apart).
 *
 * **Served by this file:** every time-log, time-slot, activity and (except the plan) daily-plan read from test 1 on,
 * and every write, through a store-backed `page.route` on the mock origin — the pattern of
 * `suites/lane-b/member-timesheet-report-ui.spec.ts:678-720`. The mock has no idea what a served slot, a created log or
 * a deleted entry looks like. Each answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`;
 * `OPTIONS` → 204 at `:1097-1101`) — the page is on `localhost:3032`, the API on `127.0.0.1:3996`. The store is a plain
 * object a test can change mid-case (`store.refusals`), which is how a refusal is armed without re-registering a route.
 * A read is answered **only with what its own `employeeIds[]`, `startDate` and `endDate` ask for** — what a real
 * backend does, and what makes a day navigation visibly cost, or not cost, a request. The daily-plan read is answered by
 * the mock itself (`route.fallback()`), so the plan block runs on the mock's own fixture plan and its real
 * `dailyPlanSchema` shape. `route.fetch()` is never called on a served path.
 *
 * ## Findings worth naming
 *
 * 1. **The screenshots this file serves are not mock-origin addresses.** `next/image` refuses a `src` whose host is not
 *    in `next.config.js:23-36` (`images.remotePatterns` allows `127.0.0.1:3000`, `localhost:3030`, `127.0.0.1:3030`),
 *    and a mock-origin address is none of them: a probe that served `http://127.0.0.1:3996/shots/…` fell to the page's
 *    error boundary with `Invalid src prop (… ) on next/image` (`probe-workdiary-1.log`). So screenshot addresses are
 *    `https://cdn.ever.co/e2e/work-diary/…` — the host the app's own `image-hosts.js:46` (apps/web root, read by
 *    `next.config.js:5`) lists and
 *    `suites/lane-c/member-avatar.spec.ts:123-125` uses for the same reason — and the bytes come from this file's own
 *    `page.route` on the app's `/_next/image` (a real 1×1 PNG), so nothing leaves the machine. What is measured is the
 *    optimizer call the page makes, not picture content.
 * 2. **A slot sheet has no accessible name.** The dialog `diary-slot-sheet.tsx` opens with `aria-label=""`
 *    (`probe-workdiary-4.log` `sheet aria-label ""`), so this file addresses it as `getByRole('dialog')` and asserts its
 *    printed copy.
 * 3. **While a slot sheet is open the day toolbar is not reachable by role.** The strip buttons disappear from
 *    `getByRole('list', { name: 'Days of the period' })` (`probe-workdiary-11.log`: the click on the pressed strip
 *    button timed out), so "an open slot closes when the day or the view changes" is not reachable from this page. It is
 *    asserted by the component tests `core/components/dashboards/work-diary/work-diary-page.test.tsx:310` (Today moves
 *    to another day) and `:393` (the view changes); here the sheet is closed by its own `Close` button and by Escape.
 * 4. **A refused read stays "loading" until TanStack Query's retries end.** `probe-workdiary-9.log` measured **no**
 *    error notice right after a 500 logs read; `probe-workdiary-10.log` measured one after the retries. So the refused
 *    read tests poll for the notice and never count the failed requests (`brief-common`: a failed read's request count
 *    is not assertable).
 * 5. **`todayStart` / `todayEnd` follow the queried day, not the wall clock.** A slots read for `?date=2026-11-23`
 *    sends `todayStart=2026-11-22T23:00:00.000Z&todayEnd=2026-11-23T22:59:59.999Z` (that day in `Europe/Madrid`),
 *    identical to its `startDate` / `endDate` (`probe-workdiary-4.log` `slot reads`).
 * 6. **The sheet's day names are relative.** `core/components/dashboards/timesheets/timesheet-day-label.ts:6-16`
 *    (`dayNameOf` — its own comment: `"Today", "Yesterday", then the weekday`) names today `common.TODAY` and yesterday
 *    `common.YESTERDAY` before the date, and `:20-27` (`dayLabelOf`, `"Today, Nov 2", "Monday, Oct 27"`) puts them in the
 *    header, so the week column header reads `Yesterday, Nov 26, 3h 30m` while the day strip
 *    beside it reads `Thursday, November 26, time tracked` (`diary-day-strip.tsx`, `probe-workdiary-4.log` / `-5.log`).
 *    Both are rebuilt here from the same date with the same options.
 * 7. **Only days up to today get an editable cell.** With `ALLOW_MANUAL_TIME` the week of a run on Friday 2026-11-27
 *    printed 15 inputs (3 rows × Mon…Fri) and `–No time` locked cells for Sat and Sun (`probe-workdiary-5.log` W2/W3,
 *    `probe-workdiary-8.log` X1). That count is a function of the **weekday of the run** — a Monday week has seven
 *    editable days, a Friday week five — so no test here pins it: test 10 pins the one cell it types into and the
 *    entries buttons of the cells the served store has logs on, and no assertion counts editable cells.
 * 8. **The delete confirmation's `[role=dialog]` has zero height** (`rect=1280x0`, `probe-workdiary-8.log` `dialog
 * nodes`); its visible copy is the `<h3>` `common.DELETE_CONFIRMATION`, and the confirm button is one of the page's
 *    `common.DELETE` buttons, so the dialog is asserted by its copy, not by its dialog role.
 * 9. **A cell's "Show 1 entry" button only takes pointer events once the cell is hovered**
 *    (`timesheets-sheet-cell.tsx:34` `opacity-0 … group-hover/cell:pointer-events-auto`), which is why the entry-panel
 *    tests `hover()` the cell first.
 * 10. **A malformed `?date=` / `?view=` never rewrites the URL.** `diaryDayOfParam` (`core/lib/utils/dashboards/
 *    work-diary.ts:276-296`) falls back to today for a value that is not a real day or is in the future, clamps
 *    anything below `DIARY_HISTORY_START` (`:268`, 2000-01-01), and `diaryViewOfParam` (`:301-306`) accepts only `week`;
 *    the address bar keeps what was typed (`probe-workdiary-4.log` `param …`). The same fallbacks are unit-tested in
 *    `core/lib/utils/dashboards/work-diary.test.ts`.
 *
 * 11. **The shell's sidebar sends its own `/api/time-goals` read at a moment of the run, not of the day picked.**
 *     `app-sidebar.tsx:143-144` enables it only once the shell settles (`shellSettledState`,
 *     `core/stores/common/shell.ts:9`, `app-sidebar.tsx:143`), `core/hooks/time-goals/use-time-goals.ts:54-63` sends
 *     the list read with `staleTime: GOALS_STALE_MS` (`:23`, 60 s) and no refetch interval, and no Work diary component
 *     imports it (`core/components/dashboards/work-diary`, `core/hooks/dashboards/work-diary` — no match for `goal`).
 *     `s3-lane-b-workdiary-diag2.log` measured it landing **inside** a day-pick window (test 4's read list printed
 *     `/api/time-goals` beside the day's activity and slots reads), so the navigation windows of test 4 are taken over
 *     the diary's own three paths (`/api/timesheet/time-log`, `/api/timesheet/statistics/time-slots`,
 *     `/api/timesheet/activity`) and whatever the shell sent in each window is printed
 *     (`MEASURE reads the shell sent during …`) instead of pinned either way.
 *
 * ## What is not covered here
 *
 * The member picker of the screenshots section (`diary-day-strip.tsx` `MEMBER_PICKER`: another member's diary) needs a
 * team-member switch this page does not offer a member — the diary a member sees is their own
 * (`use-work-diary-week.ts:38-85` pins `employeeId` to the reader and `hasOrganizationRole: false` at `:66`). The
 * week sheet's "Copy last week" and "Add row" controls, the task-row menus, and the timer are other specs' ground
 * (`member-timesheet-report-ui.spec.ts`, `time-activity-ui.spec.ts`). A slot sheet opened on a slot whose screenshots
 * fail to load, and the plan-required tracking flow (`requirePlanToTrack`), are not driven here.
 */

/* ------------------------------------------------------------------ English, read by key */

/** The tables of English this spec reads, keyed exactly as `locales/en.json` holds them (no `any`: a moved key is a type error). */
type CopySource = Record<string, unknown>;

interface EnCopy {
	common: CopySource;
	dashboard: {
		workDiary: CopySource;
		timesheets: CopySource & { diary: CopySource; SHEET: CopySource & { EDIT: CopySource } };
		calendar: CopySource & { VIEWS: CopySource };
		states: CopySource;
	};
	toasts: CopySource & { time: CopySource; REASONS: CopySource };
	pages: { unauthorized: CopySource };
	sidebar: CopySource;
}

const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as EnCopy;

/** Loading the file fails if a key this spec names is gone, so a renamed row never silently weakens an assertion. */
function copyTable(table: CopySource, keys: string[], where: string) {
	const missing = keys.filter((key) => typeof table[key] !== 'string');
	if (missing.length) throw new Error(`locales/en.json (${where}) has no key for ${missing.join(', ')}`);
	return table as Record<string, string>;
}

const C = copyTable(
	EN.common,
	[
		'TASKS',
		'SCREENSHOTS',
		'TODAY',
		'YESTERDAY',
		'CLOSE',
		'DELETE',
		'DELETE_CONFIRMATION',
		'IRREVERSIBLE_ACTION_WARNING',
		'CANCEL'
	],
	'common'
);
const W = copyTable(
	EN.dashboard.workDiary,
	['FIGURES_LABEL', 'PICK_DAY', 'APPS_EMPTY', 'NO_TIME_HINT', 'WEEK_TITLE', 'WEEK_NO_MANUAL_TIME_PERMISSION'],
	'dashboard.workDiary'
);
const D = copyTable(
	EN.dashboard.timesheets.diary,
	[
		'DAY_STRIP',
		'DAY_TRACKED',
		'DAY_NO_TIME',
		'PREVIOUS_WEEK',
		'NEXT_WEEK',
		'NO_SCREENSHOT',
		'SLOT_LABEL',
		'SHOT_ALT',
		'NO_TIME_TITLE',
		'TRACKED_META',
		'SHOT_COUNT',
		'TRACKED',
		'ACTIVITY',
		'APPS',
		'OPEN_FULL',
		'SHOT_OF',
		'SLOT_TITLE'
	],
	'dashboard.timesheets.diary'
);
const T = copyTable(EN.dashboard.timesheets, ['NO_TASK', 'DAY_LABEL'], 'dashboard.timesheets');
const SH = copyTable(
	EN.dashboard.timesheets.SHEET,
	['TASK_COUNT', 'NO_TIME', 'TABLE_LABEL', 'PERIOD_TOTAL', 'DAY_HEADER', 'ENTRIES_LABEL', 'CELL_LABEL'],
	'dashboard.timesheets.SHEET'
);
const ED = copyTable(
	EN.dashboard.timesheets.SHEET.EDIT,
	['SHOW_ENTRIES', 'CELL_INPUT', 'EMPTY_HINT'],
	'dashboard.timesheets.SHEET.EDIT'
);
const CAL = copyTable(
	EN.dashboard.calendar,
	['PLAN_TITLE', 'NO_PLAN', 'REACH', 'EMPTY_PERIOD', 'EMPTY_MESSAGE'],
	'dashboard.calendar'
);
const VIEWS = copyTable(EN.dashboard.calendar.VIEWS, ['DAY', 'WEEK'], 'dashboard.calendar.VIEWS');
const STATES = copyTable(EN.dashboard.states, ['ERROR_TITLE', 'ERROR_MESSAGE'], 'dashboard.states');
const TOASTS = copyTable(EN.toasts, ['MUTATION_FAILED'], 'toasts');
const TOAST_TIME = copyTable(EN.toasts.time, ['LOG_DELETED'], 'toasts.time');
const TOAST_REASONS = copyTable(EN.toasts.REASONS, ['UNKNOWN'], 'toasts.REASONS');
const PAGES = copyTable(EN.pages.unauthorized, ['TRY_AGAIN'], 'pages.unauthorized');
const SIDEBAR = copyTable(EN.sidebar, ['WORK_DIARY'], 'sidebar');

/** `{count, plural, one {…} other {…}}` and `{hole}` templates filled the way next-intl fills them. */
const copy = (template: string, values: Record<string, string | number> = {}) => {
	const closingBraceOf = (source: string, openAt: number) => {
		let depth = 0;
		for (let index = openAt; index < source.length; index += 1) {
			if (source[index] === '{') depth += 1;
			else if (source[index] === '}') {
				depth -= 1;
				if (depth === 0) return index;
			}
		}
		return source.length;
	};
	let filled = template;
	for (;;) {
		const start = filled.search(/\{\w+, plural,/);
		if (start < 0) break;
		const header = /^\{(\w+), plural,/.exec(filled.slice(start));
		if (!header) break;
		const end = closingBraceOf(filled, start);
		const body = filled.slice(start + header[0].length, end);
		const branches: Array<[string, string]> = [];
		let cursor = 0;
		while (cursor < body.length) {
			const key = /^\s*([=#\w]+)\s*\{/.exec(body.slice(cursor));
			if (!key) break;
			const open = cursor + key[0].length - 1;
			const close = closingBraceOf(body, open);
			branches.push([key[1], body.slice(open + 1, close)]);
			cursor = close + 1;
		}
		const count = Number(values[header[1]] ?? 0);
		const branch =
			branches.find(([key]) => key === `=${count}`) ??
			branches.find(([key]) => key === (count === 1 ? 'one' : 'other')) ??
			branches.find(([key]) => key === 'other');
		filled = `${filled.slice(0, start)}${(branch?.[1] ?? '').replaceAll('#', String(count))}${filled.slice(end + 1)}`;
	}
	return Object.entries(values).reduce((text, [name, value]) => text.replaceAll(`{${name}}`, String(value)), filled);
};

/* ------------------------------------------------------------------ the clock, in the browser's zone */

const DIARY_PATH = '/work-diary';
/** The day every served log and slot sits on, and the day of the plan the mock is asked to place. */
const DAY = -1;
/** Another day than the viewed one — the day the mock is asked to put its plan on in tests 6 and 7, which only need
 *  the plan to sit on a day other than the viewed one. It is inside the viewed week on most weekdays and outside it
 *  on a Tuesday or a Wednesday; no assertion here assumes it is in the same week. */
const OTHER_DAY = -3;
/** A typed cell starts at this hour of its own day (`timesheet-sheet-edit.ts:30` `PLACEMENT_START_HOUR`). */
const PLACEMENT_START_HOUR = 9;
const DAY_SECONDS = 7200 + 3600 + 1800;

const pad = (value: number) => String(value).padStart(2, '0');
const dayKeyOf = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
const localDay = (offset: number) => {
	const day = new Date();
	day.setHours(12, 0, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const localDayKey = (offset: number) => dayKeyOf(localDay(offset));
/** An instant on day `offset` of the run at `hour:minute` of the browser's own zone. */
const at = (offset: number, hour: number, minute = 0) => {
	const day = new Date();
	day.setHours(hour, minute, 0, 0);
	day.setDate(day.getDate() + offset);
	return day;
};
const isoOf = (date: Date) => date.toISOString();
const addDaysOf = (date: Date, days: number) => {
	const next = new Date(date);
	next.setHours(12, 0, 0, 0);
	next.setDate(next.getDate() + days);
	return next;
};
/** What the wall clock of `zone` reads at `instant`, as a UTC-style millisecond number. */
const wallOf = (instant: Date, zone: string) => {
	const parts = new Intl.DateTimeFormat('en-US', {
		timeZone: zone,
		year: 'numeric',
		month: '2-digit',
		day: '2-digit',
		hour: '2-digit',
		minute: '2-digit',
		second: '2-digit',
		hourCycle: 'h23'
	}).formatToParts(instant);
	const part = (type: string) => Number(parts.find((entry) => entry.type === type)?.value ?? '0');
	return Date.UTC(part('year'), part('month') - 1, part('day'), part('hour'), part('minute'), part('second'));
};
/** The instant `zone` calls midnight of `dayKey` (two correction passes: enough off any DST boundary). */
const zoneMidnightOf = (dayKey: string, zone: string) => {
	const [year, month, day] = dayKey.split('-').map(Number);
	const wanted = Date.UTC(year, month - 1, day);
	let guess = new Date(wanted - (wallOf(new Date(wanted), zone) - wanted));
	guess = new Date(wanted - (wallOf(guess, zone) - guess.getTime()));
	return guess;
};
/** The local day after `dayKey`, by calendar arithmetic — never `+86 400 000 ms`, which is another day on a
 *  daylight-saving day (a 23-hour or 25-hour day) and one day off at the far end of a range. */
const nextDayKey = (dayKey: string) => {
	const [year, month, day] = dayKey.split('-').map(Number);
	return dayKeyOf(new Date(year, month - 1, day + 1, 12));
};
/** `formatStartAndEndDateRange` (`core/lib/helpers/format-date-range.ts:125-155`): the day bounds a read sends — a day
 *  ends one millisecond before the next day's midnight in the zone the read names. */
const zoneRangeOf = (fromKey: string, toKey: string, zone: string) => ({
	start: zoneMidnightOf(fromKey, zone).toISOString(),
	end: new Date(zoneMidnightOf(nextDayKey(toKey), zone).getTime() - 1).toISOString()
});
/** The Monday-start week `date` sits in: the mock organization sets no `startWeekOn` (`mock-gauzy-server.mjs:95-97`). */
const weekOfLocalDay = (date: Date) => {
	const monday = new Date(date);
	monday.setHours(12, 0, 0, 0);
	monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7));
	return Array.from({ length: 7 }, (_, index) => addDaysOf(monday, index));
};
const formatWith = (options: Intl.DateTimeFormatOptions, zone?: string) =>
	new Intl.DateTimeFormat('en', zone ? { ...options, timeZone: zone } : options);
/** The clocks print the browser's zone, so these formats run in it too (`useDayFormats`, `diary-hours.tsx`). */
const clockOf = (date: Date) => formatWith({ hour: 'numeric', minute: '2-digit' }).format(date);
const hourOf = (date: Date) => formatWith({ hour: 'numeric' }).format(date);
const entryClockOf = (date: Date) => formatWith({ hour: '2-digit', minute: '2-digit', hour12: true }).format(date);
const shortDayOf = (date: Date) => formatWith({ weekday: 'short', month: 'short', day: 'numeric' }).format(date);
const longDayOf = (date: Date) =>
	formatWith({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }).format(date);
/** `timesheet-day-label.ts:16` — `weekday(date)`: a long weekday, then the date of the current year. */
const sheetDayNameOf = (date: Date) => {
	const relative = dayKeyOf(date);
	const todayKey = dayKeyOf(new Date());
	const yesterdayKey = dayKeyOf(addDaysOf(new Date(), -1));
	if (relative === todayKey) return C.TODAY;
	if (relative === yesterdayKey) return C.YESTERDAY;
	return formatWith({ weekday: 'long' }).format(date);
};
const sheetDayLabelOf = (date: Date) =>
	copy(T.DAY_LABEL, {
		day: sheetDayNameOf(date),
		date: formatWith({ month: 'short', day: 'numeric' }).format(date)
	});
/** `formatDurationShort` (`core/lib/utils/dashboard-figures.ts:19-22`) and `formatHoursLabel` (`:25-31`). */
const durationOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
const hoursLabelOf = (seconds: number) => {
	const minutes = Math.floor((seconds % 3600) / 60);
	return minutes === 0 ? `${Math.floor(seconds / 3600)}h` : durationOf(seconds);
};
/** `formatPercent` (`core/lib/utils/dashboards/work-diary.ts` through `diary-figures.tsx:39`): a whole percent. */
const percentOfText = (fraction: number) =>
	new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 }).format(fraction);

const stripLabelOf = (date: Date, tracked: boolean) =>
	copy(tracked ? D.DAY_TRACKED : D.DAY_NO_TIME, {
		day: formatWith({ weekday: 'long', month: 'long', day: 'numeric' }).format(date)
	});

const report = (label: string, value: unknown) =>
	console.log(`[lane-b workdiary] MEASURE ${label} ${JSON.stringify(value)}`);
const flat = (value: string) => value.replace(/\s+/g, ' ').trim();

/* ------------------------------------------------------------------ the served store */

type Fixture = { ids: Record<string, string>; names: Record<string, string> };

type ServedLog = {
	id: string;
	startedAt: string;
	stoppedAt: string;
	duration: number;
	logType: string;
	source: string;
	isBillable: boolean;
	isRunning: boolean;
	version: string;
	employeeId: string;
	employee: { id: string; fullName: string; firstName: string; lastName: string; user: { id: string } };
	taskId: string | null;
	task: { id: string; title: string; taskNumber: null } | null;
	projectId: string | null;
	project: { id: string; name: string; color: string } | null;
	timesheetId: string;
	timesheet: { id: string; status: string; reason: string | null; startedAt: string; stoppedAt: string };
	notes: null;
	organizationId: string;
	tenantId: string;
};

type ServedSlot = {
	id: string;
	employeeId: string;
	startedAt: string;
	stoppedAt: string;
	duration: number;
	percentage?: number;
	screenshots: Array<{ id: string; thumbUrl: string; fullUrl: string; recordedAt: string }>;
	timeLogs: never[];
	tenantId: string;
	organizationId: string;
};

type ServedActivity = {
	id: string;
	title: string;
	description: string | null;
	type: string;
	date: string;
	time: string;
	duration: number;
	employeeId: string;
	timeSlotId: string | null;
	recordedAt: string;
	tenantId: string;
	organizationId: string;
};

type DiaryStore = {
	logs: ServedLog[];
	slots: ServedSlot[];
	activities: ServedActivity[];
	/** `"<METHOD> <path>"` → the status to answer with; armed mid-test. */
	refusals: Record<string, number>;
};

type ServedCall = {
	method: string;
	path: string;
	search: string;
	params: Record<string, string>;
	body: Record<string, unknown> | null;
	frameUrl: string;
};

/**
 * Screenshot addresses. `next/image` refuses a mock-origin `src` (`next.config.js:23-36`, finding 1), so they are on
 * `cdn.ever.co`, the host `image-hosts.js:46` lists, and their bytes are answered by this file's own `/_next/image`
 * route. `suites/lane-c/member-avatar.spec.ts:123-130` serves avatars the same way.
 */
const IMAGE_HOST = 'https://cdn.ever.co';
const shotAddress = (name: string, kind: 'thumb' | 'full') => `${IMAGE_HOST}/e2e/work-diary/${name}-${kind}.png`;
const isShotAddress = (value: string) => value.startsWith(`${IMAGE_HOST}/e2e/work-diary/`);
/** A real 1×1 PNG (`member-avatar.spec.ts:130`). */
const TINY_PNG = Buffer.from(
	'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
	'base64'
);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-origin': APP_ORIGIN,
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store'
};

const LOGS_PATH = '/api/timesheet/time-log';
const SLOTS_PATH = '/api/timesheet/statistics/time-slots';
const ACTIVITY_PATH = '/api/timesheet/activity';
const PLANS_PATH = '/api/daily-plan';

const employeeOf = (id: string, fullName: string, userId: string) => ({
	id,
	fullName,
	firstName: fullName.split(' ')[0],
	lastName: fullName.split(' ').slice(1).join(' '),
	user: { id: userId }
});

const logOf = (options: {
	id: string;
	employeeId: string;
	userId: string;
	fullName: string;
	offset: number;
	startHour: number;
	seconds: number;
	taskId?: string | null;
	taskTitle?: string;
	projectId?: string | null;
	projectName?: string;
	logType?: string;
	fixture: Fixture;
}): ServedLog => {
	const startedAt = at(options.offset, options.startHour);
	const stoppedAt = new Date(startedAt.getTime() + options.seconds * 1000);
	const projectId = options.projectId ?? null;
	return {
		id: options.id,
		startedAt: isoOf(startedAt),
		stoppedAt: isoOf(stoppedAt),
		duration: options.seconds,
		logType: options.logType ?? 'TRACKED',
		source: 'TEAMS',
		isBillable: true,
		isRunning: false,
		version: '1',
		employeeId: options.employeeId,
		employee: employeeOf(options.employeeId, options.fullName, options.userId),
		taskId: options.taskId ?? null,
		task: options.taskId ? { id: options.taskId, title: options.taskTitle ?? '', taskNumber: null } : null,
		projectId,
		project: projectId ? { id: projectId, name: options.projectName ?? 'Fixture Project', color: '#22c55e' } : null,
		timesheetId: `sheet-${options.id}`,
		timesheet: {
			id: `sheet-${options.id}`,
			status: 'PENDING',
			reason: null,
			startedAt: isoOf(startedAt),
			stoppedAt: isoOf(stoppedAt)
		},
		notes: null,
		organizationId: options.fixture.ids.organizationA,
		tenantId: options.fixture.ids.tenantA
	};
};

/** A served ten-minute slot, the shape `timeSlotsDataSchema` reads (`core/types/schemas/timesheet/…`). */
const slotOf = (options: {
	id: string;
	employeeId: string;
	offset: number;
	startHour: number;
	startMinute: number;
	percentage?: number | null;
	shots?: number;
	fixture: Fixture;
}): ServedSlot => {
	const startedAt = at(options.offset, options.startHour, options.startMinute);
	const seconds = 600;
	const stoppedAt = new Date(startedAt.getTime() + seconds * 1000);
	return {
		id: options.id,
		employeeId: options.employeeId,
		startedAt: isoOf(startedAt),
		stoppedAt: isoOf(stoppedAt),
		duration: seconds,
		...(options.percentage === null ? {} : { percentage: options.percentage ?? 50 }),
		screenshots: Array.from({ length: options.shots ?? 0 }, (_, index) => ({
			id: `${options.id}-shot-${index + 1}`,
			thumbUrl: shotAddress(`${options.id}-${index + 1}`, 'thumb'),
			fullUrl: shotAddress(`${options.id}-${index + 1}`, 'full'),
			recordedAt: isoOf(new Date(startedAt.getTime() + 30_000 * (index + 1)))
		})),
		timeLogs: [],
		tenantId: options.fixture.ids.tenantA,
		organizationId: options.fixture.ids.organizationA
	};
};

/** A served app / site entry, the shape `GET /timesheet/activity` answers with. */
const activityOf = (options: {
	id: string;
	employeeId: string;
	title: string;
	description?: string | null;
	type?: string;
	offset: number;
	startHour: number;
	startMinute: number;
	seconds: number;
	timeSlotId?: string | null;
	fixture: Fixture;
}): ServedActivity => {
	const start = at(options.offset, options.startHour, options.startMinute);
	return {
		id: options.id,
		title: options.title,
		description: options.description ?? null,
		type: options.type ?? 'APP',
		date: dayKeyOf(start),
		time: `${pad(start.getHours())}:${pad(start.getMinutes())}:00`,
		duration: options.seconds,
		employeeId: options.employeeId,
		timeSlotId: options.timeSlotId ?? null,
		recordedAt: isoOf(start),
		tenantId: options.fixture.ids.tenantA,
		organizationId: options.fixture.ids.organizationA
	};
};

/**
 * The store the tests serve: three of the reader's own logs on `DAY`, one teammate's log on the same day, five slots
 * (one of them a teammate's, one with no percentage and no screenshot), and two app/site entries of the reader's.
 */
const newStore = (fixture: Fixture, overrides: Partial<DiaryStore> = {}): DiaryStore => {
	const own = fixture.ids.employee;
	const teammate = fixture.ids.teammateEmployee;
	const logs: ServedLog[] = [
		logOf({
			id: 'diary-task-a',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: DAY,
			startHour: 9,
			seconds: 7200,
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task,
			fixture
		}),
		logOf({
			id: 'diary-task-b',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: DAY,
			startHour: 14,
			seconds: 3600,
			taskId: 'probe-task-b',
			taskTitle: 'Probe afternoon task',
			projectId: 'probe-project-b',
			projectName: 'Probe second project',
			logType: 'MANUAL',
			fixture
		}),
		logOf({
			id: 'diary-untasked',
			employeeId: own,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: DAY,
			startHour: 16,
			seconds: 1800,
			taskId: null,
			projectId: null,
			fixture
		}),
		logOf({
			id: 'diary-teammate',
			employeeId: teammate,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			offset: DAY,
			startHour: 10,
			seconds: 5400,
			taskId: 'probe-task-c',
			taskTitle: 'Probe teammate task',
			fixture
		})
	];
	const slots: ServedSlot[] = [
		slotOf({
			id: 'slot-a',
			employeeId: own,
			offset: DAY,
			startHour: 9,
			startMinute: 0,
			percentage: 64,
			shots: 2,
			fixture
		}),
		slotOf({
			id: 'slot-b',
			employeeId: own,
			offset: DAY,
			startHour: 9,
			startMinute: 10,
			percentage: 80,
			shots: 1,
			fixture
		}),
		slotOf({
			id: 'slot-c',
			employeeId: own,
			offset: DAY,
			startHour: 9,
			startMinute: 20,
			percentage: null,
			shots: 0,
			fixture
		}),
		slotOf({
			id: 'slot-d',
			employeeId: own,
			offset: DAY,
			startHour: 10,
			startMinute: 0,
			percentage: 50,
			shots: 1,
			fixture
		}),
		slotOf({
			id: 'slot-e',
			employeeId: teammate,
			offset: DAY,
			startHour: 9,
			startMinute: 0,
			percentage: 30,
			shots: 1,
			fixture
		})
	];
	const activities: ServedActivity[] = [
		activityOf({
			id: 'act-vscode',
			employeeId: own,
			title: 'Visual Studio Code',
			description: 'work-diary-page.tsx',
			offset: DAY,
			startHour: 9,
			startMinute: 0,
			seconds: 1200,
			timeSlotId: 'slot-a',
			fixture
		}),
		activityOf({
			id: 'act-chrome',
			employeeId: own,
			title: 'Google Chrome',
			description: 'ever.team/docs',
			type: 'URL',
			offset: DAY,
			startHour: 9,
			startMinute: 10,
			seconds: 600,
			timeSlotId: 'slot-b',
			fixture
		}),
		activityOf({
			id: 'act-teammate',
			employeeId: teammate,
			title: 'Teammate App',
			offset: DAY,
			startHour: 9,
			startMinute: 0,
			seconds: 900,
			timeSlotId: 'slot-e',
			fixture
		})
	];
	return { logs, slots, activities, refusals: {}, ...overrides };
};

/* ------------------------------------------------------------------ the served routes */

const paramsOf = (url: URL) => {
	const params: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		params[key] = value;
	});
	return params;
};

/** Lists are indexed in the query string (`employeeIds[0]`, `logIds[0]`), so a list is read out of its brackets. */
const queryValuesOf = (params: Record<string, string>, name: string) =>
	Object.entries(params)
		.filter(([key]) => key === name || key.startsWith(`${name}[`))
		.sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
		.map(([, value]) => value);

const isShotOptimizerCall = (url: URL) =>
	url.pathname === '/_next/image' && isShotAddress(url.searchParams.get('url') ?? '');

async function serveDiaryApi(page: Page, store: DiaryStore) {
	const calls: ServedCall[] = [];
	const jsonHeaders = { ...CORS_HEADERS, 'content-type': 'application/json' };

	// The screenshot bytes: the browser asks the app's own optimiser, this file answers it (finding 1).
	await page.route(isShotOptimizerCall, (route) =>
		route.fulfill({ status: 200, contentType: 'image/png', body: TINY_PNG })
	);

	await page.route(
		(url) => url.origin === new URL(MOCK_ORIGIN).origin && url.pathname.startsWith('/api/'),
		async (route) => {
			const request = route.request();
			const url = new URL(request.url());
			const method = request.method();
			const path = url.pathname;

			if (method === 'OPTIONS') return route.fulfill({ status: 204, headers: CORS_HEADERS });

			const params = paramsOf(url);
			let body: Record<string, unknown> | null = null;
			try {
				const posted = request.postData();
				body = posted ? (JSON.parse(posted) as Record<string, unknown>) : null;
			} catch {
				body = null;
			}
			calls.push({ method, path, search: url.search, params, body, frameUrl: request.frame().url() });

			const refusal = store.refusals[`${method} ${path}`];
			if (refusal) {
				return route.fulfill({
					status: refusal,
					headers: jsonHeaders,
					body: JSON.stringify({ statusCode: refusal, message: 'this file refused the call' })
				});
			}

			const askedEmployees = queryValuesOf(params, 'employeeIds');
			const from = params.startDate;
			const to = params.endDate;
			const inRange = (instant: string) => {
				const time = new Date(instant).getTime();
				if (from && time < new Date(from).getTime()) return false;
				if (to && time > new Date(to).getTime()) return false;
				return true;
			};

			if (method === 'GET' && path === LOGS_PATH) {
				return route.fulfill({
					status: 200,
					headers: jsonHeaders,
					body: JSON.stringify(
						store.logs.filter(
							(log) =>
								(!askedEmployees.length || askedEmployees.includes(log.employeeId)) &&
								inRange(log.startedAt)
						)
					)
				});
			}

			if (method === 'GET' && path === SLOTS_PATH) {
				const wanted = askedEmployees.length
					? askedEmployees
					: [...new Set(store.slots.map((slot) => slot.employeeId))];
				const entries = wanted
					.map((employeeId) => ({
						id: employeeId,
						startedAt: from ?? isoOf(new Date()),
						user: { imageUrl: '', name: '' },
						timeSlots: store.slots.filter(
							(slot) => slot.employeeId === employeeId && inRange(slot.startedAt)
						)
					}))
					.filter((entry) => entry.timeSlots.length > 0);
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(entries) });
			}

			if (method === 'GET' && path === ACTIVITY_PATH) {
				return route.fulfill({
					status: 200,
					headers: jsonHeaders,
					body: JSON.stringify(
						store.activities.filter(
							(entry) =>
								(!askedEmployees.length || askedEmployees.includes(entry.employeeId)) &&
								inRange(entry.recordedAt)
						)
					)
				});
			}

			if (method === 'GET' && path.startsWith(`${PLANS_PATH}/employee/`)) {
				// The plan stays the mock's own: its fixture plan (`mock-gauzy-server.mjs:256-267`, `:760-761`) is what
				// `dailyPlanSchema` validates, and `scenario.planDate` is what says which day has one.
				return route.fallback();
			}

			if (method === 'DELETE' && path === LOGS_PATH) {
				const ids = queryValuesOf(params, 'logIds');
				store.logs = store.logs.filter((log) => !ids.includes(log.id));
				return route.fulfill({
					status: 200,
					headers: jsonHeaders,
					body: JSON.stringify({ success: true, message: `deleted ${ids.length}` })
				});
			}

			if (method === 'POST' && path === LOGS_PATH) {
				// The real API answers the created log with its relations; a bare echo of the body carries no
				// `task`/`project`/`employee`, and the sheet then files the entry under another row.
				const wantedTaskId = String(body?.taskId ?? '');
				const template = store.logs.find((log) => String(log.taskId ?? '') === wantedTaskId) ?? store.logs[0];
				const id = `served-new-${store.logs.length + 1}`;
				const startedAt = String(body?.startedAt ?? '');
				const stoppedAt = String(body?.stoppedAt ?? '');
				const created = {
					...template,
					...(body as Partial<ServedLog>),
					id,
					duration: Math.round((new Date(stoppedAt).getTime() - new Date(startedAt).getTime()) / 1000),
					isRunning: false,
					version: '1',
					logType: 'MANUAL',
					source: 'TEAMS',
					timesheetId: id,
					timesheet: { id, status: 'PENDING', reason: null, startedAt, stoppedAt }
				} satisfies ServedLog;
				store.logs = [...store.logs, created];
				return route.fulfill({ status: 201, headers: jsonHeaders, body: JSON.stringify(created) });
			}

			return route.fallback();
		}
	);

	return {
		calls,
		store,
		/** Every call the stub answered, or fell through to the mock for. */
		served: () => calls.filter((call) => call.method !== 'OPTIONS'),
		writes: () => calls.filter((call) => call.method !== 'GET' && call.method !== 'OPTIONS')
	};
}

/**
 * Every request the page's own frame made to the mock's API. The sign-in helper hard-loads the dashboard first
 * (`playwright/helpers.ts:439-451`), so counting reads only on the diary frame is what makes "this navigation cost a
 * read" mean something.
 */
function recordMockCalls(page: Page) {
	const origin = new URL(MOCK_ORIGIN).origin;
	const calls: Array<{
		method: string;
		path: string;
		search: string;
		params: Record<string, string>;
		frameUrl: string;
	}> = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin !== origin) return;
		calls.push({
			method: request.method(),
			path: url.pathname,
			search: url.search,
			params: paramsOf(url),
			frameUrl: request.frame().url()
		});
	});
	return calls;
}

/* ------------------------------------------------------------------ read out of the printed page */

/** Inside a browser callback the Node `flat` does not exist, so the flattening is written out there. */
const textOf = async (locator: Locator) =>
	flat(await locator.evaluate((node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const allTexts = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
	);
const namedButtons = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes
			.flatMap((node) => Array.from(node.querySelectorAll('button, [role=button], [role=tab], [role=cell]')))
			.map(
				(node) =>
					`${node.getAttribute('role') ?? node.tagName.toLowerCase()}|${node.getAttribute('aria-label') ?? ''}|aria-pressed=${node.getAttribute('aria-pressed') ?? ''}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
			)
	);
const imagesOf = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes
			.flatMap((node) => Array.from(node.querySelectorAll('img')))
			.map((img) => `alt=${img.getAttribute('alt') ?? ''}|src=${(img.getAttribute('src') ?? '').slice(0, 140)}`)
	);
const dayMetaOf = (page: Page) =>
	page.evaluate(() => {
		const heading = document.querySelector('h1');
		const next = heading?.nextElementSibling;
		return next ? (next.textContent ?? '').replace(/\s+/g, ' ').trim() : 'none';
	});
const figuresOf = (page: Page) =>
	page
		.getByRole('list', { name: W.FIGURES_LABEL, exact: true })
		.first()
		.locator('[role=listitem]')
		.evaluateAll((nodes: Element[]) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
const regionsOf = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('section[aria-label]')).map((node) => `${node.getAttribute('aria-label')}`)
	);
const stripOf = (page: Page) => page.getByRole('list', { name: D.DAY_STRIP, exact: true });
const stripItemsOf = (page: Page) =>
	stripOf(page).evaluateAll((nodes: Element[]) =>
		Array.from(nodes[0].querySelectorAll('button')).map(
			(button) =>
				`${button.getAttribute('aria-label')}|aria-pressed=${button.getAttribute('aria-pressed')}|disabled=${button.hasAttribute('disabled')}`
		)
	);
const tasksRegionOf = (page: Page) => page.getByRole('region', { name: C.TASKS, exact: true });
const appsRegionOf = (page: Page) => page.getByRole('region', { name: D.APPS, exact: true });
const shotsRegionOf = (page: Page) => page.getByRole('region', { name: C.SCREENSHOTS, exact: true });
const planRegionOf = (page: Page) => page.getByRole('region', { name: CAL.PLAN_TITLE, exact: true });
const toastsOf = (page: Page) =>
	page
		.locator('li[data-sonner-toast], [role=status], [role=alert]')
		.evaluateAll((nodes: Element[]) =>
			nodes.map(
				(node) =>
					`${node.getAttribute('role') ?? node.tagName.toLowerCase()}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 200)}`
			)
		);
const paramsOfUrl = (page: Page) => {
	const url = new URL(page.url());
	return { date: url.searchParams.get('date'), view: url.searchParams.get('view') };
};

/* ------------------------------------------------------------------ the console, excused only by name */

/** React's dev-mode store warning, not this page's (`suites/lane-a/api-tokens-settings-ui.spec.ts:405-430`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:48`, printed for every failed mutation while the dev overlay is on. */
const MUTATION_TOASTER = 'Mutation failed:';
/** `use-delete-timesheet.ts:46` and `use-timesheet-log-actions.ts:93`, the two logs a refused delete leaves behind. */
const DELETE_HOOK_LOGS = ['Failed to delete timesheets:', 'Failed to delete the time logs'];
/** The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`). */
const armedHttpErrorPattern = (verb: string, loggedPath: string, status: number) =>
	new RegExp(String.raw`\[HttpClient\] HTTP Error: ${verb} ${loggedPath}(\?\S*)? ${status} `);

const consoleFindings = (shield: Shield, armed: RegExp[] = [], extra: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !armed.some((pattern) => pattern.test(line)))
		.filter((line) => !extra.some((text) => line.includes(text)));
const armedFailureLines = (shield: Shield, pattern: RegExp) =>
	shield.consoleErrors().filter((line) => pattern.test(line));

test.afterEach(async () => {
	await mockReset();
});

/* ------------------------------------------------------------------ 1. the day, printed */

test('1 · the day as the page prints it: figures, task rows, app rows, hour groups, slot cards', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`, {
		scenario: { planDate: localDayKey(DAY) }
	});

	const day = localDay(DAY);
	const own = fixture.ids.employee;
	const ownLogs = store.logs.filter((log) => log.employeeId === own);
	const ownSlots = store.slots.filter((slot) => slot.employeeId === own);
	const ownActivities = store.activities.filter((entry) => entry.employeeId === own);
	const trackedSeconds = ownLogs.reduce((sum, log) => sum + log.duration, 0);
	// `mock-gauzy-server.mjs:264` puts `workTimePlanned: 8` on the plan this test asks for on this day.
	const plannedSeconds = 8 * 3600;
	const scored = ownSlots.filter((slot) => typeof slot.percentage === 'number');
	// `weightedActivityOf` (`core/lib/utils/dashboards/work-diary.ts:143-158`): each slot's percent weighted by its
	// seconds; a slot with no recorded percent is left out.
	const activityFraction =
		scored.reduce((sum, slot) => sum + (slot.percentage ?? 0) * slot.duration, 0) /
		scored.reduce((sum, slot) => sum + slot.duration, 0) /
		100;
	const shotCount = ownSlots.reduce((sum, slot) => sum + slot.screenshots.length, 0);
	const taskCount = ownLogs.filter((log) => log.taskId).length;

	await expect(page.getByRole('heading', { level: 1, name: SIDEBAR.WORK_DIARY, exact: true })).toBeVisible();
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(day));

	// The four figures, each rebuilt from the served store: `diary-figures.tsx:40-50`.
	await expect
		.poll(() => figuresOf(page))
		.toEqual([
			`${D.TRACKED}${durationOf(trackedSeconds)}${copy(CAL.REACH, {
				percent: percentOfText(trackedSeconds / plannedSeconds),
				expected: hoursLabelOf(plannedSeconds)
			})}`,
			`${D.ACTIVITY}${percentOfText(activityFraction)}`,
			`${C.TASKS}${taskCount}`,
			`${C.SCREENSHOTS}${shotCount}`
		]);

	// Task rows: the share of the day's tracked time, the task, its project, its own time. A teammate's log of the
	// same day never enters the day.
	const shareOf = (seconds: number) => percentOfText(seconds / trackedSeconds);
	await expect(tasksRegionOf(page).locator('li')).toHaveText([
		`${shareOf(7200)}${fixture.names.task}${durationOf(7200)}`,
		`${shareOf(3600)}Probe afternoon taskProbe second project${durationOf(3600)}`,
		`${shareOf(1800)}${T.NO_TASK}${durationOf(1800)}`
	]);
	await expect(tasksRegionOf(page).locator('li')).toHaveCount(3);
	await expect(tasksRegionOf(page).getByText('Probe teammate task')).toHaveCount(0);
	await expect
		.poll(() =>
			tasksRegionOf(page)
				.locator('a[href^="/task/"]')
				.evaluateAll((nodes: Element[]) =>
					nodes.map(
						(node) => `${node.getAttribute('href')}|${(node.textContent ?? '').replace(/\s+/g, ' ').trim()}`
					)
				)
		)
		.toEqual([`/task/${fixture.ids.task}|${fixture.names.task}`, '/task/probe-task-b|Probe afternoon task']);
	await expect(
		tasksRegionOf(page).getByText(copy(SH.TASK_COUNT, { count: taskCount }), { exact: true })
	).toBeVisible();

	// Apps and sites: the share of the day's recorded app time, the title, what it was used on, its own time.
	const activitySeconds = ownActivities.reduce((sum, entry) => sum + entry.duration, 0);
	await expect(appsRegionOf(page).locator('li')).toHaveText([
		`${percentOfText(1200 / activitySeconds)}Visual Studio Codework-diary-page.tsx${durationOf(1200)}`,
		`${percentOfText(600 / activitySeconds)}Google Chromeever.team/docs${durationOf(600)}`
	]);
	await expect(appsRegionOf(page).getByText('Teammate App')).toHaveCount(0);

	// Screenshots: one group per hour with its tracked total (`diary-hours.tsx`), six ten-minute places each, and a
	// card per served slot of the reader.
	await expect(shotsRegionOf(page).locator('h3')).toHaveText([
		`${hourOf(at(DAY, 9))}${copy(D.TRACKED_META, { duration: durationOf(1800) })}`,
		`${hourOf(at(DAY, 10))}${copy(D.TRACKED_META, { duration: durationOf(600) })}`
	]);
	await expect(shotsRegionOf(page).locator('ol > li')).toHaveCount(12);
	await expect
		.poll(() =>
			shotsRegionOf(page)
				.locator('button[aria-label]')
				.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''))
		)
		.toEqual(
			ownSlots.slice(0, 4).map((slot) =>
				copy(D.SLOT_LABEL, {
					start: clockOf(new Date(slot.startedAt)),
					end: clockOf(new Date(slot.stoppedAt))
				})
			)
		);
	await expect(shotsRegionOf(page).getByText(D.NO_SCREENSHOT, { exact: true })).toHaveCount(1);
	await expect
		.poll(() => imagesOf(shotsRegionOf(page)))
		.toEqual(
			[ownSlots[0], ownSlots[1], ownSlots[3]].map((slot) => {
				const shot = slot.screenshots[0];
				// The card's `<Image>` asks the app's own optimiser for the served address (`next/image` rewrites it to
				// `<origin>/_next/image?url=…&w=640&q=75`, the width the card asks for), and this file answers it.
				return (
					`alt=${copy(D.SHOT_ALT, { time: clockOf(new Date(shot.recordedAt)) })}|src=${APP_ORIGIN}` +
					`/_next/image?url=${encodeURIComponent(shotAddress(`${slot.id}-1`, 'thumb'))}&w=640&q=75`
				);
			})
		);

	// The mock's plan of this day: its planned task with its estimate (`mock-gauzy-server.mjs:183-198`, estimate 3600
	// → `1h 0m`), and done against planned in the section header (`calendar-day-details.tsx:31-48`).
	const planHeader = page
		.getByRole('heading', { name: CAL.PLAN_TITLE, exact: true })
		.locator('xpath=ancestor::header');
	await expect(planRegionOf(page).locator('li')).toHaveText([`${fixture.names.task}${durationOf(3600)}`]);
	await expect
		.poll(() => textOf(planHeader))
		.toBe(`${CAL.PLAN_TITLE}${durationOf(trackedSeconds)}/ ${hoursLabelOf(plannedSeconds)}`);

	report('figures', await figuresOf(page));
	report('day meta', await dayMetaOf(page));
	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 2. the reads the day sends */

test('2 · the reads the day sends, each range as sent, computed in the zone the page reads', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`);

	// The zone the page itself sends, read off the page and never assumed.
	const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
	report('browser zone', zone);

	const day = localDay(DAY);
	const week = weekOfLocalDay(day);
	const dayRange = zoneRangeOf(dayKeyOf(day), dayKeyOf(day), zone);
	// The strip's own log read covers the visible week plus one day at each end (`requestDaysOf` in
	// `core/lib/utils/dashboards/work-diary.ts`); the sheet's read covers the exact week.
	const stripRange = zoneRangeOf(dayKeyOf(addDaysOf(week[0], -1)), dayKeyOf(addDaysOf(week[6], 1)), zone);
	const own = fixture.ids.employee;
	const searchOf = (pairs: Array<[string, string]>) => {
		const params = new URLSearchParams();
		for (const [key, value] of pairs) params.set(key, value);
		return `?${params.toString()}`;
	};
	const logRelations = ['project', 'task', 'organizationContact', 'employee.user', 'task.taskStatus', 'timesheet'];
	const logSearchOf = (relations: string[]) =>
		searchOf([
			['activityLevel[start]', '0'],
			['activityLevel[end]', '100'],
			['organizationId', fixture.ids.organizationA],
			['tenantId', fixture.ids.tenantA],
			['startDate', stripRange.start],
			['endDate', stripRange.end],
			['timeZone', zone],
			...relations.map((relation, index) => [`relations[${index}]`, relation] as [string, string]),
			['employeeIds[0]', own]
		]);
	const slotSearch = searchOf([
		['tenantId', fixture.ids.tenantA],
		['organizationId', fixture.ids.organizationA],
		['employeeIds[0]', own],
		['todayEnd', dayRange.end],
		['todayStart', dayRange.start],
		['startDate', dayRange.start],
		['endDate', dayRange.end],
		['relations[0]', 'timeSlots.timeLogs.projectId'],
		['relations[1]', 'timeSlots.timeLogs.taskId']
	]);
	const activitySearch = searchOf([
		['tenantId', fixture.ids.tenantA],
		['organizationId', fixture.ids.organizationA],
		['employeeIds[0]', own],
		['startDate', dayRange.start],
		['endDate', dayRange.end]
	]);
	const planSearch = searchOf([
		['where[organizationId]', fixture.ids.organizationA],
		['where[tenantId]', fixture.ids.tenantA],
		['where[organizationTeamId]', fixture.ids.teamA],
		['shape', 'lean'],
		['relations[0]', 'employee'],
		['relations[1]', 'tasks'],
		['relations[2]', 'employee.user'],
		['relations[3]', 'tasks.members'],
		['relations[4]', 'tasks.members.user']
	]);

	const ownReads = () => net.filter((call) => call.frameUrl.includes(DIARY_PATH));
	const searchesOf = (path: string) =>
		ownReads()
			.filter((call) => call.path === path)
			.map((call) => call.search);

	// The two log reads of the strip range go out together and differ only in the relations they ask for, so they are
	// compared sorted, not in arrival order.
	const wantedLogSearches = [logSearchOf(logRelations), logSearchOf([...logRelations, 'tags'])].sort((a, b) =>
		a.localeCompare(b, 'en')
	);
	await expect
		.poll(() =>
			searchesOf(LOGS_PATH)
				.slice()
				.sort((a, b) => a.localeCompare(b, 'en'))
		)
		.toEqual(wantedLogSearches);
	await expect.poll(() => searchesOf(SLOTS_PATH)).toEqual([slotSearch]);
	await expect.poll(() => searchesOf(ACTIVITY_PATH)).toEqual([activitySearch]);

	// The plan read repeats (the day view and the week strip each ask for it); every copy sends the same search, so
	// its count is not pinned but its range is.
	const planPath = `${PLANS_PATH}/employee/${own}`;
	await expect.poll(() => searchesOf(planPath).length).toBeGreaterThanOrEqual(1);
	await expect.poll(() => [...new Set(searchesOf(planPath))]).toEqual([planSearch]);

	// The ranges, read back out of the search the browser actually sent.
	const firstLogRead = ownReads().find((call) => call.path === LOGS_PATH);
	expect(firstLogRead).toBeDefined();
	report('strip log read range', {
		start: firstLogRead?.params.startDate,
		end: firstLogRead?.params.endDate,
		timeZone: firstLogRead?.params.timeZone,
		employeeIds: queryValuesOf(firstLogRead?.params ?? {}, 'employeeIds')
	});
	expect(queryValuesOf(firstLogRead?.params ?? {}, 'employeeIds')).toEqual([own]);
	const slotRead = ownReads().find((call) => call.path === SLOTS_PATH);
	// finding 5: `todayStart` / `todayEnd` follow the queried day.
	expect(slotRead?.params.todayStart).toBe(dayRange.start);
	expect(slotRead?.params.todayEnd).toBe(dayRange.end);

	report('log reads', searchesOf(LOGS_PATH));
	report('slot read', searchesOf(SLOTS_PATH));
	report('activity read', searchesOf(ACTIVITY_PATH));
	report('plan reads', searchesOf(planPath));
	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 3. a slot's own sheet */

test('3 · a slot card opens its own sheet, and the sheet closes', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`);

	const own = fixture.ids.employee;
	const ownSlots = store.slots.filter((slot) => slot.employeeId === own);
	const first = ownSlots[0];
	const second = ownSlots[1];
	const shots = shotsRegionOf(page);
	const sheet = page.getByRole('dialog');
	const slotButtonOf = (slot: ServedSlot) =>
		`button[aria-label="${copy(D.SLOT_LABEL, {
			start: clockOf(new Date(slot.startedAt)),
			end: clockOf(new Date(slot.stoppedAt))
		})}"]`;

	await shots.locator(slotButtonOf(first)).first().click({ timeout: 15_000 });
	await expect(sheet.first()).toBeVisible({ timeout: 15_000 });
	// finding 2: the sheet has no accessible name, so it is counted, not named.
	await expect.poll(() => sheet.count()).toBe(1);

	const sheetTitleOf = (slot: ServedSlot) =>
		copy(D.SLOT_TITLE, { start: clockOf(new Date(slot.startedAt)), end: clockOf(new Date(slot.stoppedAt)) });
	const mediumDayOf = (date: Date) => formatWith({ weekday: 'long', month: 'long', day: 'numeric' }).format(date);
	const sheetTextOf = (slot: ServedSlot, activityTitle: string) => {
		const activity = store.activities.find((entry) => entry.employeeId === own && entry.title === activityTitle);
		if (!activity) throw new Error(`the served store has no ${activityTitle}`);
		return (
			`${sheetTitleOf(slot)}${mediumDayOf(new Date(slot.startedAt))}${D.OPEN_FULL}` +
			`${D.TRACKED}${durationOf(slot.duration)}${D.ACTIVITY}${percentOfText((slot.percentage ?? 0) / 100)}` +
			`${D.APPS}${percentOfText(1)}${activity.title}${activity.description ?? ''}${durationOf(activity.duration)}`
		);
	};
	report('slot sheet copy', await allTexts(sheet));
	report('slot sheet images', await imagesOf(sheet));
	await expect.poll(() => allTexts(sheet)).toEqual([sheetTextOf(first, 'Visual Studio Code')]);

	// Two served screenshots on this slot: the first is the one shown, and both are pickable.
	const firstShot = copy(D.SHOT_OF, { index: 1, count: 2 });
	const secondShot = copy(D.SHOT_OF, { index: 2, count: 2 });
	await expect(sheet.getByRole('button', { name: firstShot, exact: true })).toHaveAttribute('aria-pressed', 'true');
	await expect(sheet.getByRole('button', { name: secondShot, exact: true })).toHaveAttribute('aria-pressed', 'false');
	await expect
		.poll(() => imagesOf(sheet))
		.toContainEqual(expect.stringContaining(encodeURIComponent(shotAddress('slot-a-1', 'full'))));

	await sheet.getByRole('button', { name: C.CLOSE, exact: true }).first().click({ timeout: 15_000 });
	await expect.poll(() => sheet.count()).toBe(0);

	// The second slot's sheet prints its own figures.
	await shots.locator(slotButtonOf(second)).first().click({ timeout: 15_000 });
	await expect(sheet.first()).toBeVisible({ timeout: 15_000 });
	await expect.poll(() => allTexts(sheet)).toEqual([sheetTextOf(second, 'Google Chrome')]);

	await page.keyboard.press('Escape');
	await expect.poll(() => sheet.count()).toBe(0);

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 4. moving the day */

test('4 · day navigation: the strip, Today, the week arrows, and a range already read', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	/** The day this case opens on: one whole week back, so every day of its strip is in the past and Today always
	 *  lands in another week. The whole sequence below is therefore the same on any weekday — Monday (today − 1 falls
	 *  inside the viewed week), Tuesday (the viewed week never holds today, so Today is never a no-op) and Sunday
	 *  included — and it never walks into a future day, which the page would clamp back to today. */
	const VIEWED_DAY = -7;
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(VIEWED_DAY)}`);

	const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
	const viewed = localDay(VIEWED_DAY);
	const viewedKey = dayKeyOf(viewed);
	const week = weekOfLocalDay(viewed);
	const other = week.filter((candidate) => dayKeyOf(candidate) !== viewedKey)[0];
	const today = localDay(0);
	const todayWeek = weekOfLocalDay(today);
	// Which days a strip calls "time tracked" is read out of the served store, never assumed: `DAY` sits inside the
	// viewed week on a Monday and outside it on every other weekday, and only the reader's own logs count (the served
	// answer filters the store by the read's own `employeeIds[]`).
	const trackedKeys = new Set(
		store.logs
			.filter((log) => log.employeeId === fixture.ids.employee)
			.map((log) => dayKeyOf(new Date(log.startedAt)))
	);
	// The three reads a day asks for, and nothing else: the shell's sidebar sends its own reads from this same frame at
	// moments of the run (header finding 11), so a window is taken over the diary's paths and the shell's reads are
	// reported instead of pinned.
	const DIARY_READ_PATHS = [LOGS_PATH, ACTIVITY_PATH, SLOTS_PATH];
	const pageReads = () => net.filter((call) => call.frameUrl.includes(DIARY_PATH) && call.method === 'GET');
	const diaryReads = () => pageReads().filter((call) => DIARY_READ_PATHS.includes(call.path));
	const shellReads = () =>
		pageReads()
			.filter((call) => !DIARY_READ_PATHS.includes(call.path))
			.map((call) => `${call.path}|${call.search.slice(0, 40)}`);
	const readsSince = (mark: number) =>
		diaryReads()
			.slice(mark)
			.map((call) => `${call.path}|${call.search}`);
	/** Shell reads are printed, not pinned: snapshot them at the mark and report what landed in the window. */
	const shellSince = (before: number) => shellReads().slice(before);
	const wantedStrip = (days: Date[], viewedDay: Date) =>
		days.map(
			(candidate) =>
				`${stripLabelOf(candidate, trackedKeys.has(dayKeyOf(candidate)))}|aria-pressed=${
					dayKeyOf(candidate) === dayKeyOf(viewedDay)
				}|disabled=${dayKeyOf(candidate) > dayKeyOf(today)}`
		);
	const stripButtonOf = (date: Date) => stripLabelOf(date, trackedKeys.has(dayKeyOf(date)));
	/** A 1.2 s window in which the diary asks for nothing new (its three paths only — a shell read that happens to
	 *  land here is reported at the window, header finding 11): waiting for the absence of a request is the only way to
	 *  prove one did not arrive, and `expect.poll` is what waits. */
	const quietWindow = async (mark: number) => {
		await expect
			.poll(
				async () => {
					const before = diaryReads().length;
					await new Promise((resolve) => setTimeout(resolve, 1_200));
					return diaryReads().length === before ? 'quiet' : `+${diaryReads().length - before} read(s)`;
				},
				{ timeout: 20_000 }
			)
			.toBe('quiet');
		await expect.poll(() => readsSince(mark)).toEqual([]);
	};

	// The strip: the seven days of the week one week back — every one of them in the past, so none is turned off;
	// each named by whether the served store has the reader's time on it, the viewed one pressed (`diary-day-strip.tsx:55-120`).
	await expect.poll(() => stripItemsOf(page)).toEqual(wantedStrip(week, viewed));

	// Another day of that week: its own slots and activity reads, and no new log read — the strip's range already
	// covers the whole week.
	const markPick = diaryReads().length;
	const shellAtPick = shellReads().length;
	await stripOf(page)
		.locator(`button[aria-label="${stripButtonOf(other)}"]`)
		.first()
		.click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(other));
	await expect.poll(() => paramsOfUrl(page).date).toBe(dayKeyOf(other));
	await expect
		.poll(() =>
			readsSince(markPick)
				.map((read) => read.split('|')[0])
				.sort((a, b) => a.localeCompare(b, 'en'))
		)
		.toEqual([ACTIVITY_PATH, SLOTS_PATH].sort((a, b) => a.localeCompare(b, 'en')));
	report('reads the shell sent during the day pick', shellSince(shellAtPick));
	const pickedRange = zoneRangeOf(dayKeyOf(other), dayKeyOf(other), zone);
	const pickedSlots = readsSince(markPick).find((read) => read.startsWith(`${SLOTS_PATH}|`));
	report('slot read of the picked day', pickedSlots);
	expect(pickedSlots?.includes(`todayStart=${encodeURIComponent(pickedRange.start)}`)).toBe(true);
	expect(pickedSlots?.includes(`todayEnd=${encodeURIComponent(pickedRange.end)}`)).toBe(true);

	// Today: the `?date=` hole goes away, and today's week was never read, so it pays for its own log range too.
	const markToday = diaryReads().length;
	const shellAtToday = shellReads().length;
	await page.getByRole('button', { name: C.TODAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(today));
	await expect.poll(() => paramsOfUrl(page).date).toBeNull();
	await expect.poll(() => readsSince(markToday).length).toBe(3);
	await expect
		.poll(() =>
			readsSince(markToday)
				.map((read) => read.split('|')[0])
				.sort((a, b) => a.localeCompare(b, 'en'))
		)
		.toEqual([ACTIVITY_PATH, LOGS_PATH, SLOTS_PATH].sort((a, b) => a.localeCompare(b, 'en')));
	const todaySearch = readsSince(markToday).find((read) => read.startsWith(`${LOGS_PATH}|`)) ?? '';
	const todayRange = zoneRangeOf(dayKeyOf(addDaysOf(todayWeek[0], -1)), dayKeyOf(addDaysOf(todayWeek[6], 1)), zone);
	report('today week log read', todaySearch);
	expect(todaySearch.includes(`startDate=${encodeURIComponent(todayRange.start)}`)).toBe(true);
	expect(todaySearch.includes(`endDate=${encodeURIComponent(todayRange.end)}`)).toBe(true);
	report('reads the shell sent during Today', shellSince(shellAtToday));
	await expect.poll(() => stripItemsOf(page)).toEqual(wantedStrip(todayWeek, today));

	// PREVIOUS_WEEK from today lands on the week the run opened, whose range is already in the query cache: nothing
	// goes out. (This is the step that used to depend on the weekday: from a day of today's week it reached a week
	// that was never read.)
	const markReturn = diaryReads().length;
	const shellAtReturn = shellReads().length;
	await page.getByRole('button', { name: D.PREVIOUS_WEEK, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(viewed));
	await expect.poll(() => paramsOfUrl(page).date).toBe(viewedKey);
	await quietWindow(markReturn);
	report('reads after returning to the week the run opened', readsSince(markReturn));
	report('reads the shell sent during that return', shellSince(shellAtReturn));

	// A day of it that was already picked costs nothing either.
	const markRepick = diaryReads().length;
	const shellAtRepick = shellReads().length;
	await stripOf(page)
		.locator(`button[aria-label="${stripButtonOf(other)}"]`)
		.first()
		.click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(other));
	await quietWindow(markRepick);
	report('reads after re-picking a day already read', readsSince(markRepick));
	report('reads the shell sent during the re-pick', shellSince(shellAtRepick));

	// The week arrows move the picked day a whole week, and a week never read asks for its own log range.
	const earlier = addDaysOf(other, -7);
	const earlierWeek = weekOfLocalDay(earlier);
	const markEarlier = diaryReads().length;
	const shellAtEarlier = shellReads().length;
	await page.getByRole('button', { name: D.PREVIOUS_WEEK, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(earlier));
	await expect.poll(() => paramsOfUrl(page).date).toBe(dayKeyOf(earlier));
	await expect.poll(() => readsSince(markEarlier).length).toBe(3);
	await expect
		.poll(() =>
			readsSince(markEarlier)
				.map((read) => read.split('|')[0])
				.sort()
		)
		.toEqual([ACTIVITY_PATH, LOGS_PATH, SLOTS_PATH].sort((a, b) => a.localeCompare(b, 'en')));
	const earlierSearch = readsSince(markEarlier).find((read) => read.startsWith(`${LOGS_PATH}|`)) ?? '';
	const earlierRange = zoneRangeOf(
		dayKeyOf(addDaysOf(earlierWeek[0], -1)),
		dayKeyOf(addDaysOf(earlierWeek[6], 1)),
		zone
	);
	report('earlier week log read', earlierSearch);
	report('reads the shell sent during the previous week', shellSince(shellAtEarlier));
	expect(earlierSearch.includes(`startDate=${encodeURIComponent(earlierRange.start)}`)).toBe(true);
	expect(earlierSearch.includes(`endDate=${encodeURIComponent(earlierRange.end)}`)).toBe(true);
	await expect.poll(() => stripItemsOf(page)).toEqual(wantedStrip(earlierWeek, earlier));

	// Back over the same week: the day and its range are already read, so nothing goes out.
	const markBack = diaryReads().length;
	const shellAtBack = shellReads().length;
	await page.getByRole('button', { name: D.NEXT_WEEK, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dayMetaOf(page)).toBe(longDayOf(other));
	await expect.poll(() => paramsOfUrl(page).date).toBe(dayKeyOf(other));
	await quietWindow(markBack);
	report('reads the shell sent during the next week', shellSince(shellAtBack));

	// The view switch keeps the day in the address and prints the week it covers; the Day tab drops `view` again.
	await page.getByRole('tab', { name: VIEWS.WEEK, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => paramsOfUrl(page)).toEqual({ date: dayKeyOf(other), view: 'week' });
	await expect
		.poll(() => dayMetaOf(page))
		.toBe(flat(formatWith({ month: 'short', day: 'numeric' }).formatRange(week[0], week[6])));
	await page.getByRole('tab', { name: VIEWS.DAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => paramsOfUrl(page).view).toBeNull();
	await expect.poll(() => paramsOfUrl(page).date).toBe(dayKeyOf(other));

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 5. the week view */

test('5 · the week view: the sheet, its day totals, its read range, and back to the day', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}&view=week`);

	const zone = await page.evaluate(() => Intl.DateTimeFormat().resolvedOptions().timeZone);
	const day = localDay(DAY);
	const week = weekOfLocalDay(day);
	const weekRange = zoneRangeOf(dayKeyOf(week[0]), dayKeyOf(week[6]), zone);
	const section = page.getByRole('region', { name: W.WEEK_TITLE, exact: true });
	await expect(section.first()).toBeVisible({ timeout: 20_000 });
	await expect(section).toHaveCount(1);
	await expect(section.locator('h2')).toHaveText(W.WEEK_TITLE);
	await expect(page.getByLabel(copy(SH.TABLE_LABEL, { name: fixture.names.user }))).toBeVisible();
	await expect
		.poll(() => dayMetaOf(page))
		.toBe(flat(formatWith({ month: 'short', day: 'numeric' }).formatRange(week[0], week[6])));

	// Every day column names its day (relative for yesterday and today, finding 6) and the time on it.
	const wantedDayHeaders = week.map((candidate) =>
		copy(SH.DAY_HEADER, {
			day: sheetDayLabelOf(candidate),
			total: dayKeyOf(candidate) === localDayKey(DAY) ? durationOf(DAY_SECONDS) : SH.NO_TIME
		})
	);
	await expect
		.poll(() =>
			section
				.locator('[role=columnheader][aria-label]')
				.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''))
		)
		.toEqual(wantedDayHeaders);

	// One row per task the reader worked on, plus the period total.
	await expect.poll(() => section.locator('[role=rowheader]').count()).toBe(4);
	await expect
		.poll(() => allTexts(section.locator('[role=rowheader]')))
		.toEqual(
			expect.arrayContaining([
				expect.stringContaining(fixture.names.task),
				expect.stringContaining('Probe afternoon task'),
				expect.stringContaining(T.NO_TASK),
				expect.stringContaining(SH.PERIOD_TOTAL)
			])
		);

	// A role without `ALLOW_MANUAL_TIME` gets no cell to type in: each worked cell is instead a button naming the
	// task, the day, the time and how many logs it holds.
	await expect(section.locator('[role=textbox], input')).toHaveCount(0);
	await expect(page.getByText(W.WEEK_NO_MANUAL_TIME_PERMISSION, { exact: true })).toHaveCount(1);
	const wantedCells = [
		copy(SH.CELL_LABEL, {
			task: fixture.names.task,
			day: sheetDayLabelOf(day),
			duration: durationOf(7200),
			count: 1
		}),
		copy(SH.CELL_LABEL, {
			task: 'Probe afternoon task',
			day: sheetDayLabelOf(day),
			duration: durationOf(3600),
			count: 1
		}),
		copy(SH.CELL_LABEL, {
			task: T.NO_TASK,
			day: sheetDayLabelOf(day),
			duration: durationOf(1800),
			count: 1
		})
	].sort((a, b) => a.localeCompare(b, 'en'));
	await expect
		.poll(() =>
			section
				.locator('button[aria-label]')
				.evaluateAll((nodes: Element[]) =>
					nodes.map((node) => node.getAttribute('aria-label') ?? '').sort((a, b) => a.localeCompare(b, 'en'))
				)
		)
		.toEqual(wantedCells);

	// The sheet's own log read covers exactly the week it shows, in the zone the page reads.
	await expect
		.poll(() =>
			net
				.filter(
					(call) =>
						call.frameUrl.includes(DIARY_PATH) &&
						call.path === LOGS_PATH &&
						call.params.startDate === weekRange.start &&
						call.params.endDate === weekRange.end
				)
				.map((call) => `${call.params.startDate}|${call.params.endDate}|${call.params.timeZone}`)
		)
		.toEqual([`${weekRange.start}|${weekRange.end}|${zone}`]);
	report('week sheet log read', `${weekRange.start} .. ${weekRange.end}`);

	await page.getByRole('tab', { name: VIEWS.DAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => paramsOfUrl(page)).toEqual({ date: dayKeyOf(day), view: null });
	await expect(shotsRegionOf(page)).toHaveCount(1);

	// A week nothing was tracked in prints its own copy instead of rows. (`?date=` two weeks back: this file's
	// served logs sit on `DAY` only.)
	await hardVisit(page, `${DIARY_PATH}?date=${dayKeyOf(addDaysOf(day, -14))}&view=week`);
	await expect(section.first()).toBeVisible({ timeout: 25_000 });
	await expect(section.locator('[role=rowheader]')).toHaveCount(0);
	await expect(section.locator('[role=textbox], input')).toHaveCount(0);
	await expect(page.getByText(CAL.EMPTY_PERIOD.split('{period}')[0])).toHaveCount(1);
	await expect(page.getByText(CAL.EMPTY_MESSAGE, { exact: true })).toHaveCount(1);
	// The hint that names what to do about an empty sheet belongs to a role that may add time by hand; this one may
	// not, so it prints the permission notice instead.
	await expect(page.getByText(ED.EMPTY_HINT)).toHaveCount(0);
	await expect(page.getByText(W.WEEK_NO_MANUAL_TIME_PERMISSION, { exact: true })).toHaveCount(1);
	report('empty week copy', await allTexts(section));

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 6. the day's plan */

test('6 · a day with its own entries and no plan of that day', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	// `scenario.planDate` puts the mock's one plan on another day than the viewed one (whatever weekday the run runs
	// on), so the viewed day has none.
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`, {
		scenario: { planDate: localDayKey(OTHER_DAY) }
	});

	const plan = planRegionOf(page);
	await expect(plan.first()).toBeVisible({ timeout: 25_000 });
	await expect(plan).toHaveCount(1);
	await expect(plan.getByText(CAL.NO_PLAN, { exact: true })).toBeVisible();
	await expect(plan.locator('li')).toHaveCount(0);
	// The section header keeps its title alone: done against planned is only printed when the day has a plan.
	const planHeader = page
		.getByRole('heading', { name: CAL.PLAN_TITLE, exact: true })
		.locator('xpath=ancestor::header');
	await expect.poll(() => textOf(planHeader)).toBe(CAL.PLAN_TITLE);

	// The rest of the day is unchanged, and the tracked figure has no plan to be measured against.
	const own = fixture.ids.employee;
	const ownSlots = store.slots.filter((slot) => slot.employeeId === own);
	const scored = ownSlots.filter((slot) => typeof slot.percentage === 'number');
	const activityFraction =
		scored.reduce((sum, slot) => sum + (slot.percentage ?? 0) * slot.duration, 0) /
		scored.reduce((sum, slot) => sum + slot.duration, 0) /
		100;
	await expect(tasksRegionOf(page).locator('li')).toHaveCount(3);
	await expect
		.poll(() => figuresOf(page))
		.toEqual([
			`${D.TRACKED}${durationOf(DAY_SECONDS)}`,
			`${D.ACTIVITY}${percentOfText(activityFraction)}`,
			`${C.TASKS}${store.logs.filter((log) => log.employeeId === own && log.taskId).length}`,
			`${C.SCREENSHOTS}${ownSlots.reduce((sum, slot) => sum + slot.screenshots.length, 0)}`
		]);
	report('day without a plan', await allTexts(plan));

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ 7. an empty day */

test('7 · an empty day says so in its own words, and an empty today adds the hint', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture, { logs: [], slots: [], activities: [] });
	await serveDiaryApi(page, store);
	// The mock's plan sits on another day, so neither the past day nor today has one.
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`, {
		scenario: { planDate: localDayKey(OTHER_DAY) }
	});

	const day = localDay(DAY);
	await expect(page.getByText(copy(D.NO_TIME_TITLE, { day: shortDayOf(day) }), { exact: true })).toBeVisible();
	await expect(page.getByText(W.NO_TIME_HINT)).toHaveCount(0);
	await expect(tasksRegionOf(page)).toHaveCount(0);
	await expect(appsRegionOf(page)).toHaveCount(0);
	await expect(shotsRegionOf(page)).toHaveCount(0);
	await expect(planRegionOf(page)).toHaveCount(0);
	await expect(page.getByRole('list', { name: W.FIGURES_LABEL, exact: true })).toHaveCount(1);
	await expect
		.poll(() => figuresOf(page))
		.toEqual([`${D.TRACKED}0h 0m`, `${D.ACTIVITY}–`, `${C.TASKS}0`, `${C.SCREENSHOTS}0`]);
	report('empty past day', { regions: await regionsOf(page), figures: await figuresOf(page) });

	// Today with nothing on it prints the same title with the hint beside it (`work-diary-page.tsx:135-148`).
	await hardVisit(page, DIARY_PATH);
	const today = localDay(0);
	await expect(page.getByText(copy(D.NO_TIME_TITLE, { day: shortDayOf(today) }), { exact: true })).toBeVisible();
	await expect(page.getByText(W.NO_TIME_HINT, { exact: true })).toBeVisible();
	await expect(tasksRegionOf(page)).toHaveCount(0);
	await expect(appsRegionOf(page)).toHaveCount(0);
	await expect(shotsRegionOf(page)).toHaveCount(0);
	await expect(planRegionOf(page)).toHaveCount(0);
	await expect(page.getByRole('button', { name: C.TODAY, exact: true })).toBeDisabled();
	report('empty today', { regions: await regionsOf(page), figures: await figuresOf(page) });

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ the week sheet's writes */

/** `SHEET.EDIT.SHOW_ENTRIES` with the one log every served cell of `DAY` holds. */
const SHOW_ENTRIES_LABEL = copy(ED.SHOW_ENTRIES, { count: 1 });
const columnLabelsOf = (sheet: Locator) =>
	sheet
		.locator('[role=columnheader][aria-label]')
		.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));
const rowHeadersOf = (sheet: Locator) => allTexts(sheet.locator('[role=rowheader]'));
const cellsTextOf = (sheet: Locator) =>
	sheet
		.locator('[role=cell]')
		.evaluateAll((nodes: Element[]) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));

/**
 * The entries panel of the first cell of `DAY` that holds a log. finding 9: its button is `opacity-0` and takes
 * pointer events only while its cell is hovered (`timesheets-sheet-cell.tsx:34`), so the cell is hovered first.
 */
const openEntriesPanel = async (page: Page, sheet: Locator) => {
	const cell = sheet.locator(`[role=cell]:has(button[aria-label="${SHOW_ENTRIES_LABEL}"])`).first();
	await cell.hover();
	await cell.locator(`button[aria-label="${SHOW_ENTRIES_LABEL}"]`).first().click({ timeout: 15_000 });
	const panel = page.getByRole('dialog', { name: SH.ENTRIES_LABEL, exact: true });
	await expect(panel.first()).toBeVisible({ timeout: 15_000 });
	return panel;
};

const weekSheetTests = {
	scenarioForWrites: { extraPermissions: ['ALLOW_MANUAL_TIME', 'ALLOW_DELETE_TIME'] }
};

test('8 · deleting one entry out of the week sheet, with the permission for it', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	const api = await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}&view=week`, {
		scenario: weekSheetTests.scenarioForWrites
	});
	const sheet = page.getByRole('region', { name: W.WEEK_TITLE, exact: true });
	await expect(sheet.first()).toBeVisible({ timeout: 20_000 });
	const day = localDay(DAY);
	const target = store.logs.find((log) => log.id === 'diary-task-b');
	if (!target) throw new Error('the served store lost diary-task-b');

	const panel = await openEntriesPanel(page, sheet);
	await expect(panel.locator('li')).toHaveCount(1);
	const entryRange = `${entryClockOf(new Date(target.startedAt))} – ${entryClockOf(new Date(target.stoppedAt))}`;
	await expect(panel.locator('li').first()).toContainText(entryRange);
	await expect(panel.locator('li').first()).toContainText(durationOf(target.duration));
	report('entries panel copy', await allTexts(panel));
	report('entries panel buttons', await namedButtons(panel));
	await expect(panel.getByRole('button', { name: C.DELETE, exact: true })).toHaveCount(1);

	await panel.getByRole('button', { name: C.DELETE, exact: true }).first().click({ timeout: 15_000 });
	// finding 8: the confirm prints its copy in an `<h3>`; its `[role=dialog]` measures 1280×0.
	await expect.poll(() => page.getByText(C.DELETE_CONFIRMATION).count()).toBeGreaterThan(0);
	await expect(page.getByText(C.IRREVERSIBLE_ACTION_WARNING, { exact: true })).toBeVisible();

	const deletesBefore = net.filter((call) => call.method === 'DELETE').length;
	await page.getByRole('button', { name: C.DELETE, exact: true }).last().click({ timeout: 15_000 });
	await expect.poll(() => net.filter((call) => call.method === 'DELETE').length).toBeGreaterThan(deletesBefore);
	const deletes = net.filter((call) => call.method === 'DELETE');
	report(
		'delete calls',
		deletes.map((call) => `${call.method} ${call.path}${call.search}`)
	);
	// `deleteTaskTimesheetLogs` (`time-log.service.ts:382-412`): the ids as indexed query parameters.
	expect(deletes.map((call) => queryValuesOf(call.params, 'logIds'))).toEqual([['diary-task-b']]);
	expect(deletes[0].params.organizationId).toBe(fixture.ids.organizationA);
	expect(deletes[0].params.tenantId).toBe(fixture.ids.tenantA);

	// The day it was deleted from prints the time left on it, and the row of the deleted task is gone.
	const wantedHeader = copy(SH.DAY_HEADER, {
		day: sheetDayLabelOf(day),
		total: durationOf(DAY_SECONDS - target.duration)
	});
	await expect.poll(() => columnLabelsOf(sheet)).toContain(wantedHeader);
	await expect.poll(async () => (await rowHeadersOf(sheet)).length).toBe(3);
	await expect(sheet.getByRole('rowheader', { name: /Probe afternoon task/ })).toHaveCount(0);
	await expect
		.poll(() => rowHeadersOf(sheet))
		.toEqual(
			expect.arrayContaining([
				expect.stringContaining(fixture.names.task),
				expect.stringContaining(T.NO_TASK),
				expect.stringContaining(SH.PERIOD_TOTAL)
			])
		);
	expect(store.logs.map((log) => log.id)).toEqual(['diary-task-a', 'diary-untasked', 'diary-teammate']);
	await expect(page.getByText(TOAST_TIME.LOG_DELETED, { exact: true })).toBeVisible();
	await expect.poll(() => page.getByRole('dialog', { name: SH.ENTRIES_LABEL, exact: true }).count()).toBe(0);
	expect(
		api
			.writes()
			.filter((call) => call.path === LOGS_PATH)
			.map((call) => call.method)
	).toEqual(['DELETE']);

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

test('9 · the entries of a cell this role may not delete', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	const api = await serveDiaryApi(page, store);
	// `ALLOW_MANUAL_TIME` without `ALLOW_DELETE_TIME`: the cell can be typed in, its log cannot be removed
	// (`use-work-diary-week-sheet.ts:24` names `DELETE_TIME_PERMISSION`, `:75-78` gates the control on it).
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}&view=week`, {
		scenario: { extraPermissions: ['ALLOW_MANUAL_TIME'] }
	});
	const sheet = page.getByRole('region', { name: W.WEEK_TITLE, exact: true });
	await expect(sheet.first()).toBeVisible({ timeout: 20_000 });

	const panel = await openEntriesPanel(page, sheet);
	await expect(panel.locator('li')).toHaveCount(1);
	await expect(panel.getByRole('button', { name: C.DELETE, exact: true })).toHaveCount(0);
	report('panel buttons without the delete permission', await namedButtons(panel));
	expect(
		api
			.writes()
			.filter((call) => call.path === LOGS_PATH)
			.map((call) => call.method)
	).toEqual([]);
	expect(store.logs.map((log) => log.id)).toEqual([
		'diary-task-a',
		'diary-task-b',
		'diary-untasked',
		'diary-teammate'
	]);

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

test('10 · typing a time into an empty cell writes exactly that log', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	const api = await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}&view=week`, {
		scenario: { extraPermissions: ['ALLOW_MANUAL_TIME'] }
	});
	const sheet = page.getByRole('region', { name: W.WEEK_TITLE, exact: true });
	await expect(sheet.first()).toBeVisible({ timeout: 20_000 });

	// An empty day of the week the sheet shows: the first day of it that is not the logged day and is not in the
	// future (finding 7: only days up to today get an editable cell — on a Tuesday that is today itself, on every
	// other weekday an earlier day of the same week).
	const todayKey = dayKeyOf(localDay(0));
	const editableDays = weekOfLocalDay(localDay(DAY)).filter(
		(candidate) => dayKeyOf(candidate) !== localDayKey(DAY) && dayKeyOf(candidate) <= todayKey
	);
	const typedDay = editableDays[0];
	if (!typedDay) throw new Error('the viewed week holds no editable day other than the logged one');
	const label = copy(ED.CELL_INPUT, { task: fixture.names.task, day: sheetDayLabelOf(typedDay) });
	const box = sheet.getByRole('textbox', { name: label, exact: true }).first();
	await expect(box).toBeVisible({ timeout: 15_000 });
	await expect.poll(() => box.inputValue()).toBe('');

	await box.click({ timeout: 15_000 });
	await box.fill('1:30', { timeout: 15_000 });
	await box.press('Enter');
	await expect
		.poll(() =>
			api
				.writes()
				.filter((call) => call.path === LOGS_PATH && call.method === 'POST')
				.map((call) => call.body)
		)
		.toHaveLength(1);
	const written = api.writes().find((call) => call.path === LOGS_PATH && call.method === 'POST');
	const body = written?.body ?? {};
	report('the log the sheet wrote', body);
	// `use-sheet-cell-writes.ts:206-218`: a typed day starts at `PLACEMENT_START_HOUR` (9,
	// `timesheet-sheet-edit.ts:30`, `:304`) of the day the cell belongs to.
	const typedStart = new Date(typedDay);
	typedStart.setHours(PLACEMENT_START_HOUR, 0, 0, 0);
	expect(body.startedAt).toBe(isoOf(typedStart));
	expect(body.stoppedAt).toBe(isoOf(new Date(typedStart.getTime() + 5400_000)));
	expect(body.employeeId).toBe(fixture.ids.employee);
	expect(body.taskId).toBe(fixture.ids.task);
	expect(body.organizationTeamId).toBe(fixture.ids.teamA);
	expect(body.isBillable).toBe(true);
	expect(body.logType).toBe('MANUAL');
	expect(body.source).toBe('TEAMS');
	expect(body.organizationId).toBe(fixture.ids.organizationA);
	expect(body.tenantId).toBe(fixture.ids.tenantA);
	expect(body).not.toHaveProperty('projectId');
	// No overlap lookup was asked for on this lane (`use-time-overlap-guard.ts` only asks when the organization
	// allows modifying time, which the mock's organization does not: `mock-gauzy-server.mjs:95-97`).
	expect(net.filter((call) => call.path.includes('conflict'))).toEqual([]);

	// The cell then holds the written time, and its own entries button appears beside it.
	await expect.poll(() => box.inputValue()).toBe(durationOf(5400));
	await expect.poll(() => sheet.locator(`button[aria-label="${SHOW_ENTRIES_LABEL}"]`).count()).toBe(4);
	await expect
		.poll(() => columnLabelsOf(sheet))
		.toContain(copy(SH.DAY_HEADER, { day: sheetDayLabelOf(typedDay), total: durationOf(5400) }));
	const created = store.logs[store.logs.length - 1];
	expect(created.taskId).toBe(fixture.ids.task);
	expect(created.duration).toBe(5400);
	expect(created.logType).toBe('MANUAL');
	expect(created.source).toBe('TEAMS');
	await expect(page.getByText(TOASTS.MUTATION_FAILED)).toHaveCount(0);

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ a refused read, a refused write */

test('11 · a refused slots read prints its notice in the screenshots section and leaves the rest of the day', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture, { refusals: { [`GET ${SLOTS_PATH}`]: 500 } });
	await serveDiaryApi(page, store);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`);

	const shots = shotsRegionOf(page);
	// finding 4: the notice appears when the retries end, so the notice is polled, never the request count.
	await expect
		.poll(() => allTexts(shots), { timeout: 40_000 })
		.toContainEqual(expect.stringContaining(STATES.ERROR_TITLE));
	await expect(shots.getByText(STATES.ERROR_MESSAGE, { exact: true })).toBeVisible();
	await expect(shots.getByRole('button', { name: PAGES.TRY_AGAIN, exact: true })).toHaveCount(1);
	await expect(shots.locator('button[aria-label]')).toHaveCount(0);

	// The other sections were read from other paths and print as they always do — the figures rebuilt from the served
	// store exactly as test 1 rebuilds them.
	const own = fixture.ids.employee;
	const trackedSeconds = store.logs
		.filter((log) => log.employeeId === own)
		.reduce((sum, log) => sum + log.duration, 0);
	const taskCount = store.logs.filter((log) => log.employeeId === own && log.taskId).length;
	await expect(tasksRegionOf(page).locator('li')).toHaveCount(3);
	await expect(appsRegionOf(page).locator('li')).toHaveCount(2);
	await expect
		.poll(() => figuresOf(page))
		.toEqual([
			`${D.TRACKED}${durationOf(trackedSeconds)}`,
			`${D.ACTIVITY}–`,
			`${C.TASKS}${taskCount}`,
			`${C.SCREENSHOTS}0`
		]);

	const armed = armedHttpErrorPattern('GET', LOGS_PATH.replace('/api', ''), 500);
	const armedSlots = armedHttpErrorPattern('GET', SLOTS_PATH.replace('/api', ''), 500);
	report(
		'armed console lines',
		armedFailureLines(shield, armedSlots).map((line) => flat(line).slice(0, 160))
	);
	expect(armedFailureLines(shield, armedSlots).length).toBeGreaterThan(0);
	expect(armedFailureLines(shield, armed)).toEqual([]);
	expect(consoleFindings(shield, [armedSlots])).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

test('12 · a refused logs read prints its notice in the tasks section and leaves the screenshots', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture, { refusals: { [`GET ${LOGS_PATH}`]: 500 } });
	await serveDiaryApi(page, store);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}`);

	// finding 4 again: polled, because the notice only replaces the loading place after the retries.
	await expect.poll(() => page.getByText(STATES.ERROR_TITLE).count(), { timeout: 40_000 }).toBeGreaterThan(0);
	await expect(page.getByText(STATES.ERROR_MESSAGE, { exact: true })).toBeVisible();
	await expect(page.getByRole('button', { name: PAGES.TRY_AGAIN, exact: true })).toHaveCount(1);

	await expect(tasksRegionOf(page)).toHaveCount(1);
	await expect(tasksRegionOf(page).locator('li')).toHaveCount(0);
	await expect(shotsRegionOf(page).locator('button[aria-label]')).toHaveCount(4);
	await expect(appsRegionOf(page).locator('li')).toHaveCount(2);
	// `weightedActivityOf` (`core/lib/utils/dashboards/work-diary.ts:143-158`) over the slots the store served — the
	// same rebuild test 1 makes: only the logs read was refused here, so the activity figure and the screenshots
	// stand, and the tracked time and the task count fall to zero.
	const own = fixture.ids.employee;
	const scored = store.slots.filter((slot) => slot.employeeId === own && typeof slot.percentage === 'number');
	const activityFraction =
		scored.reduce((sum, slot) => sum + (slot.percentage ?? 0) * slot.duration, 0) /
		scored.reduce((sum, slot) => sum + slot.duration, 0) /
		100;
	const shotCount = store.slots
		.filter((slot) => slot.employeeId === own)
		.reduce((sum, slot) => sum + slot.screenshots.length, 0);
	await expect
		.poll(() => figuresOf(page))
		.toEqual([
			`${D.TRACKED}0h 0m`,
			`${D.ACTIVITY}${percentOfText(activityFraction)}`,
			`${C.TASKS}0`,
			`${C.SCREENSHOTS}${shotCount}`
		]);

	const armed = armedHttpErrorPattern('GET', LOGS_PATH.replace('/api', ''), 500);
	report(
		'armed console lines',
		armedFailureLines(shield, armed).map((line) => flat(line).slice(0, 160))
	);
	expect(armedFailureLines(shield, armed).length).toBeGreaterThan(0);
	expect(consoleFindings(shield, [armed])).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});

test('13 · a refused delete keeps every row it was asked to remove', async ({ page, fixture, shield }) => {
	const store = newStore(fixture);
	const api = await serveDiaryApi(page, store);
	const net = recordMockCalls(page);
	await signInAndVisit(page, fixture, `${DIARY_PATH}?date=${localDayKey(DAY)}&view=week`, {
		scenario: weekSheetTests.scenarioForWrites
	});
	const sheet = page.getByRole('region', { name: W.WEEK_TITLE, exact: true });
	await expect(sheet.first()).toBeVisible({ timeout: 20_000 });
	const cellsBefore = await cellsTextOf(sheet);
	const headersBefore = await columnLabelsOf(sheet);
	const idsBefore = store.logs.map((log) => log.id);

	/** The console of a test keeps every line it printed, so a round must excuse the lines its own earlier refusals
	 *  armed — each named by path and by the status this file armed for it. */
	const armedDeletes: RegExp[] = [];

	for (const status of [400, 500]) {
		store.refusals[`DELETE ${LOGS_PATH}`] = status;
		const armed = armedHttpErrorPattern('DELETE', LOGS_PATH.replace('/api', ''), status);
		armedDeletes.push(armed);
		const panel = await openEntriesPanel(page, sheet);
		await panel.getByRole('button', { name: C.DELETE, exact: true }).first().click({ timeout: 15_000 });
		await expect.poll(() => page.getByText(C.DELETE_CONFIRMATION).count()).toBeGreaterThan(0);

		const before = net.filter((call) => call.method === 'DELETE').length;
		await page.getByRole('button', { name: C.DELETE, exact: true }).last().click({ timeout: 15_000 });
		await expect.poll(() => net.filter((call) => call.method === 'DELETE').length).toBeGreaterThan(before);
		const lastDelete = net.filter((call) => call.method === 'DELETE').at(-1);
		report(`refused ${status} delete call`, `${lastDelete?.method} ${lastDelete?.path}${lastDelete?.search}`);
		expect(queryValuesOf(lastDelete?.params ?? {}, 'logIds')).toEqual(['diary-task-b']);

		await expect.poll(() => page.getByText(TOASTS.MUTATION_FAILED).count(), { timeout: 20_000 }).toBeGreaterThan(0);
		await expect(page.getByText(TOAST_REASONS.UNKNOWN, { exact: true })).toBeVisible();
		report(`toasts after ${status}`, await toastsOf(page));
		report(
			`console after ${status}`,
			armedFailureLines(shield, armed).map((line) => flat(line).slice(0, 180))
		);

		// Nothing moved: the store kept the log, and the sheet prints the same cells and the same day totals.
		expect(store.logs.map((log) => log.id)).toEqual(idsBefore);
		await expect.poll(() => cellsTextOf(sheet)).toEqual(cellsBefore);
		await expect.poll(() => columnLabelsOf(sheet)).toEqual(headersBefore);
		await expect(sheet.getByRole('rowheader', { name: /Probe afternoon task/ })).toHaveCount(1);

		// Excused by name: the client's HTTP error line for the status this file armed, the dev mutation toaster
		// (`mutation-error-toaster.tsx:48`) and the two hooks that log the same failure
		// (`use-delete-timesheet.ts:46`, `use-timesheet-log-actions.ts:93`).
		expect(armedFailureLines(shield, armed).length).toBeGreaterThan(0);
		expect(consoleFindings(shield, armedDeletes, [MUTATION_TOASTER, ...DELETE_HOOK_LOGS])).toEqual([]);
	}

	expect(api.writes().filter((call) => call.path === LOGS_PATH).length).toBe(2);
	report(
		'delete attempts',
		api
			.writes()
			.filter((call) => call.path === LOGS_PATH)
			.map((call) => `${call.method} ${call.search}`)
	);
	expect(shield.pageErrors()).toEqual([]);
});

/* ------------------------------------------------------------------ a malformed address */

test('14 · a malformed ?date= or ?view= falls back, and the address keeps what was typed', async ({
	page,
	fixture,
	shield
}) => {
	const store = newStore(fixture);
	await serveDiaryApi(page, store);
	await signInAndVisit(page, fixture, DIARY_PATH);

	const today = localDay(0);
	const historyStart = new Date(2000, 0, 1); // `DIARY_HISTORY_START` (`work-diary.ts:268`)
	const cases: Array<{ param: string; date: string | null; view: string | null; meta: string }> = [
		{ param: 'date=2026-13-45', date: '2026-13-45', view: null, meta: longDayOf(today) },
		{ param: 'date=yesterday', date: 'yesterday', view: null, meta: longDayOf(today) },
		{
			param: `date=${dayKeyOf(addDaysOf(today, 1))}`,
			date: dayKeyOf(addDaysOf(today, 1)),
			view: null,
			meta: longDayOf(today)
		},
		{ param: 'date=1999-12-31', date: '1999-12-31', view: null, meta: longDayOf(historyStart) },
		{ param: 'date=2000-01-02', date: '2000-01-02', view: null, meta: longDayOf(new Date(2000, 0, 2)) },
		{ param: 'view=month', date: null, view: 'month', meta: longDayOf(today) }
	];

	for (const one of cases) {
		await hardVisit(page, `${DIARY_PATH}?${one.param}`);
		await expect.poll(() => dayMetaOf(page), { timeout: 30_000 }).not.toBe('none');
		await expect.poll(() => paramsOfUrl(page)).toEqual({ date: one.date, view: one.view });
		// The page shows the day it fell back to, and only the Day tab exists to select.
		await expect.poll(() => dayMetaOf(page)).toBe(one.meta);
		await expect(page.getByRole('tab', { name: VIEWS.DAY, exact: true })).toHaveAttribute('aria-selected', 'true');
		await expect(page.getByRole('tab', { name: VIEWS.WEEK, exact: true })).toHaveAttribute(
			'aria-selected',
			'false'
		);
		report(`param ${one.param}`, { url: page.url(), meta: await dayMetaOf(page) });
	}

	expect(consoleFindings(shield)).toEqual([]);
	expect(shield.pageErrors()).toEqual([]);
});
