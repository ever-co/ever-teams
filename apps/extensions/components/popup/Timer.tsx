import classNames from 'classnames';
import React, { type FC } from 'react';

import { PlayIcon, SpinnerIcon, StopIcon } from '~components/shared/Icons';
import Notice from '~components/shared/Notice';
import { t } from '~lib/i18n';
import type { Refusal } from '~lib/refusal';
import { formatClock } from '~lib/time-format';
import { inheritTextSize } from '~misc/tailwindClasses';

interface TimerProps {
	isRunning: boolean;
	runSeconds: number;
	todaySeconds: number;
	/** The title of the running task, or of the task picked to start. */
	taskTitle: string | null;
	/** The run was started by another app or device than this browser. */
	startedElsewhere: boolean;
	canStart: boolean;
	busy: boolean;
	refusal: Refusal | null;
	onStart: () => void;
	onStop: () => void;
	onCheckTeam: () => void;
	onRetry: () => void;
}

function buttonLabelOf(isRunning: boolean, busy: boolean): string {
	if (busy && isRunning) {
		return t('timerStopping');
	}
	if (busy) {
		return t('timerStarting');
	}
	if (isRunning) {
		return t('timerStop');
	}
	return t('timerStart');
}

function pressActionOf(isRunning: boolean, onStart: () => void, onStop: () => void): () => void {
	if (isRunning) {
		return onStop;
	}
	return onStart;
}

/** Offline, the notice offers to read the timer again. */
function retryActionOf(isOffline: boolean, onRetry: () => void) {
	if (!isOffline) {
		return undefined;
	}
	return { label: t('actionRetry'), onClick: onRetry };
}

function ButtonIcon({ isRunning, busy }: { isRunning: boolean; busy: boolean }) {
	if (busy) {
		return <SpinnerIcon className="h-5 w-5" />;
	}
	if (isRunning) {
		return <StopIcon className="h-5 w-5" />;
	}
	return <PlayIcon className="h-5 w-5 translate-x-px" />;
}

function TaskLine({ taskTitle, startedElsewhere }: { taskTitle: string | null; startedElsewhere: boolean }) {
	if (!taskTitle) {
		return <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('timerNoTask')}</p>;
	}
	return (
		<div className="flex w-full min-w-0 flex-col items-center gap-0.5">
			<p className="max-w-full truncate text-sm font-medium" title={taskTitle}>
				{taskTitle}
			</p>
			{startedElsewhere && <p className="text-xs text-zinc-500 dark:text-zinc-400">{t('timerStartedElsewhere')}</p>}
		</div>
	);
}

/** A small version of the top bar timer: the running clock, its task, one round button, and today's total. */
export const Timer: FC<TimerProps> = ({
	isRunning,
	runSeconds,
	todaySeconds,
	taskTitle,
	startedElsewhere,
	canStart,
	busy,
	refusal,
	onStart,
	onStop,
	onCheckTeam,
	onRetry
}) => {
	const isDisabled = busy || (!isRunning && !canStart);
	const label = buttonLabelOf(isRunning, busy);
	const isOffline = refusal?.key === 'errorOffline';
	const onPress = pressActionOf(isRunning, onStart, onStop);
	const retryAction = retryActionOf(isOffline, onRetry);

	return (
		<section
			aria-label={t('timerRegion')}
			className="flex flex-col items-center gap-3 rounded-xl bg-white p-4 shadow-sm shadow-black/5 ring-1 ring-zinc-900/10 dark:bg-zinc-900 dark:ring-white/10">
			<TaskLine taskTitle={taskTitle} startedElsewhere={startedElsewhere} />
			<p
				className={classNames('font-semibold tabular-nums text-4xl', {
					'text-zinc-900 dark:text-white': isRunning,
					'text-zinc-400 dark:text-zinc-500': !isRunning
				})}
				aria-live="off">
				{formatClock(runSeconds)}
			</p>
			<button
				type="button"
				onClick={onPress}
				disabled={isDisabled}
				aria-label={label}
				title={label}
				className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-indigo-500 text-white shadow-md shadow-black/15 ring-1 ring-indigo-600 hover:bg-indigo-500/90 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-300 disabled:pointer-events-none disabled:opacity-50">
				<ButtonIcon isRunning={isRunning} busy={busy} />
			</button>
			<div className="flex w-full items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
				<span className={inheritTextSize}>
					{t('timerTotalToday')}{' '}
					<b className="font-semibold tabular-nums text-zinc-900 dark:text-zinc-100">{formatClock(todaySeconds)}</b>
				</span>
				<button
					type="button"
					onClick={onCheckTeam}
					className="font-medium text-indigo-600 underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 rounded dark:text-indigo-400">
					{t('timerCheckTeam')}
				</button>
			</div>
			{refusal && (
				<div className="w-full">
					<Notice tone="error" action={retryAction}>
						{t(refusal.key, refusal.reason)}
					</Notice>
				</div>
			)}
		</section>
	);
};

export default Timer;
