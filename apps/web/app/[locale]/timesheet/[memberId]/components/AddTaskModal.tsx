import { useTeamTasks } from '@/app/hooks';
import { ITaskIssue } from '@/app/interfaces';
import { clsxm } from '@/app/utils';
import { Modal } from '@/lib/components'
import { CustomSelect, TaskStatus, taskIssues } from '@/lib/features';
import { Item, ManageOrMemberComponent, getNestedValue } from '@/lib/features/manual-time/manage-member-component';
import { useTranslations } from 'next-intl';
import React from 'react'
import { ToggleButton } from './EditTaskModal';
export interface IAddTaskModalProps {
    isOpen: boolean;
    closeModal: () => void;
}
export function AddTaskModal({ closeModal, isOpen }: IAddTaskModalProps) {
    const t = useTranslations();
    const { activeTeam } = useTeamTasks();
    const [notes, setNotes] = React.useState('');
    const [task, setTasks] = React.useState('')
    const [isBillable, setIsBillable] = React.useState<boolean>(true);

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
            label: t('sidebar.PROJECTS'),
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
            title={'ADD TASK'}
            showCloseIcon
            className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl w-full md:w-40 md:min-w-[30rem] justify-start h-[auto]"
            titleClass="font-bold flex justify-start w-full">
            <div className="flex flex-col w-full gap-4 justify-start">
                <div className=" w-full mr-[4%]">
                    <label className="block text-[#282048] font-medium mb-1">
                        Task
                        <span className="text-[#de5505e1] ml-1">*</span>
                    </label>
                    <input
                        aria-label="Task"
                        aria-describedby="start-time-error"
                        type="Task"
                        value={task}
                        onChange={(e) => setTasks(e.target?.value)}
                        className="w-full p-1 border font-normal border-slate-300 dark:border-slate-600 dark:bg-dark--theme-light rounded-md"
                        required
                    />
                </div>
                <div className=" w-full mr-[4%] flex items-center">
                    <label className="block text-[#282048]  mb-1 px-2">
                        {t('common.ISSUE_TYPE')}
                        <span className="text-[#de5505e1] ml-1">*</span>:
                    </label>
                    <CustomSelect
                        className='w-auto'
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
                <div className=" flex flex-col items-center w-full">
                    <label className="text-[#282048] font-medium mr-12 capitalize">
                        {t('pages.timesheet.BILLABLE.BILLABLE').toLowerCase()
                        }</label>
                    <div className="flex items-center gap-3">
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
                    <ManageOrMemberComponent
                        fields={fields}
                        itemsLists={projectItemsLists}
                        selectedValues={selectedValues}
                        onSelectedValuesChange={handleSelectedValuesChange}
                        handleChange={handleChange}
                        itemToString={(item, displayKey) => getNestedValue(item, displayKey) || ''}
                        itemToValue={(item, valueKey) => getNestedValue(item, valueKey) || ''}
                    />
                </div>
                <div className="w-full flex flex-col">
                    <span className="text-[#282048] font-medium">Notes</span>
                    <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="Insert notes here..."
                        className={clsxm(
                            "bg-transparent focus:border-transparent focus:ring-2 focus:ring-transparent",
                            "placeholder-gray-300 placeholder:font-normal resize-none p-2 grow w-full",
                            "border border-gray-200 dark:border-slate-600 dark:bg-dark--theme-light rounded-md h-40 bg-[#FBB6500D]",
                            notes.trim().length === 0 && "border-red-500"
                        )}
                        maxLength={120}
                        minLength={0}
                        aria-label="Insert notes here"
                        required
                    />
                    <div className="text-sm text-[#282048] font-medium text-right">
                        {notes.length}/{120}
                    </div>
                </div>
                <div className="flex items-center gap-x-2 justify-end w-full">
                    <button
                        type="button"
                        className={clsxm("dark:text-primary h-[2.3rem] w-[5.5rem] border px-2 rounded-lg border-gray-300 dark:border-slate-600 font-normal dark:bg-dark--theme-light")}>
                        {t('common.CANCEL')}
                    </button>
                    <button
                        type="submit"
                        className={clsxm(
                            'bg-[#3826A6] h-[2.3rem] w-[5.5rem] justify-center font-normal flex items-center text-white px-2 rounded-lg',
                        )}>
                        {t('common.SAVE')}
                    </button>
                </div>
            </div>
        </Modal>
    )
}
