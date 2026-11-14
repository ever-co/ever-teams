'use client';

import { useMemo } from 'react';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTimeGoalProgress, useTimeGoals } from '@/core/hooks/time-goals/use-time-goals';
import { GOAL_PERIODS, ownProgressOf } from '@/core/lib/utils/time-goals';

/**
 * The Goals block of My week: where the signed-in person stands today against each of her goals (today for a goal
 * per day, this week, this month), from the same reads as the Goals page. Shown only where the platform has goals
 * and the person has at least one.
 */
export function useMyWeekGoals(enabled: boolean) {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id ?? null;
	const goals = useTimeGoals({ enabled });
	const isAvailable = goals.availability === 'available';
	const hasGoals = goals.activeGoals.length > 0;
	const progress = useTimeGoalProgress({ enabled: enabled && isAvailable && hasGoals && Boolean(employeeId) });

	const rows = useMemo(() => {
		const own = ownProgressOf(progress.rows, employeeId);
		own.sort((first, second) => GOAL_PERIODS.indexOf(first.period) - GOAL_PERIODS.indexOf(second.period));
		return own;
	}, [employeeId, progress.rows]);

	return { rows, isShown: enabled && isAvailable && rows.length > 0 };
}
