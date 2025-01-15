import { useAuthenticateUser } from './useAuthenticateUser';
import { useAtom } from 'jotai';
import { timesheetRapportState } from '@/app/stores/time-logs';
import { useQuery } from '../useQuery';
import { useCallback, useEffect, useMemo } from 'react';
import { deleteTaskTimesheetLogsApi, getTaskTimesheetLogsApi, updateStatusTimesheetFromApi, createTimesheetFromApi, updateTimesheetFromAPi } from '@/app/services/client/api/timer/timer-log';
import moment from 'moment';
import { ID, TimesheetLog, TimesheetStatus, UpdateTimesheet } from '@/app/interfaces';
import { useTimelogFilterOptions } from './useTimelogFilterOptions';
import axios from 'axios';

interface TimesheetParams {
    startDate?: Date | string;
    endDate?: Date | string;
    timesheetViewMode?: 'ListView' | 'CalendarView'
    inputSearch?: string
}

export interface GroupedTimesheet {
    date: string;
    tasks: TimesheetLog[];
}


const groupByDate = (items: TimesheetLog[]): GroupedTimesheet[] => {
    if (!items?.length) return [];

    // First, group by timesheetId
    const groupedByTimesheet = items.reduce((acc, item) => {
        if (!item?.timesheet?.id || !item?.timesheet.createdAt) {
            console.warn('Skipping item with missing timesheet or createdAt:', item);
            return acc;
        }
        const timesheetId = item.timesheet.id;
        if (!acc[timesheetId]) {
            acc[timesheetId] = [];
        }
        acc[timesheetId].push(item);
        return acc;
    }, {} as Record<string, TimesheetLog[]>);

    // Then, for each timesheet group, group by date and merge all results
    const result: GroupedTimesheet[] = [];
    Object.values(groupedByTimesheet).forEach(timesheetLogs => {
        const groupedByDate = timesheetLogs.reduce((acc, item) => {
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
        }, {} as Record<string, TimesheetLog[]>);

        // Convert grouped dates to array format and add to results
        Object.entries(groupedByDate).forEach(([date, tasks]) => {
            result.push({ date, tasks });
        });
    });

    // Sort by date in descending order
    return result.sort((a, b) => b.date.localeCompare(a.date));
};
const getWeekYearKey = (date: Date): string => {
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((date.getTime() - startOfYear.getTime()) / (1000 * 60 * 60 * 24));
    const week = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);
    return `${date.getFullYear()}-W${week}`;
};

const getMonthKey = (date: Date): string => {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
};

type GroupingKeyFunction = (date: Date) => string;

const createGroupingFunction = (getKey: GroupingKeyFunction) => (items: TimesheetLog[]): GroupedTimesheet[] => {
    if (!items?.length) return [];

    // First, group by timesheetId
    const groupedByTimesheet = items.reduce((acc, item) => {
        if (!item?.timesheet?.id || !item?.timesheet?.createdAt) {
            console.warn('Skipping item with missing timesheet or createdAt:', item);
            return acc;
        }
        const timesheetId = item.timesheet.id;
        if (!acc[timesheetId]) {
            acc[timesheetId] = [];
        }
        acc[timesheetId].push(item);
        return acc;
    }, {} as Record<string, TimesheetLog[]>);

    // Then, for each timesheet group, group by date and merge all results
    const result: GroupedTimesheet[] = [];
    Object.values(groupedByTimesheet).forEach(timesheetLogs => {
        const groupedByDate = timesheetLogs.reduce((acc, item) => {
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
        }, {} as Record<string, TimesheetLog[]>);

        // Convert grouped dates to array format and add to results
        Object.entries(groupedByDate).forEach(([key, tasks]) => {
            result.push({ date: key, tasks });
        });
    });

    // Sort by date in descending order
    return result.sort((a, b) => b.date.localeCompare(a.date));
};

const groupByWeek = createGroupingFunction(date => getWeekYearKey(date));
const groupByMonth = createGroupingFunction(getMonthKey);

/**
 * @function useTimesheet
 *
 * @description
 * Fetches timesheet logs based on the provided date range and filters.
 *
 * @param {TimesheetParams} params
 * @prop {Date} startDate - Start date of the period to fetch.
 * @prop {Date} endDate - End date of the period to fetch.
 * @prop {string} timesheetViewMode - "ListView" or "CalendarView"
 * @prop {string} inputSearch - Search string to filter the timesheet logs.
 *
 * @returns
 * @prop {boolean} loadingTimesheet - Whether the timesheet is being fetched.
 * @prop {TimesheetLog[]} timesheet - The list of timesheet logs, grouped by day.
 * @prop {function} getTaskTimesheet - Callable to fetch timesheet logs.
 * @prop {boolean} loadingDeleteTimesheet - Whether a timesheet is being deleted.
 * @prop {function} deleteTaskTimesheet - Callable to delete timesheet logs.
 * @prop {function} getStatusTimesheet - Callable to group timesheet logs by status.
 * @prop {TimesheetStatus} timesheetGroupByDays - The current filter for grouping timesheet logs.
 * @prop {object} statusTimesheet - Timesheet logs grouped by status.
 * @prop {function} updateTimesheetStatus - Callable to update the status of timesheet logs.
 * @prop {boolean} loadingUpdateTimesheetStatus - Whether timesheet logs are being updated.
 * @prop {boolean} puTimesheetStatus - Whether timesheet logs are updatable.
 * @prop {function} createTimesheet - Callable to create a new timesheet log.
 * @prop {boolean} loadingCreateTimesheet - Whether a timesheet log is being created.
 * @prop {function} updateTimesheet - Callable to update a timesheet log.
 * @prop {boolean} loadingUpdateTimesheet - Whether a timesheet log is being updated.
 * @prop {function} groupByDate - Callable to group timesheet logs by date.
 * @prop {boolean} isManage - Whether the user is authorized to manage the timesheet.
 */
