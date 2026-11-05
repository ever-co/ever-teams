import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
	format,
	addMonths,
	eachDayOfInterval,
	startOfMonth,
	endOfMonth,
	addDays,
	Locale,
	isLeapYear,
	parseISO
} from 'date-fns';
import type { GroupedTimesheet } from '@/core/lib/helpers/timesheet-grouping';
import { enGB } from 'date-fns/locale';
import { cn } from '@/core/lib/helpers';
import { formatDate } from '@/core/lib/helpers/index';
import { TranslationHooks } from 'next-intl';
import { TotalDurationByDate } from '../tasks/task-displays';
import { Button } from '@/core/components/duplicated-components/_button';

type MonthlyCalendarDataViewProps = {
	t: TranslationHooks;
	data?: GroupedTimesheet[];
	onDateClick?: (date: Date) => void;
	renderDayContent?: (date: Date, plan?: GroupedTimesheet) => React.ReactNode;
	locale?: Locale;
	daysLabels?: string[];
	noDataText?: string;
	classNames?: {
		container?: string;
		header?: string;
		grid?: string;
		day?: string;
		noData?: string;
	};
};

const defaultDaysLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/**
 * Generates an array of dates for a full month calendar.
 *
 * If the given month is February and it is a leap year, the month end date is set to the 29th.
 * Otherwise, the month end date is set to the 28th.
 *
 * The start date is set to the first day of the month minus the day of the week of the first day of the month.
 * The end date is set to the last day of the month plus 6 minus the day of the week of the last day of the month.
 *
 * @param currentMonth The current month to generate the full calendar for.
 * @returns An array of dates for a full month calendar.
 */
const generateFullCalendar = (currentMonth: Date) => {
	const monthStart = startOfMonth(currentMonth);
	const monthEnd = (() => {
		const month = monthStart.getMonth();
		if (month === 1) {
			const year = monthStart.getFullYear();
			return new Date(year, 1, isLeapYear(monthStart) ? 29 : 28);
		}
		return endOfMonth(monthStart);
	})();
	const startDate = addDays(monthStart, -monthStart.getDay());
	const endDate = addDays(monthEnd, 6 - monthEnd.getDay());
	return eachDayOfInterval({ start: startDate, end: endDate });
};

/**
 * A monthly calendar component for displaying timesheet data.
 *
 * The component is a grid of days in the month, with each day displaying the total duration of the tasks for that day.
 * The component is also responsive and can be used in a variety of screen sizes.
 *
 * @param {MonthlyCalendarDataViewProps} props - The props for the component.
 * @param {GroupedTimesheet[]} [props.data=[]] - The data to display in the calendar.
 * @param {((date: Date) => void)} [props.onDateClick] - The function to call when a date is clicked.
 * @param {((date: Date, plan?: GroupedTimesheet) => React.ReactNode)} [props.renderDayContent] - The function to call to render the content for each day.
 * @param {Locale} [props.locale=enGB] - The locale to use for the dates.
 * @param {string[]} [props.daysLabels=defaultDaysLabels] - The labels for the days of the week.
 * @param {string} [props.noDataText="No Data"] - The text to display when there is no data for a day.
 * @param {{ container?: string; header?: string; grid?: string; day?: string; noData?: string; }} [props.classNames={}] - The CSS class names to use for the component.
 * @param {TranslationHooks} props.t - The translations to use for the component.
 *
 * @returns {React.ReactElement} The JSX element for the component.
 */
const MonthlyTimesheetCalendar: React.FC<MonthlyCalendarDataViewProps> = ({
	data = [],
	onDateClick,
	renderDayContent,
	locale = enGB,
	daysLabels = defaultDaysLabels,
	noDataText = 'No Data',
	classNames = {},
	t
}) => {
	// Initialize with the first data date if available, otherwise use current date
	const initialMonth = useMemo(() => {
		if (data?.length > 0) {
			const firstDate = parseISO(data[0].date);
			return isNaN(firstDate.getTime()) ? new Date() : firstDate;
		}
		return new Date();
	}, [data?.length]);

	const [currentMonth, setCurrentMonth] = useState(initialMonth);

	// Follow the latest entry when the data changes; currentMonth stays out of the deps so Prev/Next is kept
	const firstDataDate = data[0]?.date;
	useEffect(() => {
		if (!firstDataDate) return;
		const parsedDate = parseISO(firstDataDate);
		if (!Number.isNaN(parsedDate.getTime())) {
			setCurrentMonth((prev) => (prev.getTime() === parsedDate.getTime() ? prev : parsedDate));
		}
	}, [firstDataDate]);

	const calendarDates = useMemo(() => generateFullCalendar(currentMonth), [currentMonth]);
	const groupedData = useMemo(
		() => new Map(data.map((plan) => [format(parseISO(plan.date), 'yyyy-MM-dd'), plan])),
		[data]
	);

	const handlePreviousMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, -1)), []);
	const handleNextMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, 1)), []);

	return (
		<div className={classNames.container || 'p-4 w-full'}>
			{/* Header */}
			<div className={classNames.header || 'flex items-center justify-between mb-4'}>
				<Button variant="outline" onClick={handlePreviousMonth}>
					{t('common.PREV')}
				</Button>
				<h2 className="text-base font-semibold text-balance">
					{format(currentMonth, 'MMMM yyyy', { locale: locale })}
				</h2>
				<Button variant="outline" onClick={handleNextMonth}>
					{t('common.NEXT')}
				</Button>
			</div>

			{/* Grid */}
			<div
				className={classNames.grid || 'grid grid-cols-7 text-center text-xs font-medium text-muted-foreground'}
			>
				{daysLabels.map((day) => (
					<div key={day}>{day}</div>
				))}
			</div>

			<div
				className="grid w-full grid-cols-7 mt-2 gap-px overflow-hidden rounded-xl bg-border hairline-ring ring-border"
				role="grid"
				aria-label="Calendar"
			>
				{calendarDates.map((date) => {
					const formattedDate = format(date, 'yyyy-MM-dd');
					const plan = groupedData.get(formattedDate);
					return (
						<div
							key={formattedDate}
							role="gridcell"
							tabIndex={0}
							aria-label={format(date, 'MMMM d, yyyy')}
							className={cn(
								classNames.day,
								'relative flex flex-col gap-2 bg-card py-2 min-h-[150px] outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/25 sm:w-[250px] md:w-[300px] lg:w-[350px] max-w-full',
								{
									'bg-muted': date.getMonth() !== currentMonth.getMonth()
								}
							)}
							onClick={() => onDateClick?.(date)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' || e.key === ' ') {
									e.preventDefault();
									onDateClick?.(date);
								}
							}}
						>
							<div className="flex items-center justify-between px-2">
								<span className="block text-xs font-medium tabular-nums text-muted-foreground">
									{format(date, 'dd MMM yyyy')}
								</span>
								<div className="flex items-center text-xs font-medium gap-x-1">
									{/* <span className="text-[#868687]">Total{" : "}</span> */}
									{plan && (
										<TotalDurationByDate
											timesheetLog={plan.tasks}
											createdAt={formatDate(plan.date)}
											className="tabular-nums text-foreground"
										/>
									)}
								</div>
							</div>
							{renderDayContent ? (
								renderDayContent(date, plan)
							) : plan ? (
								<div className="p-2">
									{plan.tasks.map((task) => (
										<div key={task.id} className="mb-1 text-sm truncate">
											{task.task?.title}
										</div>
									))}
								</div>
							) : (
								<div className={classNames.noData || 'px-2 text-xs text-muted-foreground'}>
									{noDataText}
								</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default MonthlyTimesheetCalendar;
