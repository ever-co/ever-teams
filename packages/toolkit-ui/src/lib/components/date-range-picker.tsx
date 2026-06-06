/** @jsxImportSource theme-ui */
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn } from '../utils/utils';
import { Button } from './button';
import { Calendar } from './calendar';
import { Popover, PopoverContent, PopoverTrigger, PopoverClose } from './popover';
import { IDateRangePickerProps } from '@ever-teams/toolkit-types';
import { DateRange } from 'react-day-picker';

export function DateRangePicker({ className, date, setDate }: IDateRangePickerProps) {
	const [pickedDate, setPickedDate] = React.useState<DateRange | undefined>(date);

	React.useEffect(() => {
		setPickedDate(date);
	}, [date]);

	return (
		<div className={cn('grid gap-2', className)}>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						size={'sm'}
						className={cn(
							' justify-start text-left text-xs font-normal',
							!date && 'text-[hsl(var(--muted-foreground))]'
						)}
					>
						<CalendarIcon className="mr-2 h-4 w-4" />
						{date?.from ? (
							date.to ? (
								<>
									{format(date.from, 'LLL dd, y')} - {format(date.to, 'LLL dd, y')}
								</>
							) : (
								format(date.from, 'LLL dd, y')
							)
						) : (
							<>
								<span>Pick dates (Start/End)</span>
							</>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="flex flex-col items-end gap-2 w-auto " align="start">
					<Calendar
						initialFocus
						mode="range"
						defaultMonth={pickedDate?.from}
						selected={pickedDate}
						onSelect={setPickedDate}
						numberOfMonths={2}
						modifiersClassNames={{
							start: '!after:hidden text-white !rounded-full',
							end: '!after:hidden text-white !rounded-full'
						}}
					/>

					<div className="flex gap-3">
						<PopoverClose>
							<Button className="w-20" variant={'secondary'} size={'sm'}>
								Close
							</Button>
						</PopoverClose>
						<PopoverClose className="flex gap-3">
							<Button className={`w-20 `} onClick={() => setDate?.(pickedDate)} size={'sm'}>
								Ok
							</Button>
						</PopoverClose>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
