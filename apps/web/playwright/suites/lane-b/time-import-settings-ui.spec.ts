import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Locator } from '@playwright/test';

import { expect, test, type Page, type Shield } from '../../fixtures';
import { APP_ORIGIN, mockReset, signInAndVisit } from '../../helpers';
import { MOCK_ORIGIN } from '../../test-servers';

/**
 * What a signed-in person sees and what the browser really sends on **Settings › Team › Import**
 * (`/settings/team/import`, `app/[locale]/(main)/settings/team/import/page.tsx` →
 * `core/components/settings/pages/time-import/time-import-settings-page.tsx`), on lane-b (app
 * `http://localhost:3032`, mock `http://127.0.0.1:3996`, control `3998`, `playwright/test-servers.ts` `LANE_PORTS`).
 * Entries mode only: the workspace import is touched in test 15, as far as the mode switch reaches it.
 *
 * ## Where the numbers came from
 *
 * Every pinned value was printed by a run first: the throwaway probes `E:\Coding\.tmp\probe-timeimport\probe.spec.ts`
 * (log `probe-3.log`: idle screen, template download for both viewers, checking → preview, the conflict query, the
 * columns-step screen, the failed check, confirm + report + report download, a refused POST, the refused-file
 * sentences, "choose another file") and `probe2.spec.ts` / `probe5.spec.ts` / `probe8.spec.ts` / `probe9.spec.ts`
 * (logs `probe2-2.log`, `probe3-1.log`, `probe4-1.log`, `probe5-1.log`, `probe6-2.log`, `probe7-1.log`, `probe8-1.log`,
 * `probe9-1.log`: the sections and the columns guide, the combobox names and the Base UI option picking, the checking
 * screen with a slow conflict read, the refusals the first probe never reached, the whole columns flow to the preview,
 * which select popup is mounted and which is only left behind, the workspace mode, the manual-time-off notice, the
 * permissions failure and its Retry, and the overlap row). `subset-1.log`, `subset-2.log` and `subset-3.log` are runs
 * of this file itself with `--grep`, made to print the refused-file sentences, the overlap report, the stopped import
 * and the columns flow. The spec's own `[lane-b time-import] MEASURE` lines re-print the same values in every run; the
 * two consecutive whole-file runs are `E:\Coding\.tmp\s3-lane-b-timeimport-3.log` and
 * `E:\Coding\.tmp\s3-lane-b-timeimport-4.log`. (The earlier `-1.log` — 9 failed, 6 passed — and `-2.log` — 1 failed,
 * 14 passed — are kept: they are the runs that found what the Findings list now records.)
 *
 * Dates and times are read in the **browser's zone**, which on this PC is Europe/Madrid (UTC+01:00 on 2026-11-03,
 * after the daylight-saving move): the page itself says so (`Your profile uses UTC (UTC +00:00). This browser is in
 * Europe/Madrid (UTC +01:00)`, the shell's zone banner, and `time-import-columns-guide.tsx:30-31` prints the same
 * zone into the Columns section). That is why a row typed `2026-11-03,09:00` is posted as
 * `startedAt 2026-11-03T08:00:00.000Z` and read for the day `2026-11-02T23:00:00.000Z → 2026-11-03T23:00:00.000Z`
 * (`time-import-rows.ts:566-581` `timeImportLookupsOf`: one whole-day read per member and day, `end` = next day).
 * The machine's zone is also Node's here, so the spec builds the same `Intl` strings the app builds in the browser.
 *
 * ## Which layer is real and which is served
 *
 * **Real:** the lane's mock answers everything the page reads to decide whether it may open at all —
 * `GET /api/role-permissions/me` (`cypress/support/mock-gauzy-server.mjs:674`, five permissions, `ALLOW_MANUAL_TIME`
 * **not** among them, `:49`), `GET /api/organization/<id>` (`:777`, `allowManualTime: true` at `:95`), the team with
 * its members and projects (`/api/organization-team…`), the team's tasks (`/api/tasks/team`, `:677`) and the sign-in
 * fixture. Test 1 runs on those alone and pins them.
 *
 * **Served by this file:** the two routes of the import itself, because the mock has no handler for them — a
 * `GET /api/timesheet/time-log/conflict` there would fall into the catch-all `return pagination([])`
 * (`mock-gauzy-server.mjs:895`, `pagination` at `:9`), which `TimeLogService.getTimeLogConflicts`
 * (`core/services/client/api/timesheets/time-log.service.ts:228-258`) would not read as its conflict list, and a
 * `POST /api/timesheet/time-log` would be echoed the body it was sent (`:894`), which has no `id`, no `duration` and
 * fails `timeLogSchema` (`core/types/schemas/timer/time-log.schema.ts`). Both are stubbed with a store-backed
 * `page.route` on the **mock origin** (`suites/lane-a/api-tokens-settings-ui.spec.ts:275-360` is the pattern), each
 * answer restating the mock's CORS answer (`mock-gauzy-server.mjs:1087-1101`, `OPTIONS` → 204 at `:1097-1101`) —
 * the page sits on `localhost:3032`, the API on `127.0.0.1:3996`. `route.fetch()` is never called; only the
 * permissions stub uses `route.fallback()` (to let the mock answer the read that follows a Retry).
 *
 * A POST answer must carry a UUID `id` (`baseEntitySchema` in `core/types/schemas`): with `id: 'probe-log-1'` the app
 * logged `Add manual time validation failed: … id: Invalid UUID` for a row it had just saved (`probe-3.log` P7), so
 * this file answers `b0000000-…-<n>` and its console stays clean.
 *
 * ## The code this file drives
 *
 * - `time-import-settings-page.tsx`: the gate `:175-215` (`isLoading` → skeleton `:205-207`, `TimeImportBlocked`
 *   `:136-173` for `hasLoadFailed` / `refusal === 'manualTimeOff'` / no permission, `SettingsPage` title +
 *   description `:200-203`, `:209`), the flow `:53-134` (`isIdle && modeSwitch` `:76` — the switch is gone as soon as
 *   a file is on its way, `TimeImportUpload` `:77-87`, `TimeImportColumnsStep` `:88-98`, `TimeImportChecking`
 *   `:99-107`, `TimeImportResult` `:108-125`, `TimeImportColumnsGuide` `:126-131`), the template download `:62-65`
 *   (`timeImportTemplateCsvColumnsOf(canImportForOthers)` + `downloadCsv` + `TIME_IMPORT_TEMPLATE_FILE_NAME`).
 * - `core/lib/utils/time-import-access.ts:21-32` (the organization's switch is named before the role's permission)
 *   and `core/hooks/timesheet/use-time-import-access.ts:25-27,71-76` (`ALLOW_MANUAL_TIME`; time for another member
 *   needs the team-manager flag or `CHANGE_SELECTED_EMPLOYEE`), `retryLoad` `:65-69`.
 * - `time-import-upload.tsx:101-162`: `SettingsSection id="time-import"` `:102-106`, the refused-file `Notice`
 *   `:107-117`, the template row `:119-128`, the drop button `:130-147` (its accessible name is `DROP_TITLE`, the
 *   limit sentence is `aria-describedby`), the `sr-only` `input[type=file]` `:148-157` with `accept=".csv,text/csv"`,
 *   the whose-time note `:160`. `time-import-columns-guide.tsx:78-109`: the `dt` chip + requirement, the `dd` rule.
 * - `time-import-columns-step.tsx`: `id="time-import"` `:324-328`, one `Select` per field `:338-347` (its trigger is
 *   the `<label htmlFor>`'s target `:132-144`, `REQUIREMENTS` `:42-54`; the trigger's accessible name is the label's
 *   words and its requirement chip, space separated — `Date Required`, `Start time Required`, `End time One of the
 *   two`, plain `Member` — `probe5-1.log`), the date-format row `:165-239` (a plain reading when the file's dates tell
 *   the order, a `Select` only when they fit two `:200-238`, and for `03/11/2026` that select holds exactly
 *   `Day first, November 3, 2026` and `Month first, March 11, 2026` — `subset-3.log`), the blocker
 *   `:304-320` (`role="status"`, `aria-describedby` on the Continue button `:364`), the left-out columns note
 *   `:370-377`. `core/lib/utils/time-import-columns.ts:37-105` is what a header is recognised as, `:460-475` the
 *   blocker order (missing → mixedDates → dateOrder), `:543-597` when a file goes to the Columns step at all.
 * - `time-import-checking.tsx:27-65`: the failed notice (with `RETRY` and `CHOOSE_ANOTHER`) and the `<output
 *   aria-busy>` line — both in a `SettingsSection` **without an id**, so `#time-import` is absent while a file is
 *   being checked (measured; `settings-page.tsx:65-68` puts the id on the section only when it is given one).
 * - `time-import-result.tsx`: title/description per stage `:174-183`, `Change columns` for a file whose columns were
 *   chosen `:213`,`:225-232`, the figures `:185-208` (`MetricStrip`, `aria-label` "Figures of this file"), the
 *   preview footer `:252-275` (`CHOOSE_ANOTHER` + `IMPORT_ACTION`), the row filter `:295-304` (a second
 *   `role="tablist"`, "Rows shown"), the report footer `:283-293` (`DOWNLOAD_REPORT`, `IMPORT_ANOTHER`), the run
 *   notice `:84-117` (`DONE_TITLE`/`DONE_DESCRIPTION`, or `STOPPED_TITLE` + `toasts.REASONS.*` +
 *   `STOPPED_SAVED` + `STOPPED_NOT_SENT`). `time-import-row.tsx:110-143`: `Row {row}`, the range · duration,
 *   `For {name}`, the reason lines, the status badge.
 * - `core/hooks/timesheet/use-time-import.ts`: the stage list `:76-82`, the file reading and its refusals
 *   `:403-416` (`notCsv`, `notText`, then `timeImportReadingOf`'s problems), the reads `readLookup`
 *   (`staleTime: 0, retry: false`), `confirm` = recheck + per ready row (`saveEntry` `:200-245`, which stops the run
 *   at the first failed row and maps the HTTP status to a copy through `errorReasonKeyOf`
 *   (`core/lib/utils/error-feedback.ts` → `toasts.REASONS.INVALID` for 400), the dev-only logs
 *   `[Time import check failed]` `:384`, `[Time import row refused]` `:241`,
 *   `[Time import check before saving failed]` `:598`, `[Time import check of a row before saving failed]` `:271`
 *   (`logErrorInDev`, `core/lib/helpers/error-message.ts:58-63`).
 * - `core/services/client/api/timesheets/time-log.service.ts:198-212` (`addManualTime`) and `:228-258`
 *   (`getTimeLogConflicts`, `qs.stringify` → `relations[0]=task&relations[1]=project`).
 * - `core/lib/utils/time-import-report.ts:11` `TIME_IMPORT_TEMPLATE_FILE_NAME`, `:23-26` the template columns,
 *   `:67-78` the report columns, `:81-83` `timeImportReportFileNameOf`; `core/lib/utils/dashboard-export.ts:36-60`
 *   (`csvOf` joins with `\r\n`, `downloadCsv` prefixes the UTF-8 BOM) and `:90-95` `localDayKeyOf`.
 *
 * Copy is never typed: the `msg(…)` helper below fills a key the way next-intl fills it — `{name}` values,
 * `{v, plural, one {…#…} other {…}}` and the `=0` form `STOPPED_SAVED` uses, where `#` is the plural variable of the
 * branch it sits in. `timeImport.CHECKING_DESCRIPTION` at 2 rows is therefore "2 rows are compared with the time
 * already recorded." (`s3-lane-b-timeimport-2.log`, test 5) and `timeImport.DROP_HINT` is "CSV only, up to 1 MB and
 * 500 rows per file." (the same log, test 7's `afterChooseAnother`).
 *
 * A console line of a status this file armed is excused only in its exact measured shape: the client logs the path the
 * service passed, **without** the client's `/api` base (`core/services/logs/logger-adapter.service.ts:189-199` reads
 * `error.config.url`, and `core/services/client/api/timesheets/time-log.service.ts:209,251` pass
 * `/timesheet/time-log` and `/timesheet/time-log/conflict`), so `armedHttpError` strips the prefix and the line is
 * `GET /timesheet/time-log/conflict?… 500` or `GET /role-permissions/me 502` (`s3-lane-b-timeimport-2.log` tests 8, 14).
 *
 * ## Findings (measured, with the code that explains them)
 *
 * 1. **The mock's default role cannot import.** `mock-gauzy-server.mjs:49` gives five permissions and
 *    `ALLOW_MANUAL_TIME` is not one of them, so the page as it stands shows the no-permission notice (test 12);
 *    every other test signs in with `scenario.extraPermissions: ['ALLOW_MANUAL_TIME']`. This is the fixture's
 *    choice, not a defect.
 * 2. **The workspace import is not offered to this fixture role.** With `extraPermissions: ['ALLOW_MANUAL_TIME']`
 *    only, `useWorkspaceImport`'s `rights.canStart` is false and the flow renders the `NO_RIGHTS` notice
 *    (`workspace-import-flow.tsx:54-66`) instead of its own file drop — measured: 0 file inputs, the notice's two
 *    sentences. Test 15 therefore pins the switch and that notice, not a workspace upload; the workspace import
 *    itself is out of scope for this file.
 * 3. **A file whose headers are all recognised and still miss a required part is refused outright**, not sent to
 *    the Columns step: `time-import-columns.ts:567-569` (`isMissing && !canChooseColumns`), which is why
 *    `no-time.csv` gets `These columns are missing: start time and end time or duration.` (test 4) while a file with
 *    headers the import cannot place stops on the Columns step (test 6).
 * 4. **A saved row whose POST answer fails schema validation still counts as saved.** The 400 case (test 11) is the
 *    refusal path; the same hook counts a `ZodValidationError` on a 201 answer as saved
 *    (`use-time-import.ts:238-240`, unit test `core/hooks/timesheet/use-time-import.test.tsx:259`), so the report's
 *    "Saved" is only as good as the answer's shape. Untagged here (no run of mine exercised it); noted because this
 *    file pins the POST answers.
 * 5. **`#time-import` disappears while a file is being checked** (finding in the "code this file drives" list
 *    above): the checking screen and its failed notice render a `SettingsSection` with no id, so a locator that
 *    scopes to `#time-import` sees nothing in that stage. Untagged — a gap in the section's id, not a stated intent.
 * 6. **A finished run's `<h2>` is `Report`; the sentence about what stopped it is not a heading.** `STOPPED_TITLE` /
 *    `DONE_TITLE` are the `Notice`'s title, a `<p>` in an `<output>` (`time-import-result.tsx:110-116`,
 *    `notice.tsx:48-50`), while the stage heading is `Preview` / `Importing` / `Report` (`time-import-result.tsx:174-183`).
 *    Measured: asking for `The import stopped at row 3` as a level-2 heading found nothing (`s3-lane-b-timeimport-1.log`
 *    test 11), while `Report` was there. Untagged.
 * 7. **A closed select popup stays in the DOM and keeps the same option names.** After a pick, a
 *    `[data-slot="select-content"]` (`role="presentation"`, `visible=false`) remains mounted (`probe7-1.log` counted one
 *    ten seconds after the pick; `probe8-1.log` counted 13 `[role=option]` nodes with 5 visible), so from the second
 *    pick on a plain `getByRole('option', {name})` resolves to two popups' options (`subset-2.log`:
 *    `#base-ui-_r_37_-list` and `#base-ui-_r_3c_-list`). The picks here are scoped to `[role="listbox"]:visible` and
 *    closed with Escape. Untagged — Base UI keeps the popup, not a stated intent.
 *
 * ## What this file does not cover
 *
 * The workspace import beyond test 15 (its files, plan, creation and entries); labels (`timer.labels`, the
 * `labels` column and `taskLabelService`, `use-time-import.ts:563`) — no file here has a labels column, so no label
 * request is made and none is pinned; members without an account (`time-import-placeholder-offer.tsx`); a file with
 * a mixed date order refused whole (`mapping.MIXED_DATES`) — a template-headed file keeps the template's order for
 * that (`time-import-columns.ts:527-532`, measured in `probe-3.log` P13 as one row left out, `The date cannot be
 * read. Write it year first, like 2026-11-03.`, which this file does not pin); an import interrupted halfway by a
 * recheck that changed (`PREVIEW_CHANGED_TITLE`); and the app's own `app/api/**` route twins (proxy mode), which the
 * browser never calls on this lane.
 */

