'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { TimeActivityBreakdownSkeleton, breakdownColumnsOf } from './time-activity-breakdown';
import { TimeActivityReportSheetSkeleton } from './time-activity-report-sheet';

const CONTROL_WIDTHS = ['w-42.25', 'w-21'];

const TRAILING_WIDTHS = ['w-79', 'w-20.5'];

/** Only managers reach the reports, so the first picture carries their columns. */
const FIRST_COLUMNS = breakdownColumnsOf('date', [], true);

export function TimeActivityPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<ToolbarBandSkeleton
					title={t('timeActivity.TIME_AND_ACTIVITY')}
					controlWidths={CONTROL_WIDTHS}
					trailingWidths={TRAILING_WIDTHS}
				/>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<TimeActivityReportSheetSkeleton />
				<TimeActivityBreakdownSkeleton grouping="date" columns={FIRST_COLUMNS} />
			</div>
		</PageSkeletonFrame>
	);
}
