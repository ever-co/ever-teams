import { addHours, endOfDay, isSameDay, startOfDay, startOfHour } from 'date-fns';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { endOfLog, startOfLog } from '@/core/lib/utils/dashboards/timesheets';
import type { Period } from '@/core/lib/utils/dashboard-period';

const MINUTES_PER_HOUR = 60;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const MIN_TIMELINE_HOURS = 8;
const DEFAULT_FIRST_HOUR = 8;
const MIN_HEAT_ROWS = 8;
const MAX_HEAT_ROWS = 14;
const SHOWN_PROJECTS = 4;
const NO_PROJECT_KEY = 'no-project';

export interface DayPerson {
	employeeId: string;
	name: string;
	imageUrl: string | null;
}

export interface TimelineBlock {
	key: string;
	start: Date;
	end: Date;
	seconds: number;
	leftPercent: number;
	widthPercent: number;
	projectKey: string;
	projectName: string;
	projectColor: string | null;
	taskTitle: string;
	isRunning: boolean;
}

export interface TimelineLane {
	person: DayPerson;
	seconds: number;
	blocks: TimelineBlock[];
}

export interface TimelineProject {
	key: string;
	name: string;
	color: string | null;
	seconds: number;
	share: number;
	isOther: boolean;
	otherCount: number;
}

export interface DayTimeline {
	firstHour: number;
	lastHour: number;
	hours: number[];
	lanes: TimelineLane[];
	projects: TimelineProject[];
	seconds: number;
	nowPercent: number | null;
}

export interface HeatCell {
	key: string;
	weekday: number;
	hour: number;
	seconds: number;
	level: number;
}

export interface HourHeat {
	hours: number[];
	/** Hours per row: 1, or 2 when the worked hours span more rows than the card holds. */
	hourStep: number;
	cells: Map<string, HeatCell>;
	maxSeconds: number;
	hasTime: boolean;
}

function secondsBetween(start: Date, end: Date) {
	const milliseconds = end.getTime() - start.getTime();
	return Math.max(0, Math.round(milliseconds / MILLISECONDS_PER_SECOND));
}

function personNameOf(log: ITimeLog) {
	const employee = log.employee;
	const fullName = employee?.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	const user = employee?.user;
	const first = user?.firstName?.trim() ?? '';
	const last = user?.lastName?.trim() ?? '';
	const joined = `${first} ${last}`.trim();
	return joined;
}

function employeeIdOfLog(log: ITimeLog) {
	return log.employeeId ?? log.employee?.id ?? null;
}

export function isLogOfEmployee(log: ITimeLog, employeeId: string) {
	return employeeIdOfLog(log) === employeeId;
}

function personOfLog(log: ITimeLog, known: ReadonlyMap<string, DayPerson>): DayPerson | null {
	const employeeId = employeeIdOfLog(log);
	if (!employeeId) {
		return null;
	}
	const knownPerson = known.get(employeeId);
	if (knownPerson) {
		return knownPerson;
	}
	const imageUrl = log.employee?.user?.imageUrl ?? null;
	return { employeeId, name: personNameOf(log), imageUrl };
}

/** A running log has no stop yet: it reaches the present moment. */
function effectiveEndOf(log: ITimeLog, now: Date) {
	const end = endOfLog(log);
	if (log.isRunning) {
		return now;
	}
	if (!end) {
		return null;
	}
	return end;
}

function projectKeyOfLog(log: ITimeLog) {
	return log.project?.id ?? log.projectId ?? NO_PROJECT_KEY;
}

function projectColorOf(log: ITimeLog) {
	const color = log.project?.color?.trim();
	if (!color) {
		return null;
	}
	return color;
}

function taskTitleOf(log: ITimeLog) {
	return log.task?.title?.trim() ?? '';
}