const MOCK_API_ORIGIN = new URL(MOCK_ORIGIN).origin;

const PAGE = '/settings/team/import';
const CONFLICT_ROUTE = '/api/timesheet/time-log/conflict';
const TIME_LOG_ROUTE = '/api/timesheet/time-log';
const PERMISSIONS_ROUTE = '/api/role-permissions/me';

/** `locales/en.json`: `timeImport` `:7445-7610` (flat and nested keys), `settings.entries.import`, `toasts.REASONS`. */
const EN = JSON.parse(readFileSync(join(__dirname, '../../../locales/en.json'), 'utf8')) as {
	timeImport: Record<string, unknown>;
	settings: { entries: { import: { TITLE: string; DESCRIPTION: string } } };
	toasts: { REASONS: Record<string, string> };
};

const PAGE_TITLE = EN.settings.entries.import.TITLE; // Import
const PAGE_DESCRIPTION = EN.settings.entries.import.DESCRIPTION;

/**
 * The locale message, filled the way next-intl fills it: `{name}` values, `{v, plural, one {…} other {…}}` (and the
 * `=0` form `STOPPED_SAVED` uses), with `#` standing for the plural variable. Only the shapes this page's copy uses.
 */
const braceEnd = (text: string, openAt: number) => {
	let depth = 0;
	for (let index = openAt; index < text.length; index += 1) {
		const char = text[index];
		if (char === '{') {
			depth += 1;
			continue;
		}
		if (char === '}') {
			depth -= 1;
			if (depth === 0) {
				return index;
			}
		}
	}
	return text.length;
};

const topLevelParts = (text: string) => {
	const parts: string[] = [];
	let depth = 0;
	let current = '';
	for (const char of text) {
		if (char === '{') {
			depth += 1;
		}
		if (char === '}') {
			depth -= 1;
		}
		if (char === ',' && depth === 0) {
			parts.push(current);
			current = '';
			continue;
		}
		current += char;
	}
	parts.push(current);
	return parts;
};

