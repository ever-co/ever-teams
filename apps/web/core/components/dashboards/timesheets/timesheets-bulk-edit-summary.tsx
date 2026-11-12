'use client';

import { type DottedLanguageObjectStringPaths, useTranslations } from 'next-intl';
import { type OrbTone, ToastOrb } from '@/core/components/common/toast-orb';
import type { BulkEditProgress } from '@/core/hooks/dashboards/timesheets/use-bulk-edit-run';
import { cn } from '@/core/lib/helpers';
import type {
	BulkEditReason,
	BulkEditReasonLine,
	BulkEditResult
} from '@/core/lib/utils/dashboards/timesheet-bulk-edit';

const REASON_KEYS: Record<BulkEditReason, DottedLanguageObjectStringPaths> = {
	notAllowed: 'dashboard.timesheets.BULK_EDIT.REASON.NOT_ALLOWED',
	running: 'dashboard.timesheets.BULK_EDIT.REASON.RUNNING',
	approved: 'dashboard.timesheets.BULK_EDIT.REASON.APPROVED',
	otherTeam: 'dashboard.timesheets.BULK_EDIT.REASON.OTHER_TEAM',
	unchanged: 'dashboard.timesheets.BULK_EDIT.REASON.UNCHANGED',
	overlap: 'dashboard.timesheets.BULK_EDIT.REASON.OVERLAP',
	checkFailed: 'dashboard.timesheets.BULK_EDIT.REASON.CHECK_FAILED',
	failed: 'dashboard.timesheets.BULK_EDIT.REASON.FAILED'
};

/** The dialog's one inset, in the tint the design system keeps for a deliberate aside. */
const SUMMARY_TINT = 'rounded-lg bg-foreground/[0.03] px-3 py-2.5';

const SUMMARY_INSET = cn('flex flex-col gap-1.5', SUMMARY_TINT);

const SUMMARY_HEADLINE = 'text-[13px] font-medium tabular-nums text-foreground';

const SUMMARY_LINE = 'text-xs leading-snug text-muted-foreground';

function reasonLineKeyOf(line: BulkEditReasonLine) {
	return `${line.reason}:${line.detailKey ?? ''}`;
}

function ReasonLine({ line }: Readonly<{ line: BulkEditReasonLine }>) {
	const t = useTranslations();
	const text = t(REASON_KEYS[line.reason], { count: line.count });
	let detail: string | null = null;
	if (line.detailKey) {
		detail = t(line.detailKey as DottedLanguageObjectStringPaths);
	}
	return (
		<li className={SUMMARY_LINE}>
			{text}
			{detail && <> {detail}</>}
		</li>
	);
}

/** One line per reason with its count: the entries themselves are never listed. */
function ReasonLines({ lines }: Readonly<{ lines: ReadonlyArray<BulkEditReasonLine> }>) {
	const hasNoLine = lines.length === 0;
	if (hasNoLine) {
		return null;
	}
	return (
		<ul className="flex flex-col gap-1">
			{lines.map((line) => (
				<ReasonLine key={reasonLineKeyOf(line)} line={line} />
			))}
		</ul>
	);
}

/** The entry being saved: the ones finished so far, plus one, never past the last. */
function positionOf(progress: BulkEditProgress) {
	return Math.min(progress.done + 1, progress.total);
}

/**
 * What the edit will do, said before it is confirmed: how many entries it updates, then how many it leaves out and
 * why. While it runs, how far it is.
 */
export function TimesheetsBulkEditPreview({
	hasChoice,
	saveCount,
	leftOutLines,
	progress
}: Readonly<{
	hasChoice: boolean;
	saveCount: number;
	leftOutLines: ReadonlyArray<BulkEditReasonLine>;
	/** Set while the entries are being saved. */
	progress: BulkEditProgress | null;
}>) {
	const t = useTranslations();

	if (progress) {
		return (
			<div role="status" className={SUMMARY_INSET}>
				<p className={SUMMARY_HEADLINE}>
					{t('dashboard.timesheets.BULK_EDIT.PROGRESS', {
						done: positionOf(progress),
						total: progress.total
					})}
				</p>
			</div>
		);
	}

	if (!hasChoice) {
		return (
			<div role="status" className={SUMMARY_INSET}>
				<p className={SUMMARY_LINE}>{t('dashboard.timesheets.BULK_EDIT.NOTHING_CHOSEN')}</p>
			</div>
		);
	}

	return (
		<div role="status" className={SUMMARY_INSET}>
			<p className={SUMMARY_HEADLINE}>{t('dashboard.timesheets.BULK_EDIT.WILL_UPDATE', { count: saveCount })}</p>
			<ReasonLines lines={leftOutLines} />
		</div>
	);
}

function toneOf(result: BulkEditResult): OrbTone {
	const hasUpdatedNothing = result.updatedCount === 0;
	if (hasUpdatedNothing) {
		return 'error';
	}
	return 'warning';
}

/** What a run that left entries as they were reports: both counts, then one line per reason. */
export function TimesheetsBulkEditReport({ result }: Readonly<{ result: BulkEditResult }>) {
	const t = useTranslations();
	return (
		<div role="status" className={cn('flex items-start gap-2.5', SUMMARY_TINT)}>
			<ToastOrb tone={toneOf(result)} size="sm" />
			<div className="flex min-w-0 flex-col gap-1.5">
				<p className={cn(SUMMARY_HEADLINE, 'leading-6')}>
					{t('dashboard.timesheets.BULK_EDIT.UPDATED_PARTLY', {
						updated: result.updatedCount,
						notUpdated: result.notUpdatedCount
					})}
				</p>
				<ReasonLines lines={result.reasons} />
				<p className={SUMMARY_LINE}>{t('dashboard.timesheets.BULK_EDIT.STILL_SELECTED')}</p>
			</div>
		</div>
	);
}
