'use client';

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
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
 * When the Calendar last read its entries: the `dataUpdatedAt` of its query (#5368). Null outside the Calendar, where
 * an entry's card follows the entry at once.
 */
const CalendarEntriesReadContext = createContext<number | null>(null);

/** Tells the entries' cards when the Calendar read the entries they show. */
export function CalendarEntriesRead({ readAt, children }: Readonly<{ readAt: number; children: ReactNode }>) {
	return <CalendarEntriesReadContext.Provider value={readAt}>{children}</CalendarEntriesReadContext.Provider>;
}

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
	const entriesReadAt = useContext(CalendarEntriesReadContext);
	const entriesReadAtRef = useRef(entriesReadAt);
	useEffect(() => {
		entriesReadAtRef.current = entriesReadAt;
	}, [entriesReadAt]);
	// The Calendar's read of the entries when a save landed: that read predates the save, so the card keeps the saved
	// labels until the Calendar reads the entries again, whatever labels that read brings (a failed read changes nothing)
	const [readAtSave, setReadAtSave] = useState<number | null>(null);
	const waitsForReadAfterSave = readAtSave !== null && entriesReadAt === readAtSave;
	const carriedKey = carriedLabels.map((label) => label.id).join(',');
	useEffect(() => {
		if (isSaving || waitsForReadAfterSave) {
			return;
		}
		setLabelIds(carriedKey ? carriedKey.split(',') : []);
	}, [carriedKey, isSaving, waitsForReadAfterSave]);

	const save = useCallback(
		async (next: string[]) => {
			const previous = labelIds;
			setLabelIds(next);
			setIsSaving(true);
			try {
				await timeLogService.updateTimeLogLabels(log.id, next);
			} catch {
				setLabelIds(previous);
				toast.error(t('timer.labels.SAVE_FAILED'));
				setIsSaving(false);
				return;
			}
			setReadAtSave(entriesReadAtRef.current);
			try {
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
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
