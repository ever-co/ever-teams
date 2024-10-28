import { DataTableTimeSheet } from 'lib/features/integrations/calendar'
import React from 'react'

export function TimesheetView() {
    return (
        <div className='grow h-full w-full bg-[#FFFFFF]'>
            <DataTableTimeSheet />
        </div>
    )
}
