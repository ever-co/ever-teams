import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import {
	cellDayOf,
	cellMomentOf,
	durationSecondsOf,
	yesNoOf,
	type CalendarDay,
	type CellMoment,
	type ClockTime,
	type DateOrder
} from '@/core/lib/utils/time-import-cells';
import type { TimeImportCells, TimeImportSheetRow } from '@/core/lib/utils/time-import-sheet';
import {
	overlapSummaryOf,
	sharesTimeWith,
	type OverlapCandidateLog,
	type TimePeriod
} from '@/core/lib/utils/time-log-overlap';
import { ETimeLogSource, ETimeLogType } from '@/core/types/generics/enums/timer';
import type { TAddManualTimeRequest } from '@/core/types/schemas';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const LONGEST_ENTRY_SECONDS = 24 * 60 * SECONDS_PER_MINUTE;

export interface TimeImportMember {
	employeeId: string;
	email: string;
	name: string;
}

export interface TimeImportProject {
	id: string;
	name: string;
}

export interface TimeImportTask {
	id: string;
	title: string;
	projectId: string | null;
	assigneeEmployeeIds: ReadonlyArray<string>;
}

export interface TimeImportContext {
	now: Date;
	/** The organization's `futureDateAllowed`: without it the API refuses an entry that ends after now. */
	allowsFutureDates: boolean;
	/** The organization's `requireProject`, which the API holds every time entry to. */
	requiresProject: boolean;
	/** The API files an entry without a project under the team's default one, when the team has one. */
	teamHasDefaultProject: boolean;
	viewerEmployeeId: string | null;
	viewerEmail: string | null;
	/** Whether the API lets the viewer add time for another member of the team. */
	canImportForOthers: boolean;
	/** A team manager may name any task of the team, as in the Add time dialog; anyone else their own tasks. */
	matchesEveryTeamTask: boolean;
	members: ReadonlyArray<TimeImportMember>;
	projects: ReadonlyArray<TimeImportProject>;
	tasks: ReadonlyArray<TimeImportTask>;
}

export type TimeImportProblem =
	| { code: 'extraCells' }
	| { code: 'dateUnreadable'; order: DateOrder }
	| { code: 'startUnreadable' }
	| { code: 'startDayMismatch' }
	| { code: 'endMissing' }
	| { code: 'endUnreadable' }
	| { code: 'endDateUnreadable' }
	| { code: 'endDayMismatch' }
	| { code: 'durationUnreadable' }
	| { code: 'endNotAfterStart' }
	| { code: 'durationMismatch' }
	| { code: 'tooLong' }
	| { code: 'inFuture' }
	| { code: 'billableUnreadable' }
	| { code: 'memberUnknown' }
	| { code: 'memberNotAllowed' }
	| { code: 'noOwnMember' }
	| { code: 'projectUnknown' }
	| { code: 'projectAmbiguous'; count: number }
	| { code: 'projectRequired' }
	| { code: 'taskUnknown' }
	| { code: 'taskNotAssigned' }
	| { code: 'taskAmbiguous'; count: number }
	| { code: 'alreadyRecorded' }
	| { code: 'overlapsRecorded'; count: number; start: Date; end: Date }
	| { code: 'sameAsRow'; row: number }
	| { code: 'overlapsRow'; row: number };

export interface TimeImportEntry {
	employeeId: string;
	/** Null when the time is the viewer's own. */
	memberName: string | null;
	start: Date;
	end: Date;
	seconds: number;
	projectId: string | null;
	projectName: string | null;
	taskId: string | null;
	taskTitle: string | null;
	notes: string;
	isBillable: boolean;
}

export interface TimeImportRow {
	/** The row's position in the file, as a spreadsheet numbers it. */
	row: number;
	cells: TimeImportCells;
	/** Null while a cell cannot be read; kept on a row left out for an overlap, to show what it holds. */
	entry: TimeImportEntry | null;
	/** Why the row is left out. An empty list is a row ready to be imported. */
	problems: ReadonlyArray<TimeImportProblem>;
}

export type TimeImportRecordedLog = OverlapCandidateLog & { taskId?: string | null };

/** One read of a member's recorded time: a whole day, in the viewer's time zone. */
export interface TimeImportLookup {
	key: string;
	employeeId: string;
	start: Date;
	end: Date;
}

interface ResolvedMember {
	employeeId: string;
	name: string | null;
}

interface Reading<Value> {
	value: Value | null;
	problems: TimeImportProblem[];
}

