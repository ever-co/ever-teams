/* eslint-disable @typescript-eslint/no-unused-vars */
import { clsxm } from '@/core/lib/utils';
import { checkPastDate, cn } from '@/core/lib/helpers';
import { DatePicker } from '@/core/components/common/date-picker';
import { Button } from '@/core/components/duplicated-components/_button';
import { Popover, PopoverContent, PopoverTrigger } from '@/core/components/common/popover';
import { CalendarIcon } from '@radix-ui/react-icons';
import { format, isAfter, isToday, startOfToday } from 'date-fns';
import { TranslationHooks } from 'next-intl';
import React, { Dispatch, useEffect, useState, SetStateAction, useCallback, useMemo, memo } from 'react';
import moment from 'moment';
import { CalendarDays, ChevronDown, ChevronRight } from 'lucide-react';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';

interface DatePickerInputProps {
	date: Date | null;
	label: string;
}

export interface TimesheetFilterDateProps {
	onChange?: (range: { from: Date | null; to: Date | null }) => void;
	initialRange?: { from: Date | null; to: Date | null };
	minDate?: Date;
	maxDate?: Date;
	t: TranslationHooks;
	data?: ITimeLog[];
}

export function TimesheetFilterDate({
	onChange,
	initialRange,
	minDate,
	maxDate,
	data,
	t
}: Readonly<TimesheetFilterDateProps>) {
	// Fix for system date being in future (2025)
	const systemToday = startOfToday();
	const today = systemToday.getFullYear() > 2024 ? new Date('2024-06-01') : systemToday;

	const adjustedInitialRange = React.useMemo(() => {
		if (!initialRange) {
			// Default to Last 7 days instead of today
			const sevenDaysAgo = new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7);
			return {
				from: sevenDaysAgo,
				to: today
			};
		}
		return {
			from: initialRange.from,
			to: initialRange.to && isAfter(initialRange.to, today) ? today : initialRange.to
		};
	}, [initialRange, today]);

	const [dateRange, setDateRange] = React.useState<{ from: Date | null; to: Date | null }>(adjustedInitialRange);
	const [isVisible, setIsVisible] = useState(false);

	const handleFromChange = (fromDate: Date | null) => {
		if (maxDate && fromDate && fromDate > maxDate) {
			return;
		}
		setDateRange((prev) => ({ ...prev, from: fromDate }));
		onChange?.({ ...dateRange, from: fromDate });
	};

	const handleToChange = (toDate: Date | null) => {
		if (dateRange.from && toDate && toDate < dateRange.from) {
			return;
		}
		setDateRange((prev) => ({ ...prev, to: toDate }));
	};

	const handlePresetClick = (preset: string) => {
		const today = new Date();
		switch (preset) {
			case t('common.FILTER_TODAY'):
				setDateRange({ from: today, to: today });
				break;
			case t('common.FILTER_LAST_7_DAYS'):
				setDateRange({
					from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 7),
					to: today
				});
				break;
			case t('common.FILTER_LAST_30_DAYS'):
				setDateRange({
					from: new Date(today.getFullYear(), today.getMonth(), today.getDate() - 30),
					to: today
				});
				break;
			case t('common.FILTER_THIS_YEAR', { year: new Date().getFullYear() }):
				setDateRange({
					from: new Date(today.getFullYear(), 0, 1),
					to: today
				});
				break;
			case t('common.FILTER_CUSTOM_RANGE'):
				setDateRange({ from: null, to: null });
				break;
			default:
				break;
		}
	};

	useEffect(() => {
		if (dateRange.from && dateRange.to) {
			onChange?.(dateRange);
		}
	}, [dateRange]); // Removed onChange from dependencies to prevent infinite loop

	const actionButtonClass =
		'h-4 border-none dark:bg-dark--theme-light text-primary hover:bg-transparent hover:underline';

	return (
		<>
			<Popover>
				<PopoverTrigger asChild>
					<Button
						variant={'outline'}
						role="combobox"
						aria-label="Select date range"
						aria-expanded="false"
						className={cn(
							'min-w-36 w-fit justify-start dark:bg-dark--theme-light dark:text-gray-300 h-[2.2rem] items-center gap-x-2 text-left font-normal overflow-hidden text-clip',
							!dateRange.from && 'text-muted-foreground'
						)}
					>
						<CalendarIcon />
						{dateRange.from ? (
							dateRange.to ? (
								<>
									{format(dateRange.from, 'LLL d')}-{format(dateRange.to, 'd, yyyy')}
								</>
							) : (
								format(dateRange.from, 'LLL d, yyyy')
							)
						) : (
							<span>{t('manualTime.PICK_A_DATE')}</span>
						)}
					</Button>
				</PopoverTrigger>
				<PopoverContent className="flex w-auto p-0 dark:bg-dark--theme-light">
					{isVisible && (
						<div className="flex flex-col justify-between gap-2 p-2 translate-x-0">
							<div className="flex flex-col gap-2">
								<DatePickerFilter
									label="From"
									date={dateRange.from}
									setDate={handleFromChange}
									timesheet={data}
								/>
								<DatePickerFilter
									label="To"
									date={dateRange.to}
									setDate={handleToChange}
									minDate={dateRange.from}
									timesheet={data}
								/>
							</div>
							<div className="flex items-end justify-end w-full">
								<Button
									variant={'outline'}
									className={cn(actionButtonClass, 'hover:text-primary')}
									onClick={() => {
										setDateRange(initialRange ?? { from: new Date(), to: new Date() });
										setIsVisible(false);
									}}
								>
									{t('common.CANCEL')}
								</Button>
								<Button
									variant={'outline'}
									className={cn(actionButtonClass, 'hover:text-primary')}
									onClick={() => {
										onChange?.(dateRange);
										setIsVisible(false);
									}}
								>
									{t('common.APPLY')}
								</Button>
							</div>
						</div>
					)}
					{isVisible && <div className="my-1 border border-slate-100 dark:border-gray-800"></div>}
					<div className="flex flex-col p-2">
						{[
							t('common.FILTER_TODAY'),
							t('common.FILTER_LAST_7_DAYS'),
							t('common.FILTER_LAST_30_DAYS'),
							t('common.FILTER_THIS_YEAR', { year: new Date().getFullYear() }),
							t('common.FILTER_CUSTOM_RANGE')
						].map((label, index) => (
							<Button
								key={index}
								variant="outline"
								className={clsxm(
									'h-7 group flex items-center justify-between border-none text-[13px] text-gray-700 dark:bg-dark--theme-light hover:bg-primary  hover:text-white hover:dark:bg-primary-light'
								)}
								onClick={() => {
									label === t('common.FILTER_CUSTOM_RANGE') && setIsVisible((prev) => !prev);
									handlePresetClick(label);
								}}
							>
								<div className="flex items-center gap-x-2">
									<ChevronDown />
									<span> {label}</span>
								</div>
								{label === t('common.FILTER_CUSTOM_RANGE') && <ChevronRight />}
							</Button>
						))}
					</div>
				</PopoverContent>
			</Popover>
		</>
	);
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ date, label }) => (
	<>
		<Button
			variant="outline"
			className={cn(
				'w-[150px] justify-start text-left font-normal bg-transparent hover:bg-transparent text-black dark:text-gray-100 h-8 border border-transparent dark:border-transparent',
				!date && 'text-muted-foreground'
			)}
		>
			{date ? format(date, 'LLL dd, y') : <span>{label}</span>}
		</Button>
		<CalendarDays className="w-5 h-5 dark:text-gray-500" />
	</>
);

