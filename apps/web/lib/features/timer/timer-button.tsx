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
				running ? ['bg-primary'] : ['bg-white'],
				'w-14 h-14 rounded-full inline-block min-w-[14px] !px-0 !py-0',
				'flex justify-center items-center dark:border-[#28292F] dark:border',
				'shadow-primary/30 shadow-xl drop-shadow-3xl dark:shadow-lgcard-white',
				disabled && ['opacity-70 cursor-default'],
				running
					? ['dark:bg-gradient-to-tl dark:from-regal-rose dark:to-regal-blue']
					: ['dark:bg-dark-lighter'],

				className
			)}
		>
			{running ? (
				<TimerStopIcon className={clsxm('w-[60%] h-[60%]')} />
			) : (
				<TimerPlayIcon
					className={clsxm(
						'w-[60%] h-[60%]',
						!running && ['fill-primary dark:fill-white']
					)}
				/>
			)}
		</Button>
	);
}
