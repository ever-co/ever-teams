'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useQuery } from '@tanstack/react-query';
import { getTimerStatusValue } from '@/core/components/timer/timer-status';
import { useReactiveAccessTokenCookie } from '@/core/hooks/auth/use-reactive-access-token-cookie';
import { useTeamDailyPlansOwner } from '@/core/hooks/bootstrap/use-feature-data';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskStatusesQuery } from '@/core/hooks/tasks/use-task-statuses-query';
import { useTeamTasksLoadState } from '@/core/hooks/tasks/use-team-tasks-load-state';
import {
	activeTeamIdState,
	activeTeamState,
	activeTeamTaskState,
	tasksByTeamState,
	timerStatusState
} from '@/core/stores';
import { queryKeys } from '@/core/query/keys';
import { organizationTeamService } from '@/core/services/client/api/organizations/teams';
import { activeTeamDetailLoadingState } from '@/core/stores/teams/organization-team';
import type { DailyReportRow } from '@/core/lib/utils/daily-report-figures';
import { sortStatusesByOrder } from '@/core/lib/utils/kanban-board';
import {
	lastTrackedDayByEmployeeOf,
	liveBoardRowsOf,
	liveCountsOf,
	liveMembersOf,
	liveStatusOf,
	membersWithDetailOf,
	inProgressWorkedOf,
	periodTaskSecondsOf,
	recentWorkOf,
	statusRowsOf,
	taskGroupCountsOf,
	taskLanesOf,
	todayPlannedSecondsOf,
	todaySegmentsOf,
	todayTotalSecondsOf
} from '@/core/lib/utils/dashboards/team';
import type { TOrganizationTeam } from '@/core/types/schemas';

type TeamMember = NonNullable<TOrganizationTeam['members']>[number];

const NO_MEMBERS: TeamMember[] = [];

const DETAIL_STALE_TIME = 1000 * 60 * 10;
const DETAIL_GC_TIME = 1000 * 60 * 30;

/**
 * The active team's detail as the shell's team owner caches it (same key, same scope), read without ever fetching:
 * its members carry the day's statistics the team state loses when the teams list refreshes it.
 */
function useCachedTeamDetailMembers() {
	const { data: user } = useUserQuery();
	const activeTeamId = useAtomValue(activeTeamIdState);
	const accessToken = useReactiveAccessTokenCookie();
	const tenantId = user?.employee?.tenantId ?? user?.tenantId ?? null;
	const organizationId = user?.employee?.organizationId ?? null;
	const userId = user?.id ?? null;
	const teamId = activeTeamId;
	const detailQuery = useQuery({
		queryKey: queryKeys.organizationTeams.detailByScope(tenantId, organizationId, teamId, userId),
		queryFn: ({ signal }) => {
			const scope = { tenantId, organizationId, teamId, userId, accessToken };
			return organizationTeamService.getOrganizationTeam(teamId ?? '', { scope, signal });
		},
		enabled: false,
		staleTime: DETAIL_STALE_TIME,
		gcTime: DETAIL_GC_TIME
	});
	return detailQuery.data?.data?.members ?? NO_MEMBERS;
}

