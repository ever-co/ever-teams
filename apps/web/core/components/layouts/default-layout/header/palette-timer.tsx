'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';

import { CommandGroup, CommandItem, commandIconTileClass } from '@/core/components/common/command';
import { AddManualTimeModalSkeleton } from '@/core/components/common/skeleton/calendar-component-skeletons';
import { TimerPlanDialogs } from '@/core/components/features/daily-plan/timer-plan-dialogs';
import { Play } from '@/core/components/icons';
import { LazyAddManualTimeModal } from '@/core/components/optimized-components/calendar';
import { useModal } from '@/core/hooks/common/use-modal';
import { useSyncRef } from '@/core/hooks/common/use-sync-ref';
import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useTimerButtonLogic } from '@/core/hooks/tasks/use-timer-button';
import { useTimerActions } from '@/core/hooks/timer';
import { useTimerPlanStatus } from '@/core/hooks/timer/use-timer-plan-status';
import { logErrorInDev } from '@/core/lib/helpers/error-message';
import {
	paletteNumberLabelOf,
	paletteStartActionOf,
	paletteStartValueOf,
	tasksToStartFor
} from '@/core/lib/utils/timer/palette-timer';
import { tasksByTeamState, timerStatusState } from '@/core/stores';
import type { TTask } from '@/core/types/schemas/task/task.schema';

type PaletteTimerRequest = { id: number; kind: 'stop' } | { id: number; kind: 'start'; task: TTask };

function nextRequestIdOf(current: PaletteTimerRequest | null) {
	if (!current) {
		return 1;
	}
	return current.id + 1;
}

/**
 * What the command palette does with the timer. A start or a stop asked here is handed to `PaletteTimerLayer`, which
 * runs it through the hooks of the timer's own buttons, so the palette adds no rule of its own.
 */
export function usePaletteTimer() {
	const [request, setRequest] = useState<PaletteTimerRequest | null>(null);
	const addTimeModal = useModal();
	const { canRunTimer, timerStatus } = useTimerPlanStatus();
	const isTimerRunning = timerStatus?.running === true;
	// The Stop button is disabled when the timer cannot run: the palette does not offer what the button refuses
	const canStop = isTimerRunning && canRunTimer;

	const stopTimer = useCallback(() => {
		setRequest((current) => ({ id: nextRequestIdOf(current), kind: 'stop' }));
	}, []);

	const startTimerOn = useCallback((task: TTask) => {
		setRequest((current) => ({ id: nextRequestIdOf(current), kind: 'start', task }));
	}, []);

	return { canStop, stopTimer, startTimerOn, openAddTime: addTimeModal.openModal, request, addTimeModal };
}

type PaletteTimer = ReturnType<typeof usePaletteTimer>;

/** Mounted beside the palette, not inside it: a start may open the daily plan dialogs after the palette closed. */
export function PaletteTimerLayer({ timer }: Readonly<{ timer: PaletteTimer }>) {
	const { request, addTimeModal } = timer;

	return (
		<>
			{request?.kind === 'stop' && <PaletteTimerStop key={request.id} />}
			{request?.kind === 'start' && <PaletteTimerStart key={request.id} task={request.task} />}
			{addTimeModal.isOpen && (
				<Suspense fallback={<AddManualTimeModalSkeleton />}>
					<LazyAddManualTimeModal
						closeModal={addTimeModal.closeModal}
						isOpen={addTimeModal.isOpen}
						params="AddTime"
					/>
				</Suspense>
			)}
		</>
	);
}

/** Runs the request it is mounted for once, whatever re-renders (or the double effects of development) follow. */
function useRunOnce(run: () => void) {
	const hasRunRef = useRef(false);
	const runRef = useSyncRef(run);

	useEffect(() => {
		if (hasRunRef.current) {
			return;
		}
		hasRunRef.current = true;
		runRef.current();
	}, [runRef]);
}

