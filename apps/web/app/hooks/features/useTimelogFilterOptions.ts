import { timesheetFilterEmployeeState, timesheetFilterProjectState, timesheetFilterStatusState, timesheetFilterTaskState } from '@/app/stores';
import { useAtom } from 'jotai';

export function useTimelogFilterOptions() {
    const [employeeState, setEmployeeState] = useAtom(timesheetFilterEmployeeState);
    const [projectState, setProjectState] = useAtom(timesheetFilterProjectState);
    const [statusState, setStatusState] = useAtom(timesheetFilterStatusState);
    const [taskState, setTaskState] = useAtom(timesheetFilterTaskState);

    const employee = employeeState;
    const project = projectState;
    const task = taskState


    return {
        statusState,
        employee,
        project,
        task,
        setEmployeeState,
        setProjectState,
        setTaskState,
        setStatusState
    };
}
