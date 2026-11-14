'use client';

import { type ReactNode, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { badgeVariants } from '@/core/components/common/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Pencil, Plus } from '@/core/components/icons';
import { useHistoryMemberNames } from '@/core/hooks/dashboards/timesheets/use-history-member-names';
import { useTimeLogHistory } from '@/core/hooks/dashboards/timesheets/use-time-log-history';
import { cn } from '@/core/lib/helpers';
import {
	editedAtOfLog,
	isManualLog,
	manualReasonOf,
	type TimesheetFormatters
} from '@/core/lib/utils/dashboards/timesheets';
import { entryNotesOf } from '@/core/lib/utils/timer/timer-notes';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { TimeLogHistoryView } from './time-log-history';

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

function ownerNamesOf(log: ITimeLog) {
	const names = new Map<string, string>();
	const ownerId = log.employee?.id ?? log.employeeId;
	const ownerName = log.employee?.fullName;
	if (ownerId && ownerName) {
		names.set(ownerId, ownerName);
	}
	return names;
}

/** The Edited chip as a button: it opens the entry's history, read only once it is opened. */
function EditedHistoryChip({
	log,
	editedAt,
	formatters
}: Readonly<{ log: ITimeLog; editedAt: Date; formatters: TimesheetFormatters }>) {
	const t = useTranslations();
	const [isOpen, setIsOpen] = useState(false);
	const history = useTimeLogHistory(log.id, isOpen);
	const ownerNames = useMemo(() => ownerNamesOf(log), [log]);
	const memberNameOf = useHistoryMemberNames(ownerNames);
	const editedDate = formatters.dayDate(editedAt);
	const editedTime = formatters.time(editedAt);
	const editedOn = t('dashboard.timesheets.CHANGE.EDITED_AT', { date: editedDate, time: editedTime });
	const title = t('dashboard.timesheets.HISTORY.TITLE');
	return (
		<Popover open={isOpen} onOpenChange={setIsOpen}>
			<PopoverTrigger asChild>
				<button
					type="button"
					title={editedOn}
					aria-label={t('dashboard.timesheets.HISTORY.OPEN', { edited: editedOn })}
					className={cn(
						CHANGE_CHIP,
						'cursor-pointer outline-none transition-colors hover:bg-foreground/5 hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 data-[state=open]:text-foreground'
					)}
				>
					<Pencil aria-hidden="true" />
					<span>{t('dashboard.timesheets.CHANGE.EDITED')}</span>
				</button>
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align="start"
				collisionPadding={8}
				aria-label={title}
				className="w-80 max-w-[calc(100vw-1rem)] p-0"
			>
				<div className="flex flex-col gap-0.5 border-b border-border px-3.5 py-2.5">
					<p className="text-[13px] font-semibold text-foreground">{title}</p>
					<p className="text-xs tabular-nums text-muted-foreground">{editedOn}</p>
				</div>
				<div className="max-h-80 overflow-y-auto px-3.5 py-3">
					<TimeLogHistoryView
						state={history}
						formatters={formatters}
						memberNameOf={memberNameOf}
						onRetry={history.refetch}
					/>
				</div>
			</PopoverContent>
		</Popover>
	);
}

/**
 * "Added" for time entered by hand, "Edited" for time changed after it was recorded; one log can carry both. With
 * `opensHistory`, the Edited chip opens what changed, before and after.
 */
export function LogChangeChips({
	log,
	formatters,
	opensHistory = false,
	className
}: Readonly<{ log: ITimeLog; formatters: TimesheetFormatters; opensHistory?: boolean; className?: string }>) {
	const isAdded = isManualLog(log);
	const editedAt = editedAtOfLog(log);
	const isEdited = Boolean(editedAt);
	const hasChange = isAdded || isEdited;
	if (!hasChange) {
		return null;
	}
	let editedChip: ReactNode = null;
	if (editedAt) {
		editedChip = <EditedChip editedAt={editedAt} formatters={formatters} />;
	}
	if (editedAt && opensHistory) {
		editedChip = <EditedHistoryChip log={log} editedAt={editedAt} formatters={formatters} />;
	}
	return (
		<span className={cn('flex shrink-0 items-center gap-1', className)}>
			{isAdded && <AddedChip />}
			{editedChip}
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
