import React, { useMemo, useState, useCallback } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, Locale } from 'date-fns';
import { enGB } from 'date-fns/locale';
import { cn } from '@/core/lib/helpers';
import { GroupedTimesheet } from '@/core/hooks/features/useTimesheet';
import { TotalDurationByDate } from '@/core/components/features';
import { formatDate } from '@/core/lib/helpers/index';
import { TranslationHooks } from 'next-intl';

export type WeeklyCalendarProps = {
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

const generateWeek = (currentDate: Date) => {
	const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 });
	const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 });
	return eachDayOfInterval({ start: weekStart, end: weekEnd });
};

/**
 * A weekly calendar component for displaying timesheet data.
 *
 * The component is a grid of days in the week, with each day displaying the total duration of the tasks for that day.
 * The component is also responsive and can be used in a variety of screen sizes.
 *
 * @param {WeeklyCalendarProps} props - The props for the component.
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
const WeeklyTimesheetCalendar: React.FC<WeeklyCalendarProps> = ({
	data = [],
	onDateClick,
	renderDayContent,
	locale = enGB,
	daysLabels = defaultDaysLabels,
	noDataText = 'No Data',
	classNames = {},
	t
}) => {
	const [currentDate, setCurrentDate] = useState(new Date());

	// Calculate the current week based on `currentDate`
	const weekDates = useMemo(() => generateWeek(currentDate), [currentDate]);

	// Map data to the respective dates
	const groupedData = useMemo(
		() => new Map(data.map((plan) => [format(new Date(plan.date), 'yyyy-MM-dd'), plan])),
		[data]
	);

	// Handlers for navigation
	const handlePreviousWeek = useCallback(() => setCurrentDate((prev) => addDays(prev, -7)), []);
	const handleNextWeek = useCallback(() => setCurrentDate((prev) => addDays(prev, 7)), []);

	return (
		<div className={classNames.container || 'p-4 w-full'}>
			<div className={classNames.header || 'flex items-center justify-between mb-4'}>
				<button
					onClick={handlePreviousWeek}
					className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-primary-light hover:dark:bg-primary-light"
				>
					{t('common.PREV')}
				</button>
				<h2 className="text-xl font-bold">
					{`Week of ${format(weekDates[0], 'MMM d', { locale })} - ${format(weekDates[6], 'MMM d, yyyy', {
						locale
					})}`}
				</h2>
				<button
					onClick={handleNextWeek}
					className="px-4 py-2 bg-gray-200 dark:bg-primary-light rounded hover:bg-gray-300 hover:dark:bg-primary-light"
				>
					{t('common.NEXT')}
				</button>
			</div>

			<div className={classNames.grid || 'grid grid-cols-7 text-center font-semibold text-gray-600'}>
				{daysLabels.map((day) => (
					<div key={day}>{day}</div>
				))}
			</div>

			<div className="grid grid-cols-7 mt-2 w-full h-full" role="grid" aria-label="Calendar">
				{weekDates.map((date) => {
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
								'border flex flex-col gap-2 relative shadow-sm rounded min-h-[150px]',
								{
									'bg-gray-100 dark:bg-gray-900': date.getMonth() !== currentDate.getMonth()
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
							<div className="px-2 flex items-center justify-between">
								<span className="block text-gray-500 text-sm font-medium">
									{format(date, 'dd MMM yyyy')}
								</span>
								<div className="flex items-center gap-x-1 text-gray-500 text-sm font-medium">
									{/* <span className="text-[#868687]">Total{" : "}</span> */}
									{plan && (
										<TotalDurationByDate
											timesheetLog={plan.tasks}
											createdAt={formatDate(plan.date)}
											className="text-black dark:text-gray-500 text-[12px]"
										/>
									)}
								</div>
							</div>
							{renderDayContent ? (
								renderDayContent(date, plan)
							) : plan ? (
								<div className="p-2">
									{plan.tasks.map((task) => (
										<div key={task.id} className="text-sm mb-1 truncate">
											{task.task?.title}
										</div>
									))}
								</div>
							) : (
								<div className={classNames.noData || 'text-gray-400 text-sm'}>{noDataText}</div>
							)}
						</div>
					);
				})}
			</div>
		</div>
	);
};

export default WeeklyTimesheetCalendar;
