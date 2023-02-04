import { useTaskStatistics, useTimer } from '@app/hooks';
import { clsxm } from '@app/utils';
import { ProgressBar, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { pad } from '@app/helpers';
import { IClassName } from '@app/interfaces';
import { TimerButton } from './timer-button';
import { useTranslation } from 'lib/i18n';

export function Timer({ className }: IClassName) {
	const { trans } = useTranslation();
	const {
		hours,
		minutes,
		seconds,
		activeTaskEstimation,
		ms_p,
		canRunTimer,
		timerStatusFetching,
		timerHanlder,
		timerStatus,
	} = useTimerView();

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

			<div className="ml-5 z-[50]">
				<Tooltip
					label={trans.timer.START_TIMER}
					placement="top-start"
					enabled={!canRunTimer}
				>
					<TimerButton
						onClick={!timerStatusFetching ? timerHanlder : undefined}
						running={timerStatus?.running}
						disabled={timerStatusFetching || !canRunTimer}
					/>
				</Tooltip>
			</div>
		</div>
	);
}

export function MinTimerFrame({ className }: IClassName) {
	const {
		hours,
		minutes,
		seconds,
		ms_p,
		canRunTimer,
		timerStatusFetching,
		timerHanlder,
		timerStatus,
	} = useTimerView();

	return (
		<div
			className={clsxm(
				'input-border rounded-[10px] p-2',
				'flex items-center space-x-4',
				className
			)}
		>
			<Text className="text-lg tracking-wide font-normal w-[110px]">
				{pad(hours)}:{pad(minutes)}:{pad(seconds)}
				<span className="text-sm">:{pad(ms_p)}</span>
			</Text>

			<VerticalSeparator />

			<div className="ml-5 z-[50]">
				<TimerButton
					onClick={!timerStatusFetching ? timerHanlder : undefined}
					running={timerStatus?.running}
					disabled={timerStatusFetching || !canRunTimer}
					className="w-7 h-7"
				/>
			</div>
		</div>
	);
}

function useTimerView() {
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

	return {
		hours,
		minutes,
		seconds,
		ms_p,
		activeTaskEstimation,
		timerHanlder,
		canRunTimer,
		timerStatusFetching,
		timerStatus,
	};
}
