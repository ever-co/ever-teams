import { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import { ETimesheetStatus } from '@/core/types/generics/enums/timesheet';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TimesheetParams {
	startDate?: Date | string;
	endDate?: Date | string;
	timesheetViewMode?: 'ListView' | 'CalendarView';
	inputSearch?: string;
}

export interface GroupedTimesheet {
	date: string;
	tasks: ITimeLog[];
}

export type GroupingKeyFunction = (date: Date) => string;

// ─── Deep Array Comparison ───────────────────────────────────────────────────

export const areArraysEqual = <T>(
	arr1: T[] | undefined,
	arr2: T[] | undefined,
	keyExtractor: (item: T) => string | number
): boolean => {
	if (!arr1 && !arr2) return true;
	if (!arr1 || !arr2) return false;
	if (arr1.length !== arr2.length) return false;
	const keys1 = arr1.map(keyExtractor).sort();
	const keys2 = arr2.map(keyExtractor).sort();
	return keys1.every((key, index) => key === keys2[index]);
};

// ─── Date Key Extractors ─────────────────────────────────────────────────────

export const getWeekYearKey = (date: Date): string => {
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

export const getMonthKey = (date: Date): string => {
	try {
		const year = date.getFullYear();
		const month = (date.getMonth() + 1).toString().padStart(2, '0');
		return `${year}-${month}`;
	} catch (error) {
		console.error('Error in getMonthKey:', error);
		return '';
	}
};

// ─── Grouping Factory ────────────────────────────────────────────────────────

export const createGroupingFunction =
	(getKey: GroupingKeyFunction) =>
	(items: ITimeLog[]): GroupedTimesheet[] => {
		if (!items?.length) return [];
		const grouped = items.reduce(
			(acc, item) => {
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
						acc[key] = { date: key, timesheets: {} };
					}
					const timesheetId = item?.timesheet?.id || item?.timesheetId || item?.id || 'fallback';
					if (!acc[key].timesheets[timesheetId]) {
						acc[key].timesheets[timesheetId] = [];
					}
					acc[key].timesheets[timesheetId].push({
						...item,
						timesheet: { ...item?.timesheet, id: timesheetId, createdAt }
					} as ITimeLog);
				} catch (error) {
					console.warn('Error processing date:', error);
				}
				return acc;
			},
			{} as Record<string, { date: string; timesheets: Record<string, ITimeLog[]> }>
		);

		return Object.values(grouped)
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

export const groupByWeek = createGroupingFunction((date) => getWeekYearKey(date));
export const groupByMonth = createGroupingFunction(getMonthKey);


// ─── Group by Date (Daily) ───────────────────────────────────────────────────

export const groupByDate = (items: ITimeLog[]): GroupedTimesheet[] => {
	if (!items?.length) return [];

	const groupedByTimesheet = items.reduce(
		(acc, item, index) => {
			const timesheetId = item?.timesheet?.id || item?.timesheetId || `fallback-${index}`;
			const createdAt =
				item?.timesheet?.createdAt || item?.createdAt || item?.startedAt || new Date().toISOString();
			if (!item || !createdAt) return acc;
			if (!acc[timesheetId]) acc[timesheetId] = [];
			acc[timesheetId].push({
				...item,
				timesheet: { ...item.timesheet, id: timesheetId, createdAt }
			} as ITimeLog);
			return acc;
		},
		{} as Record<string, ITimeLog[]>
	);

	const result: GroupedTimesheet[] = [];
	Object.values(groupedByTimesheet).forEach((timesheetLogs) => {
		const byDate = timesheetLogs.reduce(
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
		Object.entries(byDate).forEach(([date, tasks]) => result.push({ date, tasks }));
	});

	const sorted = result.sort((a, b) => b.date.localeCompare(a.date));

	if (sorted.length === 0 && items.length > 0) {
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
									item.timesheet?.createdAt || item.createdAt || item.startedAt || new Date().toISOString()
							}
						}) as ITimeLog
				)
			}
		];
	}

	return sorted;
};

// ─── Re-group by Date (merge duplicates) ────────────────────────────────────

export const reGroupByDate = (groupedTimesheets: GroupedTimesheet[]): GroupedTimesheet[] => {
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

// ─── Status Grouping ─────────────────────────────────────────────────────────

/** Type guard for ETimesheetStatus */
export function isTimesheetStatus(status: unknown): status is ETimesheetStatus {
	const timesheetStatusValues = Object.values(ETimesheetStatus);
	return Object.values(timesheetStatusValues).includes(status as ETimesheetStatus);
}

/** Group time logs by their timesheet status */
export const getStatusTimesheet = (items: ITimeLog[] = []): Record<ETimesheetStatus, ITimeLog[]> => {
	const STATUS_MAP: Record<ETimesheetStatus, ITimeLog[]> = {
		[ETimesheetStatus.PENDING]: [],
		[ETimesheetStatus.APPROVED]: [],
		[ETimesheetStatus.DENIED]: [],
		[ETimesheetStatus.DRAFT]: [],
		[ETimesheetStatus.IN_REVIEW]: []
	};

	return items.reduce((acc, item) => {
		const status = item.timesheet?.status;
		if (isTimesheetStatus(status)) {
			acc[status].push(item);
		} else {
			console.warn(`Invalid timesheet status: ${status}`, 'item:', item);
		}
		return acc;
	}, STATUS_MAP);
};

// ─── Timesheet ID Grouping ───────────────────────────────────────────────────

/** Group time log rows by their timesheetId */
export const groupedByTimesheetIds = ({ rows }: { rows: ITimeLog[] }): Record<string, ITimeLog[]> => {
	if (!rows) return {};
	return rows.reduce(
		(acc, row) => {
			if (!row) return acc;
			const timesheetId = row.timesheetId ?? 'unassigned';
			if (!acc[timesheetId]) acc[timesheetId] = [];
			acc[timesheetId].push(row);
			return acc;
		},
		{} as Record<string, ITimeLog[]>
	);
};

// ─── Rows to Object ──────────────────────────────────────────────────────────

/** Convert time log rows to a record keyed by timesheet ID */
export const rowsToObject = (rows: ITimeLog[]): Record<string, { task: ITimeLog; status: ETimesheetStatus }> => {
	return rows.reduce(
		(acc, row) => {
			acc[row.timesheet?.id ?? ''] = { task: row, status: row.timesheet?.status ?? ETimesheetStatus.DRAFT };
			return acc;
		},
		{} as Record<string, { task: ITimeLog; status: ETimesheetStatus }>
	);
};
