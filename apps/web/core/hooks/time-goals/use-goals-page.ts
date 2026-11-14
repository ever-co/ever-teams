'use client';

import { useCallback, useMemo, useState } from 'react';
import { useAtomValue } from 'jotai';
import { useActiveClients } from '@/core/hooks/clients/use-clients-query';
import { useOrganizationProjectsQuery } from '@/core/hooks/organizations/projects/use-organization-projects-query';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useMyRolePermissionsQuery } from '@/core/hooks/roles/use-my-role-permissions-query';
import { useTimeGoalProgress, useTimeGoals, useTimeGoalWrites } from '@/core/hooks/time-goals/use-time-goals';
import { membersOfTeams } from '@/core/lib/utils/dashboards/team';
import {
	defaultGoalPeriodOf,
	goalCountsByPeriodOf,
	type GoalWriter,
	mayChangeGoal,
	memberGoalGroupsOf,
	ownProgressOf,
	progressOfPeriod
} from '@/core/lib/utils/time-goals';
import { activeTeamState, isFlaggedTeamManagerState } from '@/core/stores/teams/organization-team';
import type { ETimeGoalPeriod, ITimeGoal } from '@/core/types/interfaces/timesheet/time-goal';

/** The platform lets a holder of this permission act for every member, and alone set organization goals. */
const ACT_FOR_EVERYONE_PERMISSION = 'CHANGE_SELECTED_EMPLOYEE';

interface PickableEntity {
	id?: string | null;
	name?: string | null;
	color?: string | null;
	imageUrl?: string | null;
	image?: { fullUrl?: string | null } | null;
}

function pickablesOf(entities: ReadonlyArray<PickableEntity>) {
	const pickables = [];
	for (const entity of entities) {
		const name = entity.name?.trim();
		if (!entity.id || !name) {
			continue;
		}
		pickables.push({
			id: entity.id,
			name,
			color: entity.color ?? null,
			imageUrl: entity.image?.fullUrl ?? entity.imageUrl ?? null
		});
	}
	return pickables;
}

/**
 * `/goals`: the signed-in person's goals with where she stands today, for the period picked; for someone who manages
 * the active team, where each of its members stands, grouped by member; and the archived goals.
 */
export function useGoalsPage() {
	const { data: user } = useUserQuery();
	const employeeId = user?.employee?.id ?? null;
	const activeTeam = useAtomValue(activeTeamState);
	const isFlaggedManager = useAtomValue(isFlaggedTeamManagerState);
	const { myPermissions } = useMyRolePermissionsQuery();
	const actsForEveryone = myPermissions.includes(ACT_FOR_EVERYONE_PERMISSION);
	const activeTeamId = activeTeam?.id ?? null;
	const managesTeam = Boolean(activeTeamId) && (isFlaggedManager || actsForEveryone);

	const goals = useTimeGoals();
	const isAvailable = goals.availability === 'available';
	const own = useTimeGoalProgress({ enabled: isAvailable && Boolean(employeeId) });
	const team = useTimeGoalProgress({ teamId: activeTeamId, enabled: isAvailable && managesTeam });
	const { write } = useTimeGoalWrites();

	const members = useMemo(() => {
		if (!activeTeam) {
			return [];
		}
		return membersOfTeams([activeTeam]);
	}, [activeTeam]);
	const otherMembers = useMemo(
		() => members.filter((member) => member.employeeId !== employeeId),
		[employeeId, members]
	);

	const ownRows = useMemo(() => ownProgressOf(own.rows, employeeId), [employeeId, own.rows]);
	const teamRows = useMemo(() => {
		if (!managesTeam) {
			return [];
		}
		return team.rows;
	}, [managesTeam, team.rows]);

	const [pickedPeriod, setPickedPeriod] = useState<ETimeGoalPeriod | null>(null);
	const period = pickedPeriod ?? defaultGoalPeriodOf([...ownRows, ...teamRows]);
	const counts = useMemo(() => goalCountsByPeriodOf(ownRows), [ownRows]);
	const shownOwnRows = useMemo(() => progressOfPeriod(ownRows, period), [ownRows, period]);
	const memberGroups = useMemo(
		() => memberGoalGroupsOf(progressOfPeriod(teamRows, period), members, employeeId),
		[employeeId, members, period, teamRows]
	);

	const writer = useMemo<GoalWriter>(
		() => ({
			employeeId,
			managedTeamId: managesTeam ? activeTeamId : null,
			managedMemberIds: members.map((member) => member.employeeId),
			actsForEveryone
		}),
		[activeTeamId, actsForEveryone, employeeId, managesTeam, members]
	);
	const mayChange = useCallback((goal: ITimeGoal) => mayChangeGoal(goal, writer), [writer]);

	/** Whom a goal counts, written out for the Edit dialog. */
	const ownerLabelOf = useCallback(
		(goal: ITimeGoal) => {
			if (goal.organizationTeamId) {
				return activeTeam?.id === goal.organizationTeamId ? (activeTeam?.name ?? null) : null;
			}
			if (!goal.employeeId || goal.employeeId === employeeId) {
				return null;
			}
			return members.find((member) => member.employeeId === goal.employeeId)?.name ?? null;
		},
		[activeTeam, employeeId, members]
	);

	// The pickers of the goal dialog: read once a dialog may open, where the platform has goals
	const { organizationProjects } = useOrganizationProjectsQuery({ enabled: isAvailable });
	const { clients } = useActiveClients({ enabled: isAvailable });
	const projects = useMemo(() => pickablesOf(organizationProjects ?? []), [organizationProjects]);
	const pickableClients = useMemo(() => pickablesOf(clients), [clients]);

	const shownRange = useMemo(() => {
		const first = shownOwnRows[0];
		if (!first) {
			return null;
		}
		return { startDate: first.startDate, endDate: first.endDate };
	}, [shownOwnRows]);

	const archive = useCallback((goal: ITimeGoal) => write({ kind: 'archive', goalId: goal.id }), [write]);
	const restore = useCallback((goal: ITimeGoal) => write({ kind: 'restore', goalId: goal.id }), [write]);

	const isMemberUnknown = user !== undefined && !employeeId;
	const hasAnyGoal = goals.activeGoals.length > 0 || ownRows.length > 0;

	return {
		availability: goals.availability,
		isLoading: user === undefined || goals.isLoading || (isAvailable && own.isLoading),
		showsError: goals.isError || own.isError,
		retry: () => {
			goals.retry();
			own.retry();
		},
		isUpdating: own.isUpdating || team.isUpdating,
		isMemberUnknown,
		hasAnyGoal,
		period,
		pickPeriod: setPickedPeriod,
		counts,
		shownRange,
		ownRows: shownOwnRows,
		managesTeam,
		teamName: activeTeam?.name ?? null,
		team: { groups: memberGroups, isLoading: team.isLoading, isError: team.isError, retry: team.retry },
		archivedGoals: goals.archivedGoals,
		mayChange,
		ownerLabelOf,
		archive,
		restore,
		owners: {
			canPickOthers: managesTeam,
			members: otherMembers,
			teamId: activeTeamId,
			teamName: activeTeam?.name ?? null
		},
		projects,
		clients: pickableClients
	};
}

export type GoalsPageState = ReturnType<typeof useGoalsPage>;
