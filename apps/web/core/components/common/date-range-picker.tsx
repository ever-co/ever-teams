'use client';

import * as React from 'react';
import { Button } from '@/core/components/duplicated-components/_button';
import { Calendar } from '@/core/components/common/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { Calendar as CalendarIcon, ChevronDown } from '@/core/components/icons';
import { cn } from '@/core/lib/helpers';
import { controlGroupRecipe } from './input';
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
	startOfDay,
	endOfDay
} from 'date-fns';
import { DateRange } from 'react-day-picker';
import { useTranslations } from 'next-intl';
import { SettingsIcon } from './team-icon';
import { TranslationHooks } from 'next-intl';

interface DateRangePickerProps {
	className?: string;
	onDateRangeChange?: (range: DateRange | undefined) => void;
	/** Optional initial date range. When provided the picker starts with this
	 *  range instead of the hardcoded "full current month" fallback.
	 *  This keeps the UI in sync with the data-layer defaults from useActivityFilters. */
	initialRange?: DateRange;
}

export function DateRangePicker({ className, onDateRangeChange, initialRange }: DateRangePickerProps) {
	const t = useTranslations();
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>(() => {
		if (initialRange?.from && initialRange?.to) {
			return initialRange;
		}
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
				<div className={cn(controlGroupRecipe, 'w-[225px]')}>
					<Button
						variant="ghost"
						size="default"
						className={cn(
							'w-[calc(100%-2rem)] justify-between gap-2 rounded-r-none px-3 font-normal',
							!dateRange && 'text-muted-foreground',
							className
						)}
					>
						<CalendarIcon className="size-4 text-muted-foreground" />
						{dateRange ? formatDateRange(dateRange) : t('common.SELECT')}
						<ChevronDown className="size-4 text-muted-foreground" />
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
						className="size-8 rounded-l-none hairline-l border-border text-muted-foreground"
					>
						<SettingsIcon />
					</Button>
				</div>
			</PopoverTrigger>
			<PopoverContent
				onClick={(e) => e.stopPropagation()}
				onMouseDown={(e) => e.stopPropagation()}
				onChange={(e) => e.stopPropagation()}
				className="w-auto p-0"
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
							// Only days after today are disabled, so a custom range can end today. The report
							// data only covers the range already selected, so it cannot tell which other days
							// are worth picking.
							disabled={(date: Date) => date > endOfDay(new Date())}
						/>
					</div>
					<div className="max-w-36 space-y-1 hairline-l border-border p-1">
						<PredefinedRanges handleDateRangeChange={handleDateRangeChange} t={t} dateRange={dateRange} />
					</div>
				</div>
				<div className="flex justify-end gap-2 hairline-t border-border p-2">
					<Button
						variant="outline"
						size="default"
						onClick={() => {
							handleDateRangeChange(undefined);
							setIsPopoverOpen(false);
						}}
					>
						{t('common.CLEAR')}
					</Button>
					<Button
						size="default"
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
		<div className="flex flex-col gap-0.5 p-1">
			{predefinedRanges.map((range) => {
				const isActive = range.isSelected(dateRange);
				return (
					<Button
						key={range.label}
						variant="ghost"
						aria-pressed={isActive}
						className={cn(
							'w-full justify-start px-2 text-sm font-normal',
							isActive && 'bg-foreground/5 font-medium text-foreground'
						)}
						onClick={() => {
							range.action();
						}}
					>
						{range.label}
					</Button>
				);
			})}
		</div>
	);
};
