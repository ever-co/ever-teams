import { Text } from '@/core/components';
import { HostKeys, useDetectOS, useHotkeys, useTimerView } from '@/core/hooks';
import { useTimerOptimisticUI } from '@/core/hooks/activities/use-timer-optimistic-ui';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import { pad } from '@/core/lib/helpers/index';
import { clsxm } from '@/core/lib/utils';
import { Transition } from '@headlessui/react';
import { useTranslations } from 'next-intl';
import { TimerButton } from './timer-button';

import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useCurrentTeam } from '@/core/hooks/organizations/teams/use-current-team';
import { activeTeamTaskState } from '@/core/stores';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import {
	ArrowUturnUpIcon,
	ComputerDesktopIcon,
	DevicePhoneMobileIcon,
	GlobeAltIcon,
	LifebuoyIcon
} from '@heroicons/react/24/outline';
import { HotkeysEvent } from 'hotkeys-js';
import { useAtomValue } from 'jotai';
import { useCallback, useMemo } from 'react';
import { AddTasksEstimationHoursModal, EnforcePlanedTaskModal, SuggestDailyPlanModal } from '../daily-plan';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { VerticalSeparator } from '../duplicated-components/separator';
import { Tooltip } from '../duplicated-components/tooltip';

export function Timer({ className, showTimerButton = true }: IClassName) {
	const t = useTranslations();

	const {
		hours,
		minutes,
		seconds,
		activeTaskEstimation,
		ms_p,
		canRunTimer,
		timerHanlder,
		timerStatus,
		disabled,
		hasPlan,
		startTimer,
		stopTimer
	} = useTimerView();
	const { modals, startStopTimerHandler } = useStartStopTimerHandler();
	const activeTeam = useCurrentTeam();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

	// FIX_NOTE: Use team-scoped time instead of global timerStatus.duration
	// timerStatus.duration is global and doesn't change when switching teams
	// useTodayWorkedTime uses totalTodayTasks which is team-scoped and updates on team switch
	const { hours: todayHours, minutes: todayMinutes, seconds: todaySeconds } = useTodayWorkedTime();

	// Use optimistic UI hook for timer button feedback
	const { optimisticRunning } = useTimerOptimisticUI({
		onStop: stopTimer,
		onStart: startTimer
	});

	// Display optimistic state if available, otherwise use real state
	const displayRunning = optimisticRunning ?? timerStatus?.running;

	const { os } = useDetectOS();

	const osSpecificTimerTooltipLabel = useMemo(() => {
		if (os === 'Mac') {
			if (!timerStatus?.running) {
				return 'Ctrl(⌃) + Opt(⌥) + ]';
			} else {
				return 'Ctrl(⌃) + Opt(⌥) + [';
			}
		}

		if (!timerStatus?.running) {
			return 'Ctrl + Alt + ]';
		} else {
			return 'Ctrl + Alt + [';
		}
	}, [os, timerStatus?.running]);

	// Handling Hotkeys
	const handleStartSTOPTimer = useCallback(
		(e?: KeyboardEvent, h?: HotkeysEvent) => {
			// Start Timer
			if ((h?.shortcut === 'ctrl+option+]' || h?.shortcut === 'ctrl+alt+]') && !timerStatus?.running) {
				timerHanlder();
			}

			// Stop Timer
			if ((h?.shortcut === 'ctrl+option+[' || h?.shortcut === 'ctrl+alt+[') && timerStatus?.running) {
				timerHanlder();
			}
		},
		[timerHanlder, timerStatus]
	);
	useHotkeys(HostKeys.START_STOP_TIMER, handleStartSTOPTimer);

	return (
		<div
			className={clsxm(
				'flex space-x-2 flex-row justify-center items-center p-2 xl:space-y-0 space-y-5 min-w-[260px]',
				className
			)}
		>
			<div className="flex items-center justify-center w-full pr-2 space-x-2 xl:w-4/5">
				<div className="flex items-start justify-between w-full">
					<div className="w-full mx-auto">
						<Transition
							show={true}
							appear={true}
							enter="transition-opacity duration-300 ease-in-out"
							enterFrom="opacity-0"
							enterTo="opacity-100"
							leave="transition-opacity duration-200 ease-in-out"
							leaveFrom="opacity-100"
							leaveTo="opacity-0"
							key={timerStatus?.running ? 'running' : 'stopped'}
						>
							<Text.Heading
								as="h3"
								className={`text-4xl w-[200px] lg:text-start tracking-wide font-normal ${
									timerStatus?.running &&
									timerStatus?.lastLog?.source &&
									timerStatus?.lastLog?.source !== ETimeLogSource.TEAMS
										? 'text-[#888] dark:text-[#888]'
										: ''
								} `}
							>
								{timerStatus?.running
									? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
									: `${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`}

								{timerStatus?.running && <span className="text-sm">:{pad(ms_p)}</span>}
							</Text.Heading>
						</Transition>

						<ProgressBar width="100%" className="mt-2" progress={`${activeTaskEstimation}%`} />
					</div>
					<div>
						{timerStatus && timerStatus.running && (
							<Tooltip
								label={`The time tracker is already running in the ${(
									timerStatus?.lastLog?.source || ETimeLogSource.TEAMS
								)
									.split('_')
									.join(' ')
									.toLowerCase()}`}
								placement="bottom-start"
							>
								<TimerRunningSourceIcon source={timerStatus?.lastLog?.source || ETimeLogSource.TEAMS} />
							</Tooltip>
						)}
					</div>
				</div>
			</div>
			{showTimerButton && (
				<>
					<VerticalSeparator />
					<div className="flex items-center justify-center w-1/4 xl:w-2/5 h-fit">
						<Tooltip
							label={!canRunTimer ? t('timer.START_TIMER') : osSpecificTimerTooltipLabel}
							placement="top-start"
							// If timer is running at some other source and user may or may not have selected the task
							// enabled={
							// 	!canRunTimer && timerStatus?.lastLog?.source !== TimerSource.TEAMS
							// }
						>
							<TimerButton
								onClick={startStopTimerHandler}
								running={displayRunning}
								disabled={
									// If timer is running at some other source and user may or may not have selected the task
									!canRunTimer || (disabled && timerStatus?.lastLog?.source !== ETimeLogSource.TEAMS)
								}
							/>
						</Tooltip>

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
					</div>
				</>
			)}
		</div>
	);
}

