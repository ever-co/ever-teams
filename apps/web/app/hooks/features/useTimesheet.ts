import { useAuthenticateUser } from './useAuthenticateUser';
import { useAtom } from 'jotai';
import { timesheetRapportState } from '@/app/stores/time-logs';
import { useQuery } from '../useQuery';
import { useCallback, useEffect, useMemo } from 'react';
import { deleteTaskTimesheetLogsApi, getTaskTimesheetLogsApi, updateStatusTimesheetFromApi, createTimesheetFromApi } from '@/app/services/client/api/timer/timer-log';
import moment from 'moment';
import { ID, TimesheetLog, TimesheetStatus, UpdateTimesheet } from '@/app/interfaces';
import { useTimelogFilterOptions } from './useTimelogFilterOptions';

interface TimesheetParams {
    startDate?: Date | string;
    endDate?: Date | string;
}

export interface GroupedTimesheet {
    date: string;
    tasks: TimesheetLog[];
}


interface DeleteTimesheetParams {
    organizationId: string;
    tenantId: string;
    logIds: string[];
}


const groupByDate = (items: TimesheetLog[]): GroupedTimesheet[] => {
    if (!items?.length) return [];
    type GroupedMap = Record<string, TimesheetLog[]>;
    const groupedByDate = items.reduce<GroupedMap>((acc, item) => {
        if (!item?.timesheet?.createdAt) {
            console.warn('Skipping item with missing timesheet or createdAt:', item);
            return acc;
        }
        try {
            const date = new Date(item.timesheet.createdAt).toISOString().split('T')[0];
            if (!acc[date]) acc[date] = [];
            acc[date].push(item);
        } catch (error) {
            console.error(
                `Failed to process date for timesheet ${item.timesheet.id}:`,
                { createdAt: item.timesheet.createdAt, error }
            );
        }
        return acc;
    }, {});

    return Object.entries(groupedByDate)
        .map(([date, tasks]) => ({ date, tasks }))
        .sort((a, b) => b.date.localeCompare(a.date));
}
const getWeekYearKey = (date: Date): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
};


type GroupingKeyFunction = (date: Date) => string;

const createGroupingFunction = (getKey: GroupingKeyFunction) => (items: TimesheetLog[]): GroupedTimesheet[] => {
    if (!items?.length) return [];
    type GroupedMap = Record<string, TimesheetLog[]>;

    const grouped = items.reduce<GroupedMap>((acc, item) => {
        if (!item?.timesheet?.createdAt) {
            console.warn('Skipping item with missing timesheet or createdAt:', item);
            return acc;
        }
        try {
            const date = new Date(item.timesheet.createdAt);
            const key = getKey(date);
            if (!acc[key]) acc[key] = [];
            acc[key].push(item);
        } catch (error) {
            console.error(
                `Failed to process date for timesheet ${item.timesheet.id}:`,
                { createdAt: item.timesheet.createdAt, error }
            );
        }
        return acc;
    }, {});

    return Object.entries(grouped)
        .map(([key, tasks]) => ({ date: key, tasks }))
        .sort((a, b) => b.date.localeCompare(a.date));
};

const groupByWeek = createGroupingFunction(date => getWeekYearKey(date));
const groupByMonth = createGroupingFunction(date =>
    `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`
);