export function timelineHoursOf(starts: ReadonlyArray<Date>, ends: ReadonlyArray<Date>) {
	if (starts.length === 0) {
		const lastDefault = DEFAULT_FIRST_HOUR + MIN_TIMELINE_HOURS;
		return { firstHour: DEFAULT_FIRST_HOUR, lastHour: lastDefault };
	}
	let firstHour = HOURS_PER_DAY;
	let lastHour = 0;
	for (const start of starts) {
		firstHour = Math.min(firstHour, start.getHours());
	}
	for (const end of ends) {
		const endsOnTheHour = end.getMinutes() === 0;
		let endHour = end.getHours() + 1;
		if (endsOnTheHour) {
			endHour = end.getHours();
		}
		lastHour = Math.max(lastHour, endHour);
	}
	const span = lastHour - firstHour;
	if (span < MIN_TIMELINE_HOURS) {
		const missing = MIN_TIMELINE_HOURS - span;
		const before = Math.floor(missing / 2);
		const earlierHour = firstHour - before;
		firstHour = Math.max(0, earlierHour);
		const widenedLast = firstHour + MIN_TIMELINE_HOURS;
		lastHour = Math.min(HOURS_PER_DAY, widenedLast);
	}
	return { firstHour, lastHour };
}

export function percentOfDayWindow(date: Date, dayStart: Date, firstHour: number, lastHour: number) {
	const elapsedMilliseconds = date.getTime() - dayStart.getTime();
	const elapsedSeconds = elapsedMilliseconds / MILLISECONDS_PER_SECOND;
	const minutesFromMidnight = elapsedSeconds / SECONDS_PER_MINUTE;
	const windowStart = firstHour * MINUTES_PER_HOUR;
	const windowHours = lastHour - firstHour;
	const windowMinutes = windowHours * MINUTES_PER_HOUR;
	const offset = minutesFromMidnight - windowStart;
	const ratio = offset / windowMinutes;
	const percent = ratio * 100;
	const atLeastZero = Math.max(percent, 0);
	return Math.min(atLeastZero, 100);
}

function projectsOfBlocks(blocks: ReadonlyArray<TimelineBlock>, totalSeconds: number): TimelineProject[] {
	const byKey = new Map<string, TimelineProject>();
	for (const block of blocks) {
		const existing = byKey.get(block.projectKey);
		if (existing) {
			existing.seconds += block.seconds;
			continue;
		}
		byKey.set(block.projectKey, {
			key: block.projectKey,
			name: block.projectName,
			color: block.projectColor,
			seconds: block.seconds,
			share: 0,
			isOther: false,
			otherCount: 0
		});
	}
	const ranked = [...byKey.values()];
	ranked.sort((first, second) => second.seconds - first.seconds);
	const leading = ranked.slice(0, SHOWN_PROJECTS);
	const rest = ranked.slice(SHOWN_PROJECTS);
	const projects: TimelineProject[] = [...leading];
	if (rest.length > 0) {
		let restSeconds = 0;
		for (const project of rest) {
			restSeconds += project.seconds;
		}
		projects.push({
			key: 'other-projects',
			name: '',
			color: null,
			seconds: restSeconds,
			share: 0,
			isOther: true,
			otherCount: rest.length
		});
	}
	const divisor = Math.max(totalSeconds, 1);
	for (const project of projects) {
		const ratio = project.seconds / divisor;
		project.share = ratio * 100;
	}
	return projects;
}

export function isNoProjectKey(key: string) {
	return key === NO_PROJECT_KEY;
}

