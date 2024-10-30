import { FilterWithStatus } from './FilterWithStatus';
import { FilterTaskActionMenu, FrequencySelect } from '.';
import { Button } from 'lib/components';
import { TimeSheetFilterPopover } from './time-sheet-filter-popover';
import { Cross2Icon } from '@radix-ui/react-icons';

export function TimesheetFilter() {
    return (
        <>

            <div className="flex flex-col md:flex-row w-full gap-4">
                <div className="flex-1">
                    <FilterWithStatus
                        activeStatus="All Tasks"
                        onToggle={(label) => {
                            // TODO: Implement filter toggle handler
                        }}
                    />
                </div>
                <div className="flex-1 flex justify-end">
                    <div className='flex gap-2'>
                        <FrequencySelect />
                        <div className='flex items-center border border-gray-100 rounded-md h-10 '>
                            <FilterTaskActionMenu />
                            <button
                                aria-label="Clear filters"
                                onClick={() => {
                                    // TODO: Implement clear filters logic
                                }}
                                className='border-l h-10 w-10 font-normal flex items-center justify-center text-gray-400 hover:bg-gray-50'>
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
