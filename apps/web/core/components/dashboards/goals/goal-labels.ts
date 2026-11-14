import type { DottedLanguageObjectStringPaths } from 'next-intl';
import {
	ETimeGoalComparison,
	ETimeGoalPeriod,
	ETimeGoalState,
	type ITimeGoal
} from '@/core/types/interfaces/timesheet/time-goal';
import type { GoalGap } from '@/core/lib/utils/time-goals';

export const GOAL_STATE_LABEL_KEYS: Record<ETimeGoalState, DottedLanguageObjectStringPaths> = {
	[ETimeGoalState.IN_PROGRESS]: 'dashboard.goals.state.IN_PROGRESS',
	[ETimeGoalState.ACHIEVED]: 'dashboard.goals.state.ACHIEVED',
	[ETimeGoalState.ON_TRACK]: 'dashboard.goals.state.ON_TRACK',
	[ETimeGoalState.EXCEEDED]: 'dashboard.goals.state.EXCEEDED'
};

/** Achieved and exceeded are called out; in progress and on track stay quiet. */
export const GOAL_STATE_BADGES: Record<ETimeGoalState, string> = {
	[ETimeGoalState.IN_PROGRESS]: 'bg-foreground/[0.06] text-muted-foreground',
	[ETimeGoalState.ACHIEVED]: 'bg-success/10 text-success-foreground',
	[ETimeGoalState.ON_TRACK]: 'bg-foreground/[0.06] text-muted-foreground',
	[ETimeGoalState.EXCEEDED]: 'bg-destructive/10 text-destructive-ink'
};

const AT_LEAST_RULE_KEYS: Record<ETimeGoalPeriod, DottedLanguageObjectStringPaths> = {
	[ETimeGoalPeriod.DAY]: 'dashboard.goals.rule.AT_LEAST_DAY',
	[ETimeGoalPeriod.WEEK]: 'dashboard.goals.rule.AT_LEAST_WEEK',
	[ETimeGoalPeriod.MONTH]: 'dashboard.goals.rule.AT_LEAST_MONTH'
};

const AT_MOST_RULE_KEYS: Record<ETimeGoalPeriod, DottedLanguageObjectStringPaths> = {
	[ETimeGoalPeriod.DAY]: 'dashboard.goals.rule.AT_MOST_DAY',
	[ETimeGoalPeriod.WEEK]: 'dashboard.goals.rule.AT_MOST_WEEK',
	[ETimeGoalPeriod.MONTH]: 'dashboard.goals.rule.AT_MOST_MONTH'
};

/** "At least 20h a week", "At most 2h a day". */
export function goalRuleKeyOf(goal: Pick<ITimeGoal, 'comparison' | 'period'>): DottedLanguageObjectStringPaths {
	if (goal.comparison === ETimeGoalComparison.AT_MOST) {
		return AT_MOST_RULE_KEYS[goal.period];
	}
	return AT_LEAST_RULE_KEYS[goal.period];
}

export const GOAL_PERIOD_LABEL_KEYS: Record<ETimeGoalPeriod, DottedLanguageObjectStringPaths> = {
	[ETimeGoalPeriod.DAY]: 'dashboard.goals.PERIOD_DAY',
	[ETimeGoalPeriod.WEEK]: 'dashboard.goals.PERIOD_WEEK',
	[ETimeGoalPeriod.MONTH]: 'dashboard.goals.PERIOD_MONTH'
};

export const GOAL_EMPTY_PERIOD_KEYS: Record<ETimeGoalPeriod, DottedLanguageObjectStringPaths> = {
	[ETimeGoalPeriod.DAY]: 'dashboard.goals.EMPTY_DAY',
	[ETimeGoalPeriod.WEEK]: 'dashboard.goals.EMPTY_WEEK',
	[ETimeGoalPeriod.MONTH]: 'dashboard.goals.EMPTY_MONTH'
};

export const GOAL_FORM_PERIOD_KEYS: Record<ETimeGoalPeriod, DottedLanguageObjectStringPaths> = {
	[ETimeGoalPeriod.DAY]: 'dashboard.goals.form.PER_DAY',
	[ETimeGoalPeriod.WEEK]: 'dashboard.goals.form.PER_WEEK',
	[ETimeGoalPeriod.MONTH]: 'dashboard.goals.form.PER_MONTH'
};

/** What is left, or past, of a goal: "8h 0m to go" or "Target reached" for at least, "1h 30m left" or "30m over" for at most. */
export function goalGapKeyOf(gap: GoalGap, isAtMost: boolean): DottedLanguageObjectStringPaths {
	if (isAtMost) {
		if (gap.kind === 'over') {
			return 'dashboard.goals.gap.OVER_LIMIT';
		}
		if (gap.kind === 'reached') {
			return 'dashboard.goals.gap.LIMIT_REACHED';
		}
		return 'dashboard.goals.gap.LEFT';
	}
	if (gap.kind === 'over') {
		return 'dashboard.goals.gap.ABOVE_TARGET';
	}
	if (gap.kind === 'reached') {
		return 'dashboard.goals.gap.TARGET_REACHED';
	}
	return 'dashboard.goals.gap.TO_GO';
}
