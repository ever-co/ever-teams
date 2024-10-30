import { FilterWithStatus } from './FilterWithStatus';
import { FrequencySelect, TimesheetFilterDate } from '.';
import { Button } from 'lib/components';
import { SettingFilterIcon } from 'assets/svg';

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
                    <button
                        onClick={() => null}
                        className='flex items-center justify-center h-10 rounded-lg bg-white dark:bg-dark--theme-light border dark:border-gray-700 hover:bg-white p-3 gap-2' >
                        <SettingFilterIcon className="text-gray-700 dark:text-white w-3.5" strokeWidth="1.8" />
                        <span className="text-gray-700 dark:text-white">Filter</span>
                    </button>
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
