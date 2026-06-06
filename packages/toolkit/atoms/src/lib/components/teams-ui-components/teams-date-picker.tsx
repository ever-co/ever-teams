'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '@ever-teams/toolkit-ui';
import { Button, Calendar, Popover, PopoverContent, PopoverTrigger } from '@ever-teams/toolkit-ui';
import { IDatePickerProps } from '@ever-teams/toolkit-types';
import { useTeamsContext } from '@lib/context/teams-context';

export function TeamsDatePicker({
	placeholder = 'Pick a date',
	icon = true,
	size,
	fromDate,
	toDate,
	containerClassName,
	label,
	className,
	...props
}: IDatePickerProps) {
	const [localDate, setLocalDate] = React.useState<Date>();
	const [open, setOpen] = React.useState(false);
	const { appliedTheme } = useTeamsContext();

	const date = props.date || localDate;
	const setDate = props.setDate || (setLocalDate as React.Dispatch<React.SetStateAction<Date | undefined>>);

	return (
		<div className={cn('grid gap-2', containerClassName)}>
			{label && <span className="text-sm text-foreground">{label}</span>}
			<Popover onOpenChange={setOpen} open={open}>
				<PopoverTrigger asChild>
					<Button
						size={size}
						variant={'outline'}
						className={cn(
							'w-[200px] justify-start text-left font-normal',
							!date && 'text-muted-foreground',
							className
						)}
					>
						{icon && <CalendarIcon className="mr-2 h-4 w-4" />}
						{size !== 'icon' && <>{date ? format(date, 'PPP') : <span>{placeholder}</span>}</>}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="w-auto p-0">
					<Calendar
						modifiersStyles={{
							selected: {
								backgroundColor: (appliedTheme.colors?.borderColor as string) || 'transparent'
							}
						}}
						{...props}
						mode="single"
						selected={date}
						onSelect={(date: Date | undefined) => {
							setDate(date);
							setOpen(false);
						}}
						initialFocus
						fromDate={fromDate}
						toDate={toDate}
					/>
				</PopoverContent>
			</Popover>
		</div>
	);
}
