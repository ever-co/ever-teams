'use client';

import { useTranslations } from 'next-intl';
import { TimeSplitBody, TimeSplitSwitch, timeSplitMetaOf } from '@/core/components/dashboards/kit/time-split';
import type { TeamDashboardState } from '@/core/hooks/dashboards/team/use-team-dashboard';
import { useTimeSplit } from '@/core/hooks/dashboards/use-time-split';
import { TeamCard } from './team-card';
import { PAIRED_NARROW_SPAN } from './team-grid';

/** Where the team's time went in the period, by project or by client, beside the tasks by status. */
export function TeamTimeSplit({ dashboard }: Readonly<{ dashboard: TeamDashboardState }>) {
	const t = useTranslations();
	const split = useTimeSplit({ rows: dashboard.rows, report: dashboard.report });
	const isLoading = dashboard.isReportLoading;
	let meta: string | null = null;
	if (!isLoading) {
		meta = timeSplitMetaOf(split, t);
	}
	return (
		<TeamCard
			title={t('dashboard.team.projects.TITLE')}
			meta={meta}
			control={<TimeSplitSwitch split={split} />}
			className={PAIRED_NARROW_SPAN}
			bodyClassName="px-0 py-0"
			isBusy={dashboard.isRefreshing}
		>
			<TimeSplitBody
				split={split}
				isLoading={isLoading}
				isError={dashboard.isReportError}
				onRetry={dashboard.refetchReport}
				density="compact"
			/>
		</TeamCard>
	);
}
