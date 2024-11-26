import { GroupedTimesheet, useTimesheet } from "@/app/hooks/features/useTimesheet";
import { clsxm } from "@/app/utils";
import { statusColor } from "@/lib/components";
import { TaskNameInfoDisplay, TotalDurationByDate, TotalTimeDisplay } from "@/lib/features";
import { AccordionContent, AccordionItem, AccordionTrigger } from "@components/ui/accordion";
import { Badge } from "@components/ui/badge";
import { Accordion } from "@radix-ui/react-accordion";
import { TranslationHooks, useTranslations } from "next-intl";
import React from "react";
import { EmployeeAvatar } from "./CompactTimesheetComponent";
import { formatDate } from "@/app/helpers";

export function CalendarView({ data }: { data?: GroupedTimesheet[] }) {
    const t = useTranslations();
    return (
        <div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme">
            {data ? (
                data.length > 0 ? (
                    <CalendarDataView data={data} t={t} />
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
    const { deleteTaskTimesheet, loadingDeleteTimesheet, getStatusTimesheet } = useTimesheet({});

    return (
        <div className="w-full dark:bg-dark--theme">
            <div className="rounded-md">
                {data?.map((plan, index) => {
                    return <div key={index}>
                        <div
                            className={clsxm(
                                'h-[48px] flex justify-between items-center w-full',
                                'bg-[#ffffffcc] dark:bg-dark--theme rounded-md border-1',
                                'border-gray-400 px-5 text-[#71717A] font-medium'
                            )}>
                            <div className='flex gap-x-3'>
                                <span>{formatDate(plan.date)}</span>
                            </div>
                            <TotalDurationByDate
                                timesheetLog={plan.tasks}
                                createdAt={formatDate(plan.date)}
                            />
                        </div>
                        <Accordion type="single" collapsible>
                            {Object.entries(getStatusTimesheet(plan.tasks)).map(([status, rows]) => (
                                <AccordionItem
                                    key={status}
                                    value={status === 'DENIED' ? 'REJECTED' : status}
                                    className="p-1 rounded"
                                >
                                    <AccordionTrigger
                                        type="button"
                                        className={clsxm(
                                            'flex flex-row-reverse justify-end items-center w-full h-[30px] rounded-sm gap-x-2 hover:no-underline px-2',
                                            statusColor(status).text
                                        )}
                                    >
                                        <div className="flex items-center space-x-1 w-full">
                                            <div className={clsxm('p-2 rounded', statusColor(status).bg)}></div>
                                            <div className="flex items-center gap-x-1">
                                                <span className="text-base font-normal text-gray-400 uppercase">
                                                    {status === 'DENIED' ? 'REJECTED' : status}
                                                </span>
                                                <span className="text-gray-400 text-[14px]">({rows?.length})</span>
                                            </div>
                                            <Badge
                                                variant={'outline'}
                                                className="flex items-center gap-x-2 h-[25px] rounded-md bg-[#E4E4E7] dark:bg-gray-800"
                                            >
                                                <span className="text-[#5f5f61]">{t('timer.TOTAL_HOURS')}</span>
                                                <TotalTimeDisplay timesheetLog={rows} />
                                            </Badge>
                                        </div>
                                    </AccordionTrigger>
                                    <AccordionContent className="flex flex-col w-full">
                                        {rows?.map((task) => (
                                            <div
                                                key={task.id}
                                                style={{
                                                    backgroundColor: statusColor(status).bgOpacity,
                                                    borderLeftColor: statusColor(status).border

                                                }}
                                                className={clsxm(
                                                    'border-l-4 rounded-l flex flex-col p-2 gap-2 items-start border-b border-b-gray-200 dark:border-b-gray-600 space-x-4  h-[100px]',
                                                    // `border-l-${statusColor(status).border}`
                                                )}
                                            >
                                                <div className="flex items-center px-3">
                                                    <EmployeeAvatar
                                                        imageUrl={task.employee.user.imageUrl!}
                                                    />
                                                    <span className=" font-normal text-[#3D5A80]">{task.employee.fullName}</span>
                                                </div>
                                                <TaskNameInfoDisplay
                                                    task={task.task}
                                                    className={clsxm(
                                                        'shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
                                                    )}
                                                    taskTitleClassName={clsxm(
                                                        'text-sm text-ellipsis overflow-hidden !text-[#293241] '
                                                    )}
                                                    showSize={true}
                                                    dash
                                                    taskNumberClassName="text-sm"
                                                />
                                                <span className="flex-1">{task.project && task.project.name}</span>

                                                {/* <DisplayTimeForTimesheet
                                                    duration={task.timesheet.duration}
                                                /> */}

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
