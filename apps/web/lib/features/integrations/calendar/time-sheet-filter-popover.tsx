import { useState } from "react";
import { useOrganizationTeams, useTeamTasks } from "@app/hooks";
import { Button } from "@components/ui/button"
import { Modal, SelectItems } from "lib/components";
import { statusOptions } from "@app/constants";
interface TimeSheetFilterProps {
    isOpen: boolean,
    closeModal: () => void
}

export function TimeSheetFilter({ closeModal, isOpen }: TimeSheetFilterProps) {
    const { teams, activeTeam } = useOrganizationTeams();
    const { activeTeamTask, tasks } = useTeamTasks();
    const [status, setStatus] = useState('');
    const [taskId, setTaskId] = useState<string>('');
    const [teamId, setTeamId] = useState<string>('');
    const [membersId, setMembersId] = useState('')
    return (
        <>
            <Modal
                isOpen={isOpen}
                closeModal={closeModal}
                title={"Filters"}
                className="bg-light--theme-light dark:bg-dark--theme-light p-5 rounded-xl !w-[350px]  md:w-40 md:min-w-[24rem] h-[auto] justify-start shadow-xl"
                titleClass="font-bold"
            >
                <div className="w-full flex flex-col gap-5 ">
                    <div className="grid gap-5">

                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Team</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                defaultValue={activeTeam}
                                items={teams}
                                onValueChange={(team) => setTeamId(team ? team.id : '')}
                                itemId={(team) => (team ? team.id : '')}
                                itemToString={(team) => (team ? team.name : teamId)}
                                triggerClassName="border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Employee</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                items={activeTeam?.members ?? []}
                                onValueChange={(members) => setMembersId(members ? members.id : '')}
                                itemId={(members) => (members ? members.id : membersId)}
                                itemToString={(members) => (members ? members.employee.fullName : '')}
                                triggerClassName="border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Status</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                items={statusOptions}
                                onValueChange={(value) => setStatus(value.value ? value.value : status)}
                                itemId={(value) => value.label}
                                itemToString={(value) => (value.label)}
                                triggerClassName="border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Status</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                items={statusOptions}
                                onValueChange={(value) => setStatus(value.value ? value.value : status)}
                                itemId={(value) => value.label}
                                itemToString={(value) => (value.label)}
                                triggerClassName="border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Status</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                items={statusOptions}
                                onValueChange={(value) => setStatus(value.value ? value.value : status)}
                                itemId={(value) => value.label}
                                itemToString={(value) => (value.label)}
                                triggerClassName="border border-gray-200 dark:border-gray-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-600 mb-1 text-sm">
                                <span className="text-sm">Status</span><span className="text-[#de5505e1] ml-1 text-sm">*</span>
                            </label>
                            <SelectItems
                                defaultValue={activeTeamTask}
                                items={tasks}
                                onValueChange={(task) => setTaskId(task ? task.id : taskId)}
                                itemId={(task) => (task ? task.id : '')}
                                itemToString={(task) => (task ? task.title : '')}
                                triggerClassName="border border-slate-200 dark:border-slate-600"
                            />
                        </div>
                        <div className="flex items-center justify-between gap-x-4 w-full">
                            <Button
                                variant={'outline'}
                                className='flex items-center text-sm justify-center h-10 w-full rounded-lg  dark:text-gray-300' >
                                <span className="text-sm">Clear Filter</span>
                            </Button>
                            <Button
                                className='flex items-center text-sm justify-center h-10 w-full rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300' >
                                <span className="text-sm">Apply Filter</span>
                            </Button>
                        </div>
                    </div>
                </div>
            </Modal>
        </>
    )
}
