'use client';

import { useMemo } from 'react';
import { Select } from '@ever-teams/toolkit-ui';
import { ISelectValue } from '@ever-teams/toolkit-types';

interface ITeamsTimeSelectProps {
	min?: string; // "HH:mm"
	max?: string; // "HH:mm"
	step?: number; // seconds
	value?: string;
	onValueChange?: (value: string) => void;
	placeholder?: string;
	className?: string;
	size?: 'default' | 'sm' | 'lg';
	disabled?: boolean;
}

const timeToSeconds = (time: string): number => {
	const [hours, minutes] = time.split(':').map(Number);
	return hours * 3600 + minutes * 60;
};

const secondsToTime = (seconds: number): string => {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

export function TeamsTimeSelect({
	min = '00:00',
	max = '23:59',
	step = 1800,
	value,
	onValueChange,
	placeholder = 'Select time',
	className,
	size = 'default',
	disabled
}: ITeamsTimeSelectProps) {
	const options: ISelectValue[] = useMemo(() => {
		const start = timeToSeconds(min);
		const end = timeToSeconds(max);
		const result: ISelectValue[] = [];

		for (let current = start; current <= end; current += step) {
			const timeStr = secondsToTime(current);
			result.push({
				label: timeStr,
				value: timeStr
			});
		}

		return result;
	}, [min, max, step]);

	return (
		<Select
			value={value}
			onValueChange={onValueChange}
			placeholder={placeholder}
			values={options}
			className={className}
			size={size}
			disabled={disabled}
            icon
		/>
	);
}
