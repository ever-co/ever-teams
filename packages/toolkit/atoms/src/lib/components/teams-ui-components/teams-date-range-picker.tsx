/** @jsxImportSource theme-ui */
'use client';

import * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';

import { cn, Button, Calendar, Popover, PopoverContent, PopoverTrigger, PopoverClose } from '@ever-teams/toolkit-ui';
import { IDateRangePickerProps } from '@ever-teams/toolkit-types';
import { DateRange } from 'react-day-picker';
import { useTeamsContext } from '@lib/context/teams-context';

export function TeamsDateRangePicker({
	className,
	containerClassName,
	date,
	setDate,
	size,
	label,
	disabled,
	minDate,
	maxDate
}: IDateRangePickerProps) {
	const [pickedDate, setPickedDate] = React.useState<DateRange | undefined>(date);
	const { appliedTheme } = useTeamsContext();
	React.useEffect(() => {
		setPickedDate(date);
	}, [date]);

	return (
		<div className={cn('grid gap-2', containerClassName)}>
			{label && <span className="text-sm text-foreground">{label}</span>}
			<Popover>
				<PopoverTrigger asChild>
					<Button
						id="date"
						variant={'outline'}
						size={size}
						disabled={disabled}
						className={cn(
							'flex gap-2 justify-center items-center text-center text-xs font-normal',
							!date && 'text-muted-foreground',
							className
						)}
					>
						<CalendarIcon className="h-4 w-4" />
						{size !== 'icon' && (
							<>
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
						disabled={disabled}
						fromDate={minDate}
						toDate={maxDate}
						modifiersClassNames={{
							start: '!after:hidden text-white !rounded-full',
							end: '!after:hidden text-white !rounded-full'
						}}
						modifiersStyles={{
							start: {
								backgroundColor: appliedTheme.colors?.borderColor as string
							},
							end: {
								backgroundColor: appliedTheme.colors?.borderColor as string
							},
							selected: {
								backgroundColor: appliedTheme.colors?.borderColor as string
							}
						}}
					/>

					<div className="flex gap-3">
						<PopoverClose asChild>
							<Button className="w-20" variant={'secondary'} size={'sm'}>
								Close
							</Button>
						</PopoverClose>
						<PopoverClose asChild className="flex gap-3">
							<Button
								sx={{ background: 'mainColor' }}
								className={`w-20 `}
								onClick={() => setDate?.(pickedDate)}
								size={'sm'}
								style={{ backgroundColor: appliedTheme.colors?.borderColor as string }}
							>
								Ok
							</Button>
						</PopoverClose>
					</div>
				</PopoverContent>
			</Popover>
		</div>
	);
}