function comparableOf(text: string): string {
	const composed = text.normalize('NFC');
	const trimmed = composed.trim();
	return trimmed.toLowerCase();
}

function isSameName(first: string, second: string): boolean {
	return comparableOf(first) === comparableOf(second);
}

/** In the viewer's time zone, the way the Add time dialog builds an entry from its date and its times. */
function localDateOf(day: CalendarDay, clock: ClockTime): Date {
	return new Date(day.year, day.month - 1, day.day, clock.hours, clock.minutes, clock.seconds);
}

function secondsBetween(start: Date, end: Date): number {
	const milliseconds = end.getTime() - start.getTime();
	return Math.round(milliseconds / MS_PER_SECOND);
}

interface TypedMoment {
	day: CalendarDay;
	clock: ClockTime;
}

interface TypedPeriod {
	start: TypedMoment;
	/** Null when the row gives a duration in place of an end time. */
	end: TypedMoment | null;
	durationSeconds: number | null;
}

function isSameCalendarDay(first: CalendarDay, second: CalendarDay): boolean {
	const isSameYear = first.year === second.year;
	const isSameMonth = first.month === second.month;
	const isSameDate = first.day === second.day;
	return isSameYear && isSameMonth && isSameDate;
}

/** A time cell that holds its own date, and a date column, may name two different days for the same moment. */
function daysDisagree(cellDay: CalendarDay | null, columnDay: CalendarDay | null): boolean {
	if (!cellDay || !columnDay) {
		return false;
	}
	return !isSameCalendarDay(cellDay, columnDay);
}

/**
 * The start and the end of a row as typed, its dates read in the order of the file. A start or an end may hold its
 * own date; a time alone takes the date of its row, and an end time without an end date ends on the start's day.
 */
function typedPeriodOf(cells: TimeImportCells, order: DateOrder): Reading<TypedPeriod> {
	const problems: TimeImportProblem[] = [];
	const hasDate = cells.date !== '';
	const dateDay = cellDayOf(cells.date, order);
	const startMoment = cellMomentOf(cells.startTime, order);
	const startDay = startMoment?.day ?? dateDay;
	const isDateUnreadable = hasDate && dateDay === null;
	const hasNoDay = startDay === null;
	if (isDateUnreadable || hasNoDay) {
		problems.push({ code: 'dateUnreadable', order });
	}
	if (!startMoment) {
		problems.push({ code: 'startUnreadable' });
	}
	if (daysDisagree(startMoment?.day ?? null, dateDay)) {
		problems.push({ code: 'startDayMismatch' });
	}
	const hasEndTime = cells.endTime !== '';
	const hasDuration = cells.duration !== '';
	if (!hasEndTime && !hasDuration) {
		problems.push({ code: 'endMissing' });
	}
	let endMoment: CellMoment | null = null;
	if (hasEndTime) {
		endMoment = cellMomentOf(cells.endTime, order);
	}
	if (hasEndTime && !endMoment) {
		problems.push({ code: 'endUnreadable' });
	}
	const hasEndDate = cells.endDate !== '';
	const endDateDay = cellDayOf(cells.endDate, order);
	if (hasEndDate && !endDateDay) {
		problems.push({ code: 'endDateUnreadable' });
	}
	if (daysDisagree(endMoment?.day ?? null, endDateDay)) {
		problems.push({ code: 'endDayMismatch' });
	}
	let durationSeconds: number | null = null;
	if (hasDuration) {
		durationSeconds = durationSecondsOf(cells.duration);
	}
	if (hasDuration && durationSeconds === null) {
		problems.push({ code: 'durationUnreadable' });
	}
	if (problems.length > 0) {
		return { value: null, problems };
	}
	if (!startDay || !startMoment) {
		return { value: null, problems };
	}
	const start: TypedMoment = { day: startDay, clock: startMoment.clock };
	let end: TypedMoment | null = null;
	if (endMoment) {
		const endDay = endMoment.day ?? endDateDay ?? startDay;
		end = { day: endDay, clock: endMoment.clock };
	}
	return { value: { start, end, durationSeconds }, problems };
}

function endOf(typed: TypedPeriod, start: Date): Date {
	if (typed.end) {
		return localDateOf(typed.end.day, typed.end.clock);
	}
	const durationSeconds = typed.durationSeconds ?? 0;
	return new Date(start.getTime() + durationSeconds * MS_PER_SECOND);
}

