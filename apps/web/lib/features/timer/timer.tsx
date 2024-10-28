import { pad } from '@app/helpers';
import { HostKeys, useDetectOS, useHotkeys, useTeamTasks, useTimerView } from '@app/hooks';
import { IClassName, TimerSource } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { ProgressBar, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { useTranslations } from 'next-intl';
import { TimerButton } from './timer-button';

import {
	ArrowUturnUpIcon,
	ComputerDesktopIcon,
	DevicePhoneMobileIcon,
	GlobeAltIcon,
	LifebuoyIcon
} from '@heroicons/react/24/outline';
import { HotkeysEvent } from 'hotkeys-js';
import { useCallback, useMemo } from 'react';
import { AddTasksEstimationHoursModal, EnforcePlanedTaskModal, SuggestDailyPlanModal } from '../daily-plan';
import { useStartStopTimerHandler } from '@app/hooks/features/useStartStopTimerHandler';

export function Timer({ className }: IClassName) {
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
		startTimer
	} = useTimerView();
	const { modals, startStopTimerHandler } = useStartStopTimerHandler();
	const { activeTeam, activeTeamTask } = useTeamTasks();
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);

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
			console.log('h?.shortcut', h?.shortcut);
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
				'flex space-x-2 lg:flex-col xl:flex-row justify-center items-center p-2 xl:space-y-0 space-y-5 min-w-[260px]',
				className
			)}
		>
			<div className="xl:w-4/5 space-x-2 w-full flex justify-center items-center pr-2">
				<div className="flex items-start justify-between w-full">
					<div className="w-full mx-auto">
						<Text.Heading
							as="h3"
							className={`text-4xl w-[200px] lg:text-start tracking-wide font-normal ${
								timerStatus?.running &&
								timerStatus?.lastLog?.source &&
								timerStatus?.lastLog?.source !== TimerSource.TEAMS
									? 'text-[#888] dark:text-[#888]'
									: ''
							} `}
						>
							{pad(hours)}:{pad(minutes)}:{pad(seconds)}
							<span className="text-sm">:{pad(ms_p)}</span>
						</Text.Heading>

						<ProgressBar width="100%" className="mt-2" progress={`${activeTaskEstimation}%`} />
					</div>
					<div>
						{timerStatus && timerStatus.running && (
							<Tooltip
								label={`The time tracker is already running in the ${(
									timerStatus?.lastLog?.source || TimerSource.TEAMS
								)
									.split('_')
									.join(' ')
									.toLowerCase()}`}
								placement="bottom-start"
							>
								<TimerRunningSourceIcon source={timerStatus?.lastLog?.source || TimerSource.TEAMS} />
							</Tooltip>
						)}
					</div>
				</div>
			</div>
			<VerticalSeparator />
			<div className="w-1/4 xl:w-2/5 h-fit flex justify-center items-center">
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
						running={timerStatus?.running}
						disabled={
							// If timer is running at some other source and user may or may not have selected the task
							!canRunTimer || (disabled && timerStatus?.lastLog?.source !== TimerSource.TEAMS)
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
		</div>
	);
}

export function MinTimerFrame({ className }: IClassName) {
	const { hours, minutes, seconds, ms_p, timerStatus, disabled, hasPlan, startTimer } = useTimerView();
	const { modals, startStopTimerHandler } = useStartStopTimerHandler();
	const { activeTeam, activeTeamTask } = useTeamTasks();
	const requirePlan = useMemo(() => activeTeam?.requirePlanToTrack, [activeTeam?.requirePlanToTrack]);
	const t = useTranslations();

	return (
		<div
			className={clsxm(
				'input-border rounded-[10px] p-2 h-[3.125rem] dark:bg-[#1B1D22] dark:border-[0.125rem] border-[#0000001A] dark:border-[#26272C]',
				'flex items-center md:space-x-4 space-x-1',
				className
			)}
		>
			<Text className="text-lg tracking-wide font-normal w-[110px]">
				{pad(hours)}:{pad(minutes)}:{pad(seconds)}
				<span className="text-sm">:{pad(ms_p)}</span>
			</Text>

			{timerStatus && timerStatus.running && (
				<Tooltip
					label={`The time tracker is already running in the ${(
						timerStatus?.lastLog?.source || TimerSource.TEAMS
					)
						.split('_')
						.join(' ')
						.toLowerCase()}`}
					placement="bottom-start"
				>
					<TimerRunningSourceIcon source={timerStatus?.lastLog?.source || TimerSource.TEAMS} />
				</Tooltip>
			)}

			<VerticalSeparator />

			<div className="z-[50]">
				<TimerButton
					onClick={startStopTimerHandler}
					running={timerStatus?.running}
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

export function TimerRunningSourceIcon({ source }: { source: TimerSource }) {
	switch (source) {
		case TimerSource.MOBILE:
			return <DevicePhoneMobileIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case TimerSource.BROWSER:
			return <GlobeAltIcon className="w-4 h-4 animate-pulse" />;
		case TimerSource.BROWSER_EXTENSION:
			return <GlobeAltIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case TimerSource.DESKTOP:
			return <ComputerDesktopIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case TimerSource.UPWORK:
			return <ArrowUturnUpIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case TimerSource.HUBSTAFF:
			return <LifebuoyIcon className="w-4 h-4 animate-pulse" color="#888" />;
		default:
			return <></>;
	}
}
