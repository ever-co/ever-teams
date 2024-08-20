"use client"

import React from 'react'
import { DataTableTimeSheet } from './table-time-sheet'
import { HeadTimeSheet } from '@app/[locale]/calendar/component'
import { timesheetCalendar } from './helper-calendar'

interface ISetupTimeSheetProps {
    setCalendarTimeSheet?: React.Dispatch<React.SetStateAction<timesheetCalendar>>
    timesheet?: timesheetCalendar
    openModal?: () => void
}

export function SetupTimeSheet({ setCalendarTimeSheet, timesheet, openModal }: ISetupTimeSheetProps) {

    return (
        <div className='flex flex-col overflow-hidden py-[32px]'>
            <div className='flex flex-col w-full'>
                <div className='border border-gray-100 dark:border-gray-700 w-full'></div>
                <HeadTimeSheet timesheet={timesheet} />
            </div>
            <div className='flex h-[750px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark--theme-light p-4 shadow-lg shadow-gray-100  dark:shadow-gray-700'>
                <DataTableTimeSheet />
            </div>
        </div>
    )
}
