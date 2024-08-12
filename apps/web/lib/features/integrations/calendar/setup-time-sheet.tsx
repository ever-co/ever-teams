"use client"

import React from 'react'
import { DataTableTimeSheet } from './table-time-sheet'

export function SetupTimeSheet() {


    return (
        <div className='flex flex-col overflow-hidden p-[32px]'>
            <div className='flex h-[750px] border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-dark--theme-light p-4 shadow-lg shadow-gray-100  dark:shadow-gray-700'>
                <DataTableTimeSheet />
            </div>
        </div>
    )
}
