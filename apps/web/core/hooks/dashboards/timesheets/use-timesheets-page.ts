'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useTranslations } from 'next-intl';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useIsMemberManager } from '@/core/hooks/organizations/teams/use-team-member';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useLocalStorageState } from '@/core/hooks/common/use-local-storage-state';
import { useReportClientChoices, useReportProjectClients } from '@/core/hooks/dashboards/use-report-clients';
import { useReportUrlFilters } from '@/core/hooks/dashboards/use-report-url-filters';
import { useEntryLabelsSupport } from '@/core/hooks/timer/use-entry-labels-support';
import { supportedEntryLabelsOf } from '@/core/lib/utils/time-log-labels';
import { useBreaksAllowed } from '@/core/hooks/timer/use-breaks-allowed';
import { activeTeamState } from '@/core/stores/teams/organization-team';
import { shellSettledState } from '@/core/stores/common/shell';
import { formatPeriod, type Period, periodOfPreset, type WeekStart } from '@/core/lib/utils/dashboard-period';
import {
	isReportUrlFilterField,
	logMatchesReportFilters,
	type ReportUrlFilterField
} from '@/core/lib/utils/dashboards/report-filters';
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
	timesheetFormattersOf,
	type TimesheetSort,
	type TimesheetSortKey,
	type TimesheetStatusFilter,
	type TimesheetView,
	totalDurationOf
} from '@/core/lib/utils/dashboards/timesheets';
import { breakSecondsOf, isBreakLog } from '@/core/lib/utils/timer/timer-break';
import {
	isMembershipInEffect,
	membershipEmployeeIdOf,
	type TimesheetReviewer
} from '@/core/lib/helpers/timesheet-review';
import { useTimesheetReviewer } from '@/core/hooks/timesheet/use-timesheet-review';
import type { ITimeLog } from '@/core/types/interfaces/timer/time-log/time-log';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { SheetEditingSource } from './use-sheet-editing';
import { useWorkspaceLocale } from '@/core/hooks/common/use-workspace-locale';
import { useWorkspaceWeekPeriod } from '@/core/hooks/common/use-workspace-week-period';
import { useWorkspaceWeekStart } from '@/core/hooks/common/use-workspace-week-start';
import { useTimesheetPageLogs } from './use-timesheet-page-logs';

/** Members, projects and tasks last as long as the page; clients, billable and labels live in the page link. */
type PageFilterField = 'members' | 'projects' | 'tasks';

export type TimesheetFilterField = PageFilterField | ReportUrlFilterField;

export type TimesheetFilterSelection = Record<TimesheetFilterField, string[]>;

type PageFilterSelection = Record<PageFilterField, string[]>;

const EMPTY_FILTERS: PageFilterSelection = { members: [], projects: [], tasks: [] };

const NO_LOGS: ITimeLog[] = [];

const NO_TEAM_MEMBERS: TOrganizationTeamEmployee[] = [];

const VIEW_STORAGE_KEY = 'timesheets-view';

const APPROVE_PERMISSION = 'CAN_APPROVE_TIMESHEET';

/** Days rendered at once in the list; more come with "Show more days". */
export const DAYS_PER_STEP = 20;