type MsgValues = Record<string, string | number>;

const renderBlock = (inner: string, values: MsgValues, hash: number | null) => {
	const parts = topLevelParts(inner);
	const isPlural = parts.length >= 3 && parts[1].trim() === 'plural';
	if (!isPlural) {
		const name = inner.trim();
		if (name === '#') {
			return String(hash ?? '');
		}
		return String(values[name] ?? '');
	}
	const count = Number(values[parts[0].trim()] ?? hash);
	/** the plural branches are not comma separated (`one {…} other {…}`), so they arrive as one part: walk it by braces */
	const branches = parts.slice(2).join(',');
	let exact: string | null = null;
	let one: string | null = null;
	let other: string | null = null;
	let cursor = 0;
	while (cursor < branches.length) {
		const open = branches.indexOf('{', cursor);
		if (open < 0) {
			break;
		}
		const key = branches.slice(cursor, open).replace(/,/g, ' ').trim();
		const close = braceEnd(branches, open);
		const body = branches.slice(open + 1, close);
		if (key.startsWith('=')) {
			if (Number(key.slice(1)) === count) {
				exact = body;
			}
		} else if (key === 'one') {
			one = body;
		} else if (key === 'other') {
			other = body;
		}
		cursor = close + 1;
	}
	const chosen = exact ?? (count === 1 ? one : other) ?? other ?? one ?? '';
	return renderText(chosen, values, count);
};

const renderText = (text: string, values: MsgValues, hash: number | null) => {
	let out = '';
	let index = 0;
	while (index < text.length) {
		const char = text[index];
		/** `#` is the plural variable of the branch the text sits in (`timeImport.IMPORT_ACTION`: `Import # entries`) */
		if (char === '#' && hash !== null) {
			out += String(hash);
			index += 1;
			continue;
		}
		if (char !== '{') {
			out += char;
			index += 1;
			continue;
		}
		const end = braceEnd(text, index);
		out += renderBlock(text.slice(index + 1, end), values, hash);
		index = end + 1;
	}
	return out;
};

const msg = (path: string, values: MsgValues = {}) => {
	const raw = path.split('.').reduce<unknown>((node, key) => (node as Record<string, unknown>)[key], EN) as string;
	return renderText(raw, values, null);
};

/** `time-import-copy.ts:93` `Intl.ListFormat(locale, {type:'conjunction'})`, the browser's locale being `en`. */
const listOf = (items: ReadonlyArray<string>) => new Intl.ListFormat('en', { type: 'conjunction' }).format(items);

/** `time-import-copy.ts:89-100` `rangeOf`, the same formatter, this process in the same zone as the browser. */
const rangeOf = (start: string, end: string) =>
	new Intl.DateTimeFormat('en', { dateStyle: 'medium', timeStyle: 'short' }).formatRange(
		new Date(start),
		new Date(end)
	);

/** `time-import-copy.ts:30-43 TIME_IMPORT_EXAMPLES`: format samples, the same in every language. */
const EXAMPLES = {
	date: '2026-11-03',
	dayFirst: '03/11/2026',
	monthFirst: '11/03/2026',
	startTime: '09:30',
	startTimeMeridiem: '9:30 AM',
	endTime: '17:45',
	endTimeMeridiem: '5:45 PM',
	duration: '1:30',
	durationUnits: '1h 30m',
	durationDecimal: '1.5',
	yes: 'yes',
	no: 'no'
};

/** `time-import-sheet.ts:29-39 TIME_IMPORT_HEADERS`, measured back out of the guide's chips and the template file. */
const CSV_HEADERS = {
	date: 'date',
	startTime: 'start time',
	endTime: 'end time',
	duration: 'duration',
	project: 'project',
	task: 'task',
	notes: 'notes',
	billable: 'billable',
	memberEmail: 'member email'
};

/** `time-import-sheet.ts:6` and `time-import-copy.ts:22-24`, the values the refusals name. */
const MAX_ROWS = 500;
const MAX_MEGABYTES = 1;

const flat = (value: string) => value.replace(/\s+/g, ' ').trim();
const flatMsg = (path: string, values: MsgValues = {}) => flat(msg(path, values));

const report = (label: string, value: Record<string, unknown>) =>
	console.log(`[lane-b time-import] MEASURE ${label} ${JSON.stringify(value)}`);

/** The mock's own CORS answer (`mock-gauzy-server.mjs:1087-1101`), restated for every answer this file writes. */
const CORS_HEADERS = {
	'access-control-allow-credentials': 'true',
	'access-control-allow-headers': 'authorization, content-type, tenant-id, organization-id, organization-team-id',
	'access-control-allow-methods': 'DELETE, GET, OPTIONS, PATCH, POST, PUT',
	'access-control-expose-headers': '*',
	'cache-control': 'no-store',
	'access-control-allow-origin': APP_ORIGIN
};

type Refusal = { status: number; message: string };

/** `timeLogConflictSchema` (`core/types/schemas/timer/time-log.schema.ts:49-…`): an `id` plus the recorded moment. */
type ServedConflict = {
	id: string;
	startedAt: string;
	stoppedAt: string | null;
	isRunning: boolean;
	taskId: string | null;
};

type ServedScript = {
	conflicts?: ServedConflict[];
	/** Refuses every conflict read until `stopRefusingConflicts()` is called. */
	conflictRefusal?: Refusal;
	/** Holds the conflict answer this long, so the checking screen is on screen long enough to read. */
	conflictDelayMs?: number;
	/** Refuses every permissions read until `stopFailingPermissions()` is called. */
	failPermissions?: boolean;
	/** 1-based numbers of the POSTs this file refuses. */
	refusedPosts?: number[];
	postRefusal?: Refusal;
	/** Served instead of the mock's organization for `GET /api/organization/<id>`. */
	organization?: Record<string, unknown>;
};

type ServedCall = { method: string; path: string; query: string; body: string | null };

type TimeImportHarness = {
	/** `GET …/conflict?<query>` in the order the browser sent them. */
	conflictQueries: string[];
	/** `POST …/time-log` bodies, in order. */
	posts: Array<{ body: Record<string, unknown>; status: number }>;
	/** Every `/conflict` and `/time-log` call, in the order they were sent. */
	calls: ServedCall[];
	permissionsReads: () => number;
	shapes: () => string[];
	/** The parsed query parameters of each conflict read, the way `qs.stringify` sent them. */
	lookups: () => Array<Record<string, string>>;
	stopRefusingConflicts: () => void;
	stopFailingPermissions: () => void;
};

/**
 * This file's stand-in for the time-import API, on the mock origin, because the mock has no handler for either
 * route (see the header). Every read and write is recorded, so "nothing was sent" and "one POST per row" are
 * answerable from the harness and not from the page.
 */
async function serveTimeImport(page: Page, script: ServedScript, organizationPath: string): Promise<TimeImportHarness> {
	const state = { conflictRefusal: script.conflictRefusal ?? null, failPermissions: script.failPermissions === true };
	const conflictQueries: string[] = [];
	const posts: Array<{ body: Record<string, unknown>; status: number }> = [];
	const calls: ServedCall[] = [];
	let permissionsReads = 0;
	let postedRows = 0;

	await page.route(
		(url: URL) => url.origin === MOCK_API_ORIGIN,
		async (route) => {
			const request = route.request();
			const method = request.method();
			const url = new URL(request.url());
			const pathname = url.pathname;
			if (method === 'OPTIONS') {
				return route.fulfill({ status: 204, headers: CORS_HEADERS });
			}
			const answer = (status: number, body?: unknown) =>
				route.fulfill({
					status,
					headers: { ...CORS_HEADERS, 'content-type': 'application/json' },
					body: body === undefined ? '' : JSON.stringify(body)
				});

			if (pathname === PERMISSIONS_ROUTE) {
				permissionsReads += 1;
				if (state.failPermissions) {
					return answer(502, { statusCode: 502, message: 'this file refused the permissions read' });
				}
				return route.fallback();
			}
			if (pathname === organizationPath && script.organization) {
				return answer(200, script.organization);
			}
			if (pathname === CONFLICT_ROUTE) {
				calls.push({ method, path: pathname, query: url.search, body: null });
				conflictQueries.push(url.search);
				if (state.conflictRefusal) {
					return answer(state.conflictRefusal.status, {
						statusCode: state.conflictRefusal.status,
						message: state.conflictRefusal.message
					});
				}
				if (script.conflictDelayMs) {
					await new Promise((resolve) => setTimeout(resolve, script.conflictDelayMs));
				}
				return answer(200, script.conflicts ?? []);
			}
			if (pathname === TIME_LOG_ROUTE && method === 'POST') {
				const body = JSON.parse(String(request.postData())) as Record<string, unknown>;
				postedRows += 1;
				const index = postedRows;
				const refusal = script.refusedPosts?.includes(index)
					? (script.postRefusal ?? { status: 400, message: 'this file refused the row' })
					: null;
				calls.push({ method, path: pathname, query: url.search, body: request.postData() });
				posts.push({ body, status: refusal ? refusal.status : 201 });
				if (refusal) {
					return answer(refusal.status, { statusCode: refusal.status, message: refusal.message });
				}
				// `timeLogSchema` wants a UUID `id` next to `employeeId`, `startedAt`, `stoppedAt` and `duration`.
				return answer(201, {
					id: `b0000000-0000-4000-8000-00000000000${index}`,
					createdAt: new Date().toISOString(),
					updatedAt: new Date().toISOString(),
					tenantId: body.tenantId,
					organizationId: body.organizationId,
					organizationTeamId: body.organizationTeamId,
					employeeId: body.employeeId,
					projectId: body.projectId ?? null,
					taskId: body.taskId ?? null,
					description: body.description ?? null,
					startedAt: body.startedAt,
					stoppedAt: body.stoppedAt,
					duration: 3600,
					isBillable: body.isBillable ?? false,
					isRunning: false,
					logType: body.logType,
					source: body.source
				});
			}
			return route.fallback();
		}
	);

	return {
		conflictQueries,
		posts,
		calls,
		permissionsReads: () => permissionsReads,
		shapes: () =>
			calls.map((call) =>
				`${call.method} ${call.path}${call.query}${call.body === null ? '' : ` ${call.body}`}`.trim()
			),
		lookups: () =>
			conflictQueries.map((query) => {
				const params: Record<string, string> = {};
				new URLSearchParams(query).forEach((value, key) => {
					params[key] = value;
				});
				return params;
			}),
		stopRefusingConflicts: () => {
			state.conflictRefusal = null;
		},
		stopFailingPermissions: () => {
			state.failPermissions = false;
		}
	};
}