/** Today's tracked blocks, one lane per member who tracked today, on the hour window that holds them. */
export function dayTimelineOf(
	logs: ReadonlyArray<ITimeLog>,
	day: Date,
	now: Date,
	known: ReadonlyMap<string, DayPerson>
): DayTimeline {
	const dayStart = startOfDay(day);
	const dayEnd = endOfDay(day);
	const pieces: { log: ITimeLog; person: DayPerson; start: Date; end: Date }[] = [];
	for (const log of logs) {
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const end = effectiveEndOf(log, now);
		if (!end) {
			continue;
		}
		const person = personOfLog(log, known);
		if (!person) {
			continue;
		}
		const isToday = isSameDay(start, day);
		if (!isToday) {
			continue;
		}
		const clippedTime = Math.min(end.getTime(), dayEnd.getTime());
		const clippedEnd = new Date(clippedTime);
		pieces.push({ log, person, start, end: clippedEnd });
	}
	const starts = pieces.map((piece) => piece.start);
	const ends = pieces.map((piece) => piece.end);
	const isTodayShown = isSameDay(now, day);
	const hasPieces = pieces.length > 0;
	const reachesNow = isTodayShown && hasPieces;
	if (reachesNow) {
		ends.push(now);
	}
	const { firstHour, lastHour } = timelineHoursOf(starts, ends);
	const lanesById = new Map<string, TimelineLane>();
	const allBlocks: TimelineBlock[] = [];
	let totalSeconds = 0;
	for (const piece of pieces) {
		const seconds = secondsBetween(piece.start, piece.end);
		const leftPercent = percentOfDayWindow(piece.start, dayStart, firstHour, lastHour);
		const rightPercent = percentOfDayWindow(piece.end, dayStart, firstHour, lastHour);
		const spanPercent = rightPercent - leftPercent;
		const block: TimelineBlock = {
			key: piece.log.id,
			start: piece.start,
			end: piece.end,
			seconds,
			leftPercent,
			widthPercent: Math.max(spanPercent, 0),
			projectKey: projectKeyOfLog(piece.log),
			projectName: piece.log.project?.name?.trim() ?? '',
			projectColor: projectColorOf(piece.log),
			taskTitle: taskTitleOf(piece.log),
			isRunning: Boolean(piece.log.isRunning)
		};
		const lane = lanesById.get(piece.person.employeeId) ?? { person: piece.person, seconds: 0, blocks: [] };
		lane.seconds += seconds;
		lane.blocks.push(block);
		lanesById.set(piece.person.employeeId, lane);
		allBlocks.push(block);
		totalSeconds += seconds;
	}
	const lanes = [...lanesById.values()];
	lanes.sort((first, second) => second.seconds - first.seconds);
	const hours: number[] = [];
	for (let hour = firstHour; hour <= lastHour; hour += 1) {
		hours.push(hour);
	}
	let nowPercent: number | null = null;
	const nowHour = now.getHours();
	const nowIsInWindow = nowHour >= firstHour && nowHour < lastHour;
	if (isTodayShown && nowIsInWindow) {
		nowPercent = percentOfDayWindow(now, dayStart, firstHour, lastHour);
	}
	return {
		firstHour,
		lastHour,
		hours,
		lanes,
		projects: projectsOfBlocks(allBlocks, totalSeconds),
		seconds: totalSeconds,
		nowPercent
	};
}

/** Monday first, as the other reports read a week. */
export function mondayFirstWeekdayOf(date: Date) {
	return (date.getDay() + DAYS_PER_WEEK - 1) % DAYS_PER_WEEK;
}

function heatKeyOf(weekday: number, hour: number) {
	return `${weekday}:${hour}`;
}

function addSpan(cells: Map<string, HeatCell>, start: Date, end: Date) {
	let cursor = start;
	while (cursor < end) {
		const hourStart = startOfHour(cursor);
		const hourEnd = addHours(hourStart, 1);
		const pieceTime = Math.min(hourEnd.getTime(), end.getTime());
		const pieceEnd = new Date(pieceTime);
		const seconds = secondsBetween(cursor, pieceEnd);
		const weekday = mondayFirstWeekdayOf(cursor);
		const hour = cursor.getHours();
		const key = heatKeyOf(weekday, hour);
		const cell = cells.get(key) ?? { key, weekday, hour, seconds: 0, level: 0 };
		cell.seconds += seconds;
		cells.set(key, cell);
		cursor = pieceEnd;
	}
}

function hourSpanOf(cells: ReadonlyMap<string, HeatCell>) {
	let firstHour = HOURS_PER_DAY;
	let lastHour = -1;
	for (const cell of cells.values()) {
		firstHour = Math.min(firstHour, cell.hour);
		lastHour = Math.max(lastHour, cell.hour);
	}
	return lastHour - firstHour + 1;
}

