import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimeLogUpdatePayload } from '@/core/types/interfaces/timesheet/time-log.interface';
import { type EntryTaskChange, entryTaskChangeOf, isEntryOfListedTeam } from './time-entry-task';
import { endOfLog, startOfLog } from './timesheets';

export interface BulkEditTask {
	id: string;
	projectId?: string | null;
}

/** What a bulk edit asks for. A null field is left on "Keep as is": every entry keeps its own value. */
export interface BulkEditChoice {
	/** The project picked by hand. A task with a project of its own files its time under that one instead. */
	projectId: string | null;
	task: BulkEditTask | null;
	isBillable: boolean | null;
}

export function hasBulkEditChoice(choice: BulkEditChoice): boolean {
	const picksProject = choice.projectId !== null;
	const picksTask = choice.task !== null;
	const picksBillable = choice.isBillable !== null;
	return picksProject || picksTask || picksBillable;
}

export function handPickedProjectIdOf(choice: BulkEditChoice): string | null {
	const followsTask = Boolean(choice.task?.projectId);
	if (followsTask) {
		return null;
	}
	return choice.projectId;
}

function isTaskUnderProject(task: BulkEditTask, projectId: string): boolean {
	if (!task.projectId) {
		return true;
	}
	return task.projectId === projectId;
}

/**
 * The tasks offered once a project is picked by hand: that project's own, and the tasks without a project, which
 * leave an entry under the project picked. A task of another project would take the entries to its own.
 */
export function taskChoicesUnderProject<Task extends BulkEditTask>(
	tasks: ReadonlyArray<Task>,
	projectId: string | null
): Task[] {
	if (!projectId) {
		return [...tasks];
	}
	return tasks.filter((task) => isTaskUnderProject(task, projectId));
}

export type BulkEditLeftOutReason = 'notAllowed' | 'running' | 'otherTeam' | 'unchanged';

/** Only what differs from the entry's own values: a field absent here is never sent. */
export interface BulkEditFields {
	taskId?: string;
	projectId?: string;
	isBillable?: boolean;
}

export interface BulkEditSave {
	log: ITimeLog;
	fields: BulkEditFields;
}

export interface BulkEditLeftOut {
	log: ITimeLog;
	reason: BulkEditLeftOutReason;
}

export interface BulkEditPlan {
	saves: BulkEditSave[];
	leftOut: BulkEditLeftOut[];
}

export interface BulkEditScope {
	/** The team whose tasks the dialog lists. */
	listedTeamId: string | null | undefined;
	canEdit: (log: ITimeLog) => boolean;
}

function ownTaskIdOf(log: ITimeLog): string | null {
	return log.taskId ?? log.task?.id ?? null;
}

function ownProjectIdOf(log: ITimeLog): string {
	return log.projectId ?? log.project?.id ?? '';
}

function taskChangeOf(log: ITimeLog, choice: BulkEditChoice): EntryTaskChange | null {
	const pickedTask = choice.task ?? undefined;
	const heldProjectId = handPickedProjectIdOf(choice) ?? ownProjectIdOf(log);
	return entryTaskChangeOf(ownTaskIdOf(log), pickedTask, heldProjectId);
}

function projectIdAfter(taskChange: EntryTaskChange | null, choice: BulkEditChoice): string | null {
	if (taskChange) {
		return taskChange.projectId ?? null;
	}
	return handPickedProjectIdOf(choice);
}

function fieldsOf(log: ITimeLog, choice: BulkEditChoice, taskChange: EntryTaskChange | null): BulkEditFields {
	const fields: BulkEditFields = {};
	if (taskChange) {
		fields.taskId = taskChange.taskId;
	}
	const projectId = projectIdAfter(taskChange, choice);
	if (projectId && projectId !== ownProjectIdOf(log)) {
		fields.projectId = projectId;
	}
	const isBillable = choice.isBillable;
	if (isBillable !== null && isBillable !== Boolean(log.isBillable)) {
		fields.isBillable = isBillable;
	}
	return fields;
}

function leftOutReasonOf(
	log: ITimeLog,
	scope: BulkEditScope,
	taskChange: EntryTaskChange | null,
	fields: BulkEditFields
): BulkEditLeftOutReason | null {
	if (!scope.canEdit(log)) {
		return 'notAllowed';
	}
	// The API saves an entry with a start and an end: a running one has no final end yet
	if (log.isRunning === true) {
		return 'running';
	}
	const isOfListedTeam = isEntryOfListedTeam(log.organizationTeamId, scope.listedTeamId);
	if (taskChange && !isOfListedTeam) {
		return 'otherTeam';
	}
	const hasNothingToSave = Object.keys(fields).length === 0;
	if (hasNothingToSave) {
		return 'unchanged';
	}
	return null;
}

/**
 * What a bulk edit does to each ticked entry: the fields to save, or why the entry is left out. The task follows
 * the rule of the single Edit dialog (`entryTaskChangeOf`), so an entry that moves to a task goes to the task's
 * own project, and an entry already on the task is not moved.
 */