/** An end time and a duration on the same row must tell the same length, to the minute. */
function disagreesWithDuration(typed: TypedPeriod, seconds: number): boolean {
	const hasBoth = typed.end !== null && typed.durationSeconds !== null;
	if (!hasBoth) {
		return false;
	}
	const difference = Math.abs(seconds - (typed.durationSeconds ?? 0));
	return difference >= SECONDS_PER_MINUTE;
}

function periodOf(cells: TimeImportCells, context: TimeImportContext, order: DateOrder): Reading<TimePeriod> {
	const typed = typedPeriodOf(cells, order);
	if (!typed.value) {
		return { value: null, problems: typed.problems };
	}
	const start = localDateOf(typed.value.start.day, typed.value.start.clock);
	const end = endOf(typed.value, start);
	const seconds = secondsBetween(start, end);
	if (seconds <= 0) {
		return { value: null, problems: [{ code: 'endNotAfterStart' }] };
	}
	const problems: TimeImportProblem[] = [];
	if (disagreesWithDuration(typed.value, seconds)) {
		problems.push({ code: 'durationMismatch' });
	}
	if (seconds > LONGEST_ENTRY_SECONDS) {
		problems.push({ code: 'tooLong' });
	}
	const endsAfterNow = end.getTime() > context.now.getTime();
	if (endsAfterNow && !context.allowsFutureDates) {
		problems.push({ code: 'inFuture' });
	}
	return { value: { start, end }, problems };
}

function billableOf(cell: string): Reading<boolean> {
	if (cell === '') {
		return { value: false, problems: [] };
	}
	const isBillable = yesNoOf(cell);
	if (isBillable === null) {
		return { value: null, problems: [{ code: 'billableUnreadable' }] };
	}
	return { value: isBillable, problems: [] };
}

function viewerAsMember(context: TimeImportContext): Reading<ResolvedMember> {
	if (!context.viewerEmployeeId) {
		return { value: null, problems: [{ code: 'noOwnMember' }] };
	}
	return { value: { employeeId: context.viewerEmployeeId, name: null }, problems: [] };
}

/**
 * Whose time the row is. A file is never trusted to book time for someone else: an email other than the viewer's
 * own only counts for a viewer the API lets add time for that member, and leaves the row out for anyone else.
 */
function memberOf(email: string, context: TimeImportContext): Reading<ResolvedMember> {
	const namesNobody = email === '';
	const namesViewer = isSameName(email, context.viewerEmail ?? '');
	if (namesNobody || namesViewer) {
		return viewerAsMember(context);
	}
	if (!context.canImportForOthers) {
		return { value: null, problems: [{ code: 'memberNotAllowed' }] };
	}
	const member = context.members.find((candidate) => isSameName(candidate.email, email));
	if (!member) {
		return { value: null, problems: [{ code: 'memberUnknown' }] };
	}
	const isViewer = member.employeeId === context.viewerEmployeeId;
	if (isViewer) {
		return viewerAsMember(context);
	}
	return { value: { employeeId: member.employeeId, name: member.name }, problems: [] };
}

function projectOf(name: string, context: TimeImportContext): Reading<TimeImportProject> {
	if (name === '') {
		return { value: null, problems: [] };
	}
	const matches = context.projects.filter((project) => isSameName(project.name, name));
	if (matches.length === 0) {
		return { value: null, problems: [{ code: 'projectUnknown' }] };
	}
	if (matches.length > 1) {
		return { value: null, problems: [{ code: 'projectAmbiguous', count: matches.length }] };
	}
	return { value: matches[0], problems: [] };
}

function tasksOfMember(member: ResolvedMember, context: TimeImportContext): ReadonlyArray<TimeImportTask> {
	if (context.matchesEveryTeamTask) {
		return context.tasks;
	}
	return context.tasks.filter((task) => task.assigneeEmployeeIds.includes(member.employeeId));
}

function taskOf(title: string, member: ResolvedMember | null, context: TimeImportContext): Reading<TimeImportTask> {
	// Without a member there is no list of tasks to look the title up in; the row is left out for its member
	if (title === '' || !member) {
		return { value: null, problems: [] };
	}
	const memberTasks = tasksOfMember(member, context);
	const matches = memberTasks.filter((task) => isSameName(task.title, title));
	if (matches.length === 1) {
		return { value: matches[0], problems: [] };
	}
	if (matches.length > 1) {
		return { value: null, problems: [{ code: 'taskAmbiguous', count: matches.length }] };
	}
	const isTaskOfTeam = context.tasks.some((task) => isSameName(task.title, title));
	if (isTaskOfTeam) {
		return { value: null, problems: [{ code: 'taskNotAssigned' }] };
	}
	return { value: null, problems: [{ code: 'taskUnknown' }] };
}

