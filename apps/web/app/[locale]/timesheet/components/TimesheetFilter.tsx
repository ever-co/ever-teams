import { FilterWithStatus } from './FilterWithStatus';
import { FilterTaskActionMenu, FrequencySelect } from '.';
import { Button } from 'lib/components';
import { TimeSheetFilterPopover } from './time-sheet-filter-popover';
import { Cross2Icon } from '@radix-ui/react-icons';

export function TimesheetFilter() {
    return (
        <>

            <div className="grid grid-cols-3 w-full">
                <div className="col-span-1">
                    <FilterWithStatus
                        activeStatus="All Tasks"
                        onToggle={(label) => {
                            console.log(label)
                        }}
                    />
                </div>
                <div className="col-span-1"></div>
                <div className="col-span-1">
                    <div className='flex gap-2'>
                        <FrequencySelect />
                        <div className='flex items-center border border-gray-100 rounded-md h-10 '>
                            <FilterTaskActionMenu />
                            <button className='border-l h-10 w-10 font-normal flex items-center justify-center text-gray-400'>
                                <Cross2Icon />
                            </button>
                        </div>
                        <TimeSheetFilterPopover />
                        <Button
                            onClick={() => null}
                            variant='outline'
                            className='bg-primary/5 dark:bg-primary-light h-10 w-[2.5rem] font-medium'>
                            Add Time
                        </Button>
                    </div>
                </div>
            </div>
        </>

    )
}
