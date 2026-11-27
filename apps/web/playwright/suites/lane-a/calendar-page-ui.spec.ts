import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Calendar** (`/calendar`,
 * `app/[locale]/(main)/calendar/page.tsx` → `core/components/calendar/calendar-page.tsx`), on lane-a (app
 * `http://localhost:3031`, mock `http://127.0.0.1:3992`, statistics sink `3993`, control `3994`, issuer `3995`,
 * `playwright/test-servers.ts:37-42`).
 *
 * ## The page, in one line per part (each line read out of its file before it is named)
 *
 * - **State** — `core/hooks/calendar/use-calendar-page.ts`: the view (`:41` `VIEW_STORAGE_KEY = 'calendar-view'`,
 *   JSON-quoted through `use-local-storage-state.ts:72`), the range anchor (`:160` `todayStart()`), the member
 *   (`:67-85` `shownEmployeeIdOf`, `:172` `canSwitchMember`), the zone (`:157` `getDefaultTimezone()` =
 *   `core/lib/utils/date-and-time.ts:313` = `Intl.DateTimeFormat().resolvedOptions().timeZone`, i.e. **the
 *   browser's own zone, not the profile's**), and the grid settings (`core/stores/calendar/calendar-grid-settings.ts:11`
 *   `atomWithStorage('calendar-grid-settings', …)`).
 * - **The read** — `core/hooks/calendar/use-calendar-logs.ts:60-84`: one `GET /timesheet/time-log` per
 *   `{dates, employeeId, timeZone, includeBreaks, withEntryLabels}`; `employeeIds[0]` is the shown member
 *   (`:70`); the bounds come from `requestDaysOf` (`core/lib/utils/calendar-view.ts:207-211`), which widens the
 *   visible days by one on each side and turns them into that zone's day bounds
 *   (`formatStartAndEndDateRange` + `startOfDayInTimeZone` / `endOfDayInTimeZone`).
 * - **Toolbar** — `core/components/calendar/calendar-toolbar.tsx`: a `fieldset` labelled
 *   `dashboard.calendar.RANGE_LABEL` holding `Previous` / `Today` / `Next` and the `<h2 aria-live="polite">` range
 *   name (`:44-67`), the member switch (`:104-130`), the view `SegmentedControl` (`:147-154`) and the legend
 *   (`:177-199`).
 * - **Grids** — `calendar-month-view.tsx` (42 `role=gridcell`s, `:15` `VISIBLE_ENTRY_LINES = 2` before `+N more`),
 *   `calendar-time-grid.tsx` (week and day: `role=grid`, a `role=gridcell` column carrying `data-calendar-day`
 *   (`:344`, `:370-375`) and an `aria-hidden` full-size button under it for empty time (`:376-384`), and entry
 *   `TimeBlock` buttons labelled `ENTRY_LABEL` (`:221-234`)).
 * - **Drag** — `core/hooks/calendar/use-calendar-grid-drag.ts` (mouse: `MOUSE_DRAG_THRESHOLD_PX = 4` `:43`; the
 *   minute under the pointer from `gridMinuteAtOffset` `:276-278`), `core/lib/utils/calendar-drag.ts`
 *   (`DRAG_STEP_MINUTES = 15` `:15`, `movedWindowOf` `:229-247`, `dragRefusalOf` `:320-338`), and
 *   `core/hooks/calendar/use-calendar-entry-moves.ts` (`:64` `ALLOW_MODIFY_TIME`, `:66` `futureDateAllowed`,
 *   `:127-160` `saveMove` = a conflict lookup then `PUT /timesheet/time-log/<id>`).
 * - **Split** — `core/hooks/calendar/use-calendar-menu.ts:84-107` (asks the API once, then decides),
 *   `core/lib/utils/calendar-split.ts` (refusals `:91-113`, the default time `:119-137`),
 *   `core/hooks/calendar/use-calendar-entry-split.ts` (`splitCalendarEntry` `:155-224` = re-read → conflict lookup
 *   → `PUT` shortened → `POST` the rest; `splitThroughApi` `:329-372` = one `POST …/split`),
 *   `calendar-split-dialog.tsx`.
 * - **Day panel / day view** — `calendar-day-panel.tsx` (a Sheet opened from a month cell),
 *   `calendar-day-details.tsx` (`DaySummary` `:17-28`, `DoneOfPlanned` `:31-48`, `DayPlanBlock` `:68-105`,
 *   `DayEntriesBlock` `:107-135`), and `CalendarDayPanel` in `calendar-page.tsx:243-249` under the day grid.
 *
 * ## Where the numbers came from
 *
 * The throwaway probes `D:\Coding\.tmp\probe-calendar\probe1.spec.ts` (P1-P3), `probe2.spec.ts` (P4-P6) and
 * `probe3.spec.ts` (P7-P10), run on this lane on 2026-11-26 and logged in
 * `D:\Coding\.tmp\s3-lane-a-calendar-probe-1.log` … `-probe-4.log` (the useful ones are `-probe-2.log` (P1-P3: the
 * whole page as the mock answers it, the served month / week / day, the storage, the stepper) and `-probe-4.log`
 * (P4-P10: the entry popover, the two context menus, the dialogs each item opens, the settings menu and what each
 * choice changes, the member switch, the day panel, the drag, the refused move, the split in both arms)). Every value
 * asserted below is one those runs printed, or one this file's own `MEASURE` line printed on a run that passed.
 * Nothing here names today's date: served logs sit at day offsets from the day the run runs on (`localDay`, `at`),
 * every formatted string is rebuilt from the same offsets with the same `Intl` options the page uses
 * (`core/lib/utils/dashboards/timesheets.ts:518-542`), and the browser's zone is read from the page (test 1 prints
 * it) and never assumed — on this PC it resolved to `Europe/Madrid` while the mock profile says `UTC`
 * (`mock-gauzy-server.mjs:107`), which is why the read this page sends names `Europe/Madrid` while the Timesheets
 * page names `UTC`.
 *
 * **Checked to hold on any weekday (2026-11-27).** The days the display tests serve are picked from the week the
 * calendar opens on (`displayDaysOf`, beside `mondayOffset`): its Monday and Tuesday when the run is a Wednesday..
 * Sunday — the pair the accepted runs measured — and its Saturday and Sunday when the run is a Monday or a Tuesday,
 * and never its today, because test 2 pins today's month cell as a plan-only cell and the day view of a day holding
 * nothing, while a day of the week *before* the shown one is not always a cell of the 42-day month grid (that grid
 * starts at the week holding the 1st). A day of the shown week that is after today is drawn and counted like any
 * other (`s3-lane-a-weekday-calendarprobe-1.log`). The drag and split tests keep their own whole past day
 * (`dragDayOffset` = yesterday, reached with `showWeekOf`, which steps back when yesterday sits in the week before),
 * so every slot a drag lands on is behind the run on any weekday.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** this lane's app, the shell and its reads, NextAuth, and the mock's own fixtures — tenant, organization,
 * team, project and task ids and names (`fixture.ids`, `fixture.names`), the three team members
 * (`mock-gauzy-server.mjs:217-225`, the reader `isManager`), the reader's role and its five permissions (`:50-85`),
 * the organization's `allowManualTime / allowModifyTime / allowDeleteTime` and its **missing** `futureDateAllowed`,
 * `startWeekOn` and break setting (`:86-99`), today's daily plan (`:261-271`, answered at `/api/daily-plan*` `:760-761`),
 * and the timer status whose `lastLog.tags: []` (`:272-288`) is what lets the page ask for entry labels
 * (`use-entry-labels-support.ts:34-41`).
 *
 * **Served by this file:** every time-log read and every write, from test 2 on, through `page.route` on the mock
 * origin — the pattern of `suites/lane-b/member-timesheet-report-ui.spec.ts:664-816`, which this file copies (its
 * time-log stand-in, its `GET /timesheet/time-log/conflict` array answer and its console helpers); that spec is
 * never edited here. Each answer restates the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`; `OPTIONS` → 204)
 * because the page is on `localhost:3031` and the API on `127.0.0.1:3992`. The store is a plain object the tests
 * change mid-case (`state.refusals`, `state.splitMode`, `state.logs`), so a write changes what the next read answers
 * and a refused write is armed without re-registering a route. A read is answered only with the logs the
 * `employeeIds[]` and `startDate` / `endDate` in its own query ask for, which is what a real backend does and what
 * lets the member switch and the stepper visibly change the page. `route.fetch()` is never called on a served path.
 *
 * **The permissions a write needs are granted, not invented.** The mock's role carries five permissions and neither
 * `ALLOW_MODIFY_TIME` nor `ALLOW_MANUAL_TIME` (`mock-gauzy-server.mjs:50-85`), which is why the drag, the split and
 * the Add-time cases sign in with `scenario.extraPermissions` — the same finding
 * `suites/lane-b/member-timesheet-report-ui.spec.ts:194-200` records for the sheet. Without it every entry of this
 * page is un-draggable (`use-calendar-entry-moves.ts:86-101`) and the menu offers no Edit / Split / Delete
 * (`calendar-context-menu.tsx:65-99`); test 1 measures that read-only page as the plain role sees it.
 *
 * ## Findings the probes measured
 *
 * 1. The zone. The read names the **browser's** zone, `timeZone=Europe/Madrid`, while the same lane's Timesheets
 *    page names the profile's `UTC`. Every expected instant below is therefore computed in the zone the read itself
 *    reported (`at(-1, 10, 0).toISOString()` is that day's 10:00 in that zone), never hard-coded.
 * 2. A month grid is 42 cells (`calendar-view.ts:88` `DAYS_IN_MONTH_GRID = 42`) whatever the month, but the toolbar
 *    total and the project legend count **only the anchor's month** (`calendar-view.ts:571-576`, used by
 *    `calendar-page.tsx:174-177`). Intended, and the code says so
 *    (`:571` "The days the toolbar total counts: the month itself in the month view, every shown day otherwise").
 * 3. A day's total drops breaks (`calendar-view.ts:549-569`), and logs of anyone else are dropped
 *    (`:406-407` "Logs of anyone else are dropped… must never be drawn under another name") — measured: serving the
 *    teammate's log on the own member's calendar changes nothing on screen, and switching to the teammate swaps the
 *    read's `employeeIds[0]`.
 * 4. **The split of tracked time** (measured, untagged: the page asks the server and splits when it can, on purpose).
 *    The app's own refusal copy says
 *    `"Tracked time carries its activity and screenshots, which only the server can share between two entries. Only
 *    time added by hand can be split for now."` (`locales/en.json:1723`,
 *    `SPLIT.REFUSED.TRACKED`). What the build does depends on the server: with no `POST /timesheet/time-log/<id>/split`
 *    route the tracked entry really is refused (test 9 measured that copy on screen), and with the route present the
 *    same tracked entry is split in one write, no refusal shown (test 8 measured `POST …/split` and both parts on
 *    the grid) — `core/lib/utils/calendar-split.ts:97-99` `if (isTracked && !canSplitTracked) { return 'tracked'; }`,
 *    asked once per session through `use-calendar-menu.ts:84-91`. So "for now" is not a rule of the page: the page
 *    splits tracked time whenever the API offers it.
 * 5. **`[MEASURED, NOT INTENDED]` — the drag step is the reader's setting, not a quarter hour.** The comment
 *    `core/lib/utils/calendar-drag.ts:13` reads, between its own comment delimiters,
 *    `A drag in the week and day grids lands on quarter hours.` over `DRAG_STEP_MINUTES = 15` (`:14`), while the
 *    grid passes the reader's stored choice
 *    (`calendar-time-grid.tsx:531` `stepMinutes: settings.snapMinutes`, `calendar-grid-settings.ts:6`
 *    `SNAP_STEP_OPTIONS = [1, 5, 10, 15, 30, 60]`). Measured: with the setting on `30 minutes` the same drag lands on
 *    a half hour (test 6).
 * 6. **"Too short" can mean "no whole slot inside"** (measured, untagged: the unit test below maps this case to
 *    too-short on purpose; only the copy's reason does not fit it). The copy
 *    `"This entry is too short: each part must last at least a minute."` (`locales/en.json:1725`, `SPLIT.REFUSED.TOO_SHORT`)
 *    is what an 8-minute tracked entry is told (test 10 measured it on screen), but the rule that refused it is
 *    `calendar-split.ts:102-104` `const hasNoSlotMark = isTracked && slotMarksInside(window).length === 0;` — the
 *    entry is long enough for two parts; it holds no whole 10-minute slot. The unit test of that rule says so in
 *    words: `calendar-split.test.ts:130` `'refuses a tracked entry with no slot mark inside it as too short'`.
 * 7. Not reachable here, so not tested: a split across a **break** (the mock's organization names no break setting,
 *    `mock-gauzy-server.mjs:86-99`, so `includeBreaks` is never even asked and no break log can be served as the
 *    page reads one), a **DST** day (the pinned 25-hour-column rules live in
 *    `core/lib/utils/calendar-drag-dst.test.ts:2` with its own `jsdom-west-of-utc` environment; the lane's browser
 *    zone is not pinned by the test run and its fall-back day is not in the range a run can step to without naming a
 *    date), and a zone whose offset is not a multiple of 10 minutes (`calendar-split.ts:41` "a whole ten minutes of
 *    the clock the API keeps its slots on" over `:43` `time.getTime() % MILLISECONDS_PER_SLOT === 0`, an epoch
 *    alignment only a `+05:45`-style zone could expose).
 * 8. A `SPLIT.SAVED` outcome is a toast, and the dialog closes with it (`calendar-split-dialog.tsx:275-278`), so a
 *    successful split is proved by the two entries on the grid and the toast, never by text inside the dialog. Sonner
 *    toasts are read from `li[data-sonner-toast]` and the pointer is parked away from the toaster before they are
 *    expected to leave. A toast prints two lines in one `li` — title and `description`
 *    (`use-calendar-entry-moves.ts:116,150`), measured `Change not savedYou can't add or change time for this
 *    member.` — so a refusal is expected as one string holding both halves, and Sonner's own lifetime is 4 s
 *    (`TOAST_LIFETIME` in `sonner/dist/index.js`), so a toast is read straight after the action that raised it.
 * 9. The Timesheets dialogs this page opens are Headless UI modals whose `role=dialog` element is a `relative`
 *    wrapper of `fixed` children: its own box measured `1280x0` while its text is in it
 *    (`s3-lane-a-calendar-probe-11.log`), so `[role=dialog]:visible` matches nothing and the dialog is followed by
 *    the title it prints (`dialogShowing`). Escape does not close them either — measured open for 40 s after Escape
 *    (`s3-lane-a-calendar-probe-12.log`), because `Modal` defaults `closeOnOutsideClick = false`
 *    (`common/modal.tsx:52`) and routes Headless UI's `onClose` to `() => null` (`:72-73`). Every dialog here is
 *    therefore closed through its own button.
 * 10. A move onto another entry is refused; a move *next to* one is not. `overlapsAnyWindow`
 *     (`calendar-drag.ts:280-285`) needs `other.start < window.end && other.end > window.start`, so a 10:00–12:00
 *     entry dragged five hours down, landing 15:00–17:00 against a 14:00–15:00 one, is a free place: measured
 *     `s3-lane-a-calendar-probe-6.log` saved it with one `PUT` and no toast. The refusal test drags four grid hours
 *     down, which really lands on the other entry.
 * 11. The page opens on the month grid, so a run's read log holds the month range as well as the week's: measured
 *     `2026-10-24T22:00:00.000Z … 2026-12-07T22:59:59.999Z` for a run on 2026-11-27, i.e. the 42-cell grid from the
 *     Monday holding the 1st (`Mon Oct 26 … Sun Dec 6`) widened by a day each side (`calendar-view.ts:187-193`,
 *     `:207-211`). The week's own range is `2026-11-21T23:00:00.000Z … 2026-11-30T22:59:59.999Z`.
 * 12. Free time in a grid column answers two ways. A right click there offers exactly one item, `MENU.ADD_TIME_HERE`
 *     (measured with a locator right click on the column's `aria-hidden` button and with a plain right click just
 *     under an entry, `s3-lane-a-calendar-probe-11.log`), and a plain left click on it opens the manual Add time
 *     dialog for the day and slot under the pointer (`Date`, `Start time`, `End time`, `Duration`,
 *     `Type a duration and the first free time of the day is proposed.`, `calendar-time-grid.tsx:376-383`).
 * 13. Whether the API splits is asked **once per page**, not once per entry: `SPLIT_SUPPORT_KEY = ['time-log-split',
 *     'support']` with the comment "One check per API for the whole session" (`use-time-log-split-support.ts:18-19`)
 *     and `staleTime: Infinity` (`:43`). The probe therefore runs on the first entry a split dialog opens on
 *     (`use-calendar-menu.ts:84-90`) and every later dialog on that page reuses the answer. Test 8 measures it (the
 *     tracked dialog sent its one split `POST` and no probe), test 9 measures the refusal side of it (the tracked
 *     entry got no call at all), and test 10 has to open a fresh page to see the other answer at all.
 * 14. Next.js dev mode answers a console error with a dialog of its own: `div[role=dialog][aria-modal=true]
 *     [data-nextjs-dialog=true] class="error-overlay-dialog-scroll"`, labelled `Console Error` (measured in
 *     `s3-lane-a-calendar-2.log`, sitting next to the split dialog in test 9). It is not a dialog of this page, so
 *     `dialogOf` excludes it by that attribute; without the exclusion every armed refusal makes
 *     `expect.poll(() => dialogOf(page).count()).toBe(0)` time out.
 * 15. The stepper walks weeks, it does not jump: one `Next` after a `Previous` lands back on the week the page opened
 *     with (measured `s3-lane-a-calendar-2.log`), and a range the run already read is answered from the query cache
 *     (`staleTime 3 min`, `core/hooks/calendar/use-calendar-logs.ts:13,117`), so those steps cost no request — what
 *     test 3's two quiet windows measure.
 * 16. A refused call has two names, and an excuse has to use the right one. The request this lane serves arrives as
 *     `/api/timesheet/time-log/…` (that is what `api.writes()` and `api.callsTo()` record), while the HttpClient's own
 *     console line prints the service's relative path: measured `HTTP Error: POST /timesheet/time-log/own-manual/split
 *     404 …` in `s3-lane-a-calendar-3.log` for that very request (`logger-adapter.service.ts:189-199` logs
 *     `error.config.url`). `LOGGED_PATH_OF` / `LOGGED_SPLIT_OF` are the console spelling; `LOGS_PATH` /
 *     `SPLIT_PATH_OF` are the request spelling. The same run measured the stand-in's own slip: an id that is not a
 *     UUID in a created log makes the *page* log `Add manual time validation failed: … id: Invalid UUID`
 *     (`time-log.service.ts:198-212` validates the response against `timeLogSchema`), so served ids are UUIDs.
 */

/** `locales/en.json` read by key, the way the lane-b spec reads it (`member-timesheet-report-ui.spec.ts:272-301`). */
type Copy = Record<string, string>;
const EN = JSON.parse(readFileSync(join(process.cwd(), 'locales', 'en.json'), 'utf8')) as {
	dashboard: {
		calendar: Copy & {
			VIEWS: Copy;
			LEGEND: Copy;
			SETTINGS: Copy;
			MENU: Copy;
			DRAG: Copy;
			SPLIT: Copy & { REFUSED: Copy };
		};
		timesheets: Copy & { SHEET: { EDIT: Copy } };
	};
	common: Copy;
	timeEntryActions: Copy;
	timer: { labels: Copy };
	manualTime: Copy;
};
const CAL = EN.dashboard.calendar;
const T = EN.dashboard.timesheets;
const C = EN.common;
const ACTIONS = EN.timeEntryActions;
const LABELS = EN.timer.labels;
const TIME_FIELDS = EN.manualTime;

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;
const PAGE_PATH = '/calendar';
const LOGS_PATH = '/api/timesheet/time-log';
const CONFLICT_PATH = '/api/timesheet/time-log/conflict';
const SPLIT_PATH_OF = (id: string) => `${LOGS_PATH}/${id}/split`;
/**
 * The same route as the HttpClient names it. Its console line prints the service's own relative path — measured in
 * `s3-lane-a-calendar-3.log`: `HTTP Error: POST /timesheet/time-log/own-manual/split 404` for the request whose path
 * is `/api/timesheet/time-log/own-manual/split` — so an armed call is excused by *this* spelling, not by the request
 * spelling (`logger-adapter.service.ts:189-199` logs `error.config.url`).
 */
const LOGGED_LOGS_PATH = '/timesheet/time-log';
const LOGGED_PATH_OF = (id: string) => `${LOGGED_LOGS_PATH}/${id}`;
const LOGGED_SPLIT_OF = (id: string) => `${LOGGED_LOGS_PATH}/${id}/split`;
const MODIFY_TIME_PERMISSION = 'ALLOW_MODIFY_TIME';
const MANUAL_TIME_PERMISSION = 'ALLOW_MANUAL_TIME';

/* ------------------------------------------------- the copy this file expects, built from locales/en.json */

/** `copy` of the lane-b spec (`member-timesheet-report-ui.spec.ts:678-816` shape), plus the `{x, select, …}` form. */
const copy = (template: string, values: Record<string, string | number> = {}): string => {
	const closingBraceOf = (source: string, openAt: number) => {
		let depth = 0;
		for (let index = openAt; index < source.length; index += 1) {
			if (source[index] === '{') depth += 1;
			if (source[index] === '}' && (depth -= 1) === 0) return index;
		}
		return -1;
	};
	const fill = (source: string): string => {
		let out = '';
		for (let index = 0; index < source.length; index += 1) {
			if (source[index] !== '{') {
				out += source[index];
				continue;
			}
			const end = closingBraceOf(source, index);
			if (end < 0) {
				out += source[index];
				continue;
			}
			const body = source.slice(index + 1, end);
			index = end;
			const comma = body.indexOf(',');
			const name = (comma < 0 ? body : body.slice(0, comma)).trim();
			if (comma < 0) {
				out += String(values[name] ?? '');
				continue;
			}
			const rest = body.slice(comma + 1);
			if (rest.trim().startsWith('select')) {
				const choices = new Map<string, string>();
				let selector = '';
				let cursor = rest.indexOf('select') + 'select'.length;
				while (cursor < rest.length) {
					const at = rest.indexOf('{', cursor);
					if (at < 0) break;
					const close = closingBraceOf(rest, at);
					if (close < 0) break;
					/* ICU puts the choice label before its braces: `week {Previous week}` */
					const label = rest.slice(cursor, at).trim().split(/\s+/).pop() ?? '';
					const text = rest.slice(at + 1, close);
					if (label.startsWith('=')) selector = label.slice(1).trim();
					else choices.set(label, text);
					cursor = close + 1;
				}
				const wanted = String(values[name] ?? selector);
				const exact = choices.get(`=${wanted}`) ?? choices.get(wanted);
				out += fill(exact ?? choices.get('other') ?? choices.get('other') ?? '');
				continue;
			}
			if (rest.trim().startsWith('plural')) {
				const count = Number(values[name] ?? 0);
				const one = /one\s*\{([^}]*)\}/.exec(rest);
				const other = /other\s*\{([^}]*)\}/.exec(rest);
				const exact = new RegExp(`=${count}\\s*\\{([^}]*)\\}`).exec(rest);
				const chosen = exact?.[1] ?? (count === 1 ? one?.[1] : other?.[1]) ?? other?.[1] ?? '';
				out += fill(chosen.replace(/#/g, String(count)));
				continue;
			}
			out += String(values[name] ?? '');
		}
		return out;
	};
	return fill(template).trim();
};

const PREVIOUS = (view: string) => copy(CAL.PREVIOUS, { view });
const NEXT = (view: string) => copy(CAL.NEXT, { view });

/* ------------------------------------------------- the same Intl options the page uses */

const pad = (value: number) => String(value).padStart(2, '0');
const localDayKeyOf = (day: Date) => `${day.getFullYear()}-${pad(day.getMonth() + 1)}-${pad(day.getDate())}`;
/** Day `offset` from the day the run runs on — today is never named. */
const at = (offset: number, hour: number, minute = 0) => {
	const day = new Date();
	day.setDate(day.getDate() + offset);
	day.setHours(hour, minute, 0, 0);
	return day;
};
/** `TimesheetFormatters.time` (`dashboards/timesheets.ts:519`): the browser's zone, 2-digit hours. */
const clockOf = (date: Date) => new Intl.DateTimeFormat('en', { hour: '2-digit', minute: '2-digit' }).format(date);
const rangeTextOf = (from: Date, to: Date) => `${clockOf(from)} – ${clockOf(to)}`;
/** `formatDurationShort` (`core/lib/utils/format-duration.ts`): what the totals and the blocks print. */
const durationOf = (seconds: number) => `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
/** `timesheetFormattersOf.weekday / dayDate` (`dashboards/timesheets.ts:522,532-537`). */
const weekdayOf = (date: Date) => {
	const value = new Intl.DateTimeFormat('en', { weekday: 'long' }).format(date);
	return value.charAt(0).toUpperCase() + value.slice(1);
};
const dayDateOf = (date: Date) => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).format(date);
const dayLabelOf = (date: Date) => copy(T.DAY_LABEL, { day: weekdayOf(date), date: dayDateOf(date) });
/** `useCellLabel` (`calendar-month-view.tsx:95-105`). */
const monthCellLabelOf = (date: Date, trackedSeconds: number) =>
	trackedSeconds === 0
		? copy(CAL.DAY_CELL_EMPTY, { day: dayLabelOf(date) })
		: copy(CAL.DAY_CELL_LABEL, { day: dayLabelOf(date), total: durationOf(trackedSeconds) });
