'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '../utils/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger } from './popover';
import { IDatePickerProps } from '@ever-teams/toolkit-types';

export function DatePicker({
	placeholder = 'Pick a date',
	date,
	setDate,
	icon = true,
	className,
	...props
}: IDatePickerProps) {
	const [open, setOpen] = React.useState(false);

	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger asChild>
				<Button
					variant={'outline'}
					className={cn(
						'w-[280px] justify-start text-left font-normal',
						!date && 'text-gray-400 dark:text-gray-600',
						className
					)}
				>
					{icon && <CalendarIcon className="mr-2 h-4 w-4" />}
					{date ? format(date, 'PPP') : <span>{placeholder}</span>}
				</Button>
			</PopoverTrigger>
			<PopoverContent align="start" className="w-auto p-0">
				<Calendar
					{...props}
					mode="single"
					selected={date ? new Date(date) : undefined}
					onSelect={(date) => {
						setDate && setDate(date);
						setOpen(false);
					}}
					initialFocus
				/>
			</PopoverContent>
		</Popover>
	);
}
