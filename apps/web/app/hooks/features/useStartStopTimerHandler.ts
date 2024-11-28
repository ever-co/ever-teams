import { useCallback, useMemo } from 'react';
import { useModal } from '../useModal';
import { useTeamTasks } from './useTeamTasks';
import { useTimer } from './useTimer';
import {
	DAILY_PLAN_SUGGESTION_MODAL_DATE,
	TASKS_ESTIMATE_HOURS_MODAL_DATE,
	DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE
} from '@app/constants';
import { estimatedTotalTime } from 'lib/features/task/daily-plan';

export function useStartStopTimerHandler() {
	const {
		isOpen: isEnforceTaskModalOpen,
		closeModal: enforceTaskCloseModal,
		openModal: openEnforcePlannedTaskModal
	} = useModal();

	const {
		isOpen: isEnforceTaskSoftModalOpen,
		closeModal: _enforceTaskSoftCloseModal,
		openModal: openEnforcePlannedTaskSoftModal
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

	const tasksEstimationTimes = useMemo(
		() => (hasPlan && hasPlan.tasks ? estimatedTotalTime(hasPlan.tasks).timesEstimated / 3600 : 0),
		[hasPlan]
	);

	const enforceTaskSoftCloseModal = () => {
		_enforceTaskSoftCloseModal();
		openAddTasksEstimationHoursModal();
	};

	const startStopTimerHandler = useCallback(() => {
		const currentDate = new Date().toISOString().split('T')[0];
		const dailyPlanSuggestionModalDate = window && window?.localStorage.getItem(DAILY_PLAN_SUGGESTION_MODAL_DATE);
		const tasksEstimateHoursModalDate = window && window?.localStorage.getItem(TASKS_ESTIMATE_HOURS_MODAL_DATE);
		const dailyPlanEstimateHoursModalDate =
			window && window?.localStorage.getItem(DAILY_PLAN_ESTIMATE_HOURS_MODAL_DATE);

		/**
		 * Check if the active task is planned
		 * If not, ask the user to add it to the today plan
		 */
		const handleCheckSelectedTaskOnTodayPlan = () => {
			if (hasPlan) {
				if (isActiveTaskPlaned) {
					if (tasksEstimateHoursModalDate != currentDate) {
						openAddTasksEstimationHoursModal();
					} else {
						startTimerOrAskEstimate();
					}
				} else {
					openEnforcePlannedTaskSoftModal();
				}
			} else {
				startTimerOrAskEstimate();
			}
		};

		/**
		 * Handle missing estimation hours for tasks
		 */
		const handleMissingTasksEstimationHours = () => {
			if (hasPlan) {
				if (tasksEstimateHoursModalDate != currentDate) {
					handleCheckSelectedTaskOnTodayPlan();
				} else if (areAllTasksEstimated) {
					startTimerOrAskEstimate();
				} else {
					if (tasksEstimateHoursModalDate != currentDate) {
						openAddTasksEstimationHoursModal();
					} else {
						startTimerOrAskEstimate();
					}
				}
			} else {
				startTimerOrAskEstimate();
			}
		};

		/**
		 * Check if there is warning for 'enforce' mode. If not,
		 * start tracking
		 */
		const startTimerOrAskEstimate = () => {
			if (
				requirePlan &&
				(!areAllTasksEstimated ||
					!hasWorkedHours ||
					Math.abs(Number(hasPlan?.workTimePlanned) - tasksEstimationTimes) > 1)
			) {
				openAddTasksEstimationHoursModal();
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
		} else if (requirePlan && hasPlan && !isActiveTaskPlaned) {
			openEnforcePlannedTaskModal();
		} else {
			if (
				dailyPlanSuggestionModalDate == currentDate &&
				tasksEstimateHoursModalDate == currentDate &&
				dailyPlanEstimateHoursModalDate == currentDate
			) {
				startTimerOrAskEstimate();
			} else {
				if (dailyPlanSuggestionModalDate != currentDate) {
					if (!hasPlan) {
						openSuggestDailyPlanModal();
					} else {
						handleMissingTasksEstimationHours();
					}
				} else if (tasksEstimateHoursModalDate != currentDate) {
					handleMissingTasksEstimationHours();
				} else {
					startTimerOrAskEstimate();
				}
			}
		}
	}, [
		areAllTasksEstimated,
		canRunTimer,
		hasPlan,
		hasWorkedHours,
		isActiveTaskPlaned,
		openAddTasksEstimationHoursModal,
		openEnforcePlannedTaskModal,
		openEnforcePlannedTaskSoftModal,
		openSuggestDailyPlanModal,
		requirePlan,
		startTimer,
		stopTimer,
		tasksEstimationTimes,
		timerStatus?.running,
		timerStatusFetching
	]);

	return {
		modals: {
			isEnforceTaskModalOpen,
			enforceTaskCloseModal,
			openEnforcePlannedTaskModal,
			isTasksEstimationHoursModalOpen,
			tasksEstimationHoursCloseModal,
			openAddTasksEstimationHoursModal,
			isSuggestDailyPlanModalOpen,
			suggestDailyPlanCloseModal,
			openSuggestDailyPlanModal,
			isEnforceTaskSoftModalOpen,
			enforceTaskSoftCloseModal,
			openEnforcePlannedTaskSoftModal
		},
		startStopTimerHandler
	};
}
