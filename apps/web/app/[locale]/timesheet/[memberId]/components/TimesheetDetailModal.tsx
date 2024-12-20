import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { Modal } from '@/lib/components';
import React from 'react'
import { TimesheetCardDetail } from './TimesheetCard';
import { useTranslations } from 'next-intl';
import { TimesheetDetailMode } from '../page';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { cn } from '@/lib/utils';
import { useTimesheet } from '@/app/hooks/features/useTimesheet';

export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
    timesheet?: Record<TimesheetStatus, TimesheetLog[]>
    timesheetDetailMode?: TimesheetDetailMode
}

function TimesheetDetailModal({ closeModal, isOpen, timesheet, timesheetDetailMode }: IAddTaskModalProps) {
    const t = useTranslations()
    const { getStatusTimesheet } = useTimesheet({});
    const titles = {
        'Pending': 'View Pending Details',
        'MemberWork': 'View Member Work Details',
    };
    const title = titles[timesheetDetailMode as 'Pending' | 'MemberWork'] || 'View Men Hours Details';
    const timesheetDetail = Object.values(timesheet ?? {}).flat();
    const memberWorkItems = membersWorked({ timesheetDetail });


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
                                                    <div className='flex items-center gap-2'>
                                                        <img className='w-10 h-10 rounded-full shadow-md border' src={timesheet.element[0].employee.user?.imageUrl!} alt='' />
                                                        <span className='font-bold'>{timesheet.element[0].employee.fullName}</span>
                                                    </div>
                                                </AccordionTrigger>
                                                <AccordionContent className='w-full'>
                                                    {timesheet.element.map((items) => (
                                                        <Accordion key={index} type="single" collapsible>
                                                            {Object.entries(getStatusTimesheet(timesheet.element)).map(([status, rows]) => {
                                                                return (
                                                                    <AccordionItem
                                                                        key={status}
                                                                        value={status === 'DENIED' ? 'REJECTED' : status}
                                                                        className='p-1 rounded'>
                                                                        <AccordionTrigger
                                                                            type="button"
                                                                            className={cn(
                                                                                'flex flex-row-reverse justify-end items-center w-full h-[50px] rounded-sm gap-x-2 hover:no-underline px-2',

                                                                            )}>
                                                                            <div className='flex items-center gap-2'>
                                                                                <span>{items.timesheet.status}</span>
                                                                            </div>
                                                                        </AccordionTrigger>
                                                                        <AccordionContent className='w-full'>
                                                                            {rows.map((items) => (
                                                                                <div key={items.employee.id}>{items.employee.fullName}</div>

                                                                            ))}
                                                                        </AccordionContent>
                                                                    </AccordionItem>
                                                                )
                                                            })}

                                                        </Accordion>
                                                    ))}
                                                </AccordionContent>
                                            </AccordionItem>
                                        </Accordion>
                                    )
                                })
                                }
                            </div>
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
