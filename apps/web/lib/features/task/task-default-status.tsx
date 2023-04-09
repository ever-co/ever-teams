import {
	ITaskLabel,
	ITaskPriority,
	ITaskSize,
	ITaskStatus,
} from '@app/interfaces';
import { ClockIcon } from '@heroicons/react/20/solid';
import {
	LoginIcon,
	TimerIcon,
	SearchStatusIcon,
	TickCircleIcon,
	CloseCircleIcon,
	CircleIcon,
	HighestIcon,
	HighIcon,
	LowestIcon,
	LowIcon,
	MediumIcon,
	LargeIcon,
	MediumSizeIcon,
	SmallSizeIcon,
	TinySizeIcon,
	XlargeIcon,
} from 'lib/components/svgs';
import { TStatus } from './task-status';

export const taskStatus: TStatus<ITaskStatus> = {
	Todo: {
		icon: <LoginIcon />,
		bgColor: '#D6E4F9',
	},
	'in progress': {
		icon: <TimerIcon />,
		bgColor: '#ECE8FC',
	},
	'In Review': {
		icon: <SearchStatusIcon />,
		bgColor: ' #F3D8B0',
	},
	Ready: {
		icon: <ClockIcon />,
		bgColor: '#F5F1CB',
	},
	Completed: {
		icon: <TickCircleIcon className="stroke-[#292D32]" />,
		bgColor: '#D4EFDF',
	},
	Blocked: {
		icon: <CloseCircleIcon />,
		bgColor: '#F5B8B8',
	},
	Backlog: {
		icon: <CircleIcon />,
		bgColor: '#F2F2F2',
	},
	Closed: {
		icon: <TickCircleIcon className="stroke-[#acacac]" />,
		bgColor: '#eaeaea',
	},
	Open: {},
};

export const taskPriorities: TStatus<ITaskPriority> = {
	Highest: {
		icon: <HighestIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	High: {
		icon: <HighIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Medium: {
		icon: <MediumIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Low: {
		icon: <LowIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Lowest: {
		icon: <LowestIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
};

export const taskSizes: TStatus<ITaskSize> = {
	'X-Large': {
		icon: <XlargeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Large: {
		icon: <LargeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Medium: {
		icon: <MediumSizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Small: {
		icon: <SmallSizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
	Tiny: {
		icon: <TinySizeIcon />,
		bgColor: 'transparent',
		bordered: true,
	},
};

export const taskLabels: TStatus<ITaskLabel> = {
	'UI/UX': {
		icon: <ClockIcon />,
		bgColor: '#c2b1c6',
	},
	Mobile: {
		icon: <ClockIcon />,
		bgColor: '#7c7ab7',
	},
	WEB: {
		icon: <ClockIcon />,
		bgColor: '#97b7c1',
	},
	Tablet: {
		icon: <ClockIcon />,
		bgColor: '#b0c8a8',
	},
};
