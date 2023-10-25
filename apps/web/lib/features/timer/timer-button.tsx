/* eslint-disable no-mixed-spaces-and-tabs */
import { IClassName } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Button } from 'lib/components';
import { TimerPlayIcon, TimerStopIcon } from 'lib/components/svgs';
import { MouseEventHandler } from 'react';

type Props = {
	onClick?: MouseEventHandler<HTMLButtonElement>;
	running: boolean | undefined;
	disabled: boolean;
} & IClassName;

export function TimerButton({ onClick, running, disabled, className }: Props) {
	return (
		<Button
			onClick={onClick}
			className={clsxm(
				running
					? ['bg-rose-600 dark:bg-rose-600 border-none shadow-rose-600/30']
					: ['bg-white dark:bg-dark-lighter shadow-primary/30'],
				'w-14 h-14 rounded-full inline-block min-w-[14px] !px-0 !py-0',
				'flex justify-center items-center border border-[#0000001A] dark:border-[0.125rem] dark:border-[#28292F]',
				'shadow-xl drop-shadow-3xl dark:shadow-lgcard-white',
				disabled && ['opacity-70 cursor-default'],

				className
			)}
		>
			{running ? (
				<TimerStopIcon className={clsxm('w-[60%] h-[60%]')} />
			) : (
				<TimerPlayIcon className={clsxm('w-[60%] h-[60%]', ['fill-primary dark:fill-white'])} />
			)}
		</Button>
	);
}
