'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { LimitAttentionSkeleton } from './limit-attention';
import { LimitHeatmapSkeleton } from './limit-heatmap';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-41.75', 'w-21'];

const TRAILING_WIDTHS = ['w-32.25'];

export function WeeklyLimitPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('common.DAILY_LIMIT')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<LimitAttentionSkeleton />
				<LimitHeatmapSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
