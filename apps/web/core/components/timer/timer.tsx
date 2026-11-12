import { pad } from '@/core/lib/helpers/number';
import { HostKeys, useHotkeys } from '@/core/hooks/common/use-hotkeys';
import { useDetectOS } from '@/core/hooks/common/use-detect-os';
import { useActiveTaskEstimation, useTimerView } from '@/core/hooks/activities/use-timer';
import { useTimerClock } from '@/core/hooks/timer/use-timer-ui';
import { useTimerOptimisticUI } from '@/core/hooks/activities/use-timer-optimistic-ui';
import { useTodayWorkedTime } from '@/core/hooks/activities/use-today-worked-time';
import { clsxm } from '@/core/lib/utils/clsxm';
import { Text } from '@/core/components/common/typography';
import { useTranslations } from 'next-intl';
import { TimerButton } from './timer-button';
import { TimerBillableToggle } from './timer-billable-toggle';
import { TimerNotesButton } from './timer-notes-button';
import { Transition } from '@headlessui/react';

import { ArrowTurnUp, Desktop, Globe, Lifebuoy, Smartphone } from '@/core/components/icons';
import { HotkeysEvent } from 'hotkeys-js';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { TimerPlanDialogs } from '@/core/components/features/daily-plan/timer-plan-dialogs';
import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { ProgressBar } from '../duplicated-components/_progress-bar';
import { Tooltip } from '../duplicated-components/tooltip';
import { IClassName } from '@/core/types/interfaces/common/class-name';
import { ETimeLogSource } from '@/core/types/generics/enums/timer';

/** The running digits: the only part of a timer that re-renders on the 50ms tick. */
function RunningClock({ className }: Readonly<{ className?: string }>) {
	const { hours, minutes, seconds, ms_p } = useTimerClock();
	return (
		<>
			{pad(hours)}:{pad(minutes)}:{pad(seconds)}
			<span className={className}>:{pad(ms_p)}</span>
		</>
	);
}

/** Follows the timer once per second, so the timer around it does not re-render with it. */
function ActiveTaskProgressBar() {
	const activeTaskEstimation = useActiveTaskEstimation();
	return <ProgressBar width="100%" className="mt-2" progress={`${activeTaskEstimation}%`} />;
}

function useHydrated() {
	const [hydrated, setHydrated] = useState(false);
	useEffect(() => setHydrated(true), []);
	return hydrated;
}

const CLOCK_CLASS_NAME = 'w-[9.5rem] text-3xl font-semibold tabular-nums lg:text-start';

/** The profile's figures row sets the timer beside 15px values: a clock at the size of a figure, not a headline. */
const COMPACT_CLOCK_CLASS_NAME = 'w-[6.5rem] text-xl font-semibold tabular-nums lg:text-start';

function clockClassNameOf(compact: boolean) {
	if (compact) {
		return COMPACT_CLOCK_CLASS_NAME;
	}
	return CLOCK_CLASS_NAME;
}

function timerButtonClassNameOf(compact: boolean) {
	if (compact) {
		return 'size-9';
	}
	return 'size-11';
}

