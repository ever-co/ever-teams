'use client';

import { useTranslations } from 'next-intl';
import { Badge, type BadgeProps } from '@/core/components/common/badge';
import { Alert, CircleAlert } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import type { TimeImportEntry, TimeImportRow, TimeImportRowStatus } from '@/core/lib/utils/time-import-rows';
import type { TimeImportCells } from '@/core/lib/utils/time-import-sheet';
import { FILE_NAME_TEXT, type TimeImportCopy } from './time-import-copy';

const PART_SEPARATOR = ' · ';

const STATUS_BADGES: Readonly<Record<TimeImportRowStatus, NonNullable<BadgeProps['variant']>>> = {
	ready: 'default',
	leftOut: 'warning',
	saved: 'success',
	failed: 'destructive',
	notSent: 'secondary'
};

const REASON_TONES: Readonly<Record<TimeImportRowStatus, string>> = {
	ready: 'text-muted-foreground',
	leftOut: 'text-warning-foreground',
	saved: 'text-muted-foreground',
	failed: 'text-destructive-ink',
	notSent: 'text-muted-foreground'
};

function filledPartsOf(parts: ReadonlyArray<string | null>): string[] {
	return parts.filter((part): part is string => Boolean(part));
}

/** The cells as the file has them, for a row whose date or times could not be read. */
function typedWhenOf(cells: TimeImportCells): string {
	const typedEnd = cells.endTime || cells.duration;
	const parts = filledPartsOf([cells.date, cells.startTime, typedEnd]);
	return parts.join(PART_SEPARATOR);
}

function typedDetailsOf(cells: TimeImportCells): string {
	const parts = filledPartsOf([cells.memberEmail, cells.project, cells.task, cells.notes]);
	return parts.join(PART_SEPARATOR);
}

interface TimeImportRowItemProps {
	row: TimeImportRow;
	status: TimeImportRowStatus;
	reasons: ReadonlyArray<string>;
	copy: TimeImportCopy;
}

function ReasonGlyph({ status }: Readonly<{ status: TimeImportRowStatus }>) {
	if (status === 'failed') {
		return <CircleAlert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />;
	}
	if (status === 'leftOut') {
		return <Alert aria-hidden="true" className="mt-0.5 size-3.5 shrink-0" />;
	}
	return null;
}

/**
 * A row of the file: what it holds, what becomes of it, and why when it is not saved. Every value comes from the
 * file and is rendered as text.
 */
export function TimeImportRowItem({ row, status, reasons, copy }: Readonly<TimeImportRowItemProps>) {
	const t = useTranslations();
	const { entry, cells } = row;

	const detailsOf = (readEntry: TimeImportEntry): string => {
		let memberLabel: string | null = null;
		if (readEntry.memberName) {
			memberLabel = t('timeImport.row.FOR_MEMBER', { name: readEntry.memberName });
		}
		let billableLabel: string | null = null;
		if (readEntry.isBillable) {
			billableLabel = t('timeImport.row.BILLABLE');
		}
		const parts = filledPartsOf([
			memberLabel,
			readEntry.projectName,
			readEntry.taskTitle,
			billableLabel,
			readEntry.notes
		]);
		return parts.join(PART_SEPARATOR);
	};

	let when = typedWhenOf(cells);
	let duration: string | null = null;
	let details = typedDetailsOf(cells);
	if (entry) {
		when = copy.rangeOf(entry.start, entry.end);
		duration = formatDurationShort(entry.seconds);
		details = detailsOf(entry);
	}

	return (
		<li className="grid grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1.5 px-4 py-3 sm:grid-cols-[4.5rem_minmax(0,1fr)_auto]">
			<span className="order-1 pt-0.5 text-xs tabular-nums text-muted-foreground">
				{t('timeImport.row.NUMBER', { row: row.row })}
			</span>
			<div className="order-3 col-span-2 flex min-w-0 flex-col gap-1 sm:order-2 sm:col-span-1">
				{when && (
					<p className={cn('text-[13px] font-medium tabular-nums text-foreground', FILE_NAME_TEXT)}>
						{when}
						{duration && (
							<span className="font-normal text-muted-foreground">
								{PART_SEPARATOR}
								{duration}
							</span>
						)}
					</p>
				)}
				{details && <p className="truncate text-xs text-muted-foreground">{details}</p>}
				{reasons.map((reason) => (
					<p
						key={reason}
						className={cn('flex items-start gap-1.5 text-xs text-pretty', REASON_TONES[status])}
					>
						<ReasonGlyph status={status} />
						{reason}
					</p>
				))}
			</div>
			<Badge variant={STATUS_BADGES[status]} className="order-2 h-fit sm:order-3">
				{copy.statusLabel(status)}
			</Badge>
		</li>
	);
}