function PaletteTimerStop() {
	const { startTimer, stopTimer } = useTimerActions();
	const { startStopTimerHandler } = useStartStopTimerHandler({ startTimer, stopTimer });
	const timerStatus = useAtomValue(timerStatusState);
	const isTimerRunning = timerStatus?.running === true;

	useRunOnce(() => {
		// The handler starts a stopped timer: a stop asked when none runs any more must do nothing
		if (isTimerRunning) {
			startStopTimerHandler();
		}
	});

	return null;
}

function PaletteTimerStart({ task }: Readonly<{ task: TTask }>) {
	const t = useTranslations();
	const { activeTaskStatus, disabled, canTrack, startStopTimerHandler, startTimerWithTask, modals } =
		useTimerButtonLogic({ task });

	useRunOnce(() => {
		const action = paletteStartActionOf({
			isActiveTask: Boolean(activeTaskStatus),
			isTimerRunning: activeTaskStatus?.running === true,
			isMainStartDisabled: disabled,
			canTrackTask: canTrack
		});

		switch (action) {
			case 'ALREADY_RUNNING':
				toast.info(t('toasts.timer.ALREADY_RUNNING_ON_TASK'), { id: 'timer-already-running-on-task' });
				return;
			case 'UNAVAILABLE':
				toast.warning(t('timer.START_TIMER'), { id: 'timer-start-unavailable' });
				return;
			case 'BLOCKED_BY_PLAN':
				toast.warning(t('timer.PLAN_REQUIRED_TO_START'), { id: 'timer-plan-required' });
				return;
			case 'MAIN_START':
				startStopTimerHandler();
				return;
			case 'TASK_START':
				// The start reports its own failures; this only keeps a rejection from going unhandled
				startTimerWithTask().catch((error) => logErrorInDev('[Palette] Timer start failed:', error));
				return;
		}
	});

	return <TimerPlanDialogs modals={modals} />;
}

interface PaletteTimerStartResultsProps {
	search: string;
	onStartTimer: (task: TTask) => void;
	className?: string;
}

/** The open tasks of the active team that match what was typed, each as a "start the timer on it" entry. */
export function PaletteTimerStartResults({ search, onStartTimer, className }: Readonly<PaletteTimerStartResultsProps>) {
	const t = useTranslations();
	const tasks = useAtomValue(tasksByTeamState);
	const actionLabel = t('commandPalette.commands.startTimer');
	const shownTasks = useMemo(() => tasksToStartFor(tasks, search, actionLabel), [tasks, search, actionLabel]);
	// The palette filters its entries against their value: the typed text as a keyword keeps the ones chosen above
	const keywords = useMemo(() => [search.trim()], [search]);

	if (shownTasks.length === 0) {
		return null;
	}

	return (
		<CommandGroup heading={t('commandPalette.results.startTimerOn')} className={className}>
			{shownTasks.map((task) => (
				<PaletteTimerStartRow
					key={task.id}
					task={task}
					value={paletteStartValueOf(task, actionLabel)}
					keywords={keywords}
					onStartTimer={onStartTimer}
				/>
			))}
		</CommandGroup>
	);
}

interface PaletteTimerStartRowProps {
	task: TTask;
	value: string;
	keywords: string[];
	onStartTimer: (task: TTask) => void;
}

function PaletteTimerStartRow({ task, value, keywords, onStartTimer }: Readonly<PaletteTimerStartRowProps>) {
	const t = useTranslations();
	const startTimer = useCallback(() => onStartTimer(task), [onStartTimer, task]);
	const numberLabel = paletteNumberLabelOf(task);

	return (
		<CommandItem
			value={value}
			keywords={keywords}
			onSelect={startTimer}
			className="min-h-10 gap-3 rounded-lg px-2 text-sm"
		>
			<span className={commandIconTileClass}>
				<Play aria-hidden="true" />
			</span>
			<span className="min-w-0 flex-1 truncate">
				{t('commandPalette.results.startTimerOnTask', { task: task.title })}
			</span>
			{numberLabel && <span className="shrink-0 text-xs text-muted-foreground">{numberLabel}</span>}
		</CommandItem>
	);
}
