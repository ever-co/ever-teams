'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { formatPeriod, type Period, periodOfPreset } from '@/core/lib/utils/dashboard-period';
import {
	ALL_STATUSES,
	distinctMemberCountOf,
	groupLogsByWorkDay,
	isOrganizationRole,
	isOwnLog,
	isTimesheetView,
	logMatchesPickedProjectsAndTasks,
	logMatchesSearch,
	logMatchesStatus,
	nextSortOf,
	normalizedSearchTextOf,
	periodForView,
	sortedWithinDays,
	statusSummaryOf,
	TIMESHEET_WEEK_START,
	timesheetFormattersOf,
	type TimesheetSort,
	type TimesheetSortKey,
	type TimesheetStatusFilter,
	type TimesheetView,
	totalDurationOf
} from '@/core/lib/utils/dashboards/timesheets';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { SheetEditingSource } from './use-sheet-editing';
import { useTimesheetPageLogs } from './use-timesheet-page-logs';

export type TimesheetFilterField = 'members' | 'projects' | 'tasks';

export type TimesheetFilterSelection = Record<TimesheetFilterField, string[]>;

const EMPTY_FILTERS: TimesheetFilterSelection = { members: [], projects: [], tasks: [] };

const NO_LOGS: ITimeLog[] = [];

const VIEW_STORAGE_KEY = 'timesheets-view';

const APPROVE_PERMISSION = 'CAN_APPROVE_TIMESHEET';

/** Days rendered at once in the list; more come with "Show more days". */
export const DAYS_PER_STEP = 20;

export interface TimesheetPermissions {
	/** Organisation roles (super admin, admin, manager): add time, edit and delete any log. */
	hasOrganizationRole: boolean;
	/** Organisation roles and team managers: see and filter other members. */
	isManage: boolean;
	canApprove: boolean;
	userId: string | null;
	employeeId: string | null;
}

export function canEditLog(log: ITimeLog, permissions: TimesheetPermissions) {
	if (permissions.hasOrganizationRole) {
		return true;
	}
	return isOwnLog(log, { userId: permissions.userId, employeeId: permissions.employeeId });
}

/** The week sheet is the page's default view; a view picked before stays the one the page reopens on. */
function viewOf(stored: string): TimesheetView {
	if (isTimesheetView(stored)) {
		return stored;
	}
	return 'sheet';
}

function scopeEmployeeIdsOf(isManage: boolean, pickedMembers: string[], ownEmployeeId: string | null): string[] {
	if (isManage) {
		return pickedMembers;
	}
	if (ownEmployeeId) {
		return [ownEmployeeId];
	}
	return [];
}

/** Today, as the old page opened, or the week or month around it when the page opens on the sheet or a calendar. */
function initialPeriodFor(view: TimesheetView): Period {
	const today = periodOfPreset('today', TIMESHEET_WEEK_START);
	return periodForView(today, view);
}

function withValuesToggled(current: string[], values: string[], shouldSelect: boolean) {
	const others = current.filter((id) => !values.includes(id));
	if (shouldSelect) {
		return [...others, ...values];
	}
	return others;
}

/**
 * Everything the Timesheets page shows, computed once per data change: the period and its logs, the page-level
 * filters (members go to Gauzy, projects, tasks, search and status narrow the loaded logs), the figures of the
 * toolbar and of the status strip, the days of the list, the selection and who may do what.
 */
