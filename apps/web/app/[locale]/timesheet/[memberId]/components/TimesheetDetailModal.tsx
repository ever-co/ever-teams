import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { Modal, statusColor } from '@/lib/components';
import React from 'react'
import { TimesheetCardDetail } from './TimesheetCard';
import { TranslationHooks, useTranslations } from 'next-intl';
import { TimesheetDetailMode } from '../page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { cn } from '@/lib/utils';
import { useTimesheet } from '@/app/hooks/features/useTimesheet';
import { Badge } from '@components/ui/badge';
import { TaskNameInfoDisplay, TotalTimeDisplay } from '@/lib/features';
import { EmployeeAvatar, ProjectLogo } from './CompactTimesheetComponent';

export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
    timesheet?: Record<TimesheetStatus, TimesheetLog[]>
    timesheetDetailMode?: TimesheetDetailMode
}

function TimesheetDetailModal({ closeModal, isOpen, timesheet, timesheetDetailMode }: IAddTaskModalProps) {
    const t = useTranslations()

    const titles = {
        'Pending': 'View Pending Details',
        'MemberWork': 'View Member Work Details',
    };
    const title = titles[timesheetDetailMode as 'Pending' | 'MemberWork'] || 'View Men Hours Details';
    const timesheetDetail = Object.values(timesheet ?? {}).flat();


    return (
        <Modal
            isOpen={isOpen}
            closeModal={closeModal}
            title={title}
            showCloseIcon
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded w-full md:w-40 md:min-w-[35rem]"
            titleClass="font-bold flex justify-start w-full text-xl">
            <div className=' py-4 w-full'>
                <div className="flex flex-col  w-full  gap-4  h-[60vh] max-h-[60vh]  overflow-y-auto ">
                    {
                        timesheetDetailMode === 'Pending' && (
                            timesheet?.PENDING.length === 0 ? (
                                <div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme flex flex-col items-center justify-center min-h-[280px]">
                                    <p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
                                </div>
                            ) : <TimesheetCardDetail data={timesheet} />
                        )
                        || timesheetDetailMode === 'MemberWork' && (
                            <MembersWorkedCard element={timesheetDetail} t={t} />
                        ) || timesheetDetailMode === 'MenHours' && (
                            <div>
                                <span>MenHours</span>
                            </div>
                        )
                    }
                </div>
            </div>

        </Modal>

    )
}

export default TimesheetDetailModal



/**
 * Returns an array of objects containing the employeeId and an array of TimesheetLog records.
 * The TimesheetLog records are grouped by the employeeId.
 * The array is sorted in descending order by employeeId.
 *
 * @param {TimesheetLog[]} timesheetDetail - an array of TimesheetLog records
 * @returns {Array<{ employeeId: string; element: TimesheetLog[] }>} - an array of objects containing the employeeId and an array of TimesheetLog records.
 */
const membersWorked = ({ timesheetDetail }: { timesheetDetail: TimesheetLog[] }) => {
    type GroupeMap = Record<string, TimesheetLog[]>;
    const MembersWorked = timesheetDetail.reduce<GroupeMap>((acc, cur) => {
        if (!cur.employeeId) {
            return acc;
        }
        const employeeId = cur.employeeId;
        if (!acc[employeeId]) {
            acc[employeeId] = [];
        }
        acc[employeeId].push(cur);
        return acc;
    }, {});
    return Object.entries(MembersWorked)
        .map(([employeeId, element]) => ({ employeeId, element }))
        .sort((a, b) => b.employeeId.localeCompare(a.employeeId));
}