/**
 * Whether the API would refuse the row for its missing project. It fills an entry that names none from its task,
 * then from the team's default project, and refuses it only when both are empty.
 */
function missesRequiredProject(cells: TimeImportCells, task: TimeImportTask | null, context: TimeImportContext) {
	const namesProject = cells.project !== '';
	if (!context.requiresProject || namesProject) {
		return false;
	}
	const hasTaskProject = Boolean(task?.projectId);
	return !hasTaskProject && !context.teamHasDefaultProject;
}

function draftRowOf(sheetRow: TimeImportSheetRow, context: TimeImportContext, order: DateOrder): TimeImportRow {
	const { row, cells } = sheetRow;
	// Its cells are shifted from the extra one on, so what the others seem to hold is not judged
	if (sheetRow.extraCellCount > 0) {
		return { row, cells, entry: null, problems: [{ code: 'extraCells' }] };
	}
	const period = periodOf(cells, context, order);
	const billable = billableOf(cells.billable);
	const member = memberOf(cells.memberEmail, context);
	const project = projectOf(cells.project, context);
	const task = taskOf(cells.task, member.value, context);
	const problems: TimeImportProblem[] = [
		...period.problems,
		...billable.problems,
		...member.problems,
		...project.problems,
		...task.problems
	];
	const isTaskSettled = task.problems.length === 0;
	if (isTaskSettled && missesRequiredProject(cells, task.value, context)) {
		problems.push({ code: 'projectRequired' });
	}
	if (problems.length > 0) {
		return { row, cells, entry: null, problems };
	}
	if (!period.value || !member.value) {
		return { row, cells, entry: null, problems };
	}
	const entry: TimeImportEntry = {
		employeeId: member.value.employeeId,
		memberName: member.value.name,
		start: period.value.start,
		end: period.value.end,
		seconds: secondsBetween(period.value.start, period.value.end),
		projectId: project.value?.id ?? null,
		projectName: project.value?.name ?? null,
		taskId: task.value?.id ?? null,
		taskTitle: task.value?.title ?? null,
		notes: cells.notes,
		isBillable: billable.value ?? false
	};
	return { row, cells, entry, problems };
}

/**
 * Judges every row on its own cells: dates and times, the member, the project and the task, the dates read in the
 * order of the file. Nothing here asks the API anything; whether a row overlaps recorded time is settled afterwards
 * by `checkedRowsOf`.
 */
export function draftRowsOf(
	sheetRows: ReadonlyArray<TimeImportSheetRow>,
	context: TimeImportContext,
	order: DateOrder = 'yearFirst'
): TimeImportRow[] {
	return sheetRows.map((sheetRow) => draftRowOf(sheetRow, context, order));
}

export function isReadyRow(row: TimeImportRow): row is TimeImportRow & { entry: TimeImportEntry } {
	return row.problems.length === 0 && row.entry !== null;
}

function nextDayOf(dayStart: Date): Date {
	return new Date(dayStart.getFullYear(), dayStart.getMonth(), dayStart.getDate() + 1);
}

/** The days, in the viewer's time zone, an entry has time on: two for an entry that runs past midnight. */
function dayStartsOf(entry: TimeImportEntry): Date[] {
	const dayStarts: Date[] = [];
	let dayStart = new Date(entry.start.getFullYear(), entry.start.getMonth(), entry.start.getDate());
	while (dayStart.getTime() < entry.end.getTime()) {
		dayStarts.push(dayStart);
		dayStart = nextDayOf(dayStart);
	}
	return dayStarts;
}

function lookupKeyOf(employeeId: string, dayStart: Date): string {
	return `${employeeId}:${localDayKeyOf(dayStart)}`;
}

/**
 * The reads of recorded time a file needs: one per member and day its rows have time on, the whole day, so the
 * rows are then compared with what is recorded without asking the API once per row.
 */
export function timeImportLookupsOf(rows: ReadonlyArray<TimeImportRow>): TimeImportLookup[] {
	const lookups = new Map<string, TimeImportLookup>();
	for (const row of rows) {
		if (!isReadyRow(row)) {
			continue;
		}
		const { employeeId } = row.entry;
		for (const dayStart of dayStartsOf(row.entry)) {
			const key = lookupKeyOf(employeeId, dayStart);
			if (!lookups.has(key)) {
				lookups.set(key, { key, employeeId, start: dayStart, end: nextDayOf(dayStart) });
			}
		}
	}
	return [...lookups.values()];
}

