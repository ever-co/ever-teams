'use client';

import { useAtomValue } from 'jotai';
import moment from 'moment';
import { useMemo } from 'react';

import { activeTeamState, activeTeamTaskState, timerStatusState } from '@/core/stores';
import { ETaskStatusName } from '@/core/types/generics/enums/task';
import { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import { TOrganizationTeam } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { ITimerStatus } from '@/core/types/interfaces/timer/timer-status';
import { canRunTimerForState } from '@/core/lib/helpers/timer-policy';

import { useAuthenticateUser } from '../auth';
import { useMyDailyPlans } from '../daily-plans/use-my-daily-plans';

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
	/** The active team (shared atom — avoids duplicate subscriptions in consumers) */
	activeTeam: TOrganizationTeam | null;
	/** The active team task (shared atom — avoids duplicate subscriptions in consumers) */
	activeTeamTask: TTask | null;
	/** The timer status (shared atom — avoids duplicate subscriptions in consumers) */
	timerStatus: ITimerStatus | null;
}


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

	const { user } = useAuthenticateUser();
	const { myDailyPlans } = useMyDailyPlans();

	// ==================== DERIVED STATE ====================

	const hasPlan = useMemo(
		() =>
			myDailyPlans?.items.find(
				(plan: TDailyPlan) =>
					moment(plan.date).format('YYYY-MM-DD') === moment().format('YYYY-MM-DD') &&
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
			canRunTimerForState({
				isEmailVerified: !!user?.isEmailVerified,
				hasActiveTask: !!activeTeamTask,
				isActiveTaskClosed: activeTeamTask?.status === ETaskStatusName.CLOSED,
				isTimerRunning: !!timerStatus?.running,
				timerSource: timerStatus?.lastLog?.source
			}),
		[user?.isEmailVerified, activeTeamTask, timerStatus?.running, timerStatus?.lastLog?.source]
	);

	// ==================== RETURN ====================

	return {
		hasPlan,
		hasPlanForTomorrow,
		canTrack,
		isPlanVerified,
		canRunTimer,
		activeTeam,
		activeTeamTask,
		timerStatus
	};
}