export function useTimesheet({
    startDate,
    endDate,
}: TimesheetParams) {
    const { user } = useAuthenticateUser();
    const [timesheet, setTimesheet] = useAtom(timesheetRapportState);
    const { employee, project, task, statusState, selectTimesheet: logIds, timesheetGroupByDays, puTimesheetStatus } = useTimelogFilterOptions();
    const { loading: loadingTimesheet, queryCall: queryTimesheet } = useQuery(getTaskTimesheetLogsApi);
    const { loading: loadingDeleteTimesheet, queryCall: queryDeleteTimesheet } = useQuery(deleteTaskTimesheetLogsApi);
    const { loading: loadingUpdateTimesheetStatus, queryCall: queryUpdateTimesheetStatus } = useQuery(updateStatusTimesheetFromApi)
    const { loading: loadingUpdateTimesheet, queryCall: queryUpdateTimesheet } = useQuery(createTimesheetFromApi)


    const getTaskTimesheet = useCallback(
        ({ startDate, endDate }: TimesheetParams) => {
            if (!user) return;
            const from = moment(startDate).format('YYYY-MM-DD');
            const to = moment(endDate).format('YYYY-MM-DD')
            queryTimesheet({
                startDate: from,
                endDate: to,
                organizationId: user.employee?.organizationId,
                tenantId: user.tenantId ?? '',
                timeZone: user.timeZone?.split('(')[0].trim(),
                employeeIds: employee?.map((member) => member.employee.id).filter((id) => id !== undefined),
                projectIds: project?.map((project) => project.id).filter((id) => id !== undefined),
                taskIds: task?.map((task) => task.id).filter((id) => id !== undefined),
                status: statusState?.map((status) => status.value).filter((value) => value !== undefined)
            }).then((response) => {
                setTimesheet(response.data);
            }).catch((error) => {
                console.error('Error fetching timesheet:', error);
            });
        },
        [
            user,
            queryTimesheet,
            setTimesheet,
            employee,
            project,
            task,
            statusState
        ]
    );

    const createTimesheet = useCallback(({ ...timesheetParams }: UpdateTimesheet) => {
        if (!user) return;
        queryUpdateTimesheet(timesheetParams).then((response) => {
            console.log('Response data:', response.data);
            setTimesheet((prevTimesheet) => {
                const updatedTimesheet = prevTimesheet ? [{ ...response.data, ...prevTimesheet }] : [{ ...response.data }];
                return updatedTimesheet;
            });
        });
    }, [queryUpdateTimesheet, user]);



    const updateTimesheetStatus = useCallback(
        ({ status, ids }: { status: TimesheetStatus, ids: ID[] | ID }) => {
            if (!user) return;
            queryUpdateTimesheetStatus({ ids, status })
                .then((response) => {
                    const updatedData = timesheet.map(item => {
                        const newItem = response.data.find(newItem => newItem.id === item.timesheet.id);
                        if (newItem) {
                            return {
                                ...item,
                                timesheet: {
                                    ...item.timesheet,
                                    status: newItem.status
                                }
                            };
                        }
                        return item;
                    });
                    setTimesheet(updatedData);
                })
                .catch((error) => {
                    console.error('Error fetching timesheet:', error);
                });
        }, [queryUpdateTimesheetStatus, setTimesheet])

    const getStatusTimesheet = (items: TimesheetLog[] = []) => {
        const STATUS_MAP: Record<TimesheetStatus, TimesheetLog[]> = {
            PENDING: [],
            APPROVED: [],
            DENIED: [],
            DRAFT: [],
            'IN REVIEW': []
        };

        return items.reduce((acc, item) => {
            const status = item.timesheet.status;
            if (isTimesheetStatus(status)) {
                acc[status].push(item);
            } else {
                console.warn(`Invalid timesheet status: ${status}`);
            }
            return acc;
        }, STATUS_MAP);
    }

    // Type guard
    function isTimesheetStatus(status: unknown): status is TimesheetStatus {
        const timesheetStatusValues: TimesheetStatus[] = [
            "DRAFT",
            "PENDING",
            "IN REVIEW",
            "DENIED",
            "APPROVED"
        ];
        return Object.values(timesheetStatusValues).includes(status as TimesheetStatus);
    }


    const handleDeleteTimesheet = async (params: DeleteTimesheetParams) => {
        try {
            return await queryDeleteTimesheet(params);
        } catch (error) {
            console.error('Error deleting timesheet:', error);
            throw error;
        }
    };

    const deleteTaskTimesheet = useCallback(async () => {
        if (!user) {
            throw new Error('User not authenticated');
        }
        if (!logIds.length) {
            throw new Error('No timesheet IDs provided for deletion');
        }
        try {
            await handleDeleteTimesheet({
                organizationId: user.employee.organizationId,
                tenantId: user.tenantId ?? "",
                logIds
            });
        } catch (error) {
            console.error('Failed to delete timesheets:', error);
            throw error;
        }
    },
        [user, queryDeleteTimesheet, logIds, handleDeleteTimesheet] // deepscan-disable-line
    );
    const timesheetElementGroup = useMemo(() => {
        if (timesheetGroupByDays === 'Daily') {
            return groupByDate(timesheet);
        }
        if (timesheetGroupByDays === 'Weekly') {
            return groupByWeek(timesheet);
        }
        return groupByMonth(timesheet);
    }, [timesheetGroupByDays, timesheet]);


    useEffect(() => {
        getTaskTimesheet({ startDate, endDate });
    }, [getTaskTimesheet, startDate, endDate, timesheetGroupByDays]);

    return {
        loadingTimesheet,
        timesheet: timesheetElementGroup,
        getTaskTimesheet,
        loadingDeleteTimesheet,
        deleteTaskTimesheet,
        getStatusTimesheet,
        timesheetGroupByDays,
        statusTimesheet: getStatusTimesheet(timesheet.flat()),
        updateTimesheetStatus,
        loadingUpdateTimesheetStatus,
        puTimesheetStatus,
        createTimesheet,
        loadingUpdateTimesheet
    };
}
