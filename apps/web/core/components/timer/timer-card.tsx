import { pad } from '@/core/lib/helpers/number';
import { useTeamTasks } from '@/core/hooks';
import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { useTimer } from '@/core/hooks/activities/use-timer';
import { ProgressBar } from '@/core/components/common/progress-bar';
import { PauseIcon } from '@/core/components/svgs/pause-icon';
import { PlayIcon } from '@/core/components/svgs/play-icon';
import {
	AddTasksEstimationHoursModal,
	EnforcePlanedTaskModal,
	SuggestDailyPlanModal
} from '@/core/components/daily-plan';
import { useTranslations } from 'next-intl';
import { useMemo } from 'react';
import { useAtom, useAtomValue } from 'jotai';
import { activeTeamState, activeTeamTaskState } from '@/core/stores';

const Timer = () => {
	const t = useTranslations();
	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		canRunTimer,
		hasPlan,
		timerSeconds,
		startTimer
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler();

	const activeTeam = useAtomValue(activeTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);

	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	return (
		<>
			<div className="flex flex-col min-w-[300px]">
				<h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
					{pad(hours)} : {pad(minutes)} : {pad(seconds)}:
					<span className="text-[35px] w-7 inline-block">{pad(ms_p)}</span>
				</h1>
				<ProgressBar width={284} progress={`${activeTaskEstimation}%`} />
			</div>
			<div
				title={timerStatusFetching || !canRunTimer ? t('timer.START_TIMER') : undefined}
				className={`cursor-pointer ${timerStatusFetching || !canRunTimer ? 'opacity-30' : ''}`}
				onClick={!timerStatusFetching ? startStopTimerHandler : undefined}
			>
				{timerStatus?.running ? <PauseIcon width={68} height={68} /> : <PlayIcon width={68} height={68} />}
			</div>

			<SuggestDailyPlanModal
				isOpen={modals.isSuggestDailyPlanModalOpen}
				closeModal={modals.suggestDailyPlanCloseModal}
			/>

			{/**
			 * Track time on planned task (SOFT FLOW)
			 */}
			{hasPlan && activeTeamTask && (
				<EnforcePlanedTaskModal
					content={`Would you like to add the task "${activeTeamTask.taskNumber}" to Today's plan?`}
					closeModal={modals.enforceTaskSoftCloseModal}
					plan={hasPlan}
					open={modals.isEnforceTaskSoftModalOpen}
					task={activeTeamTask}
				/>
			)}

			{hasPlan && hasPlan.tasks && (
				<AddTasksEstimationHoursModal
					isOpen={modals.isTasksEstimationHoursModalOpen}
					closeModal={modals.tasksEstimationHoursCloseModal}
					plan={hasPlan}
					tasks={hasPlan.tasks}
				/>
			)}

			{/**
			 * Track time on planned task (REQUIRE PLAN)
			 */}

			{requirePlan && hasPlan && activeTeamTask && (
				<EnforcePlanedTaskModal
					onOK={startTimer}
					content={t('dailyPlan.SUGGESTS_TO_ADD_TASK_TO_TODAY_PLAN')}
					closeModal={modals.enforceTaskCloseModal}
					plan={hasPlan}
					open={modals.isEnforceTaskModalOpen}
					task={activeTeamTask}
					openDailyPlanModal={modals.openAddTasksEstimationHoursModal}
				/>
			)}
		</>
	);
};

export default Timer;
