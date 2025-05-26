import { ClockIcon } from '@heroicons/react/20/solid';
import {
	XXLTextIcon as XlargeIcon,
	XLTextIcon as LargeIcon,
	XSTextIcon as TinySizeIcon,
	STextIcon as SmallSizeIcon,
	MTextIcon as MediumSizeIcon,
	ChevronUpDoubleIcon,
	ChevronUpIcon,
	IsEqualIcon,
	ChevronDownIcon,
	CheckCircleTickIcon as TickCircleIcon,
	CircleIcon,
	CrossCircleIcon as CloseCircleIcon,
	SearchStatusIcon,
	TrackingIcon as TimerIcon,
	LoginIcon
} from 'assets/svg';
import { TStatus } from './task-status';
import { ITaskStatusNameEnum, ITaskSizeNameEnum } from '@/core/types/enums/task';

export const taskStatus: TStatus<ITaskStatusNameEnum> = {
	todo: {
		icon: <LoginIcon className="text-[#292D32] w-full max-w-[18px]" strokeWidth="1.6" />,
		bgColor: '#D6E4F9'
	},
	'in-progress': {
		icon: <TimerIcon className="text-[#292D32] w-full max-w-[18px]" strokeWidth="1.6" />,
		bgColor: '#ECE8FC'
	},
	'in review': {
		icon: <SearchStatusIcon className="text-[#292D32] w-full max-w-[18px]" strokeWidth="1.6" />,
		bgColor: ' #F3D8B0'
	},
	ready: {
		icon: <ClockIcon />,
		bgColor: '#F5F1CB'
	},
	completed: {
		icon: <TickCircleIcon className="w-full max-w-[17px]" />,
		bgColor: '#D4EFDF'
	},
	blocked: {
		icon: <CloseCircleIcon className="text-[#292D32] w-full max-w-[18px]" />,
		bgColor: '#F5B8B8'
	},
	backlog: {
		icon: <CircleIcon className="w-full max-w-[14px]" />,
		bgColor: '#F2F2F2'
	},
	closed: {
		icon: <TickCircleIcon className="w-full max-w-[17px]" />,
		bgColor: '#eaeaea'
	},
	open: {
		icon: <LoginIcon className="text-[#292D32] w-full max-w-[18px]" strokeWidth="1.6" />,
		bgColor: '#D6E4F9'
	},
	'in-review': {
		icon: <SearchStatusIcon className="text-[#292D32] w-full max-w-[18px]" strokeWidth="1.6" />,
		bgColor: ' #F3D8B0'
	},
	'ready-for-review': {
		icon: <ClockIcon />,
		bgColor: '#F5F1CB'
	},
	done: {
		icon: <TickCircleIcon className="w-full max-w-[17px]" />,
		bgColor: '#D4EFDF'
	},
	custom: {}
};

export const taskPriorities: TStatus = {
	Highest: {
		icon: <ChevronUpDoubleIcon className="w-full max-w-[16px] text-[#EE6C4D]" strokeWidth="1.8" />,
		bgColor: 'transparent',
		bordered: true
	},
	High: {
		icon: <ChevronUpIcon className="w-full max-w-[16px] text-[#EE6C4D]" strokeWidth="1.6" />,
		bgColor: 'transparent',
		bordered: true
	},
	Medium: {
		icon: <IsEqualIcon className="w-full max-w-[16px]" strokeWidth="1.8" />,
		bgColor: 'transparent',
		bordered: true
	},
	Low: {
		icon: <ChevronDownIcon className="w-full max-w-[16px] text-[#2F80ED]" strokeWidth="1.6" />,
		bgColor: 'transparent',
		bordered: true
	},
	Lowest: {
		icon: <ChevronUpDoubleIcon className="w-full rotate-180 max-w-[16px] text-[#2F80ED]" strokeWidth="1.8" />,
		bgColor: 'transparent',
		bordered: true
	}
};

export const taskSizes: TStatus<ITaskSizeNameEnum> = {
	'X-Large': {
		icon: <XlargeIcon className="w-full max-w-[28px]" />,
		bgColor: 'transparent',
		bordered: true
	},
	Large: {
		icon: <LargeIcon className="w-full max-w-[28px]" />,
		bgColor: 'transparent',
		bordered: true
	},
	Medium: {
		icon: <MediumSizeIcon className="w-full max-w-[28px]" />,
		bgColor: 'transparent',
		bordered: true
	},
	Small: {
		icon: <SmallSizeIcon className="w-full max-w-[28px]" />,
		bgColor: 'transparent',
		bordered: true
	},
	Tiny: {
		icon: <TinySizeIcon className="w-full max-w-[28px]" />,
		bgColor: 'transparent',
		bordered: true
	}
};

export const taskLabels: TStatus = {
	'UI/UX': {
		icon: <ClockIcon />,
		bgColor: '#c2b1c6'
	},
	Mobile: {
		icon: <ClockIcon />,
		bgColor: '#7c7ab7'
	},
	WEB: {
		icon: <ClockIcon />,
		bgColor: '#97b7c1'
	},
	Tablet: {
		icon: <ClockIcon />,
		bgColor: '#b0c8a8'
	}
};
