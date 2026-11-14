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
import { BreakClock, TimerBreakButton } from './timer-break-controls';
import { TimerEntryToggles } from './timer-entry-toggles';
import { Transition } from '@headlessui/react';

import { ArrowTurnUp, Break, Desktop, Globe, Lifebuoy, Smartphone } from '@/core/components/icons';
import { useTimerBreak } from '@/core/hooks/timer/use-timer-break';
import type { TimerBreakState } from '@/core/lib/utils/timer/timer-break';
import { HotkeysEvent } from 'hotkeys-js';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
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

/**
 * Below sm the clock steps down to the design system's timer size on the same line height, so the start button and
 * its two toggles keep their 44px in the phone's pane and the pane keeps its height.
 */
const CLOCK_CLASS_NAME =
	'w-[6.75rem] text-2xl leading-9 font-semibold tabular-nums sm:w-[9.5rem] sm:text-3xl lg:text-start';

/** The profile's figures row sets the timer beside 15px values: a clock at the size of a figure, not a headline. */
const COMPACT_CLOCK_CLASS_NAME = 'w-[6.5rem] text-xl font-semibold tabular-nums lg:text-start';

const RUNNING_FRACTION_CLASS_NAME = 'text-sm font-normal text-muted-foreground';

function clockClassNameOf(compact: boolean) {
	if (compact) {
		return COMPACT_CLOCK_CLASS_NAME;
	}
	return CLOCK_CLASS_NAME;
}

/** The phone's clock has no room for the running fraction of a second. */
function runningFractionClassNameOf(compact: boolean) {
	if (compact) {
		return RUNNING_FRACTION_CLASS_NAME;
	}
	return clsxm(RUNNING_FRACTION_CLASS_NAME, 'max-sm:hidden');
}

/** The start button's diameter, which the entry's toggles share, so the timer's round controls read as one row. */
function timerButtonClassNameOf(compact: boolean) {
	if (compact) {
		return 'size-9';
	}
	return 'size-11';
}

/**
 * A phone's timer row has no room for the break button beside Billable: the button takes Billable's place while it
 * shows. Billable is locked while work runs, and the start after a break keeps the choice made before it.
 */
function phoneBillableClassNameOf(showsBreakButton: boolean) {
	if (showsBreakButton) {
		return 'max-sm:hidden';
	}
	return undefined;
}

/** Which face the clock shows, so it fades in again when work starts, stops or pauses for a break. */
function clockStateKeyOf(isRunning: boolean, isOnBreak: boolean) {
	if (isOnBreak) {
		return 'break';
	}
	if (isRunning) {
		return 'running';
	}
	return 'stopped';
}

/** A break's start in milliseconds, so the break clock keeps ticking from it across status reads. */
function breakStartedAtMsOf(breakState: TimerBreakState): number | null {
	return breakState.startedAt?.getTime() ?? null;
}

/**
 * Under the clock during a break, in the room of the task's progress bar (which a break does not move), so the timer
 * row keeps its height: "On break", or "On break on another device" for a break another app started.
 */
