'use client';

import { useTranslations } from 'next-intl';
import { useCallback } from 'react';
import { toast } from 'sonner';

import { logErrorInDev } from '@/core/lib/helpers/error-message';
import { wereNotesLostAtStop, type TimerNotesLog } from '@/core/lib/utils/timer/timer-notes';
import { timerService } from '@/core/services/client/api/timers';

interface StoppedEntryNotes {
	/** The notes the stop sent, undefined when it sent none. */
	sentNotes: string | undefined;
	stoppedLogId: string | undefined;
	/** The last log of the day's status the stop answered with. */
	answeredLog: TimerNotesLog | null | undefined;
	employeeId: string | null | undefined;
}

/**
 * The stopped entry as the API kept it. A stop answers with the day's status, in both API modes, and that status
 * shows only an entry started today: an entry started on an earlier day is read from the employee's last log,
 * whatever its day. Undefined when it cannot be read.
 */
async function readStoppedLog({
	stoppedLogId,
	answeredLog,
	employeeId
}: StoppedEntryNotes): Promise<TimerNotesLog | null | undefined> {
	const isStoppedLogAnswered = answeredLog?.id === stoppedLogId;
	if (isStoppedLogAnswered) {
		return answeredLog;
	}
	if (!employeeId) {
		return undefined;
	}
	try {
		const response = await timerService.getLastTimerLog(employeeId);
		return response.data?.[0]?.lastLog;
	} catch (error) {
		logErrorInDev('[Timer] Failed to read the stopped entry:', error);
		return undefined;
	}
}

/**
 * Tells the member when a stop did not save the notes it sent: the API may not apply notes sent with a stop, and the
 * member would otherwise find them gone later. Nothing is said when the stopped entry cannot be read: only an entry
 * that kept other notes proves the loss.
 */
export function useStopNotesWarning() {
	const t = useTranslations();

	return useCallback(
		async (stoppedNotes: StoppedEntryNotes) => {
			const { sentNotes, stoppedLogId } = stoppedNotes;
			if (sentNotes === undefined) {
				return;
			}
			const stoppedLog = await readStoppedLog(stoppedNotes);
			if (!wereNotesLostAtStop(sentNotes, stoppedLogId, stoppedLog)) {
				return;
			}
			toast.warning(t('toasts.timer.NOTES_NOT_SAVED'), {
				id: 'timer-notes-not-saved',
				description: t('toasts.timer.NOTES_NOT_SAVED_HINT')
			});
		},
		[t]
	);
}
