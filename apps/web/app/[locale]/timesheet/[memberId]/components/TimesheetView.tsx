import { IDailyPlan } from '@/app/interfaces'
import { DataTableTimeSheet } from 'lib/features/integrations/calendar'

export function TimesheetView({ data }: { data?: IDailyPlan[] }) {
    return (
        <div className='grow h-full w-full bg-[#FFFFFF]'>
            <DataTableTimeSheet data={data} />
        </div>
    )
}
