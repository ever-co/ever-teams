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

interface DateRangePickerProps {
	className?: string;
	onDateRangeChange?: (range: DateRange | undefined) => void;
}

export function DateRangePicker({ className, onDateRangeChange }: DateRangePickerProps) {
	const t = useTranslations();
	const [dateRange, setDateRange] = React.useState<DateRange | undefined>({
		from: new Date(),
		to: new Date()
	});
	const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
	const [currentMonth, setCurrentMonth] = React.useState<Date>(new Date());

	const handleDateRangeChange = (range: DateRange | undefined) => {
		try {
			setDateRange(range);
			onDateRangeChange?.(range);
		} catch (error) {
			console.error('Error handling date range change:', error);
		}
	};


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
					<button
						onClick={() => {
							/* Add handler */
						}}
						title="Open settings"
						aria-label="Open settings"
						className="flex items-center justify-center gap-2 px-2 py-1 w-[36px] h-[36px] bg-white dark:bg-dark--theme-light border-l  border-l-[#E4E4E7] dark:border-l-[#2D2D2D] rounded-r-md"
					>
						<SettingsIcon />
					</button>
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
						<PredefinedRanges  handleDateRangeChange={handleDateRangeChange} t={t} dateRange={dateRange} />
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
interface IpredefineRange {
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
				return isEqual(
					startOfDay(currentRange.from),
					startOfDay(range.from)
				) && isEqual(
					startOfDay(currentRange.to),
					startOfDay(range.to)
				);
			}
		};
	};
};

const PredefinedRanges = ({ handleDateRangeChange, t, dateRange }: IpredefineRange) => {
	const createRange = createRangeHelper(handleDateRangeChange);
	const weekOptions = { weekStartsOn: 1 as const };

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
		[createRange, t, weekOptions]
	);

	return (
		<div className='flex flex-col gap-2 p-2'>
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