function recordedLogsOf(
	entry: TimeImportEntry,
	logsByLookup: ReadonlyMap<string, ReadonlyArray<TimeImportRecordedLog>>
): TimeImportRecordedLog[] {
	const logs: TimeImportRecordedLog[] = [];
	for (const dayStart of dayStartsOf(entry)) {
		const dayLogs = logsByLookup.get(lookupKeyOf(entry.employeeId, dayStart)) ?? [];
		logs.push(...dayLogs);
	}
	return logs;
}

function timeOf(value: string | null | undefined): number | null {
	if (!value) {
		return null;
	}
	const time = new Date(value).getTime();
	if (Number.isNaN(time)) {
		return null;
	}
	return time;
}

function isRecordedAlready(log: TimeImportRecordedLog, entry: TimeImportEntry): boolean {
	const hasSameStart = timeOf(log.startedAt) === entry.start.getTime();
	const hasSameEnd = timeOf(log.stoppedAt) === entry.end.getTime();
	const hasSameTask = (log.taskId ?? null) === entry.taskId;
	const isStopped = log.isRunning !== true;
	return hasSameStart && hasSameEnd && hasSameTask && isStopped;
}

function recordedProblemOf(
	entry: TimeImportEntry,
	logs: ReadonlyArray<TimeImportRecordedLog>,
	now: Date
): TimeImportProblem | null {
	const isAlreadyRecorded = logs.some((log) => isRecordedAlready(log, entry));
	if (isAlreadyRecorded) {
		return { code: 'alreadyRecorded' };
	}
	const period: TimePeriod = { start: entry.start, end: entry.end };
	const overlap = overlapSummaryOf({ periods: [period], logs, now });
	const firstOverlapped = overlap.entries[0];
	if (!firstOverlapped) {
		return null;
	}
	return {
		code: 'overlapsRecorded',
		count: overlap.entries.length,
		start: firstOverlapped.start,
		end: firstOverlapped.end
	};
}

function isSameTimeAndTask(first: TimeImportEntry, second: TimeImportEntry): boolean {
	const hasSameStart = first.start.getTime() === second.start.getTime();
	const hasSameEnd = first.end.getTime() === second.end.getTime();
	const hasSameTask = first.taskId === second.taskId;
	return hasSameStart && hasSameEnd && hasSameTask;
}

interface AcceptedRow {
	row: number;
	entry: TimeImportEntry;
}

function fileProblemOf(entry: TimeImportEntry, acceptedRows: ReadonlyArray<AcceptedRow>): TimeImportProblem | null {
	const period: TimePeriod = { start: entry.start, end: entry.end };
	for (const accepted of acceptedRows) {
		const isSameMember = accepted.entry.employeeId === entry.employeeId;
		if (!isSameMember) {
			continue;
		}
		const overlaps = sharesTimeWith(period, accepted.entry.start, accepted.entry.end);
		if (!overlaps) {
			continue;
		}
		if (isSameTimeAndTask(entry, accepted.entry)) {
			return { code: 'sameAsRow', row: accepted.row };
		}
		return { code: 'overlapsRow', row: accepted.row };
	}
	return null;
}

interface TimeImportCheck {
	rows: ReadonlyArray<TimeImportRow>;
	/** The member's recorded entries of each lookup of `timeImportLookupsOf`, under the lookup's key. */
	logsByLookup: ReadonlyMap<string, ReadonlyArray<TimeImportRecordedLog>>;
	now: Date;
}

/**
 * Leaves out every row that shares time with an entry already recorded, or with a row above it that is imported.
 * Saving manual time over another entry of the member makes the API remove that whole entry, so such a row is
 * never saved: neither over recorded time, nor over a row this same import saves first. The first of two rows of
 * the file that overlap keeps its place.
 */
export function checkedRowsOf({ rows, logsByLookup, now }: TimeImportCheck): TimeImportRow[] {
	const acceptedRows: AcceptedRow[] = [];
	return rows.map((row) => {
		if (!isReadyRow(row)) {
			return row;
		}
		const logs = recordedLogsOf(row.entry, logsByLookup);
		const recordedProblem = recordedProblemOf(row.entry, logs, now);
		const problem = recordedProblem ?? fileProblemOf(row.entry, acceptedRows);
		if (problem) {
			return { ...row, problems: [problem] };
		}
		acceptedRows.push({ row: row.row, entry: row.entry });
		return row;
	});
}

