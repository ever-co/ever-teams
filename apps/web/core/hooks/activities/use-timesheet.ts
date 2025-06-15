import { useAtom } from 'jotai';
import { timesheetRapportState } from '@/core/stores/timer/time-logs';
import { useCallback, useMemo, useState } from 'react';
import moment from 'moment';
import { useTimelogFilterOptions } from './use-timelog-filter-options';
import axios from 'axios';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { timeSheetService } from '@/core/services/client/api/timesheets/timesheet.service';
import { useAuthenticateUser } from '../auth';
import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';
import { IUpdateTimesheetRequest } from '@/core/types/interfaces/timesheet/timesheet';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/core/query/keys';
import { useConditionalUpdateEffect } from '../common/use-has-mounted';

interface TimesheetParams {
	startDate?: Date | string;
	endDate?: Date | string;
	timesheetViewMode?: 'ListView' | 'CalendarView';
	inputSearch?: string;
}

export interface GroupedTimesheet {
	date: string;
	tasks: ITimeLog[];
}

const groupByDate = (items: ITimeLog[]): GroupedTimesheet[] => {
	if (!items?.length) {
		return [];
	}

	// First, group by timesheetId with more flexible validation
	const groupedByTimesheet = items.reduce(
		(acc, item, index) => {
			// More flexible validation - try to work with different data structures
			const timesheetId = item?.timesheet?.id || item?.timesheetId || `fallback-${index}`;
			const createdAt =
				item?.timesheet?.createdAt || item?.createdAt || item?.startedAt || new Date().toISOString();

			if (!item || !createdAt) {
				console.warn('Skipping item with missing timesheet or createdAt:', item);
				return acc;
			}

			if (!acc[timesheetId]) {
				acc[timesheetId] = [];
			}

			// Ensure the item has the expected structure
			const normalizedItem = {
				...item,
				timesheet: {
					...item.timesheet,
					id: timesheetId,
					createdAt: createdAt
				}
			} as ITimeLog;

			acc[timesheetId].push(normalizedItem);
			return acc;
		},
		{} as Record<string, ITimeLog[]>
	);

	// Then, for each timesheet group, group by date and merge all results
	const result: GroupedTimesheet[] = [];
	Object.values(groupedByTimesheet).forEach((timesheetLogs) => {
		const groupedByDate = timesheetLogs.reduce(
			(acc, item) => {
				try {
					const date = new Date(String(item.timesheet?.createdAt)).toISOString().split('T')[0];
					if (!acc[date]) acc[date] = [];
					acc[date].push(item);
				} catch (error) {
					console.error(`Failed to process date for timesheet ${item.timesheet?.id}:`, {
						createdAt: item.timesheet?.createdAt,
						error
					});
				}
				return acc;
			},
			{} as Record<string, ITimeLog[]>
		);

		// Convert grouped dates to array format and add to results
		Object.entries(groupedByDate).forEach(([date, tasks]) => {
			result.push({ date, tasks });
		});
	});

	// Sort by date in descending order
	const sortedResult = result.sort((a, b) => b.date.localeCompare(a.date));

	// Fallback: if no results but we have items, create a simple grouping
	if (sortedResult.length === 0 && items.length > 0) {
		const today = new Date().toISOString().split('T')[0];
		return [
			{
				date: today,
				tasks: items.map(
					(item) =>
						({
							...item,
							timesheet: {
								...item.timesheet,
								id: item.timesheet?.id || item.id || 'fallback',
								createdAt:
									item.timesheet?.createdAt ||
									item.createdAt ||
									item.startedAt ||
									new Date().toISOString()
							}
						}) as ITimeLog
				)
			}
		];
	}

	return sortedResult;
};
const getWeekYearKey = (date: Date): string => {
	try {
		const year = date.getFullYear();
		const startOfYear = new Date(year, 0, 1);
		const days = Math.floor((date.getTime() - startOfYear.getTime()) / (24 * 60 * 60 * 1000));
		const week = Math.ceil((days + startOfYear.getDay() + 1) / 7);
		return `${year}-W${week.toString().padStart(2, '0')}`;
	} catch (error) {
		console.error('Error in getWeekYearKey:', error);
		return '';
	}
};

