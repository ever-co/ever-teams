'use client';

import { useCallback, useMemo, useState } from 'react';
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

	const save = useCallback(
		async (next: string[]) => {
			const previous = labelIds;
			setLabelIds(next);
			setIsSaving(true);
			try {
				await timeLogService.updateTimeLogLabels(log.id, next);
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			} catch {
				setLabelIds(previous);
				toast.error(t('timer.labels.SAVE_FAILED'));
			} finally {
				setIsSaving(false);
			}
		},
		[labelIds, log.id, queryClient, t]
	);

	if (!supportsLabels) {
		return null;
	}
	if (!canEdit) {
		return <EntryLabelChips labels={carriedLabels} />;
	}
	return <EntryLabelsPicker value={labelIds} onChange={save} carriedLabels={carriedLabels} isSaving={isSaving} />;
}
