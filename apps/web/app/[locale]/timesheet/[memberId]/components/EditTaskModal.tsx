import { Button, Modal, statusColor } from "@/lib/components";
import { IoMdArrowDropdown } from "react-icons/io";
import { FaRegClock } from "react-icons/fa";
import { DatePickerFilter } from "./TimesheetFilterDate";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { clsxm } from "@/app/utils";
import { Item, ManageOrMemberComponent, getNestedValue } from "@/lib/features/manual-time/manage-member-component";
import { useTeamTasks } from "@/app/hooks";
import { CustomSelect } from "@/lib/features";
import { statusTable } from "./TimesheetAction";

export interface IEditTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;

}
export function EditTaskModal({ isOpen, closeModal }: IEditTaskModalProps) {
    const { activeTeam } = useTeamTasks();
    const t = useTranslations();
    const [dateRange, setDateRange] = useState<{ from: Date | null }>({
        from: new Date(),
    });
    const [endTime, setEndTime] = useState<string>('');
    const [startTime, setStartTime] = useState<string>('');
    const [isBillable, setIsBillable] = useState<boolean>(false);
    const [reason, setReason] = useState('');
    const memberItemsLists = {
        Project: activeTeam?.projects as [],
    };
    const handleSelectedValuesChange = (values: { [key: string]: Item | null }) => {
        console.log(values);
    };
    const selectedValues = {
        Teams: null,
    };

    const handleChange = (field: string, selectedItem: Item | null) => {
        console.log(`Field: ${field}, Selected Item:`, selectedItem);
    };

    const fields = [
        {
            label: 'Project',
            placeholder: 'Select a project',
            isRequired: true,
            valueKey: 'id',
            displayKey: 'name',
            element: 'Project'
        },
    ];

    const handleFromChange = (fromDate: Date | null) => {
        setDateRange((prev) => ({ ...prev, from: fromDate }));
    };
    return (
        <Modal
            closeModal={closeModal}
            isOpen={isOpen}
            showCloseIcon
            title={'Edit Task'}
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[30rem] justify-start h-[auto]"
            titleClass="font-bold">
            <div className="flex flex-col w-full">
                <div className="flex flex-col border-b border-b-slate-100 dark:border-b-gray-700">
                    <span> #321 Spike for creating calendar views on mobile</span>
                    <div className="flex items-center gap-x-1 ">
                        <span className="text-gray-400">for</span>
                        <span className="text-primary dark:text-primary-light">Savannah Nguyen </span>
                        <IoMdArrowDropdown className="cursor-pointer" />
                    </div>
                </div>
                <div className="flex items-start flex-col justify-center gap-4">
                    <div>
                        <span>Task Time</span>
                        <div className="flex items-center gap-x-2 ">
                            <FaRegClock className="text-[#30B366]" />
                            <span>08:10h</span>
                        </div>
                    </div>
                    <div className="flex items-center w-full">
                        <div className=" w-[48%] mr-[4%]">
                            <label className="block text-gray-500 mb-1">
                                {t('manualTime.START_TIME')}
                                <span className="text-[#de5505e1] ml-1">*</span>
                            </label>
                            <input
                                type="time"
                                value={startTime}
                                onChange={(e) => setStartTime(e.target.value)}
                                className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
                                required
                            />
                        </div>

                        <div className=" w-[48%]">
                            <label className="block text-gray-500 mb-1">
                                {t('manualTime.END_TIME')}
                                <span className="text-[#de5505e1] ml-1">*</span>
                            </label>

                            <input
                                type="time"
                                value={endTime}
                                onChange={(e) => setEndTime(e.target.value)}
                                className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
                                required
                            />
                        </div>

                    </div>
                    <div>
                        <span className="block text-gray-500 mr-2">Date</span>
                        <DatePickerFilter
                            date={dateRange.from}
                            setDate={handleFromChange}
                            label="Oct 01 2024"
                        />
                    </div>
                    <div className="w-full flex flex-col">
                        <ManageOrMemberComponent
                            fields={fields}
                            itemsLists={memberItemsLists}
                            selectedValues={selectedValues}
                            onSelectedValuesChange={handleSelectedValuesChange}
                            handleChange={handleChange}
                            itemToString={(item, displayKey) => getNestedValue(item, displayKey) || ''}
                            itemToValue={(item, valueKey) => getNestedValue(item, valueKey) || ''}
                        />
                    </div>
                    <div className=" flex flex-col items-center">
                        <label className="text-gray-500 mr-6 ">Billable</label>
                        <div className="flex items-center gap-3">
                            <div className="flex items-center gap-x-2">
                                <div
                                    className={clsxm(`w-6 h-6 flex items-center bg-[#6c57f4b7] rounded-full p-1 cursor-pointer`, 'bg-white')}
                                    onClick={() => setIsBillable && setIsBillable(!isBillable)}
                                    style={
                                        isBillable
                                            ? { background: 'linear-gradient(to right, #9d91efb7, #8a7bedb7)' }
                                            : { background: '#6c57f4b7' }
                                    } >
                                    <div
                                        className={(`bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform translate-x-0`)}
                                    />
                                </div>
                                <span>{t('pages.timesheet.BILLABLE.YES')}</span>
                            </div>
                            <div className="flex items-center gap-x-2">
                                <div
                                    className={(`w-6 h-6 flex items-center bg-[#6c57f4b7] rounded-full p-1 cursor-pointer`)}
                                    onClick={() => setIsBillable && setIsBillable(!isBillable)}
                                    style={
                                        isBillable
                                            ? { background: 'linear-gradient(to right, #9d91efb7, #8a7bedb7)' }
                                            : { background: '#6c57f4b7' }
                                    } >
                                    <div
                                        className={(`bg-[#3826A6] w-4 h-4 rounded-full shadow-md transform transition-transform translate-x-0`)}
                                    />
                                </div>
                                <span>{t('pages.timesheet.BILLABLE.NO')}</span>
                            </div>

                        </div>
                    </div>
                    <div className="w-full flex flex-col">
                        <span>Notes</span>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Insert notes here..."
                            className={clsxm(
                                "bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent",
                                "placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full",
                                "border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40",
                                reason.length < 0! && "border-red-500"
                            )}
                            maxLength={120}
                            minLength={0}
                            aria-label="Insert notes here"
                            required
                        />
                        <div className="text-sm text-gray-500 text-right">
                            {reason.length}/{120}
                        </div>
                    </div>
                    <div className="border-t border-t-gray-200 dark:border-t-gray-700 w-full"></div>
                    <div className="flex items-center justify-between gap-2 ">
                        <div className="flex flex-col items-start justify-center">
                            <CustomSelect
                                options={statusTable?.flatMap((status) => status.label)}
                                renderOption={(option) => (
                                    <div className="flex items-center gap-x-2">
                                        <div className={clsxm("p-2 rounded-full", statusColor(option).bg)}></div>
                                        <span className={clsxm("ml-1", statusColor(option).text,)}>{option}</span>
                                    </div>
                                )}
                            />
                        </div>
                        <div className="flex items-center gap-x-2">
                            <Button
                                variant="outline"
                                type="button"
                                className={clsxm("dark:text-primary h-[2.3rem] border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light")}>
                                Cancel
                            </Button>

                            <Button
                                type="submit"
                                className={clsxm(
                                    'bg-[#3826A6] h-[2.3rem] font-normal flex items-center text-white',
                                )}
                            >
                                Save
                            </Button>
                        </div>

                    </div>
                </div>
            </div>

        </Modal>
    )
}
