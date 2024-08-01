import { useCallback, useMemo } from 'react';
import { useModal } from '../useModal';
import { useTeamTasks } from './useTeamTasks';
import { useTimer } from './useTimer';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	TASKS_ESTIMATE_HOURS_MODAL_DATE,
	DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE
} from '@app/constants';

export function useStartStopTimerHandler() {
	const {
		isOpen: isEnforceTaskModalOpen,
		closeModal: enforceTaskCloseModal,
		openModal: openEnforcePlannedTaskModal
	} = useModal();

	const {
		isOpen: isDailyPlanWorkHoursModalOpen,
		closeModal: dailyPlanWorkHoursCloseModal,
		openModal: openAddDailyPlanWorkHoursModal
	} = useModal();

	const {
		isOpen: isTasksEstimationHoursModalOpen,
		closeModal: tasksEstimationHoursCloseModal,
		openModal: openAddTasksEstimationHoursModal
	} = useModal();

	const {
		isOpen: isSuggestDailyPlanModalOpen,
		closeModal: suggestDailyPlanCloseModal,
		openModal: openSuggestDailyPlanModal
	} = useModal();

	const { timerStatus, timerStatusFetching, startTimer, stopTimer, hasPlan, canRunTimer, activeTeamTask } =
		useTimer();

	const { activeTeam } = useTeamTasks();

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	const hasWorkedHours = useMemo(
		() => hasPlan?.workTimePlanned && hasPlan?.workTimePlanned > 0,
		[hasPlan?.workTimePlanned]
	);
	const areAllTasksEstimated = useMemo(
		() => hasPlan?.tasks?.every((el) => typeof el?.estimate === 'number' && el?.estimate > 0),
		[hasPlan?.tasks]
	);

	const isActiveTaskPlaned = useMemo(
		() => hasPlan?.tasks?.some((task) => task.id === activeTeamTask?.id),
		[activeTeamTask?.id, hasPlan?.tasks]
	);

	const startStopTimerHandler = useCallback(() => {
		const currentDate = new Date().toISOString().split('T')[0];
		const dailyPlanSuggestionModalDate = window && window?.localStorage.getItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
		const tasksEstimateHoursModalDate = window && window?.localStorage.getItem(TASKS_ESTIMATE_HOURS_MODAL_DATE);
		const dailyPlanEstimateHoursModalDate =
			window && window?.localStorage.getItem(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE);

		/**
		 * Handle missing working hour for a daily plN
		 */
		const handleMissingDailyPlanWorkHour = () => {
			if (!hasWorkedHours) {
				openAddDailyPlanWorkHoursModal();
			} else {
				startTimer();
			}
		};

		/**
		 * Handler function to start or stop the timer based on various conditions.
		 * Shows appropriate modals and starts or stops the timer as needed.
		 */
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else if (requirePlan && !isActiveTaskPlaned) {
			openEnforcePlannedTaskModal();
		} else {
			if (
				dailyPlanSuggestionModalDate == currentDate &&
				tasksEstimateHoursModalDate == currentDate &&
				dailyPlanEstimateHoursModalDate == currentDate
			) {
				startTimer();
			} else {
				if (dailyPlanSuggestionModalDate != currentDate) {
					openSuggestDailyPlanModal();
				} else if (tasksEstimateHoursModalDate != currentDate) {
					if (areAllTasksEstimated) {
						if (dailyPlanEstimateHoursModalDate != currentDate) {
							handleMissingDailyPlanWorkHour();
						} else {
							startTimer();
						}
					} else {
						openAddTasksEstimationHoursModal();
					}
				} else if (dailyPlanEstimateHoursModalDate != currentDate) {
					if (areAllTasksEstimated) {
						handleMissingDailyPlanWorkHour();
					} else {
						startTimer();
					}
				} else {
					// Default action to start the timer
					startTimer();
				}
			}
		}
	}, [
		areAllTasksEstimated,
		canRunTimer,
		hasWorkedHours,
		isActiveTaskPlaned,
		openAddDailyPlanWorkHoursModal,
		openAddTasksEstimationHoursModal,
		openEnforcePlannedTaskModal,
		openSuggestDailyPlanModal,
		requirePlan,
		startTimer,
		stopTimer,
		timerStatus?.running,
		timerStatusFetching
	]);

	return {
		modals: {
			isEnforceTaskModalOpen,
			enforceTaskCloseModal,
			openEnforcePlannedTaskModal,
			isDailyPlanWorkHoursModalOpen,
			dailyPlanWorkHoursCloseModal,
			openAddDailyPlanWorkHoursModal,
			isTasksEstimationHoursModalOpen,
			tasksEstimationHoursCloseModal,
			openAddTasksEstimationHoursModal,
			isSuggestDailyPlanModalOpen,
			suggestDailyPlanCloseModal,
			openSuggestDailyPlanModal
		},
		startStopTimerHandler
	};
}