/** Only records: every call the browser sent to the mock, whatever answered it. */
function recordMockRequests(page: Page) {
	const calls: string[] = [];
	page.on('request', (request) => {
		const url = new URL(request.url());
		if (url.origin === MOCK_API_ORIGIN) {
			calls.push(`${request.method()} ${url.pathname}`);
		}
	});
	return { calls, paths: () => Array.from(new Set(calls)) };
}

/** React's dev-mode store warning, not this page's (`security-two-factor-ui.spec.ts:226-233`). */
const SHELL_STORE_NOISE = 'The result of getSnapshot should be cached to avoid an infinite loop';
/** `mutation-error-toaster.tsx:43-45`, printed for every failed mutation in dev mode. */
const DEV_MUTATION_NOISE = 'Mutation failed:';
/**
 * The client's own HTTP error line for a refusal this file armed (`api.service.ts` `logError`): the service path
 * **without** its `/api` prefix, measured in `s3-lane-b-timeimport-1.log` test 8 and 14 —
 * `GET /timesheet/time-log/conflict?… 500`, `GET /role-permissions/me 502`.
 */
const armedHttpError = (verb: string, url: string, status: number) =>
	`[ERROR] [HttpClient] HTTP Error: ${verb} ${url.replace(/^\/api/, '')} ${status}`;
/** `use-time-import.ts:241`, `:271`, `:384`, `:598` — `logErrorInDev` prints `[<context>] <error>` (`error-message.ts:60`). */
const DEV_IMPORT_NOISE = [
	'[Time import check failed]',
	'[Time import check before saving failed]',
	'[Time import check of a row before saving failed]',
	'[Time import row refused]'
];

const consoleFindings = (shield: Shield, expected: string[] = []) =>
	shield
		.consoleErrors()
		.filter((line) => !line.includes(SHELL_STORE_NOISE))
		.filter((line) => !line.includes(DEV_MUTATION_NOISE))
		.filter((line) => !DEV_IMPORT_NOISE.some((label) => line.includes(label)))
		.filter((line) => !expected.some((text) => line.includes(text)));

const sectionText = async (page: Page) => {
	const section = page.locator('#time-import');
	if ((await section.count()) === 0) {
		return '<no #time-import>';
	}
	return flat(await section.innerText());
};

const pickFile = async (page: Page, name: string, buffer: Buffer, mimeType = 'text/csv') =>
	page.locator('input[type=file]').setInputFiles({ name, mimeType, buffer });

const downloadOf = async (page: Page, button: Locator) => {
	const downloadPromise = page.waitForEvent('download');
	await button.click();
	const download = await downloadPromise;
	const path = await download.path();
	return {
		fileName: download.suggestedFilename(),
		text: path === null ? '' : readFileSync(path).toString('utf8'),
		firstBytes: path === null ? [] : Array.from(readFileSync(path).subarray(0, 3))
	};
};

const csvLines = (text: string) => text.replace(/^\uFEFF/, '').split(/\r?\n/);

/** The template-shaped file the import reads by itself; rows 2 and 3, both the viewer's own time. */
const GOOD_CSV = [
	'date,start time,end time,duration,project,task,notes,billable,member email',
	'2026-11-03,09:00,10:00,,Fixture Project,Fixture active task,Pairing,yes,',
	'2026-11-03,11:00,12:00,,,,Standup,no,'
].join('\n');

/**
 * The same with a third ready row, so a stopped import has a row it never sent. No project, no task, no notes: a
 * name the mock has no record of would leave the row out before the run (`time-import-rows.ts:433`, `:465`), and
 * the point here is a row that was ready and never reached.
 */
const THREE_ROW_CSV = [GOOD_CSV, '2026-11-03,13:00,13:30,,,,,no,'].join('\n');

/** Headers the import cannot place by itself → the Columns step; `03/11/2026` fits day first and month first. */
const COLUMNS_CSV = [
	'k1,k2,k3,k4',
	'03/11/2026,09:00,10:00,teammate@example.test',
	'04/11/2026,11:00,11:30,teammate@example.test'
].join('\n');

/** The row verdicts and figures, as the page prints them (measured; `dashboard-figures.ts` `formatDurationShort`). */
const ROW_2_LINE = `Row 2 ${flat(rangeOf('2026-11-03T08:00:00.000Z', '2026-11-03T09:00:00.000Z'))} · 1h 0m`;
const ROW_3_LINE = `Row 3 ${flat(rangeOf('2026-11-03T10:00:00.000Z', '2026-11-03T11:00:00.000Z'))} · 1h 0m`;
/** A ready row the run never reached still shows its own range and duration (`time-import-row.tsx:104-126`). */
const ROW_4_LINE = `Row 4 ${flat(rangeOf('2026-11-03T12:00:00.000Z', '2026-11-03T12:30:00.000Z'))} · 0h 30m`;

const allowedOnly = { scenario: { extraPermissions: ['ALLOW_MANUAL_TIME'] } };

