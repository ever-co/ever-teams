import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isHiddenProject } from '@/core/lib/utils/project-visibility';
import {
	clockTimeOf,
	distinctMemberCountOf,
	endOfLog,
	groupLogsByWorkDay,
	logDurationSeconds,
	startOfLog,
	statusOfLog,
	totalDurationOf,
	workDayOfLog
} from '@/core/lib/utils/dashboards/timesheets';
import { isBreakLog } from '@/core/lib/utils/timer/timer-break';
import { entryNotesOf } from '@/core/lib/utils/timer/timer-notes';
import type { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/** One log as every export of the Timesheets page writes it: local day, 24-hour start and end, names, duration, notes. */
export interface TimesheetExportRow {
	id: string;
	dayKey: string;
	start: string;
	end: string;
	member: string;
	project: string;
	task: string;
	status: ETimesheetStatus | null;
	isBillable: boolean;
	seconds: number;
	/** The entry's notes, trimmed; empty when it has none. */
	notes: string;
}

function dayKeyOf(log: ITimeLog) {
	const day = workDayOfLog(log);
	if (!day) {
		return '';
	}
	return localDayKeyOf(day);
}

function startTimeValueOf(log: ITimeLog) {
	const start = startOfLog(log);
	if (!start) {
		return 0;
	}
	return start.getTime();
}

/** The project an exported entry names: a project the API keeps from the reader is named as one (CORE-27). */
function exportedProjectOf(log: ITimeLog, hiddenProjectLabel: string) {
	if (isHiddenProject(log.project)) {
		return hiddenProjectLabel;
	}
	return log.project?.name ?? '';
}

function timesheetExportRowOf(log: ITimeLog, hiddenProjectLabel: string): TimesheetExportRow {
	const start = startOfLog(log);
	const end = endOfLog(log);
	return {
		id: log.id,
		dayKey: dayKeyOf(log),
		start: clockTimeOf(start),
		end: clockTimeOf(end),
		member: log.employee?.fullName ?? '',
		project: exportedProjectOf(log, hiddenProjectLabel),
		task: log.task?.title ?? '',
		status: statusOfLog(log),
		isBillable: Boolean(log.isBillable),
		seconds: logDurationSeconds(log),
		notes: entryNotesOf(log) ?? ''
	};
}

/**
 * The logs an export writes: the work. A break is listed on the page but never worked time (#5216), and a row of it
 * would read as work in a file, so the files leave breaks out, rows and totals alike.
 */
function exportedLogsOf(logs: ReadonlyArray<ITimeLog>): ITimeLog[] {
	return logs.filter((log) => !isBreakLog(log));
}

/** The rows of a flat file (CSV, XLSX): one per log of work, in the order the logs started. */
export function timesheetExportRowsOf(logs: ReadonlyArray<ITimeLog>, hiddenProjectLabel = ''): TimesheetExportRow[] {
	const sorted = exportedLogsOf(logs).sort((first, second) => startTimeValueOf(first) - startTimeValueOf(second));
	return sorted.map((log) => timesheetExportRowOf(log, hiddenProjectLabel));
}

export interface TimesheetExportDay {
	key: string;
	date: Date;
	seconds: number;
	rows: TimesheetExportRow[];
}

/** The rows of a printed file, grouped as the list shows them: one group per day worked, the latest day first. */
export function timesheetExportDaysOf(logs: ReadonlyArray<ITimeLog>, hiddenProjectLabel = ''): TimesheetExportDay[] {
	const days = groupLogsByWorkDay(exportedLogsOf(logs));
	return days.map((day) => ({
		key: day.key,
		date: day.date,
		seconds: day.totalSeconds,
		rows: day.logs.map((log) => timesheetExportRowOf(log, hiddenProjectLabel))
	}));
}

interface TimesheetExportTotals {
	seconds: number;
	logCount: number;
	memberCount: number;
}

/** The totals every export closes on: the figures of the status card picked on the page, for the same logs. */
export function timesheetExportTotalsOf(logs: ReadonlyArray<ITimeLog>): TimesheetExportTotals {
	const workLogs = exportedLogsOf(logs);
	return {
		seconds: totalDurationOf(workLogs),
		logCount: workLogs.length,
		memberCount: distinctMemberCountOf(workLogs)
	};
}
