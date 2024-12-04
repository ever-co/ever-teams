import { TimesheetLog, TimesheetStatus } from '@/app/interfaces';
import { Modal } from '@/lib/components';
import React from 'react'
import { TimesheetCardDetail } from './TimesheetCard';
import { useTranslations } from 'next-intl';

export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
    timesheet?: Record<TimesheetStatus, TimesheetLog[]>
}

function TimesheetDetailModal({ closeModal, isOpen, timesheet }: IAddTaskModalProps) {
    const t = useTranslations()

    return (
        <Modal
            isOpen={isOpen}
            closeModal={closeModal}
            title={'View Pending details'}
            showCloseIcon
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded w-full md:w-40 md:min-w-[35rem]"
            titleClass="font-bold flex justify-start w-full text-2xl">
            <div className=' py-4 w-full'>
                <div className="flex flex-col  w-full  gap-4  h-[60vh] max-h-[60vh]  overflow-y-auto ">
                    {
                        timesheet?.PENDING.length === 0 ? (
                            <div className="grow h-full w-full bg-[#FFFFFF] dark:bg-dark--theme flex flex-col items-center justify-center min-h-[280px]">
                                <p>{t('pages.timesheet.NO_ENTRIES_FOUND')}</p>
                            </div>
                        ) : <TimesheetCardDetail data={timesheet} />
                    }
                </div>
            </div>

        </Modal>

    )
}

export default TimesheetDetailModal
