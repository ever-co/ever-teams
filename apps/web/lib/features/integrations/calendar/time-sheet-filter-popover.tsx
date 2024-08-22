import { useState } from "react";
import { useOrganizationTeams, useTeamTasks } from "@app/hooks";
import { Button } from "@components/ui/button"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@components/ui/popover"
import { SettingFilterIcon } from "assets/svg"
import { SelectItems } from "lib/components";
import { statusOptions } from "@app/constants";


export function TimeSheetFilter() {

    const { teams, activeTeam } = useOrganizationTeams();
    const { activeTeamTask, tasks } = useTeamTasks();
    const [status, setStatus] = useState('');
    const [taskId, setTaskId] = useState<string>('');
    const [teamId, setTeamId] = useState<string>('');
    const [membersId, setMembersId] = useState('')


    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    className='flex items-center justify-center h-10 rounded-lg bg-white dark:bg-dark--theme-light gap-x-3 border dark:border-gray-700 hover:bg-white' >
                    <SettingFilterIcon className="text-gray-700 dark:text-white w-3.5" strokeWidth="1.8" />
                    <div className="gap-x-2 flex items-center w-full">
                        <span className="text-gray-700 dark:text-white">Filter</span>
                        <div className="bg-gray-700 dark:bg-white h-6 w-6 rounded-full flex items-center  justify-center text-whiten dark:text-gray-700">
                            <span>6</span>
                        </div>
                    </div>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[430px] shadow">
                <div className="w-full flex flex-col gap-4">
                    <div className="flex items-center justify-center">
                        <h4 className="font-bold leading-none text-[20px] ">Select Filter</h4>
                    </div>
                    <div className="grid gap-3">

                        <div className="">
                            <label className="block text-gray-500 mb-1">
                                Team<span className="text-[#de5505e1] ml-1">*</span>
                            </label>
                            <SelectItems
                                defaultValue={activeTeam}
                                items={teams}
                                onValueChange={(team) => setTeamId(team ? team.id : '')}
                                itemId={(team) => (team ? team.id : '')}
                                itemToString={(team) => (team ? team.name : teamId)}
                                triggerClassName="border-slate-100 dark:border-slate-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-500 mb-1">
                                Employee<span className="text-[#de5505e1] ml-1">*</span>
                            </label>
                            <SelectItems
                                items={activeTeam?.members ?? []}
                                onValueChange={(members) => setMembersId(members ? members.id : '')}
                                itemId={(members) => (members ? members.id : membersId)}
                                itemToString={(members) => (members ? members.employee.fullName : '')}
                                triggerClassName="border-slate-100 dark:border-slate-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-500 mb-1">
                                Status<span className="text-[#de5505e1] ml-1">*</span>
                            </label>
                            <SelectItems
                                items={statusOptions}
                                onValueChange={(value) => setStatus(value.value ? value.value : status)}
                                itemId={(value) => value.label}
                                itemToString={(value) => (value.label)}
                                triggerClassName="border-slate-100 dark:border-slate-600"
                            />
                        </div>
                        <div className="">
                            <label className="block text-gray-500 mb-1">
                                Task<span className="text-[#de5505e1] ml-1">*</span>
                            </label>
                            <SelectItems
                                defaultValue={activeTeamTask}
                                items={tasks}
                                onValueChange={(task) => setTaskId(task ? task.id : taskId)}
                                itemId={(task) => (task ? task.id : '')}
                                itemToString={(task) => (task ? task.title : '')}
                                triggerClassName="border-slate-100 dark:border-slate-600"
                            />
                        </div>
                        <Button
                            className='flex items-center justify-center h-10 rounded-lg bg-primary dark:bg-primary-light dark:text-gray-300' >
                            <span>Add Filter</span>
                        </Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    )
}
