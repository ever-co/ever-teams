/** @jsxImportSource theme-ui */
'use client';

import React from 'react';
import { ExpandIcon } from '@ever-teams/toolkit-ui';

import { cva, VariantProps } from 'class-variance-authority';
import { cn } from '@ever-teams/toolkit-ui';

import { ISeparator } from '@ever-teams/toolkit-types';

import { TeamsButton } from '../../teams-ui-components/button/button';
import { TimeDisplayer } from '../../teams-ui-components/time-displayer';
import { TodayTimeDisplayer } from '../../teams-ui-components/today-timer-displayer';
import { TeamsProgress } from '../../teams-ui-components/teams-progress';
import { SpinOverlayLoader } from 'src/lib/components/loaders/spin-overlay-loader';
import { useTranslation } from 'react-i18next';
import { TeamsTimerForm } from '@components/forms/teams-timer-form';
import { TeamsTimerFooter } from '@components/layouts/footers/component-footer';
import { useTimer } from '@hooks/useTimer';

const teamsModernTimerVariants = cva(
	'backdrop-blur-xs  p-5 bg-white dark:bg-black text-black dark:text-white relative w-[500px] rounded-xl flex flex-col justify-start gap-3 shadow-2xl dark:shadow-white/10 custom-scroll ',
	{
		variants: {
			variant: {
				default: '',
				bordered: 'border-2 border-secondaryColor'
			},
			size: {
				default: 'w-[300px]',
				sm: ' w-[220px] text-sm p-4',
				lg: ' w-[500px] px-8'
			}
		},
		defaultVariants: {
			variant: 'default',
			size: 'default'
		}
	}
);

export interface ITeamsModernTimerProps extends VariantProps<typeof teamsModernTimerVariants> {
	showProgress: boolean;
	separator?: ISeparator;
	expandable?: boolean;
	className?: string;
	style?: React.CSSProperties | undefined;
}

function TeamsModernTimer({
	variant,
	size,
	className,
	separator,
	showProgress = false,
	expandable = true,
	style,
	...props
}: ITeamsModernTimerProps): React.JSX.Element {
	// Timer hook - self-contained, fetches all dependencies internally
	const {
		timerLoading,
		timerStatusLoading,
		hours,
		minutes,
		seconds,
		todayTrackedTime,
		isRunning,
		startTimer,
		stopTimer,
		currentTeamsState,
		setCurrentTeamsState
	} = useTimer();

	const { t } = useTranslation();

	const [expandedState, setExpandedState] = React.useState<boolean>(false);

	return (
		<div
			style={style}
			className={cn(
				teamsModernTimerVariants({ variant, size, className }),
				'relative',
				size == 'sm' && 'gap-3 text-sm'
			)}
			sx={{
				color: 'textColor',
				borderColor: 'borderColor'
			}}
			{...props}
		>
			{timerStatusLoading && <SpinOverlayLoader />}
			{expandedState && (
				<h1 className="font-semibold text-base text-black dark:text-white">{t('TIME_TRACKER.title')}</h1>
			)}
			<div className={`flex justify-center items-center gap-2 `}>
				<div
					className={`absolute  flex gap-3 justify-end items-center top-3 right-5 ${size == 'sm' && 'top-1 '} `}
				>
					{expandable && (
						<button className="text-black dark:text-white" onClick={() => setExpandedState(!expandedState)}>
							{expandedState ? '-' : <ExpandIcon size={10} />}
						</button>
					)}
				</div>

				<TeamsButton
					size={size == 'sm' ? 'sm' : 'default'}
					isRunning={isRunning}
					startTimer={startTimer}
					stopTimer={stopTimer}
					timerLoading={timerLoading}
				/>

				<div className="flex flex-col gap-1  justify-center ">
					<div className={`font-semibold text-black dark:text-white ${size == 'sm' && 'text-xl'} text-3xl`}>
						<TimeDisplayer
							className="text-black dark:text-white text-4xl w-[200px] lg:text-start tracking-wide font-normal"
							fontSize={size == 'sm' ? 20 : 30}
							separator={separator}
							hours={hours}
							minutes={minutes}
							seconds={seconds}
						/>
					</div>
					{showProgress && (
						<>
							{size != 'sm' && (
								<div className="text-xs text-black dark:text-white font-thin pb-2 ">
									<span className="dark:text-gray-400 text-gray-700 font-thin">
										{t('COMMON.today')} :{' '}
									</span>{' '}
									<TodayTimeDisplayer
										className="font-normal"
										separator={separator}
										todayTrackedTime={todayTrackedTime}
									/>
								</div>
							)}
							<TeamsProgress className="h-2" value={(seconds / 60) * 100} />
						</>
					)}
				</div>
			</div>
			{expandedState && (
				<>
					<TeamsTimerForm
						currentTeamsState={currentTeamsState}
						setCurrentTeamsState={setCurrentTeamsState}
						isTimerRunning={isRunning}
						size={size}
					/>
					<TeamsTimerFooter />
				</>
			)}
		</div>
	);
}

export { TeamsModernTimer, teamsModernTimerVariants };