/** No request of its own: the team, its tasks and the report are already read; plans and statuses share their keys. */
export function useTeamLiveBoard({
	rows,
	pickedMemberIds,
	authUserId
}: Readonly<{
	rows: ReadonlyArray<DailyReportRow>;
	pickedMemberIds: ReadonlyArray<string>;
	authUserId: string | null;
}>) {
	const activeTeam = useAtomValue(activeTeamState);
	const timerStatus = useAtomValue(timerStatusState);
	const tasks = useAtomValue(tasksByTeamState);
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const isTeamDetailLoading = useAtomValue(activeTeamDetailLoadingState);
	const { isFirstLoad: isTasksFirstLoad } = useTeamTasksLoadState();
	const statusesQuery = useTaskStatusesQuery();
	const teamPlans = useTeamDailyPlansOwner();

	const detailMembers = useCachedTeamDetailMembers();
	const teamMembers = activeTeam?.members ?? NO_MEMBERS;
	const members = useMemo(() => membersWithDetailOf(teamMembers, detailMembers), [detailMembers, teamMembers]);
	const isReaderTimerRunning = Boolean(timerStatus?.running);
	const statusOf = useCallback(
		(member: TeamMember) => {
			const localStatus = getTimerStatusValue(timerStatus, member, false);
			const memberUserId = member?.employee?.userId ?? null;
			const isReader = Boolean(memberUserId) && memberUserId === authUserId;
			return liveStatusOf({ gauzyStatus: member?.timerStatus, localStatus, isReader, isReaderTimerRunning });
		},
		[authUserId, isReaderTimerRunning, timerStatus]
	);
	const lastTrackedByEmployee = useMemo(() => lastTrackedDayByEmployeeOf(rows), [rows]);

	const liveMembers = useMemo(
		() =>
			liveMembersOf({
				members,
				pickedMemberIds,
				statusOf,
				tasks,
				authUserId,
				activeTeamTask,
				lastTrackedByEmployee
			}),
		[activeTeamTask, authUserId, lastTrackedByEmployee, members, pickedMemberIds, statusOf, tasks]
	);
	const counts = useMemo(() => liveCountsOf(liveMembers), [liveMembers]);
	const boardRows = useMemo(() => liveBoardRowsOf(liveMembers), [liveMembers]);
	const todaySeconds = useMemo(() => todayTotalSecondsOf(liveMembers), [liveMembers]);
	const todaySegments = useMemo(() => todaySegmentsOf(liveMembers), [liveMembers]);

	const plans = teamPlans.allTeamDailyPlans.items;
	const plannedSeconds = useMemo(() => {
		const employeeIds = new Set(liveMembers.map((member) => member.employeeId));
		return todayPlannedSecondsOf(plans, employeeIds);
	}, [liveMembers, plans]);

	const taskStatuses = statusesQuery.taskStatuses;
	const statuses = useMemo(() => sortStatusesByOrder(taskStatuses), [taskStatuses]);
	const taskSeconds = useMemo(() => periodTaskSecondsOf(rows), [rows]);
	const lanes = useMemo(
		() => taskLanesOf({ tasks, statuses, taskSeconds, pickedMemberIds }),
		[pickedMemberIds, statuses, taskSeconds, tasks]
	);
	const taskGroups = useMemo(() => taskGroupCountsOf(lanes), [lanes]);
	const statusRows = useMemo(() => statusRowsOf(lanes), [lanes]);
	const inProgressTasks = useMemo(() => inProgressWorkedOf(lanes), [lanes]);
	const recentDays = useMemo(() => recentWorkOf(rows, tasks), [rows, tasks]);

	const hasMembers = members.length > 0;
	const isMembersLoading = !hasMembers && isTeamDetailLoading;
	const refetchStatuses = useCallback(() => void statusesQuery.refetch(), [statusesQuery]);
	const refetchPlans = useCallback(() => void teamPlans.getAllDayPlans(), [teamPlans]);

	return {
		teamName: activeTeam?.name ?? '',
		teamId: activeTeam?.id ?? null,
		liveMembers,
		boardRows,
		counts,
		todaySeconds,
		todaySegments,
		plannedSeconds,
		isTodayLoading: isMembersLoading || isTeamDetailLoading,
		isPlanLoading: teamPlans.isLoading,
		isPlanError: teamPlans.isError,
		refetchPlans,
		isMembersLoading,
		lanes,
		taskGroups,
		statusRows,
		inProgressTasks,
		isTasksLoading: isTasksFirstLoad || statusesQuery.getTaskStatusesLoading,
		isTasksError: statusesQuery.isError,
		refetchStatuses,
		recentDays
	};
}

export type TeamLiveBoard = ReturnType<typeof useTeamLiveBoard>;
