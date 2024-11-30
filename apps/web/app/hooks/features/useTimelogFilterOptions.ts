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
    const [selectedItems, setSelectedItems] = React.useState<{ status: string; date: string }[]>([]);

    const employee = employeeState;
    const project = projectState;
    const task = taskState

    const generateTimeOptions = (interval = 15) => {
        const totalSlots = (24 * 60) / interval; // Total intervals in a day
        return Array.from({ length: totalSlots }, (_, i) => {
            const totalMinutes = i * interval;
            const hour24 = Math.floor(totalMinutes / 60);
            const hour12 = hour24 % 12 || 12; // Convert to 12-hour format
            const minutes = (totalMinutes % 60).toString().padStart(2, '0');
            const period = hour24 < 12 ? 'AM' : 'PM'; // Determine AM/PM
            return `${hour12.toString().padStart(2, '0')}:${minutes} ${period}`;
        });
    };

    const handleSelectRowTimesheet = (items: string) => {
        setSelectTimesheet((prev) => prev.includes(items) ? prev.filter((filter) => filter !== items) : [...prev, items])
    }

    const handleSelectRowByStatusAndDate = (status: string, date: string) => {
        setSelectedItems((prev) =>
            prev.some((item) => item.status === status && item.date === date)
                ? prev.filter((item) => !(item.status === status && item.date === date))
                : [...prev, { status, date }]
        );
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
        handleSelectRowByStatusAndDate,
        selectedItems,
        selectTimesheet,
        setSelectTimesheet,
        timesheetGroupByDays,
        setTimesheetGroupByDays,
        generateTimeOptions,
        setPuTimesheetStatus,
        puTimesheetStatus
    };
}
