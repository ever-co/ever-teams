'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { activeTeamState } from '@/core/stores';
import { currentOrganizationState } from '@/core/stores/user/user-organizations';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { DEFAULT_WORK_HOURS_PER_DAY } from '@/core/constants/config/constants';
import { periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import {
	emptyPastPeriodCountOf,
	groupsByMemberOf,
	groupsByPeriodOf,
	LIMIT_WEEK_START,
	limitAttentionOf,
	limitEntriesOf,
	limitFiguresOf,
	limitMatrixRowsOf,
	membersWithoutTimeCountOf,
	membersWithoutTimeOf,
	requestPeriodOf,
	serviceDayOf,
	standardLimitOf,
	type LimitDuration,
	type LimitEntry,
	type LimitFigures,
	type LimitGroup,
	type LimitGrouping,
	type LimitMember
} from '@/core/lib/utils/dashboards/weekly-limit';
import type { TGetTimeLimitReport, TOrganizationTeam, TTimeLimitReportList } from '@/core/types/schemas';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';

interface WeeklyLimitRequest {
	params: TGetTimeLimitReport;
	period: Period;
	duration: LimitDuration;
	/** Tenant, organisation and team: the previous figures stay on screen only while these do not change. */
	scopeKey: string;
}

interface WeeklyLimitResult {
	request: WeeklyLimitRequest;
	reports: TTimeLimitReportList[];
}

export interface WeeklyLimitShown {
	duration: LimitDuration;
	period: Period;
	standardLimit: number;
	entries: LimitEntry[];
	figures: LimitFigures;
	membersWithoutTimeCount: number;
	membersWithoutTime: LimitMember[];
}

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

async function fetchWeeklyLimit(request: WeeklyLimitRequest): Promise<WeeklyLimitResult> {
	const reports = await timeLogService.getTimeLimitsReport(request.params);
	return { request, reports };
}

function memberNameOf(member: TeamMember) {
	const employeeName = member.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = member.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	return member.fullName?.trim() ?? '';
}

function memberImageOf(member: TeamMember) {
	const employeeImage = member.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return member.user?.imageUrl ?? null;
}

function teamMembersOf(members: TOrganizationTeam['members']): LimitMember[] {
	const byEmployee = new Map<string, LimitMember>();
	for (const member of members ?? []) {
		const employeeId = member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		byEmployee.set(employeeId, {
			employeeId,
			name: memberNameOf(member),
			imageUrl: memberImageOf(member)
		});
	}
	const list = [...byEmployee.values()];
	list.sort((first, second) => first.name.localeCompare(second.name));
	return list;
}

function membersByIdOf(members: LimitMember[]) {
	const byId = new Map<string, LimitMember>();
	for (const member of members) {
		byId.set(member.employeeId, member);
	}
	return byId;
}

function scopeKeyOf(tenantId: string | null | undefined, organizationId: string | null | undefined, teamId: string) {
	const tenantPart = tenantId ?? '';
	const organizationPart = organizationId ?? '';
	return `${tenantPart}:${organizationPart}:${teamId}`;
}

function groupsOf(entries: LimitEntry[], grouping: LimitGrouping): LimitGroup[] {
	if (grouping === 'member') {
		return groupsByMemberOf(entries);
	}
	return groupsByPeriodOf(entries);
}

function reportedEmployeeIdsOf(appliedIds: string[], members: LimitMember[]) {
	if (appliedIds.length > 0) {
		return appliedIds;
	}
	return members.map((member) => member.employeeId);
}

function previousOfSameScope(previous: WeeklyLimitResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

/** Everything shown derives from the data's own request, so a week report kept on screen is never drawn as days. */
export function useWeeklyLimitReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const activeTeam = useAtomValue(activeTeamState);
	const organization = useAtomValue(currentOrganizationState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);

	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisMonth', LIMIT_WEEK_START));
	const [duration, setDuration] = useState<LimitDuration>('day');
	const [grouping, setGrouping] = useState<LimitGrouping>('period');
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

	const teamMembers = activeTeam?.members;
	const members = useMemo(() => teamMembersOf(teamMembers), [teamMembers]);
	const membersById = useMemo(() => membersByIdOf(members), [members]);

	const appliedEmployeeIds = useMemo(
		() => selectedEmployeeIds.filter((employeeId) => membersById.has(employeeId)),
		[membersById, selectedEmployeeIds]
	);
	const reportedEmployeeIds = useMemo(
		() => reportedEmployeeIdsOf(appliedEmployeeIds, members),
		[appliedEmployeeIds, members]
	);

	const requestPeriod = useMemo(() => requestPeriodOf(period, duration), [duration, period]);
	const teamId = activeTeam?.id ?? '';

	const request = useMemo<WeeklyLimitRequest>(() => {
		const employeeIds = [...reportedEmployeeIds].sort();
		return {
			params: {
				employeeIds,
				startDate: serviceDayOf(requestPeriod.from),
				endDate: serviceDayOf(requestPeriod.to),
				duration,
				timeZone
			},
			period: requestPeriod,
			duration,
			scopeKey: scopeKeyOf(tenantId, organizationId, teamId)
		};
	}, [duration, organizationId, reportedEmployeeIds, requestPeriod, teamId, tenantId, timeZone]);

	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	const hasMembers = reportedEmployeeIds.length > 0;
	const isEnabled = hasScope && hasMembers;

	const isLive = isLiveDayRange(localDayKeyOf(requestPeriod.from), localDayKeyOf(requestPeriod.to));
	const query = useQuery({
		queryKey: queryKeys.timer.timeLimits.byParams({ ...request.params, organizationId, tenantId }),
		queryFn: () => fetchWeeklyLimit(request),
		enabled: isEnabled,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});

	const result = query.data;
	const standardHoursPerDay = organization?.standardWorkHoursPerDay ?? DEFAULT_WORK_HOURS_PER_DAY;

	const shown = useMemo<WeeklyLimitShown | null>(() => {
		if (!result) {
			return null;
		}
		const shownDuration = result.request.duration;
		const shownPeriod = result.request.period;
		const standardLimit = standardLimitOf(shownDuration, standardHoursPerDay);
		const entries = limitEntriesOf({
			reports: result.reports,
			duration: shownDuration,
			period: shownPeriod,
			standardLimit,
			members: membersById,
			unnamedLabel
		});
		const requestedEmployeeIds = result.request.params.employeeIds ?? [];
		return {
			duration: shownDuration,
			period: shownPeriod,
			standardLimit,
			entries,
			figures: limitFiguresOf(entries),
			membersWithoutTimeCount: membersWithoutTimeCountOf(requestedEmployeeIds, entries),
			membersWithoutTime: membersWithoutTimeOf(requestedEmployeeIds, entries, membersById)
		};
	}, [membersById, result, standardHoursPerDay, unnamedLabel]);

	const shownEntries = shown?.entries;
	const groups = useMemo(() => groupsOf(shownEntries ?? [], grouping), [grouping, shownEntries]);
	const periodGroups = useMemo(() => groupsByPeriodOf(shownEntries ?? []), [shownEntries]);
	const memberGroups = useMemo(() => groupsByMemberOf(shownEntries ?? []), [shownEntries]);
	const matrixRows = useMemo(() => limitMatrixRowsOf(memberGroups), [memberGroups]);
	const attention = useMemo(() => limitAttentionOf(memberGroups), [memberGroups]);

	const emptyPeriodCount = useMemo(() => {
		if (!shown) {
			return 0;
		}
		const reportedKeys = new Set(shown.entries.map((entry) => entry.periodKey));
		return emptyPastPeriodCountOf(shown.period, shown.duration, reportedKeys);
	}, [shown]);

	const isTeamReady = activeTeam !== null;
	const isOrganizationReady = organization !== null;
	const hasData = result !== undefined;
	const isWaitingForData = isEnabled && !hasData && !query.isError;
	const isLoading = !isTeamReady || !isOrganizationReady || isWaitingForData;
	const showsNoMembers = isTeamReady && !hasMembers;
	const isUpdating = query.isFetching && hasData;
	const showsError = query.isError && !hasData;

	const refetchQuery = query.refetch;
	const refetch = useCallback(() => {
		void refetchQuery();
	}, [refetchQuery]);

	const clearMembers = useCallback(() => setSelectedEmployeeIds([]), []);
	const removeMember = useCallback((employeeId: string) => {
		setSelectedEmployeeIds((current) => current.filter((id) => id !== employeeId));
	}, []);

	return {
		teamName: activeTeam?.name ?? '',
		period,
		setPeriod,
		duration,
		setDuration,
		grouping,
		setGrouping,
		members,
		appliedEmployeeIds,
		setSelectedEmployeeIds,
		clearMembers,
		removeMember,
		requestPeriod,
		populationCount: reportedEmployeeIds.length,
		isTeamReady,
		shown,
		groups,
		periodGroups,
		memberGroups,
		matrixRows,
		attention,
		emptyPeriodCount,
		isLoading,
		isUpdating,
		showsError,
		showsNoMembers,
		refetch
	};
}

export type WeeklyLimitReportState = ReturnType<typeof useWeeklyLimitReport>;
