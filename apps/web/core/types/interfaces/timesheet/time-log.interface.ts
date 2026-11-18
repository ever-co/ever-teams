import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

export interface ITimeLogUpdatePayload {
	timeLogId: string;
	startedAt?: Date;
	stoppedAt?: Date;
	employeeId?: string;
	projectId?: string;
	taskId?: string;
	description?: string;
	isBillable?: boolean;
	/** The labels the entry is filed under from now on (Gauzy #12029); left out, it keeps its own. */
	tags?: string[];
	/**
	 * The `updatedAt` the entry was read at, as the API states it (#5382): Ever Gauzy saves the update only while the
	 * entry still holds it, and answers 409 `TIME_LOG_CHANGED` otherwise, having written nothing. An older Ever Gauzy
	 * leaves it out (the route keeps only the members it declares) and saves as before.
	 */
	expectedUpdatedAt?: string;
}

/**
 * A split of one stopped entry at a moment of its range (Gauzy's `POST /timesheet/time-log/:id/split`,
 * ever-co/ever-gauzy#12030): the entry ends there, and the rest becomes a second entry with the task and project given,
 * every other field copied.
 */
export interface ITimeLogSplitPayload {
	timeLogId: string;
	splitAt: Date;
	taskId?: string | null;
	projectId?: string | null;
	/** Why the time changes, kept in both entries' history; asked where the organization requires one. */
	reason?: string;
}

/** The two entries a split leaves: the entry, now ending at the split, and the part after it. */
export interface ITimeLogSplitResult {
	first: ITimeLog;
	second: ITimeLog;
}
