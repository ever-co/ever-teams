import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select'
import React from 'react'
import { DateRangePickerTimeActivity, GroupBySelectTimeActivity, TimeActivityFilterPopover } from '.'
import ViewSelect from './ViewSelect'

function TimeActivityHeader() {
  return (
    <div className="flex justify-between items-center w-full">
    <h1 className="text-2xl font-semibold">Time and Activity</h1>
    <div className="flex gap-4 items-center">
        <GroupBySelectTimeActivity/>
        <TimeActivityFilterPopover/>
        <ViewSelect/>
        <DateRangePickerTimeActivity/>
        <div className="flex gap-2 items-center">
            <Select defaultValue="export">
                <SelectTrigger className="w-[100px] border border-[#E4E4E7] dark:border-[#2D2D2D] dark:bg-dark--theme-light">
                    <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent className="dark:bg-dark--theme-light">
                    <SelectItem value="export">Export</SelectItem>
                    <SelectItem value="pdf">PDF</SelectItem>
                    <SelectItem value="xlsx">XLSX</SelectItem>
                </SelectContent>
            </Select>
        </div>

    </div>
</div>
  )
}

export default TimeActivityHeader
