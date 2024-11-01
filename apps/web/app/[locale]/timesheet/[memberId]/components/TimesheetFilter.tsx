import { FilterWithStatus } from './FilterWithStatus';
import { FrequencySelect, TimeSheetFilterPopover, TimesheetFilterDate } from '.';
import { Button } from 'lib/components';

export function TimesheetFilter() {
    return (
        <div className="grid grid-cols-3 w-full">
            <div className="col-span-1">
                <FilterWithStatus
                    activeStatus="Rejected"
                    onToggle={(label) => {
                        console.log(label)
                    }}
                />
            </div>
            <div className="col-span-1"></div>
            <div className="col-span-1">
                <div className='flex gap-2'>
                    <FrequencySelect />
                    <TimeSheetFilterPopover />
                    <TimesheetFilterDate />
                    <Button
                        onClick={() => null}
                        variant='outline'
                        className='bg-primary/5 dark:bg-primary-light h-10 w-[2.5rem] font-medium'>
                        Add Time
                    </Button>
                </div>
            </div>
        </div>

    )
}
