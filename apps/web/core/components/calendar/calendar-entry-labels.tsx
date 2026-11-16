'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { EntryLabelChips } from '@/core/components/features/entry-labels/entry-label-chips';
import { EntryLabelsPicker } from '@/core/components/features/entry-labels/entry-labels-picker';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { entryLabelsOf } from '@/core/lib/utils/time-log-labels';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

/**
 * The labels of the entry a Calendar block opens (Gauzy #12029): chips, and for whoever may edit the entry, the picker
 * that changes them at once. Nothing against an API without labels on entries.
 */
export function EntryLabelsLine({ log, canEdit }: Readonly<{ log: ITimeLog; canEdit: boolean }>) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const supportsLabels = useEntryLabelsSupport();
	const carriedLabels = useMemo(() => entryLabelsOf(log), [log]);
	const [labelIds, setLabelIds] = useState<string[]>(() => carriedLabels.map((label) => label.id));
	const [isSaving, setIsSaving] = useState(false);
	const carriedKey = carriedLabels.map((label) => label.id).join(',');
	// The labels the entry was read with before a save that landed: a read still showing them predates the save (the
	// refetch after it may fail, and leaves that read in place), so the saved labels stay until a read shows others
	const keyBeforeSaveRef = useRef<string | null>(null);
	useEffect(() => {
		if (isSaving) {
			return;
		}
		const isReadBeforeSave = carriedKey === keyBeforeSaveRef.current;
		if (isReadBeforeSave) {
			return;
		}
		keyBeforeSaveRef.current = null;
		setLabelIds(carriedKey ? carriedKey.split(',') : []);
	}, [carriedKey, isSaving]);

	const save = useCallback(
		async (next: string[]) => {
			const previous = labelIds;
			setLabelIds(next);
			setIsSaving(true);
			try {
				await timeLogService.updateTimeLogLabels(log.id, next);
				const isChanged = next.join(',') !== carriedKey;
				keyBeforeSaveRef.current = isChanged ? carriedKey : null;
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			} catch {
				setLabelIds(previous);
				toast.error(t('timer.labels.SAVE_FAILED'));
			} finally {
				setIsSaving(false);
			}
		},
		[carriedKey, labelIds, log.id, queryClient, t]
	);

	if (!supportsLabels) {
		return null;
	}
	if (!canEdit) {
		return <EntryLabelChips labels={carriedLabels} />;
	}
	return <EntryLabelsPicker value={labelIds} onChange={save} carriedLabels={carriedLabels} isSaving={isSaving} />;
}
