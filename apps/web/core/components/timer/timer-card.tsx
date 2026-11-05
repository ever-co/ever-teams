import { pad } from '@/core/lib/helpers/number';
import { useStartStopTimerHandler } from '@/core/hooks/activities/use-start-stop-timer-handler';
import { useTaskStatistics } from '@/core/hooks/tasks/use-task-statistics';
import { useTimer, useTimerClock } from '@/core/hooks/activities/use-timer';
import { ProgressBar } from '@/core/components/common/progress-bar';
import { PauseIcon } from '@/core/components/svgs/pause-icon';
import { PlayIcon } from '@/core/components/svgs/play-icon';
import { TimerPlanDialogs } from '@/core/components/features/daily-plan/timer-plan-dialogs';
import { useTranslations } from 'next-intl';
import { useAtomValue } from 'jotai';
import { timerSecondsState } from '@/core/stores';

function TimerCardClock() {
	const { hours, minutes, seconds, ms_p } = useTimerClock();
	return (
		<>
			{pad(hours)} : {pad(minutes)} : {pad(seconds)}:
			<span className="inline-block w-9 text-2xl font-normal text-muted-foreground">{pad(ms_p)}</span>
		</>
	);
}

const Timer = () => {
	const t = useTranslations();
	const { timerStatus, timerStatusFetching, canRunTimer, startTimer, stopTimer } = useTimer();
	const timerSeconds = useAtomValue(timerSecondsState);

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const { modals, startStopTimerHandler } = useStartStopTimerHandler({ startTimer, stopTimer });

	return (
		<>
			<div className="flex flex-col min-w-[300px]">
				<h1 className="text-5xl font-semibold tabular-nums text-foreground">
					<TimerCardClock />
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

			<TimerPlanDialogs modals={modals} />
		</>
	);
};

export default Timer;