export function DatePickerFilter({
	label,
	date,
	setDate,
	minDate,
	maxDate,
	timesheet
}: {
	label: string;
	date: Date | null;
	setDate: (date: Date | null) => void;
	minDate?: Date | null;
	maxDate?: Date | null;
	timesheet?: ITimeLog[];
}) {
	const isDateDisabled = React.useCallback(
		(date: Date) => {
			if (minDate && date < minDate) return true;
			if (maxDate && date > maxDate) return true;
			return false;
		},
		[minDate, maxDate]
	);

	const datesWithEntries = React.useMemo(() => {
		return new Set(
			timesheet
				?.map((entry) => {
					if (!entry.timesheet?.createdAt) {
						console.warn('Skipping entry with missing timesheet or createdAt:', entry);
						return null;
					}
					return format(new Date(entry.timesheet.createdAt), 'yyyy-MM-dd');
				})
				.filter(Boolean)
		);
	}, [timesheet]);

	const entriesByDate = React.useMemo(() => {
		const map = new Map<string, ITimeLog[]>();
		timesheet?.forEach((entry) => {
			if (!entry.timesheet?.createdAt) {
				console.warn('Skipping entry with missing timesheet or createdAt:', entry);
				return;
			}
			const dateKey = format(new Date(entry.timesheet.createdAt), 'yyyy-MM-dd');
			if (!map.has(dateKey)) {
				map.set(dateKey, []);
			}
			map.get(dateKey)?.push(entry);
		});
		return map;
	}, [timesheet]);

	const getEntriesForDate = (date: Date) => {
		const dateKey = format(date, 'yyyy-MM-dd');
		return entriesByDate.get(dateKey) || [];
	};
	const hasTimeEntry = (date: Date) => {
		return datesWithEntries.has(format(date, 'yyyy-MM-dd'));
	};

	const handleSelect = (day: Date) => {
		if (day && !isDateDisabled(day)) {
			setDate(day);
		}
	};

	return (
		<div>
			<DatePicker
				buttonVariant="link"
				// @ts-ignore
				classNames={{
					day: 'h-9 w-9 text-center rounded-md relative',
					day_selected:
						'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
					day_today: 'bg-accent text-accent-foreground',
					day_outside: 'text-muted-foreground opacity-50',
					day_disabled: 'text-muted-foreground opacity-50',
					day_range_middle: 'rounded-none',
					day_hidden: 'invisible'
				}}
				buttonClassName={
					'decoration-transparent flex items-center w-full h-[2.2em] bg-white dark:text-gray-200 dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black  h-[2.2rem] border dark:border-slate-600 rounded-md hover:border-primary'
				}
				customInput={<DatePickerInput date={date} label={label} />}
				mode="single"
				numberOfMonths={1}
				initialFocus
				defaultMonth={date ?? new Date()}
				selected={date ?? new Date()}
				onSelect={(date) => date && handleSelect(date)}
				modifiers={{
					hasEntry: (date: Date) => hasTimeEntry(date),
					today: (day: Date) => isToday(day)
				}}
				modifiersClassNames={{
					selected: clsxm('bg-primary after:hidden text-white !rounded-full'),
					today: clsxm('border-2 !border-yellow-700 rounded')
				}}
				disabled={[
					...(minDate ? [{ before: minDate }] : []),
					...(maxDate ? [{ after: maxDate }] : []),
					{
						before: new Date(new Date().getFullYear(), new Date().getMonth(), 1)
					}
				]}
				components={{
					// @ts-ignore
					Day: ({
						date: dayDate,
						displayMonth,
						...props
					}: { date: Date; displayMonth?: boolean } & Record<string, any>) => {
						const isSelected = date?.getTime() === dayDate.getTime();

						const isDayDisabled = isDateDisabled(dayDate);
						return (
							<button
								disabled={isDayDisabled}
								{...props}
								className={cn(
									`h-9 w-9 rounded ${isSelected ? 'bg-primary dark:bg-primary-light text-primary-foreground dark:text-white' : ''}`
								)}
								onClick={() => handleSelect(dayDate)}
							>
								<div className="relative flex items-center justify-center w-full h-full">
									{dayDate.getDate()}
									{getEntriesForDate(dayDate).length > 0 && (
										<span className="absolute bottom-1 left-1/2 -translate-x-1/2 flex gap-0.5">
											<DayIndicators entries={getEntriesForDate(dayDate)} />
										</span>
									)}
								</div>
							</button>
						);
					}
				}}
			/>
		</div>
	);
}
const DayIndicators = ({ entries }: { entries: ITimeLog[] }) => {
	if (entries.length === 1) {
		return (
			<span
				className="w-1 h-1 bg-green-500 rounded-full dark:bg-primary-light"
				role="status"
				aria-label="1 time entry for this day"
			/>
		);
	}
	return (
		<div
			className="flex items-center gap-0.5"
			role="status"
			aria-label={`${entries.length} time entries for this day`}
		>
			{[...Array(3)].map((_, index) => (
				<span key={index} className="w-1 h-1 bg-green-500 rounded-full dark:bg-primary-light" />
			))}
		</div>
	);
};

