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
	isEqual,
	startOfDay
} from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import { SettingsIcon } from './team-icon';
import { TranslationHooks } from 'next-intl';
import { CalendarIcon } from '@radix-ui/react-icons';
import { ITimerLogGrouped } from '@/app/interfaces';

interface DateRangePickerProps {
	className?: string;
	onDateRangeChange?: (range: DateRange | undefined) => void;
	data?: ITimerLogGrouped[];
}

export function DateRangePicker({ className, onDateRangeChange, data }: DateRangePickerProps) {
	const t = useTranslations();
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
		const today = new Date();
		return {
			from: startOfMonth(today),
			to: endOfMonth(today)
		};
	});
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
	const [currentMonth, setCurrentMonth] = React.useState<Date>(() => new Date());

	const handleDateRangeChange = (range: DateRange | undefined) => {
		try {
			setDateRange(range);
			onDateRangeChange?.(range);
		} catch (error) {
			console.error('Error handling date range change:', error);
		}
	};

	const formatDateRange = (range: DateRange | undefined) => {
		if (!range?.from) return 'Select date range';
		if (!range?.to) return format(range.from, 'd MMM yyyy');

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
						<CalendarIcon className="w-4 h-4" />
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
				className="p-0 w-auto dark:bg-dark--theme-light dark:border-[#2D2D2D] border border-[#E4E4E7] rounded-md shadow-lg"
				align="center"
			>
				<div className="flex">
					<div className="p-0.5">
						<Calendar
							className="min-w-[220px]"
							mode="range"
							selected={dateRange}
							onSelect={handleDateRangeChange}
							numberOfMonths={2}
							month={currentMonth}
							onMonthChange={setCurrentMonth}
							showOutsideDays={false}
							fixedWeeks
							initialFocus
							disabled={(date: Date) => {
								// Disable future dates
								if (date >= startOfDay(new Date())) return true;

								// If no data provided, only disable future dates
								if (!data) return false;

								// Check if there's any data for this date
								const hasDataForDate = data.some((log) => {
									const logDate = new Date(log.date);
									return (
										logDate.getDate() === date.getDate() &&
										logDate.getMonth() === date.getMonth() &&
										logDate.getFullYear() === date.getFullYear()
									);
								});

								// Disable dates with no data
								return hasDataForDate;
							}}
						/>
					</div>
					<div className="p-1 space-y-1 border-l max-w-36">
						<PredefinedRanges handleDateRangeChange={handleDateRangeChange} t={t} dateRange={dateRange} />
					</div>
				</div>
				<div className="flex gap-1 justify-end p-0.5 border-t">
					<Button
						variant="outline"
						size="sm"
						onClick={() => {
							handleDateRangeChange(undefined);
							setIsPopoverOpen(false);
						}}
					>
						{t('common.CLEAR')}
					</Button>
					<Button
						size="sm"
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
interface PredefinedRangeProps {
	handleDateRangeChange: (range: DateRange | undefined) => void;
	t: TranslationHooks;
	dateRange: DateRange | undefined;
}

type DateRangeGetter = () => { from: Date; to: Date };

const createRangeHelper = (handleDateRangeChange: (range: DateRange | undefined) => void) => {
	return (getRange: DateRangeGetter) => {
		const range = getRange();
		return {
			action: () => {
				const newRange = {
					from: new Date(range.from),
					to: new Date(range.to)
				};
				handleDateRangeChange(newRange);
			},
			isSelected: (currentRange: DateRange | undefined) => {
				if (!currentRange?.from || !currentRange?.to) return false;
				return (
					isEqual(startOfDay(currentRange.from), startOfDay(range.from)) &&
					isEqual(startOfDay(currentRange.to), startOfDay(range.to))
				);
			}
		};
	};
};

const PredefinedRanges = ({ handleDateRangeChange, t, dateRange }: PredefinedRangeProps) => {
	const weekOptions = { weekStartsOn: 1 as const };

	const createRange = React.useMemo(() => createRangeHelper(handleDateRangeChange), [handleDateRangeChange]);

	const predefinedRanges = React.useMemo(
		() => [
			{
				label: t('common.TODAY'),
				...createRange(() => {
					const today = new Date();
					return { from: today, to: today };
				})
			},
			{
				label: t('common.YESTERDAY'),
				...createRange(() => {
					const yesterday = subDays(new Date(), 1);
					return { from: yesterday, to: yesterday };
				})
			},
			{
				label: t('common.THIS_WEEK'),
				...createRange(() => {
					const today = new Date();
					return {
						from: startOfWeek(today, weekOptions),
						to: endOfWeek(today, weekOptions)
					};
				})
			},
			{
				label: t('common.LAST_WEEK'),
				...createRange(() => {
					const lastWeek = subWeeks(new Date(), 1);
					return {
						from: startOfWeek(lastWeek, weekOptions),
						to: endOfWeek(lastWeek, weekOptions)
					};
				})
			},
			{
				label: t('common.THIS_MONTH'),
				...createRange(() => {
					const today = new Date();
					return {
						from: startOfMonth(today),
						to: endOfMonth(today)
					};
				})
			},
			{
				label: t('common.LAST_MONTH'),
				...createRange(() => {
					const lastMonth = subMonths(new Date(), 1);
					return {
						from: startOfMonth(lastMonth),
						to: endOfMonth(lastMonth)
					};
				})
			}
		],
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[createRange, t]
	);

	return (
		<div className="flex flex-col gap-2 p-2">
			{predefinedRanges.map((range) => (
				<Button
					key={range.label}
					variant={range.isSelected(dateRange) ? 'default' : 'ghost'}
					className={cn(
						'justify-start w-full font-normal dark:text-gray-100 border rounded',
						range.isSelected(dateRange) && 'bg-primary text-primary-foreground hover:bg-primary/90'
					)}
					onClick={() => {
						range.action();
					}}
				>
					{range.label}
				</Button>
			))}
		</div>
	);
};
