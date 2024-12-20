import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { Modal } from '@/lib/components';
import React from 'react'
import { TimesheetCardDetail } from './TimesheetCard';
import { useTranslations } from 'next-intl';
import { TimesheetDetailMode } from '../page';

export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
    timesheet?: Record<TimesheetStatus, TimesheetLog[]>
    timesheetDetailMode?: TimesheetDetailMode
}
type GroupedTimesheet = {
    [key: string]: TimesheetLog[]; // Les clés sont des chaînes, et les valeurs sont des tableaux de TimesheetLog
};

function TimesheetDetailModal({ closeModal, isOpen, timesheet, timesheetDetailMode }: IAddTaskModalProps) {
    const t = useTranslations()
    const titles = {
        'Pending': 'View Pending Details',
        'MemberWork': 'View Member Work Details',
    };
    const title = titles[timesheetDetailMode as 'Pending' | 'MemberWork'] || 'View Men Hours Details';
    const timesheetDetail = Object.values(timesheet ?? {}).flat();

    const MembersWorked = timesheetDetail.reduce<GroupedTimesheet>((acc, cur) => {
        if (!cur.employeeId) {
            return acc;
        }
        if (!acc[cur.employeeId]) {
            acc[cur.employeeId] = [];
        }
        acc[cur.employeeId].push(cur);
        return acc;
    }, {});

    console.log('timesheetDetail', MembersWorked);

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
                    }
                </div>
            </div>

        </Modal>

    )
}

export default TimesheetDetailModal