const getMonthKey = (date: Date): string => {
	try {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${year}-${month}`;
	} catch (error) {
		console.error('Error in getMonthKey:', error);
		return '';
	}
};

type GroupingKeyFunction = (date: Date) => string;

const createGroupingFunction =
	(getKey: GroupingKeyFunction) =>
	(items: ITimeLog[]): GroupedTimesheet[] => {
		if (!items?.length) return [];
		const groupedByDate = items.reduce(
			(acc, item) => {
				// More flexible validation for different data structures
				const createdAt = item?.timesheet?.createdAt || item?.createdAt || item?.startedAt;
				if (!createdAt) {
					console.warn('Skipping item with missing createdAt:', item);
					return acc;
				}

				try {
					const date = new Date(createdAt);
					if (isNaN(date.getTime())) {
						console.warn('Invalid date:', createdAt);
						return acc;
					}

					const key = getKey(date);
					if (!acc[key]) {
						acc[key] = {
							date: key,
							timesheets: {}
						};
					}

					const timesheetId = item?.timesheet?.id || item?.timesheetId || item?.id || 'fallback';
					if (!acc[key].timesheets[timesheetId]) {
						acc[key].timesheets[timesheetId] = [];
					}

					// Ensure the item has the expected structure
					const normalizedItem = {
						...item,
						timesheet: {
							...item?.timesheet,
							id: timesheetId,
							createdAt: createdAt
						}
					} as ITimeLog;

					acc[key].timesheets[timesheetId].push(normalizedItem);
				} catch (error) {
					console.warn('Error processing date:', error);
				}
				return acc;
			},
			{} as Record<string, { date: string; timesheets: Record<string, ITimeLog[]> }>
		);

		return Object.values(groupedByDate)
			.map(({ date, timesheets }) => ({
				date,
				tasks: Object.values(timesheets)
					.flat()
					.sort((a, b) => {
						if (a.timesheet?.id !== b.timesheet?.id) {
							return a.timesheet?.id.localeCompare(String(b.timesheet?.id)) ?? 0;
						}
						const dateA = new Date(String(a.timesheet?.createdAt));
						const dateB = new Date(String(b.timesheet?.createdAt));
						return dateB.getTime() - dateA.getTime();
					})
			}))
			.sort((a, b) => b.date.localeCompare(a.date));
	};

const groupByWeek = createGroupingFunction((date) => getWeekYearKey(date));
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
export function useTimesheet({ startDate, endDate, timesheetViewMode, inputSearch }: TimesheetParams) {
	const { user } = useAuthenticateUser();
	const [timesheet, setTimesheet] = useAtom(timesheetRapportState);
	const queryClient = useQueryClient();
	const {
		employee,
		project,
		task,
		statusState,
		timesheetGroupByDays,
		puTimesheetStatus,
		isUserAllowedToAccess,
		normalizeText,
		setSelectTimesheetId,
		selectTimesheetId,
		handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet
	} = useTimelogFilterOptions();
	const isManage = user && isUserAllowedToAccess(user);
	const [timesheetparams, setTimesheetParams] = useState<{
		organizationId: string;
		tenantId: string;
		startDate: string | Date;
		endDate: string | Date;
		timeZone?: string | undefined;
		projectIds?: string[] | undefined;
		employeeIds?: string[] | undefined;
		taskIds?: string[] | undefined;
		status?: string[] | undefined;
	} | null>(null);

	// React Query for timesheet logs
	const timesheetLogsQuery = useQuery({
		queryKey: queryKeys.timesheet.logs(
			timesheetparams?.tenantId,
			timesheetparams?.organizationId,
			String(timesheetparams?.startDate),
			String(timesheetparams?.endDate),
			timesheetparams?.employeeIds,
			timesheetparams?.projectIds,
			timesheetparams?.taskIds,
			timesheetparams?.status
		),
		queryFn: async () => {
			if (!timesheetparams) {
				throw new Error('Timesheet query parameters are required');
			}
			const response = await timeLogService.getTaskTimesheetLogs(timesheetparams);
			return response.data as unknown as ITimeLog[];
		},
		enabled: !!timesheetparams && !!timesheetparams.startDate && !!timesheetparams.endDate,
		staleTime: 1000 * 60 * 3, // 3 minutes - timesheet data changes moderately
		gcTime: 1000 * 60 * 15 // 15 minutes in cache
	});

	// Mutations
	const deleteTimesheetMutation = useMutation({
		mutationFn: async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			return await timeLogService.deleteTaskTimesheetLogs({
				organizationId: user.employee?.organizationId || '',
				tenantId: user.tenantId ?? '',
				logIds
			});
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const updateTimesheetStatusMutation = useMutation({
		mutationFn: async ({ status, ids }: { status: ETimesheetStatus; ids: string[] | string }) => {
			const idsArray = Array.isArray(ids) ? ids : [ids];
			return await timeSheetService.updateStatusTimesheetFrom({ ids: idsArray, status });
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const createTimesheetMutation = useMutation({
		mutationFn: async (timesheetParams: IUpdateTimesheetRequest) => {
			return await timeLogService.createTimesheetFrom(timesheetParams);
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	const updateTimesheetMutation = useMutation({
		mutationFn: async (timesheet: IUpdateTimesheetRequest) => {
			return await timeLogService.updateTimesheetFrom(timesheet);
		},
		onSuccess: () => {
			invalidateTimesheetData();
		}
	});

	// Invalidate timesheet data
	const invalidateTimesheetData = useCallback(() => {
		queryClient.invalidateQueries({
			queryKey: queryKeys.timesheet.logs(
				timesheetparams?.tenantId,
				timesheetparams?.organizationId,
				String(timesheetparams?.startDate),
				String(timesheetparams?.endDate),
				timesheetparams?.employeeIds,
				timesheetparams?.projectIds,
				timesheetparams?.taskIds,
				timesheetparams?.status
			)
		});
	}, [queryClient, timesheetparams]);

	// Sync React Query data with Jotai state
	useConditionalUpdateEffect(
		() => {
			if (timesheetLogsQuery.data) {
				setTimesheet(timesheetLogsQuery.data);
			}
		},
		[timesheetLogsQuery.data],
		Boolean(timesheet?.length)
	);

	/**
	 * Memoized date range with fallback to defaults
	 * Ensures all dates are converted to Date objects
	 */
	const currentDateRange = useMemo(() => {
		const now = moment();
		// Default to Today (start and end of current day)
		const defaultStart = now.clone().startOf('day').toDate();
		const defaultEnd = now.clone().endOf('day').toDate();

		const parseDate = (date: Date | string | undefined, defaultValue: Date) => {
			if (!date) return defaultValue;
			const parsed = moment(date);
			return parsed.isValid() ? parsed.toDate() : defaultValue;
		};

		return {
			startDate: parseDate(startDate, defaultStart),
			endDate: parseDate(endDate, defaultEnd)
		};
	}, [startDate, endDate]);

	/**
	 * Format date to YYYY-MM-DD ensuring valid date input
	 * @param date - Input date (optional)
	 * @returns Formatted date string
	 */
	const formatDate = useCallback((date: Date | string | undefined): string => {
		if (!date) {
			return moment().format('YYYY-MM-DD');
		}

		if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) {
			return date;
		}

		try {
			const parsedDate = moment(date);
			if (!parsedDate.isValid()) {
				console.warn('Invalid date provided, using current date');
				return moment().format('YYYY-MM-DD');
			}
			return parsedDate.format('YYYY-MM-DD');
		} catch (error) {
			console.warn('Error parsing date:', error);
			return moment().format('YYYY-MM-DD');
		}
	}, []);

	const getTaskTimesheet = useCallback(
		async (params: TimesheetParams) => {
			try {
				if (!user) return;

				const { startDate, endDate } = params;

				const from = moment(startDate).format('YYYY-MM-DD');
				const to = moment(endDate).format('YYYY-MM-DD');

				// Get current filter values at the time of the call, not as dependencies
				const currentEmployee = employee;
				const currentProject = project;
				const currentTask = task;
				const currentStatusState = statusState;

				const queryParams = {
					startDate: from,
					endDate: to,
					organizationId: user.employee?.organizationId || '',
					tenantId: user.tenantId ?? '',
					timeZone: user.timeZone?.split('(')[0].trim() || 'UTC',
					employeeIds: isManage
						? currentEmployee?.map(({ employee }) => employee?.id || '').filter(Boolean)
						: [user.employee?.id || ''],
					projectIds: currentProject?.map((project) => project.id).filter((id) => id !== undefined),
					taskIds: currentTask?.map((task) => task.id).filter((id) => id !== undefined),
					status: currentStatusState?.map((status) => status.value).filter((value) => value !== undefined)
				};

				setTimesheetParams(queryParams);

				const result = await timesheetLogsQuery.refetch();
				return result.data;
			} catch (error) {
				console.error('Error fetching timesheet:', error);
			}
		},
		[timesheetLogsQuery, setTimesheetParams, user, employee, project, task, statusState, isManage]
	);

	// Removed duplicate useEffect - using the one below that handles all dependencies

	const createTimesheet = useCallback(
		async ({ ...timesheetParams }: IUpdateTimesheetRequest) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			try {
				const response = await createTimesheetMutation.mutateAsync(timesheetParams);
				return response.data;
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
		[createTimesheetMutation, user]
	);

	const updateTimesheet = useCallback(
		async (timesheet: IUpdateTimesheetRequest) => {
			if (!user) {
				console.warn('User not authenticated!');
				return;
			}
			try {
				const response = await updateTimesheetMutation.mutateAsync(timesheet);
				return response.data;
			} catch (error) {
				console.error('Error updating the timesheet:', error);
				throw error;
			}
		},
		[updateTimesheetMutation, user]
	);

	const updateTimesheetStatus = useCallback(
		async ({ status, ids }: { status: ETimesheetStatus; ids: string[] | string }) => {
			if (!user) return;
			const idsArray = Array.isArray(ids) ? ids : [ids];
			try {
				await updateTimesheetStatusMutation.mutateAsync({ status, ids: idsArray });
			} catch (error) {
				console.error('Error updating timesheet status:', error);
			}
		},
		[updateTimesheetStatusMutation, user]
	);

	const getStatusTimesheet = (items: ITimeLog[] = []) => {
		const STATUS_MAP: Record<ETimesheetStatus, ITimeLog[]> = {
			[ETimesheetStatus.PENDING]: [],
			[ETimesheetStatus.APPROVED]: [],
			[ETimesheetStatus.DENIED]: [],
			[ETimesheetStatus.DRAFT]: [],
			[ETimesheetStatus.IN_REVIEW]: []
		};

		const result = items.reduce((acc, item) => {
			const status = item.timesheet?.status;

			if (isTimesheetStatus(status)) {
				acc[status].push(item);
			} else {
				console.warn(`Invalid timesheet status: ${status}`, 'item:', item);
			}
			return acc;
		}, STATUS_MAP);
		return result;
	};

	// Type guard
	function isTimesheetStatus(status: unknown): status is ETimesheetStatus {
		const timesheetStatusValues = Object.values(ETimesheetStatus);
		return Object.values(timesheetStatusValues).includes(status as ETimesheetStatus);
	}

	const deleteTaskTimesheet = useCallback(
		async ({ logIds }: { logIds: string[] }) => {
			if (!user) {
				throw new Error('User not authenticated');
			}
			if (!logIds.length) {
				throw new Error('No timesheet IDs provided for deletion');
			}
			try {
				await deleteTimesheetMutation.mutateAsync({ logIds });
			} catch (error) {
				console.error('Failed to delete timesheets:', error);
				throw error;
			}
		},
		[user, deleteTimesheetMutation]
	);

	const groupedByTimesheetIds = ({ rows }: { rows: ITimeLog[] }): Record<string, ITimeLog[]> => {
		if (!rows) {
			return {};
		}
		return rows.reduce(
			(acc, row) => {
				if (!row) {
					return acc;
				}
				const timesheetId = row.timesheetId ?? 'unassigned';
				if (!acc[timesheetId]) {
					acc[timesheetId] = [];
				}
				acc[timesheetId].push(row);
				return acc;
			},
			{} as Record<string, ITimeLog[]>
		);
	};

	const filterDataTimesheet = useMemo(() => {
		if (!timesheet || !inputSearch) {
			return timesheet;
		}
		const searchTerms = normalizeText(inputSearch).split(/\s+/).filter(Boolean);
		if (searchTerms.length === 0) {
			return timesheet;
		}

		const filtered = timesheet.filter((task: any) => {
			const searchableContent = {
				title: normalizeText(task.task?.title),
				employee: normalizeText(task.employee?.fullName),
				project: normalizeText(task.project?.name)
			};
			return searchTerms.every((term) =>
				Object.values(searchableContent).some((content) => content.includes(term))
			);
		});
		return filtered;
	}, [timesheet, inputSearch, normalizeText]);

	const reGroupByDate = (groupedTimesheets: GroupedTimesheet[]): GroupedTimesheet[] => {
		return groupedTimesheets.reduce((acc, { date, tasks }) => {
			const existingGroup = acc.find((group) => group.date === date);
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
			const groupedTimesheets = groupByDate(filterDataTimesheet as any);
			const reGroupedByDate = reGroupByDate(groupedTimesheets);
			switch (timesheetGroupByDays) {
				case 'Daily':
					return reGroupedByDate;
				case 'Weekly':
					return groupByWeek(filterDataTimesheet as any);
				case 'Monthly':
					return groupByMonth(filterDataTimesheet as any);
				default:
					return reGroupedByDate;
			}
		}
		return reGroupByDate(groupByDate(filterDataTimesheet as any));
	}, [timesheet, timesheetViewMode, filterDataTimesheet, timesheetGroupByDays]);

	const rowsToObject = (rows: ITimeLog[]): Record<string, { task: ITimeLog; status: ETimesheetStatus }> => {
		return rows.reduce(
			(acc, row) => {
				acc[row.timesheet?.id ?? ''] = { task: row, status: row.timesheet?.status ?? ETimesheetStatus.DRAFT };
				return acc;
			},
			{} as Record<string, { task: ITimeLog; status: ETimesheetStatus }>
		);
	};

	// React Query automatically handles refetching when query key changes
	// No manual useEffect needed for data fetching

	return {
		loadingTimesheet: timesheetLogsQuery.isLoading,
		timesheet: timesheetElementGroup,
		getTaskTimesheet,
		loadingDeleteTimesheet: deleteTimesheetMutation.isPending,
		deleteTaskTimesheet,
		getStatusTimesheet,
		timesheetGroupByDays,
		statusTimesheet: getStatusTimesheet((filterDataTimesheet as ITimeLog[]) || []),
		updateTimesheetStatus,
		loadingUpdateTimesheetStatus: updateTimesheetStatusMutation.isPending,
		puTimesheetStatus,
		createTimesheet,
		loadingCreateTimesheet: createTimesheetMutation.isPending,
		updateTimesheet,
		loadingUpdateTimesheet: updateTimesheetMutation.isPending,
		groupByDate,
		isManage,
		normalizeText,
		setSelectTimesheetId,
		selectTimesheetId,
		handleSelectRowByStatusAndDate,
		handleSelectRowTimesheet,
		groupedByTimesheetIds,
		rowsToObject,
		formatDate,
		currentDateRange
	};
}
