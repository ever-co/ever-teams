'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtom } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { EntryLabelsPicker } from '@/core/components/features/entry-labels/entry-labels-picker';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { entryLabelsOf } from '@/core/lib/utils/time-log-labels';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { timerLabelsState, timerStatusState } from '@/core/stores';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** The entry that runs, or none while the timer is stopped. */
function runningLogOf(timerStatus: ITimerStatus | null) {
	if (timerStatus?.running !== true) {
		return null;
	}
	return timerStatus.lastLog ?? null;
}

/**
 * The labels of the timer's entry (Gauzy #12029). Stopped, the labels picked go with the next start; running, they are
 * the running entry's, and a change is saved on it at once, nothing else of the run changing. Against an API without
 * labels on entries the control is not shown.
 */
export function TimerLabelsControl({ className }: Readonly<{ className?: string }>) {
	const t = useTranslations();
	const supportsLabels = useEntryLabelsSupport();
	const [pickedLabelIds, setPickedLabelIds] = useAtom(timerLabelsState);
	const [timerStatus, setTimerStatus] = useAtom(timerStatusState);
	const [isSaving, setIsSaving] = useState(false);

	const runningLog = runningLogOf(timerStatus);
	const runningLogId = runningLog?.id;
	const carriedLabels = useMemo(() => entryLabelsOf(runningLog), [runningLog]);
	const runningLabelIds = useMemo(() => carriedLabels.map((label) => label.id), [carriedLabels]);

	const saveOnRunningEntry = useCallback(
		async (labelIds: string[]) => {
			if (!runningLogId) {
				return;
			}
			setIsSaving(true);
			try {
				const updated = await timeLogService.updateTimeLogLabels(runningLogId, labelIds);
				const lastLog = timerStatus?.lastLog;
				const isStillThisRun = lastLog?.id === runningLogId;
				if (isStillThisRun && timerStatus && lastLog) {
					setTimerStatus({ ...timerStatus, lastLog: { ...lastLog, tags: updated?.tags ?? [] } });
				}
			} catch {
				toast.error(t('timer.labels.SAVE_FAILED'));
			} finally {
				setIsSaving(false);
			}
		},
		[runningLogId, setTimerStatus, t, timerStatus]
	);

	if (!supportsLabels) {
		return null;
	}

	if (runningLogId) {
		return (
			<EntryLabelsPicker
				variant="icon"
				value={runningLabelIds}
				carriedLabels={carriedLabels}
				onChange={saveOnRunningEntry}
				isSaving={isSaving}
				className={className}
			/>
		);
	}

	return (
		<EntryLabelsPicker variant="icon" value={pickedLabelIds} onChange={setPickedLabelIds} className={className} />
	);
}
