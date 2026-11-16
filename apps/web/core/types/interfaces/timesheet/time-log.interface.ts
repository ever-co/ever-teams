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
