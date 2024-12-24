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
import { IUser } from "@/app/interfaces";
import TimesheetSkeleton from "@components/shared/skeleton/TimesheetSkeleton";
interface BaseCalendarDataViewProps {
    t: TranslationHooks
    data: GroupedTimesheet[];
    daysLabels?: string[];
    CalendarComponent: typeof MonthlyTimesheetCalendar | typeof WeeklyTimesheetCalendar;
    user?: IUser | undefined
}

export function CalendarView({ data, loading, user }: { data?: GroupedTimesheet[], loading: boolean, user?: IUser | undefined }) {
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

    if (loading || !data) {
        return (
            <div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
                {Array.from({ length: 10 }).map((_, index) => (
                    <TimesheetSkeleton key={index} />
                ))}
            </div>
        );
    }

    if (data.length === 0) {
        return (
            <div className="grow w-full bg-[#FFFFFF] dark:bg-dark--theme flex flex-col items-center justify-center h-full min-h-[280px]">
                <p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
            </div>
        );
    }

    return (
        <div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
            {(() => {
                switch (timesheetGroupByDays) {
                    case 'Monthly':
                        return <MonthlyCalendarDataView data={data} daysLabels={defaultDaysLabels} t={t} />;
                    case 'Weekly':
                        return <WeeklyCalendarDataView data={data} daysLabels={defaultDaysLabels} t={t} />;
                    default:
                        return <CalendarDataView data={data} t={t} />;
                }
            })()}
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
                                                    <span className="text-base font-medium text-[#71717A] uppercase !text-[14px]">
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
                                    <AccordionContent className="flex flex-col w-full gap-y-2 ">
                                        {rows.map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    backgroundColor: statusColor(status).bgOpacity,
                                                    borderLeftColor: statusColor(status).border

                                                }}
                                                className={cn(
                                                    'border-l-4 rounded-l flex flex-col p-2 gap-2 items-start  space-x-4 ',
                                                )}>
                                                <div className="flex  px-3 justify-between items-center w-full">
                                                    <div className="flex items-center gap-x-1">
                                                        <EmployeeAvatar
                                                            imageUrl={task.employee.user.imageUrl ?? ''}
                                                            className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-full"
                                                        />
                                                        <span className=" font-normal text-[#3D5A80] dark:text-[#7aa2d8]">{task.employee.fullName}</span>
                                                    </div>
                                                    <DisplayTimeForTimesheet
                                                        timesheetLog={task}

                                                    />
                                                </div>
                                                <TaskNameInfoDisplay
                                                    task={task.task}
                                                    className={cn(
                                                        'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
                                                    )}
                                                    taskTitleClassName={cn(
                                                        'text-sm text-ellipsis overflow-hidden !text-[#293241] dark:!text-white '
                                                    )}
                                                    showSize={true}
                                                    dash
                                                    taskNumberClassName="text-sm"
                                                />
                                                <div className="flex flex-row items-center  py-0 gap-2  flex-none order-2 self-stretch flex-grow-0">
                                                    {task.project?.imageUrl && (
                                                        <ProjectLogo
                                                            className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-[8px]"
                                                            imageUrl={task.project.imageUrl}
                                                        />
                                                    )}
                                                    <span className="!text-ellipsis !overflow-hidden !truncate !text-[#3D5A80] dark:!text-[#7aa2d8] flex-1">
                                                        {task.project?.name ?? 'No Project'}
                                                    </span>
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

const BaseCalendarDataView = ({ data, daysLabels, t, CalendarComponent }: BaseCalendarDataViewProps) => {
    const { getStatusTimesheet } = useTimesheet({});
    return (
        <CalendarComponent
            t={t}
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
                                            'flex flex-row-reverse justify-end items-center w-full !h-[16px] rounded-sm gap-x-2 hover:no-underline',
                                            statusColor(status).text
                                        )}>
                                        <div className="flex items-center justify-between space-x-1 w-full">
                                            <div className="flex items-center  w-full gap-2">
                                                <div className={cn('p-2 rounded', statusColor(status).bg)}></div>
                                                <div className="flex items-center gap-x-1">
                                                    <span className="text-base font-normal text-gray-400 uppercase !text-[13px]">
                                                        {status === 'DENIED' ? 'REJECTED' : status}
                                                    </span>
                                                    <span className="text-gray-400 text-[13px]">({rows.length})</span>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2">
                                                <ClockIcon className=' text-[12px] h-3 w-3' />
                                                <TotalTimeDisplay timesheetLog={rows} />
                                            </div>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col gap-y-2 overflow-auto items-start p-0  flex-none order-1 flex-grow-0">
                                        {rows.map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    backgroundColor: statusColor(status).bgOpacity,
                                                    borderLeftColor: statusColor(status).border

                                                }}
                                                className={cn(
                                                    'border-l-4 rounded-l space-x-4  box-border flex flex-col items-start py-2.5 gap-2 w-[258px] rounded-tr-md rounded-br-md flex-none order-1 self-stretch flex-grow',
                                                )}>
                                                <div className="flex  pl-3 justify-between items-center w-full">
                                                    <div className="flex items-center gap-x-1">
                                                        <EmployeeAvatar
                                                            className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-full"
                                                            imageUrl={task.employee.user.imageUrl ?? ''}
                                                        />
                                                        <span className="font-normal text-[#3D5A80] dark:text-[#7aa2d8]">{task.employee.fullName}</span>
                                                    </div>
                                                    <DisplayTimeForTimesheet
                                                        timesheetLog={task}

                                                    />
                                                </div>
                                                <TaskNameInfoDisplay
                                                    task={task.task}
                                                    className={cn(
                                                        'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem]  shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent '
                                                    )}
                                                    taskTitleClassName={cn(
                                                        'text-sm  !text-ellipsis overflow-hidden !truncate !text-[#293241] dark:!text-white'
                                                    )}
                                                    showSize={false}
                                                    dash
                                                    taskNumberClassName="text-sm"
                                                />
                                                <div className="flex flex-row items-center  py-0 gap-2  flex-none order-2 self-stretch flex-grow-0">
                                                    {task.project?.imageUrl && (
                                                        <ProjectLogo
                                                            className="w-[28px] h-[28px] drop-shadow-[0_4px_4px_rgba(0,0,0,0.25)] rounded-[8px]"
                                                            imageUrl={task.project.imageUrl}
                                                        />
                                                    )}
                                                    <span className="!text-ellipsis !overflow-hidden !truncate !text-[#3D5A80] dark:!text-[#7aa2d8] flex-1">
                                                        {task.project?.name ?? 'No Project'}
                                                    </span>
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

const MonthlyCalendarDataView = (props: { data: GroupedTimesheet[], t: TranslationHooks, daysLabels?: string[] }) => (
    <BaseCalendarDataView {...props} CalendarComponent={MonthlyTimesheetCalendar} />
);

const WeeklyCalendarDataView = (props: { data: GroupedTimesheet[], t: TranslationHooks, daysLabels?: string[] }) => (
    <BaseCalendarDataView  {...props} CalendarComponent={WeeklyTimesheetCalendar} />
);
