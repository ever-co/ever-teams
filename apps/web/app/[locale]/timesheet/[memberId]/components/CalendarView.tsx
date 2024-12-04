import { GroupedTimesheet, useTimesheet } from "@/app/hooks/features/useTimesheet";
import { statusColor } from "@/lib/components";
import { DisplayTimeForTimesheet, TaskNameInfoDisplay, TotalDurationByDate, TotalTimeDisplay } from "@/lib/features";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@components/ui/accordion";
import { TranslationHooks, useTranslations } from "next-intl";
import React from "react";
import { EmployeeAvatar, ProjectLogo } from "./CompactTimesheetComponent";
import { formatDate } from "@/app/helpers";
import { ClockIcon, CodeSquareIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import MonthlyTimesheetCalendar from "./MonthlyTimesheetCalendar";
import { useTimelogFilterOptions } from "@/app/hooks";
import WeeklyTimesheetCalendar from "./WeeklyTimesheetCalendar";
interface BaseCalendarDataViewProps {
    data: GroupedTimesheet[];
    daysLabels?: string[];
    CalendarComponent: typeof MonthlyTimesheetCalendar | typeof WeeklyTimesheetCalendar;
}

export function CalendarView({ data, loading }: { data?: GroupedTimesheet[], loading: boolean }) {
    const t = useTranslations();
    const { timesheetGroupByDays } = useTimelogFilterOptions();
    const defaultDaysLabels = [
        t("common.DAYS.sun"),
        t("common.DAYS.mon"),
        t("common.DAYS.tue"),
        t("common.DAYS.wed"),
        t("common.DAYS.thu"),
        t("common.DAYS.fri"),
        t("common.DAYS.sat")
    ];
    return (
        <div className="grow h-full bg-[#FFFFFF] dark:bg-dark--theme">
            {data ? (
                data.length > 0 ? (
                    <>
                        {timesheetGroupByDays === 'Monthly' ? (
                            <MonthlyCalendarDataView data={data} daysLabels={defaultDaysLabels} />
                        ) : timesheetGroupByDays === 'Weekly' ? (
                            <WeeklyCalendarDataView data={data} daysLabels={defaultDaysLabels} />
                        ) : (
                            <CalendarDataView data={data} t={t} />
                        )}
                    </>
                ) : (
                    <div className="flex items-center justify-center h-full min-h-[280px]">
                        <p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
                    </div>
                )
            ) : (
                <div className="flex items-center justify-center h-full">
                    <p>{t('pages.timesheet.LOADING')}</p>
                </div>
            )}
        </div>
    );
}

const CalendarDataView = ({ data, t }: { data?: GroupedTimesheet[], t: TranslationHooks }) => {
    const { getStatusTimesheet } = useTimesheet({});

    return (
        <div className="w-full dark:bg-dark--theme">
            <div className="rounded-md">
                {data?.map((plan, index) => {
                    return <div key={index}>
                        <div
                            className={cn(
                                'h-[40px] flex justify-between items-center w-full',
                                'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border-1',
                                'border-gray-400 px-5 text-[#71717A] font-medium'
                            )}>
                            <div className='flex gap-x-3'>
                                <span>{formatDate(plan.date)}</span>
                            </div>
                            <div className="flex items-center gap-x-1">
                                <span className="text-[#868687]">Total{" : "}</span>

                                <TotalDurationByDate
                                    timesheetLog={plan.tasks}
                                    createdAt={formatDate(plan.date)}
                                    className="text-black dark:text-gray-500 text-sm"
                                />
                            </div>
                        </div>
                        <Accordion type="single" collapsible>
                            {Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => (
                                rows.length > 0 && status && <AccordionItem
                                    key={status}
                                    value={status === 'DENIED' ? 'REJECTED' : status}
                                    className="p-1 rounded" >
                                    <AccordionTrigger
                                        type="button"
                                        className={cn(
                                            'flex flex-row-reverse justify-end items-center w-full h-[30px] rounded-sm gap-x-2 hover:no-underline px-2',
                                            statusColor(status).text
                                        )}>
                                        <div className="flex items-center justify-between space-x-1 w-full">
                                            <div className="flex items-center  w-full gap-2">
                                                <div className={cn('p-2 rounded', statusColor(status).bg)}></div>
                                                <div className="flex items-center gap-x-1">
                                                    <span className="text-base font-normal text-gray-400 uppercase text-[12px]">
                                                        {status === 'DENIED' ? 'REJECTED' : status}
                                                    </span>
                                                    <span className="text-gray-400 text-[14px]">({rows.length})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <ClockIcon className=' text-[12px] h-3 w-3' />
                                                <TotalTimeDisplay timesheetLog={rows} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col w-full gap-y-2">
                                        {rows.map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    backgroundColor: statusColor(status).bgOpacity,
                                                    borderLeftColor: statusColor(status).border

                                                }}
                                                className={cn(
                                                    'border-l-4 rounded-l flex flex-col p-2 gap-2 items-start  space-x-4  h-[100px]',
                                                )}>
                                                <div className="flex  px-3 justify-between items-center w-full">
                                                    <div className="flex items-center gap-x-1">
                                                        <EmployeeAvatar
                                                            imageUrl={task.employee.user.imageUrl ?? ''}
                                                        />
                                                        <span className=" font-normal text-[#3D5A80] dark:text-[#7aa2d8]">{task.employee.fullName}</span>
                                                    </div>
                                                    <DisplayTimeForTimesheet
                                                        duration={task.timesheet.duration}

                                                    />
                                                </div>
                                                <TaskNameInfoDisplay
                                                    task={task.task}
                                                    className={cn(
                                                        'shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
                                                    )}
                                                    taskTitleClassName={cn(
                                                        'text-sm text-ellipsis overflow-hidden !text-[#293241] dark:!text-white '
                                                    )}
                                                    showSize={true}
                                                    dash
                                                    taskNumberClassName="text-sm"
                                                />
                                                <div className="flex items-center gap-2">
                                                    {task.project && <ProjectLogo imageUrl={task.project.imageUrl as string} />}
                                                    <span className="flex-1">{task.project && task.project.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                }
                )}
            </div>

        </div>
    )
}

const BaseCalendarDataView = ({ data, daysLabels, CalendarComponent }: BaseCalendarDataViewProps) => {
    const { getStatusTimesheet } = useTimesheet({});
    return (
        <CalendarComponent
            data={data}
            // locale={ }
            daysLabels={daysLabels}
            renderDayContent={(date, plan) => {
                return <>
                    {plan ? (
                        <Accordion type="single" collapsible className="w-full">
                            {Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => (
                                rows.length > 0 && status && <AccordionItem
                                    key={status}
                                    value={status === 'DENIED' ? 'REJECTED' : status}
                                    className="p-1 rounded" >
                                    <AccordionTrigger
                                        type="button"
                                        className={cn(
                                            'flex flex-row-reverse justify-end items-center w-full !h-[20px] rounded-sm gap-x-2 hover:no-underline',
                                            statusColor(status).text
                                        )}>
                                        <div className="flex items-center justify-between space-x-1 w-full">
                                            <div className="flex items-center  w-full gap-2">
                                                <div className={cn('p-2 rounded', statusColor(status).bg)}></div>
                                                <div className="flex items-center gap-x-1">
                                                    <span className="text-base font-normal text-gray-400 uppercase text-[12px]">
                                                        {status === 'DENIED' ? 'REJECTED' : status}
                                                    </span>
                                                    <span className="text-gray-400 text-[12px]">({rows.length})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <ClockIcon className=' text-[12px] h-3 w-3' />
                                                <TotalTimeDisplay timesheetLog={rows} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col w-full gap-y-2 overflow-auto">
                                        {rows.map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    backgroundColor: statusColor(status).bgOpacity,
                                                    borderLeftColor: statusColor(status).border

                                                }}
                                                className={cn(
                                                    'border-l-4 rounded-l flex flex-col p-2 gap-2 items-start  space-x-4  h-[110px] !w-full',
                                                )}>
                                                <div className="flex  px-3 justify-between items-center w-full">
                                                    <div className="flex items-center gap-x-1">
                                                        <EmployeeAvatar
                                                            imageUrl={task.employee.user.imageUrl ?? ''}
                                                        />
                                                        <span className=" font-normal text-[#3D5A80] dark:text-[#7aa2d8]">{task.employee.fullName}</span>
                                                    </div>
                                                    <DisplayTimeForTimesheet
                                                        duration={task.timesheet.duration}

                                                    />
                                                </div>
                                                <TaskNameInfoDisplay
                                                    task={task.task}
                                                    className={cn(
                                                        'shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
                                                    )}
                                                    taskTitleClassName={cn(
                                                        'text-sm !text-ellipsis !overflow-hidden !truncate !text-[#293241] dark:!text-white '
                                                    )}
                                                    showSize={true}
                                                    dash
                                                    taskNumberClassName="text-sm"
                                                />
                                                <div className="flex items-center gap-x-2">
                                                    {task.project && <ProjectLogo imageUrl={task.project.imageUrl as string} />}
                                                    <span className="flex-1 font-medium">{task.project && task.project.name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    ) : (
                        <div className="text-gray-400 text-sm flex items-center justify-center min-h-[150px] sm:w-[250px] md:w-[300px] lg:w-[350px] max-w-full gap-2">
                            <CodeSquareIcon />
                            <span>No Data</span>
                        </div>
                    )}
                </>
            }}
        />
    );
};

const MonthlyCalendarDataView = (props: { data: GroupedTimesheet[], daysLabels?: string[] }) => (
    <BaseCalendarDataView {...props} CalendarComponent={MonthlyTimesheetCalendar} />
);

const WeeklyCalendarDataView = (props: { data: GroupedTimesheet[], daysLabels?: string[] }) => (
    <BaseCalendarDataView  {...props} CalendarComponent={WeeklyTimesheetCalendar} />
);
