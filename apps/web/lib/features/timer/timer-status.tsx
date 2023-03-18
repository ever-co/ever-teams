import { IClassName, ITimerStatusEnum } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { PauseIcon, StopCircleIcon, TimerPlayIcon } from 'lib/components/svgs';

type Props = { status: ITimerStatusEnum; showIcon?: boolean } & IClassName;

export function TimerStatus({ status, className, showIcon = true }: Props) {
	return (
		<div
			className={clsxm(
				'flex items-center justify-center w-5 h-5 rounded-full ',
				status === 'running' && ['bg-green-300'],
				status === 'pause' && ['bg-[#EFCF9E]'],
				status === 'idle' && ['bg-[#F5BEBE]'],
				className
			)}
		>
			{status === 'running' && showIcon && (
				<TimerPlayIcon className="w-3 h-3 fill-green-700" />
			)}
			{status === 'pause' && showIcon && (
				<PauseIcon className="w-3 h-3 fill-[#B87B1E]" />
			)}

			{status === 'idle' && showIcon && (
				<StopCircleIcon className="w-3 h-3 fill-[#E65B5B]" />
			)}
		</div>
	);
}
