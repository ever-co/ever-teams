'use client';

import { useTranslations } from 'next-intl';
import { PageSkeletonFrame, ToolbarBandSkeleton, ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { TimeActivityBreakdownSkeleton, breakdownColumnsOf } from './time-activity-breakdown';
import { TimeActivityControlRow } from './time-activity-control-row';
import { TimeActivityReportSheetSkeleton } from './time-activity-report-sheet';

const CONTROL_WIDTHS = ['w-42.25', 'w-21'];

/** The grouping switch with its six choices, kept within the row as the switch itself is on a phone. */
const TRAILING_WIDTHS = ['w-94 max-w-full', 'w-20.5'];

/** Only managers reach the reports, so the first picture carries their columns. */
const FIRST_COLUMNS = breakdownColumnsOf('date', [], true);

export function TimeActivityPageSkeleton() {
	const t = useTranslations();
	return (
		<PageSkeletonFrame
			toolbar={
				<>
					<ToolbarBandSkeleton title={t('timeActivity.TIME_AND_ACTIVITY')} />
					<div className="px-4 pb-3" aria-hidden="true">
						<TimeActivityControlRow
							leading={<ToolbarPills widths={CONTROL_WIDTHS} />}
							trailing={<ToolbarPills widths={TRAILING_WIDTHS} />}
						/>
					</div>
				</>
			}
		>
			<div inert className={DASHBOARD_STACK}>
				<TimeActivityReportSheetSkeleton />
				<TimeActivityBreakdownSkeleton grouping="date" columns={FIRST_COLUMNS} />
			</div>
		</PageSkeletonFrame>
	);
}
