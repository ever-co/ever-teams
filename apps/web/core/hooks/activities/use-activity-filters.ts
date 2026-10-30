import { useCallback, useState, useMemo } from 'react';
import { useAuthenticateUser } from '../auth';
import { useTimelogFilterOptions } from './use-timelog-filter-options';
import { ETimeLogType } from '@/core/types/generics/enums/timer';
import { ITimeLogReportDailyChartProps } from '@/core/types/interfaces/activity/activity-report';
import { TOrganizationTeam, TOrganizationTeamEmployee } from '@/core/types/schemas';

// ==================== TYPES ====================

export interface UseReportActivityProps
	extends Omit<ITimeLogReportDailyChartProps, 'logType' | 'activityLevel' | 'start' | 'end' | 'groupBy'> {
	logType?: ETimeLogType[];
	activityLevel: {
		start: number;
		end: number;
	};
	start?: number;
	end?: number;
	projectIds?: string[];
	employeeIds?: string[];
	teamIds?: string[];
	taskIds?: string[];
	groupBy?: string;
	/** Ids applied through `updateFilters`, without the dashboard filter fallback: used in the report query key */
	selectedEmployeeIds?: string[];
	selectedTeamIds?: string[];
	/**
	 * The active members resolved from a team manager's teams (the applied ones, or every managed team on the Team
	 * Dashboard), never from picks. Only the report query key reads it, so a change in their membership fetches the
	 * report again.
	 */
	resolvedMemberIds?: string[];
}

export type GroupByType = 'date' | 'project' | 'employee' | 'application' | 'daily' | 'weekly' | 'member';

// ==================== HELPERS ====================

/**
 * Formats a Date to a 'YYYY-MM-DD' string using **local** time.
 *
 * `Date.toISOString()` converts to UTC first, which silently shifts the day
 * for users east of UTC (e.g. UTC+1: Feb 1 00:00 local → Jan 31 23:00 UTC).
 */
const formatLocalDate = (date: Date): string => {
	const year = date.getFullYear();
	const month = String(date.getMonth() + 1).padStart(2, '0');
	const day = String(date.getDate()).padStart(2, '0');
	return `${year}-${month}-${day}`;
};

/** Gauzy counts a membership as active unless it is flagged inactive or archived; both flags may be null. */
const isActiveMembership = (member: TOrganizationTeamEmployee): boolean => {
	const isInactive = member.isActive === false;
	const isArchived = member.isArchived === true;
	return !isInactive && !isArchived;
};

/**
 * The most ids an array query parameter can carry. Gauzy parses query strings with qs, whose default `arrayLimit`
 * of 20 turns a longer list into an object, and the report DTOs (`@IsArray`) answer that with a 400.
 */
const MAX_QUERY_ARRAY_IDS = 20;

/**
 * The employee ids of the active members of the given teams, without duplicates, for a report request to name.
 *
 * A caller who may not pick any employee reads the time logs of the ids it sends only when each of them is an
 * active member of a team it manages. One inactive or archived membership in the list and the API falls back to
 * the caller's own logs. Teams with more active members than a query string can carry get no ids, so their
 * requests stay as they were.
 */
export function getReportMemberIds(teams: TOrganizationTeam[], teamIds: string[]): string[] {
	const requestedTeams = teams.filter((team) => teamIds.includes(team.id));
	const employeeIds = new Set<string>();

	for (const team of requestedTeams) {
		for (const member of team.members ?? []) {
			const employeeId: string | undefined = member.employeeId ?? member.employee?.id;
			const isActiveMember = isActiveMembership(member);

			if (!employeeId) continue;
			if (!isActiveMember) continue;

			employeeIds.add(employeeId);
		}
	}

	const exceedsQueryArrayLimit = employeeIds.size > MAX_QUERY_ARRAY_IDS;

	if (exceedsQueryArrayLimit) return [];

	return Array.from(employeeIds);
}

export function managesEveryTeam(managedTeams: TOrganizationTeam[], teamIds: string[]): boolean {
	const managedTeamIds = new Set(managedTeams.map(({ id }) => id));

	return teamIds.every((teamId) => managedTeamIds.has(teamId));
}

/** The props keyed on the members resolved for them. With no member resolved they are returned as they are. */
export function withResolvedMemberIds(
	props: Required<UseReportActivityProps>,
	memberIds: string[]
): Required<UseReportActivityProps> {
	if (!memberIds.length) return props;

	return { ...props, resolvedMemberIds: memberIds };
}