const MembersWorkedCard = ({ element, t }: { element: TimesheetLog[], t: TranslationHooks }) => {
    const memberWorkItems = membersWorked({ timesheetDetail: element });
    const { getStatusTimesheet } = useTimesheet({});
    return (
        <div>
            {memberWorkItems.map((timesheet, index) => {
                return (
                    <Accordion key={index} type="single" collapsible>
                        <AccordionItem
                            value={timesheet.employeeId}
                            className='p-1 rounded'
                        >
                            <AccordionTrigger
                                type="button"
                                className={cn(
                                    'flex flex-row-reverse justify-end items-center w-full h-[50px] rounded-sm gap-x-2 hover:no-underline px-2',

                                )}
                            >
                                <div className='flex justify-between items-center w-full'>
                                    <div className='flex items-center gap-2'>
                                        <EmployeeAvatar className='w-10 h-10 rounded-full shadow-md border' imageUrl={timesheet.element[0].employee.user?.imageUrl!} />
                                        <span className='font-bold'>{timesheet.element[0].employee.fullName}</span>
                                    </div>
                                    <Badge
                                        variant={'outline'}
                                        className="flex items-center  gap-x-2 w-[108px] h-[30px] rounded-[8px] bg-[#E4E4E7] dark:bg-gray-800  py-[6px] px-[8px] border-[1px] border-[#E4E4E7] dark:border-gray-700"
                                    >
                                        <span className="text-[#5f5f61] text-[14px] font-[700px]">{t('timer.TOTAL_HOURS').split(' ')[0]}:</span>
                                        <TotalTimeDisplay timesheetLog={timesheet.element} className='text-[#293241] text-[14px]' />
                                    </Badge>
                                </div>
                            </AccordionTrigger>
                            <AccordionContent className='w-full'>
                                <Accordion key={index} type="single" collapsible>
                                    {Object.entries(getStatusTimesheet(timesheet.element)).map(([status, rows]) => {
                                        return rows.length > 0 && status && (<AccordionItem
                                            key={status}
                                            value={status === 'DENIED' ? 'REJECTED' : status}
                                            className='p-1 rounded'>
                                            <AccordionTrigger
                                                style={{ backgroundColor: statusColor(status).bgOpacity }}
                                                type="button"
                                                className={cn(
                                                    'flex flex-row-reverse justify-end items-center w-full h-[50px] rounded-sm gap-x-2 hover:no-underline px-2',
                                                    statusColor(status).text
                                                )}>
                                                <div className="flex items-center justify-between w-full space-x-1">
                                                    <div className="flex items-center space-x-1">
                                                        <div className={cn('p-2 rounded', statusColor(status).bg)}></div>
                                                        <div className="flex items-center gap-x-1">
                                                            <span className="text-base font-normal text-gray-400 uppercase">
                                                                {status === 'DENIED' ? 'REJECTED' : status}
                                                            </span>
                                                            <span className="text-gray-400 text-[14px]">({rows.length})</span>
                                                        </div>
                                                        <Badge
                                                            variant={'outline'}
                                                            className="flex items-center  gap-x-2 w-[108px] h-[30px] rounded-[8px] bg-[#E4E4E7] dark:bg-gray-800  py-[6px] px-[8px] border-[1px] border-[#E4E4E7] dark:border-gray-700"
                                                        >
                                                            <span className="text-[#5f5f61] text-[14px] font-[700px]">{t('timer.TOTAL_HOURS').split(' ')[0]}:</span>
                                                            <TotalTimeDisplay timesheetLog={rows} className='text-[#293241] text-[14px]' />
                                                        </Badge>
                                                    </div>

                                                </div>
                                            </AccordionTrigger>
                                            <AccordionContent className='w-full'>
                                                {rows.map((items) => (
                                                    <div
                                                        key={items.id}
                                                        style={{
                                                            backgroundColor: statusColor(status).bgOpacity,
                                                            borderBottomColor: statusColor(status).bg
                                                        }}
                                                        className={cn(
                                                            'flex items-center border-b border-b-gray-200 dark:border-b-gray-600 space-x-4 p-1 h-[60px]'
                                                        )} >
                                                        <div className="flex-[2]">
                                                            <TaskNameInfoDisplay
                                                                task={items.task}
                                                                className={cn(
                                                                    'rounded-sm h-auto !px-[0.3312rem] py-[0.2875rem] shadow-[0px_0px_15px_0px_#e2e8f0] dark:shadow-transparent'
                                                                )}
                                                                taskTitleClassName={cn(
                                                                    'text-sm text-ellipsis overflow-hidden '
                                                                )}
                                                                showSize={false}
                                                                dash
                                                                taskNumberClassName="text-sm"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 flex-1">
                                                            {items.project?.imageUrl && <ProjectLogo className='w-[28px] h-[28px] drop-shadow-[25%] rounded-[8px]' imageUrl={items.project.imageUrl} />}
                                                            <span className="font-medium">{items.project?.name}</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </AccordionContent>
                                        </AccordionItem>
                                        )
                                    })}
                                </Accordion>
                            </AccordionContent>
                        </AccordionItem>
                    </Accordion>
                )
            })
            }
        </div>
    )
}
