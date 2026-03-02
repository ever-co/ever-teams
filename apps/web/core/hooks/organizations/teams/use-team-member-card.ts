'use client';
import { useState } from 'react';
import { useOutsideClick } from '../../common';
import { Nullable } from '@/core/types/generics/utils';
import { TOrganizationTeamEmployee } from '@/core/types/schemas';
import { TTask } from '@/core/types/schemas/task/task.schema';
import { useMemberActiveTask } from './use-member-active-task';
import { useMemberIdentity } from './use-member-identity';
import { useTeamMemberMutations } from './use-team-member-mutations';
import { useTeamMemberRoleActions } from './use-team-member-role-actions';

/**
 * @deprecated Prefer the granular hooks for new consumers:
 * - `useMemberIdentity` — identity & role checks (memberUser, isAuthUser, isAuthTeamManager, isTeamManager, isTeamCreator, isTeamOwner, member)
 * - `useMemberActiveTask` — active task resolution with statistics injection (memberTask)
 * - `useTeamMemberMutations` — assign/unassign mutations (assignTask, unassignTask, assignTaskLoading, unAssignTaskLoading, memberUnassignTasks)
 * - `useTeamMemberRoleActions` — manager role & team membership actions (makeMemberManager, unMakeMemberManager, removeMemberFromTeam, updateOTeamLoading)
 *
 * This facade remains for consumers that genuinely need the full hook shape (e.g. UserTeamCardMenu,
 * TaskEstimateInfo, TaskCardMenu). Do NOT use it in new components that only need a subset of the data.
 *
 * @param member - The team member to build the card data for
 */
export function useTeamMemberCard(member: TOrganizationTeamEmployee | undefined) {
	const identity = useMemberIdentity(member);
	const memberTask = useMemberActiveTask(member);
	const mutations = useTeamMemberMutations(member);
	const roleActions = useTeamMemberRoleActions(member);

	return {
		// Identity
		memberUser: identity.memberUser,
		isAuthUser: identity.isAuthUser,
		isAuthTeamManager: identity.isAuthTeamManager,
		isTeamManager: identity.isTeamManager,
		isTeamCreator: identity.isTeamCreator,
		isTeamOwner: identity.isTeamOwner,
		member: identity.member,

		// Task resolution
		memberTask,

		// Mutations
		assignTask: mutations.assignTask,
		unassignTask: mutations.unassignTask,
		assignTaskLoading: mutations.assignTaskLoading,
		unAssignTaskLoading: mutations.unAssignTaskLoading,
		memberUnassignTasks: mutations.memberUnassignTasks,

		// Role actions
		makeMemberManager: roleActions.makeMemberManager,
		unMakeMemberManager: roleActions.unMakeMemberManager,
		removeMemberFromTeam: roleActions.removeMemberFromTeam,
		updateOTeamLoading: roleActions.updateOTeamLoading
	};
}

export function useTMCardTaskEdit(task: Nullable<TTask>) {
	const [editMode, setEditMode] = useState(false);
	const [estimateEditMode, setEstimateEditMode] = useState(false);
	const [loading, setLoading] = useState(false);

	const estimateEditIgnoreElement = useOutsideClick<any>();
	const taskEditIgnoreElement = useOutsideClick<any>();

	return {
		editMode,
		setEditMode,
		task,
		estimateEditMode,
		setEstimateEditMode,
		estimateEditIgnoreElement,
		taskEditIgnoreElement,
		loading,
		setLoading
	};
}

export type I_TMCardTaskEditHook = ReturnType<typeof useTMCardTaskEdit>;

export type I_TeamMemberCardHook = ReturnType<typeof useTeamMemberCard>;
