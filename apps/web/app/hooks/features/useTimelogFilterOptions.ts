import { timesheetDeleteState, timesheetFilterEmployeeState, timesheetFilterProjectState, timesheetFilterStatusState, timesheetFilterTaskState } from '@/app/stores';
import { useAtom } from 'jotai';
import React from 'react';

export function useTimelogFilterOptions() {
    const [employeeState, setEmployeeState] = useAtom(timesheetFilterEmployeeState);
    const [projectState, setProjectState] = useAtom(timesheetFilterProjectState);
    const [statusState, setStatusState] = useAtom(timesheetFilterStatusState);
    const [taskState, setTaskState] = useAtom(timesheetFilterTaskState);
    const [selectTimesheet, setSelectTimesheet] = useAtom(timesheetDeleteState);

    const employee = employeeState;
    const project = projectState;
    const task = taskState

    const handleSelectRowTimesheet = (items: string) => {
        setSelectTimesheet((prev) => prev.includes(items) ? prev.filter((filter) => filter !== items) : [...prev, items])
    }
    React.useEffect(() => {
        return () => setSelectTimesheet([]);
    }, []);

    return {
        statusState,
        employee,
        project,
        task,
        setEmployeeState,
        setProjectState,
        setTaskState,
        setStatusState,
        handleSelectRowTimesheet,
        selectTimesheet,
        setSelectTimesheet
    };
}
