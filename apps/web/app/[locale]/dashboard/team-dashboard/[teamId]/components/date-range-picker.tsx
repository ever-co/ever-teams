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
import { useTranslations } from 'next-intl';
import { SettingsIcon } from './team-icon';

interface DateRangePickerProps {
	className?: string;
	onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ className, onDateRangeChange }: DateRangePickerProps) {
	const t = useTranslations();
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
		const today = new Date();
		const lastMonth = subMonths(today, 1);
		return {
			from: startOfMonth(lastMonth),
			to: endOfMonth(lastMonth)
		};
	});
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
	const [currentMonth, setCurrentMonth] = React.useState<Date>(() => subMonths(new Date(), 1));

	const handleDateRangeChange = (range: DateRange | undefined) => {
		try {
			setDateRange(range);
			onDateRangeChange?.(range);
		} catch (error) {
			console.error('Error handling date range change:', error);
		}
	};

	const predefinedRanges = [
		{
			label: t('common.TODAY'),
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
			label: t('common.YESTERDAY'),
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
			label: t('common.THIS_WEEK'),
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
			label: t('common.LAST_WEEK'),
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
			label: t('common.THIS_MONTH'),
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
			label: t('common.LAST_MONTH'),
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
				return `${format(range.from, 'MMM d')} - ${format(range.to, 'd yyyy')}`;
			}
			return `${format(range.from, 'MMM d')} - ${format(range.to, 'd MMM yyyy')}`;
		}
		return `${format(range.from, 'MMM d')} - ${format(range.to, 'd MMM yyyy')}`;
	};

	return (
		<Popover open={isPopoverOpen} onOpenChange={setIsPopoverOpen}>
			<PopoverTrigger asChild>
				<div className="flex items-center border border-[#E4E4E7] dark:border-[#2D2D2D] rounded-md w-[225px]">
					<Button
						variant="outline"
						className={cn(
							'flex items-center justify-between gap-2 px-3 py-1 w-[196px] h-[36px] bg-white dark:bg-dark--theme-light rounded-r-none',
							!dateRange && 'text-muted-foreground',
							className
						)}
					>
						{dateRange ? formatDateRange(dateRange) : t('common.SELECT')}
						<ChevronDown className="w-4 h-4" />
					</Button>
					<Button
						variant="ghost"
						onClick={() => {
							const today = new Date();
							setCurrentMonth(today);
							handleDateRangeChange({
								from: startOfMonth(today),
								to: endOfMonth(today)
							});
							setIsPopoverOpen(true);
						}}
						title="Open date settings"
						aria-label="Open date settings"
						size="icon"
						className="flex items-center justify-center w-[36px] h-[36px] bg-white dark:bg-dark--theme-light border-l border-l-[#E4E4E7] dark:border-l-[#2D2D2D] rounded-r-md hover:bg-gray-50 dark:hover:bg-gray-800"
					>
						<SettingsIcon />
					</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => e.stopPropagation()}
				className="p-0 w-auto dark:bg-dark--theme-light dark:border-[#2D2D2D] border border-[#E4E4E7] rounded-md"
				align="center"
			>
				<div className="flex flex-row-reverse">
					<div className="p-1 space-y-1 border-l max-w-36">
						{predefinedRanges.map((range) => (
							<Button
								key={range.label}
								variant={range.isSelected(dateRange) ? 'default' : 'ghost'}
								className={cn(
									'justify-start w-full font-normal dark:text-gray-100',
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
							disabled={(date) => date >= startOfDay(new Date())}
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
						{t('common.CLEAR')}
					</Button>
					<Button
						onClick={() => {
							setIsPopoverOpen(false);
						}}
					>
						{t('common.APPLY')}
					</Button>
				</div>
			</PopoverContent>
		</Popover>
	);
}