export function MinTimerFrame({ className }: IClassName) {
	const { hours, minutes, seconds, ms_p, timerStatus, disabled, hasPlan, startTimer, stopTimer } = useTimerView();
	const { modals, startStopTimerHandler } = useStartStopTimerHandler();
	const activeTeam = useCurrentTeam();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const t = useTranslations();

	// NOTE_FIX: Use team-scoped time instead of global timerStatus.duration
	// timerStatus.duration is global and doesn't change when switching teams
	// useTodayWorkedTime uses totalTodayTasks which is team-scoped and updates on team switch
	const { hours: todayHours, minutes: todayMinutes, seconds: todaySeconds } = useTodayWorkedTime();

	// Use optimistic UI hook for timer button feedback
	const { optimisticRunning } = useTimerOptimisticUI({
		onStop: stopTimer,
		onStart: startTimer
	});

	// Display optimistic state if available, otherwise use real state
	const displayRunning = optimisticRunning ?? timerStatus?.running;

	return (
		<div
			className={clsxm(
				'input-border rounded-lg py-2 px-4 h-fit dark:bg-[#1B1D22] dark:border-2 border-[#0000001A] dark:border-[#26272C]',
				'flex items-center md:space-x-4 space-x-1',
				className
			)}
		>
			<Transition
				show={true}
				appear={true}
				enter="transition-opacity duration-300 ease-in-out"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-200 ease-in-out"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
				key={timerStatus?.running ? 'running' : 'stopped'}
			>
				<Text className="text-lg tracking-wide font-normal w-[110px]">
					{timerStatus?.running
						? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
						: `${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`}
					{timerStatus?.running && <span className="text-sm">:{pad(ms_p)}</span>}
				</Text>
			</Transition>

			{timerStatus && timerStatus.running && (
				<Tooltip
					label={`The time tracker is already running in the ${(
						timerStatus?.lastLog?.source || ETimeLogSource.TEAMS
					)
						.split('_')
						.join(' ')
						.toLowerCase()}`}
					placement="bottom-start"
				>
					<TimerRunningSourceIcon source={timerStatus?.lastLog?.source || ETimeLogSource.TEAMS} />
				</Tooltip>
			)}

			<VerticalSeparator />

			<div className="z-[50]">
				<TimerButton
					onClick={startStopTimerHandler}
					running={displayRunning}
					disabled={disabled}
					className="w-7 h-7"
				/>
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
		</div>
	);
}

export function TimerRunningSourceIcon({ source }: { source: ETimeLogSource }) {
	switch (source) {
		case ETimeLogSource.MOBILE:
			return <DevicePhoneMobileIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case ETimeLogSource.BROWSER:
			return <GlobeAltIcon className="w-4 h-4 animate-pulse" />;
		case ETimeLogSource.BROWSER_EXTENSION:
			return <GlobeAltIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case ETimeLogSource.DESKTOP:
			return <ComputerDesktopIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case ETimeLogSource.UPWORK:
			return <ArrowUturnUpIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case ETimeLogSource.HUBSTAFF:
			return <LifebuoyIcon className="w-4 h-4 animate-pulse" color="#888" />;
		default:
			return <></>;
	}
}