/**
 * The props of the time log reports (daily and weekly) of a page that applies teams with no member, for a manager
 * of all of them without organization-wide access: the active members of those teams become the employee ids.
 * With no employee id the API reads only the caller's own time logs, while the counts resolve these members from
 * the team ids. Any other request, like one for teams too large to name their members, is returned as it is.
 */
export function getAppliedTeamsReportProps(
	mergedProps: Required<UseReportActivityProps> | null,
	managedTeams: TOrganizationTeam[],
	hasOrganizationWideAccess: boolean
): Required<UseReportActivityProps> | null {
	if (!mergedProps) return mergedProps;
	if (hasOrganizationWideAccess) return mergedProps;

	const appliedTeamIds = mergedProps.selectedTeamIds;
	const namesEmployees = mergedProps.employeeIds.length > 0;

	if (!appliedTeamIds.length) return mergedProps;
	if (namesEmployees) return mergedProps;

	const managesAppliedTeams = managesEveryTeam(managedTeams, appliedTeamIds);

	if (!managesAppliedTeams) return mergedProps;

	const memberIds = getReportMemberIds(managedTeams, appliedTeamIds);

	if (!memberIds.length) return mergedProps;

	const memberProps = { ...mergedProps, employeeIds: memberIds };

	return withResolvedMemberIds(memberProps, memberIds);
}

// ==================== DEFAULTS ====================

type DefaultProps = Required<
	Pick<
		UseReportActivityProps,
		| 'startDate'
		| 'endDate'
		| 'groupBy'
		| 'activityLevel'
		| 'logType'
		| 'start'
		| 'end'
		| 'employeeIds'
		| 'projectIds'
		| 'teamIds'
		| 'taskIds'
	>
>;

/** Build default filter props with a **fresh** date range (last 7 inclusive days).
 *  Called at hook-instantiation time so the range stays accurate even in
 *  long-lived SPA sessions that span midnight.
 */
function getDefaultProps(): DefaultProps {
	const now = new Date();
	const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6);

	return {
		startDate: formatLocalDate(sevenDaysAgo),
		endDate: formatLocalDate(today),
		groupBy: 'date',
		activityLevel: {
			start: 0,
			end: 100
		},
		logType: [ETimeLogType.TRACKED],
		start: 0,
		end: 100,
		employeeIds: [],
		projectIds: [],
		teamIds: [],
		taskIds: []
	};
}

// ==================== QUERY KEY ====================

/**
 * Query key params shared by the activity report queries (chart, daily report, report list).
 *
 * Employee and team ids stay out on purpose: they follow the dashboard filter, which changes them on
 * every pick and applies them with an explicit refetch. Keying on them would refetch on each pick and
 * swap the page for its loading skeleton while the filter is still open. The members resolved for a
 * team manager are keyed on their own, through `resolvedMemberIds`, since no pick changes them.
 */
export function getActivityQueryKeyParams(mergedProps: Required<UseReportActivityProps> | null) {
	return {
		tenantId: mergedProps?.tenantId,
		organizationId: mergedProps?.organizationId,
		// The team a dashboard page is scoped to. It does not follow the filter picks.
		teamId: mergedProps?.teamId,
		startDate: mergedProps?.startDate,
		endDate: mergedProps?.endDate,
		groupBy: mergedProps?.groupBy,
		projectIds: mergedProps?.projectIds,
		taskIds: mergedProps?.taskIds,
		logType: mergedProps?.logType,
		activityLevel: mergedProps?.activityLevel,
		// The member and team picks applied on the page itself (not the dashboard fallback described above)
		selectedEmployeeIds: mergedProps?.selectedEmployeeIds,
		selectedTeamIds: mergedProps?.selectedTeamIds,
		// The members resolved from the teams for a team manager: a change in the team's membership fetches again
		resolvedMemberIds: mergedProps?.resolvedMemberIds
	};
}

// ==================== HOOK ====================

/**
 * Hook for managing activity report filters, auth context, and merged props.
 *
 * Extracts the shared filter logic from the old monolithic `useReportActivity`.
 * All granular query hooks (`useActivityChartQuery`, `useActivityDailyReportQuery`, etc.)
 * consume the `mergedProps` returned by this hook.
 *
 * @example
 * ```typescript
 * const { mergedProps, currentFilters, updateDateRange, isManage } = useActivityFilters();
 * const { data: chartData } = useActivityChartQuery({ mergedProps, enabled: true });
 * ```
 */
