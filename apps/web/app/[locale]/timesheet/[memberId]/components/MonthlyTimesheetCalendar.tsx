import React, { useMemo, useState, useCallback } from "react";
import { format, addMonths, eachDayOfInterval, startOfMonth, endOfMonth, addDays, Locale } from "date-fns";
import { GroupedTimesheet } from "@/app/hooks/features/useTimesheet";
import { enGB } from 'date-fns/locale';
import { cn } from "@/lib/utils";
import { TotalDurationByDate } from "@/lib/features";
import { formatDate } from "@/app/helpers";

type MonthlyCalendarDataViewProps = {
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

const defaultDaysLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const generateFullCalendar = (currentMonth: Date) => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const startDate = addDays(monthStart, -monthStart.getDay());
    const endDate = addDays(monthEnd, 6 - monthEnd.getDay());
    return eachDayOfInterval({ start: startDate, end: endDate });
};




const MonthlyTimesheetCalendar: React.FC<MonthlyCalendarDataViewProps> = ({
    data = [],
    onDateClick,
    renderDayContent,
    locale = enGB,
    daysLabels = defaultDaysLabels,
    noDataText = "No Data",
    classNames = {}
}) => {
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const calendarDates = useMemo(() => generateFullCalendar(currentMonth), [currentMonth]);
    const groupedData = useMemo(
        () => new Map(data.map((plan) => [format(new Date(plan.date), "yyyy-MM-dd"), plan])),
        [data]
    );

    const handlePreviousMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, -1)), []);
    const handleNextMonth = useCallback(() => setCurrentMonth((prev) => addMonths(prev, 1)), []);

    return (
        <div className={classNames.container || "p-4 w-full"}>
            {/* Header */}
            <div className={classNames.header || "flex items-center justify-between mb-4"}>
                <button
                    onClick={handlePreviousMonth}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300 dark:bg-primary-light hover:dark:bg-primary-light"
                >
                    Previous
                </button>
                <h2 className="text-xl font-bold">
                    {format(currentMonth, "MMMM yyyy", { locale: locale })}
                </h2>
                <button
                    onClick={handleNextMonth}
                    className="px-4 py-2 bg-gray-200 dark:bg-primary-light rounded hover:bg-gray-300 hover:dark:bg-primary-light"
                >
                    Next
                </button>
            </div>

            {/* Grid */}
            <div className={classNames.grid || "grid grid-cols-7 text-center font-semibold text-gray-600"}>
                {daysLabels.map((day) => (
                    <div key={day}>{day}</div>
                ))}
            </div>

            <div
                className="grid grid-cols-7 mt-2 w-full"
                role="grid"
                aria-label="Calendar"
            >
                {calendarDates.map((date) => {
                    const formattedDate = format(date, "yyyy-MM-dd");
                    const plan = groupedData.get(formattedDate);
                    return (
                        <div
                            key={formattedDate}
                            role="gridcell"
                            tabIndex={0}
                            aria-label={format(date, "MMMM d, yyyy")}
                            className={cn(
                                classNames.day,
                                "border flex flex-col gap-2 relative shadow-sm rounded min-h-[150px] sm:w-[250px] md:w-[300px] lg:w-[350px] max-w-full", {
                                "bg-gray-100 dark:bg-gray-900": date.getMonth() !== currentMonth.getMonth(),
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
                                    {format(date, "dd MMM yyyy")}
                                </span>
                                <div className="flex items-center gap-x-1 text-gray-500 text-sm font-medium">
                                    <span className="text-[#868687]">Total{" : "}</span>
                                    {plan && <TotalDurationByDate
                                        timesheetLog={plan.tasks}
                                        createdAt={formatDate(plan.date)}
                                        className="text-black dark:text-gray-500 text-sm"
                                    />}
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
                                <div className={classNames.noData || "text-gray-400 text-sm"}>
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
