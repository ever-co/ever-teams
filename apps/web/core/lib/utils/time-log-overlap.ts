import { durationPartsOf } from '@/core/lib/utils/dashboard-figures';

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;

export interface TimePeriod {
	start: Date;
	end: Date;
}

/** A time log as the conflict lookup returns it: only what the warning reads. */
export interface OverlapCandidateLog {
	id: string;
	startedAt?: string | null;
	stoppedAt?: string | null;
	isRunning?: boolean | null;
	task?: { title?: string | null } | null;
	project?: { name?: string | null } | null;
}

export interface OverlappedEntry {
	id: string;
	start: Date;
	end: Date;
	isRunning: boolean;
	/** The entry's whole duration, from its start to its end: the API removes an overlapped entry whole. */
	removedSeconds: number;
	taskTitle: string | null;
	projectName: string | null;
}

export interface OverlapSummary {
	totalSeconds: number;
	entries: OverlappedEntry[];
}

export interface OverlapSummaryInput {
	periods: ReadonlyArray<TimePeriod>;
	logs: ReadonlyArray<OverlapCandidateLog>;
	/** The entry being edited: saving it never removes its own time. */
	ignoredLogId?: string | null;
	now: Date;
}

function parsedDateOf(value: string | null | undefined): Date | null {
	if (!value) {
		return null;
	}
	const date = new Date(value);
	if (Number.isNaN(date.getTime())) {
		return null;
	}
	return date;
}

/** A running log has no final end yet: the API keeps moving it, so it counts up to now. */
function endOfLog(log: OverlapCandidateLog, start: Date, now: Date): Date {
	const stoppedAt = parsedDateOf(log.stoppedAt);
	const isRunning = log.isRunning === true;
	if (!isRunning) {
		return stoppedAt ?? start;
	}
	if (stoppedAt && stoppedAt.getTime() > now.getTime()) {
		return stoppedAt;
	}
	return now;
}

/**
 * Whether the lookup returned an entry whose time cannot be read: no start, or stopped without an end. The API
 * still removes such an entry, but the warning could neither place nor count it, so the check must not pass it by.
 */
export function hasUnreadableInterval(log: OverlapCandidateLog): boolean {
	if (!parsedDateOf(log.startedAt)) {
		return true;
	}
	const isRunning = log.isRunning === true;
	if (isRunning) {
		return false;
	}
	return !parsedDateOf(log.stoppedAt);
}

/** As in the API's own lookup, an entry that only touches the period, end to start, is not overlapped. */
function sharesTimeWith(period: TimePeriod, start: Date, end: Date): boolean {
	const sharedStart = Math.max(period.start.getTime(), start.getTime());
	const sharedEnd = Math.min(period.end.getTime(), end.getTime());
	return sharedEnd > sharedStart;
}

function overlappedEntryOf(log: OverlapCandidateLog, periods: ReadonlyArray<TimePeriod>, now: Date) {
	const start = parsedDateOf(log.startedAt);
	if (!start) {
		return null;
	}
	const end = endOfLog(log, start, now);
	const isOverlapped = periods.some((period) => sharesTimeWith(period, start, end));
	if (!isOverlapped) {
		return null;
	}
	const wholeDurationMs = end.getTime() - start.getTime();
	const entry: OverlappedEntry = {
		id: log.id,
		start,
		end,
		isRunning: log.isRunning === true,
		removedSeconds: Math.round(wholeDurationMs / MS_PER_SECOND),
		taskTitle: log.task?.title ?? null,
		projectName: log.project?.name ?? null
	};
	return entry;
}

/**
 * What saving the periods would remove. The API removes every other entry of the member that a manual interval
 * overlaps, whole, and not only the time they share: its cleanup deletes all the time slots of an overlapped
 * entry, then the entry itself. A 1h 54m entry overlapped for 37 minutes is gone entirely. So an overlapped entry
 * counts for its whole duration, once, whichever period lookup returned it.
 */
export function overlapSummaryOf({ periods, logs, ignoredLogId, now }: OverlapSummaryInput): OverlapSummary {
	const seenLogIds = new Set<string>();
	const entries: OverlappedEntry[] = [];
	for (const log of logs) {
		const isIgnored = Boolean(ignoredLogId) && log.id === ignoredLogId;
		const isRepeated = seenLogIds.has(log.id);
		if (isIgnored || isRepeated) {
			continue;
		}
		seenLogIds.add(log.id);
		const entry = overlappedEntryOf(log, periods, now);
		if (entry) {
			entries.push(entry);
		}
	}
	entries.sort((first, second) => first.start.getTime() - second.start.getTime());
	let totalSeconds = 0;
	for (const entry of entries) {
		totalSeconds += entry.removedSeconds;
	}
	return { totalSeconds, entries };
}

/** `37m`, `1h`, `1h 5m`. Anything under a minute still reads `1m`: it is time that would be removed. */
export function formatOverlapDuration(seconds: number): string {
	const wholeMinutes = Math.round(seconds / SECONDS_PER_MINUTE);
	const shownMinutes = Math.max(1, wholeMinutes);
	const { hours, minutes } = durationPartsOf(shownMinutes * SECONDS_PER_MINUTE);
	if (hours === 0) {
		return `${minutes}m`;
	}
	if (minutes === 0) {
		return `${hours}h`;
	}
	return `${hours}h ${minutes}m`;
}
