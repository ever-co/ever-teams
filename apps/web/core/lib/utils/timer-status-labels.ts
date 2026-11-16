import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** The labels last saved on a running entry, and when that save landed (#5368). */
export interface TimerLabelsSave {
	logId: string;
	tags: ITimeLog['tags'];
	savedAt: number;
}

/**
 * A timer status read with the labels saved on its run kept: a read asked before the save landed may hold the labels
 * the run had before it, and must not put them back. A read asked after it, or of another run, is taken as it came.
 */
export function statusKeepingSavedLabels<T extends ITimerStatus | null | undefined>(
	status: T,
	saved: TimerLabelsSave | null,
	requestedAt: number
): T {
	const lastLog = status?.lastLog;
	if (!status || !lastLog || !saved) {
		return status;
	}
	const isSameRun = lastLog.id === saved.logId;
	const isReadBeforeSave = requestedAt < saved.savedAt;
	if (!isSameRun || !isReadBeforeSave) {
		return status;
	}
	return { ...status, lastLog: { ...lastLog, tags: saved.tags } };
}
