import { EverTeamsTimeEntry, EverTeamsTimeLog } from '@ever-teams/api';

/** A time entry as the command line answers it: in JSON, and as the columns of a CSV export, in this order. */
export interface EntryRecord {
	id: string;
	startedAt: string;
	/** null while it runs. */
	stoppedAt: string | null;
	durationSeconds: number;
	running: boolean;
	projectId: string | null;
	projectName: string | null;
	taskId: string | null;
	taskNumber: string | null;
	taskTitle: string | null;
	note: string | null;
	logType: string;
	billable: boolean;
	memberId: string;
	memberName: string | null;
}

export interface ProjectName {
	id: string;
	name: string;
}

export interface TaskName {
	id: string;
	taskNumber: string;
	title: string;
}

/** The project and the task of an entry, when they could be read. */
export interface Names {
	project: ProjectName | null;
	task: TaskName | null;
}

// A stopped entry lasts what the API counts. A running one counts up to now: the API moves its stop only at each
// heartbeat of its timer.
function secondsOf(log: EverTeamsTimeLog, now: Date): number {
	if (!log.isRunning) {
		return log.duration;
	}
	const startedAt = Date.parse(log.startedAt);
	const seconds = Math.round((now.getTime() - startedAt) / 1000);
	return Math.max(0, seconds);
}

function stoppedAtOf(log: EverTeamsTimeLog): string | null {
	if (log.isRunning) {
		return null;
	}
	return log.stoppedAt;
}

/** The record of a time log, with the names read for it. */
export function recordOfLog(log: EverTeamsTimeLog, names: Names, now: Date): EntryRecord {
	return {
		id: log.id,
		startedAt: log.startedAt,
		stoppedAt: stoppedAtOf(log),
		durationSeconds: secondsOf(log, now),
		running: log.isRunning,
		projectId: log.projectId,
		projectName: names.project?.name ?? null,
		taskId: log.taskId,
		taskNumber: names.task?.taskNumber ?? null,
		taskTitle: names.task?.title ?? null,
		note: log.description || null,
		logType: log.logType,
		billable: log.isBillable,
		memberId: log.employeeId,
		memberName: null
	};
}

/** The record of a listed time entry, which carries its project, task and member. */
export function recordOfEntry(entry: EverTeamsTimeEntry, now: Date): EntryRecord {
	const names: Names = { project: entry.project, task: entry.task };
	const record = recordOfLog(entry, names, now);
	record.memberName = entry.employee?.fullName ?? null;
	return record;
}

const byStart = (a: EntryRecord, b: EntryRecord): number => a.startedAt.localeCompare(b.startedAt);

export function inStartOrder(records: EntryRecord[]): EntryRecord[] {
	return [...records].sort(byStart);
}

function taskLabelOf(record: EntryRecord): string | null {
	if (record.taskTitle) {
		return `${record.taskNumber} ${record.taskTitle}`;
	}
	if (record.taskId) {
		return `task ${record.taskId}`;
	}
	return null;
}

function projectLabelOf(record: EntryRecord): string | null {
	if (record.projectName) {
		return record.projectName;
	}
	if (record.projectId) {
		return `project ${record.projectId}`;
	}
	return null;
}

/** What the entry was on, for a sentence: " on Website, WEB-12 Fix the sign-in page", or nothing. */
export function workOf(record: EntryRecord): string {
	const labels = [projectLabelOf(record), taskLabelOf(record)].filter((label) => label !== null);
	if (labels.length === 0) {
		return '';
	}
	return ` on ${labels.join(', ')}`;
}
