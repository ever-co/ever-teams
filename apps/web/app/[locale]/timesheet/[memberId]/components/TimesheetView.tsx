import { IDailyPlan } from '@/app/interfaces'
import { DataTableTimeSheet } from 'lib/features/integrations/calendar'

export function TimesheetView({ data }: { data?: IDailyPlan[] }) {
    return (
        <div className='grow h-full w-full bg-[#FFFFFF]'>
            {!data ? (
                <div className="flex items-center justify-center h-full">
                    <p>Loading timesheet data...</p>
                </div>
            ) : data.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                    <p>No timesheet entries found</p>
                </div>
            ) : (
                <DataTableTimeSheet data={data} />
            )}
        </div>
    )
}
