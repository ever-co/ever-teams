import { useTaskStatistics, useTimer } from '@app/hooks';
import { clsxm } from '@app/utils';
import { Button, ProgressBar, Text } from 'lib/components';
import { TimerPlayIcon, TimerStopIcon } from 'lib/components/svgs';
import { pad } from '@app/helpers';

export function Timer({ className }: { className?: string }) {
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
		<div className={clsxm('flex flex-row', className)}>
			<div className="border-r-[2px] dark:border-r-[#28292F] pr-5">
				<div className="w-[186px]">
					<Text.Heading as="h3" className="text-4xl tracking-wide font-normal">
						{pad(hours)}:{pad(minutes)}:{pad(seconds)}
						<span className="text-sm">:{pad(ms_p)}</span>
					</Text.Heading>

					<ProgressBar
						width="100%"
						className="mt-2"
						progress={`${activeTaskEstimation}%`}
					/>
				</div>
			</div>

			<div className="ml-5 z-[0]">
				<Button
					onClick={!timerStatusFetching ? timerHanlder : undefined}
					className={clsxm(
						'bg-primary dark:bg-[#1E2430] w-14 h-14 rounded-full inline-block min-w-[14px] !px-0 !py-0',
						'flex justify-center items-center dark:border-[#28292F] dark:border',
						'shadow-primary/30 shadow-xl drop-shadow-3xl dark:shadow-none',
						(timerStatusFetching || !canRunTimer) && [
							'opacity-70 cursor-default',
						]
					)}
				>
					{timerStatus?.running ? <TimerStopIcon /> : <TimerPlayIcon />}
				</Button>
			</div>
		</div>
	);
}
