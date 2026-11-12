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
	overlappedSeconds: number;
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

function isValidPeriod(period: TimePeriod): boolean {
	const startMs = period.start.getTime();
	const endMs = period.end.getTime();
	if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
		return false;
	}
	return endMs > startMs;
}

/** The periods as disjoint intervals, so time two periods share is counted once. */
export function mergedPeriodsOf(periods: ReadonlyArray<TimePeriod>): TimePeriod[] {
	const validPeriods = periods.filter(isValidPeriod);
	const sortedPeriods = [...validPeriods].sort((first, second) => first.start.getTime() - second.start.getTime());
	const merged: TimePeriod[] = [];
	for (const period of sortedPeriods) {
		const last = merged[merged.length - 1];
		const startsAfterLast = !last || period.start.getTime() > last.end.getTime();
		if (startsAfterLast) {
			merged.push({ start: period.start, end: period.end });
			continue;
		}
		if (period.end.getTime() > last.end.getTime()) {
			last.end = period.end;
		}
	}
	return merged;
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

function sharedMsOf(period: TimePeriod, start: Date, end: Date): number {
	const sharedStart = Math.max(period.start.getTime(), start.getTime());
	const sharedEnd = Math.min(period.end.getTime(), end.getTime());
	return Math.max(0, sharedEnd - sharedStart);
}

function overlappedEntryOf(log: OverlapCandidateLog, periods: ReadonlyArray<TimePeriod>, now: Date) {
	const start = parsedDateOf(log.startedAt);
	if (!start) {
		return null;
	}
	const end = endOfLog(log, start, now);
	let overlappedMs = 0;
	for (const period of periods) {
		overlappedMs += sharedMsOf(period, start, end);
	}
	if (overlappedMs <= 0) {
		return null;
	}
	const entry: OverlappedEntry = {
		id: log.id,
		start,
		end,
		isRunning: log.isRunning === true,
		overlappedSeconds: Math.round(overlappedMs / MS_PER_SECOND),
		taskTitle: log.task?.title ?? null,
		projectName: log.project?.name ?? null
	};
	return entry;
}

/**
 * What saving the periods would remove: the API deletes, from every other entry of the member, the time the new
 * interval covers. Each entry is counted once, whichever period lookup returned it.
 */
export function overlapSummaryOf({ periods, logs, ignoredLogId, now }: OverlapSummaryInput): OverlapSummary {
	const mergedPeriods = mergedPeriodsOf(periods);
	const seenLogIds = new Set<string>();
	const entries: OverlappedEntry[] = [];
	for (const log of logs) {
		const isIgnored = Boolean(ignoredLogId) && log.id === ignoredLogId;
		const isRepeated = seenLogIds.has(log.id);
		if (isIgnored || isRepeated) {
			continue;
		}
		seenLogIds.add(log.id);
		const entry = overlappedEntryOf(log, mergedPeriods, now);
		if (entry) {
			entries.push(entry);
		}
	}
	entries.sort((first, second) => first.start.getTime() - second.start.getTime());
	let totalSeconds = 0;
	for (const entry of entries) {
		totalSeconds += entry.overlappedSeconds;
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
