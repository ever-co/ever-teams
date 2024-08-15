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


    return (
        <Popover>
            <PopoverTrigger asChild>
                <Button
                    className='flex items-center justify-center h-10 rounded-lg bg-primary dark:bg-primary-light gap-x-3' >
                    <SettingFilterIcon className="dark:text-white w-3.5" strokeWidth="1.8" />
                    <span className="dark:text-white">Filter</span>
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
                                defaultValue={activeTeamTask}
                                items={tasks}
                                onValueChange={(task) => setTaskId(task ? task.id : '')}
                                itemId={(task) => (task ? task.id : '')}
                                itemToString={(task) => (task ? task.title : '')}
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
