import { clsxm } from '@app/utils';
import { ProgressBar, Text, Tooltip, VerticalSeparator } from 'lib/components';
import { pad } from '@app/helpers';
import { IClassName } from '@app/interfaces';
import { TimerButton } from './timer-button';
import { useTranslation } from 'lib/i18n';
import { useTimerView } from '@app/hooks';
import { TimerSource } from '@app/interfaces/ITimer';

import {
	DevicePhoneMobileIcon,
	GlobeAltIcon,
	ComputerDesktopIcon,
	ArrowUturnUpIcon,
	LifebuoyIcon,
} from '@heroicons/react/24/outline';

export function Timer({ className }: IClassName) {
	const { trans } = useTranslation();
	const {
		hours,
		minutes,
		seconds,
		activeTaskEstimation,
		ms_p,
		canRunTimer,
		timerHanlder,
		timerStatus,
		disabled,
	} = useTimerView();

	return (
		<div className={clsxm('flex flex-row mb-12 2xl:mb-0', className)}>
			<div className="flex flex-col items-center justify-between border-r-[2px] dark:border-r-[#28292F] pr-5">
				<div className="w-[11rem]">
					<Text.Heading
						as="h3"
						className={`lg:text-4xl text-2xl tracking-wide font-normal ${
							timerStatus?.running &&
							timerStatus?.lastLog?.source &&
							timerStatus?.lastLog?.source !== TimerSource.BROWSER
								? 'text-[#888] dark:text-[#888]'
								: ''
						} `}
					>
						{pad(hours)}:{pad(minutes)}:{pad(seconds)}
						<span className="text-sm">:{pad(ms_p)}</span>
					</Text.Heading>

					<ProgressBar
						width="100%"
						className="mt-2"
						progress={`${activeTaskEstimation}%`}
					/>
				</div>
				<div className="w-[0.625rem]">
					{timerStatus && timerStatus.running && (
						<Tooltip
							label={`The time tracker is already running in the ${(
								timerStatus?.lastLog?.source || TimerSource.BROWSER
							)
								.split('_')
								.join(' ')
								.toLowerCase()}`}
							placement="bottom-start"
						>
							<TimerRunningSourceIcon
								source={timerStatus?.lastLog?.source || TimerSource.BROWSER}
							/>
						</Tooltip>
					)}
				</div>
			</div>

			<div className="ml-5 z-[50]">
				<Tooltip
					label={trans.timer.START_TIMER}
					placement="top-start"
					enabled={!canRunTimer}
				>
					<TimerButton
						onClick={timerHanlder}
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

		timerHanlder,
		timerStatus,
		disabled,
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

			{timerStatus && timerStatus.running && (
				<TimerRunningSourceIcon
					source={timerStatus?.lastLog?.source || TimerSource.BROWSER}
				/>
			)}

			<VerticalSeparator />

			<div className="ml-5 z-[50]">
				<TimerButton
					onClick={timerHanlder}
					running={timerStatus?.running}
					disabled={disabled}
					className="w-7 h-7"
				/>
			</div>
		</div>
	);
}

export function TimerRunningSourceIcon({ source }: { source: TimerSource }) {
	switch (source) {
		case TimerSource.MOBILE:
			return (
				<DevicePhoneMobileIcon className="w-4 h-4 animate-pulse" color="#888" />
			);
		/** Uncomment this if we want to show BROWSER's status too */
		// case TimerSource.BROWSER:
		// return <GlobeAltIcon className="w-4 h-4" />;
		case TimerSource.BROWSER_EXTENSION:
			return <GlobeAltIcon className="w-4 h-4 animate-pulse" color="#888" />;
		case TimerSource.DESKTOP:
			return (
				<ComputerDesktopIcon className="w-4 h-4 animate-pulse" color="#888" />
			);
		case TimerSource.UPWORK:
			return (
				<ArrowUturnUpIcon className="w-4 h-4 animate-pulse" color="#888" />
			);
		case TimerSource.HUBSTAFF:
			return <LifebuoyIcon className="w-4 h-4 animate-pulse" color="#888" />;
		default:
			return <></>;
	}
}