export function useTimesheet({
    startDate,
    endDate,
    timesheetViewMode,
    inputSearch
}: TimesheetParams) {
    const { user } = useAuthenticateUser();
    const [timesheet, setTimesheet] = useAtom(timesheetRapportState);
    const { employee, project, task, statusState, timesheetGroupByDays, puTimesheetStatus, isUserAllowedToAccess, normalizeText, setSelectTimesheetId, selectTimesheetId, handleSelectRowByStatusAndDate, handleSelectRowTimesheet } = useTimelogFilterOptions();
    const { loading: loadingTimesheet, queryCall: queryTimesheet } = useQuery(getTaskTimesheetLogsApi);
    const { loading: loadingDeleteTimesheet, queryCall: queryDeleteTimesheet } = useQuery(deleteTaskTimesheetLogsApi);
    const { loading: loadingUpdateTimesheetStatus, queryCall: queryUpdateTimesheetStatus } = useQuery(updateStatusTimesheetFromApi)
    const { loading: loadingCreateTimesheet, queryCall: queryCreateTimesheet } = useQuery(createTimesheetFromApi);
    const { loading: loadingUpdateTimesheet, queryCall: queryUpdateTimesheet } = useQuery(updateTimesheetFromAPi);
    const isManage = user && isUserAllowedToAccess(user);

    const getTaskTimesheet = useCallback(
        ({ startDate, endDate }: TimesheetParams) => {
            if (!user) return;

            const from = moment(startDate).format('YYYY-MM-DD');
            const to = moment(endDate).format('YYYY-MM-DD');
            queryTimesheet({
                startDate: from,
                endDate: to,
                organizationId: user.employee?.organizationId,
                tenantId: user.tenantId ?? '',
                timeZone: user.timeZone?.split('(')[0].trim(),
                employeeIds: isManage
                    ? employee?.map(({ employee: { id } }) => id).filter(Boolean)
                    : [user.employee.id],
                projectIds: project?.map((project) => project.id).filter((id) => id !== undefined),
                taskIds: task?.map((task) => task.id).filter((id) => id !== undefined),
                status: statusState?.map((status) => status.value).filter((value) => value !== undefined)
            }).then((response) => {
                setTimesheet(response.data);
            }).catch((error) => {
                console.error('Error fetching timesheet:', error);
            });
        },
        [user, queryTimesheet, isManage, employee, project, task, statusState, setTimesheet]
    );

    const createTimesheet = useCallback(
        async ({ ...timesheetParams }: UpdateTimesheet) => {
            if (!user) {
                throw new Error("User not authenticated");
            }
            try {
                const response = queryCreateTimesheet(timesheetParams).then((res) => {
                    return res.data
                });
                return response
            } catch (error) {
                if (axios.isAxiosError(error)) {
                    console.error('Axios Error:', {
                        status: error.response?.status,
                        statusText: error.response?.statusText,
                        data: error.response?.data
                    });
                    throw new Error(`Request failed: ${error.message}`);
                }
                console.error('Error:', error instanceof Error ? error.message : error);
                throw error;
            }
        },
        [queryCreateTimesheet, user]
    );

    const updateTimesheet = useCallback(
        async (timesheet: UpdateTimesheet) => {
            if (!user) {
                console.warn("User not authenticated!");
                return;
            }
            try {
                const response = await queryUpdateTimesheet(timesheet);
                if (response?.data?.id) {
                    setTimesheet((prevTimesheet) =>
                        prevTimesheet.map((item) =>
                            item.id === response.data.id
                                ? { ...item, ...response.data }
                                : item
                        )
                    );
                } else {
                    console.warn(
                        "Unexpected structure of the response. No update performed.",
                        response
                    );
                }
            } catch (error) {
                console.error("Error updating the timesheet:", error);
                throw error;
            }
        },
        [queryUpdateTimesheet, setTimesheet, user]
    );



    const updateTimesheetStatus = useCallback(
        async ({ status, ids }: { status: TimesheetStatus; ids: ID[] | ID }) => {
            if (!user) return;
            const idsArray = Array.isArray(ids) ? ids : [ids];
            try {
                const response = await queryUpdateTimesheetStatus({ ids: idsArray, status });
                const responseMap = new Map(response.data.map(item => [item.id, item]));
                setTimesheet(prevTimesheet =>
                    prevTimesheet.map(item => {
                        const updatedItem = responseMap.get(item.timesheet.id);
                        if (updatedItem) {
                            return {
                                ...item,
                                timesheet: {
                                    ...item.timesheet,
                                    status: updatedItem.status
                                }
                            };
                        }
                        return item;
                    })
                );
                console.log('Timesheet status updated successfully!');
            } catch (error) {
                console.error('Error updating timesheet status:', error);
            }
        },
        [queryUpdateTimesheetStatus, setTimesheet, user]
    );

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


    const deleteTaskTimesheet = useCallback(async ({ logIds }: { logIds: string[] }) => {
        if (!user) {
            throw new Error('User not authenticated');
        }
        if (!logIds.length) {
            throw new Error('No timesheet IDs provided for deletion');
        }
        try {
            await queryDeleteTimesheet({
                organizationId: user.employee.organizationId,
                tenantId: user.tenantId ?? "",
                logIds
            });
            setTimesheet(prevTimesheet =>
                prevTimesheet.filter(item => !logIds.includes(item.id))
            );

        } catch (error) {
            console.error('Failed to delete timesheets:', error);
            throw error;
        }
    }, [user, queryDeleteTimesheet, setTimesheet]);

        const groupedByTimesheetIds = ({ rows }: { rows: TimesheetLog[] }): Record<string, TimesheetLog[]> => {
          if (!rows) {
            return {};
          }
           return rows.reduce((acc, row) => {
            if (!row) {
              return acc;
            }
            const timesheetId = row.timesheetId ?? 'unassigned';
             if (!acc[timesheetId]) {
               acc[timesheetId] = [];
             }
             acc[timesheetId].push(row);
             return acc;
           }, {} as Record<string, TimesheetLog[]>);
         }


    const filterDataTimesheet = useMemo(() => {
        if (!timesheet || !inputSearch) {
            return timesheet;
        }
        const searchTerms = normalizeText(inputSearch).split(/\s+/).filter(Boolean);
        if (searchTerms.length === 0) {
            return timesheet;
        }
        return timesheet.filter((task) => {
            const searchableContent = {
                title: normalizeText(task.task?.title),
                employee: normalizeText(task.employee?.fullName),
                project: normalizeText(task.project?.name)
            };
            return searchTerms.every(term =>
                Object.values(searchableContent).some(content =>
                    content.includes(term)
                )
            );
        });
    }, [timesheet, inputSearch, normalizeText]);

    const reGroupByDate = (groupedTimesheets: GroupedTimesheet[]): GroupedTimesheet[] => {
        return groupedTimesheets.reduce((acc, { date, tasks }) => {
            const existingGroup = acc.find(group => group.date === date);
            if (existingGroup) {
                existingGroup.tasks = existingGroup.tasks.concat(tasks);
            } else {
                acc.push({ date, tasks });
            }
            return acc;
        }, [] as GroupedTimesheet[]);
    };

    const timesheetElementGroup = useMemo(() => {
        if (!timesheet) {
            return [];
        }

        if (timesheetViewMode === 'ListView') {
            const groupedTimesheets = groupByDate(filterDataTimesheet);
            const reGroupedByDate = reGroupByDate(groupedTimesheets);
            switch (timesheetGroupByDays) {
                case 'Daily':
                    return reGroupedByDate;
                case 'Weekly':
                    return groupByWeek(filterDataTimesheet);
                case 'Monthly':
                    return groupByMonth(filterDataTimesheet);
                default:
                    return reGroupedByDate;
            }
        }
        return reGroupByDate(groupByDate(filterDataTimesheet));
    }, [timesheet, timesheetViewMode, filterDataTimesheet, timesheetGroupByDays]);

    const rowsToObject = (rows: TimesheetLog[]): Record<string, { task: TimesheetLog; status: TimesheetStatus }> => {
        return rows.reduce((acc, row) => {
            acc[row.timesheet.id] = { task: row, status: row.timesheet.status }
            return acc;
        }, {} as Record<string, { task: TimesheetLog; status: TimesheetStatus }>);
    };


    useEffect(() => {
        getTaskTimesheet({ startDate, endDate });
    }, [getTaskTimesheet, startDate, endDate, timesheetGroupByDays, inputSearch]);

    return {
        loadingTimesheet,
        timesheet: timesheetElementGroup,
        getTaskTimesheet,
        loadingDeleteTimesheet,
        deleteTaskTimesheet,
        getStatusTimesheet,
        timesheetGroupByDays,
        statusTimesheet: getStatusTimesheet(filterDataTimesheet.flat()),
        updateTimesheetStatus,
        loadingUpdateTimesheetStatus,
        puTimesheetStatus,
        createTimesheet,
        loadingCreateTimesheet,
        updateTimesheet,
        loadingUpdateTimesheet,
        groupByDate,
        isManage,
        normalizeText,
        setSelectTimesheetId,
        selectTimesheetId,
        handleSelectRowByStatusAndDate,
        handleSelectRowTimesheet,
        groupedByTimesheetIds,
        rowsToObject
    };
}