/** `TimeBlock`'s label (`calendar-time-grid.tsx:184`, `ENTRY_LABEL`). */
const entryLabelOf = (title: string, from: Date, to: Date, seconds: number) =>
	copy(CAL.ENTRY_LABEL, { title, range: rangeTextOf(from, to), duration: durationOf(seconds) });
/** `monthTitleOf` / `formatPeriod` for the range heading. */
const monthTitleOf = (date: Date) => new Intl.DateTimeFormat('en', { month: 'long', year: 'numeric' }).format(date);
const periodTextOf = (from: Date, to: Date) =>
	new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric' }).formatRange(from, to).replace(/\s+/g, ' ').trim();
/** `hourLabelsOf` (`calendar-view.ts:746-756`): the gutter's inner hour lines. */
const hourLabelOf = (day: Date, hour: number) => {
	const time = new Date(day);
	time.setHours(hour, 0, 0, 0);
	return new Intl.DateTimeFormat('en', { hour: 'numeric' }).format(time);
};

/* ------------------------------------------------- the served store */

type ServedLog = Record<string, unknown>;
type ServedCall = {
	method: string;
	path: string;
	search: string;
	params: Record<string, string>;
	body: Record<string, unknown> | null;
};
type ServedState = {
	logs: ServedLog[];
	conflicts: ServedLog[];
	/** `"<method> <path>"` → the status to answer with; armed and changed mid-test. */
	refusals: Record<string, number>;
	/** `'offered'`: the split route exists (its empty-body probe is refused by validation). `'missing'`: 404 `Cannot POST …`. */
	splitMode: 'offered' | 'missing';
};
type ServedApi = {
	state: ServedState;
	reads: (path?: string) => ServedCall[];
	writes: () => ServedCall[];
	callsTo: (path: string) => ServedCall[];
};

const employeeOf = (id: string, fullName: string, userId: string) => ({
	id,
	fullName,
	firstName: fullName.split(' ')[0],
	lastName: fullName.split(' ').slice(1).join(' '),
	user: { id: userId }
});

/** One served time log, timed as offsets from the run's own day in the browser's zone. */
const logOf = (options: {
	id: string;
	employeeId: string;
	userId: string;
	fullName: string;
	offset: number;
	startHour: number;
	startMinute: number;
	seconds: number;
	status: string;
	isBillable: boolean;
	logType?: string;
	taskId?: string | null;
	taskTitle?: string | null;
	project?: Record<string, unknown> | null;
	reason?: string | null;
	fixture: FixtureIds;
}): ServedLog => {
	const startedAt = at(options.offset, options.startHour, options.startMinute);
	const stoppedAt = new Date(startedAt.getTime() + options.seconds * 1000);
	const project = options.project ?? null;
	return {
		id: options.id,
		startedAt: startedAt.toISOString(),
		stoppedAt: stoppedAt.toISOString(),
		duration: options.seconds,
		logType: options.logType ?? 'TRACKED',
		source: 'TEAMS',
		isBillable: options.isBillable,
		isRunning: false,
		version: '1',
		employeeId: options.employeeId,
		employee: employeeOf(options.employeeId, options.fullName, options.userId),
		taskId: options.taskId ?? null,
		task: options.taskId ? { id: options.taskId, title: options.taskTitle, taskNumber: null } : null,
		projectId: project?.id ?? null,
		project,
		reason: options.reason ?? null,
		timesheetId: `sheet-${options.id}`,
		timesheet: { id: `sheet-${options.id}`, status: options.status, reason: null },
		notes: null,
		organizationId: options.fixture.ids.organizationA,
		tenantId: options.fixture.ids.tenantA
	};
};

const paramsOf = (url: URL) => {
	const params: Record<string, string> = {};
	url.searchParams.forEach((value, key) => {
		params[key] = value;
	});
	return params;
};

/**
 * Lists arrive indexed in the query (`employeeIds[0]`, `relations[0]`, `ignoreId[0]`), so a list is read out of its
 * bracketed keys in order — `searchParams.getAll('employeeIds')` finds nothing (`time-log.service.ts:290-316`).
 */
const queryValuesOf = (search: string, name: string) =>
	Array.from(new URL(`http://x${search}`).searchParams.entries())
		.filter(([key]) => key === name || key.startsWith(`${name}[`))
		.sort(([a], [b]) => a.localeCompare(b, 'en', { numeric: true }))
		.map(([, value]) => value);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated on every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

/**
 * Every `/api/timesheet/time-log` read and write this page can make, served from a mutable store: a write changes
 * what the next read answers, `refusals` arms a status mid-test, and `splitMode` decides whether the API splits in
 * one write (`core/lib/utils/time-log-split.ts:70-119` reads the 404 `Cannot POST …` as "no route", any other 4xx as
 * "the route is there and refused").
 */