function bucketedCellsOf(cells: ReadonlyMap<string, HeatCell>, hourStep: number) {
	const buckets = new Map<string, HeatCell>();
	for (const cell of cells.values()) {
		const offset = cell.hour % hourStep;
		const bucketHour = cell.hour - offset;
		const key = heatKeyOf(cell.weekday, bucketHour);
		const bucket = buckets.get(key) ?? { key, weekday: cell.weekday, hour: bucketHour, seconds: 0, level: 0 };
		bucket.seconds += cell.seconds;
		buckets.set(key, bucket);
	}
	return buckets;
}

function heatRowsOf(cells: ReadonlyMap<string, HeatCell>, hourStep: number) {
	let firstHour = HOURS_PER_DAY;
	let lastHour = -1;
	for (const cell of cells.values()) {
		firstHour = Math.min(firstHour, cell.hour);
		lastHour = Math.max(lastHour, cell.hour);
	}
	const hasCells = lastHour >= 0;
	if (!hasCells) {
		firstHour = DEFAULT_FIRST_HOUR;
		lastHour = DEFAULT_FIRST_HOUR + MIN_HEAT_ROWS - 1;
	}
	const spannedHours = lastHour - firstHour + 1;
	const rowCount = Math.ceil(spannedHours / hourStep);
	if (rowCount < MIN_HEAT_ROWS) {
		const minimumSpan = MIN_HEAT_ROWS * hourStep;
		const widenedLast = firstHour + minimumSpan - 1;
		const lastHourOfDay = HOURS_PER_DAY - 1;
		lastHour = Math.min(lastHourOfDay, widenedLast);
	}
	const hours: number[] = [];
	for (let hour = firstHour; hour <= lastHour; hour += hourStep) {
		hours.push(hour);
	}
	return hours;
}

/** Four tint steps of the brand, by the share of the busiest hour; an hour without time stays empty. */
function levelOf(seconds: number, maxSeconds: number) {
	if (seconds <= 0) {
		return 0;
	}
	const divisor = Math.max(maxSeconds, 1);
	const share = seconds / divisor;
	if (share > 0.75) {
		return 4;
	}
	if (share > 0.5) {
		return 3;
	}
	if (share > 0.25) {
		return 2;
	}
	return 1;
}

/** The period's tracked time by weekday and hour of the day, summed over every member shown. */
export function hourHeatOf(logs: ReadonlyArray<ITimeLog>, period: Period, now: Date): HourHeat {
	const cells = new Map<string, HeatCell>();
	for (const log of logs) {
		const start = startOfLog(log);
		if (!start) {
			continue;
		}
		const end = effectiveEndOf(log, now);
		if (!end) {
			continue;
		}
		const startsAfterFrom = start >= period.from;
		const startsBeforeTo = start <= period.to;
		const startsInPeriod = startsAfterFrom && startsBeforeTo;
		if (!startsInPeriod) {
			continue;
		}
		addSpan(cells, start, end);
	}
	const isLongSpan = hourSpanOf(cells) > MAX_HEAT_ROWS;
	let hourStep = 1;
	if (isLongSpan) {
		hourStep = 2;
	}
	const shownCells = bucketedCellsOf(cells, hourStep);
	let maxSeconds = 0;
	for (const cell of shownCells.values()) {
		maxSeconds = Math.max(maxSeconds, cell.seconds);
	}
	for (const cell of shownCells.values()) {
		cell.level = levelOf(cell.seconds, maxSeconds);
	}
	const hours = heatRowsOf(shownCells, hourStep);
	return { hours, hourStep, cells: shownCells, maxSeconds, hasTime: maxSeconds > 0 };
}

export function heatCellKeyOf(weekday: number, hour: number) {
	return heatKeyOf(weekday, hour);
}

export function requestRangeOf(period: Period, now: Date): Period {
	const todayStart = startOfDay(now);
	const todayEnd = endOfDay(now);
	const fromTime = Math.min(period.from.getTime(), todayStart.getTime());
	const toTime = Math.max(period.to.getTime(), todayEnd.getTime());
	return { from: new Date(fromTime), to: new Date(toTime) };
}
