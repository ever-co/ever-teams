'use client';

import { useCallback, useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { useLocale } from 'next-intl';
import { useTeamDailyPlansOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { getOrganizationIdCookie, getTenantIdCookie } from '@/core/lib/helpers/cookies';
import { getDefaultTimezone } from '@/core/lib/helpers/date-and-time';
import { localDayKeyOf } from '@/core/lib/utils/dashboard-export';
import { isLiveDayRange, liveQueryOptionsOf } from '@/core/lib/utils/dashboard-live';
import { periodLengthInDays, periodOfPreset, type Period } from '@/core/lib/utils/dashboard-period';
import {
	activeGroupsOf,
	actualByMemberDayOf,
	begunDaysOf,
	bulletScaleOf,
	futureDaysOf,
	groupsByDayOf,
	groupsByMemberOf,
	idleDaysOf,
	idleMembersOf,
	memberDaysOf,
	PLAN_WEEK_START,
	planChartDaysOf,
	planDaysOf,
	planFiguresOf,
	plansByMemberDayOf,
	varianceDaysOf,
	type MemberDay,
	type PlanChartLabels,
	type PlanFigures,
	type PlanGroup,
	type PlanGrouping,
	type PlanMember,
	type VarianceDay
} from '@/core/lib/utils/dashboards/actual-expected';
import { queryKeys } from '@/core/query/keys';
import { timeLogService } from '@/core/services/client/api/timesheets/time-log.service';
import { activeTeamState } from '@/core/stores';
import type { DayBarDatum } from '@/core/components/dashboards/kit/day-bars-chart';
import type { ITimeLogReportWeeklyRequest } from '@/core/types/interfaces/activity/activity-report';
import type { PaginationResponse } from '@/core/types/interfaces/common/data-response';
import type { TOrganizationTeam } from '@/core/types/schemas';
import type { TDailyPlan } from '@/core/types/schemas/task/daily-plan.schema';
import type { TTimeLogReportWeekly } from '@/core/types/schemas/timer/time-log.schema';

/** Keeps this report's entries apart from the Time & Activity week grid, which caches the bare report array. */
const REPORT_KEY = 'actual-expected';

const REPORT_STALE_TIME = 1000 * 60 * 10;

interface ActualRequest {
	params: ITimeLogReportWeeklyRequest & { employeeIds: string[] };
	period: Period;
	/** Tenant, organisation and team: the previous figures stay on screen only while these do not change. */
	scopeKey: string;
}

interface ActualResult {
	request: ActualRequest;
	report: TTimeLogReportWeekly[];
}

export interface ActualExpectedShown {
	period: Period;
	members: PlanMember[];
	memberDays: MemberDay[];
	figures: PlanFigures;
	chartDays: DayBarDatum[];
	varianceDays: VarianceDay[];
}

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

async function fetchActual(request: ActualRequest): Promise<ActualResult> {
	const report = await timeLogService.getTimeLogReportWeekly(request.params);
	return { request, report };
}

function memberNameOf(member: TeamMember, unnamedLabel: string) {
	const employeeName = member.employee?.fullName?.trim();
	if (employeeName) {
		return employeeName;
	}
	const userName = member.employee?.user?.name?.trim();
	if (userName) {
		return userName;
	}
	const fullName = member.fullName?.trim();
	if (fullName) {
		return fullName;
	}
	return unnamedLabel;
}

function memberImageOf(member: TeamMember) {
	const employeeImage = member.employee?.user?.imageUrl;
	if (employeeImage) {
		return employeeImage;
	}
	return member.user?.imageUrl ?? null;
}

function teamMembersOf(
	members: TOrganizationTeam['members'],
	unnamedLabel: string,
	collator: Intl.Collator
): PlanMember[] {
	const byEmployee = new Map<string, PlanMember>();
	for (const member of members ?? []) {
		const employeeId = member.employeeId;
		const isKnown = !employeeId || byEmployee.has(employeeId);
		if (isKnown) {
			continue;
		}
		byEmployee.set(employeeId, {
			employeeId,
			name: memberNameOf(member, unnamedLabel),
			imageUrl: memberImageOf(member)
		});
	}
	const list = [...byEmployee.values()];
	list.sort((first, second) => collator.compare(first.name, second.name));
	return list;
}

function scopeKeyOf(tenantId: string | null | undefined, organizationId: string | null | undefined, teamId: string) {
	const tenantPart = tenantId ?? '';
	const organizationPart = organizationId ?? '';
	return `${tenantPart}:${organizationPart}:${teamId}`;
}

function reportedMembersOf(appliedIds: ReadonlyArray<string>, members: ReadonlyArray<PlanMember>) {
	const hasFilter = appliedIds.length > 0;
	if (!hasFilter) {
		return [...members];
	}
	return members.filter((member) => appliedIds.includes(member.employeeId));
}

function previousOfSameScope(previous: ActualResult | undefined, scopeKey: string) {
	const isSameScope = previous?.request.scopeKey === scopeKey;
	if (!isSameScope) {
		return undefined;
	}
	return previous;
}

function axisFormatOptionsOf(dayCount: number): Intl.DateTimeFormatOptions {
	if (dayCount <= 7) {
		return { weekday: 'short' };
	}
	return { day: 'numeric' };
}

function chartLabelsOf(locale: string, dayCount: number): PlanChartLabels {
	const labelFormat = new Intl.DateTimeFormat(locale, { weekday: 'long', month: 'short', day: 'numeric' });
	const axisFormat = new Intl.DateTimeFormat(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

/** The variance tooltip names the day as "Tue, Nov 4"; the axis keeps the chart's short labels. */
function varianceLabelsOf(locale: string, dayCount: number): PlanChartLabels {
	const labelFormat = new Intl.DateTimeFormat(locale, { weekday: 'short', month: 'short', day: 'numeric' });
	const axisFormat = new Intl.DateTimeFormat(locale, axisFormatOptionsOf(dayCount));
	return {
		label: (day) => labelFormat.format(day),
		axisLabel: (day) => axisFormat.format(day)
	};
}

interface ShownInput {
	result: ActualResult;
	plans: ReadonlyArray<TDailyPlan>;
	membersById: ReadonlyMap<string, PlanMember>;
	locale: string;
}

function shownMembersOf(employeeIds: ReadonlyArray<string>, membersById: ReadonlyMap<string, PlanMember>) {
	const members: PlanMember[] = [];
	for (const employeeId of employeeIds) {
		const member = membersById.get(employeeId);
		if (member) {
			members.push(member);
		}
	}
	return members;
}

/** Everything shown derives from the actual report's own request, so plans are never set against another period. */
function shownOf({ result, plans, membersById, locale }: ShownInput): ActualExpectedShown {
	const period = result.request.period;
	const todayKey = localDayKeyOf(new Date());
	const members = shownMembersOf(result.request.params.employeeIds, membersById);
	const memberIds = members.map((member) => member.employeeId);
	const employeeIds = new Set(memberIds);
	const mergedPlans = plansByMemberDayOf(plans, employeeIds);
	const actual = actualByMemberDayOf(result.report);
	const begunDays = begunDaysOf(period, todayKey);
	const futureDays = futureDaysOf(period, todayKey);
	const memberDays = memberDaysOf({ members, days: begunDays, plans: mergedPlans, actual });
	const futureMemberDays = memberDaysOf({ members, days: futureDays, plans: mergedPlans, actual });
	const planDays = planDaysOf(period, memberDays, futureMemberDays, todayKey);
	const dayCount = periodLengthInDays(period);
	const labels = chartLabelsOf(locale, dayCount);
	const varianceLabels = varianceLabelsOf(locale, dayCount);
	return {
		period,
		members,
		memberDays,
		figures: planFiguresOf(memberDays, futureMemberDays),
		chartDays: planChartDaysOf(planDays, labels),
		varianceDays: varianceDaysOf({ period, memberDays, futureMemberDays, todayKey, labels: varianceLabels })
	};
}

function groupsOf(shown: ActualExpectedShown | null, grouping: PlanGrouping, collator: Intl.Collator): PlanGroup[] {
	if (!shown) {
		return [];
	}
	if (grouping === 'day') {
		return groupsByDayOf(shown.memberDays, collator);
	}
	return groupsByMemberOf(shown.members, shown.memberDays);
}

/**
 * Expected comes from the team's daily plans the shell already caches (no request of its own); actual from the
 * weekly report, which gives the time of each member on each day of the range in the reader's zone.
 */
export function useActualExpectedReport({ unnamedLabel }: Readonly<{ unnamedLabel: string }>) {
	const locale = useLocale();
	const queryClient = useQueryClient();
	const activeTeam = useAtomValue(activeTeamState);
	const organizationId = getOrganizationIdCookie();
	const tenantId = getTenantIdCookie();
	const timeZone = useMemo(() => getDefaultTimezone(), []);
	const collator = useMemo(() => new Intl.Collator(locale), [locale]);

	const [period, setPeriod] = useState<Period>(() => periodOfPreset('thisWeek', PLAN_WEEK_START));
	const [grouping, setGrouping] = useState<PlanGrouping>('member');
	const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

	const teamPlans = useTeamDailyPlansOwner();
	const teamId = activeTeam?.id ?? '';
	const plansKey = queryKeys.dailyPlans.allPlansByScope(tenantId, organizationId, activeTeam?.id);
	// The owner hook answers an empty list until the plans arrive; only the cache tells "not loaded" from "none".
	const plansData = queryClient.getQueryData<PaginationResponse<TDailyPlan>>(plansKey);
	const plans = plansData?.items;

	const teamMembers = activeTeam?.members;
	const members = useMemo(
		() => teamMembersOf(teamMembers, unnamedLabel, collator),
		[collator, teamMembers, unnamedLabel]
	);
	const membersById = useMemo(() => {
		const byId = new Map<string, PlanMember>();
		for (const member of members) {
			byId.set(member.employeeId, member);
		}
		return byId;
	}, [members]);

	const appliedEmployeeIds = useMemo(
		() => selectedEmployeeIds.filter((employeeId) => membersById.has(employeeId)),
		[membersById, selectedEmployeeIds]
	);
	const reportedMembers = useMemo(
		() => reportedMembersOf(appliedEmployeeIds, members),
		[appliedEmployeeIds, members]
	);

	const request = useMemo<ActualRequest>(() => {
		const employeeIds = reportedMembers.map((member) => member.employeeId);
		employeeIds.sort();
		return {
			params: {
				startDate: period.from.toISOString(),
				endDate: period.to.toISOString(),
				timeZone,
				employeeIds,
				projectIds: [],
				teamIds: []
			},
			period,
			scopeKey: scopeKeyOf(tenantId, organizationId, teamId)
		};
	}, [organizationId, period, reportedMembers, teamId, tenantId, timeZone]);

	const hasScope = Boolean(organizationId) && Boolean(tenantId);
	const hasMembers = reportedMembers.length > 0;
	const isEnabled = hasScope && hasMembers;
	const isLive = isLiveDayRange(localDayKeyOf(period.from), localDayKeyOf(period.to));

	const actualQuery = useQuery({
		queryKey: queryKeys.activities.weekly({ ...request.params, organizationId, tenantId, report: REPORT_KEY }),
		queryFn: () => fetchActual(request),
		enabled: isEnabled,
		staleTime: REPORT_STALE_TIME,
		placeholderData: (previous) => previousOfSameScope(previous, request.scopeKey),
		...liveQueryOptionsOf(isLive)
	});

	const result = actualQuery.data;

	const shown = useMemo<ActualExpectedShown | null>(() => {
		if (!result) {
			return null;
		}
		if (!plans) {
			return null;
		}
		return shownOf({ result, plans, membersById, locale });
	}, [locale, membersById, plans, result]);

	const groups = useMemo(() => groupsOf(shown, grouping, collator), [collator, grouping, shown]);
	const bulletScale = useMemo(() => bulletScaleOf(groups), [groups]);
	const activeGroups = useMemo(() => activeGroupsOf(groups), [groups]);
	const idleMembers = useMemo(() => idleMembersOf(groups), [groups]);
	const idleDays = useMemo(() => idleDaysOf(shown?.varianceDays ?? []), [shown]);

	const isTeamReady = activeTeam !== null;
	const hasActual = result !== undefined;
	const hasPlans = plans !== undefined;
	const hasActualError = actualQuery.isError;
	const isActualPending = !hasActual && !hasActualError;
	const isWaitingForActual = isEnabled && isActualPending;
	const isWaitingForPlans = !hasPlans && !teamPlans.isError;
	const isLoading = !isTeamReady || isWaitingForActual || isWaitingForPlans;
	const showsNoMembers = isTeamReady && !hasMembers;
	const isUpdating = actualQuery.isFetching && hasActual;
	const showsActualError = actualQuery.isError && !hasActual;
	const showsPlansError = teamPlans.isError && !hasPlans;
	const showsError = showsActualError || showsPlansError;

	const refetchActual = actualQuery.refetch;
	const refetchPlans = teamPlans.getAllDayPlans;
	const refetch = useCallback(() => {
		if (showsActualError) {
			void refetchActual();
		}
		if (showsPlansError) {
			void refetchPlans();
		}
	}, [refetchActual, refetchPlans, showsActualError, showsPlansError]);

	const clearMembers = useCallback(() => setSelectedEmployeeIds([]), [setSelectedEmployeeIds]);
	const removeMember = useCallback(
		(employeeId: string) => {
			setSelectedEmployeeIds((current) => current.filter((id) => id !== employeeId));
		},
		[setSelectedEmployeeIds]
	);

	return {
		teamName: activeTeam?.name ?? '',
		period,
		setPeriod,
		grouping,
		setGrouping,
		members,
		appliedEmployeeIds,
		setSelectedEmployeeIds,
		clearMembers,
		removeMember,
		populationCount: reportedMembers.length,
		isTeamReady,
		shown,
		groups,
		bulletScale,
		activeGroups,
		idleMembers,
		idleDays,
		isLoading,
		isUpdating,
		showsError,
		showsNoMembers,
		refetch
	};
}

export type ActualExpectedReportState = ReturnType<typeof useActualExpectedReport>;
