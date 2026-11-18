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

/** Labels saved on an entry, and the Calendar's read of the entries current when that save landed. */
interface SavedEntryLabels {
	labelIds: string[];
	readAt: number;
}

interface CalendarEntriesReadValue {
	/** The labels saved on this entry since the Calendar last read the entries, or null when it has read them since. */
	savedLabelsOf: (logId: string) => string[] | null;
	/** Remembers labels just saved on an entry, until the Calendar reads the entries again. */
	rememberSave: (logId: string, labelIds: string[]) => void;
}

/** Null outside the Calendar, where an entry's card follows the entry at once. */
const CalendarEntriesReadContext = createContext<CalendarEntriesReadValue | null>(null);

/**
 * When the Calendar read the entries its cards show: the `dataUpdatedAt` of its own logs query (#5368). A read asked
 * before a label save may still show the labels from before it, and the refetch after the save may fail: until the
 * Calendar reads the entries again, every card of that entry, one closed and opened again included, shows the labels
 * saved. Once it has, they follow the entry as read, whatever labels it has.
 */
export function CalendarEntriesRead({ readAt, children }: Readonly<{ readAt: number; children: ReactNode }>) {
	const [saves, setSaves] = useState<Record<string, SavedEntryLabels>>({});
	const readAtRef = useRef(readAt);
	useEffect(() => {
		readAtRef.current = readAt;
	}, [readAt]);
	const rememberSave = useCallback((logId: string, labelIds: string[]) => {
		setSaves((current) => ({ ...current, [logId]: { labelIds, readAt: readAtRef.current } }));
	}, []);
	const value = useMemo<CalendarEntriesReadValue>(() => {
		const savedLabelsOf = (logId: string) => {
			const saved = saves[logId];
			const isReadBeforeSave = saved?.readAt === readAt;
			return isReadBeforeSave ? saved.labelIds : null;
		};
		return { savedLabelsOf, rememberSave };
	}, [readAt, rememberSave, saves]);
	return <CalendarEntriesReadContext.Provider value={value}>{children}</CalendarEntriesReadContext.Provider>;
}

/**
 * The labels of the entry a Calendar block opens (Gauzy #12029): chips, and for whoever may edit the entry, the picker
 * that changes them at once. Nothing against an API without labels on entries.
 */
export function EntryLabelsLine({ log, canEdit }: Readonly<{ log: ITimeLog; canEdit: boolean }>) {
	const t = useTranslations();
	const queryClient = useQueryClient();
	const supportsLabels = useEntryLabelsSupport();
	const entriesRead = useContext(CalendarEntriesReadContext);
	const carriedLabels = useMemo(() => entryLabelsOf(log), [log]);
	const carriedKey = carriedLabels.map((label) => label.id).join(',');
	// The entry's labels as far as the Calendar knows: the ones saved since it last read the entries, else the read ones
	const savedLabelIds = entriesRead?.savedLabelsOf(log.id) ?? null;
	const knownKey = savedLabelIds ? savedLabelIds.join(',') : carriedKey;
	const [labelIds, setLabelIds] = useState<string[]>(() => (knownKey ? knownKey.split(',') : []));
	const [isSaving, setIsSaving] = useState(false);
	useEffect(() => {
		if (isSaving) {
			return;
		}
		setLabelIds(knownKey ? knownKey.split(',') : []);
	}, [knownKey, isSaving]);

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
			entriesRead?.rememberSave(log.id, next);
			try {
				await queryClient.invalidateQueries({ queryKey: queryKeys.timesheet.all });
			} finally {
				setIsSaving(false);
			}
		},
		[entriesRead, labelIds, log.id, queryClient, t]
	);

	if (!supportsLabels) {
		return null;
	}
	if (!canEdit) {
		return <EntryLabelChips labels={carriedLabels} />;
	}
	return <EntryLabelsPicker value={labelIds} onChange={save} carriedLabels={carriedLabels} isSaving={isSaving} />;
}