test.describe('time import settings ui', () => {
	test.afterEach(async () => {
		await mockReset();
	});

	test('the page of a member who may add time by hand', async ({ page, fixture, shield }) => {
		const requests = recordMockRequests(page);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true })).toBeVisible();
		await expect(page.getByText(PAGE_DESCRIPTION, { exact: true })).toBeVisible();

		// the mode switch: one `role="tablist"` named by its legend, two items, entries picked
		const switchTabs = page.getByRole('tablist', { name: msg('timeImport.workspace.MODE_LEGEND'), exact: true });
		await expect(
			switchTabs.getByRole('tab', { name: msg('timeImport.workspace.MODE_ENTRIES'), exact: true })
		).toHaveAttribute('aria-selected', 'true');
		await expect(
			switchTabs.getByRole('tab', { name: msg('timeImport.workspace.MODE_WORKSPACE'), exact: true })
		).toHaveAttribute('aria-selected', 'false');

		// the upload section
		const section = page.locator('#time-import');
		await expect(
			section.getByRole('heading', { level: 2, name: msg('timeImport.SECTION_TITLE'), exact: true })
		).toBeVisible();
		await expect(
			section.getByText(msg('timeImport.SECTION_DESCRIPTION', { team: fixture.names.teamA }), { exact: true })
		).toBeVisible();
		await expect(section.getByText(msg('timeImport.TEMPLATE_LABEL'), { exact: true })).toBeVisible();
		await expect(section.getByText(msg('timeImport.TEMPLATE_DESCRIPTION'), { exact: true })).toBeVisible();
		await expect(
			page.getByRole('button', { name: msg('timeImport.TEMPLATE_DOWNLOAD'), exact: true })
		).toBeVisible();
		const drop = page.getByRole('button', { name: msg('timeImport.DROP_TITLE'), exact: true });
		await expect(drop).toBeVisible();
		await expect(
			section.getByText(msg('timeImport.DROP_HINT', { megabytes: MAX_MEGABYTES, rows: MAX_ROWS }), {
				exact: true
			})
		).toBeVisible();
		await expect(
			section.getByText(
				msg('timeImport.OTHERS_NOTE', { team: fixture.names.teamA, column: CSV_HEADERS.memberEmail }),
				{ exact: true }
			)
		).toBeVisible();
		await expect(page.locator('input[type=file]')).toHaveAttribute('accept', '.csv,text/csv');

		// the columns guide: a `dt` chip with its requirement, a `dd` with the rule it is read by
		const guide = page.locator('section').filter({
			has: page.getByRole('heading', { level: 2, name: msg('timeImport.COLUMNS_TITLE'), exact: true })
		});
		await expect(
			guide.getByText(
				msg('timeImport.COLUMNS_DESCRIPTION', {
					timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
				}),
				{ exact: true }
			)
		).toBeVisible();
		const guideRows = await guide
			.locator('dt')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		report('guideRows', { count: guideRows.length, guideRows });
		expect(guideRows).toEqual([
			`${CSV_HEADERS.date}${msg('timeImport.columns.REQUIRED')}`,
			`${CSV_HEADERS.startTime}${msg('timeImport.columns.REQUIRED')}`,
			`${CSV_HEADERS.endTime}${msg('timeImport.columns.ONE_OF_TWO')}`,
			`${CSV_HEADERS.duration}${msg('timeImport.columns.ONE_OF_TWO')}`,
			CSV_HEADERS.project,
			CSV_HEADERS.task,
			CSV_HEADERS.notes,
			CSV_HEADERS.billable,
			CSV_HEADERS.memberEmail
		]);
		const guideRules = await guide
			.locator('dd')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		expect(guideRules.map(flat)).toEqual([
			flatMsg('timeImport.columns.DATE', EXAMPLES),
			flatMsg('timeImport.columns.START_TIME', EXAMPLES),
			flatMsg('timeImport.columns.END_TIME', EXAMPLES),
			flatMsg('timeImport.columns.DURATION', EXAMPLES),
			flatMsg('timeImport.columns.PROJECT'),
			// the viewer is the team's manager, so any task of the team counts (`time-import-access.ts:98`)
			flatMsg('timeImport.columns.TASK_ANY'),
			flatMsg('timeImport.columns.NOTES'),
			flatMsg('timeImport.columns.BILLABLE', EXAMPLES),
			flatMsg('timeImport.columns.MEMBER_EMAIL')
		]);

		// what the page read to get here, and what it did not read
		const paths = requests.paths();
		report('reads', { paths, conflict: 0, posts: 0 });
		expect(paths).toContain(`GET ${PERMISSIONS_ROUTE}`);
		expect(paths).toContain(`GET /api/organization/${fixture.ids.organizationA}`);
		expect(paths).toContain('GET /api/organization-team');
		expect(paths).toContain('GET /api/tasks/team');
		expect(paths.filter((call) => call.includes(CONFLICT_ROUTE))).toEqual([]);
		expect(paths.filter((call) => call.includes(TIME_LOG_ROUTE))).toEqual([]);

		expect(consoleFindings(shield)).toEqual([]);
		expect(shield.pageErrors()).toEqual([]);
	});

	test('the template an import may fill in, for this viewer', async ({ page, fixture, shield }) => {
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();

		const download = await downloadOf(
			page,
			page.getByRole('button', { name: msg('timeImport.TEMPLATE_DOWNLOAD'), exact: true })
		);
		report('templateManager', download);
		// `TIME_IMPORT_TEMPLATE_FILE_NAME` (`time-import-report.ts:11`); the BOM of `downloadCsv`
		// (`dashboard-export.ts:53-60`); the header alone — a template row could be imported as real time (`:22-26`).
		expect(download.fileName).toBe('time-import-template.csv');
		expect(download.firstBytes).toEqual([0xef, 0xbb, 0xbf]);
		expect(csvLines(download.text)).toEqual([
			[
				CSV_HEADERS.date,
				CSV_HEADERS.startTime,
				CSV_HEADERS.endTime,
				CSV_HEADERS.duration,
				CSV_HEADERS.project,
				CSV_HEADERS.task,
				CSV_HEADERS.notes,
				CSV_HEADERS.billable,
				CSV_HEADERS.memberEmail
			].join(',')
		]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('the template of a member who may not book other members', async ({ page, fixture, shield }) => {
		await signInAndVisit(page, fixture, PAGE, {
			scenario: { extraPermissions: ['ALLOW_MANUAL_TIME'], manager: false }
		});
		await expect(page.locator('#time-import')).toBeVisible();
		await expect(page.getByText(msg('timeImport.OWN_TIME_NOTE'), { exact: true })).toBeVisible();

		const download = await downloadOf(
			page,
			page.getByRole('button', { name: msg('timeImport.TEMPLATE_DOWNLOAD'), exact: true })
		);
		report('templateOwnTime', download);
		// `timeImportTemplateCsvColumnsOf(false)` drops the member email column (`time-import-report.ts:23-26`).
		expect(csvLines(download.text)).toEqual([
			[
				CSV_HEADERS.date,
				CSV_HEADERS.startTime,
				CSV_HEADERS.endTime,
				CSV_HEADERS.duration,
				CSV_HEADERS.project,
				CSV_HEADERS.task,
				CSV_HEADERS.notes,
				CSV_HEADERS.billable
			].join(',')
		]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a file it cannot read is refused whole, each with its own reason', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(page, {}, `/api/organization/${fixture.ids.organizationA}`);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();

		const rowLine = (index: number) => `2026-11-03,09:0${index}:00,10:00`;
		const cases: Array<{ name: string; buffer: Buffer; sentence: string; mimeType?: string }> = [
			{
				name: 'notes.txt',
				buffer: Buffer.from(GOOD_CSV),
				sentence: msg('timeImport.fileProblems.NOT_CSV')
			},
			{ name: 'empty.csv', buffer: Buffer.from(''), sentence: msg('timeImport.fileProblems.EMPTY') },
			{
				name: 'header-only.csv',
				buffer: Buffer.from('date,start time,end time'),
				sentence: msg('timeImport.fileProblems.NO_ROWS')
			},
			{
				name: 'unclosed.csv',
				buffer: Buffer.from('date,start time,end time\n"2026-11-03,09:00,10:00'),
				sentence: msg('timeImport.fileProblems.UNCLOSED_QUOTE', { row: 2 })
			},
			{
				name: 'duplicate.csv',
				buffer: Buffer.from('date,start time,end time,end time\n2026-11-03,09:00,10:00,11:00'),
				sentence: msg('timeImport.fileProblems.DUPLICATE_COLUMN', { column: CSV_HEADERS.endTime })
			},
			{
				name: 'no-time.csv',
				buffer: Buffer.from('date\n2026-11-03'),
				sentence: msg('timeImport.fileProblems.MISSING_COLUMNS', {
					count: 2,
					columns: listOf([
						CSV_HEADERS.startTime,
						msg('timeImport.fileProblems.END_OR_DURATION', {
							endTime: CSV_HEADERS.endTime,
							duration: CSV_HEADERS.duration
						})
					])
				})
			},
			{
				name: 'utf16.csv',
				buffer: Buffer.from([0xff, 0xfe, 0x00, 0x64, 0x00, 0x61]),
				sentence: msg('timeImport.fileProblems.NOT_TEXT')
			},
			{
				name: 'huge.csv',
				buffer: Buffer.from(`date,start time,end time\n${rowLine(1).repeat(60_000)}`, 'utf8'),
				sentence: msg('timeImport.fileProblems.TOO_LARGE', { megabytes: MAX_MEGABYTES })
			},
			{
				name: 'many.csv',
				buffer: Buffer.from(
					`date,start time,end time\n${Array.from({ length: MAX_ROWS + 1 }, (_, index) => `2026-11-03,09:${String(index % 50).padStart(2, '0')},10:00`).join('\n')}`,
					'utf8'
				),
				sentence: msg('timeImport.fileProblems.TOO_MANY_ROWS', { count: MAX_ROWS + 1, limit: MAX_ROWS })
			}
		];

		const seen: Array<{ name: string; text: string }> = [];
		for (const item of cases) {
			await pickFile(page, item.name, item.buffer, item.mimeType);
			const title = msg('timeImport.FILE_PROBLEM_TITLE', { fileName: item.name });
			await expect(page.getByText(title, { exact: true })).toBeVisible({ timeout: 25_000 });
			await expect(page.getByText(item.sentence, { exact: true })).toBeVisible();
			// refused while idle: the page stays ready for another file
			await expect(page.locator('input[type=file]')).toBeVisible();
			await expect(
				page.getByRole('tablist', { name: msg('timeImport.workspace.MODE_LEGEND'), exact: true })
			).toBeVisible();
			seen.push({ name: item.name, text: await sectionText(page) });
		}
		report('refusedFiles', {
			names: seen.map((item) => item.name),
			lastRefusal: seen[seen.length - 1]?.text,
			conflictReads: served.conflictQueries.length,
			posts: served.posts.length
		});
		// nothing was ever asked or sent for a refused file
		expect(served.conflictQueries).toEqual([]);
		expect(served.posts).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a file it reads by itself: the checking screen, then its rows', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(
			page,
			{ conflictDelayMs: 4000 },
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'march.csv', Buffer.from(GOOD_CSV));

		// the checking screen: one busy line, no upload area and no mode switch beside it
		const checking = page.locator('output[aria-busy="true"]');
		await expect(checking.first()).toBeVisible({ timeout: 25_000 });
		const checkingText = flat(await checking.first().innerText());
		report('checkingText', {
			checkingText,
			headings: await page
				.getByRole('heading')
				.evaluateAll((nodes) => nodes.map((node) => `${node.tagName}: ${node.textContent}`)),
			fileInputs: await page.locator('input[type=file]').count(),
			switchTabs: await page.getByRole('tab').count(),
			timeImportSection: await sectionText(page)
		});
		expect(checkingText).toEqual(
			flat(
				`${msg('timeImport.CHECKING_TITLE', { fileName: 'march.csv' })} ${msg(
					'timeImport.CHECKING_DESCRIPTION',
					{
						count: 2
					}
				)}`
			)
		);
		// `time-import-checking.tsx:29` renders its `SettingsSection` without an id
		expect(await sectionText(page)).toBe('<no #time-import>');

		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.PREVIEW_TITLE'), exact: true })
		).toBeVisible({ timeout: 25_000 });
		const previewText = await sectionText(page);
		report('preview', { previewText, shapes: served.shapes(), lookups: served.lookups() });
		expect(previewText).toContain(flatMsg('timeImport.PREVIEW_DESCRIPTION', { fileName: 'march.csv', count: 2 }));
		expect(previewText).toContain(flatMsg('timeImport.figures.READY'));
		expect(previewText).toContain(flatMsg('timeImport.status.READY'));
		expect(previewText).toContain(ROW_2_LINE);
		expect(previewText).toContain(ROW_3_LINE);
		expect(previewText).toContain('Fixture Project · Fixture active task · Billable · Pairing');
		// one whole-day read for one member and one day, nothing POSTed, and no `Change columns` to offer
		expect(served.lookups()).toEqual([
			{
				organizationId: fixture.ids.organizationA,
				employeeId: fixture.ids.employee,
				startDate: '2026-11-02T23:00:00.000Z',
				endDate: '2026-11-03T23:00:00.000Z',
				'relations[0]': 'task',
				'relations[1]': 'project'
			}
		]);
		expect(served.posts).toEqual([]);
		expect(await page.getByRole('button', { name: msg('timeImport.mapping.EDIT'), exact: true }).count()).toBe(0);
		await expect(
			page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 2 }), exact: true })
		).toBeVisible();
		// the mode switch is gone once a file is on its way (`time-import-settings-page.tsx:76`)
		expect(
			await page.getByRole('tablist', { name: msg('timeImport.workspace.MODE_LEGEND'), exact: true }).count()
		).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a file it cannot read by itself: the Columns step, then its rows', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(page, {}, `/api/organization/${fixture.ids.organizationA}`);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'other-tool.csv', Buffer.from(COLUMNS_CSV));

		const section = page.locator('#time-import');
		await expect(
			section.getByRole('heading', { level: 2, name: msg('timeImport.COLUMNS_TITLE'), exact: true })
		).toBeVisible();
		await expect(
			section.getByText(msg('timeImport.mapping.DESCRIPTION', { fileName: 'other-tool.csv' }), { exact: true })
		).toBeVisible();

		// one select per part of an entry, named by its label and its requirement, in the field order
		const combos = await page
			.getByRole('combobox')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		report('columnsStep', { combos, blocker: await section.locator('[role=status]').innerText() });
		/**
		 * A field select's accessible name: the label's own words and its requirement chip, space separated
		 * (`Date Required`, `Start time Required`, `End time One of the two`, and plain `Member` — `probe5-1.log`).
		 */
		const fieldCombo = (fieldKey: string, requirementKey?: string) =>
			[
				msg(`timeImport.mapping.fields.${fieldKey}`),
				...(requirementKey ? [msg(`timeImport.columns.${requirementKey}`)] : [])
			].join(' ');
		/**
		 * One pick of one of these selects. Only the popup of the select that is open is a **visible**
		 * `role="listbox"`: a closed popup stays mounted, hidden, and carries the same option names
		 * (`probe8-1.log` printed two `select-content` nodes with one visible; `subset-2.log` is where a plain
		 * `getByRole('option')` resolved to two). Escape closes it and the wait makes the next pick unambiguous
		 * (the whole flow is measured in `probe9-1.log`).
		 */
		const chooseColumn = async (comboName: string, columnName: string, exact = true) => {
			const combo = page.getByRole('combobox', { name: comboName, exact: true });
			await combo.click();
			await page.locator('[role="listbox"]:visible').getByRole('option', { name: columnName, exact }).click();
			await page.keyboard.press('Escape');
			await expect(page.locator('[role="listbox"]:visible')).toHaveCount(0);
		};
		const missingParts = [
			msg('timeImport.mapping.fields.DATE'),
			msg('timeImport.mapping.fields.START_TIME'),
			msg('timeImport.fileProblems.END_OR_DURATION', {
				endTime: msg('timeImport.mapping.fields.END_TIME'),
				duration: msg('timeImport.mapping.fields.DURATION')
			})
		];
		expect(combos).toEqual([
			`${msg('timeImport.mapping.CHOOSE_COLUMN')}`,
			`${msg('timeImport.mapping.CHOOSE_COLUMN')}`,
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE'),
			msg('timeImport.mapping.NOT_IN_FILE')
		]);
		await expect(section.locator('[role=status]')).toHaveText(
			msg('timeImport.mapping.MISSING', { parts: listOf(missingParts) })
		);
		const continueButton = page.getByRole('button', { name: msg('timeImport.mapping.CONTINUE', { count: 2 }) });
		await expect(continueButton).toBeDisabled();
		await expect(
			section.getByText(
				msg('timeImport.IGNORED_COLUMNS', { count: 4, columns: listOf(['k1', 'k2', 'k3', 'k4']) })
			)
		).toBeVisible();
		expect(served.conflictQueries).toEqual([]);

		await chooseColumn(fieldCombo('DATE', 'REQUIRED'), 'k1');
		await chooseColumn(fieldCombo('START_TIME', 'REQUIRED'), 'k2');
		await chooseColumn(fieldCombo('END_TIME', 'ONE_OF_TWO'), 'k3');
		await chooseColumn(fieldCombo('MEMBER'), 'k4');
		// the columns are chosen; only the way the dates are written is still open
		await expect(section.locator('[role=status]')).toHaveText(msg('timeImport.mapping.DATE_FORMAT_MISSING'));
		await expect(continueButton).toBeDisabled();
		const formatCombo = page.getByRole('combobox', { name: msg('timeImport.mapping.DATE_FORMAT'), exact: true });
		await expect(formatCombo).toBeVisible();
		// the select appears only once a date column is mapped (`time-import-columns-step.tsx:200-238`)
		await formatCombo.click();
		// the orders this file's dates allow, printed from the open popup before one of them is chosen
		const orderOptions = await page
			.locator('[role="listbox"]:visible [role="option"]')
			.evaluateAll((nodes) => nodes.map((node) => (node.textContent ?? '').replace(/\s+/g, ' ').trim()));
		report('dateOrderOptions', { orderOptions });
		await page
			.locator('[role="listbox"]:visible')
			.getByRole('option', { name: msg('timeImport.mapping.orders.DAY_FIRST'), exact: false })
			.click();
		await page.keyboard.press('Escape');
		await expect(page.locator('[role="listbox"]:visible')).toHaveCount(0);
		await expect(section.locator('[role=status]')).toHaveCount(0);
		await expect(continueButton).toBeEnabled();

		await continueButton.click();
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.PREVIEW_TITLE'), exact: true })
		).toBeVisible({ timeout: 25_000 });
		const previewText = await sectionText(page);
		report('columnsPreview', { previewText, lookups: served.lookups(), posts: served.posts.length });
		// both rows are for the teammate the file names, on two different days → two whole-day reads
		expect(previewText).toContain(
			flatMsg('timeImport.PREVIEW_DESCRIPTION', { fileName: 'other-tool.csv', count: 2 })
		);
		expect(previewText).toContain(flatMsg('timeImport.row.FOR_MEMBER', { name: fixture.names.teammate }));
		expect(previewText).toContain(flatMsg('timeImport.mapping.EDIT'));
		expect(served.lookups()).toEqual([
			{
				organizationId: fixture.ids.organizationA,
				employeeId: fixture.ids.teammateEmployee,
				startDate: '2026-11-02T23:00:00.000Z',
				endDate: '2026-11-03T23:00:00.000Z',
				'relations[0]': 'task',
				'relations[1]': 'project'
			},
			{
				organizationId: fixture.ids.organizationA,
				employeeId: fixture.ids.teammateEmployee,
				startDate: '2026-11-03T23:00:00.000Z',
				endDate: '2026-11-04T23:00:00.000Z',
				'relations[0]': 'task',
				'relations[1]': 'project'
			}
		]);
		expect(served.posts).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('choosing another file from the Columns step sends nothing', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(page, {}, `/api/organization/${fixture.ids.organizationA}`);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'other-tool.csv', Buffer.from(COLUMNS_CSV));
		await expect(page.getByRole('button', { name: msg('timeImport.CHOOSE_ANOTHER'), exact: true })).toBeVisible({
			timeout: 25_000
		});
		await page.getByRole('button', { name: msg('timeImport.CHOOSE_ANOTHER'), exact: true }).click();

		const idleText = await sectionText(page);
		report('afterChooseAnother', {
			idleText,
			switchTabs: await page.getByRole('tab').count(),
			shapes: served.shapes()
		});
		expect(idleText).toContain(flatMsg('timeImport.TEMPLATE_LABEL'));
		expect(idleText).toContain(flatMsg('timeImport.DROP_TITLE'));
		expect(
			await page.getByRole('tablist', { name: msg('timeImport.workspace.MODE_LEGEND'), exact: true }).count()
		).toBe(1);
		expect(await page.locator('input[type=file]').count()).toBe(1);
		expect(served.shapes()).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a check that fails says so, and Try again checks it again', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(
			page,
			{ conflictRefusal: { status: 500, message: 'this file refused the conflict read' } },
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'march.csv', Buffer.from(GOOD_CSV));

		await expect(
			page.getByText(msg('timeImport.CHECK_FAILED_TITLE', { fileName: 'march.csv' }), { exact: true })
		).toBeVisible({ timeout: 25_000 });
		await expect(page.getByText(msg('timeImport.CHECK_FAILED_DESCRIPTION'), { exact: true })).toBeVisible();
		const armed = served.conflictQueries.map((query) => armedHttpError('GET', `${CONFLICT_ROUTE}${query}`, 500));
		report('checkFailed', {
			sectionText: await sectionText(page),
			conflictReads: served.conflictQueries.length,
			posts: served.posts.length,
			consoleErrors: shield.consoleErrors()
		});
		expect(await sectionText(page)).toBe('<no #time-import>');
		expect(served.posts).toEqual([]);
		// the client's own line for the armed status, and the hook's dev-only log of the failed check, and nothing else
		expect(consoleFindings(shield, armed)).toEqual([]);

		served.stopRefusingConflicts();
		await page.getByRole('button', { name: msg('timeImport.RETRY'), exact: true }).click();
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.PREVIEW_TITLE'), exact: true })
		).toBeVisible({ timeout: 30_000 });
		report('afterRetry', { conflictReads: served.conflictQueries.length, posts: served.posts.length });
		expect(served.conflictQueries.length).toBeGreaterThan(1);
		expect(served.posts).toEqual([]);
		expect(await page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 2 }) }).count()).toBe(1);
	});

	test('confirming the import: one POST per row, and its report', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(page, {}, `/api/organization/${fixture.ids.organizationA}`);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'march.csv', Buffer.from(GOOD_CSV));
		const importButton = page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 2 }) });
		await expect(importButton).toBeVisible({ timeout: 25_000 });
		await importButton.click();

		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.REPORT_TITLE'), exact: true })
		).toBeVisible({ timeout: 30_000 });
		const reportText = await sectionText(page);
		report('doneReport', { reportText, shapes: served.shapes(), posts: served.posts });
		expect(reportText).toContain(flatMsg('timeImport.DONE_TITLE', { count: 2 }));
		expect(reportText).toContain(flatMsg('timeImport.DONE_DESCRIPTION', { duration: '2h 0m' }));
		expect(reportText).toContain(
			[
				`${flatMsg('timeImport.figures.SAVED')} 2`,
				`${flatMsg('timeImport.figures.LEFT_OUT')} 0`,
				`${flatMsg('timeImport.figures.FAILED')} 0`,
				`${flatMsg('timeImport.figures.NOT_SENT')} 0`,
				`${flatMsg('timeImport.figures.TIME_ADDED')} 2h 0m`
			].join(' ')
		);
		expect(reportText).toContain(`${ROW_2_LINE} Fixture Project · Fixture active task · Billable · Pairing Saved`);
		expect(reportText).toContain(`${ROW_3_LINE} Standup Saved`);

		// one `POST /api/timesheet/time-log` per ready row, with the body `addManualTime` sends
		expect(served.posts.map((post) => post.status)).toEqual([201, 201]);
		const shared = {
			tenantId: fixture.ids.tenantA,
			organizationId: fixture.ids.organizationA,
			organizationTeamId: fixture.ids.teamA,
			employeeId: fixture.ids.employee,
			logType: 'MANUAL',
			source: 'BROWSER'
		};
		expect(served.posts[0]?.body).toEqual({
			...shared,
			description: 'Pairing',
			isBillable: true,
			projectId: fixture.ids.project,
			taskId: fixture.ids.task,
			startedAt: '2026-11-03T08:00:00.000Z',
			stoppedAt: '2026-11-03T09:00:00.000Z'
		});
		expect(served.posts[1]?.body).toEqual({
			...shared,
			description: 'Standup',
			isBillable: false,
			startedAt: '2026-11-03T10:00:00.000Z',
			stoppedAt: '2026-11-03T11:00:00.000Z'
		});
		// the preview read, the last check before saving, then one more read per row before its POST
		expect(served.conflictQueries.length).toBe(4);

		const download = await downloadOf(
			page,
			page.getByRole('button', { name: msg('timeImport.DOWNLOAD_REPORT'), exact: true })
		);
		report('reportDownload', { fileName: download.fileName, lines: csvLines(download.text) });
		// `timeImportReportFileNameOf` names the local day the import ran (`time-import-report.ts:81-83`)
		const localDay = await page.evaluate(() => {
			const now = new Date();
			const month = String(now.getMonth() + 1).padStart(2, '0');
			const day = String(now.getDate()).padStart(2, '0');
			return `${now.getFullYear()}-${month}-${day}`;
		});
		expect(download.fileName).toBe(`time-import-report-${localDay}.csv`);
		expect(csvLines(download.text)).toEqual([
			[
				'row',
				CSV_HEADERS.date,
				CSV_HEADERS.startTime,
				CSV_HEADERS.endTime,
				CSV_HEADERS.duration,
				CSV_HEADERS.project,
				CSV_HEADERS.task,
				CSV_HEADERS.notes,
				CSV_HEADERS.billable,
				CSV_HEADERS.memberEmail,
				'status',
				'reason'
			].join(','),
			'2,2026-11-03,09:00,10:00,,Fixture Project,Fixture active task,Pairing,yes,,Saved,',
			'3,2026-11-03,11:00,12:00,,,,Standup,no,,Saved,'
		]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a row that overlaps recorded time is left out and never sent', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(
			page,
			{
				conflicts: [
					{
						id: 'c0000000-0000-4000-8000-000000000001',
						startedAt: '2026-11-03T09:30:00.000Z',
						stoppedAt: '2026-11-03T11:30:00.000Z',
						isRunning: false,
						taskId: null
					}
				]
			},
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'march.csv', Buffer.from(GOOD_CSV));
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.PREVIEW_TITLE'), exact: true })
		).toBeVisible({ timeout: 25_000 });

		const overlap = flatMsg('timeImport.problems.OVERLAPS_RECORDED', {
			count: 1,
			range: rangeOf('2026-11-03T09:30:00.000Z', '2026-11-03T11:30:00.000Z')
		});
		const previewText = await sectionText(page);
		report('overlapPreview', { previewText, overlap });
		expect(previewText).toContain(
			[flatMsg('timeImport.figures.READY'), '1', flatMsg('timeImport.figures.LEFT_OUT'), '1'].join(' ')
		);
		expect(previewText).toContain(`${ROW_2_LINE} Fixture Project · Fixture active task · Billable · Pairing Ready`);
		expect(previewText).toContain(`${ROW_3_LINE} Standup ${overlap} ${flatMsg('timeImport.status.LEFT_OUT')}`);

		await page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 1 }) }).click();
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.REPORT_TITLE'), exact: true })
		).toBeVisible({ timeout: 30_000 });
		const reportText = await sectionText(page);
		report('overlapReport', { reportText, posts: served.posts.map((post) => post.body.employeeId) });
		expect(reportText).toContain(flatMsg('timeImport.DONE_TITLE', { count: 1 }));
		expect(reportText).toContain(
			[
				`${flatMsg('timeImport.figures.SAVED')} 1`,
				`${flatMsg('timeImport.figures.LEFT_OUT')} 1`,
				`${flatMsg('timeImport.figures.FAILED')} 0`,
				`${flatMsg('timeImport.figures.NOT_SENT')} 0`
			].join(' ')
		);
		// the left-out row is never posted: one POST, and it is the ready row
		expect(served.posts).toHaveLength(1);
		expect(served.posts[0]?.body.description).toBe('Pairing');
		expect(reportText).toContain(`${ROW_3_LINE} Standup ${overlap} ${flatMsg('timeImport.status.LEFT_OUT')}`);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a row the API refuses stops the import and says which and why', async ({ page, fixture, shield }) => {
		const served = await serveTimeImport(
			page,
			{
				refusedPosts: [2],
				postRefusal: { status: 400, message: 'this file refused the row' }
			},
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import')).toBeVisible();
		await pickFile(page, 'march.csv', Buffer.from(THREE_ROW_CSV));
		await expect(page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 3 }) })).toBeVisible({
			timeout: 25_000
		});
		await page.getByRole('button', { name: msg('timeImport.IMPORT_ACTION', { count: 3 }) }).click();

		// the run ended in its report: the section heading is `Report` and the stopped sentence is the Notice title,
		// a `<p>` inside an `<output>` (`time-import-result.tsx:110-116`, `notice.tsx:48-50`), not a heading
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.REPORT_TITLE'), exact: true })
		).toBeVisible({ timeout: 30_000 });
		const stoppedTitle = msg('timeImport.STOPPED_TITLE', { row: 3 });
		await expect(page.getByText(stoppedTitle, { exact: true })).toBeVisible();
		const invalid = msg('toasts.REASONS.INVALID');
		const reportText = await sectionText(page);
		expect(reportText).toContain(stoppedTitle);
		report('stoppedReport', {
			reportText,
			posts: served.posts.map((post) => ({ status: post.status, description: post.body.description }))
		});
		// the same sentence is also the dev toast's line, so the notice is named inside the section, not by its text
		const notice = page.locator('#time-import output').filter({ hasText: stoppedTitle }).first();
		await expect(notice).toContainText(
			[
				invalid,
				flatMsg('timeImport.STOPPED_SAVED', { count: 1 }),
				flatMsg('timeImport.STOPPED_NOT_SENT', { count: 1 })
			].join(' ')
		);
		expect(reportText).toContain(
			[
				invalid,
				flatMsg('timeImport.STOPPED_SAVED', { count: 1 }),
				flatMsg('timeImport.STOPPED_NOT_SENT', { count: 1 })
			].join(' ')
		);
		expect(reportText).toContain(
			[
				`${flatMsg('timeImport.figures.SAVED')} 1`,
				`${flatMsg('timeImport.figures.LEFT_OUT')} 0`,
				`${flatMsg('timeImport.figures.FAILED')} 1`,
				`${flatMsg('timeImport.figures.NOT_SENT')} 1`,
				`${flatMsg('timeImport.figures.TIME_ADDED')} 1h 0m`
			].join(' ')
		);
		expect(reportText).toContain(`${ROW_2_LINE} Fixture Project · Fixture active task · Billable · Pairing Saved`);
		expect(reportText).toContain(`${ROW_3_LINE} Standup ${invalid} ${flatMsg('timeImport.status.FAILED')}`);
		expect(reportText).toContain(
			`${ROW_4_LINE} ${flatMsg('timeImport.row.NOT_SENT_REASON', { row: 3 })} ${flatMsg('timeImport.status.NOT_SENT')}`
		);

		// the refused row was sent once, and the row after it never was
		expect(served.posts.map((post) => ({ status: post.status, description: post.body.description }))).toEqual([
			{ status: 201, description: 'Pairing' },
			{ status: 400, description: 'Standup' }
		]);
		const armed = served.posts
			.filter((post) => post.status === 400)
			.map(() => armedHttpError('POST', TIME_LOG_ROUTE, 400));
		expect(consoleFindings(shield, armed)).toEqual([]);
	});

	test('a role that may not add time by hand gets no import', async ({ page, fixture, shield }) => {
		// the mock's own role permissions: five, none of them `ALLOW_MANUAL_TIME` (`mock-gauzy-server.mjs:49`)
		const requests = recordMockRequests(page);
		await signInAndVisit(page, fixture, PAGE);
		await expect(page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true })).toBeVisible();
		await expect(page.getByText(msg('timeImport.access.NO_PERMISSION_TITLE'), { exact: true })).toBeVisible();
		await expect(page.getByText(msg('timeImport.access.NO_PERMISSION_DESCRIPTION'), { exact: true })).toBeVisible();
		report('noPermission', {
			body: flat(await page.locator('body').innerText()).slice(-260),
			paths: requests.paths().filter((call) => call.includes('time-log'))
		});
		expect(await page.locator('#time-import').count()).toBe(0);
		expect(await page.locator('input[type=file]').count()).toBe(0);
		expect(await page.getByRole('tab').count()).toBe(0);
		expect(requests.paths().filter((call) => call.includes(CONFLICT_ROUTE))).toEqual([]);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('an organization that turns manual time off gets no import', async ({ page, fixture, shield }) => {
		await serveTimeImport(
			page,
			{
				// the mock's own organization (`mock-gauzy-server.mjs:86-96`) with its switch flipped
				organization: {
					id: fixture.ids.organizationA,
					name: fixture.names.organizationA,
					isDefault: true,
					profile_link: 'fixture-organization-a',
					totalEmployees: 3,
					banner: null,
					currency: 'USD',
					timeZone: 'UTC',
					allowManualTime: false,
					allowModifyTime: true,
					allowDeleteTime: true,
					tenantId: fixture.ids.tenantA
				}
			},
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.getByRole('heading', { level: 1, name: PAGE_TITLE, exact: true })).toBeVisible();
		await expect(page.getByText(msg('timeImport.access.MANUAL_TIME_OFF_TITLE'), { exact: true })).toBeVisible();
		const named = msg('timeImport.access.MANUAL_TIME_OFF_DESCRIPTION', {
			organization: fixture.names.organizationA
		});
		await expect(page.getByText(named, { exact: true })).toBeVisible({ timeout: 25_000 });
		report('manualTimeOff', { named, sectionCount: await page.locator('#time-import').count() });
		// the organization is named first, whatever the role holds (`time-import-access.ts:21-32`)
		expect(await page.locator('#time-import').count()).toBe(0);
		expect(await page.locator('input[type=file]').count()).toBe(0);
		expect(consoleFindings(shield)).toEqual([]);
	});

	test('a permissions read that fails says it could not get ready, and Try again opens it', async ({
		page,
		fixture,
		shield
	}) => {
		const served = await serveTimeImport(
			page,
			{ failPermissions: true },
			`/api/organization/${fixture.ids.organizationA}`
		);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.getByText(msg('timeImport.access.LOAD_FAILED_TITLE'), { exact: true })).toBeVisible({
			timeout: 25_000
		});
		await expect(page.getByText(msg('timeImport.access.LOAD_FAILED_DESCRIPTION'), { exact: true })).toBeVisible();
		const armed = armedHttpError('GET', PERMISSIONS_ROUTE, 502);
		report('loadFailed', {
			permissionsReads: served.permissionsReads(),
			sectionCount: await page.locator('#time-import').count(),
			consoleErrors: shield.consoleErrors()
		});
		expect(await page.locator('input[type=file]').count()).toBe(0);
		expect(shield.consoleErrors().every((line) => line.includes(armed) || line.includes(SHELL_STORE_NOISE))).toBe(
			true
		);

		served.stopFailingPermissions();
		const readsBefore = served.permissionsReads();
		await page.getByRole('button', { name: msg('timeImport.RETRY'), exact: true }).click();
		await expect(page.locator('#time-import input[type=file]')).toBeVisible({ timeout: 30_000 });
		report('afterLoadRetry', {
			permissionsReadsBefore: readsBefore,
			permissionsReadsAfter: served.permissionsReads(),
			uploadText: await sectionText(page)
		});
		// the read count of a failed read varies (TanStack retries, the dev-mode double mount), so only the
		// re-read after the Retry is pinned: `use-time-import-access.ts:65-69` invalidates the permissions query
		expect(served.permissionsReads()).toBeGreaterThan(readsBefore);
		expect(await sectionText(page)).toContain(flatMsg('timeImport.DROP_TITLE'));
	});

	test('the choice between the two imports, and the switch once a file is on its way', async ({
		page,
		fixture,
		shield
	}) => {
		await serveTimeImport(page, {}, `/api/organization/${fixture.ids.organizationA}`);
		await signInAndVisit(page, fixture, PAGE, allowedOnly);
		await expect(page.locator('#time-import input[type=file]')).toBeVisible();

		await page.getByRole('tab', { name: msg('timeImport.workspace.MODE_WORKSPACE'), exact: true }).click();
		const workspaceHeadings = await page
			.getByRole('heading')
			.evaluateAll((nodes) => nodes.map((node) => `${node.tagName}: ${node.textContent}`));
		report('workspaceMode', {
			workspaceHeadings,
			fileInputs: await page.locator('input[type=file]').count(),
			notice: flat(await page.locator('output').first().innerText())
		});
		// the page description follows the chosen import (`time-import-settings-page.tsx:200-203`)
		await expect(page.getByText(msg('timeImport.workspace.PAGE_DESCRIPTION'), { exact: true })).toBeVisible();
		// this role cannot start a workspace import, so its first landmark is that refusal
		// (`workspace-import-flow.tsx:54-66`)
		await expect(page.getByText(msg('timeImport.workspace.NO_RIGHTS_TITLE'), { exact: true })).toBeVisible();
		expect(await page.locator('#time-import').count()).toBe(0);
		expect(
			await page.getByRole('tablist', { name: msg('timeImport.workspace.MODE_LEGEND'), exact: true }).count()
		).toBe(1);

		await page.getByRole('tab', { name: msg('timeImport.workspace.MODE_ENTRIES'), exact: true }).click();
		await expect(page.getByText(PAGE_DESCRIPTION, { exact: true })).toBeVisible();
		await expect(page.locator('#time-import input[type=file]')).toBeVisible();

		// once a file is on its way the switch is gone (`time-import-settings-page.tsx:76`); the row filter is a
		// second `role="tablist"`, "Rows shown" (`time-import-result.tsx:295-304`)
		await pickFile(page, 'march.csv', Buffer.from(GOOD_CSV));
		await expect(
			page.getByRole('heading', { level: 2, name: msg('timeImport.PREVIEW_TITLE'), exact: true })
		).toBeVisible({ timeout: 25_000 });
		const tablists = await page
			.getByRole('tablist')
			.evaluateAll((nodes) => nodes.map((node) => node.getAttribute('aria-label')));
		report('tablistsAfterFile', { tablists });
		expect(tablists).toEqual([msg('timeImport.filter.LABEL')]);
		expect(consoleFindings(shield)).toEqual([]);
	});
});
