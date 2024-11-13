import { IProject, ITeamTask, OT_Member } from '@/app/interfaces';
import { timesheetFilterEmployeeState, timesheetFilterProjectState, timesheetFilterStatusState, timesheetFilterTaskState } from '@/app/stores';
import { useAtom } from 'jotai';

export function useTimelogFilterOptions() {
    const [employeeState, setEmployeeState] = useAtom(timesheetFilterEmployeeState);
    const [projectState, setProjectState] = useAtom(timesheetFilterProjectState);
    const [statuState, setStatuState] = useAtom(timesheetFilterStatusState);
    const [taskState, setTaskState] = useAtom(timesheetFilterTaskState);

    const employee = employeeState as OT_Member[];
    const project = projectState as IProject[];
    const task = taskState as ITeamTask[]


    return {
        statuState,
        employee,
        project,
        task,
        setEmployeeState,
        setProjectState,
        setTaskState,
        setStatuState
    };
}
