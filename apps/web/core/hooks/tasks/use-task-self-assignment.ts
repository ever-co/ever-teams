'use client';

import { useCallback, useMemo } from 'react';
import { useAtomValue } from 'jotai';
import { useSetActiveTask } from '@/core/hooks/organizations/teams/use-team-tasks-state';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useTaskMemberManagement } from '@/core/hooks/tasks/use-task-member-management';
import { activeTeamState, activeTeamTaskState } from '@/core/stores';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export function isAssignedTo(task: TTask, member: TOrganizationTeamEmployee | null | undefined) {
	if (!member) {
		return false;
	}
	const memberUserId = member.employee?.userId;
	return (task.members ?? []).some((assignee) => {
		const sameEmployee = assignee.id === member.employeeId;
		const sameUser = Boolean(memberUserId) && assignee.userId === memberUserId;
		return sameEmployee || sameUser;
	});
}

export function useActivateOnSelfAssign(task: TTask) {
	const { data: user } = useUserQuery();
	const activeTeamTask = useAtomValue(activeTeamTaskState);
	const { setActiveTask } = useSetActiveTask();
	return useCallback(
		(member: TOrganizationTeamEmployee) => {
			const isSelf = Boolean(user?.id) && member.employee?.userId === user?.id;
			const hasActiveTask = Boolean(activeTeamTask);
			if (isSelf && !hasActiveTask) {
				setActiveTask(task);
			}
		},
		[activeTeamTask, setActiveTask, task, user?.id]
	);
}

export function useTaskSelfAssignment(task: TTask) {
	const { data: user } = useUserQuery();
	const activeTeam = useAtomValue(activeTeamState);
	const teamMembers = useMemo(() => activeTeam?.members ?? [], [activeTeam?.members]);
	const currentMember = teamMembers.find((member) => member.employee?.userId === user?.id) ?? null;
	const { assignMember, unassignMember } = useTaskMemberManagement(task, teamMembers);
	const activateOnSelfAssign = useActivateOnSelfAssign(task);
	const isAssignedToMe = isAssignedTo(task, currentMember);

	const assignMe = useCallback(async () => {
		if (!currentMember) {
			return;
		}
		try {
			await assignMember(currentMember);
			activateOnSelfAssign(currentMember);
		} catch {
			// useTaskMemberManagement already showed the error
		}
	}, [activateOnSelfAssign, assignMember, currentMember]);

	const unassignMe = useCallback(async () => {
		if (!currentMember) {
			return;
		}
		try {
			await unassignMember(currentMember);
		} catch {
			// useTaskMemberManagement already showed the error
		}
	}, [currentMember, unassignMember]);

	return { currentMember, isAssignedToMe, assignMe, unassignMe };
}
