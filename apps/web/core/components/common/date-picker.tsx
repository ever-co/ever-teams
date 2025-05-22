'use client';

import * as React from 'react';

import { cn } from '../../lib/helpers';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/common/calendar';
import { DayPicker } from 'react-day-picker';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';

type BaseDatePickerProps = {
	customInput: React.ReactNode;
	buttonClassName?: string;
	buttonVariant?: 'link' | 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | null | undefined;
};

type SingleDatePickerProps = BaseDatePickerProps & {
	mode?: 'single';
	selected?: Date;
	onSelect?: (date: Date | undefined) => void;
} & Omit<React.ComponentProps<typeof DayPicker>, 'mode' | 'selected' | 'onSelect' | 'displayMonth'>;

type RangeDatePickerProps = BaseDatePickerProps & {
	mode: 'range';
	selected?: { from: Date; to?: Date };
	onSelect?: (range: { from: Date; to?: Date } | undefined) => void;
} & Omit<React.ComponentProps<typeof DayPicker>, 'mode' | 'selected' | 'onSelect' | 'displayMonth'>;

type MultipleDatePickerProps = BaseDatePickerProps & {
	mode: 'multiple';
	selected?: Date[];
	onSelect?: (dates: Date[] | undefined) => void;
} & Omit<React.ComponentProps<typeof DayPicker>, 'mode' | 'selected' | 'onSelect' | 'displayMonth'>;

export type DatePickerProps = SingleDatePickerProps | RangeDatePickerProps | MultipleDatePickerProps;

export function DatePicker(props: DatePickerProps) {
	const { customInput, selected, buttonVariant, buttonClassName, onSelect, mode = 'single', ...rest } = props;

	const calendarProps = {
		...rest,
		mode,
		selected,
		onSelect: onSelect as any,
		initialFocus: true
	};

	return (
		<Popover>
			<PopoverTrigger>
				<div>
					<Button
						type="button"
						variant={buttonVariant || undefined}
						className={cn(
							'w-[240px] justify-start text-left font-normal',
							!selected && 'text-muted-foreground',
							buttonClassName
						)}
					>
						{customInput}
					</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 border-none" align="start">
				<Calendar
					{...Object.fromEntries(Object.entries(calendarProps).filter(([key]) => key !== 'displayMonth'))}
				/>
			</PopoverContent>
		</Popover>
	);
}
