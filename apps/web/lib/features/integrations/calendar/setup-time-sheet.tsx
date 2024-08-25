"use client"

import React from 'react'
import { DataTableTimeSheet } from './table-time-sheet'
import { HeadTimeSheet } from '@app/[locale]/calendar/component'
import { timesheetCalendar } from './helper-calendar'
import { useModal } from '@app/hooks'

interface ISetupTimeSheetProps {
    timesheet?: timesheetCalendar
}

export function SetupTimeSheet({ timesheet }: ISetupTimeSheetProps) {
    const {
        isOpen,
        openModal,
        closeModal
    } = useModal();
    return (
        <div className='flex flex-col overflow-hidden py-[32px]'>
            <div className='flex flex-col w-full'>
                <div className='border border-gray-100 dark:border-gray-700 w-full'></div>
                <HeadTimeSheet timesheet={timesheet}
                    closeModal={closeModal}
                    isOpen={isOpen}
                    openModal={openModal} />
            </div>
            <div className='flex h-[780px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark--theme-light p-4 shadow-lg shadow-gray-100  dark:shadow-gray-700'>
                <DataTableTimeSheet />
            </div>
        </div>
    )
}
