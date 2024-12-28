import { IUser, RoleNameEnum, TimesheetLog } from '@/app/interfaces';
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
    const [selectTimesheetId, setSelectTimesheetId] = React.useState<TimesheetLog[]>([])

    const employee = employeeState;
    const project = projectState;
    const task = taskState

    const isUserAllowedToAccess = (user: IUser | null | undefined): boolean => {
        const allowedRoles: RoleNameEnum[] = [
            RoleNameEnum.SUPER_ADMIN,
            RoleNameEnum.MANAGER,
            RoleNameEnum.ADMIN,
        ];
        return user?.role.name ? allowedRoles.includes(user.role.name as RoleNameEnum) : false;
    };
    const normalizeText = (text: string | undefined | null): string => {
        if (!text) return '';
        return text
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .trim();
    };

    const generateTimeOptions = (interval = 15) => {
        const totalSlots = (24 * 60) / interval; // Total intervals in a day
        return Array.from({ length: totalSlots }, (_, i) => {
            const totalMinutes = i * interval;
            const hour24 = Math.floor(totalMinutes / 60);
            const hour12 = hour24 % 12 || 12; // Convert to 12-hour format
            const minutes = (totalMinutes % 60).toString().padStart(2, '0');
            const period = hour24 < 12 ? 'AM' : 'PM'; // Determine AM/PM
            return `${hour12.toString().padStart(2, '0')}:${minutes}:00 ${period}`;
        });
    };

    const handleSelectRowTimesheet = (items: TimesheetLog) => {
        setSelectTimesheetId((prev) => prev.includes(items) ? prev.filter((filter) => filter !== items) : [...prev, items])
    }

    const handleSelectRowByStatusAndDate = (logs: TimesheetLog[], isChecked: boolean) => {
        setSelectTimesheetId((prev: TimesheetLog[]) => {
            const isLogIncluded = (log: TimesheetLog, list: TimesheetLog[]) =>
                list.some((item) => item.id === log.id);

            if (!isChecked) {
                return prev.filter((prevLog) => !logs.some((log) => log.id === prevLog.id));
            }
            const newLogs = logs.filter((log) => !isLogIncluded(log, prev));
            return [...prev, ...newLogs];
        });
    };

    React.useEffect(() => {
        return () => setSelectTimesheetId([]);
    }, []);

    return {
        statusState,
        employee,
        setSelectedItems,
        project,
        task,
        setEmployeeState,
        setProjectState,
        setTaskState,
        setStatusState,
        handleSelectRowTimesheet,
        selectTimesheetId,
        setSelectTimesheetId,
        handleSelectRowByStatusAndDate,
        selectedItems,
        selectTimesheet,
        setSelectTimesheet,
        timesheetGroupByDays,
        setTimesheetGroupByDays,
        generateTimeOptions,
        setPuTimesheetStatus,
        puTimesheetStatus,
        isUserAllowedToAccess,
        normalizeText
    };
}
