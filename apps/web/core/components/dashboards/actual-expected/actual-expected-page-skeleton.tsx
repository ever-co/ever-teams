'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { PlanBulletRowsSkeleton } from './bullet-rows';
import { PlanOverviewSkeleton } from './plan-overview';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-41.75', 'w-21'];

const TRAILING_WIDTHS = ['w-40'];

export function ActualExpectedPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('dashboard.actualExpected.TITLE')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<PlanOverviewSkeleton />
				<PlanBulletRowsSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
