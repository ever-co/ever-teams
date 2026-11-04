'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
	I_UserProfilePage,
	useCanSeeActivityScreen,
	useMemberActiveTask,
	useMemberIdentity,
	useTeamMemberMutations,
	useTeamMemberRoleActions
} from '@/core/hooks';
import { useUserQuery } from '@/core/hooks/queries/user-user.query';
import { useActiveTeamMemberOfUser } from '@/core/hooks/organizations/teams/use-active-team-member';
import type { I_MemberIdentityHook } from '@/core/hooks/organizations/teams/use-member-identity';
import type { I_TeamMemberMutationsHook } from '@/core/hooks/organizations/teams/use-team-member-mutations';
import type { I_TeamMemberRoleActionsHook } from '@/core/hooks/organizations/teams/use-team-member-role-actions';
import type { TOrganizationTeamEmployee } from '@/core/types/schemas';
import type { TTask } from '@/core/types/schemas/task/task.schema';

export type TaskListMemberInfo = I_MemberIdentityHook & { memberTask: TTask | null } & I_TeamMemberMutationsHook &
	I_TeamMemberRoleActionsHook;

export interface TaskListMemberValue {
	/** The user whose profile the rows belong to: a row of another profile reads its own member. */
	profileUserId: string | undefined;
	currentMember: TOrganizationTeamEmployee | undefined;
	authMember: TOrganizationTeamEmployee | undefined;
	memberInfo: TaskListMemberInfo;
	authMutations: I_TeamMemberMutationsHook;
	canSeeActivity: boolean;
}

const TaskListMemberContext = createContext<TaskListMemberValue | null>(null);

/**
 * The profiled member, the signed-in member and what a task row does with them (identity, active task,
 * assignment and role actions, the activity rule), read once for a whole list instead of once per row.
 */
export function useTaskListMemberValue(profileUserId: string | undefined): TaskListMemberValue {
	const { data: user } = useUserQuery();
	const canSeeActivity = useCanSeeActivityScreen();
	const currentMember = useActiveTeamMemberOfUser(profileUserId);
	const authMember = useActiveTeamMemberOfUser(user?.id);

	const { memberUser, isAuthUser, isAuthTeamManager, isTeamManager, isTeamCreator, isTeamOwner, member } =
		useMemberIdentity(currentMember);
	const memberTask = useMemberActiveTask(currentMember);
	const { assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading, memberUnassignTasks } =
		useTeamMemberMutations(currentMember);
	const { makeMemberManager, unMakeMemberManager, removeMemberFromTeam, updateOTeamLoading } =
		useTeamMemberRoleActions(currentMember);
	const viewer = useTeamMemberMutations(authMember);

	const memberInfo = useMemo<TaskListMemberInfo>(
		() => ({
			memberUser,
			isAuthUser,
			isAuthTeamManager,
			isTeamManager,
			isTeamCreator,
			isTeamOwner,
			member,
			memberTask,
			assignTask,
			unassignTask,
			assignTaskLoading,
			unAssignTaskLoading,
			memberUnassignTasks,
			makeMemberManager,
			unMakeMemberManager,
			removeMemberFromTeam,
			updateOTeamLoading
		}),
		[
			memberUser,
			isAuthUser,
			isAuthTeamManager,
			isTeamManager,
			isTeamCreator,
			isTeamOwner,
			member,
			memberTask,
			assignTask,
			unassignTask,
			assignTaskLoading,
			unAssignTaskLoading,
			memberUnassignTasks,
			makeMemberManager,
			unMakeMemberManager,
			removeMemberFromTeam,
			updateOTeamLoading
		]
	);

	const authMutations = useMemo<I_TeamMemberMutationsHook>(
		() => ({
			assignTask: viewer.assignTask,
			unassignTask: viewer.unassignTask,
			assignTaskLoading: viewer.assignTaskLoading,
			unAssignTaskLoading: viewer.unAssignTaskLoading,
			memberUnassignTasks: viewer.memberUnassignTasks
		}),
		[
			viewer.assignTask,
			viewer.unassignTask,
			viewer.assignTaskLoading,
			viewer.unAssignTaskLoading,
			viewer.memberUnassignTasks
		]
	);

	return useMemo(
		() => ({ profileUserId, currentMember, authMember, memberInfo, authMutations, canSeeActivity }),
		[profileUserId, currentMember, authMember, memberInfo, authMutations, canSeeActivity]
	);
}

export function TaskListMemberProvider({
	profile,
	children
}: Readonly<{ profile?: I_UserProfilePage; children: ReactNode }>) {
	const value = useTaskListMemberValue(profile?.userProfile?.id);
	return <TaskListMemberContext.Provider value={value}>{children}</TaskListMemberContext.Provider>;
}

/** The list's member data, or null for a row rendered outside a list. */
export function useTaskListMember() {
	return useContext(TaskListMemberContext);
}