export function Timer({ className, showTimerButton = true, compact = false }: IClassName<{ compact?: boolean }>) {
	const t = useTranslations();
	const hydrated = useHydrated();

	const { canRunTimer, timerStatus, startTimer, stopTimer } = useTimerView();
	const { modals, actionDisabled, startStopTimerHandler } = useStartStopTimerHandler({ startTimer, stopTimer });

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
	const isBillableLocked = Boolean(displayRunning);

	const { os } = useDetectOS();

	const isTimerRunning = Boolean(timerStatus?.running);
	const runningSource = timerStatus?.lastLog?.source;
	const hasRunningSource = Boolean(runningSource);
	const isOtherSource = runningSource !== ETimeLogSource.TEAMS;
	const isTrackedElsewhere = isTimerRunning && hasRunningSource && isOtherSource;

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

	// Handling Hotkeys: same handler as the button, so the shortcut cannot skip the timer policy (the daily plan
	// rules, a run the timer does not show)
	const handleStartSTOPTimer = useCallback(
		(e?: KeyboardEvent, h?: HotkeysEvent) => {
			// Start Timer: only while the timer shows none running, so the start key never stops one. Over a run the
			// timer does not show, the handler says that time is already tracked elsewhere.
			if ((h?.shortcut === 'ctrl+option+]' || h?.shortcut === 'ctrl+alt+]') && !timerStatus?.running) {
				startStopTimerHandler();
			}

			// Stop Timer
			if ((h?.shortcut === 'ctrl+option+[' || h?.shortcut === 'ctrl+alt+[') && timerStatus?.running) {
				startStopTimerHandler();
			}
		},
		[startStopTimerHandler, timerStatus]
	);
	useHotkeys(HostKeys.START_STOP_TIMER, handleStartSTOPTimer);

	const clockClassName = clockClassNameOf(compact);
	const timerButtonClassName = timerButtonClassNameOf(compact);

	return (
		<div className={clsxm('flex min-w-[260px] flex-row items-center justify-between gap-4 p-2', className)}>
			<div className="flex min-w-0 items-center gap-2">
				<div className="flex min-w-0 items-start gap-2">
					<div className="flex min-w-0 flex-col">
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
								className={clsxm(clockClassName, isTrackedElsewhere && 'text-muted-foreground')}
							>
								{isTimerRunning ? (
									<RunningClock className="text-sm font-normal text-muted-foreground" />
								) : (
									`${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`
								)}
							</Text.Heading>
						</Transition>

						<ActiveTaskProgressBar />
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
				<div className="flex h-fit shrink-0 items-center justify-center">
					<div className="flex items-center gap-3">
						<TimerNotesButton />
						<TimerBillableToggle locked={isBillableLocked} />
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
								disabled={!hydrated || actionDisabled}
								className={timerButtonClassName}
								emphasized
							/>
						</Tooltip>
					</div>

					<TimerPlanDialogs modals={modals} />
				</div>
			)}
		</div>
	);
}

/**
 * The compact timer of the top bar: a pill like its neighbours (team switcher, Collaborate), the round button
 * concentric with it (4px all around) so nothing of the button crosses the pill's edge.
 */
const MIN_TIMER_FRAME =
	'inline-flex h-8 items-center gap-2 rounded-full bg-card pl-3 pr-1 hairline-ring ring-border shadow-[0_1px_1px_rgb(0_0_0/0.04)] dark:ring-foreground/15';

export function MinTimerFrame({ className }: IClassName) {
	const hydrated = useHydrated();
	const { timerStatus, startTimer, stopTimer } = useTimerView();
	const isTimerRunning = Boolean(timerStatus?.running);
	const { modals, actionDisabled, startStopTimerHandler } = useStartStopTimerHandler({ startTimer, stopTimer });

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
	const todayWorkedLabel = `${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`;

	return (
		<div className={clsxm(MIN_TIMER_FRAME, className)}>
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
				<Text className="w-[5.5rem] shrink-0 whitespace-nowrap text-[13px] font-medium tabular-nums">
					{isTimerRunning && <RunningClock className="text-muted-foreground" />}
					{!isTimerRunning && todayWorkedLabel}
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

			{/* From sm up: on a phone the pill has no room left, and the main timer carries the same notes */}
			<TimerNotesButton className="hidden size-6 sm:inline-flex" />

			<div className="z-[50] flex">
				<TimerButton
					onClick={startStopTimerHandler}
					running={displayRunning}
					disabled={!hydrated || actionDisabled}
					className="size-6 shadow-none"
				/>
			</div>

			<TimerPlanDialogs modals={modals} />
		</div>
	);
}

export function TimerRunningSourceIcon({ source }: { source: ETimeLogSource }) {
	switch (source) {
		case ETimeLogSource.MOBILE:
			return <Smartphone aria-hidden="true" className="size-4 animate-pulse text-muted-foreground" />;
		case ETimeLogSource.BROWSER:
			return <Globe aria-hidden="true" className="size-4 animate-pulse" />;
		case ETimeLogSource.BROWSER_EXTENSION:
			return <Globe aria-hidden="true" className="size-4 animate-pulse text-muted-foreground" />;
		case ETimeLogSource.DESKTOP:
			return <Desktop aria-hidden="true" className="size-4 animate-pulse text-muted-foreground" />;
		case ETimeLogSource.UPWORK:
			return <ArrowTurnUp aria-hidden="true" className="size-4 animate-pulse text-muted-foreground" />;
		case ETimeLogSource.HUBSTAFF:
			return <Lifebuoy aria-hidden="true" className="size-4 animate-pulse text-muted-foreground" />;
		default:
			return <></>;
	}
}