async function serveCalendarApi(page: Page, state: ServedState): Promise<ServedApi> {
	const calls: ServedCall[] = [];
	const jsonHeaders = { ...CORS_HEADERS, 'content-type': 'application/json' };

	await page.route(
		(url) =>
			url.origin === MOCK_API_ORIGIN && (url.pathname === LOGS_PATH || url.pathname.startsWith(`${LOGS_PATH}/`)),
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
			calls.push({ method, path, search: url.search, params, body });

			const refusal = state.refusals[`${method} ${path}`];
			if (refusal) {
				return route.fulfill({
					status: refusal,
					headers: jsonHeaders,
					body: JSON.stringify({ statusCode: refusal, message: 'this file refused the call' })
				});
			}

			if (method === 'GET' && path === LOGS_PATH) {
				const asked = queryValuesOf(url.search, 'employeeIds');
				const from = params['startDate'];
				const to = params['endDate'];
				const logs = state.logs.filter((log) => {
					if (asked.length && !asked.includes(String(log.employeeId))) return false;
					const startedAt = new Date(String(log.startedAt)).getTime();
					if (from && startedAt < new Date(from).getTime()) return false;
					if (to && startedAt > new Date(to).getTime()) return false;
					return true;
				});
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(logs) });
			}

			// `getTimeLogConflicts` validates an array (`time-log.service.ts:228-269`): anything else is a failed read
			if (method === 'GET' && path === CONFLICT_PATH) {
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(state.conflicts) });
			}

			if (method === 'POST' && path.endsWith('/split')) {
				const id = path.slice(LOGS_PATH.length + 1, -'/split'.length);
				if (state.splitMode === 'missing') {
					return route.fulfill({
						status: 404,
						headers: jsonHeaders,
						body: JSON.stringify({ statusCode: 404, message: `Cannot POST ${path}` })
					});
				}
				// `probeSplitTimeLog` posts an empty body on purpose (`time-log.service.ts:469-479`)
				if (!body || body['splitAt'] === undefined) {
					return route.fulfill({
						status: 400,
						headers: jsonHeaders,
						body: JSON.stringify({ statusCode: 400, message: 'splitAt is required' })
					});
				}
				const log = state.logs.find((candidate) => String(candidate.id) === id);
				if (!log) {
					return route.fulfill({
						status: 404,
						headers: jsonHeaders,
						body: JSON.stringify({ statusCode: 404, message: 'no such log' })
					});
				}
				const splitAt = String(body['splitAt']);
				const first = { ...log, stoppedAt: splitAt };
				const second = {
					...log,
					// the same reason as the created log below: the app reads these ids as UUIDs
					id: randomUUID(),
					startedAt: splitAt,
					...(body['taskId'] !== undefined ? { taskId: body['taskId'] } : {}),
					...(body['projectId'] !== undefined ? { projectId: body['projectId'] } : {})
				};
				const withDuration = (entry: ServedLog) => ({
					...entry,
					duration: Math.round(
						(new Date(String(entry.stoppedAt)).getTime() - new Date(String(entry.startedAt)).getTime()) /
							1000
					)
				});
				state.logs = state.logs.map((candidate) =>
					String(candidate.id) === id ? withDuration(first) : candidate
				);
				state.logs = [...state.logs, withDuration(second)];
				return route.fulfill({
					status: 201,
					headers: jsonHeaders,
					body: JSON.stringify({ first: withDuration(first), second: withDuration(second) })
				});
			}

			if (method === 'PUT' && path.startsWith(`${LOGS_PATH}/`)) {
				const id = path.slice(LOGS_PATH.length + 1);
				const log = state.logs.find((candidate) => String(candidate.id) === id);
				if (!log) {
					return route.fulfill({
						status: 404,
						headers: jsonHeaders,
						body: JSON.stringify({ statusCode: 404, message: 'no such log' })
					});
				}
				const merged = { ...log, ...(body ?? {}) };
				merged.duration = Math.round(
					(new Date(String(merged.stoppedAt)).getTime() - new Date(String(merged.startedAt)).getTime()) / 1000
				);
				state.logs = state.logs.map((candidate) => (String(candidate.id) === id ? merged : candidate));
				return route.fulfill({ status: 200, headers: jsonHeaders, body: JSON.stringify(merged) });
			}

			if (method === 'POST' && path === LOGS_PATH) {
				/* the created log answers with a real UUID because the app validates this response against
				   `timeLogSchema` (`time-log.service.ts:198-212`, `validateApiResponse(..., 'addManualTime API
				   response')`) whose `id` is a UUID (`core/types/schemas/common/base.schema.ts`): a made-up id made
				   the app log `Add manual time validation failed: … id: Invalid UUID`
				   (measured `s3-lane-a-calendar-3.log`), which is this file's stand-in talking, not the page */
				const created = {
					...(body ?? {}),
					id: randomUUID(),
					duration: Math.round(
						(new Date(String((body ?? {}).stoppedAt)).getTime() -
							new Date(String((body ?? {}).startedAt)).getTime()) /
							1000
					),
					isRunning: false,
					logType: (body ?? {}).logType ?? 'MANUAL',
					source: (body ?? {}).source ?? 'TEAMS',
					employee: state.logs[0]?.employee,
					timesheetId: `suite-new-${state.logs.length + 1}`,
					timesheet: { id: `suite-new-${state.logs.length + 1}`, status: 'PENDING' }
				};
				state.logs = [...state.logs, created];
				return route.fulfill({ status: 201, headers: jsonHeaders, body: JSON.stringify(created) });
			}

			return route.fulfill({
				status: 404,
				headers: jsonHeaders,
				body: JSON.stringify({ statusCode: 404, message: `no handler for ${method} ${path}` })
			});
		}
	);

	return {
		state,
		reads: (path?: string) => calls.filter((call) => call.method === 'GET' && (!path || call.path === path)),
		writes: () => calls.filter((call) => call.method !== 'GET' && call.method !== 'OPTIONS'),
		callsTo: (path: string) => calls.filter((call) => call.path === path)
	};
}

/* ------------------------------------------------- the page's parts, by role and by copy */

const titleOf = (page: Page) => page.getByRole('heading', { level: 1 });
/** `calendar-page.tsx:340-342` — `{rangeName} · {total} tracked`. */
const metaLineOf = (page: Page) => page.locator('h1 + span');
const rangeHeadingOf = (page: Page) => page.getByRole('heading', { level: 2 });
const rangeGroupOf = (page: Page) => page.getByRole('group', { name: CAL.RANGE_LABEL, exact: true });
const viewTabsOf = (page: Page) => page.getByRole('tablist', { name: CAL.VIEW_LABEL, exact: true });
const legendOf = (page: Page) => page.getByRole('list', { name: CAL.LEGEND_LABEL, exact: true });
const projectLegendOf = (page: Page) => page.getByRole('list', { name: CAL.PROJECTS_LABEL, exact: true });
const gridOf = (page: Page) => page.getByRole('grid', { name: CAL.GRID_LABEL, exact: true });
const columnsOf = (page: Page) => page.locator('[role=gridcell][data-calendar-day]');
/** The entry blocks only: the column's own `aria-hidden` button under them carries no `aria-label`. */
const entryBlocksOf = (page: Page) => page.locator('[role=gridcell] button[aria-label]');
const entryOf = (page: Page, title: string) => entryBlocksOf(page).filter({ hasText: title }).first();
const memberTriggerOf = (page: Page) =>
	page.getByRole('button', { name: new RegExp(`^${CAL.MEMBER_SWITCH_LABEL.split('{')[0].trim()}`) });
const settingsTriggerOf = (page: Page) => page.getByRole('button', { name: CAL.SETTINGS.LABEL, exact: true });
const menuOf = (page: Page) => page.locator('[role=menu]:visible');
/**
 * The app's own dialogs only, and without `:visible`. A Popover's content and a Sheet's panel carry `role=dialog` too
 * — measured in `s3-lane-a-calendar-probe-4.log`, where the entry popover read as `div[popover-content]` and the day
 * panel as `div[sheet-content]` under the same `[role=dialog]` query — so both slots are excluded. `:visible` is left
 * off because the Timesheets modal is Headless UI's `Dialog as="div" className="relative z-[1000]"`
 * (`common/modal.tsx:70-73`) wrapping `fixed` children: the dialog element's own box measured `1280x0` with its text
 * in it (`s3-lane-a-calendar-probe-11.log`), so a `:visible` query on `[role=dialog]` finds nothing while the modal is
 * open. The lane-b spec's `dialogOf` has no `:visible` for the same reason
 * (`member-timesheet-report-ui.spec.ts:878`).
 */
/* a Popover's panel, a Sheet's panel, and Next.js's own dev-mode "Console Error" overlay — a
   `role=dialog aria-modal=true` element raised whenever the app logs an error (`data-nextjs-dialog="true"`,
   `class="error-overlay-dialog-scroll"`, measured in `s3-lane-a-calendar-2.log` sitting next to the split dialog in
   test 9) — all carry `role=dialog` and none of them is a dialog of this page. */
const DIALOG_SELECTOR =
	'[role=dialog]:not([data-slot=popover-content]):not([data-slot=sheet-content]):not([data-nextjs-dialog])';
const dialogOf = (page: Page) => page.locator(DIALOG_SELECTOR);
/**
 * The dialog that prints `title`, found by that title rather than by counting `[role=dialog]`: one open modal answers
 * that query twice on the popover path (`s3-lane-a-calendar-probe-7.log` counted 2 with the entry popover still open)
 * and once on the context-menu path (`s3-lane-a-calendar-probe-12.log`), and in both cases the innermost node — the
 * last in document order — is the one carrying the dialog's own markup.
 */
const dialogShowing = (page: Page, title: string) => dialogOf(page).filter({ hasText: title }).last();
const popoverOf = (page: Page) => page.locator('[data-slot=popover-content]:visible');
/** Sonner's own markup, as the lane-b spec reads it (`member-timesheet-report-ui.spec.ts:1968-1971`). */
const toastsOf = (page: Page) => page.locator('li[data-sonner-toast], [data-slot=toast]').filter({ hasText: /\S/ });

const textOf = (locator: Locator) =>
	locator.evaluate((node: Element) => (node.textContent ?? '').replace(/\s+/g, ' ').trim());
const textsOf = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) =>
		nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim())
	);
const labelsOf = (locator: Locator) =>
	locator.evaluateAll((nodes: Element[]) => nodes.map((node) => node.getAttribute('aria-label') ?? ''));

/** `MEASURE` lines, the way the lane-b spec prints what a test saw. */
const measure = (label: string, value: unknown) => console.log(`[MEASURE calendar] ${label} ${JSON.stringify(value)}`);

/** The console helper of `member-timesheet-report-ui.spec.ts:956-984`: only a named line is excused. */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/**
 * A line counts as "the armed call the page was told to fail" only when it names the armed path *and* the armed
 * status (`member-timesheet-report-ui.spec.ts:981-984`). The HttpClient logs a refusal in two shapes — measured in
 * `s3-lane-a-calendar-probe-6.log`: a 500 as `HTTP Error: PUT /timesheet/time-log/own-manual 500 …`, a 403 as
 * `🚨 CRITICAL: HTTP 403 Forbidden - PUT /timesheet/time-log/own-manual - Permission Denied …` — so both halves are
 * matched as text instead of against one fixed shape.
 */
const isArmedFailure = (line: string, loggedPath: string, status: number) =>
	line.includes('[HttpClient]') && line.includes(loggedPath) && line.includes(String(status));
const consoleFindings = (shield: Shield) => shield.consoleErrors().filter((line) => !line.includes(SHELL_STORE_NOISE));
const consoleFindingsWithout = (shield: Shield, loggedPath: string, status: number) =>
	consoleFindings(shield).filter((line) => !isArmedFailure(line, loggedPath, status));
const armedFailureLines = (shield: Shield, loggedPath: string, status: number) =>
	shield.consoleErrors().filter((line) => isArmedFailure(line, loggedPath, status));
/** A test that arms more than one call excuses every armed one of them by its own path and status. */
const consoleFindingsWithoutAll = (shield: Shield, armed: [string, number][]) =>
	consoleFindings(shield).filter((line) => !armed.some(([path, status]) => isArmedFailure(line, path, status)));

/* ------------------------------------------------- the data every served test hands the page */

type FixtureIds = {
	ids: Record<string, string>;
	names: Record<string, string>;
};

const servedFor = (fixture: FixtureIds): ServedState => ({
	logs: [
		logOf({
			id: 'own-manual',
			employeeId: fixture.ids.employee,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: weekDayB(),
			startHour: 10,
			startMinute: 0,
			seconds: 7200,
			status: 'PENDING',
			isBillable: true,
			logType: 'MANUAL',
			reason: 'Suite reason',
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task,
			project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
			fixture
		}),
		logOf({
			id: 'own-tracked',
			employeeId: fixture.ids.employee,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: weekDayA(),
			startHour: 13,
			startMinute: 30,
			seconds: 5400,
			status: 'PENDING',
			isBillable: false,
			taskId: 'suite-task-2',
			taskTitle: 'Suite tracked task',
			project: { id: 'suite-project-2', name: 'Suite Second Project', color: '#f97316' },
			fixture
		}),
		logOf({
			id: 'own-no-task',
			employeeId: fixture.ids.employee,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: weekDayA(),
			startHour: 16,
			startMinute: 0,
			seconds: 1800,
			status: 'DRAFT',
			isBillable: true,
			fixture
		}),
		// a log of another member of the same team: the page must never draw it under the shown member's name
		logOf({
			id: 'teammate-tracked',
			employeeId: fixture.ids.teammateEmployee,
			userId: fixture.ids.teammateUser,
			fullName: fixture.names.teammate,
			offset: weekDayB(),
			startHour: 11,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: 'suite-task-3',
			taskTitle: 'Suite teammate task',
			project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
			fixture
		})
	],
	conflicts: [],
	refusals: {},
	splitMode: 'missing'
});

/** The week the calendar opens on: Monday first, because the mock's organization names no `startWeekOn` (`:86-99`). */
const mondayOffset = () => {
	const weekday = new Date().getDay();
	return -((weekday + 6) % 7);
};
/**
 * The two days the display tests serve their logs on: two whole days **of the week the calendar opens on**
 * (`visibleRangeOf`, `calendar-view.ts:188-201`) that are not the run's own day. Those two rules are what makes the
 * pair hold on any weekday: a day of the shown week is a column of the week grid and a cell of the 42-day month grid
 * on every weekday (a served day of the week before it is not — the month grid starts at the week holding the 1st, so
 * on a run whose week starts on the 1st a previous-week day falls outside it), and the run's own day must stay free of
 * served time because test 2 pins today's month cell as a plan-only cell (its `REACH` line) and the day view of a day
 * holding nothing, and today is the one day of the shown week a run can never step around. On a Wednesday..Sunday the
 * pair is the week's Monday and Tuesday, exactly as the accepted runs measured; on a Monday or a Tuesday those two
 * would land on today, so the pair is the week's last two days instead. A day after today draws and counts the same
 * way as a past one — measured with a served log on the shown week's Saturday and Sunday: each was printed in its own
 * week column and in its own month cell, and both totals named them (`s3-lane-a-weekday-calendarprobe-1.log`
 * "MEASURE week entries" / "MEASURE month cells of the three days" / "MEASURE month meta line" `4h 30m`). The drag and
 * split tests keep their own whole past day (`dragDayOffset`), where every slot a drag can land on is behind the run.
 */
const displayDaysOf = () => {
	const week = Array.from({ length: 7 }, (_, index) => mondayOffset() + index);
	const pastDays = week.filter((offset) => offset < 0);
	return pastDays.length >= 2 ? [pastDays[0], pastDays[1]] : [week[5], week[6]];
};
const weekDayA = () => displayDaysOf()[0];
const weekDayB = () => displayDaysOf()[1];
/** The time the shown member has on one served day, as `calendarDaysOf` would total it (`calendar-view.ts:549-569`). */
const daySecondsOf = (state: ServedState, employeeId: string, offset: number) =>
	secondsOf(
		ownLogsOf(state, employeeId).filter(
			(log) => localDayKeyOf(new Date(String(log.startedAt))) === localDayKeyOf(at(offset, 12, 0))
		)
	);

const weekView = async (page: Page) => {
	await viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.WEEK, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => columnsOf(page).count(), { timeout: 25_000 }).toBe(7);
};
const dayView = async (page: Page) => {
	await viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.DAY, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => columnsOf(page).count(), { timeout: 25_000 }).toBe(1);
};
const monthView = async (page: Page) => {
	await viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.MONTH, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => gridOf(page).getByRole('gridcell').count(), { timeout: 25_000 }).toBe(42);
};

const storageOf = (page: Page) =>
	page.evaluate(() => ({
		view: window.localStorage.getItem('calendar-view'),
		settings: window.localStorage.getItem('calendar-grid-settings')
	}));
/** The stored grid settings as text, for a poll that must not trip over `null`. */
const settingsStorageOf = async (page: Page) => (await storageOf(page)).settings ?? '';

/** The block's own pixels, read off the page rather than assumed. */
const blockGeometry = async (page: Page, title: string, durationMinutes: number) => {
	const info = await entryOf(page, title).evaluate((node: Element) => {
		const block = node as HTMLElement;
		const column = block.closest('[role=gridcell]') as HTMLElement;
		const rect = block.getBoundingClientRect();
		const columnRect = column.getBoundingClientRect();
		return {
			label: block.getAttribute('aria-label'),
			styleTop: block.style.top,
			styleHeight: block.style.height,
			opacity: getComputedStyle(block).opacity,
			centerX: rect.x + rect.width / 2,
			centerY: rect.y + rect.height / 2,
			columnKey: column.getAttribute('data-calendar-day'),
			columnTop: columnRect.top,
			columnBottom: columnRect.bottom,
			columnX: columnRect.x,
			columnRight: columnRect.right
		};
	});
	return { ...info, pxPerHour: (parseFloat(info.styleHeight) / durationMinutes) * 60 };
};

/** What the grid draws while a drag is held: `calendar-drag-ghost.tsx:98-118`, an `aria-hidden` box over the column. */
const ghostOf = (page: Page) =>
	page.evaluate(() =>
		Array.from(document.querySelectorAll('[role=grid] div[aria-hidden="true"]'))
			.filter((node) => (node as HTMLElement).style.top !== '' && (node as HTMLElement).style.height !== '')
			.map((node) => {
				const element = node as HTMLElement;
				return {
					text: (element.textContent ?? '').replace(/\s+/g, ' ').trim(),
					top: element.style.top,
					height: element.style.height
				};
			})
	);

