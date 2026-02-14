'use client';

import { useMemo } from 'react';
import { useAtomValue } from 'jotai';
import moment from 'moment';

import { activeTeamState, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { useMyDailyPlans } from '../daily-plans/use-my-daily-plans';
import { useAuthenticateUser } from '../auth';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { useSyncRef } from '../common/use-sync-ref';

// ==================== TYPES ====================

export interface UseTimerPlanStatusReturn {
	/** Today's daily plan (if any) */
	hasPlan: TDailyPlan | undefined;
	/** Tomorrow's daily plan (if any) */
	hasPlanForTomorrow: TDailyPlan | undefined;
	/** Whether the user can track time (plan requirement check) */
	canTrack: boolean;
	/** Whether the plan is verified (has work time + estimated tasks) */
	isPlanVerified: boolean | undefined;
	/** Whether the timer can run (email verified + valid task) */
	canRunTimer: boolean;
}

// ==================== HOOK ====================

/**
 * Lightweight read-only hook for plan-related timer state.
 *
 * Use this instead of `useTimer()` when you only need plan status
 * (hasPlan, canTrack, isPlanVerified, canRunTimer).
 *
 * **Performance benefit**: Does NOT instantiate:
 * - The 50ms ticking interval (useTimerUi)
 * - localStorage persistence (useTimerStorage)
 * - API mutations (startTimer, stopTimer, etc.)
 *
 * Only reads from existing atoms and derives state.
 */
export function useTimerPlanStatus(): UseTimerPlanStatusReturn {
	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const timerStatus = useAtomValue(timerStatusState);
	const timerStatusRef = useSyncRef(timerStatus);

	const { user } = useAuthenticateUser();
	const { myDailyPlans } = useMyDailyPlans();

	// ==================== DERIVED STATE ====================

	const hasPlan = useMemo(
		() =>
			myDailyPlans?.items.find(
				(plan: TDailyPlan) =>
					plan.date?.toString()?.startsWith(new Date()?.toISOString().split('T')[0]) &&
					plan.tasks &&
					plan.tasks?.length > 0
			),
		[myDailyPlans?.items]
	);

	const hasPlanForTomorrow = useMemo(() => {
		const tomorrow = moment().add(1, 'days');
		return myDailyPlans?.items.find(
			(plan: TDailyPlan) => moment(plan.date).format('YYYY-MM-DD') === tomorrow.format('YYYY-MM-DD')
		);
	}, [myDailyPlans?.items]);

	const requirePlan = activeTeam?.requirePlanToTrack;

	const canTrack = useMemo(() => {
		if (requirePlan && !hasPlan) return false;
		return true;
	}, [requirePlan, hasPlan]);

	const isPlanVerified = useMemo(
		() =>
			requirePlan
				? hasPlan &&
					hasPlan?.workTimePlanned > 0 &&
					!!hasPlan?.tasks?.every((task) => task.estimate && task.estimate > 0)
				: true,
		[requirePlan, hasPlan]
	);

	const canRunTimer = useMemo(
		() =>
			!!(
				user?.isEmailVerified &&
				((!!activeTeamTask && activeTeamTask.status !== 'closed') ||
					timerStatusRef.current?.lastLog?.source !== ETimeLogSource.TEAMS)
			),
		[user?.isEmailVerified, activeTeamTask, timerStatusRef]
	);

	// ==================== RETURN ====================

	return {
		hasPlan,
		hasPlanForTomorrow,
		canTrack,
		isPlanVerified,
		canRunTimer
	};
}

