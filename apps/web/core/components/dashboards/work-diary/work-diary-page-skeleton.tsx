'use client';

import { useTranslations } from 'next-intl';
import { PageLayout } from '@/core/components/layouts/default-layout';
import { DashboardSection, DashboardToolbar } from '@/core/components/dashboards/kit/dashboard-layout';
import { MetricStrip } from '@/core/components/dashboards/kit/metric-strip';
import { DASHBOARD_STACK } from '@/core/components/dashboards/kit/recipes';
import { DiaryDayStripSkeleton } from './diary-day-strip';
import { DiaryHoursSkeleton } from './diary-hours';
import { DiaryRowsSkeleton } from './work-diary-parts';

const FIGURE_KEYS = ['tracked', 'activity', 'tasks', 'screenshots'] as const;

/** The Work diary page while it loads, in the page's own layout: toolbar, figures, tasks, apps, hours. */
export function WorkDiaryPageSkeleton() {
	const t = useTranslations();
	const title = t('sidebar.WORK_DIARY');
	const figures = FIGURE_KEYS.map((key) => ({ key, label: '', value: '' }));
	return (
		<PageLayout
			title={title}
			className="min-h-0 flex-1"
			mainHeaderSlot={<DashboardToolbar title={title} isMetaLoading controls={<DiaryDayStripSkeleton />} />}
		>
			<div className={DASHBOARD_STACK} aria-busy="true">
				<DashboardSection>
					<MetricStrip items={figures} isLoading ariaLabel={t('dashboard.workDiary.FIGURES_LABEL')} />
				</DashboardSection>
				<div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
					<div className="flex min-w-0 flex-col gap-4 lg:col-start-2 lg:row-start-1">
						<DashboardSection title={t('common.TASKS')}>
							<DiaryRowsSkeleton />
						</DashboardSection>
						<DashboardSection title={t('dashboard.timesheets.diary.APPS')}>
							<DiaryRowsSkeleton />
						</DashboardSection>
					</div>
					<DashboardSection
						title={t('common.SCREENSHOTS')}
						className="lg:col-start-1 lg:row-start-1"
						bodyClassName="px-4 pb-4"
					>
						<DiaryHoursSkeleton />
					</DashboardSection>
				</div>
			</div>
		</PageLayout>
	);
}
