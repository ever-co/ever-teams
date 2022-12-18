import { pad } from '@app/helpers/number';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { useTimer } from '@app/hooks/features/useTimer';
import { ProgressBar } from '../progress-bar';
import { PauseIcon } from './pauseIcon';
import { PlayIcon } from './playIcon';
import { SlashIcon } from './slashIcon';

const Timer = () => {
	const {
		fomatedTimeCounter: { hours, minutes, seconds, ms_p },
		timerStatus,
		timerStatusFetching,
		startTimer,
		stopTimer,
		canRunTimer,
		timerSeconds,
	} = useTimer();

	const { activeTaskEstimation } = useTaskStatistics(timerSeconds);

	const timerHanlder = () => {
		if (timerStatusFetching || !canRunTimer) return;
		if (timerStatus?.running) {
			stopTimer();
		} else {
			startTimer();
		}
	};

	return (
		<>
			<div className="flex flex-col min-w-[300px]">
				<h1 className="text-[53px] text-primary dark:text-[#FFFFFF]">
					{pad(hours)} : {pad(minutes)} : {pad(seconds)}:
					<span className="text-[35px] w-7 inline-block">{pad(ms_p)}</span>
				</h1>
				<ProgressBar width={284} progress={`${activeTaskEstimation}%`} />
			</div>
			<SlashIcon />
			<div
				title={
					timerStatusFetching || !canRunTimer
						? 'Please, select or create a new task to start tracking the time'
						: undefined
				}
				className={`cursor-pointer mt-[35px] ml-[24px] ${
					timerStatusFetching || !canRunTimer ? '' : ''
				}`}
				onClick={!timerStatusFetching ? timerHanlder : undefined}
			>
				{timerStatus?.running ? <PauseIcon /> : <PlayIcon />}
			</div>
		</>
	);
};

export default Timer;
