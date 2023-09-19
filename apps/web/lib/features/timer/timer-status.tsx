import { IClassName, ITimerStatusEnum } from '@app/interfaces';
import { clsxm } from '@app/utils';
import { Tooltip } from 'lib/components';
import {
	PauseIcon,
	StopCircleIcon,
	TimerPlayIcon,
	UserOnlineIcon,
} from 'lib/components/svgs';

type Props = {
	status: ITimerStatusEnum;
	showIcon?: boolean;
	tooltipClassName?: string;
} & IClassName;

export function TimerStatus({
	status,
	className,
	showIcon = true,
	tooltipClassName,
}: Props) {
	return (
		<Tooltip
			label={status}
			enabled
			placement="right"
			className={tooltipClassName}
		>
			<div
				className={clsxm(
					'flex items-center justify-center rounded-full',
					status === 'running' && ['bg-green-300'],
					status === 'online' && ['bg-green-300'],
					status === 'pause' && ['bg-[#EFCF9E]'],
					status === 'idle' && ['bg-[#F5BEBE]'],
					status === 'suspended' && ['bg-[#DCD6D6]'],
					className
				)}
			>
				{status === 'running' && showIcon && (
					<TimerPlayIcon className="w-5 h-5 p-1 fill-green-700" />
				)}
				{status === 'pause' && showIcon && (
					<PauseIcon className="w-5 h-5 p-1 fill-[#B87B1E]" />
				)}

				{status === 'idle' && showIcon && (
					<StopCircleIcon className="w-5 h-5 p-1 fill-[#E65B5B]" />
				)}

				{status === 'online' && showIcon && (
					<UserOnlineIcon className="w-5 h-5 p-1 fill-green-700" />
				)}

				{status === 'suspended' && showIcon && (
					<StopCircleIcon className="w-5 h-5 p-1 fill-white" />
				)}
			</div>
		</Tooltip>
	);
}
