'use client';

import { useLocale, useTranslations } from 'next-intl';
import { CircleAlert, Clock } from '@/core/components/icons';
import { ConfirmDestructiveDialog, type DangerConsequence } from '@/core/components/settings/kit/danger';
import type { TimeOverlapGuard } from '@/core/hooks/timesheet/use-time-overlap-guard';
import { formatOverlapDuration, type OverlappedEntry } from '@/core/lib/utils/time-log-overlap';

const LISTED_ENTRIES = 5;

function entryNameOf(entry: OverlappedEntry, fallback: string): string {
	return entry.taskTitle ?? entry.projectName ?? fallback;
}

/**
 * Asked before a manual time save that overlaps time already recorded: how much would be removed, from which
 * entries. Cancel goes back to the dialog underneath, which keeps its values.
 */
export function TimeOverlapConfirmDialog({
	guard,
	confirmLabel
}: Readonly<{ guard: TimeOverlapGuard; confirmLabel: string }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { summary } = guard;
	const startFormatter = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short' });
	const rangeFormatter = new Intl.DateTimeFormat(locale, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit'
	});

	const whenOf = (entry: OverlappedEntry) => {
		if (entry.isRunning) {
			return t('timeOverlap.RUNNING_SINCE', { start: startFormatter.format(entry.start) });
		}
		return rangeFormatter.formatRange(entry.start, entry.end);
	};

	const listedEntries = summary.entries.slice(0, LISTED_ENTRIES);
	const unlistedCount = summary.entries.length - listedEntries.length;
	const consequences: DangerConsequence[] = listedEntries.map((entry) => ({
		key: entry.id,
		icon: <Clock aria-hidden="true" />,
		text: (
			<span className="flex min-w-0 flex-col">
				<span className="truncate font-medium">{entryNameOf(entry, t('timeOverlap.NO_TASK'))}</span>
				<span className="text-xs tabular-nums text-muted-foreground">
					{t('timeOverlap.ENTRY_REMOVED', {
						when: whenOf(entry),
						duration: formatOverlapDuration(entry.overlappedSeconds)
					})}
				</span>
			</span>
		)
	}));

	return (
		<ConfirmDestructiveDialog
			open={guard.isConfirmOpen}
			onClose={guard.cancel}
			title={t('timeOverlap.TITLE', { duration: formatOverlapDuration(summary.totalSeconds) })}
			description={t('timeOverlap.DESCRIPTION', { count: summary.entries.length })}
			consequences={consequences}
			confirmLabel={confirmLabel}
			isPending={false}
			onConfirm={guard.confirm}
		>
			{unlistedCount > 0 && (
				<p className="text-xs text-muted-foreground">
					{t('timeOverlap.MORE_ENTRIES', { count: unlistedCount })}
				</p>
			)}
		</ConfirmDestructiveDialog>
	);
}

/** Shown in the dialog when the overlap lookup failed: nothing was saved, and the member is told so. */
export function TimeOverlapCheckError({ guard }: Readonly<{ guard: TimeOverlapGuard }>) {
	const t = useTranslations();
	if (!guard.hasCheckFailed) {
		return null;
	}
	return (
		<p role="alert" className="flex items-start gap-1.5 text-[13px] text-destructive-ink">
			<CircleAlert className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
			{t('timeOverlap.CHECK_FAILED')}
		</p>
	);
}
