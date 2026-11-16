import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/**
 * How many label saves on a running entry have landed in this tab (#5368). A status read notes the count when it is
 * asked, and a save takes the next number when it lands, so a read noted below a save's number was asked before that
 * save landed. A count rather than a time: two moments in the same millisecond, or a clock set back, still compare right.
 */
let landedLabelSaves = 0;

/** The count a status read notes when it is asked. */
export function labelSavesLanded() {
	return landedLabelSaves;
}

/** The number of a label save that has just landed. */
export function landLabelSave() {
	landedLabelSaves += 1;
	return landedLabelSaves;
}

/** The labels last saved on a running entry, and the number of that save (#5368). */
export interface TimerLabelsSave {
	logId: string;
	tags: ITimeLog['tags'];
	saveNumber: number;
}

/**
 * A timer status read with the labels saved on its run kept: a read asked before the save landed may hold the labels
 * the run had before it, and must not put them back. A read asked after it, or of another run, is taken as it came.
 */
export function statusKeepingSavedLabels<T extends ITimerStatus | null | undefined>(
	status: T,
	saved: TimerLabelsSave | null,
	savesLandedAtRead: number
): T {
	const lastLog = status?.lastLog;
	if (!status || !lastLog || !saved) {
		return status;
	}
	const isSameRun = lastLog.id === saved.logId;
	const isReadBeforeSave = savesLandedAtRead < saved.saveNumber;
	if (!isSameRun || !isReadBeforeSave) {
		return status;
	}
	return { ...status, lastLog: { ...lastLog, tags: saved.tags } };
}
