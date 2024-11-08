import { FilterWithStatus } from './FilterWithStatus';
import { FrequencySelect, TimeSheetFilterPopover, TimesheetFilterDate } from '.';
import { Button } from 'lib/components';
import { AddManualTimeModal } from '@/lib/features/manual-time/add-manual-time-modal';
import { TranslationHooks } from 'next-intl';
interface ITimesheetFilter {
    isOpen: boolean,
    openModal: () => void,
    closeModal: () => void,
    t: TranslationHooks
}
export function TimesheetFilter({ closeModal, isOpen, openModal, t }: ITimesheetFilter) {
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
                    <TimesheetFilterDate t={t} />
                    <TimeSheetFilterPopover />
                    <Button
                        onClick={openModal}
                        variant="outline"
                        className="bg-primary/5 dark:bg-primary-light dark:border-transparent  !h-[2.2rem] font-medium">
                        {t('common.ADD_TIME')}
                    </Button>
                </div>
            </div>

        </>
    )
}
