import { DateRange } from 'react-day-picker';

import { ProgressProps } from '@radix-ui/react-progress';
import { ISeparator } from '../atoms/interfaces';

// Format: { THEME_NAME: CSS_SELECTOR }
export const THEMES = { light: '', dark: '.dark' } as const;

export type ChartConfig = {
	[k in string]: {
		label?: React.ReactNode;
		icon?: React.ComponentType;
	} & ({ color?: string; theme?: never } | { color?: never; theme: Record<keyof typeof THEMES, string> });
};

export type ChartContextProps = {
	config: ChartConfig;
};

export interface ISelectValue {
	value: any;
	label: string;
	icon?: React.ReactNode;
}

export interface IDatePickerProps {
	placeholder?: string;
	date?: Date;
	setDate?: React.Dispatch<React.SetStateAction<Date | undefined>>;
	className?: string | undefined;
	containerClassName?: string;
	size?: 'default' | 'sm' | 'lg' | 'icon';
	label?: string;
	disabled?: boolean;
	fromDate?: Date;
	toDate?: Date;
	icon?: boolean;
}

export interface IDateRangePickerProps {
	date?: DateRange;
	setDate?: React.Dispatch<React.SetStateAction<DateRange | undefined>>;
	className?: string | undefined;
	containerClassName?: string;
	size?: 'default' | 'sm' | 'lg' | 'icon';
	label?: string;
	disabled?: boolean;
	minDate?: Date;
	maxDate?: Date;
}

export interface ITimerDisplayerProps extends React.HTMLAttributes<HTMLSpanElement> {
	separator?: ISeparator;
	fontSize?: React.CSSProperties['fontSize'];
	fontWeight?: React.CSSProperties['fontWeight'];
	fontFamily?: React.CSSProperties['fontFamily'];
}

export type TimeValues = {
	days: number;
	hours: number;
	minutes: number;
	seconds: number;
	milliseconds: number;
	totalSeconds: number;
};
export interface ITeamsProgressProps extends ProgressProps {
	className?: string;
	todayTrackedTime?: TimeValues;
}

export interface IChartProps {
	data: Object[];
	draggable?: boolean;
	config: ChartConfig;
	title?: React.ReactElement | string;
	description?: React.ReactElement | string;
	layout?: 'horizontal' | 'vertical';
	label?: boolean;
	footer?: React.ReactElement | string;
	color?: string;
	type?: string | undefined;
	className?: string;
}

export interface Member {
	label: string;
	progress?: number;
	time?: string;
	color: string;
}