export function useTimesheetsPage() {
	const locale = useLocale();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { isTeamManager } = useIsMemberManager(user);
	const { myPermissions } = useMyRolePermissionsQuery();

	const [storedView, setStoredView] = useLocalStorageState<string>(VIEW_STORAGE_KEY, 'sheet');
	const [period, setPeriod] = useState<Period>(() => initialPeriodFor(viewOf(storedView)));
	const [statusFilter, setStatusFilter] = useState<TimesheetStatusFilter>(ALL_STATUSES);
	const [search, setSearch] = useState('');
	const [filters, setFilters] = useState<TimesheetFilterSelection>(EMPTY_FILTERS);
	const [selectedIds, setSelectedIds] = useState<string[]>([]);
	const [focusedDayKey, setFocusedDayKey] = useState<string | null>(null);
	const [collapsedDayKeys, setCollapsedDayKeys] = useState<string[]>([]);
	const [visibleDayCount, setVisibleDayCount] = useState(DAYS_PER_STEP);
	const [sort, setSort] = useState<TimesheetSort | null>(null);

	const view = viewOf(storedView);
	const roleName = user?.role?.name;
	const hasOrganizationRole = isOrganizationRole(roleName);
	const isManage = hasOrganizationRole || isTeamManager;
	const canApprove = myPermissions.includes(APPROVE_PERMISSION);
	const ownEmployeeId = user?.employee?.id ?? null;
	const userId = user?.id ?? null;

	const permissions = useMemo<TimesheetPermissions>(
		() => ({ hasOrganizationRole, isManage, canApprove, userId, employeeId: ownEmployeeId }),
		[canApprove, hasOrganizationRole, isManage, ownEmployeeId, userId]
	);

	const employeeIds = useMemo(
		() => scopeEmployeeIdsOf(isManage, filters.members, ownEmployeeId),
		[filters.members, isManage, ownEmployeeId]
	);

	const isTeamKnown = hasOrganizationRole || Boolean(activeTeam);
	const hasScope = isManage || Boolean(ownEmployeeId);
	const logsQuery = useTimesheetPageLogs(period, {
		tenantId: user?.tenantId,
		organizationId: user?.employee?.organizationId,
		userTimeZone: user?.timeZone,
		employeeIds,
		isEnabled: isTeamKnown && hasScope
	});

	const hasOwnData = Boolean(logsQuery.data) && !logsQuery.isPlaceholderData;
	const showsError = logsQuery.isError && !hasOwnData;
	const isInitialLoading = !logsQuery.data && !showsError;
	const hasShownData = Boolean(logsQuery.data);
	const isUpdating = logsQuery.isFetching && hasShownData;

	const allLogs = useMemo(() => {
		if (showsError) {
			return NO_LOGS;
		}
		return logsQuery.data ?? NO_LOGS;
	}, [logsQuery.data, showsError]);

	const normalizedQuery = useMemo(() => normalizedSearchTextOf(search), [search]);

	const narrowedLogs = useMemo(() => {
		const byProjectAndTask = allLogs.filter((log) =>
			logMatchesPickedProjectsAndTasks(log, filters.projects, filters.tasks)
		);
		return byProjectAndTask.filter((log) => logMatchesSearch(log, normalizedQuery));
	}, [allLogs, filters.projects, filters.tasks, normalizedQuery]);

	const statusSummary = useMemo(() => statusSummaryOf(narrowedLogs), [narrowedLogs]);

	const shownLogs = useMemo(
		() => narrowedLogs.filter((log) => logMatchesStatus(log, statusFilter)),
		[narrowedLogs, statusFilter]
	);

	const days = useMemo(() => {
		const workDays = groupLogsByWorkDay(shownLogs);
		return sortedWithinDays(workDays, sort);
	}, [shownLogs, sort]);

	const periodFigures = useMemo(() => {
		const totalSeconds = totalDurationOf(allLogs);
		const memberCount = distinctMemberCountOf(allLogs);
		return { totalSeconds, memberCount };
	}, [allLogs]);

	const shownIdSet = useMemo(() => {
		const shownIds = shownLogs.map((log) => log.id);
		return new Set(shownIds);
	}, [shownLogs]);

	const selectedIdSet = useMemo(() => {
		const visible = selectedIds.filter((id) => shownIdSet.has(id));
		return new Set(visible);
	}, [selectedIds, shownIdSet]);

	const selectedLogs = useMemo(
		() => shownLogs.filter((log) => selectedIdSet.has(log.id)),
		[selectedIdSet, shownLogs]
	);

	const formatters = useMemo(() => timesheetFormattersOf(locale), [locale]);
	const periodText = formatPeriod(period, locale);

	const hasMemberFilter = filters.members.length > 0;
	const isPeriodEmpty = allLogs.length === 0 && !hasMemberFilter;
	const showsOwnDiaryOnly = !isManage || isOnlyOwnMember(filters.members, ownEmployeeId);

	const changeView = useCallback(
		(nextView: TimesheetView) => {
			setStoredView(nextView);
			setPeriod((current) => periodForView(current, nextView));
		},
		[setStoredView]
	);

	const setFilter = useCallback((field: TimesheetFilterField, values: string[]) => {
		setFilters((current) => ({ ...current, [field]: values }));
	}, []);

	const removeFilterValue = useCallback((field: TimesheetFilterField, value: string) => {
		setFilters((current) => {
			const remaining = current[field].filter((item) => item !== value);
			return { ...current, [field]: remaining };
		});
	}, []);

	const clearFilters = useCallback(() => {
		setFilters(EMPTY_FILTERS);
	}, []);

	const clearNarrowing = useCallback(() => {
		setFilters(EMPTY_FILTERS);
		setSearch('');
		setStatusFilter(ALL_STATUSES);
	}, []);

	const toggleLog = useCallback((logId: string) => {
		setSelectedIds((current) => {
			const isSelected = current.includes(logId);
			if (isSelected) {
				return current.filter((id) => id !== logId);
			}
			return [...current, logId];
		});
	}, []);

	const setLogsSelected = useCallback((logIds: string[], shouldSelect: boolean) => {
		setSelectedIds((current) => withValuesToggled(current, logIds, shouldSelect));
	}, []);

	const clearSelection = useCallback(() => {
		setSelectedIds([]);
	}, []);

	const sortBy = useCallback((key: TimesheetSortKey) => {
		setSort((current) => nextSortOf(current, key));
	}, []);

	const toggleDay = useCallback((dayKey: string) => {
		setCollapsedDayKeys((current) => {
			const isCollapsed = current.includes(dayKey);
			if (isCollapsed) {
				return current.filter((key) => key !== dayKey);
			}
			return [...current, dayKey];
		});
	}, []);

	const showMoreDays = useCallback(() => {
		setVisibleDayCount((current) => current + DAYS_PER_STEP);
	}, []);

	const openDayInList = useCallback(
		(dayKey: string) => {
			const dayIndex = days.findIndex((day) => day.key === dayKey);
			const neededCount = dayIndex + 1;
			setStoredView('list');
			setVisibleDayCount((current) => Math.max(current, neededCount));
			setCollapsedDayKeys((current) => current.filter((key) => key !== dayKey));
			setFocusedDayKey(dayKey);
		},
		[days, setStoredView]
	);

	const clearFocusedDay = useCallback(() => {
		setFocusedDayKey(null);
	}, []);

	return {
		user,
		activeTeam,
		permissions,
		period,
		setPeriod,
		periodText,
		view,
		changeView,
		statusFilter,
		setStatusFilter,
		search,
		setSearch,
		filters,
		setFilter,
		removeFilterValue,
		clearFilters,
		clearNarrowing,
		logsQuery,
		allLogs,
		shownLogs,
		days,
		statusSummary,
		periodFigures,
		formatters,
		showsError,
		isInitialLoading,
		isUpdating,
		isPeriodEmpty,
		showsOwnDiaryOnly,
		selectedIdSet,
		selectedLogs,
		toggleLog,
		setLogsSelected,
		clearSelection,
		focusedDayKey,
		openDayInList,
		clearFocusedDay,
		collapsedDayKeys,
		toggleDay,
		visibleDayCount,
		showMoreDays,
		sort,
		sortBy
	};
}

