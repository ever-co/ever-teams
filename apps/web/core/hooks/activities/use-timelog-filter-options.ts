import { TUser } from '@/core/types/schemas';
import { ERoleName } from '@/core/types/generics/enums/role';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import {
	timesheetDeleteState,
	timesheetGroupByDayState,
	timesheetFilterEmployeeState,
	timesheetFilterProjectState,
	timesheetFilterStatusState,
	timesheetFilterTaskState,
	timesheetUpdateStatus,
	selectTimesheetIdState,
	allTeamsState,
	allUserState
} from '@/core/stores';
import { useAtom } from 'jotai';
import React from 'react';

export function useTimelogFilterOptions() {
	const [employeeState, setEmployeeState] = useAtom(timesheetFilterEmployeeState);
	const [alluserState, setAllUserState] = useAtom(allUserState);
	const [allteamsState, setAllTeamsState] = useAtom(allTeamsState);
	const [projectState, setProjectState] = useAtom(timesheetFilterProjectState);
	const [statusState, setStatusState] = useAtom(timesheetFilterStatusState);
	const [taskState, setTaskState] = useAtom(timesheetFilterTaskState);
	const [selectTimesheet, setSelectTimesheet] = useAtom(timesheetDeleteState);
	const [timesheetGroupByDays, setTimesheetGroupByDays] = useAtom(timesheetGroupByDayState);
	const [puTimesheetStatus, setPuTimesheetStatus] = useAtom(timesheetUpdateStatus);
	const [selectedItems, setSelectedItems] = React.useState<{ status: string; date: string }[]>([]);
	// const [selectTimesheetId, setSelectTimesheetId] = React.useState<TimesheetLog[]>([])
	const [selectTimesheetId, setSelectTimesheetId] = useAtom(selectTimesheetIdState);

	const employee = employeeState;
	const project = projectState;
	const task = taskState;

	const isUserAllowedToAccess = (user: TUser | null | undefined): boolean => {
		const allowedRoles: ERoleName[] = [ERoleName.SUPER_ADMIN, ERoleName.MANAGER, ERoleName.ADMIN];
		return user?.role?.name ? allowedRoles.includes(user.role.name as ERoleName) : false;
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

	const handleSelectRowTimesheet = (items: ITimeLog) => {
		setSelectTimesheetId((prev) =>
			prev.includes(items) ? prev.filter((filter) => filter !== items) : [...prev, items]
		);
	};

	const handleSelectRowByStatusAndDate = (logs: ITimeLog[], isChecked: boolean) => {
		setSelectTimesheetId((prev: ITimeLog[]) => {
			const isLogIncluded = (log: ITimeLog, list: ITimeLog[]) => list.some((item) => item.id === log.id);

			if (!isChecked) {
				return prev.filter((prevLog) => !logs.some((log) => log.id === prevLog.id));
			}
			const newLogs = logs.filter((log) => !isLogIncluded(log, prev));
			return [...prev, ...newLogs];
		});
	};

	React.useEffect(() => {
		return () => setSelectTimesheetId([]);
	}, [setSelectTimesheetId]);

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
		normalizeText,
		allteamsState,
		setAllTeamsState,
		alluserState,
		setAllUserState
	};
}
