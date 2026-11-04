'use client';

import { useMemo } from 'react';
import type { LiveMember } from '@/core/lib/utils/dashboards/team';
import { type DayPerson, dayTimelineOf, hourHeatOf, isLogOfEmployee } from '@/core/lib/utils/dashboards/team-day';
import type { TeamDashboardState } from './use-team-dashboard';
import { useTeamPeriodLogs } from './use-team-period-logs';

function knownPeopleOf(members: ReadonlyArray<LiveMember>) {
	const people = new Map<string, DayPerson>();
	for (const member of members) {
		people.set(member.employeeId, {
			employeeId: member.employeeId,
			name: member.name,
			imageUrl: member.imageUrl
		});
	}
	return people;
}

/** Every caller asks for the same members and period, so they all share one cached read. */
function useTeamLogs(dashboard: TeamDashboardState) {
	const { liveMembers, isMembersLoading } = dashboard.live;
	const employeeIds = useMemo(() => liveMembers.map((member) => member.employeeId), [liveMembers]);
	return useTeamPeriodLogs({
		period: dashboard.period,
		employeeIds,
		isEnabled: !isMembersLoading
	});
}

/** Today's lanes and the period's hour heatmap, from one read of the team's time logs. */
export function useTeamDayBoard(dashboard: TeamDashboardState) {
	const { liveMembers, isMembersLoading } = dashboard.live;
	const logsState = useTeamLogs(dashboard);
	const { logs } = logsState;
	const people = useMemo(() => knownPeopleOf(liveMembers), [liveMembers]);

	const timeline = useMemo(() => dayTimelineOf(logs, new Date(), new Date(), people), [logs, people]);
	const heat = useMemo(() => hourHeatOf(logs, dashboard.period, new Date()), [dashboard.period, logs]);
	const notStarted = useMemo(() => {
		const tracked = new Set(timeline.lanes.map((lane) => lane.person.employeeId));
		return liveMembers.filter((member) => !tracked.has(member.employeeId));
	}, [liveMembers, timeline.lanes]);

	return {
		timeline,
		heat,
		notStarted,
		isLoading: logsState.isLoading || isMembersLoading,
		isError: logsState.isError,
		refetch: logsState.refetch
	};
}

/** One member's day for the member sheet: their own hours and projects, from the page's cached read. */
export function useMemberDayTimeline(dashboard: TeamDashboardState, member: LiveMember) {
	const logsState = useTeamLogs(dashboard);
	const { logs } = logsState;
	const timeline = useMemo(() => {
		const memberLogs = logs.filter((log) => isLogOfEmployee(log, member.employeeId));
		const people = knownPeopleOf([member]);
		return dayTimelineOf(memberLogs, new Date(), new Date(), people);
	}, [logs, member]);
	return {
		timeline,
		isLoading: logsState.isLoading,
		isError: logsState.isError
	};
}
