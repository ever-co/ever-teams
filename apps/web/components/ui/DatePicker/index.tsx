'use client';

import * as React from 'react';

import { cn } from '../../../lib/utils';
import { Button } from '@components/ui/button';
import { Calendar } from '@components/ui/calendar';
import { DayPicker } from 'react-day-picker';
import {
	Popover,
	PopoverContent,
	PopoverTrigger
} from '@components/ui/popover';

export type CustomCalendarProps = {
	customInput: React.ReactNode;
	buttonClassName?: string;
	buttonVariant?:
		| 'link'
		| 'default'
		| 'destructive'
		| 'outline'
		| 'secondary'
		| 'ghost'
		| null
		| undefined;
};
export type CalendarProps = React.ComponentProps<typeof DayPicker> &
	CustomCalendarProps;

export function DatePicker({
	customInput,
	selected,
	buttonVariant,
	buttonClassName,
	...props
}: CalendarProps) {
	return (
		<Popover>
			<PopoverTrigger asChild>
				<Button
					variant={buttonVariant || undefined}
					className={cn(
						'w-[240px] justify-start text-left font-normal',
						!selected && 'text-muted-foreground',
						buttonClassName
					)}
				>
					{/* <CalendarIcon className="mr-2 h-4 w-4" /> */}
					{/* {date ? format(date, 'PPP') : <span>Select a date</span>} */}
					{customInput}
				</Button>
			</PopoverTrigger>
			<PopoverContent className="w-auto p-0 border-none" align="start">
				<Calendar selected={selected as any} initialFocus {...props} />
			</PopoverContent>
		</Popover>
	);
}
