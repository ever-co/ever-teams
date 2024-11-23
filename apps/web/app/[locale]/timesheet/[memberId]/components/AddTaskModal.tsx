import React from 'react'
import { useTeamTasks, useTimelogFilterOptions } from '@/app/hooks';
import { ITaskIssue } from '@/app/interfaces';
import { clsxm } from '@/app/utils';
import { Modal } from '@/lib/components'
import { CustomSelect, TaskStatus, taskIssues } from '@/lib/features';
import { Item, ManageOrMemberComponent, getNestedValue } from '@/lib/features/manual-time/manage-member-component';
import { useTranslations } from 'next-intl';
import { ToggleButton } from './EditTaskModal';
import { PlusIcon } from '@radix-ui/react-icons';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@components/ui/accordion';
import { DatePickerFilter } from './TimesheetFilterDate';
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@components/ui/select';
export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
}
export function AddTaskModal({ closeModal, isOpen }: IAddTaskModalProps) {
    const { generateTimeOptions } = useTimelogFilterOptions();
    const timeOptions = generateTimeOptions(15);
    const t = useTranslations();
    const { activeTeam } = useTeamTasks();
    const [notes, setNotes] = React.useState('');
    const [task, setTasks] = React.useState('')
    const [isBillable, setIsBillable] = React.useState<boolean>(true);
    const [dateRange, setDateRange] = React.useState<{ from: Date | null }>({
        from: new Date(),
    });
    const handleFromChange = (fromDate: Date | null) => {
        setDateRange((prev) => ({ ...prev, from: fromDate }));
    };
    const projectItemsLists = {
        Project: activeTeam?.projects ?? [],
    };

    const handleSelectedValuesChange = (values: { [key: string]: Item | null }) => {
        // Handle value changes
    };
    const selectedValues = {
        Project: null,
    };
    const handleChange = (field: string, selectedItem: Item | null) => {
        // Handle field changes
    };

    const fields = [
        {
            label: 'Link to Project',
            placeholder: 'Select a project',
            isRequired: true,
            valueKey: 'id',
            displayKey: 'name',
            element: 'Project'
        },
    ];

    return (
        <Modal
            isOpen={isOpen}
            closeModal={closeModal}
            title={'+ Add Time Entry'}
            showCloseIcon
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[30rem] justify-start h-[auto] overflow-y-auto"
            titleClass="font-bold flex justify-start w-full">
            <div className="flex flex-col w-full gap-4 justify-start overflow-y-auto">
                <div className=" w-full mr-[4%]">
                    <label className="block text-[#282048] dark:text-gray-400 font-medium mb-1">
                        Task
                        <span className="text-[#de5505e1] ml-1">*</span>
                    </label>
                    <input
                        aria-label="Task"
                        aria-describedby="start-time-error"
                        type="Task"
                        value={task}
                        onChange={(e) => setTasks(e.target?.value)}
                        className="w-full p-2 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
                        placeholder='Bug for creating calendar view'
                        required
                    />
                </div>
                <div className=" w-full mr-[4%] flex items-center">
                    <label className="block text-[#282048] dark:text-gray-400  mb-1 px-2">
                        Types
                        <span className="text-[#de5505e1] ml-1">*</span>:
                    </label>
                    <CustomSelect
                        ariaLabel='Task issues'
                        className='w-32 bg-[#3826A633] text-primary font-medium'
                        options={Object.keys(taskIssues).flatMap((items) => items)}
                        renderOption={(option) => (
                            <div className="flex items-center gap-x-2">
                                <TaskStatus
                                    {...taskIssues[option as ITaskIssue]}
                                    showIssueLabels={false}
                                    issueType="issue"
                                    className={clsxm('rounded-md px-2 text-white bg-primary')}
                                />
                                {option}
                            </div>
                        )}
                    />
                </div>
                <div>
                    <OptimizedAccordion
                        dateRange={dateRange}
                        timeOptions={timeOptions}
                        handleFromChange={handleFromChange} />
                </div>

                <div className="w-full flex flex-col">
                    <ManageOrMemberComponent
                        classNameTitle='text-[#282048] dark:text-gray-400 font-medium mr-12 capitalize'
                        fields={fields}
                        itemsLists={projectItemsLists}
                        selectedValues={selectedValues}
                        onSelectedValuesChange={handleSelectedValuesChange}
                        handleChange={handleChange}
                        itemToString={(item, displayKey) => getNestedValue(item, displayKey) || ''}
                        itemToValue={(item, valueKey) => getNestedValue(item, valueKey) || ''}
                    />
                </div>
                <div className=" flex flex-col items-start w-full">
                    <label className="text-[#282048] dark:text-gray-400 font-medium mr-12 capitalize">
                        {t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()
                        }</label>
                    <div className="flex items-start gap-3">
                        <ToggleButton
                            isActive={isBillable}
                            onClick={() => setIsBillable(true)}
                            label={t('pages.timesheet.BILLABLE.YES')}
                        />
                        <ToggleButton
                            isActive={!isBillable}
                            onClick={() => setIsBillable(false)}
                            label={t('pages.timesheet.BILLABLE.NO')}
                        />
                    </div>
                </div>

                <div className="w-full flex flex-col">
                    <span className="text-[#282048] dark:text-gray-400 font-medium">Notes</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Insert notes here..."
                        className={clsxm(
                            "bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent",
                            "placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full",
                            "border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-36 bg-[#FBB6500D]",
                            notes.trim().length === 0 && "border-red-500"
                        )}
                        maxLength={120}
                        minLength={0}
                        aria-label="Insert notes here"
                        required
                    />
                    <div className="text-sm text-[#282048] dark:text-gray-400 font-medium text-right">
                        {notes.length}/{120}
                    </div>
                </div>
                <div className="flex items-center gap-x-2 justify-end w-full">
                    <button
                        type="button"
                        onClick={closeModal}
                        className={clsxm(
                            "text-primary dark:text-primary-light h-[2.3rem] w-[5.5rem] border px-2 rounded-lg border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light"
                        )}>
                        {t('common.CANCEL')}
                    </button>
                    <button
                        type="submit"
                        className={clsxm(
                            'bg-primary dark:bg-primary-light h-[2.3rem] w-[5.5rem] justify-center font-normal flex items-center text-white px-2 rounded-lg',
                        )}>
                        {t('common.SAVE')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
interface ShiftTimingSelectProps {
    label: string;
    timeOptions: string[];
    placeholder: string;
    className?: string;
    value?: string;
    onChange?: (value: string) => void;
}

const ShiftTimingSelect = ({ label, timeOptions, placeholder, className, onChange, value }: ShiftTimingSelectProps) => (
    <div className="flex items-center border border-gray-200 dark:border-gray-700 gap-2 rounded w-full">
        <button className={clsxm("  border-r px-2 py-2 text-center flex items-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none", className)}>
            {label}
        </button>
        <Select
            onValueChange={onChange}
            value={value}>
            <SelectTrigger className="w-full text-ellipsis border-transparent rounded-none bg-white dark:bg-dark--theme-light focus:ring-2 focus:ring-transparent">
                <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent className="z-[10000] max-h-60 overflow-y-auto">
                <SelectGroup>
                    {timeOptions.map((time) => (
                        <SelectItem
                            key={time}
                            value={time}
                            className="hover:bg-primary focus:bg-primary hover:text-white px-2 py-1 cursor-pointer"
                        >
                            {time}
                        </SelectItem>
                    ))}
                </SelectGroup>
            </SelectContent>
        </Select>
    </div>
);
interface Shift {
    startTime: string;
    endTime: string;
    totalHours: string;
    dateFrom: Date | string
}
const OptimizedAccordion = ({ dateRange, handleFromChange, timeOptions }: {
    dateRange: { from: Date | null };
    handleFromChange: (date: Date | null) => void;
    timeOptions: string[];
}) => {
    const [shifts, setShifts] = React.useState<Shift[]>([
        { startTime: '', endTime: '', totalHours: '00:00h', dateFrom: new Date() },
    ])
    const convertToMinutes = (time: string): number => {
        const [hours, minutes] = time.split(':').map(Number);
        return hours * 60 + minutes;
    };

    const calculateTotalHours = React.useCallback((start: string, end: string): string => {
        if (!start || !end) return '00:00h';

        const startMinutes = convertToMinutes(start);
        const endMinutes = convertToMinutes(end);

        const totalMinutes = endMinutes >= startMinutes
            ? endMinutes - startMinutes
            : 1440 - startMinutes + endMinutes;

        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}h`;
    }, []);



    const handleAddShift = () => {
        setShifts([...shifts,
        { startTime: '', endTime: '', totalHours: '00:00h', dateFrom: new Date() },]);
    };

    const handleRemoveShift = (index: number) => {
        const updatedShifts = shifts.filter((_, i) => i !== index);
        setShifts(updatedShifts);
    };

    const handleShiftChange = (index: number, field: keyof Shift, value: string) => {
        const updatedShifts = [...shifts];
        updatedShifts[index][field] = value;

        if (field === 'startTime' || field === 'endTime') {
            const { startTime, endTime } = updatedShifts[index];
            updatedShifts[index].totalHours = calculateTotalHours(startTime, endTime);
        }
        setShifts(updatedShifts);
    };

    return (
        <>
            {shifts.map((element, index) => {
                return <Accordion key={index} type="single" collapsible className="w-full p-1">
                    <AccordionItem value={`item-${index}`}
                        className="border rounded">
                        <AccordionTrigger className="flex flex-row-reverse justify-end h-10 p-1 items-center hover:no-underline">
                            <div className="flex items-center justify-between w-full">
                                <label className="block text-[#282048] dark:text-gray-400 mb-1 px-2">
                                    Date and Time
                                    <span className="text-[#de5505e1] ml-1">*</span>:
                                </label>
                                <span
                                    onClick={() => handleRemoveShift(index)}
                                    className="hover:underline font-normal text-primary dark:text-primary-light cursor-pointer">
                                    Remove Period
                                </span>
                            </div>
                        </AccordionTrigger>
                        <AccordionContent className="p-2">
                            <div className="flex flex-col gap-2">

                                <ShiftManagement
                                    value={element}
                                    index={index}
                                    onChange={handleShiftChange}
                                    timeOptions={timeOptions}
                                />

                            </div>
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            })}
            <button onClick={handleAddShift} className='flex items-center justify-start gap-2 cursor-pointer'>
                <div className='bg-[#3826A6] dark:bg-primary-light p-[0.5] rounded text-white'>
                    <PlusIcon />
                </div>
                <span className='text-[#3826A6] dark:text-primary-light hover:underline'>Add Another Period</span>
            </button>
        </>

    )
};

const ShiftManagement = (
    { onChange, value, index, timeOptions }: {
        onChange: (index: number, field: keyof Shift, value: string) => void,
        value: Shift, index: number, timeOptions: string[]
    }) => {
    return (

        <>
            <div className="w-[212px]">
                <span>Date</span>
                <DatePickerFilter
                    label={value.dateFrom ? value.dateFrom.toLocaleString() : 'Select Date'}
                    date={value.dateFrom as Date}
                    setDate={(value) => onChange(index, 'dateFrom', value as any)}
                />
            </div>
            <div className="flex flex-col w-full items-start gap-2">
                <span className="font-medium">Shift Timing</span>
                <div className="flex items-center w-full justify-between gap-4 mb-4">
                    <ShiftTimingSelect
                        label="Start"
                        timeOptions={timeOptions}
                        placeholder="00:00"
                        className="bg-[#30B3661A]"
                        value={value.startTime}
                        onChange={(value) => onChange(index, 'startTime', value)}
                    />
                    <ShiftTimingSelect
                        label="End"
                        timeOptions={timeOptions}
                        placeholder="00:00"
                        className="bg-[#DA27271A]"
                        value={value.endTime}
                        onChange={(value) => onChange(index, 'endTime', value)}
                    />
                    <button className="bg-gray-100 dark:bg-gray-800 border-r px-2 py-2 text-center flex items-center font-medium hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none">
                        {value.totalHours}
                    </button>
                </div>
            </div>
        </>

    );
};