interface ICalendarProps<T extends { date: string | Date }> {
	setSelectedPlan: Dispatch<SetStateAction<Date>>;
	selectedPlan: Date | undefined;
	plans: T[];
	pastPlans: T[];
	handleCalendarSelect: () => void;
	createEmptyPlan: () => Promise<void>;
	bookedDayClassName?: string;
	selectedDayClassName?: string;
	pastDayClassName?: string;
	currentDayClassName?: string;
	clickDebounceInterval?: number;
	startYear?: number;
	endYear?: number;
}

export const FilterCalendar = memo(function FuturePlansCalendar<T extends { date: string | Date }>({
	setSelectedPlan,
	selectedPlan,
	plans,
	pastPlans,
	bookedDayClassName = 'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-primary after:rounded-full',
	selectedDayClassName = 'bg-primary after:hidden text-white !rounded-full',
	pastDayClassName = 'relative after:absolute after:bottom-0 after:left-1/2 after:-translate-x-1/2 after:w-1.5 after:h-1.5 after:bg-yellow-600 after:rounded-full',
	currentDayClassName = 'border-2 !border-yellow-700 rounded',
	startYear,
	endYear
}: ICalendarProps<T>) {
	const sortedPlansByDateDesc = useMemo(
		() =>
			[...plans].sort((plan1, plan2) =>
				new Date(plan1.date).getTime() < new Date(plan2.date).getTime() ? 1 : -1
			),
		[plans]
	);
	const createDateKey = (date: string | Date) => moment(date.toString().split('T')[0]).toISOString().split('T')[0];
	const isDateAvailableForPlanning = useCallback(
		(dateToCheck: Date) => {
			const dateKey = createDateKey(dateToCheck);
			const planDates = new Set(plans.map((plan) => createDateKey(plan.date)));
			return !planDates.has(dateKey);
		},
		[plans]
	);
	return (
		<DatePicker
			mode="single"
			buttonVariant={'link'}
			// @ts-ignore
			className={'dark:bg-dark--theme-light rounded-lg bg-white dark:text-gray-200'}
			buttonClassName={
				'decoration-transparent flex items-center w-full h-[2.2em] bg-white dark:text-gray-200 dark:bg-dark--theme-light border-gray-300 justify-start text-left font-normal text-black  h-[2.2rem] border dark:border-slate-600 rounded-md'
			}
			numberOfMonths={1}
			initialFocus
			customInput={<DatePickerInput date={new Date()} label={''} />}
			selected={selectedPlan || undefined}
			onSelect={(date) => date && setSelectedPlan(moment(date).toDate())}
			disabled={(date: Date) => checkPastDate(date) || !isDateAvailableForPlanning(date)}
			modifiers={{
				booked: sortedPlansByDateDesc.map((plan) => moment.utc(plan.date.toString().split('T')[0]).toDate()),
				pastDay: pastPlans.map((plan) => moment.utc(plan.date.toString().split('T')[0]).toDate())
			}}
			modifiersClassNames={{
				booked: clsxm(bookedDayClassName),
				selected: clsxm(selectedDayClassName),
				pastDay: clsxm(pastDayClassName),
				today: clsxm(currentDayClassName)
			}}
			fromYear={startYear || new Date(sortedPlansByDateDesc?.[0]?.date ?? Date.now()).getFullYear()}
			toYear={
				endYear ||
				new Date(sortedPlansByDateDesc?.[sortedPlansByDateDesc?.length - 1]?.date ?? Date.now()).getFullYear() +
					10
			}
		/>
	);
});
