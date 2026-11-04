'use client';

import { useTranslations } from 'next-intl';
import { Clock } from '@/core/components/icons';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { CalendarEntry } from '@/core/lib/utils/calendar-view';
import type { TimesheetFormatters } from '@/core/lib/utils/dashboards/timesheets';
import {
	BillableLine,
	EntryActions,
	type EntryHandlers,
	entryRangeTextOf,
	ManualChip,
	ProjectLine,
	ReasonQuote,
	useEntryTitle
} from './calendar-entry-parts';

function KindLabel({ isManual }: Readonly<{ isManual: boolean }>) {
	const t = useTranslations();
	if (isManual) {
		return <ManualChip />;
	}
	return (
		<span className="inline-flex h-5 shrink-0 items-center rounded-md bg-primary/10 px-1.5 text-[11px] font-medium text-primary-ink">
			{t('dashboard.calendar.LEGEND.TRACKED')}
		</span>
	);
}

/** What an entry is, in the popover a block opens: task, project, range and duration, kind, billable, reason. */
export function EntryDetails({
	entry,
	formatters,
	handlers,
	onClose
}: Readonly<{
	entry: CalendarEntry;
	formatters: TimesheetFormatters;
	handlers: EntryHandlers;
	onClose: () => void;
}>) {
	const t = useTranslations();
	const title = useEntryTitle(entry);
	const runningLabel = t('dashboard.timesheets.RUNNING');
	const rangeText = entryRangeTextOf(entry, formatters, runningLabel);
	const duration = formatDurationShort(entry.durationSeconds);
	const dayText = formatters.dayDate(entry.start);
	const canEdit = handlers.canEdit(entry.log);
	return (
		<div className="flex flex-col gap-3">
			<div className="flex min-w-0 flex-col gap-1">
				<p className="line-clamp-2 text-[13px] font-medium text-foreground">{title}</p>
				<ProjectLine entry={entry} />
			</div>
			<div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs tabular-nums text-muted-foreground">
				<span className="inline-flex items-center gap-1.5">
					<Clock aria-hidden="true" className="size-3.5 shrink-0" />
					{dayText} · {rangeText}
				</span>
				<span className="font-medium text-foreground">{duration}</span>
			</div>
			<div className="flex flex-wrap items-center gap-2">
				<KindLabel isManual={entry.isManual} />
				<BillableLine isBillable={entry.isBillable} />
			</div>
			<ReasonQuote reason={entry.reason} />
			{canEdit && (
				<div className="flex justify-end hairline-t border-dashed border-border pt-3">
					<EntryActions entry={entry} handlers={handlers} onBeforeAction={onClose} />
				</div>
			)}
		</div>
	);
}
