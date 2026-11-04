'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { ManualTimeEditsFeedSkeleton } from './manual-time-edits-feed';
import { FEED_LAYOUT } from './manual-time-edits-feed-layout';
import { ManualTimeEditsSummaryRailSkeleton } from './manual-time-edits-summary-rail';

const ACTION_WIDTHS = ['w-29.25', 'w-38'];

const CONTROL_WIDTHS = ['w-41.75', 'w-21'];

const TRAILING_WIDTHS = ['w-44'];

export function ManualTimeEditsPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('dashboard.manualTimeEdits.TITLE')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<div className={FEED_LAYOUT}>
					<ManualTimeEditsFeedSkeleton />
					<ManualTimeEditsSummaryRailSkeleton />
				</div>
			</div>
		</PageSkeletonFrame>
	);
}