interface TimeImportSummary {
	rowCount: number;
	readyCount: number;
	leftOutCount: number;
	readySeconds: number;
}

export function timeImportSummaryOf(rows: ReadonlyArray<TimeImportRow>): TimeImportSummary {
	const readyRows = rows.filter(isReadyRow);
	let readySeconds = 0;
	for (const row of readyRows) {
		readySeconds += row.entry.seconds;
	}
	return {
		rowCount: rows.length,
		readyCount: readyRows.length,
		leftOutCount: rows.length - readyRows.length,
		readySeconds
	};
}

/** Whether two checks of the same file agree on what is imported: the same rows, with the same times. */
export function haveSameReadyRows(first: ReadonlyArray<TimeImportRow>, second: ReadonlyArray<TimeImportRow>): boolean {
	const firstReady = first.filter(isReadyRow);
	const secondReady = second.filter(isReadyRow);
	if (firstReady.length !== secondReady.length) {
		return false;
	}
	return firstReady.every((row, index) => {
		const other = secondReady[index];
		const isSameRow = row.row === other.row;
		const isSameMember = row.entry.employeeId === other.entry.employeeId;
		const hasSameTimeAndTask = isSameTimeAndTask(row.entry, other.entry);
		return isSameRow && isSameMember && hasSameTimeAndTask;
	});
}

export interface TimeImportSaveScope {
	tenantId: string;
	organizationId: string | null;
	/** The team the time is saved with: the one whose projects and tasks the file was matched against. */
	organizationTeamId: string;
}

/** The body of the manual time call, with the fields the Add time dialog sends. */
export function manualTimeRequestOf(entry: TimeImportEntry, scope: TimeImportSaveScope): TAddManualTimeRequest {
	const request: TAddManualTimeRequest = {
		tenantId: scope.tenantId,
		organizationId: scope.organizationId,
		organizationTeamId: scope.organizationTeamId,
		employeeId: entry.employeeId,
		startedAt: entry.start,
		stoppedAt: entry.end,
		description: entry.notes,
		isBillable: entry.isBillable,
		logType: ETimeLogType.MANUAL,
		source: ETimeLogSource.BROWSER
	};
	if (entry.projectId) {
		request.projectId = entry.projectId;
	}
	if (entry.taskId) {
		request.taskId = entry.taskId;
	}
	return request;
}

export type TimeImportOutcome = { kind: 'saved' } | { kind: 'failed'; reasonKey: string };

/** What an import did so far, by row. Rows are saved in file order and the run stops at the first refusal. */
export interface TimeImportRun {
	outcomes: ReadonlyMap<number, TimeImportOutcome>;
	isFinished: boolean;
}

export type TimeImportRowStatus = 'ready' | 'leftOut' | 'saved' | 'failed' | 'notSent';

export function rowStatusOf(row: TimeImportRow, run: TimeImportRun | null): TimeImportRowStatus {
	if (!isReadyRow(row)) {
		return 'leftOut';
	}
	if (!run) {
		return 'ready';
	}
	const outcome = run.outcomes.get(row.row);
	if (outcome) {
		return outcome.kind;
	}
	if (run.isFinished) {
		return 'notSent';
	}
	return 'ready';
}

export interface TimeImportReport {
	savedCount: number;
	savedSeconds: number;
	leftOutCount: number;
	failedCount: number;
	/** Ready rows the run never sent, because it stopped at a refusal before them. */
	notSentCount: number;
	/** The row the API refused, where the run stopped, with the key of the reason; null when every row was saved. */
	refusal: { row: number; reasonKey: string } | null;
}

export function timeImportReportOf(rows: ReadonlyArray<TimeImportRow>, run: TimeImportRun): TimeImportReport {
	const report: TimeImportReport = {
		savedCount: 0,
		savedSeconds: 0,
		leftOutCount: 0,
		failedCount: 0,
		notSentCount: 0,
		refusal: null
	};
	for (const row of rows) {
		const status = rowStatusOf(row, run);
		if (status === 'saved') {
			report.savedCount += 1;
			report.savedSeconds += row.entry?.seconds ?? 0;
		}
		if (status === 'leftOut') {
			report.leftOutCount += 1;
		}
		if (status === 'failed') {
			report.failedCount += 1;
		}
		if (status === 'notSent') {
			report.notSentCount += 1;
		}
		const outcome = run.outcomes.get(row.row);
		if (outcome?.kind === 'failed') {
			report.refusal = { row: row.row, reasonKey: outcome.reasonKey };
		}
	}
	return report;
}