export function bulkEditPlanOf(
	logs: ReadonlyArray<ITimeLog>,
	choice: BulkEditChoice,
	scope: BulkEditScope
): BulkEditPlan {
	const plan: BulkEditPlan = { saves: [], leftOut: [] };
	for (const log of logs) {
		const taskChange = taskChangeOf(log, choice);
		const fields = fieldsOf(log, choice, taskChange);
		const reason = leftOutReasonOf(log, scope, taskChange, fields);
		if (reason) {
			plan.leftOut.push({ log, reason });
			continue;
		}
		plan.saves.push({ log, fields });
	}
	return plan;
}

export type BulkEditPayload = ITimeLogUpdatePayload & { startedAt: Date; stoppedAt: Date; employeeId: string };

/**
 * The update of one entry: its own interval and member, which the API requires on every update, then the changed
 * fields. Null when the entry has no interval or no member to send back as they are.
 */
export function bulkEditPayloadOf(save: BulkEditSave): BulkEditPayload | null {
	const { log, fields } = save;
	const startedAt = startOfLog(log);
	const stoppedAt = endOfLog(log);
	if (!startedAt || !stoppedAt) {
		return null;
	}
	const employeeId = log.employeeId ?? log.employee?.id;
	if (!employeeId) {
		return null;
	}
	return { timeLogId: log.id, startedAt, stoppedAt, employeeId, ...fields };
}

export type BulkEditSaveFailure = 'overlap' | 'checkFailed' | 'failed';

export interface BulkEditOutcome {
	logId: string;
	status: 'updated' | BulkEditSaveFailure;
	/** The translation key of why a save failed, when the failure has one to give. */
	detailKey?: string;
}

export type BulkEditReason = BulkEditLeftOutReason | BulkEditSaveFailure;

export interface BulkEditReasonLine {
	reason: BulkEditReason;
	count: number;
	detailKey?: string;
}

const REASON_ORDER: ReadonlyArray<BulkEditReason> = [
	'notAllowed',
	'running',
	'otherTeam',
	'unchanged',
	'overlap',
	'checkFailed',
	'failed'
];

function byReasonOrder(first: BulkEditReasonLine, second: BulkEditReasonLine): number {
	return REASON_ORDER.indexOf(first.reason) - REASON_ORDER.indexOf(second.reason);
}

interface ReasonedEntry {
	reason: BulkEditReason;
	detailKey?: string;
}

/** One line per reason with its count: entries are never listed one by one. */
function reasonLinesOf(entries: ReadonlyArray<ReasonedEntry>): BulkEditReasonLine[] {
	const lineByKey = new Map<string, BulkEditReasonLine>();
	for (const entry of entries) {
		const key = `${entry.reason}|${entry.detailKey ?? ''}`;
		const line = lineByKey.get(key);
		if (line) {
			line.count += 1;
			continue;
		}
		lineByKey.set(key, { reason: entry.reason, count: 1, detailKey: entry.detailKey });
	}
	const lines = [...lineByKey.values()];
	return lines.sort(byReasonOrder);
}

export function leftOutLinesOf(leftOut: ReadonlyArray<BulkEditLeftOut>): BulkEditReasonLine[] {
	return reasonLinesOf(leftOut);
}

export interface BulkEditResult {
	updatedCount: number;
	notUpdatedCount: number;
	/** Why entries were not updated, the ones left out before the save included. */
	reasons: BulkEditReasonLine[];
	/** The entries the selection lets go: the ones saved, and the ones that already had the values chosen. */
	releasedLogIds: string[];
}

function isSaveFailure(outcome: BulkEditOutcome): outcome is BulkEditOutcome & { status: BulkEditSaveFailure } {
	return outcome.status !== 'updated';
}

/**
 * What a finished bulk edit reports. An entry that already had the values chosen counts on neither side: nothing
 * was asked of it, and it is as the manager wanted.
 */
export function bulkEditResultOf(plan: BulkEditPlan, outcomes: ReadonlyArray<BulkEditOutcome>): BulkEditResult {
	const refused = plan.leftOut.filter((entry) => entry.reason !== 'unchanged');
	const alreadyAsChosen = plan.leftOut.filter((entry) => entry.reason === 'unchanged');
	const updated = outcomes.filter((outcome) => outcome.status === 'updated');
	const failures = outcomes.filter(isSaveFailure);
	const failedEntries = failures.map((outcome) => ({ reason: outcome.status, detailKey: outcome.detailKey }));
	const updatedIds = updated.map((outcome) => outcome.logId);
	const alreadyAsChosenIds = alreadyAsChosen.map((entry) => entry.log.id);
	return {
		updatedCount: updated.length,
		notUpdatedCount: refused.length + failures.length,
		reasons: reasonLinesOf([...refused, ...failedEntries]),
		releasedLogIds: [...updatedIds, ...alreadyAsChosenIds]
	};
}