function BreakCaption({ isFromThisApp }: Readonly<{ isFromThisApp: boolean }>) {
	const t = useTranslations();
	const caption = isFromThisApp ? t('breaks.ON_BREAK') : t('breaks.ON_BREAK_ELSEWHERE');
	return (
		<p className="mt-1 truncate text-xs leading-3 text-muted-foreground" title={caption}>
			{caption}
		</p>
	);
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

	const { allowsBreaks, breakState, pendingAction, takeBreak, endBreak } = useTimerBreak(timerStatus, stopTimer);
	const isOnBreak = breakState.isOnBreak;
	// "End break" stays offered for a break taken before the organization turned breaks off
	const showsBreakButton = isOnBreak || (allowsBreaks && isTimerRunning);
	const isBreakPending = pendingAction !== null;

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
	const runningFractionClassName = runningFractionClassNameOf(compact);
	const timerButtonClassName = timerButtonClassNameOf(compact);

	let clockFace: ReactNode = `${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`;
	if (isOnBreak) {
		clockFace = <BreakClock startedAtMs={breakStartedAtMsOf(breakState)} />;
	}
	if (isTimerRunning) {
		clockFace = <RunningClock className={runningFractionClassName} />;
	}
	let startTooltipLabel = osSpecificTimerTooltipLabel;
	if (!canRunTimer) {
		startTooltipLabel = t('timer.START_TIMER');
	}
	// During a break the start is "Back to work": it ends the break where the work starts again
	const backToWorkLabel = isOnBreak ? t('breaks.BACK_TO_WORK') : undefined;

	return (
		<div className={clsxm('flex min-w-[260px] flex-row items-center justify-between gap-4 p-2', className)}>
			<div className="flex min-w-0 items-center gap-2 lg:gap-4">
				{showTimerButton && (
					<TimerEntryToggles
						locked={isBillableLocked}
						className="gap-2"
						toggleClassName={timerButtonClassName}
						billableClassName={phoneBillableClassNameOf(showsBreakButton)}
					/>
				)}
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
							key={clockStateKeyOf(isTimerRunning, isOnBreak)}
						>
							<Text.Heading
								as="h3"
								className={clsxm(
									clockClassName,
									(isTrackedElsewhere || isOnBreak) && 'text-muted-foreground'
								)}
							>
								{clockFace}
							</Text.Heading>
						</Transition>

						{isOnBreak ? (
							<BreakCaption isFromThisApp={breakState.isFromThisApp} />
						) : (
							<ActiveTaskProgressBar />
						)}
					</div>
					<div>
						{isOnBreak && !breakState.isFromThisApp && (
							<Tooltip label={t('breaks.ON_BREAK_ELSEWHERE')} placement="bottom-start">
								<TimerRunningSourceIcon source={timerStatus?.lastLog?.source || ETimeLogSource.TEAMS} />
							</Tooltip>
						)}
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
						{showsBreakButton && (
							<TimerBreakButton
								isOnBreak={isOnBreak}
								pending={isBreakPending}
								disabled={!hydrated || actionDisabled}
								onTakeBreak={takeBreak}
								onEndBreak={endBreak}
								className={timerButtonClassName}
							/>
						)}
						<Tooltip
							label={backToWorkLabel ?? startTooltipLabel}
							placement="top-start"
							// If timer is running at some other source and user may or may not have selected the task
							// enabled={
							// 	!canRunTimer && timerStatus?.lastLog?.source !== TimerSource.TEAMS
							// }
						>
							<TimerButton
								onClick={startStopTimerHandler}
								running={displayRunning}
								disabled={!hydrated || actionDisabled || isBreakPending}
								label={backToWorkLabel}
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
 * The compact timer of the top bar: a pill like its neighbours (team switcher, Collaborate), the round controls at
 * both ends concentric with it (4px all around) so nothing crosses the pill's edge.
 */
const MIN_TIMER_FRAME =
	'inline-flex h-8 items-center gap-2 rounded-full bg-card pl-3 pr-1 hairline-ring ring-border shadow-[0_1px_1px_rgb(0_0_0/0.04)] sm:pl-1 dark:ring-foreground/15';

/** From sm up: on a phone the pill has no room left, and the main timer carries the same toggles. */
const MIN_TIMER_TOGGLES = 'hidden sm:flex';

const MIN_TIMER_TOGGLE = 'size-6';

/** From sm up, as the toggles: on a phone the main timer carries the break button. */
const MIN_TIMER_BREAK_BUTTON = 'flex max-sm:hidden';

export function MinTimerFrame({ className }: IClassName) {
	const t = useTranslations();
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
	const isBillableLocked = Boolean(displayRunning);
	const todayWorkedLabel = `${pad(todayHours)}:${pad(todayMinutes)}:${pad(todaySeconds)}`;

	const { allowsBreaks, breakState, pendingAction, takeBreak, endBreak } = useTimerBreak(timerStatus, stopTimer);
	const isOnBreak = breakState.isOnBreak;
	const showsBreakButton = isOnBreak || (allowsBreaks && isTimerRunning);
	const isBreakPending = pendingAction !== null;
	const onBreakLabel = breakState.isFromThisApp ? t('breaks.ON_BREAK') : t('breaks.ON_BREAK_ELSEWHERE');
	const backToWorkLabel = isOnBreak ? t('breaks.BACK_TO_WORK') : undefined;

	let clockFace: ReactNode = todayWorkedLabel;
	if (isOnBreak) {
		clockFace = (
			<>
				<span className="sr-only">{onBreakLabel} </span>
				<BreakClock startedAtMs={breakStartedAtMsOf(breakState)} />
			</>
		);
	}
	if (isTimerRunning) {
		clockFace = <RunningClock className="text-muted-foreground" />;
	}

	return (
		<div data-timer-surface="" className={clsxm(MIN_TIMER_FRAME, className)}>
			<TimerEntryToggles
				locked={isBillableLocked}
				className={MIN_TIMER_TOGGLES}
				toggleClassName={MIN_TIMER_TOGGLE}
			/>

			<Transition
				show={true}
				appear={true}
				enter="transition-opacity duration-300 ease-in-out"
				enterFrom="opacity-0"
				enterTo="opacity-100"
				leave="transition-opacity duration-200 ease-in-out"
				leaveFrom="opacity-100"
				leaveTo="opacity-0"
				key={clockStateKeyOf(isTimerRunning, isOnBreak)}
			>
				<Text
					className={clsxm(
						'w-[5.5rem] shrink-0 whitespace-nowrap text-[13px] font-medium tabular-nums',
						isOnBreak && 'text-muted-foreground'
					)}
				>
					{clockFace}
				</Text>
			</Transition>

			{isOnBreak && (
				<Tooltip label={onBreakLabel} placement="bottom-start">
					<Break aria-hidden="true" className="size-4 text-muted-foreground" />
				</Tooltip>
			)}

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

			{showsBreakButton && (
				<div className={MIN_TIMER_BREAK_BUTTON}>
					<TimerBreakButton
						isOnBreak={isOnBreak}
						pending={isBreakPending}
						disabled={!hydrated || actionDisabled}
						onTakeBreak={takeBreak}
						onEndBreak={endBreak}
						className={MIN_TIMER_TOGGLE}
					/>
				</div>
			)}

			<div className="z-[50] flex">
				<TimerButton
					onClick={startStopTimerHandler}
					running={displayRunning}
					disabled={!hydrated || actionDisabled || isBreakPending}
					label={backToWorkLabel}
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
