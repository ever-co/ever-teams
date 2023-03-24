import { clsxm } from '@app/utils';
import { ProgressBar, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { pad } from '@app/helpers';
import { IClassName } from '@app/interfaces';
import { TimerButton } from './timer-button';
import { useTranslation } from 'lib/i18n';
import { useTimerView } from '@app/hooks';

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
		disabled,
	} = useTimerView();

	return (
		<div className={clsxm('flex flex-row mb-10 xl:mb-0', className)}>
			<div className="border-r-[2px] dark:border-r-[#28292F] pr-5">
				<div className="w-[186px]">
					<Text.Heading as="h3" className="lg:text-4xl text-2xl tracking-wide font-normal">
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
						disabled={disabled}
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
				'flex items-center md:space-x-4 space-x-1',
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
