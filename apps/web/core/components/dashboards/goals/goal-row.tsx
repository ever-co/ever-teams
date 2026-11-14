'use client';

import type { ReactNode } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { GoalMeter } from '@/core/components/dashboards/kit/meters';
import { cn } from '@/core/lib/helpers';
import { formatDurationShort, formatHoursLabel, formatPercent } from '@/core/lib/utils/dashboard-figures';
import { goalGapOf, goalShareOf } from '@/core/lib/utils/time-goals';
import {
	ETimeGoalComparison,
	ETimeGoalScope,
	type ITimeGoal,
	type ITimeGoalProgress
} from '@/core/types/interfaces/timesheet/time-goal';
import { GOAL_STATE_BADGES, GOAL_STATE_LABEL_KEYS, goalGapKeyOf, goalRuleKeyOf } from './goal-labels';

const SECONDS_PER_HOUR = 3600;

/** Projects and clients named on a row before the rest is counted. */
const NAMED_FILTERS = 2;

function namesOf(items: ITimeGoal['projects']) {
	return (items ?? []).map((item) => item.name?.trim() ?? '').filter(Boolean);
}

/** "Website, Mobile app +2": the first names of what a goal counts, the rest as a count. */
function shortListOf(names: string[]) {
	const shown = names.slice(0, NAMED_FILTERS).join(', ');
	const hiddenCount = names.length - NAMED_FILTERS;
	if (hiddenCount > 0) {
		return `${shown} +${hiddenCount}`;
	}
	return shown;
}

/** What a goal asks for, then what it counts: its rule, its projects and clients, billable time only. */
export function GoalFacts({ goal, className }: Readonly<{ goal: ITimeGoal; className?: string }>) {
	const t = useTranslations();
	const hours = formatHoursLabel(goal.targetHours * SECONDS_PER_HOUR);
	const facts: string[] = [t(goalRuleKeyOf(goal), { hours })];
	const projectNames = namesOf(goal.projects);
	const clientNames = namesOf(goal.organizationContacts);
	if (projectNames.length > 0) {
		facts.push(shortListOf(projectNames));
	}
	if (clientNames.length > 0) {
		facts.push(shortListOf(clientNames));
	}
	if (goal.billableOnly) {
		facts.push(t('dashboard.goals.BILLABLE_ONLY'));
	}
	if (goal.scope === ETimeGoalScope.TEAM) {
		facts.push(t('dashboard.goals.TEAM_GOAL'));
	}
	if (goal.scope === ETimeGoalScope.ORGANIZATION) {
		facts.push(t('dashboard.goals.ORGANIZATION_GOAL'));
	}
	return <p className={cn('truncate text-xs text-muted-foreground', className)}>{facts.join(' · ')}</p>;
}

export function GoalStateBadge({ row }: Readonly<{ row: ITimeGoalProgress }>) {
	const t = useTranslations();
	return (
		<span
			className={cn(
				'inline-flex h-5 shrink-0 items-center rounded-md px-1.5 text-xs font-medium',
				GOAL_STATE_BADGES[row.state]
			)}
		>
			{t(GOAL_STATE_LABEL_KEYS[row.state])}
		</span>
	);
}

/**
 * One goal of one member: its name and what it counts, the meter of My week and the Weekly limit report, the hours
 * counted against the target and the state. The figures are always written; the meter's colour is never the only
 * signal. On a phone the meter and figures go under the name.
 */
export function GoalProgressRow({ row, actions }: Readonly<{ row: ITimeGoalProgress; actions?: ReactNode }>) {
	const t = useTranslations();
	const locale = useLocale();
	const { goal, trackedSeconds, targetSeconds } = row;
	const isAtMost = goal.comparison === ETimeGoalComparison.AT_MOST;
	const tracked = formatDurationShort(trackedSeconds);
	const target = formatHoursLabel(targetSeconds);
	const gap = goalGapOf(trackedSeconds, targetSeconds);
	const gapText = t(goalGapKeyOf(gap, isAtMost), { duration: formatDurationShort(gap.seconds) });
	const percent = formatPercent(goalShareOf(trackedSeconds, targetSeconds), locale);
	const isOver = gap.kind === 'over' && isAtMost;
	return (
		<li className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-2 px-4 py-3 md:grid-cols-[minmax(0,1fr)_minmax(12rem,18rem)_auto]">
			<div className="flex min-w-0 flex-col gap-0.5">
				<div className="flex min-w-0 items-center gap-2">
					<span className="truncate text-[13px] font-medium text-foreground" title={goal.name}>
						{goal.name}
					</span>
					<GoalStateBadge row={row} />
				</div>
				<GoalFacts goal={goal} />
			</div>
			<div className="col-span-2 row-start-2 flex min-w-0 flex-col gap-1.5 md:col-span-1 md:col-start-2 md:row-start-1">
				<div className="flex items-baseline justify-between gap-3 text-xs">
					<span className="tabular-nums">
						<span className="sr-only">{t('dashboard.goals.FIGURE', { tracked, target })}</span>
						<span aria-hidden="true">
							<span className="font-medium text-foreground">{tracked}</span>
							<span className="text-muted-foreground">{` / ${target}`}</span>
						</span>
					</span>
					<span className="tabular-nums text-muted-foreground">{percent}</span>
				</div>
				<GoalMeter tracked={trackedSeconds} target={targetSeconds} isAtMost={isAtMost} />
				<span className={cn('text-xs', isOver ? 'text-destructive-ink' : 'text-muted-foreground')}>
					{gapText}
				</span>
			</div>
			<div className="col-start-2 row-start-1 flex justify-end md:col-start-3">{actions}</div>
		</li>
	);
}

export function GoalRows({ children, label }: Readonly<{ children: ReactNode; label?: string }>) {
	return (
		<ul aria-label={label} className="divide-y divide-border/70">
			{children}
		</ul>
	);
}
