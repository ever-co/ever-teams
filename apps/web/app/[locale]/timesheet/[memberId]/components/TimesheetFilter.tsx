import { FilterWithStatus } from './FilterWithStatus';
import { FrequencySelect, TimeSheetFilterPopover, TimesheetFilterDate, TimesheetFilterDateProps } from '.';
import { Button } from 'lib/components';
import { AddManualTimeModal } from '@/lib/features/manual-time/add-manual-time-modal';
interface ITimesheetFilter {
    isOpen: boolean,
    openModal: () => void,
    closeModal: () => void
    initDate?: TimesheetFilterDateProps
}
export function TimesheetFilter({ closeModal, isOpen, openModal, initDate }: ITimesheetFilter,) {
    return (
        <>
            {
                isOpen && <AddManualTimeModal
                    closeModal={closeModal}
                    isOpen={isOpen}
                    params="AddManuelTime"
                    timeSheetStatus="ManagerTimesheet"
                />}
            <div className="flex w-full justify-between items-center">
                <div>
                    <FilterWithStatus
                        activeStatus="Rejected"
                        onToggle={(label) => {
                            // If logging is needed, use proper logging service
                        }}
                    />
                </div>

                <div className="flex gap-2">
                    <FrequencySelect />
                    <TimesheetFilterDate {...initDate} />
                    <TimeSheetFilterPopover />
                    <Button
                        onClick={openModal}
                        variant="outline"
                        className="bg-primary/5 dark:bg-primary-light dark:border-transparent  !h-[2.2rem] font-medium">
                        Add Time
                    </Button>
                </div>
            </div>

        </>
    )
}