export interface TimesheetPermissions {
	/** Organisation roles (super admin, admin, manager): add time, edit and delete any log. */
	hasOrganizationRole: boolean;
	/** Organisation roles and team managers: see and filter other members. */
	isManage: boolean;
	/** CAN_APPROVE_TIMESHEET: any status on any timesheet. */
	canApprove: boolean;
	userId: string | null;
	employeeId: string | null;
	/**
	 * The reviewer of the team manager rule (getAllowedTimesheetStatuses): approve and reject the timesheets of the
	 * members of the teams the reader manages, never their own. A page without it reviews by canApprove alone.
	 */
	reviewer?: TimesheetReviewer | null;
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

interface EmployeeScope {
	hasOrganizationRole: boolean;
	isTeamManager: boolean;
	pickedMembers: string[];
	teamMembers: ReadonlyArray<TOrganizationTeamEmployee>;
	ownEmployeeId: string | null;
}

function ownScopeOf(ownEmployeeId: string | null): string[] {
	if (ownEmployeeId) {
		return [ownEmployeeId];
	}
	return [];
}

/** The employees of the team's memberships in effect, the manager's own included, each once. */
function teamMemberIdsInEffectOf(teamMembers: ReadonlyArray<TOrganizationTeamEmployee>): string[] {
	const employeeIds = new Set<string>();
	for (const member of teamMembers) {
		const employeeId = membershipEmployeeIdOf(member);
		if (employeeId && isMembershipInEffect(member)) {
			employeeIds.add(employeeId);
		}
	}
	return [...employeeIds];
}

/**
 * Whose time the page asks for. An organization role sends the members picked, or none to read everyone it may see.
 * Gauzy gives a team manager without one the time of other members only when the request names them and the
 * manager manages every one (#5622), so until members are picked the page names those of the active team. Anyone
 * else asks for their own time.
 */
function scopeEmployeeIdsOf(scope: EmployeeScope): string[] {
	const isManage = scope.hasOrganizationRole || scope.isTeamManager;
	if (!isManage) {
		return ownScopeOf(scope.ownEmployeeId);
	}
	const hasPickedMembers = scope.pickedMembers.length > 0;
	if (hasPickedMembers || scope.hasOrganizationRole) {
		return scope.pickedMembers;
	}
	return teamMemberIdsInEffectOf(scope.teamMembers);
}

/** Today, as the old page opened, or the week or month around it when the page opens on the sheet or a calendar. */
function initialPeriodFor(view: TimesheetView, weekStart: WeekStart): Period {
	const today = periodOfPreset('today', weekStart);
	return periodForView(today, view, weekStart);
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
 * filters (members go to Gauzy; projects, tasks, clients, billable time, labels, search and status narrow the loaded
 * logs, which hold every log of the period), the figures of the toolbar and of the status strip, the days of the
 * list, the selection and who may do what.
 */
/** The breaks are asked only where they are on, so the read stays the one sent before breaks otherwise. */
function breaksReadOf(allowsBreaks: boolean): { withBreaks?: true } {
	if (allowsBreaks) {
		return { withBreaks: true };
	}
	return {};
}

export function useTimesheetsPage() {
	const locale = useWorkspaceLocale();
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const { isTeamManager } = useIsMemberManager(user);
	const { myPermissions } = useMyRolePermissionsQuery();

	const [storedView, setStoredView] = useLocalStorageState<string>(VIEW_STORAGE_KEY, 'sheet');
	const weekStart = useWorkspaceWeekStart();
	const openingView = viewOf(storedView);
	const defaultPeriodOf = useCallback((start: WeekStart) => initialPeriodFor(openingView, start), [openingView]);
	const [period, setPeriod] = useWorkspaceWeekPeriod(defaultPeriodOf);
	const [statusFilter, setStatusFilter] = useState<TimesheetStatusFilter>(ALL_STATUSES);
	const [search, setSearch] = useState('');
	const [pageFilters, setPageFilters] = useState<PageFilterSelection>(EMPTY_FILTERS);
	const {
		filters: linkedFilters,
		setFilter: setLinkedFilter,
		removeFilterValue: removeLinkedFilterValue,
		clearFilters: clearLinkedFilters
	} = useReportUrlFilters();
	const filters = useMemo<TimesheetFilterSelection>(
		() => ({ ...pageFilters, ...linkedFilters }),
		[linkedFilters, pageFilters]
	);
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
	const reviewer = useTimesheetReviewer();

	const permissions = useMemo<TimesheetPermissions>(
		() => ({ hasOrganizationRole, isManage, canApprove, userId, employeeId: ownEmployeeId, reviewer }),
		[canApprove, hasOrganizationRole, isManage, ownEmployeeId, reviewer, userId]
	);

	const teamMembers = activeTeam?.members ?? NO_TEAM_MEMBERS;
	const employeeIds = useMemo(
		() =>
			scopeEmployeeIdsOf({
				hasOrganizationRole,
				isTeamManager,
				pickedMembers: filters.members,
				teamMembers,
				ownEmployeeId
			}),
		[filters.members, hasOrganizationRole, isTeamManager, ownEmployeeId, teamMembers]
	);

	const isTeamKnown = hasOrganizationRole || Boolean(activeTeam);
	const hasScope = isManage || Boolean(ownEmployeeId);
	// Breaks are listed among the entries only where the organization turned them on (#5216)
	const allowsBreaks = useBreaksAllowed();
	const supportsEntryLabels = useEntryLabelsSupport();
	// A link's entry labels count only where the API stores them (#5368): elsewhere they would hide every entry
	const effectiveFilters = useMemo(
		() => ({
			...linkedFilters,
			entryLabels: supportedEntryLabelsOf(linkedFilters.entryLabels, supportsEntryLabels)
		}),
		[linkedFilters, supportsEntryLabels]
	);
	const logsQuery = useTimesheetPageLogs(
		period,
		{
			tenantId: user?.tenantId,
			organizationId: user?.employee?.organizationId,
			userTimeZone: user?.timeZone,
			employeeIds,
			isEnabled: isTeamKnown && hasScope
		},
		{ withTaskLabels: true, withEntryLabels: supportsEntryLabels, ...breaksReadOf(allowsBreaks) }
	);

	// A log names its project and nothing about that project's client, so the client filter waits for the projects.
	// They are read with the page, archived ones included: read only once a client was picked, the report went behind
	// its skeleton until they came (#5357). With them read, a client picked narrows the report at once. Nothing on the
	// first screen waits for them without a client filter, so they are then asked once the shell has settled (shell.ts).
	const hasClientFilter = linkedFilters.clients.length > 0;
	const shellSettled = useAtomValue(shellSettledState);
	const readsProjectClients = hasClientFilter || shellSettled;
	const projectClients = useReportProjectClients({ includesArchived: true, isEnabled: readsProjectClients });
	const clientChoices = useReportClientChoices(projectClients.projects);
	const isClientLookupPending = hasClientFilter && projectClients.isPending;
	const isClientLookupError = hasClientFilter && projectClients.isError;

	const hasOwnData = Boolean(logsQuery.data) && !logsQuery.isPlaceholderData;
	const isLogsError = logsQuery.isError && !hasOwnData;
	const showsError = isLogsError || isClientLookupError;
	const isWaitingForData = !logsQuery.data || isClientLookupPending;
	const isInitialLoading = isWaitingForData && !showsError;
	const hasShownData = Boolean(logsQuery.data);
	const isUpdating = logsQuery.isFetching && hasShownData;

	const allLogs = useMemo(() => {
		// Until the projects are read, a client filter cannot tell whose time a log is: nothing is shown, so nothing is
		// exported with the hours of archived projects left out (or counted as having no client)
		if (showsError || isClientLookupPending) {
			return NO_LOGS;
		}
		return logsQuery.data ?? NO_LOGS;
	}, [isClientLookupPending, logsQuery.data, showsError]);

	const normalizedQuery = useMemo(() => normalizedSearchTextOf(search), [search]);
	const t = useTranslations();
	const hiddenProjectLabel = t('common.PRIVATE_PROJECT');

	const projectClientIds = projectClients.clientIds;
	const filteredLogs = useMemo(() => {
		const byProjectAndTask = allLogs.filter((log) =>
			logMatchesPickedProjectsAndTasks(log, pageFilters.projects, pageFilters.tasks)
		);
		return byProjectAndTask.filter((log) => logMatchesReportFilters(log, effectiveFilters, projectClientIds));
	}, [allLogs, effectiveFilters, pageFilters.projects, pageFilters.tasks, projectClientIds]);

	const narrowedLogs = useMemo(
		() => filteredLogs.filter((log) => logMatchesSearch(log, normalizedQuery, hiddenProjectLabel)),
		[filteredLogs, hiddenProjectLabel, normalizedQuery]
	);

	const statusSummary = useMemo(() => statusSummaryOf(narrowedLogs), [narrowedLogs]);

	const shownLogs = useMemo(
		() => narrowedLogs.filter((log) => logMatchesStatus(log, statusFilter)),
		[narrowedLogs, statusFilter]
	);

	const days = useMemo(() => {
		const workDays = groupLogsByWorkDay(shownLogs);
		return sortedWithinDays(workDays, sort);
	}, [shownLogs, sort]);

	// The total beside the title follows the filter menu, so it always matches the rows the filters keep. It is worked
	// time: the breaks have a figure of their own, and a member who only took breaks did not work
	const periodFigures = useMemo(() => {
		const totalSeconds = totalDurationOf(filteredLogs);
		const workLogs = filteredLogs.filter((log) => !isBreakLog(log));
		const memberCount = distinctMemberCountOf(workLogs);
		const breakSeconds = breakSecondsOf(filteredLogs);
		return { totalSeconds, memberCount, breakSeconds };
	}, [filteredLogs]);

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
			setPeriod((current) => periodForView(current, nextView, weekStart));
		},
		[setPeriod, setStoredView, weekStart]
	);

