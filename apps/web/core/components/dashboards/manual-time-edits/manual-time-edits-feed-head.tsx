'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { SegmentedControlSkeleton } from '@/core/components/common/skeleton/segmented-control-skeleton';
import { SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import type { TrackedShare } from '@/core/hooks/dashboards/manual-time-edits/use-manual-time-edits-report';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort } from '@/core/lib/utils/dashboard-figures';
import {
	type ChangeAction,
	type EditsFigures,
	sharePercentTextOf
} from '@/core/lib/utils/dashboards/manual-time-edits';
import { EditsActionControl } from './manual-time-edits-toolbar';

const LEAD = 'text-[15px] leading-6 text-muted-foreground text-pretty';

const LEAD_FIGURE = 'font-medium text-foreground tabular-nums';

const LEAD_SHARE = 'font-semibold text-primary-ink tabular-nums';

const ACTION_SKELETON = [
	{ labelWidth: 'w-5', hasCount: true },
	{ labelWidth: 'w-10', hasCount: true },
	{ labelWidth: 'w-10', hasCount: true }
];

function hasShareFigure(share: TrackedShare) {
	const isReady = share.status === 'ready';
	const isLoading = share.status === 'loading';
	return isReady || isLoading;
}

function percentTextOf(share: TrackedShare, locale: string) {
	if (share.status === 'ready') {
		return sharePercentTextOf(share.percent, locale);
	}
	return '';
}

function renderFigure(chunks: ReactNode) {
	return <span className={LEAD_FIGURE}>{chunks}</span>;
}

function renderShare(chunks: ReactNode) {
	return <span className={LEAD_SHARE}>{chunks}</span>;
}

function renderShareLoading() {
	return <span aria-hidden="true" className={cn('inline-block h-3.5 w-9 align-middle', SKELETON_BAR)} />;
}

function shareRendererOf(share: TrackedShare) {
	if (share.status === 'loading') {
		return renderShareLoading;
	}
	return renderShare;
}

/**
 * The feed opens on one sentence made of loaded figures only: the share of all tracked time when the daily report
 * gives the total, the manual duration otherwise (a Billable filter, a failed or empty report). Silent when the
 * period has no manual time, since the empty state below says it.
 */
export function FeedLeadSentence({ figures, share }: Readonly<{ figures: EditsFigures; share: TrackedShare }>) {
	const t = useTranslations();
	const locale = useLocale();
	const hasEntries = figures.entryCount > 0;
	if (!hasEntries) {
		return null;
	}
	const counts = { entries: figures.entryCount, members: figures.memberCount };
	if (hasShareFigure(share)) {
		const isShareLoading = share.status === 'loading';
		return (
			<p className={LEAD} aria-busy={isShareLoading}>
				{t.rich('dashboard.manualTimeEdits.LEAD_SHARE', {
					...counts,
					percent: percentTextOf(share, locale),
					share: shareRendererOf(share),
					strong: renderFigure
				})}
			</p>
		);
	}
	return (
		<p className={LEAD}>
			{t.rich('dashboard.manualTimeEdits.LEAD_TOTAL', {
				...counts,
				duration: formatDurationShort(figures.manualSeconds),
				strong: renderFigure
			})}
		</p>
	);
}

export function ManualTimeEditsFeedHead({
	figures,
	actionFigures,
	share,
	action,
	onActionChange
}: Readonly<{
	figures: EditsFigures;
	actionFigures: EditsFigures | null;
	share: TrackedShare;
	action: ChangeAction;
	onActionChange: (action: ChangeAction) => void;
}>) {
	return (
		<div className="flex min-w-0 flex-col gap-3 px-1">
			<FeedLeadSentence figures={figures} share={share} />
			<div className="flex flex-wrap items-center gap-2">
				<EditsActionControl figures={actionFigures} action={action} onActionChange={onActionChange} />
			</div>
		</div>
	);
}

export function ManualTimeEditsFeedHeadSkeleton() {
	return (
		<div className="flex min-w-0 flex-col gap-3 px-1" aria-hidden="true">
			<span className="flex flex-col gap-2 py-1">
				<span className={cn('h-3 w-[min(30rem,92%)]', SKELETON_BAR)} />
				<span className={cn('h-3 w-44', SKELETON_BAR)} />
			</span>
			<SegmentedControlSkeleton segments={ACTION_SKELETON} className="self-start" />
		</div>
	);
}
