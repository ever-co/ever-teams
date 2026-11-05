'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { AppsUrlsOverviewSkeleton } from './apps-urls-overview';
import { AppsUrlsRankedListSkeleton } from './apps-urls-ranked-list';

const ACTION_WIDTHS = ['w-29.25'];

const CONTROL_WIDTHS = ['w-42.25'];

const TRAILING_WIDTHS = ['w-75'];

export function AppsUrlsPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('sidebar.APPS_AND_URLS')}
					actionWidths={ACTION_WIDTHS}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<AppsUrlsOverviewSkeleton />
				<AppsUrlsRankedListSkeleton />
			</div>
		</PageSkeletonFrame>
	);
}
