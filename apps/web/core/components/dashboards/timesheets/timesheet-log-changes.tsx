'use client';

import { useTranslations } from 'next-intl';
import { badgeVariants } from '@/core/components/common/badge';
import { Break, Pencil, Plus } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	editedAtOfLog,
	isManualLog,
	manualReasonOf,
	type TimesheetFormatters
} from '@/core/lib/utils/dashboards/timesheets';
import { isBreakLog } from '@/core/lib/utils/timer/timer-break';
import { entryNotesOf } from '@/core/lib/utils/timer/timer-notes';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const CHANGE_CHIP = cn(badgeVariants({ variant: 'outline' }), 'h-5 px-1.5 text-muted-foreground');

/** A break's own neutral tint, apart from work's entries and from the brand colour (#5216). */
const BREAK_CHIP = cn(CHANGE_CHIP, 'border-transparent bg-muted text-foreground/70');

export function BreakChip() {
	const t = useTranslations();
	return (
		<span className={BREAK_CHIP}>
			<Break aria-hidden="true" />
			<span>{t('breaks.BREAK')}</span>
		</span>
	);
}

function AddedChip() {
	const t = useTranslations();
	return (
		<span className={CHANGE_CHIP}>
			<Plus aria-hidden="true" />
			<span>{t('dashboard.timesheets.CHANGE.ADDED')}</span>
		</span>
	);
}

function EditedChip({ editedAt, formatters }: Readonly<{ editedAt: Date; formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const editedDate = formatters.dayDate(editedAt);
	const editedTime = formatters.time(editedAt);
	const editedOn = t('dashboard.timesheets.CHANGE.EDITED_AT', { date: editedDate, time: editedTime });
	return (
		<span title={editedOn} className={CHANGE_CHIP}>
			<Pencil aria-hidden="true" />
			<span aria-hidden="true">{t('dashboard.timesheets.CHANGE.EDITED')}</span>
			<span className="sr-only">{editedOn}</span>
		</span>
	);
}

/**
 * "Break" for a break (#5216), "Added" for time entered by hand, "Edited" for time changed after it was recorded; one
 * log can carry several.
 */
export function LogChangeChips({
	log,
	formatters,
	className
}: Readonly<{ log: ITimeLog; formatters: TimesheetFormatters; className?: string }>) {
	const isBreak = isBreakLog(log);
	const isAdded = isManualLog(log);
	const editedAt = editedAtOfLog(log);
	const isEdited = Boolean(editedAt);
	const hasChange = isBreak || isAdded || isEdited;
	if (!hasChange) {
		return null;
	}
	return (
		<span className={cn('flex shrink-0 items-center gap-1', className)}>
			{isBreak && <BreakChip />}
			{isAdded && <AddedChip />}
			{editedAt && <EditedChip editedAt={editedAt} formatters={formatters} />}
		</span>
	);
}

/** The notes typed with the timer or with the time added by hand, quoted under the task; the full text in the title. */
export function EntryNotesLine({ log }: Readonly<{ log: ITimeLog }>) {
	const t = useTranslations();
	const notes = entryNotesOf(log);
	if (!notes) {
		return null;
	}
	return (
		<span title={notes} className="max-w-full self-start truncate text-xs text-muted-foreground">
			<span className="sr-only">{t('common.NOTES')}: </span>
			{notes}
		</span>
	);
}

/** The reason typed when the time was added by hand, quoted under the task; the full text in the title. */
export function ManualReasonLine({ log }: Readonly<{ log: ITimeLog }>) {
	const t = useTranslations();
	const reason = manualReasonOf(log);
	if (!reason) {
		return null;
	}
	return (
		<span
			title={reason}
			className="max-w-full self-start truncate rounded-sm bg-foreground/[0.03] px-1.5 text-xs text-muted-foreground"
		>
			<span className="sr-only">{t('dashboard.timesheets.CHANGE.REASON_PREFIX')} </span>
			{reason}
		</span>
	);
}