const dragTo = async (page: Page, from: { x: number; y: number }, to: { x: number; y: number }) => {
	await page.mouse.move(from.x, from.y);
	await page.mouse.down();
	// `MOUSE_DRAG_THRESHOLD_PX = 4` (`use-calendar-grid-drag.ts:43`): a press becomes a drag after a few pixels
	await page.mouse.move(from.x, from.y + (to.y >= from.y ? 12 : -12), { steps: 4 });
	const held = await ghostOf(page);
	const dragged = await entryBlocksOf(page)
		.first()
		.evaluate((node: Element) => getComputedStyle(node as HTMLElement).opacity);
	await page.mouse.move(to.x, to.y, { steps: 10 });
	const released = await ghostOf(page);
	await page.mouse.up();
	return { held, released, dragged };
};

const entryLabels = (page: Page) => labelsOf(entryBlocksOf(page));
const writesOf = (api: ServedApi) =>
	api.writes().map((write) => `${write.method} ${write.path} ${JSON.stringify(write.body)}`);
const lastBodyOf = (api: ServedApi, method: string) =>
	api
		.writes()
		.filter((write) => write.method === method)
		.at(-1)?.body;
/** A drag's write lands only after its conflict lookup, so a body is read once the write has arrived. */
const waitForWrites = async (api: ServedApi, moreThan: number) => {
	await expect.poll(() => api.writes().length, { timeout: 30_000 }).toBeGreaterThan(moreThan);
};

/** Sonner keeps a toast while the pointer hovers the toaster: park the pointer, then expect it gone. */
const toastTexts = async (page: Page, label: string) => {
	await expect.poll(() => toastsOf(page).count(), { timeout: 25_000 }).toBeGreaterThan(0);
	const texts = await textsOf(toastsOf(page));
	measure(`${label} toasts`, texts);
	await page.mouse.move(2, 2);
	await expect(toastsOf(page)).toHaveCount(0, { timeout: 25_000 });
	return texts;
};
/**
 * One toast holding every word the page gave it. `toast.error(title, { description })` (`use-calendar-entry-moves.ts
 * :116`, `:150`) renders its two lines inside the same `li`, so they arrive as one string — measured in
 * `s3-lane-a-calendar-1.log`, where the pair came back as `Change not savedYou can't add or change time…`.
 */
const toastSays = async (page: Page, label: string, ...pieces: string[]) => {
	const texts = await toastTexts(page, label);
	expect(texts).toHaveLength(1);
	for (const piece of pieces) expect(texts[0]).toContain(piece);
};

const closeLayers = async (page: Page) => {
	await page.keyboard.press('Escape');
	return (await popoverOf(page).count()) + (await dialogOf(page).count()) + (await menuOf(page).count());
};
const openSettingsMenu = async (page: Page) => {
	await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);
	await settingsTriggerOf(page).click({ timeout: 15_000 });
	await expect.poll(() => popoverOf(page).count(), { timeout: 15_000 }).toBeGreaterThan(0);
};
/**
 * A `Select` in the settings popover opens its `div[select-viewport][role=listbox]`; the closed ones stay in the
 * document (`calendar-grid-settings-menu.tsx`), so the options are read from the listbox that is actually open.
 */
const pickSetting = async (page: Page, settingLabel: string, optionText: RegExp) => {
	await page.getByRole('combobox', { name: settingLabel, exact: true }).click({ timeout: 15_000 });
	const listbox = page.locator('[role=listbox]:visible');
	await expect.poll(() => listbox.getByRole('option').count(), { timeout: 15_000 }).toBeGreaterThan(0);
	// the chosen option proves itself: the caller reads the stored setting back
	await listbox.getByRole('option').filter({ hasText: optionText }).first().click({ timeout: 15_000 });
};

const rightClickEntry = async (page: Page, title: string) => {
	const box = await entryOf(page, title).boundingBox();
	if (!box) throw new Error(`no box for ${title}`);
	// `calendar-time-grid.tsx:210-216` opens the menu from `onContextMenu`, so a real right click is the page's own path
	await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2, { button: 'right' });
	await expect(menuOf(page)).toBeVisible({ timeout: 15_000 });
};

/**
 * Clicks a dialog's own footer button by the words written on it, raising the viewport when the lane's 720 px one is
 * too short for the panel (measured: `s3-lane-a-calendar-probe-8.log` needed the scroll, `s3-lane-a-calendar-2.log`
 * needed the raise as well).
 */
const clickDialogButton = async (page: Page, name: string, scope?: Locator) => {
	/* a dialog can hold two buttons named the same: the split dialog's header X carries `aria-label=common.CLOSE`
	   (`calendar-split-dialog.tsx:536-541`) next to the footer button that prints the same words
	   (`calendar-split-dialog.tsx:430-432`), so the one written on the button is the one clicked.
	   Escape and the overlay do not close these dialogs (measured `s3-lane-a-calendar-probe-12.log`: Escape left the
	   Time log dialog open for 40 s; `Modal` defaults `closeOnOutsideClick = false` (`common/modal.tsx:52`) and routes
	   Headless UI's `onClose` to `() => null` unless a page asks otherwise (`:72-73`)), so the dialog's own button is
	   the only way out. */
	const button = (scope ?? dialogOf(page))
		.getByRole('button', { name, exact: true })
		.filter({ hasText: name })
		.first();
	await button.scrollIntoViewIfNeeded();
	try {
		await button.click({ timeout: 8_000 });
	} catch (error) {
		/* the Headless UI overlay (`common/modal.tsx:86` `div.fixed.inset-0 ... items-center justify-center`) has no
		   scroll container, so a dialog taller than the lane's 720 px viewport puts its footer outside the viewport and
		   no scroll of the button helps: `scrollIntoViewIfNeeded` left the click refused in `s3-lane-a-calendar-2.log`.
		   Raising the viewport to the height the measured panel needs is what lane-b does
		   (`suites/lane-b/member-timesheet-report-ui.spec.ts:889-901`, its finding 8), so this does the same. */
		measure(`click ${name} refused in the lane viewport, raising it`, String(error).slice(0, 160));
		await page.setViewportSize({ width: 1280, height: 1_100 });
		await button.click({ timeout: 20_000 });
	}
};

/** `ul aria-label=SPLIT.PARTS_LABEL` (`calendar-split-dialog.tsx:348-387`): the two parts the dialog is about to make. */
const splitPartsOf = (page: Page) =>
	textsOf(page.getByRole('list', { name: CAL.SPLIT.PARTS_LABEL, exact: true }).locator('li'));
const saveSplit = async (page: Page) => {
	await clickDialogButton(page, CAL.SPLIT.ACTION);
	// success closes the dialog and prints a toast instead (`calendar-split-dialog.tsx:275-278`, finding 8)
	await expect.poll(() => dialogOf(page).count(), { timeout: 60_000 }).toBe(0);
};

const openSplitOn = async (page: Page, title: string) => {
	await rightClickEntry(page, title);
	// Base UI menus are document-level portals: close and reopen before each item
	await menuOf(page).getByRole('menuitem', { name: CAL.MENU.SPLIT, exact: true }).click({ timeout: 15_000 });
	await expect.poll(() => dialogOf(page).count(), { timeout: 30_000 }).toBeGreaterThan(0);
};

/* ------------------------------------------------- the run's own zone, never a pinned date or offset */

/** `getDefaultTimezone()` (`date-and-time.ts:313`), i.e. the browser's zone the read carries. */
const zoneOf = () => Intl.DateTimeFormat().resolvedOptions().timeZone;
/** `GMT+1` on this day: the same `Intl` answer the grid's zone header prints (`calendar-time-grid.tsx:592-599`). */
const gmtOffsetOf = (date: Date) =>
	new Intl.DateTimeFormat('en', { timeZoneName: 'shortOffset' })
		.formatToParts(date)
		.find((part) => part.type === 'timeZoneName')?.value ?? '';
