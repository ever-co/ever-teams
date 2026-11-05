'use client';

import { useTranslations } from 'next-intl';
import { badgeVariants } from '@/core/components/common/badge';
import { Pencil, Plus } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import {
	editedAtOfLog,
	isManualLog,
	manualReasonOf,
	type TimesheetFormatters
} from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

const CHANGE_CHIP = cn(badgeVariants({ variant: 'outline' }), 'h-5 px-1.5 text-muted-foreground');

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

/** "Added" for time entered by hand, "Edited" for time changed after it was recorded; one log can carry both. */
export function LogChangeChips({
	log,
	formatters,
	className
}: Readonly<{ log: ITimeLog; formatters: TimesheetFormatters; className?: string }>) {
	const isAdded = isManualLog(log);
	const editedAt = editedAtOfLog(log);
	const isEdited = Boolean(editedAt);
	const hasChange = isAdded || isEdited;
	if (!hasChange) {
		return null;
	}
	return (
		<span className={cn('flex shrink-0 items-center gap-1', className)}>
			{isAdded && <AddedChip />}
			{editedAt && <EditedChip editedAt={editedAt} formatters={formatters} />}
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
