'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtom, useAtomValue, useSetAtom, useStore } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { EntryLabelsPicker } from '@/core/components/features/entry-labels/entry-labels-picker';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { entryLabelsOf } from '@/core/lib/utils/time-log-labels';
import { landLabelSave } from '@/core/lib/utils/timer-status-labels';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { activeTeamIdState, timerLabelsState, timerStatusState } from '@/core/stores';
import { teamTimerStatusState } from '@/core/stores/timer/team-timer-status';
import { timerLabelsSavedState } from '@/core/stores/timer/timer-labels';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';

/** The status with the saved labels on its entry, unless that entry is no longer the one it shows. */
function withSavedLabels(current: ITimerStatus | null, savedLogId: string, tags: ITimeLog['tags']) {
	const lastLog = current?.lastLog;
	const isStillThisRun = lastLog?.id === savedLogId;
	if (!current || !lastLog || !isStillThisRun) {
		return current;
	}
	return { ...current, lastLog: { ...lastLog, tags } };
}

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
	// The status the timer shows: a run of another team reads as stopped, so the labels picked are the next start's
	const timerStatus = useAtomValue(teamTimerStatusState);
	const setTimerStatus = useSetAtom(timerStatusState);
	const setLabelsSaved = useSetAtom(timerLabelsSavedState);
	const store = useStore();
	const [isSaving, setIsSaving] = useState(false);
	const activeTeamId = useAtomValue(activeTeamIdState);
	const teamOfDraftRef = useRef(activeTeamId);
	useEffect(() => {
		if (teamOfDraftRef.current === activeTeamId) {
			return;
		}
		teamOfDraftRef.current = activeTeamId;
		setPickedLabelIds([]);
	}, [activeTeamId, setPickedLabelIds]);

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
				const savedTags = updated?.tags ?? [];
				// A status read asked before this save landed keeps these labels rather than the ones the run had before,
				// as long as the run is still the timer's: a late save of an earlier run leaves the record of the newer one
				const isStillTheRun = store.get(timerStatusState)?.lastLog?.id === runningLogId;
				if (isStillTheRun) {
					setLabelsSaved({ logId: runningLogId, tags: savedTags, saveNumber: landLabelSave() });
				}
				// The status as it is now: a stop or another start may have landed while the labels were saved
				setTimerStatus((current) => withSavedLabels(current, runningLogId, savedTags));
			} catch {
				toast.error(t('timer.labels.SAVE_FAILED'));
			} finally {
				setIsSaving(false);
			}
		},
		[runningLogId, setLabelsSaved, setTimerStatus, store, t]
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