/** `formatHoursLabel` (`dashboard-figures.ts:25-31`): a whole 8 hours prints `8h`, not `8h 0m`. */
const hoursLabelOf = (seconds: number) => {
	const minutes = Math.round(seconds / 60);
	return minutes % 60 === 0 ? `${minutes / 60}h` : `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
};
/** `percentOf` + `formatPercent(value, locale)` (`dashboard-figures.ts:43-57`): `0%`. */
const percentOfTracked = (part: number, whole: number) =>
	new Intl.NumberFormat('en', { style: 'percent', maximumFractionDigits: 0 }).format(
		Math.round(whole ? (part / whole) * 100 : 0) / 100
	);
const shortWeekdayOf = (date: Date) => new Intl.DateTimeFormat('en', { weekday: 'short' }).format(date);
/**
 * The other shape of the same `DAY_LABEL`: the grid header, the `Open day` label and the day panel's title use the
 * short weekday (`calendar-time-grid.tsx:430-432`, `calendar-day-panel.tsx:23`; measured `Open Thu, Nov 26`), while
 * `dayLabelOf` above — the month cell's shape — uses the long one (measured `Wednesday, Nov 25, 2h 0m tracked`).
 */
const shortDayLabelOf = (date: Date) => copy(T.DAY_LABEL, { day: shortWeekdayOf(date), date: dayDateOf(date) });
/**
 * `requestDaysOf` (`calendar-view.ts:207-211`) widens the range by one local day on each side, and
 * `time-log.service.ts:290-292` + `format-date-range.ts:125-155` turn those day keys into that zone's day bounds. The
 * run's zone is the browser's own, so this file's local midnights *are* those bounds. A zone whose day starts on a
 * DST jump is out of reach here (finding 7).
 */
const startOfDayIsoOf = (offset: number) => at(offset, 0, 0).toISOString();
const endOfDayIsoOf = (offset: number) => {
	const day = at(offset, 23, 59);
	day.setSeconds(59, 999);
	return day.toISOString();
};
/** The reads whose bounds are exactly the week starting at `startOffset`, widened the way `requestDaysOf` widens it. */
const weekReadsOf = (api: ServedApi, startOffset: number) =>
	api
		.reads(LOGS_PATH)
		.filter(
			(call) =>
				call.params['startDate'] === startOfDayIsoOf(startOffset - 1) &&
				call.params['endDate'] === endOfDayIsoOf(startOffset + 7)
		);
const columnHeadersOf = (page: Page) => gridOf(page).getByRole('columnheader');
/**
 * The grid's hour gutter: one `role=rowheader` holding the hour lines and, on a shown today, the now line. It is
 * `aria-hidden` (`calendar-time-grid.tsx:626`), so `getByRole('rowheader')` never resolves it (run 1 waited on that
 * until the test timeout); the attribute is still read through CSS, which is what `probe-4.log` measured.
 */
const rowHeadersOf = (page: Page) => page.locator('[role=grid] [role=rowheader]');
/** The week and day columns are the only `role=gridcell` carrying `data-calendar-day` (`use-calendar-grid-drag.ts:38`). */
const columnKeysOf = (page: Page) =>
	columnsOf(page).evaluateAll((nodes: Element[]) =>
		nodes.map((node) => node.getAttribute('data-calendar-day') ?? '')
	);
/** The served logs of the member the page shows, as it counts them (`calendar-view.ts:406-407`). */
const ownLogsOf = (state: ServedState, employeeId: string) =>
	state.logs.filter((log) => String(log.employeeId) === employeeId);
const secondsOf = (logs: ServedLog[]) => logs.reduce((sum, log) => sum + Number(log.duration), 0);
/** `countedDaysOf` (`calendar-view.ts:572-577`): the month view counts the anchor's own month only. */
const monthCountedSecondsOf = (state: ServedState, employeeId: string) =>
	secondsOf(
		ownLogsOf(state, employeeId).filter(
			(log) => new Date(String(log.startedAt)).getMonth() === new Date().getMonth()
		)
	);

const OWN_SECONDS = 7200 + 5400 + 1800;
/** The mock's fixture daily plan for today (`mock-gauzy-server.mjs:255-271`, answered at `:760-761`). */
const PLAN_EXPECTED_SECONDS = 8 * 3600;

/* ------------------------------------------------- the served set the drag tests need */

/**
 * The day the drag tests serve their entry on: a whole day that is already behind the run, so no placement the drag
 * can reach is in the future — `dragRefusalOf` (`calendar-drag.ts:320-338`) would refuse a future placement with the
 * `DRAG.FUTURE` copy instead of doing the move this file is measuring (`placementLimitOf` = now, since the mock's
 * organization names no `futureDateAllowed`, `timesheet-sheet-edit.ts:558-567`).
 */
const dragDayOffset = () => Math.min(mondayOffset() + 6, -1);
const weekStartOf = (date: Date) => {
	const index = (date.getDay() + 6) % 7;
	const day = new Date(date);
	day.setDate(day.getDate() - index);
	day.setHours(12, 0, 0, 0);
	return day;
};
/** Day offset of a noon date from the run's own day; noon keeps a DST day from shifting it. */
const dayOffsetOf = (date: Date) => Math.round((date.getTime() - at(0, 12, 0).getTime()) / 86_400_000);
/**
 * The range the *month* grid the page opens on asks for: six whole weeks starting at the Monday of the week holding
 * the 1st (`visibleRangeOf` `calendar-view.ts:187-193`, `DAYS_IN_MONTH_GRID = 42`), widened one day each side by
 * `requestDaysOf` (`:207-211`) — measured `s3-lane-a-calendar-probe-7.log` for a run on 2026-11-27:
 * `2026-10-24T22:00:00.000Z … 2026-12-07T22:59:59.999Z` in `Europe/Madrid`.
 */
const monthGridStartOffset = () => {
	const firstOfMonth = at(0, 12, 0);
	firstOfMonth.setDate(1);
	return dayOffsetOf(weekStartOf(firstOfMonth)) - 1;
};
const monthGridEndOffset = () => monthGridStartOffset() + 43;
/** How many `Previous week` steps bring a served day into the shown week. */
const weeksBackTo = (offset: number) =>
	Math.round((weekStartOf(at(0, 12, 0)).getTime() - weekStartOf(at(offset, 12, 0)).getTime()) / 86_400_000);
const showWeekOf = async (page: Page, offset: number) => {
	await weekView(page);
	for (let step = 0; step < weeksBackTo(offset); step += 1) {
		await rangeGroupOf(page)
			.getByRole('button', { name: PREVIOUS('week'), exact: true })
			.click({ timeout: 15_000 });
	}
	await expect.poll(() => columnsOf(page).count(), { timeout: 30_000 }).toBe(7);
	await expect.poll(() => columnKeysOf(page), { timeout: 30_000 }).toContain(localDayKeyOf(at(offset, 12, 0)));
};

const DRAG_MANUAL_ID = 'own-manual';
/** The movable entry (manual, stopped → `isReducibleLog`) and a later entry to overlap it with. */
const dragServedFor = (fixture: FixtureIds, options: { onlyMovable?: boolean } = {}): ServedState => {
	const day = dragDayOffset();
	const logs: ServedLog[] = [
		logOf({
			id: DRAG_MANUAL_ID,
			employeeId: fixture.ids.employee,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: day,
			startHour: 10,
			startMinute: 0,
			seconds: 7200,
			status: 'PENDING',
			isBillable: true,
			logType: 'MANUAL',
			taskId: fixture.ids.task,
			taskTitle: fixture.names.task,
			project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
			fixture
		}),
		logOf({
			id: 'own-later',
			employeeId: fixture.ids.employee,
			userId: fixture.ids.user,
			fullName: fixture.names.user,
			offset: day,
			startHour: 14,
			startMinute: 0,
			seconds: 3600,
			status: 'PENDING',
			isBillable: true,
			taskId: 'suite-task-2',
			taskTitle: 'Suite later task',
			project: { id: 'suite-project-2', name: 'Suite Second Project', color: '#f97316' },
			fixture
		})
	];
	return {
		logs: options.onlyMovable ? logs.slice(0, 1) : logs,
		conflicts: [],
		refusals: {},
		splitMode: 'missing'
	};
};
const servedWindowOf = (state: ServedState, id: string) => {
	const log = state.logs.find((entry) => String(entry.id) === id);
	return `${String(log?.startedAt)} ${String(log?.stoppedAt)}`;
};

/* ------------------------------------------------- the served set the split tests need */

/** Nothing to draw: the case the day panel and the empty range are measured on. */
const emptyServedFor = (): ServedState => ({
	logs: [],
	conflicts: [],
	refusals: {},
	splitMode: 'missing'
});

const SPLIT_TRACKED_ID = 'own-tracked';
const SPLIT_SHORT_ID = 'own-short';

/** The entry the split runs on, a tracked entry of the same day, and (for the slot rule) an 8-minute tracked entry. */
const splitServedFor = (fixture: FixtureIds): ServedState => {
	const day = dragDayOffset();
	return {
		logs: [
			logOf({
				id: DRAG_MANUAL_ID,
				employeeId: fixture.ids.employee,
				userId: fixture.ids.user,
				fullName: fixture.names.user,
				offset: day,
				startHour: 10,
				startMinute: 0,
				seconds: 7200,
				status: 'PENDING',
				isBillable: true,
				logType: 'MANUAL',
				taskId: fixture.ids.task,
				taskTitle: fixture.names.task,
				project: { id: fixture.ids.project, name: 'Fixture Project', color: '#22c55e' },
				fixture
			}),
			logOf({
				id: SPLIT_TRACKED_ID,
				employeeId: fixture.ids.employee,
				userId: fixture.ids.user,
				fullName: fixture.names.user,
				offset: day,
				startHour: 13,
				startMinute: 30,
				seconds: 5400,
				status: 'PENDING',
				isBillable: true,
				logType: 'TRACKED',
				taskId: 'suite-task-2',
				taskTitle: 'Suite tracked task',
				project: { id: 'suite-project-2', name: 'Suite Second Project', color: '#f97316' },
				fixture
			}),
			// 09:01–09:09 holds no whole 10-minute mark, the case `calendar-split.test.ts:130` pins
			logOf({
				id: SPLIT_SHORT_ID,
				employeeId: fixture.ids.employee,
				userId: fixture.ids.user,
				fullName: fixture.names.user,
				offset: day,
				startHour: 9,
				startMinute: 1,
				seconds: 480,
				status: 'PENDING',
				isBillable: true,
				logType: 'TRACKED',
				taskId: 'suite-task-3',
				taskTitle: 'Suite short task',
				project: { id: 'suite-project-2', name: 'Suite Second Project', color: '#f97316' },
				fixture
			})
		],
		conflicts: [],
		refusals: {},
		splitMode: 'offered'
	};
};

/* ================================================================ the tests */

test.describe('lane-a · Calendar: what a signed-in manager sees and what the browser really sends', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	test('1 · the week view of served time: the toolbar, the range, every entry as printed, the day totals, the read', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(180_000);
		const state = servedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});

		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		// `app/[locale]/(main)/calendar/page.tsx` `withAuthentication(Calendar, { displayName: 'Calendar' })`
		await expect(titleOf(page)).toHaveText('Calendar');
		// a first visit has chosen nothing yet: neither a view nor a grid setting is in storage
		expect(await storageOf(page)).toEqual({ view: null, settings: null });

		const monday = at(mondayOffset(), 12, 0);
		const sunday = at(mondayOffset() + 6, 12, 0);
		await weekView(page);

		/* the toolbar: the stepper of the range, the view tabs, the legend */
		const rangeName = periodTextOf(monday, sunday);
		await expect(rangeHeadingOf(page).first()).toHaveText(rangeName);
		for (const name of [PREVIOUS('week'), C.TODAY, NEXT('week')]) {
			await expect(rangeGroupOf(page).getByRole('button', { name, exact: true })).toBeVisible();
		}
		await expect(viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.WEEK, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		// no Break line: the mock's organization names no break setting, so `useBreaksAllowed` is off
		expect(await textsOf(legendOf(page).locator('li'))).toEqual([
			CAL.LEGEND.TRACKED,
			CAL.LEGEND.MANUAL,
			CAL.LEGEND.PLANNED
		]);

		/* the range name and the total of the shown member's own time (`calendar-page.tsx:340-342`) */
		await expect(metaLineOf(page)).toHaveText(
			`${rangeName} · ${copy(CAL.TRACKED_TOTAL, { total: durationOf(OWN_SECONDS) })}`
		);

		/* the grid: the zone header, then one column per day of the week, each header carrying that day's total */
		const headers = await textsOf(columnHeadersOf(page));
		measure('week columnheaders', headers);
		expect(headers).toHaveLength(8);
		expect(headers[0]).toContain(copy(CAL.TIME_ZONE, { zone: zoneOf() }));
		expect(headers[0]).toContain(gmtOffsetOf(new Date()));
		const dayHeaders = Array.from({ length: 7 }, (_, index) => {
			const day = at(mondayOffset() + index, 12, 0);
			const tracked = secondsOf(
				ownLogsOf(state, fixture.ids.employee).filter(
					(log) => localDayKeyOf(new Date(String(log.startedAt))) === localDayKeyOf(day)
				)
			);
			return `${shortWeekdayOf(day)} ${day.getDate()}${tracked ? durationOf(tracked) : ''}`;
		});
		expect(headers.slice(1)).toEqual(dayHeaders);

		/* every entry the grid prints: title, range, duration — and nobody else's entry */
		const printed = [
			entryLabelOf(fixture.names.task, at(weekDayB(), 10, 0), at(weekDayB(), 12, 0), 7200),
			entryLabelOf('Suite tracked task', at(weekDayA(), 13, 30), at(weekDayA(), 15, 0), 5400),
			entryLabelOf(T.NO_TASK, at(weekDayA(), 16, 0), at(weekDayA(), 16, 30), 1800)
		];
		const shown = await entryLabels(page);
		measure('week entry labels', shown);
		expect([...shown].sort()).toEqual([...printed].sort());
		expect(shown.join('\n')).not.toContain('Suite teammate task');

		/* where each block sits: `gridMinuteAtOffset`/`gridHeightOf` at the default 48 px per hour */
		const geometry = await blockGeometry(page, fixture.names.task, 120);
		measure('manual block geometry', geometry);
		expect(geometry.styleHeight).toBe('96px');
		expect(geometry.pxPerHour).toBe(48);
		expect(geometry.columnKey).toBe(localDayKeyOf(at(weekDayB(), 12, 0)));

		/* the time per project, largest first, time without a project last (`calendar-view.ts:607-634`) */
		expect(await textsOf(projectLegendOf(page).locator('li'))).toEqual([
			`Fixture Project${durationOf(7200)}`,
			`Suite Second Project${durationOf(5400)}`,
			`${T.NO_PROJECT}${durationOf(1800)}`
		]);

		/* the read: the week widened by one day each side, in the browser's zone, for the shown member only.
		   The page opened on the month grid first, so the log holds that range too — measured in
		   `s3-lane-a-calendar-probe-7.log`: the month grid's 42 cells (Mon Oct 26 … Sun Dec 6) widened by a day each
		   side is `2026-10-24T22:00:00.000Z … 2026-12-07T22:59:59.999Z`, the week's is
		   `2026-11-21T23:00:00.000Z … 2026-11-30T22:59:59.999Z`. */
		await expect.poll(() => api.reads(LOGS_PATH).length, { timeout: 40_000 }).toBeGreaterThanOrEqual(2);
		const reads = api.reads(LOGS_PATH);
		const weekBounds = `${startOfDayIsoOf(mondayOffset() - 1)}|${endOfDayIsoOf(mondayOffset() + 7)}`;
		const bounds = reads.map((read) => `${read.params['startDate']}|${read.params['endDate']}`).sort();
		measure('read bounds', { bounds, weekBounds, count: reads.length });
		// the week range is asked for, and every ask for it names the same bounds
		expect(bounds.filter((bound) => bound === weekBounds).length).toBeGreaterThanOrEqual(1);
		// the only other range in the log is the month grid the page opened on, and it too is asked one way only
		const otherBounds = new Set(bounds.filter((bound) => bound !== weekBounds));
		expect(otherBounds.size).toBe(1);
		expect(otherBounds.values().next().value).toBe(
			`${startOfDayIsoOf(monthGridStartOffset())}|${endOfDayIsoOf(monthGridEndOffset())}`
		);
		expect(new Set(reads.map((read) => read.params['employeeIds[0]'])).size).toBe(1);
		expect(reads.at(-1)?.params['employeeIds[0]']).toBe(fixture.ids.employee);
		for (const read of reads) {
			expect(read.params['timeZone']).toBe(zoneOf());
			expect(read.params['includeBreaks']).toBeUndefined();
		}
		const relations = queryValuesOf(reads.at(-1)?.search ?? '', 'relations').sort();
		measure('read relations', relations);
		expect(relations).toEqual(
			['project', 'task', 'organizationContact', 'employee.user', 'task.taskStatus', 'timesheet', 'tags'].sort()
		);

		expect(consoleFindings(shield)).toEqual([]);
	});

	test('2 · the month and the day view: what each draws, switching, and what survives a reload', async ({
		page,
		fixture
	}) => {
		test.setTimeout(180_000);
		const state = servedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });

		/* the month view is what the page opens on: 6 whole weeks of cells (`calendar-view.ts:88,188-201`) */
		const today = at(0, 12, 0);
		await expect(gridOf(page)).toHaveAccessibleName(CAL.GRID_LABEL);
		await expect(gridOf(page).getByRole('gridcell')).toHaveCount(42);
		await expect(gridOf(page).getByRole('row')).toHaveCount(7);
		expect(await textsOf(columnHeadersOf(page))).toEqual(
			Array.from({ length: 7 }, (_, index) => shortWeekdayOf(at(mondayOffset() + index, 12, 0)))
		);
		await expect(
			page.getByRole('button', {
				name: monthCellLabelOf(today, daySecondsOf(state, fixture.ids.employee, 0)),
				exact: true
			})
		).toBeVisible();
		await expect(
			page.getByRole('button', {
				name: monthCellLabelOf(at(weekDayB(), 12, 0), daySecondsOf(state, fixture.ids.employee, weekDayB())),
				exact: true
			})
		).toBeVisible();
		// today holds the mock's fixture plan and no time, so the cell prints its reach
		const reach = copy(CAL.REACH, {
			percent: percentOfTracked(0, PLAN_EXPECTED_SECONDS),
			expected: hoursLabelOf(PLAN_EXPECTED_SECONDS)
		});
		measure('today cell reach', reach);
		// the reach line sits inside one cell, so the assertion counts the cells that hold it (`toContainText` on the
		// 42 cells of the month grid is a strict-mode violation)
		await expect(gridOf(page).getByRole('gridcell').filter({ hasText: reach })).toHaveCount(1);
		// `countedDaysOf` (`calendar-view.ts:572-577`): the month total counts the anchor's own month only
		await expect(metaLineOf(page)).toHaveText(
			`${monthTitleOf(today)} · ${copy(CAL.TRACKED_TOTAL, {
				total: durationOf(monthCountedSecondsOf(state, fixture.ids.employee))
			})}`
		);
		expect(await storageOf(page)).toEqual({ view: null, settings: null });

		/* the week: 7 columns carrying `data-calendar-day` */
		await weekView(page);
		expect(await columnKeysOf(page)).toEqual(
			Array.from({ length: 7 }, (_, index) => localDayKeyOf(at(mondayOffset() + index, 12, 0)))
		);
		expect(await storageOf(page)).toEqual({ view: JSON.stringify('week'), settings: null });

		/* the day: one column, the anchor's own day, its name as the range heading */
		await dayView(page);
		expect(await columnKeysOf(page)).toEqual([localDayKeyOf(today)]);
		await expect(rangeHeadingOf(page).first()).toHaveText(shortDayLabelOf(today));
		await expect(metaLineOf(page)).toHaveText(
			`${shortDayLabelOf(today)} · ${copy(CAL.TRACKED_TOTAL, { total: durationOf(0) })}`
		);
		expect(await storageOf(page)).toEqual({ view: JSON.stringify('day'), settings: null });

		/* the view is stored: after a reload the same tab is selected again (`use-calendar-page.ts:159`) */
		await page.reload({ waitUntil: 'domcontentloaded' });
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await expect(viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.DAY, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);
		await expect.poll(() => columnsOf(page).count(), { timeout: 40_000 }).toBe(1);

		await monthView(page);
		expect(await storageOf(page)).toEqual({ view: JSON.stringify('month'), settings: null });
		measure('reads across the three views', api.reads(LOGS_PATH).length);
	});

	test('3 · the range stepper: the label each step shows, the read each step sends, and a range already read', async ({
		page,
		fixture
	}) => {
		test.setTimeout(180_000);
		const api = await serveCalendarApi(page, servedFor(fixture));
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await weekView(page);

		const weekStart = mondayOffset();
		const current = periodTextOf(at(weekStart, 12, 0), at(weekStart + 6, 12, 0));
		await expect(rangeHeadingOf(page).first()).toHaveText(current);
		await expect.poll(() => api.reads(LOGS_PATH).length, { timeout: 40_000 }).toBeGreaterThan(0);
		const openedReads = weekReadsOf(api, weekStart);
		expect(openedReads.length).toBeGreaterThan(0);
		measure('opened week read', openedReads[0].params);

		/* one step back: the heading names the previous week, and the read carries that week's widened bounds */
		await rangeGroupOf(page)
			.getByRole('button', { name: PREVIOUS('week'), exact: true })
			.click({ timeout: 15_000 });
		const previous = periodTextOf(at(weekStart - 7, 12, 0), at(weekStart - 1, 12, 0));
		await expect(rangeHeadingOf(page).first()).toHaveText(previous);
		await expect.poll(() => weekReadsOf(api, weekStart - 7).length, { timeout: 40_000 }).toBeGreaterThan(0);
		const previousRead = weekReadsOf(api, weekStart - 7)[0];
		measure('previous week read', { heading: previous, params: previousRead.params });
		expect(previousRead.params['startDate']).toBe(startOfDayIsoOf(weekStart - 8));
		expect(previousRead.params['endDate']).toBe(endOfDayIsoOf(weekStart));
		expect(previousRead.params['employeeIds[0]']).toBe(fixture.ids.employee);

		/* one step forward walks back onto the week the stepper came from; it does not jump past it (measured
		   `s3-lane-a-calendar-2.log`: the heading after this click is `Nov 23 – 29`, the week the page opened on). */
		await rangeGroupOf(page)
			.getByRole('button', { name: NEXT('week'), exact: true })
			.click({ timeout: 15_000 });
		await expect(rangeHeadingOf(page).first()).toHaveText(current);
		const readsOnReturn = api.reads(LOGS_PATH).length;
		// a quiet window proves only that nothing arrived: this page's read is fresh for three minutes
		// (`STALE_TIME = 1000 * 60 * 3`, `use-calendar-logs.ts:13`, used as `staleTime` at `:117`), so the range the page
		// opened with is answered from the cache and landing back on it costs no request
		await page.waitForTimeout(1_500);
		measure('reads after stepping back onto the opened week', {
			before: readsOnReturn,
			after: api.reads(LOGS_PATH).length
		});
		expect(api.reads(LOGS_PATH).length).toBe(readsOnReturn);

		/* two weeks forward: each is a range this run has not read, so each costs a read carrying its own bounds */
		for (const step of [1, 2]) {
			await rangeGroupOf(page)
				.getByRole('button', { name: NEXT('week'), exact: true })
				.click({ timeout: 15_000 });
			const start = weekStart + 7 * step;
			await expect(rangeHeadingOf(page).first()).toHaveText(periodTextOf(at(start, 12, 0), at(start + 6, 12, 0)));
			await expect.poll(() => weekReadsOf(api, start).length, { timeout: 40_000 }).toBeGreaterThan(0);
			measure(`week +${step} read`, weekReadsOf(api, start)[0].params);
			expect(weekReadsOf(api, start)[0].params['startDate']).toBe(startOfDayIsoOf(start - 1));
			expect(weekReadsOf(api, start)[0].params['endDate']).toBe(endOfDayIsoOf(start + 7));
		}

		/* and back over both weeks: neither step asks the server again, so the total stands still */
		const readsLeaving = api.reads(LOGS_PATH).length;
		for (const start of [weekStart + 7, weekStart]) {
			await rangeGroupOf(page)
				.getByRole('button', { name: PREVIOUS('week'), exact: true })
				.click({ timeout: 15_000 });
			await expect(rangeHeadingOf(page).first()).toHaveText(periodTextOf(at(start, 12, 0), at(start + 6, 12, 0)));
		}
		// again a quiet window, proving only that nothing arrived
		await page.waitForTimeout(1_500);
		measure('reads after walking back over ranges already read', {
			before: readsLeaving,
			after: api.reads(LOGS_PATH).length
		});
		expect(api.reads(LOGS_PATH).length).toBe(readsLeaving);

		/* `Today` names the week the run runs in, whatever day that run happens on */
		await rangeGroupOf(page).getByRole('button', { name: C.TODAY, exact: true }).click({ timeout: 15_000 });
		await expect(rangeHeadingOf(page).first()).toHaveText(current);
		expect(await metaLineOf(page).textContent()).toContain(
			periodTextOf(at(weekStart, 12, 0), at(weekStart + 6, 12, 0))
		);
	});

	test('4 · an entry under a click: the details the block opens, and the dialog its Edit button opens', async ({
		page,
		fixture
	}) => {
		test.setTimeout(240_000);
		await serveCalendarApi(page, servedFor(fixture));
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await weekView(page);

		const startedAt = at(weekDayB(), 10, 0);
		const stoppedAt = at(weekDayB(), 12, 0);
		await entryOf(page, fixture.names.task).click({ timeout: 15_000 });
		await expect.poll(() => popoverOf(page).count(), { timeout: 40_000 }).toBe(1);

		/* `calendar-entry-details.tsx:37-81`: title, project, `{dayDate} · {start} – {end}`, duration, kind, billable, reason */
		const details = await textOf(popoverOf(page));
		measure('entry popover', details);
		for (const piece of [
			fixture.names.task,
			'Fixture Project',
			`${dayDateOf(stoppedAt)} · ${rangeTextOf(startedAt, stoppedAt)}`,
			durationOf(7200),
			CAL.LEGEND.MANUAL,
			CAL.BILLABLE,
			'Suite reason'
		]) {
			expect(details).toContain(piece);
		}
		expect(await textsOf(popoverOf(page).getByRole('button'))).toEqual([LABELS.PICK_LABELS, C.EDIT, C.DELETE]);

		/* the popover's Edit is the Timesheets Time log dialog, prefilled with this entry's times. The entry popover
		   stays open behind it (`s3-lane-a-calendar-probe-11.log` read its node there), so this dialog is followed by
		   the title it prints instead of by counting layers. */
		await popoverOf(page).getByRole('button', { name: C.EDIT, exact: true }).click({ timeout: 15_000 });
		const editDialog = dialogShowing(page, C.TIME_LOG);
		await expect.poll(() => editDialog.count(), { timeout: 90_000 }).toBe(1);
		const editText = await textOf(editDialog);
		measure('popover Edit opened', editText.slice(0, 220));
		expect(editText).toContain(C.TIME_LOG);
		expect(editText).toContain(fixture.names.task);
		expect(editText).toContain(fixture.names.user);
		// the `TimeField`s carry `aria-label=manualTime.START_TIME` / `END_TIME` (`edit-task-modal.tsx:343-349`,
		// `:357-364`); the value shape pinned here is the one the lane-b spec pins on the same field
		// (`member-timesheet-report-ui.spec.ts:1936-1937` with `timeInputOf` `:453`)
		await expect(editDialog.locator(`input[aria-label="${TIME_FIELDS.START_TIME}"]`)).toHaveValue(
			clockOf(startedAt)
		);
		await expect(editDialog.locator(`input[aria-label="${TIME_FIELDS.END_TIME}"]`)).toHaveValue(clockOf(stoppedAt));
		/* the popover is still open at the instant the Edit click lands (`s3-lane-a-calendar-probe-11.log` read its node
		   then); once the dialog has rendered and its fields have been read its own panel had closed the popover, so the
		   measured count here is 0 (`s3-lane-a-calendar-2.log`: expected 1, received 0). */
		expect(await popoverOf(page).count()).toBe(0);
		await clickDialogButton(page, C.CANCEL, editDialog);
		await expect.poll(() => editDialog.count(), { timeout: 40_000 }).toBe(0);
	});

	test('5 · the context menu on an entry and on empty time: the items, and what each one opens', async ({
		page,
		fixture
	}) => {
		test.setTimeout(300_000);
		const api = await serveCalendarApi(page, servedFor(fixture));
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await weekView(page);

		await rightClickEntry(page, fixture.names.task);
		const items = await textsOf(menuOf(page).getByRole('menuitem'));
		measure('menu items on an entry', items);
		expect(items).toEqual([C.EDIT, ACTIONS.DUPLICATE, CAL.MENU.SPLIT, C.DELETE]);
		// `MENU.STOP` is offered for a running entry of the shown member only (`calendar-context-menu.tsx:64-96`)
		expect(items).not.toContain(CAL.MENU.STOP);

		/* Edit → the Time log dialog with this entry's times */
		await menuOf(page).getByRole('menuitem', { name: C.EDIT, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => dialogOf(page).count(), { timeout: 90_000 }).toBe(1);
		expect(await textOf(dialogOf(page))).toContain(C.TIME_LOG);
		await clickDialogButton(page, C.CANCEL);
		await expect.poll(() => dialogOf(page).count(), { timeout: 40_000 }).toBe(0);

		/* Duplicate → the Add time dialog holding the same task, member and project */
		await rightClickEntry(page, fixture.names.task);
		await menuOf(page).getByRole('menuitem', { name: ACTIONS.DUPLICATE, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => dialogOf(page).count(), { timeout: 90_000 }).toBe(1);
		const duplicateText = await textOf(dialogOf(page));
		measure('Duplicate dialog', duplicateText.slice(0, 220));
		expect(duplicateText).toContain(C.ADD_TIME_ENTRY);
		expect(duplicateText).toContain(fixture.names.task);
		expect(duplicateText).toContain(fixture.names.user);
		expect(duplicateText).toContain('Fixture Project');
		await clickDialogButton(page, C.CANCEL);
		await expect.poll(() => dialogOf(page).count(), { timeout: 40_000 }).toBe(0);

		/* Delete → the confirmation copy; cancelling it sends nothing and leaves the entry */
		await rightClickEntry(page, fixture.names.task);
		await menuOf(page).getByRole('menuitem', { name: C.DELETE, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => dialogOf(page).count(), { timeout: 90_000 }).toBe(1);
		const deleteText = await textOf(dialogOf(page));
		measure('Delete dialog', deleteText);
		expect(deleteText).toContain(C.DELETE_CONFIRMATION);
		expect(deleteText).toContain(C.IRREVERSIBLE_ACTION_WARNING);
		expect(await textsOf(dialogOf(page).getByRole('button'))).toEqual([C.CANCEL, C.DELETE]);
		await clickDialogButton(page, C.CANCEL);
		await expect.poll(() => dialogOf(page).count(), { timeout: 40_000 }).toBe(0);
		expect(await entryLabels(page)).toContain(
			entryLabelOf(fixture.names.task, at(weekDayB(), 10, 0), at(weekDayB(), 12, 0), 7200)
		);
		// three opened dialogs, no write: every one of them was cancelled
		expect(api.writes()).toEqual([]);

		/* the same right click on empty time offers Add time here, on the slot under the pointer */
		const box = await entryOf(page, fixture.names.task).boundingBox();
		if (!box) throw new Error('no entry box to click beside');
		await page.mouse.click(box.x + box.width / 2, box.y + box.height + 6, { button: 'right' });
		await expect(menuOf(page)).toBeVisible({ timeout: 15_000 });
		const slotItems = await textsOf(menuOf(page).getByRole('menuitem'));
		measure('menu items on empty time', slotItems);
		expect(slotItems).toEqual([CAL.MENU.ADD_TIME_HERE]);
		await page.keyboard.press('Escape');
		await expect.poll(() => menuOf(page).count(), { timeout: 20_000 }).toBe(0);
		expect(api.writes()).toEqual([]);
	});

	test('6 · moving an entry by dragging it: the ghost, the write it sends, the entry after, and the step the settings hold', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(480_000);
		const day = dragDayOffset();
		const state = dragServedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await showWeekOf(page, day);

		const title = fixture.names.task;
		const startedAt = at(day, 10, 0);
		const stoppedAt = at(day, 12, 0);
		const original = entryLabelOf(title, startedAt, stoppedAt, 7200);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);

		const box = await blockGeometry(page, title, 120);
		measure('draggable block geometry', box);
		// the default grid: 48 px per hour (`calendar-grid-settings.ts:31-35`), so 1 px is 1.25 minutes
		expect(box.styleHeight).toBe('96px');
		expect(box.pxPerHour).toBe(48);
		expect(box.columnKey).toBe(localDayKeyOf(startedAt));
		expect(box.opacity).toBe('1');

		/* a drag onto another entry of the same member is refused before anything is sent: four grid hours down puts
		   this 10:00–12:00 entry on the 14:00–15:00 one (`dragRefusalOf` → 'overlap', `calendar-drag.ts:320-338`).
		   Five hours down would only *touch* that entry's end, and `overlapsAnyWindow` needs
		   `other.end > window.start` (`calendar-drag.ts:280-285`), so a landing exactly next to it is a free place —
		   measured in `s3-lane-a-calendar-probe-6.log`, where a five-hour move saved with one `PUT` and no toast. */
		const overlap = await dragTo(
			page,
			{ x: box.centerX, y: box.centerY },
			{ x: box.centerX, y: box.centerY + 4 * box.pxPerHour }
		);
		measure('overlap drag', overlap);
		// the block being dragged dims to `opacity-40` (`calendar-time-grid.tsx:233`) and the ghost box is the page's own
		expect(overlap.dragged).toBe('0.4');
		expect(overlap.held).toHaveLength(1);
		expect(overlap.held[0].text).toContain(durationOf(7200));
		expect(overlap.held[0].text).toContain(title);
		expect(overlap.released[0].text).toContain(rangeTextOf(at(day, 14, 0), at(day, 16, 0)));
		await toastSays(page, 'overlap drag', CAL.DRAG.REFUSED_TITLE, CAL.DRAG.OVERLAP);
		// a quiet window proves only that nothing arrived: `dragRefusalOf` (`calendar-drag.ts:320-338`) refuses client side
		const seenAfterOverlap = api.writes().length;
		await page.waitForTimeout(1_500);
		expect(api.writes().length).toBe(seenAfterOverlap);
		expect(api.writes()).toEqual([]);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);

		/* a move that saves: 48 px = 60 minutes, the lookup of taken time first, then the PUT of the new window */
		const moved = await dragTo(page, { x: box.centerX, y: box.centerY }, { x: box.centerX, y: box.centerY + 48 });
		measure('saved move', moved);
		expect(moved.released[0].text).toContain(rangeTextOf(at(day, 11, 0), at(day, 13, 0)));
		await waitForWrites(api, 0);
		measure('move writes', writesOf(api));
		expect(api.reads(CONFLICT_PATH).length).toBeGreaterThanOrEqual(1);
		expect(lastBodyOf(api, 'PUT')).toMatchObject({
			startedAt: at(day, 11, 0).toISOString(),
			stoppedAt: at(day, 13, 0).toISOString(),
			employeeId: fixture.ids.employee,
			organizationId: fixture.ids.organizationA
		});
		const movedLabel = entryLabelOf(title, at(day, 11, 0), at(day, 13, 0), 7200);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(movedLabel);
		expect(servedWindowOf(state, DRAG_MANUAL_ID)).toBe(
			`${at(day, 11, 0).toISOString()} ${at(day, 13, 0).toISOString()}`
		);
		expect(consoleFindings(shield)).toEqual([]);

		/* a drag that comes back to the place it started from changes nothing (`isSameWindow`, `use-calendar-grid-drag.ts:345-348`) */
		const heldBox = await blockGeometry(page, title, 120);
		await page.mouse.move(heldBox.centerX, heldBox.centerY);
		await page.mouse.down();
		await page.mouse.move(heldBox.centerX, heldBox.centerY + 12, { steps: 4 });
		const away = await ghostOf(page);
		await page.mouse.move(heldBox.centerX, heldBox.centerY, { steps: 10 });
		const back = await ghostOf(page);
		await page.mouse.up();
		measure('same-place drag', { away, back });
		expect(back[0]?.text).toContain(rangeTextOf(at(day, 11, 0), at(day, 13, 0)));
		const seenAfterHeld = api.writes().length;
		// again: a quiet window proves only that the page sent nothing
		await page.waitForTimeout(1_500);
		expect(api.writes().length).toBe(seenAfterHeld);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(movedLabel);

		/* the step a drag lands on is the reader's setting, not a quarter hour — finding 5, `[MEASURED, NOT INTENDED]` */
		api.state.logs = dragServedFor(fixture, { onlyMovable: true }).logs;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await showWeekOf(page, day);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);
		await openSettingsMenu(page);
		await pickSetting(page, CAL.SETTINGS.SNAP, /^30 minutes$/);
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"snapMinutes":30');
		await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);

		const snappedFrom = await blockGeometry(page, title, 120);
		const snappedWrites = api.writes().length;
		// 16 px = 20 minutes; with the setting on 30 minutes the start lands on the half hour, not on 10:20
		await dragTo(
			page,
			{ x: snappedFrom.centerX, y: snappedFrom.centerY },
			{ x: snappedFrom.centerX, y: snappedFrom.centerY + 16 }
		);
		await waitForWrites(api, snappedWrites);
		measure('snap 30 move', lastBodyOf(api, 'PUT'));
		expect(lastBodyOf(api, 'PUT')).toMatchObject({
			startedAt: at(day, 10, 30).toISOString(),
			stoppedAt: at(day, 12, 30).toISOString()
		});
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(entryLabelOf(title, at(day, 10, 30), at(day, 12, 30), 7200));

		/* the same drag with the setting on 15 minutes lands a quarter hour later instead */
		api.state.logs = dragServedFor(fixture, { onlyMovable: true }).logs;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await showWeekOf(page, day);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);
		await openSettingsMenu(page);
		await pickSetting(page, CAL.SETTINGS.SNAP, /^15 minutes$/);
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"snapMinutes":15');
		await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);

		const quarterFrom = await blockGeometry(page, title, 120);
		const quarterWrites = api.writes().length;
		await dragTo(
			page,
			{ x: quarterFrom.centerX, y: quarterFrom.centerY },
			{ x: quarterFrom.centerX, y: quarterFrom.centerY + 16 }
		);
		await waitForWrites(api, quarterWrites);
		measure('snap 15 move', lastBodyOf(api, 'PUT'));
		/* the same 16 px drag lands differently with this setting: `movedWindowOf` snaps the *start* of the moved window
		   (`calendar-drag.ts:229-247` → `targetMinute = snappedMinuteOf(startMinute + minuteShift, step)`), and
		   `snappedMinuteOf` takes the nearest multiple (`calendar-drag.ts:64-68`). A 10:00 start plus 20 minutes is
		   620, whose nearest quarter hour is 615 — 10:15, measured `s3-lane-a-calendar-2.log`
		   (`"startedAt": "2026-11-26T09:15:00.000Z"`); the 30 minute setting above rounded the same 620 up to 630. */
		expect(lastBodyOf(api, 'PUT')).toMatchObject({
			startedAt: at(day, 10, 15).toISOString(),
			stoppedAt: at(day, 12, 15).toISOString()
		});
		const quartered = entryLabelOf(title, at(day, 10, 15), at(day, 12, 15), 7200);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(quartered);

		/* a drag shorter than half the step changes nothing: 5 px is 6.25 minutes, and 10:15 + 6.25 is still nearest to
		   10:15, so the snapped window is the entry's own (`isSameWindow`, `use-calendar-grid-drag.ts:345-348`) */
		const nudged = await blockGeometry(page, title, 120);
		const nudgedWrites = api.writes().length;
		await page.mouse.move(nudged.centerX, nudged.centerY);
		await page.mouse.down();
		await page.mouse.move(nudged.centerX, nudged.centerY + 5, { steps: 3 });
		const nudgeGhost = await ghostOf(page);
		await page.mouse.up();
		measure('5 px nudge', nudgeGhost);
		await page.waitForTimeout(1_500);
		expect(api.writes().length).toBe(nudgedWrites);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(quartered);

		/* a move into the neighbouring column keeps the wall time (the drag is horizontal, so `minuteShift` is 0 and the
		   10:15 the entry sits on now is snapped to itself) and changes the day it belongs to */
		const neighbourFrom = await blockGeometry(page, title, 120);
		const neighbourWrites = api.writes().length;
		const columnWidth = neighbourFrom.columnRight - neighbourFrom.columnX;
		await dragTo(
			page,
			{ x: neighbourFrom.centerX, y: neighbourFrom.centerY },
			{ x: neighbourFrom.columnX - columnWidth / 2, y: neighbourFrom.centerY }
		);
		await waitForWrites(api, neighbourWrites);
		measure('neighbour column move', lastBodyOf(api, 'PUT'));
		expect(lastBodyOf(api, 'PUT')).toMatchObject({
			startedAt: at(day - 1, 10, 15).toISOString(),
			stoppedAt: at(day - 1, 12, 15).toISOString()
		});
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(entryLabelOf(title, at(day - 1, 10, 15), at(day - 1, 12, 15), 7200));
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('7 · a move the server refuses: what the page says, and that the entry is back where it was', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(300_000);
		const day = dragDayOffset();
		const state = dragServedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await showWeekOf(page, day);

		const title = fixture.names.task;
		const original = entryLabelOf(title, at(day, 10, 0), at(day, 12, 0), 7200);
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);

		// arm the refusal on the very path this move takes, before the drag
		const loggedPath = LOGGED_PATH_OF(DRAG_MANUAL_ID);
		state.refusals[`PUT ${LOGS_PATH}/${DRAG_MANUAL_ID}`] = 403;

		const box = await blockGeometry(page, title, 120);
		await dragTo(page, { x: box.centerX, y: box.centerY }, { x: box.centerX, y: box.centerY + 48 });
		await waitForWrites(api, 0);
		measure('refused move writes', writesOf(api));
		expect(lastBodyOf(api, 'PUT')).toMatchObject({
			startedAt: at(day, 11, 0).toISOString(),
			stoppedAt: at(day, 13, 0).toISOString()
		});
		// `toast.error(DRAG.SAVE_FAILED, { description: t(writeErrorKeyOf(error)) })` (`use-calendar-entry-moves.ts:150`)
		await toastSays(page, 'refused move', CAL.DRAG.SAVE_FAILED, T.SHEET.EDIT.REFUSED);

		// the refused write is followed by a re-read, so the entry is back where it was
		await expect.poll(() => entryLabels(page), { timeout: 40_000 }).toContain(original);
		expect(servedWindowOf(state, DRAG_MANUAL_ID)).toBe(
			`${at(day, 10, 0).toISOString()} ${at(day, 12, 0).toISOString()}`
		);
		measure('armed 403 console lines', armedFailureLines(shield, loggedPath, 403));
		expect(armedFailureLines(shield, loggedPath, 403).length).toBeGreaterThan(0);
		expect(consoleFindingsWithout(shield, loggedPath, 403)).toEqual([]);
	});

	test('8 · splitting an entry the API splits: the dialog, the one write, the two entries after', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(420_000);
		const day = dragDayOffset();
		const state = splitServedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await showWeekOf(page, day);

		const title = fixture.names.task;
		const startedAt = at(day, 10, 0);
		const stoppedAt = at(day, 12, 0);
		const middle = at(day, 11, 0);
		await openSplitOn(page, title);

		/* the dialog: the entry it was opened on, and the two parts it is about to make */
		const opened = await textOf(dialogOf(page));
		measure('split dialog', opened);
		expect(opened).toContain(CAL.SPLIT.TITLE);
		expect(opened).toContain(
			`${title} · ${dayDateOf(stoppedAt)} · ${rangeTextOf(startedAt, stoppedAt)} · ${durationOf(7200)}`
		);
		expect(opened).toContain(CAL.SPLIT.TIME_LABEL);
		expect(await splitPartsOf(page)).toEqual([
			`${CAL.SPLIT.FIRST_PART}${rangeTextOf(startedAt, middle)}${durationOf(3600)}${title}`,
			`${CAL.SPLIT.SECOND_PART}${rangeTextOf(middle, stoppedAt)}${durationOf(3600)}${title}`
		]);
		// the field's own value: the middle of the entry, on a whole minute (`defaultSplitTimeOf`, `calendar-split.ts:119-137`)
		const fieldValues = await page
			.locator('[role=dialog] input[type=text]')
			.evaluateAll((nodes: Element[]) => nodes.map((node) => (node as HTMLInputElement).value));
		measure('split at field', fieldValues);
		expect(fieldValues).toContain(clockOf(middle));

		/* `use-calendar-menu.ts:87-91` asks the route once, with a body its validation must refuse */
		const probeCalls = api.callsTo(SPLIT_PATH_OF(DRAG_MANUAL_ID));
		measure(
			'split support probe',
			probeCalls.map((call) => `${call.method} ${call.path} ${JSON.stringify(call.body)}`)
		);
		expect(probeCalls.length).toBeGreaterThanOrEqual(1);
		expect(probeCalls[0].body ?? {}).not.toHaveProperty('splitAt');

		const writesBefore = api.writes().length;
		await saveSplit(page);
		await toastSays(page, 'split through the API', CAL.SPLIT.SAVED);
		await waitForWrites(api, writesBefore);
		measure('split writes', writesOf(api));
		const sent = api.callsTo(SPLIT_PATH_OF(DRAG_MANUAL_ID)).at(-1);
		expect(sent?.method).toBe('POST');
		expect(sent?.body).toMatchObject({ splitAt: middle.toISOString() });
		// one write did it: no shortening PUT and no second entry POST
		expect(api.writes().filter((write) => write.method === 'PUT')).toEqual([]);
		expect(api.writes().filter((write) => write.method === 'POST' && write.path === LOGS_PATH)).toEqual([]);
		expect(await entryLabels(page)).toEqual(
			expect.arrayContaining([
				entryLabelOf(title, startedAt, middle, 3600),
				entryLabelOf(title, middle, stoppedAt, 3600)
			])
		);
		/* the support probe is the one call this file arms on purpose: `use-calendar-menu.ts:84-91` posts an empty body
		   to ask whether the API splits, and this stub answers 400 (`serveCalendarApi`), which the HttpClient logs
		   (`s3-lane-a-calendar-1.log`: `HTTP Error: POST /timesheet/time-log/own-manual/split 400`), so that line is
		   excused by naming the path and the status, exactly as a refused write is excused */
		expect(consoleFindingsWithout(shield, LOGGED_SPLIT_OF(DRAG_MANUAL_ID), 400)).toEqual([]);

		/* tracked time, same offered route: split in one write, no refusal shown — finding 4 */
		const trackedTitle = 'Suite tracked task';
		const trackedFrom = at(day, 13, 30);
		await closeLayers(page);
		await openSplitOn(page, trackedTitle);
		const trackedText = await textOf(dialogOf(page));
		measure('tracked split dialog', trackedText);
		expect(trackedText).toContain(CAL.SPLIT.TITLE);
		expect(trackedText).not.toContain(CAL.SPLIT.REFUSED_TITLE);
		// each tracked part must stay whole on a 10-minute slot (`calendar-split.ts:13,119-137`)
		expect(trackedText).toContain(CAL.SPLIT.SLOT_STEP);
		const trackedWrites = api.writes().length;
		await saveSplit(page);
		await toastSays(page, 'tracked split through the API', CAL.SPLIT.SAVED);
		await waitForWrites(api, trackedWrites);
		const trackedSent = api.callsTo(SPLIT_PATH_OF(SPLIT_TRACKED_ID)).at(-1);
		measure(
			'tracked split write',
			`${trackedSent?.method} ${trackedSent?.path} ${JSON.stringify(trackedSent?.body)}`
		);
		expect(trackedSent?.method).toBe('POST');
		// and it is the only call that path ever got: the support answer is checked once per session
		// (`use-time-log-split-support.ts:18-19` `SPLIT_SUPPORT_KEY`, `staleTime: Infinity` at `:43`), so this dialog
		// reused the manual entry's probe instead of posting its own
		expect(api.callsTo(SPLIT_PATH_OF(SPLIT_TRACKED_ID))).toHaveLength(1);
		const splitAt = String(trackedSent?.body?.splitAt ?? '');
		// the mark it landed on is a whole 10-minute mark of the entry's own day
		expect([at(day, 14, 10).toISOString(), at(day, 14, 20).toISOString()]).toContain(splitAt);
		expect(api.writes().filter((write) => write.method === 'PUT')).toEqual([]);
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(
				entryLabelOf(
					trackedTitle,
					trackedFrom,
					new Date(splitAt),
					Math.round((new Date(splitAt).getTime() - trackedFrom.getTime()) / 1000)
				)
			);
	});

	test('9 · splitting an entry the API cannot split: the re-read, the two writes, and tracked time refused', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(420_000);
		const day = dragDayOffset();
		const state = splitServedFor(fixture);
		state.splitMode = 'missing';
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await showWeekOf(page, day);

		const title = fixture.names.task;
		const startedAt = at(day, 10, 0);
		const middle = at(day, 11, 0);
		const stoppedAt = at(day, 12, 0);
		await openSplitOn(page, title);
		expect(await textOf(dialogOf(page))).toContain(CAL.SPLIT.TITLE);

		const readsBefore = api.reads().length;
		const writesBefore = api.writes().length;
		await saveSplit(page);
		await toastSays(page, 'two-write split', CAL.SPLIT.SAVED);
		await waitForWrites(api, writesBefore);
		expect(api.reads().length).toBeGreaterThan(readsBefore);

		/* the order the two writes have to keep (`use-calendar-entry-split.ts:174-179`): shorten first, then add the rest */
		const made = api.writes().slice(writesBefore);
		measure(
			'two-write split',
			made.map((write) => `${write.method} ${write.path} ${JSON.stringify(write.body)}`)
		);
		expect(made.map((write) => `${write.method} ${write.path}`)).toEqual([
			`PUT ${LOGS_PATH}/${DRAG_MANUAL_ID}`,
			`POST ${LOGS_PATH}`
		]);
		expect(made[0].body).toMatchObject({
			startedAt: startedAt.toISOString(),
			stoppedAt: middle.toISOString(),
			employeeId: fixture.ids.employee
		});
		expect(made[1].body).toMatchObject({
			startedAt: middle.toISOString(),
			stoppedAt: stoppedAt.toISOString(),
			employeeId: fixture.ids.employee,
			taskId: fixture.ids.task,
			projectId: fixture.ids.project,
			isBillable: true,
			logType: 'MANUAL',
			source: 'BROWSER'
		});
		expect(servedWindowOf(state, DRAG_MANUAL_ID)).toBe(`${startedAt.toISOString()} ${middle.toISOString()}`);

		const labels = await entryLabels(page);
		measure('entries after the two-write split', labels);
		expect(labels).toContain(entryLabelOf(title, startedAt, middle, 3600));
		// the second block prints `No task`: this file's stub answers the created log with the body it was given
		// (`taskId` is in it), without the `task` relation the read would carry — a gap in the served data, not the page
		expect(labels.join('\n')).toContain(`${T.NO_TASK}, ${rangeTextOf(middle, stoppedAt)}, ${durationOf(3600)}`);

		/* tracked time with no split route really is refused, with the page's own words */
		await closeLayers(page);
		await openSplitOn(page, 'Suite tracked task');
		const refused = await textOf(dialogOf(page));
		measure('tracked split refused', refused);
		expect(refused).toContain(CAL.SPLIT.REFUSED_TITLE);
		expect(refused).toContain(CAL.SPLIT.REFUSED.TRACKED);
		const buttons = await textsOf(dialogOf(page).getByRole('button'));
		expect(buttons).toContain(C.CLOSE);
		expect(buttons).not.toContain(CAL.SPLIT.ACTION);
		const refusedWrites = api.writes().length;
		await clickDialogButton(page, C.CLOSE);
		await expect.poll(() => dialogOf(page).count(), { timeout: 30_000 }).toBe(0);
		// the refusal is decided before any write: the only call on that entry is the support probe
		expect(api.writes().slice(refusedWrites)).toEqual([]);
		/* exactly one support probe ran on this page, the manual entry's, and the tracked refusal is decided from its
		   answer: `SPLIT_SUPPORT_KEY` is a session-wide key (`use-time-log-split-support.ts:18-19` "One check per API
		   for the whole session", `staleTime: Infinity` at `:43`), so the tracked dialog reuses the 'unsupported'
		   answer instead of asking again. The armed 404 of the manual probe is the only refusal this test armed, and
		   the HttpClient logs it (`logger-adapter.service.ts:225-232`, 400-499 → ERROR → `console: true` at `:20`). */
		expect(api.callsTo(SPLIT_PATH_OF(SPLIT_TRACKED_ID))).toEqual([]);
		measure('split probe console lines', shield.consoleErrors());
		expect(armedFailureLines(shield, LOGGED_SPLIT_OF(DRAG_MANUAL_ID), 404).length).toBeGreaterThan(0);
		expect(consoleFindingsWithout(shield, LOGGED_SPLIT_OF(DRAG_MANUAL_ID), 404)).toEqual([]);
	});

	test('10 · a split refused on screen: no slot to split on, and a refused shortening that leaves the entry whole', async ({
		page,
		fixture,
		shield
	}) => {
		test.setTimeout(420_000);
		const day = dragDayOffset();
		const state = splitServedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await showWeekOf(page, day);

		/* an 8-minute tracked entry holds no whole 10-minute mark, and the copy it is given says "too short" — finding 6, measured and untagged */
		const shortFrom = at(day, 9, 1);
		const shortTo = at(day, 9, 9);
		await openSplitOn(page, 'Suite short task');
		const refused = await textOf(dialogOf(page));
		measure('no-slot split refused', refused);
		expect(refused).toContain(CAL.SPLIT.REFUSED_TITLE);
		expect(refused).toContain(CAL.SPLIT.REFUSED.TOO_SHORT);
		expect(refused).not.toContain(CAL.SPLIT.ACTION);
		await clickDialogButton(page, C.CLOSE);
		await expect.poll(() => dialogOf(page).count(), { timeout: 30_000 }).toBe(0);
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(entryLabelOf('Suite short task', shortFrom, shortTo, 480));

		/* The API has no split route here, and the first of the two writes is refused. The page asks once per session
		   whether the API splits (`use-time-log-split-support.ts:18-19` "One check per API for the whole session",
		   `staleTime: Infinity` at `:43`), and the dialog above cached the 'supported' answer, so flipping
		   `splitMode` under that page would not change what it does — the half below opens a fresh page, where the probe
		   runs again and this time answers 404, which is the state the two-write path needs. */
		state.splitMode = 'missing';
		const loggedPath = LOGGED_PATH_OF(DRAG_MANUAL_ID);
		state.refusals[`PUT ${LOGS_PATH}/${DRAG_MANUAL_ID}`] = 500;
		await page.reload({ waitUntil: 'domcontentloaded' });
		await showWeekOf(page, day);
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(entryLabelOf('Suite short task', shortFrom, shortTo, 480));
		await openSplitOn(page, fixture.names.task);
		const writesBefore = api.writes().length;
		await clickDialogButton(page, CAL.SPLIT.ACTION);
		// the dialog keeps the form and adds its own notice instead of closing (`calendar-split-dialog.tsx:200-218`)
		await expect
			.poll(async () => await textOf(dialogOf(page)), { timeout: 60_000 })
			.toContain(CAL.SPLIT.FAILED_RESTORED);
		const notice = await textOf(dialogOf(page));
		measure('refused shortening', notice);
		expect(notice).toContain(CAL.SPLIT.TITLE);
		expect(notice).toContain(CAL.SPLIT.FAILED_RESTORED);
		/* three armed calls ran before this point, each logged by the HttpClient: the support probe of the 8-minute
		   tracked entry (offered route, empty body → 400), the probe of the manual entry after `splitMode = 'missing'`
		   (404), and the armed 500 on its shortening PUT. Naming each pair is what excuses them; nothing else may show. */
		const armed: [string, number][] = [
			[LOGGED_SPLIT_OF(SPLIT_SHORT_ID), 400],
			[LOGGED_SPLIT_OF(DRAG_MANUAL_ID), 404],
			[loggedPath, 500]
		];
		expect(consoleFindingsWithoutAll(shield, armed)).toEqual([]);
		measure('refused shortening console lines', shield.consoleErrors());

		await waitForWrites(api, writesBefore);
		const made = api.writes().slice(writesBefore);
		measure(
			'refused split writes',
			made.map((write) => `${write.method} ${write.path} ${JSON.stringify(write.body)}`)
		);
		// only the shortening was attempted; `restoreAfterFailedShortening` sent nothing after it (`:246-275`)
		expect(made.map((write) => `${write.method} ${write.path}`)).toContain(`PUT ${LOGS_PATH}/${DRAG_MANUAL_ID}`);
		expect(made.map((write) => `${write.method} ${write.path}`)).not.toContain(`POST ${LOGS_PATH}`);
		expect(servedWindowOf(state, DRAG_MANUAL_ID)).toBe(
			`${at(day, 10, 0).toISOString()} ${at(day, 12, 0).toISOString()}`
		);
		await clickDialogButton(page, C.CANCEL);
		await expect.poll(() => dialogOf(page).count(), { timeout: 30_000 }).toBe(0);
		// the entry is still the whole one the grid drew before
		await expect
			.poll(() => entryLabels(page), { timeout: 40_000 })
			.toContain(entryLabelOf(fixture.names.task, at(day, 10, 0), at(day, 12, 0), 7200));
	});

	test('11 · the grid settings menu and the time per project: what each choice changes', async ({
		page,
		fixture
	}) => {
		// this test opens the settings popover four times and re-reads the grid after every stored change, and a dev
		// build re-renders the grid each time (run 1 spent its 480 s before the legend was reached)
		test.setTimeout(720_000);
		const api = await serveCalendarApi(page, servedFor(fixture));
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await weekView(page);

		const title = fixture.names.task;
		const dayOfEntry = at(weekDayB(), 12, 0);
		const before = await blockGeometry(page, title, 120);
		measure('default grid', before);
		// the defaults: snap 15, first hour 0, last hour 24, `default` row height = 48 px per hour
		expect(before.styleTop).toBe('480px');
		expect(before.styleHeight).toBe('96px');

		await openSettingsMenu(page);
		const settingsText = await textOf(popoverOf(page));
		measure('settings popover', settingsText);
		for (const piece of [
			CAL.SETTINGS.LABEL,
			`${CAL.SETTINGS.SNAP}15 minutes`,
			`${CAL.SETTINGS.FIRST_HOUR}12:00 AM`,
			`${CAL.SETTINGS.LAST_HOUR}${CAL.SETTINGS.END_OF_DAY}`,
			CAL.SETTINGS.HOURS_HINT,
			CAL.SETTINGS.ROW_HEIGHT,
			CAL.SETTINGS.KEPT_HERE
		]) {
			expect(settingsText).toContain(piece);
		}
		// `Reset` is drawn only when the stored settings differ from the defaults (`isDefaultSettings`, `:33-41`)
		expect(await popoverOf(page).getByRole('button', { name: CAL.SETTINGS.RESET, exact: true }).count()).toBe(0);
		expect(await textsOf(popoverOf(page).getByRole('tab'))).toEqual([
			CAL.SETTINGS.ROW_COMPACT,
			CAL.SETTINGS.ROW_DEFAULT,
			CAL.SETTINGS.ROW_TALL
		]);
		await expect(popoverOf(page).getByRole('tab', { name: CAL.SETTINGS.ROW_DEFAULT, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		/* the snap choices are `SNAP_STEP_OPTIONS` in its order (`calendar-grid-settings.ts:6`) */
		await page.getByRole('combobox', { name: CAL.SETTINGS.SNAP, exact: true }).click({ timeout: 15_000 });
		await expect
			.poll(() => page.locator('[role=listbox]:visible').getByRole('option').count(), { timeout: 15_000 })
			.toBeGreaterThan(0);
		const snapOptions = await textsOf(page.locator('[role=listbox]:visible').getByRole('option'));
		measure('snap options', snapOptions);
		expect(snapOptions).toEqual(
			[1, 5, 10, 15, 30, 60].map((minutes) => copy(CAL.SETTINGS.SNAP_OPTION, { minutes }))
		);
		await page.keyboard.press('Escape');
		await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);

		/* Row height Tall grows every hour line to 72 px, and the block with it */
		await openSettingsMenu(page);
		await popoverOf(page).getByRole('tab', { name: CAL.SETTINGS.ROW_TALL, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"rowHeight":"tall"');
		const tall = await blockGeometry(page, title, 120);
		measure('tall row height', tall);
		expect(tall.styleHeight).toBe('144px');
		expect(tall.styleTop).toBe('720px');
		expect(tall.pxPerHour).toBe(72);
		const tallCellHeight = await gridOf(page)
			.getByRole('gridcell')
			.first()
			.evaluate((node: Element) => (node as HTMLElement).getBoundingClientRect().height);
		expect(tallCellHeight).toBe(1728);
		// the trigger marks itself while the settings are customised (`calendar-grid-settings-menu.tsx:108-113`)
		expect(
			await settingsTriggerOf(page).evaluate(
				(node: Element) => Array.from(node.querySelectorAll('[aria-hidden="true"]')).length
			)
		).toBeGreaterThan(0);

		/* First hour 8: the gutter starts later and the block moves up by the hours it dropped */
		await pickSetting(page, CAL.SETTINGS.FIRST_HOUR, /^08:00 AM$/);
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"firstHour":8');
		const late = await blockGeometry(page, title, 120);
		measure('first hour 8', late);
		expect(late.styleTop).toBe('144px');
		expect(late.styleHeight).toBe('144px');
		const gutter = await textOf(rowHeadersOf(page).first());
		measure('hour gutter', gutter);
		expect(gutter).toContain(hourLabelOf(dayOfEntry, 8));
		expect(gutter).not.toContain(hourLabelOf(dayOfEntry, 0));

		/* Reset puts all four settings back and then hides itself */
		await popoverOf(page).getByRole('button', { name: CAL.SETTINGS.RESET, exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"rowHeight":"default"');
		measure('storage after reset', await storageOf(page));
		await expect.poll(() => settingsStorageOf(page), { timeout: 20_000 }).toContain('"snapMinutes":15');
		await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);
		const restored = await blockGeometry(page, title, 120);
		expect(restored.styleTop).toBe('480px');
		expect(restored.styleHeight).toBe('96px');
		await openSettingsMenu(page);
		expect(await popoverOf(page).getByRole('button', { name: CAL.SETTINGS.RESET, exact: true }).count()).toBe(0);
		await expect.poll(() => closeLayers(page), { timeout: 25_000 }).toBe(0);

		/* the time per project: largest first, time with no project last (`calendar-view.ts:607-634`) */
		expect(await textsOf(projectLegendOf(page).locator('li'))).toEqual([
			`Fixture Project${durationOf(7200)}`,
			`Suite Second Project${durationOf(5400)}`,
			`${T.NO_PROJECT}${durationOf(1800)}`
		]);

		/* a shown range with no time draws no legend at all, and its total is nothing (`calendar-project-legend.tsx:40-55`) */
		for (let step = 0; step < 2; step += 1) {
			await rangeGroupOf(page)
				.getByRole('button', { name: NEXT('week'), exact: true })
				.click({ timeout: 15_000 });
		}
		const ahead = periodTextOf(at(mondayOffset() + 14, 12, 0), at(mondayOffset() + 20, 12, 0));
		await expect(rangeHeadingOf(page).first()).toHaveText(ahead);
		await expect.poll(() => api.reads(LOGS_PATH).length, { timeout: 40_000 }).toBeGreaterThan(0);
		await expect(projectLegendOf(page)).toHaveCount(0);
		await expect(metaLineOf(page)).toHaveText(`${ahead} · ${copy(CAL.TRACKED_TOTAL, { total: durationOf(0) })}`);
		await expect(entryBlocksOf(page)).toHaveCount(0);
	});

	test('12 · the member switch as a manager: whose time is asked for and whose entries are drawn', async ({
		page,
		fixture
	}) => {
		test.setTimeout(300_000);
		const state = servedFor(fixture);
		const api = await serveCalendarApi(page, state);
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });
		await weekView(page);

		// `canSwitchMember` (`use-calendar-page.ts:172`): the fixture manager holds an organization role
		await expect(memberTriggerOf(page)).toHaveAccessibleName(
			copy(CAL.MEMBER_SWITCH_LABEL, { name: fixture.names.user })
		);

		await memberTriggerOf(page).click({ timeout: 15_000 });
		await expect
			.poll(() => page.getByRole('listbox', { name: C.MEMBERS, exact: true }).getByRole('option').count(), {
				timeout: 20_000
			})
			.toBeGreaterThan(0);
		const options = await page
			.getByRole('listbox', { name: C.MEMBERS, exact: true })
			.getByRole('option')
			.evaluateAll((nodes: Element[]) =>
				nodes.map((node) => ({
					text: (node.textContent ?? '').replace(/\s+/g, ' ').trim(),
					selected: node.getAttribute('aria-selected') ?? ''
				}))
			);
		measure('member options', options);
		// `calendarMembersOf` (`calendar-view.ts:263-281`): one row per team member, sorted by name, the own one marked
		expect(options).toHaveLength(3);
		expect(options.some((option) => option.text.includes(fixture.names.user) && option.selected === 'true')).toBe(
			true
		);
		expect(options.some((option) => option.text.includes(fixture.names.teammate))).toBe(true);
		expect(options.map((option) => option.text)).toEqual(
			expect.arrayContaining([expect.stringContaining(CAL.YOU)])
		);

		await page
			.getByRole('listbox', { name: C.MEMBERS, exact: true })
			.getByRole('option')
			.filter({ hasText: fixture.names.teammate })
			.first()
			.click({ timeout: 15_000 });

		/* the read now asks for that member, and only for that member */
		await expect
			.poll(() => api.reads(LOGS_PATH).at(-1)?.params['employeeIds[0]'], { timeout: 40_000 })
			.toBe(fixture.ids.teammateEmployee);
		const teammateRead = api.reads(LOGS_PATH).at(-1);
		measure('teammate read', teammateRead?.params);
		expect(teammateRead?.params['employeeIds[0]']).toBe(fixture.ids.teammateEmployee);
		expect(teammateRead?.params['timeZone']).toBe(zoneOf());

		const monday = at(mondayOffset(), 12, 0);
		const sunday = at(mondayOffset() + 6, 12, 0);
		const rangeName = periodTextOf(monday, sunday);
		// the teammate's own served hour, and nobody else's time
		const teammateTotal = secondsOf(
			state.logs.filter((log) => String(log.employeeId) === fixture.ids.teammateEmployee)
		);
		await expect
			.poll(async () => await metaLineOf(page).textContent(), { timeout: 40_000 })
			.toContain(durationOf(teammateTotal));
		await expect(metaLineOf(page)).toHaveText(
			`${rangeName} · ${copy(CAL.TRACKED_TOTAL, { total: durationOf(teammateTotal) })}`
		);
		const shown = await entryLabels(page);
		measure('teammate entries', shown);
		expect(shown).toEqual([
			entryLabelOf('Suite teammate task', at(weekDayB(), 11, 0), at(weekDayB(), 12, 0), 3600)
		]);
		expect(shown.join('\n')).not.toContain(fixture.names.task);
		expect(await textsOf(projectLegendOf(page).locator('li'))).toEqual([
			`Fixture Project${durationOf(teammateTotal)}`
		]);

		// the day header of the teammate's day carries the teammate's total (`calendarDaysOf`, `calendar-view.ts:549-569`)
		const headers = await textsOf(columnHeadersOf(page));
		expect(headers[weekDayB() - mondayOffset() + 1]).toContain(durationOf(teammateTotal));

		await expect(memberTriggerOf(page)).toHaveAccessibleName(
			copy(CAL.MEMBER_SWITCH_LABEL, { name: fixture.names.teammate })
		);
		// switching the member does not touch the stored view or grid settings
		expect(await storageOf(page)).toEqual({ view: JSON.stringify('week'), settings: null });
	});

	test('13 · the day panel, the served plan on it, and the week grid opening a day', async ({ page, fixture }) => {
		test.setTimeout(420_000);
		// no served time anywhere: the run's own day then holds only the mock's fixture plan, on any weekday
		await serveCalendarApi(page, emptyServedFor());
		await signInAndVisit(page, fixture, PAGE_PATH, {
			scenario: { extraPermissions: [MANUAL_TIME_PERMISSION, MODIFY_TIME_PERMISSION] }
		});
		await expect(metaLineOf(page)).toBeVisible({ timeout: 60_000 });

		/* the month cell for the run's own day: the mock's fixture plan covers it, no time does */
		const today = at(0, 12, 0);
		const dayPanel = page.locator('[data-slot=sheet-content]:visible');
		await page.getByRole('button', { name: monthCellLabelOf(today, 0), exact: true }).click({ timeout: 15_000 });
		await expect.poll(() => dayPanel.count(), { timeout: 40_000 }).toBe(1);
		const panelText = await textOf(dayPanel);
		measure('day panel', panelText);
		expect(panelText).toContain(shortDayLabelOf(today));
		expect(panelText).toContain(
			`${copy(CAL.TRACKED_TOTAL, { total: durationOf(0) })} · ${copy(CAL.REACH, {
				percent: percentOfTracked(0, PLAN_EXPECTED_SECONDS),
				expected: hoursLabelOf(PLAN_EXPECTED_SECONDS)
			})}`
		);
		const sections = await page
			.locator('[data-slot=sheet-content] section[aria-label]')
			.evaluateAll((nodes: Element[]) =>
				nodes.map((node) => ({
					label: node.getAttribute('aria-label') ?? '',
					text: (node.textContent ?? '').replace(/\s+/g, ' ').trim()
				}))
			);
		measure('day panel sections', sections);
		const entriesSection = sections.find((section) => section.label === CAL.ENTRIES_TITLE);
		const planSection = sections.find((section) => section.label === CAL.PLAN_TITLE);
		expect(entriesSection?.text).toContain(CAL.DAY_EMPTY);
		expect(planSection?.text).toContain(`${durationOf(0)}/ ${hoursLabelOf(PLAN_EXPECTED_SECONDS)}`);
		// the mock's fixture plan (`mock-gauzy-server.mjs:255-271`): one task, estimated an hour
		expect(planSection?.text).toContain(fixture.names.task);
		expect(planSection?.text).toContain(durationOf(3600));
		expect((await textsOf(dayPanel.getByRole('button'))).join('|')).toContain(T.ADD_TIME);
		// opening a day panel does not change the stored view
		expect(await storageOf(page)).toEqual({ view: null, settings: null });
		await page.keyboard.press('Escape');
		await expect.poll(() => dayPanel.count(), { timeout: 25_000 }).toBe(0);
		await expect(metaLineOf(page)).toBeVisible();

		/* the week grid's day header opens the day view for that day */
		await weekView(page);
		const openDayLabels = await columnHeadersOf(page).evaluateAll((nodes: Element[]) =>
			nodes.map((node) => node.querySelector('button[aria-label]')?.getAttribute('aria-label') ?? '')
		);
		measure('Open day labels', openDayLabels);
		expect(openDayLabels).toContain(copy(CAL.OPEN_DAY, { day: shortDayLabelOf(today) }));
		await gridOf(page)
			.getByRole('button', { name: copy(CAL.OPEN_DAY, { day: shortDayLabelOf(today) }), exact: true })
			.click({ timeout: 15_000 });
		await expect.poll(() => columnsOf(page).count(), { timeout: 40_000 }).toBe(1);
		expect(await columnKeysOf(page)).toEqual([localDayKeyOf(today)]);
		await expect(rangeHeadingOf(page).first()).toHaveText(shortDayLabelOf(today));
		await expect(metaLineOf(page)).toHaveText(
			`${shortDayLabelOf(today)} · ${copy(CAL.TRACKED_TOTAL, { total: durationOf(0) })}`
		);
		expect(await storageOf(page)).toEqual({ view: JSON.stringify('day'), settings: null });
		await expect(viewTabsOf(page).getByRole('tab', { name: CAL.VIEWS.DAY, exact: true })).toHaveAttribute(
			'aria-selected',
			'true'
		);

		/* the day view's aside holds the same day summary and the same plan block */
		const asideSections = await page.locator('section[aria-label]').evaluateAll((nodes: Element[]) =>
			nodes
				.filter((node) => (node as HTMLElement).offsetParent !== null)
				.map((node) => ({
					label: node.getAttribute('aria-label') ?? '',
					text: (node.textContent ?? '').replace(/\s+/g, ' ').trim()
				}))
		);
		measure('day view sections', asideSections);
		const asidePlan = asideSections.find((section) => section.label === CAL.PLAN_TITLE);
		expect(asidePlan?.text).toContain(`${durationOf(0)}/ ${hoursLabelOf(PLAN_EXPECTED_SECONDS)}`);
		expect(asidePlan?.text).toContain(fixture.names.task);
		expect(asideSections.some((section) => section.label === shortDayLabelOf(today))).toBe(true);
		// the day the run runs on holds no served time, so the grid draws no entry for it
		expect(await entryLabels(page)).toEqual([]);
	});
});