	const setFilter = useCallback(
		(field: TimesheetFilterField, values: string[]) => {
			if (isReportUrlFilterField(field)) {
				setLinkedFilter(field, values);
				return;
			}
			setPageFilters((current) => ({ ...current, [field]: values }));
		},
		[setLinkedFilter]
	);

	const removeFilterValue = useCallback(
		(field: TimesheetFilterField, value: string) => {
			if (isReportUrlFilterField(field)) {
				removeLinkedFilterValue(field, value);
				return;
			}
			setPageFilters((current) => {
				const remaining = current[field].filter((item) => item !== value);
				return { ...current, [field]: remaining };
			});
		},
		[removeLinkedFilterValue]
	);

	const clearFilters = useCallback(() => {
		setPageFilters(EMPTY_FILTERS);
		clearLinkedFilters();
	}, [clearLinkedFilters]);

	const clearNarrowing = useCallback(() => {
		setPageFilters(EMPTY_FILTERS);
		clearLinkedFilters();
		setSearch('');
		setStatusFilter(ALL_STATUSES);
	}, [clearLinkedFilters]);

	const { refetch: refetchLogs } = logsQuery;
	const { refetch: refetchProjectClients } = projectClients;
	const retry = useCallback(() => {
		if (isLogsError) {
			void refetchLogs();
		}
		if (isClientLookupError) {
			refetchProjectClients();
		}
	}, [isClientLookupError, isLogsError, refetchLogs, refetchProjectClients]);

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
		supportsEntryLabels,
		setFilter,
		removeFilterValue,
		clearFilters,
		clearNarrowing,
		clientChoices,
		canFilterByClient: projectClients.canTellClients,
		retry,
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

/**
 * Every filter but the member one shows only part of a member's time (status, search, project, task, client, billable
 * time, label), so the sheet cannot be edited under it.
 */
function isNarrowed(page: TimesheetsPageState) {
	const hasStatus = page.statusFilter !== ALL_STATUSES;
	const hasSearch = page.search.trim().length > 0;
	const hasProjects = page.filters.projects.length > 0;
	const hasTasks = page.filters.tasks.length > 0;
	const hasClients = page.filters.clients.length > 0;
	const hasBillable = page.filters.billable.length > 0;
	const hasLabels = page.filters.labels.length > 0;
	// A link's entry labels the API cannot apply hide nothing, so they leave the sheet open (#5368)
	const hasEntryLabels = supportedEntryLabelsOf(page.filters.entryLabels, page.supportsEntryLabels).length > 0;
	const activeFilters = [
		hasStatus,
		hasSearch,
		hasProjects,
		hasTasks,
		hasClients,
		hasBillable,
		hasLabels,
		hasEntryLabels
	];
	return activeFilters.some(Boolean);
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
		userTimeZone: user?.timeZone,
		withEntryLabels: page.supportsEntryLabels
	};
}