export function useActivityFilters({ includeTeamManagers = true }: { includeTeamManagers?: boolean } = {}) {
	// User and authentication
	const { user, isTeamManager } = useAuthenticateUser();
	const { allteamsState, alluserState, isUserAllowedToAccess } = useTimelogFilterOptions();
	// A team manager usually holds the EMPLOYEE role; the API checks which members they manage
	const isManage = useMemo(
		() => user && (isUserAllowedToAccess(user) || (includeTeamManagers && isTeamManager)),
		[user, isUserAllowedToAccess, includeTeamManagers, isTeamManager]
	);

	// State management — lazy initializer so dates are fresh at mount time
	const [currentFilters, setCurrentFilters] = useState<Partial<UseReportActivityProps>>(getDefaultProps);

	// Memoized employee and team IDs
	const employeeIds = useMemo(
		() =>
			isManage
				? alluserState?.map(({ employee }) => employee?.id).filter(Boolean)
				: user?.employee?.id
					? [user.employee.id]
					: [],
		[isManage, alluserState, user?.employee?.id]
	);

	const teamIds = useMemo(() => allteamsState?.map(({ id }) => id).filter(Boolean) || [], [allteamsState]);

	// Super admin, admin or organization MANAGER role: the roles the dashboards treat as organization-wide
	const hasOrganizationWideAccess = isUserAllowedToAccess(user);

	// Props merging logic — getDefaultProps() called here so fallback dates stay fresh
	const mergedProps = useMemo(() => {
		if (!user?.employee?.organizationId) {
			return null;
		}

		const defaults = getDefaultProps();

		return {
			...defaults,
			...currentFilters,
			organizationId: user.employee.organizationId,
			teamId: currentFilters.teamId,
			userId: currentFilters.userId,
			tenantId: user.tenantId ?? '',
			logType: (currentFilters.logType || defaults.logType) as ETimeLogType[],
			startDate: (currentFilters.startDate || defaults.startDate) as string,
			endDate: (currentFilters.endDate || defaults.endDate) as string,
			groupBy: (currentFilters.groupBy || defaults.groupBy) as string,
			projectIds: (currentFilters.projectIds || defaults.projectIds) as string[],
			// Members and teams applied through updateFilters win over the dashboard filter state
			employeeIds: currentFilters.employeeIds?.length ? currentFilters.employeeIds : employeeIds,
			teamIds: currentFilters.teamIds?.length ? currentFilters.teamIds : teamIds,
			selectedEmployeeIds: currentFilters.employeeIds ?? [],
			selectedTeamIds: currentFilters.teamIds ?? [],
			activityLevel: {
				start: currentFilters.activityLevel?.start ?? defaults.activityLevel.start,
				end: currentFilters.activityLevel?.end ?? defaults.activityLevel.end
			},
			start: currentFilters.start ?? defaults.start,
			end: currentFilters.end ?? defaults.end
		} as Required<UseReportActivityProps>;
	}, [user?.employee?.organizationId, user?.employee?.id, user?.tenantId, currentFilters, isManage, employeeIds, teamIds]);

	const enabled = !!user && !!mergedProps;

	// ==================== UPDATE HANDLERS ====================

	const updateDateRange = useCallback((startDate: Date, endDate: Date) => {
		setCurrentFilters((prev) => ({
			...prev,
			startDate: formatLocalDate(startDate),
			endDate: formatLocalDate(endDate)
		}));
	}, []);

	const handleGroupByChange = useCallback((groupByType: GroupByType) => {
		const options = {
			groupBy: groupByType === 'application' ? 'date' : groupByType
		};
		setCurrentFilters((prev) => ({ ...prev, ...options }));
	}, []);

	const updateFilters = useCallback((newFilters: Partial<UseReportActivityProps>) => {
		setCurrentFilters((prev) => ({ ...prev, ...newFilters }));
	}, []);

	return {
		user,
		isManage,
		hasOrganizationWideAccess,
		mergedProps,
		enabled,
		currentFilters,
		setCurrentFilters,
		updateDateRange,
		handleGroupByChange,
		updateFilters
	};
}

