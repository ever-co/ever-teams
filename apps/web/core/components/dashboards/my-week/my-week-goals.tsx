'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { GoalProgressRow, GoalRows } from '@/core/components/dashboards/goals/goal-row';
import { DashboardSection } from '@/core/components/dashboards/kit/dashboard-layout';
import { ArrowRight } from '@/core/components/icons';
import { GOALS_PATH } from '@/core/components/layouts/my-work-navigation';
import { useMyWeekGoals } from '@/core/hooks/time-goals/use-my-week-goals';

/**
 * My week's Goals block: this week's goals of the signed-in person and their state, with the figures of the Goals
 * page. Nothing is added for a person without goals, or where the platform has none.
 */
export function MyWeekGoals({ enabled }: Readonly<{ enabled: boolean }>) {
	const t = useTranslations();
	const { rows, isShown } = useMyWeekGoals(enabled);
	if (!isShown) {
		return null;
	}
	const title = t('dashboard.goals.TITLE');
	const allGoals = (
		<Link
			href={GOALS_PATH}
			className="inline-flex items-center gap-1 rounded-md text-xs font-medium text-muted-foreground outline-none hover:text-foreground focus-visible:ring-[3px] focus-visible:ring-ring/25 [&_svg]:size-3.5"
		>
			{t('dashboard.goals.ALL_GOALS')}
			<ArrowRight aria-hidden="true" />
		</Link>
	);
	return (
		<DashboardSection title={title} actions={allGoals} ariaLabel={title} bodyClassName="pb-1">
			<GoalRows label={title}>
				{rows.map((row) => (
					<GoalProgressRow key={`${row.goalId}:${row.employeeId}`} row={row} />
				))}
			</GoalRows>
		</DashboardSection>
	);
}
