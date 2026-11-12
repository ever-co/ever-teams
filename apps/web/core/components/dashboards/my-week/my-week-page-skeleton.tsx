'use client';

import { useTranslations } from 'next-intl';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { DayBarsSkeleton } from '@/core/components/dashboards/kit/dashboard-states';
import { DASHBOARD_STACK, DASHBOARD_SURFACE, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';
import {
	MY_WEEK_CHART_HEIGHT,
	MY_WEEK_CHART_PANE,
	MY_WEEK_COLUMNS,
	MY_WEEK_FIGURE_PANE,
	MY_WEEK_SUMMARY_GRID
} from './my-week-recipes';

const SKELETON_ROW_KEYS = ['row-0', 'row-1', 'row-2', 'row-3'];

const SUPPORTING_FIGURE_KEYS = ['today', 'billable'];

const PERIOD_SWITCH_WIDTHS = ['w-64'];

function RowsSkeleton() {
	return (
		<ul aria-hidden="true" className="flex flex-col gap-5 px-4 pt-1 pb-4">
			{SKELETON_ROW_KEYS.map((rowKey) => (
				<li key={rowKey} className="flex items-center gap-3">
					<span className={cn('h-2.5 w-8', SKELETON_BAR)} />
					<span className={cn('h-2.5 flex-1', SKELETON_BAR)} />
					<span className={cn('h-2.5 w-10', SKELETON_BAR)} />
				</li>
			))}
		</ul>
	);
}

function SummarySkeleton() {
	return (
		<div aria-hidden="true" className={cn(DASHBOARD_SURFACE, MY_WEEK_SUMMARY_GRID)}>
			<div className={MY_WEEK_FIGURE_PANE}>
				<div className="flex flex-col gap-3">
					<span className={cn('h-2.5 w-28', SKELETON_BAR)} />
					<span className={cn('h-7 w-40', SKELETON_BAR)} />
					<span className={cn('h-3.5 w-full', SKELETON_BAR)} />
					<span className={cn('h-2.5 w-36', SKELETON_BAR)} />
				</div>
				<div className="grid grid-cols-2 gap-x-6">
					{SUPPORTING_FIGURE_KEYS.map((figureKey) => (
						<div key={figureKey} className="flex flex-col gap-2">
							<span className={cn('h-2.5 w-12', SKELETON_BAR)} />
							<span className={cn('h-4 w-16', SKELETON_BAR)} />
						</div>
					))}
				</div>
			</div>
			<div className={MY_WEEK_CHART_PANE}>
				<span className="flex min-h-7 items-center">
					<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
				</span>
				<DayBarsSkeleton heightClassName={MY_WEEK_CHART_HEIGHT} />
			</div>
		</div>
	);
}

export function MyWeekBodySkeleton() {
	const t = useTranslations();
	return (
		<>
			<SummarySkeleton />
			<div className={MY_WEEK_COLUMNS}>
				<DashboardSection title={t('dashboard.myWeek.PROJECTS_TITLE')}>
					<RowsSkeleton />
				</DashboardSection>
				<DashboardSection title={t('dashboard.myWeek.RECENT_TITLE')}>
					<RowsSkeleton />
				</DashboardSection>
			</div>
		</>
	);
}

export function MyWeekPageSkeleton() {
	const t = useTranslations();
	const title = t('dashboard.myWeek.TITLE');
	return (
		<PageLayout
			title={title}
			className="min-h-0 flex-1"
			mainHeaderSlot={
				<DashboardToolbar
					title={title}
					isMetaLoading
					controls={<ToolbarPills widths={PERIOD_SWITCH_WIDTHS} />}
				/>
			}
		>
			<div className={DASHBOARD_STACK} aria-busy="true">
				<MyWeekBodySkeleton />
			</div>
		</PageLayout>
	);
}
