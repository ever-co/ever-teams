'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
	format,
	startOfWeek,
	endOfWeek,
	startOfMonth,
	endOfMonth,
	subDays,
	subWeeks,
	subMonths,
	isSameMonth,
	isSameYear,
	isEqual
} from 'date-fns';
import { DateRange } from 'react-day-picker';

interface DateRangePickerProps {
	className?: string;
	onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ className, onDateRangeChange }: DateRangePickerProps) {
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
		from: new Date(),
		to: new Date()
	});
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
	const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

	const handleDateRangeChange = (range: DateRange | undefined) => {
		setDateRange(range);
		onDateRangeChange?.(range);
	};

	const predefinedRanges = [
		{
			label: 'Today',
			action: () => {
				const today = new Date();
				handleDateRangeChange({ from: today, to: today });
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const today = new Date();
				return isEqual(range.from, today) && isEqual(range.to, today);
			}
		},
		{
			label: 'Yesterday',
			action: () => {
				const yesterday = subDays(new Date(), 1);
				handleDateRangeChange({ from: yesterday, to: yesterday });
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const yesterday = subDays(new Date(), 1);
				return isEqual(range.from, yesterday) && isEqual(range.to, yesterday);
			}
		},
		{
			label: 'Current Week',
			action: () => {
				const today = new Date();
				handleDateRangeChange({
					from: startOfWeek(today, { weekStartsOn: 1 }),
					to: endOfWeek(today, { weekStartsOn: 1 })
				});
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const today = new Date();
				const weekStart = startOfWeek(today, { weekStartsOn: 1 });
				const weekEnd = endOfWeek(today, { weekStartsOn: 1 });
				return isEqual(range.from, weekStart) && isEqual(range.to, weekEnd);
			}
		},
		{
			label: 'Last Week',
			action: () => {
				const lastWeek = subWeeks(new Date(), 1);
				handleDateRangeChange({
					from: startOfWeek(lastWeek, { weekStartsOn: 1 }),
					to: endOfWeek(lastWeek, { weekStartsOn: 1 })
				});
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const lastWeek = subWeeks(new Date(), 1);
				const weekStart = startOfWeek(lastWeek, { weekStartsOn: 1 });
				const weekEnd = endOfWeek(lastWeek, { weekStartsOn: 1 });
				return isEqual(range.from, weekStart) && isEqual(range.to, weekEnd);
			}
		},
		{
			label: 'Current Month',
			action: () => {
				const today = new Date();
				handleDateRangeChange({
					from: startOfMonth(today),
					to: endOfMonth(today)
				});
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const today = new Date();
				const monthStart = startOfMonth(today);
				const monthEnd = endOfMonth(today);
				return isEqual(range.from, monthStart) && isEqual(range.to, monthEnd);
			}
		},
		{
			label: 'Last Month',
			action: () => {
				const lastMonth = subMonths(new Date(), 1);
				handleDateRangeChange({
					from: startOfMonth(lastMonth),
					to: endOfMonth(lastMonth)
				});
			},
			isSelected: (range: DateRange | undefined) => {
				if (!range?.from || !range?.to) return false;
				const lastMonth = subMonths(new Date(), 1);
				const monthStart = startOfMonth(lastMonth);
				const monthEnd = endOfMonth(lastMonth);
				return isEqual(range.from, monthStart) && isEqual(range.to, monthEnd);
			}
		}
	];

	const formatDateRange = (range: DateRange) => {
		if (!range.from) return 'Select date range';
		if (!range.to) return format(range.from, 'd MMM yyyy');

		if (isSameYear(range.from, range.to)) {
			if (isSameMonth(range.from, range.to)) {
				return `${format(range.from, 'd')} - ${format(range.to, 'd MMM yyyy')}`;
			}
			return `${format(range.from, 'd MMM')} - ${format(range.to, 'd MMM yyyy')}`;
		}
		return `${format(range.from, 'd MMM yyyy')} - ${format(range.to, 'd MMM yyyy')}`;
	};

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverTrigger asChild>
				<Button
					variant="outline"
					className={cn(
						'justify-between gap-2 px-3 py-2 min-w-[240px] text-center flex items-center',
						!dateRange && 'text-muted-foreground',
						className
					)}
				>
					{dateRange ? formatDateRange(dateRange) : 'Select date range'}
					<ChevronDown className="w-4 h-4" />
				</Button>
			</PopoverTrigger>
			<PopoverContent
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => e.stopPropagation()}
				className="p-0 w-auto"
				align="center"
			>
				<div className="flex flex-row-reverse">
					<div className="p-1 space-y-1 border-l max-w-36">
						{predefinedRanges.map((range) => (
							<Button
								key={range.label}
								variant={range.isSelected(dateRange) ? 'default' : 'ghost'}
								className={cn(
									'justify-start w-full font-normal',
									range.isSelected(dateRange) &&
										'bg-primary text-primary-foreground hover:bg-primary/90'
								)}
								onClick={() => {
									range.action();
								}}
							>
								{range.label}
							</Button>
						))}
					</div>
					<div className="p-1">
						<Calendar
							className="min-w-[240px]"
							mode="range"
							selected={dateRange}
							onSelect={handleDateRangeChange}
							numberOfMonths={2}
							month={currentMonth}
							onMonthChange={setCurrentMonth}
							showOutsideDays={false}
							fixedWeeks
							ISOWeek
							initialFocus
						/>
					</div>
				</div>
				<div className="flex gap-2 justify-end p-1 border-t">
					<Button
						variant="outline"
						onClick={() => {
							handleDateRangeChange(undefined);
							setIsPopoverOpen(false);
						}}
					>
						Clear
					</Button>
					<Button
						onClick={() => {
							setIsPopoverOpen(false);
						}}
					>
						Apply
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
