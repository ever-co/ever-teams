import { pad } from '@app/helpers/number';
import { useTaskStatistics } from '@app/hooks/features/useTaskStatistics';
import { useTeamTasks } from '@app/hooks/features/useTeamTasks';
import { useTimer } from '@app/hooks/features/useTimer';
import { PauseIcon } from './pauseIcon';
import { PlayIcon } from './playIcon';

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

	const { activeTeamTask } = useTeamTasks();
	const { estimation } = useTaskStatistics(activeTeamTask, timerSeconds);

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
				<div className="flex w-[284px] relative">
					<div
						className="bg-[#28D581] h-[8px] rounded-full absolute z-20"
						style={{ width: `${estimation}%` }}
					></div>
					<div className="bg-[#E8EBF8] dark:bg-[#18181B] w-full h-[8px] rounded-full absolute z-10" />
				</div>
			</div>
			<div
				className={`cursor-pointer ${
					timerStatusFetching || !canRunTimer ? 'opacity-30' : ''
				}`}
				onClick={!timerStatusFetching ? timerHanlder : undefined}
			>
				{timerStatus?.running ? (
					<PauseIcon width={68} height={68} />
				) : (
					<PlayIcon width={68} height={68} />
				)}
			</div>
		</>
	);
};

export default Timer;