function isOnlyOwnMember(pickedMembers: string[], ownEmployeeId: string | null) {
	const hasOnePick = pickedMembers.length === 1;
	const isOwnPick = pickedMembers[0] === ownEmployeeId;
	return hasOnePick && isOwnPick;
}

export type TimesheetsPageState = ReturnType<typeof useTimesheetsPage>;

/** A status, search, project or task filter shows only part of a cell's time, so the sheet cannot be edited under it. */
function isNarrowed(page: TimesheetsPageState) {
	const hasStatus = page.statusFilter !== ALL_STATUSES;
	const hasSearch = page.search.trim().length > 0;
	const hasProjects = page.filters.projects.length > 0;
	const hasTasks = page.filters.tasks.length > 0;
	return hasStatus || hasSearch || hasProjects || hasTasks;
}

export function sheetEditingSourceOf(page: TimesheetsPageState): SheetEditingSource {
	const { logsQuery, permissions, user } = page;
	const hasData = Boolean(logsQuery.data);
	const hasPeriodLogs = hasData && !logsQuery.isPlaceholderData;
	return {
		ownEmployeeId: permissions.employeeId,
		hasOrganizationRole: permissions.hasOrganizationRole,
		period: page.period,
		periodLogs: page.allLogs,
		hasPeriodLogs,
		isFiltered: isNarrowed(page),
		tenantId: user?.tenantId,
		organizationId: user?.employee?.organizationId,
		userTimeZone: user?.timeZone
	};
}
