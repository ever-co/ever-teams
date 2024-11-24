import { timesheetDeleteState, timesheetGroupByDayState, timesheetFilterEmployeeState, timesheetFilterProjectState, timesheetFilterStatusState, timesheetFilterTaskState, timesheetUpdateStatus } from '@/app/stores';
import { useAtom } from 'jotai';
import React from 'react';

export function useTimelogFilterOptions() {
    const [employeeState, setEmployeeState] = useAtom(timesheetFilterEmployeeState);
    const [projectState, setProjectState] = useAtom(timesheetFilterProjectState);
    const [statusState, setStatusState] = useAtom(timesheetFilterStatusState);
    const [taskState, setTaskState] = useAtom(timesheetFilterTaskState);
    const [selectTimesheet, setSelectTimesheet] = useAtom(timesheetDeleteState);
    const [timesheetGroupByDays, setTimesheetGroupByDays] = useAtom(timesheetGroupByDayState);
    const [puTimesheetStatus, setPuTimesheetStatus] = useAtom(timesheetUpdateStatus)

    const employee = employeeState;
    const project = projectState;
    const task = taskState

    const generateTimeOptions = (interval = 15) => {
        const totalSlots = (24 * 60) / interval; // Total intervals in a day
        return Array.from({ length: totalSlots }, (_, i) => {
            const hour = Math.floor((i * interval) / 60).toString().padStart(2, '0');
            const minutes = ((i * interval) % 60).toString().padStart(2, '0');
            return `${hour}:${minutes}`;
        });
    };
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
        setSelectTimesheet,
        timesheetGroupByDays,
        setTimesheetGroupByDays,
        generateTimeOptions,
        setPuTimesheetStatus,
        puTimesheetStatus
    };
}
