'use client';

import { useTranslations } from 'next-intl';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { DASHBOARD_STACK, SKELETON_BAR } from '@/core/components/dashboards/kit/recipes';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { ToolbarPills } from '@/core/components/layouts/page-skeleton';
import { cn } from '@/core/lib/helpers';

const ROW_KEYS = ['row-0', 'row-1', 'row-2', 'row-3', 'row-4'];

const PERIOD_SWITCH_WIDTHS = ['w-64'];

/** Goal rows while they load: a name and its facts, the figures and the meter. */
export function GoalRowsSkeleton({ rows = 3 }: Readonly<{ rows?: number }>) {
	return (
		<ul aria-hidden="true" className="flex flex-col">
			{ROW_KEYS.slice(0, rows).map((rowKey) => (
				<li
					key={rowKey}
					className="grid grid-cols-1 items-center gap-x-4 gap-y-2 px-4 py-3.5 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_1.75rem]"
				>
					<span className="flex flex-col gap-2">
						<span className={cn('h-3 w-40', SKELETON_BAR)} />
						<span className={cn('h-2.5 w-56 max-w-full', SKELETON_BAR)} />
					</span>
					<span className="flex flex-col gap-2">
						<span className={cn('h-2.5 w-24', SKELETON_BAR)} />
						<span className={cn('h-3 w-full', SKELETON_BAR)} />
					</span>
					<span />
				</li>
			))}
		</ul>
	);
}

export function GoalsBodySkeleton() {
	const t = useTranslations();
	return (
		<DashboardSection title={t('dashboard.goals.YOUR_GOALS')}>
			<GoalRowsSkeleton />
		</DashboardSection>
	);
}

export function GoalsPageSkeleton() {
	const t = useTranslations();
	const title = t('dashboard.goals.TITLE');
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
				<GoalsBodySkeleton />
			</div>
		</PageLayout>
	);
}
